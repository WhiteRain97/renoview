import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "1 h"), // 10/hour per IP
  prefix: "rvw:rl",
});

const cacheTtlSec = 6 * 60 * 60; // 6h

const cacheKey = (p: {
  zip: string; homeValue: number; budget: number; timeline: string; room?: string;
}) =>
  `rvw:plan:v1:${p.zip}:${Math.round(p.homeValue/50000)}:${Math.round(p.budget/5000)}:${p.timeline}:${p.room ?? ""}`;

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
  req.headers.get("x-real-ip") ??
  "unknown";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB ?? 3);
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

// ---- Schemas ----
// tolerant numeric coercion (e.g., "$3,500" -> 3500)
const toNum = (v: unknown) =>
  typeof v === "string" ? Number(v.replace(/[^0-9.\-]/g, "")) : v;

const Num   = z.preprocess(toNum, z.number());
const NumNN = z.preprocess(toNum, z.number().nonnegative());

const Req = z.object({
  zip: z.string().regex(/^\d{5}$/),
  address: z.string().optional().default(""),
  homeValue: NumNN,
  budget: NumNN,
  timeline: z.string().min(1),
  room: z.string().optional().default(""),
  photoBase64: z.string().nullable().optional(),
});

const Priority = z.object({
  title: z.string(),
  why: z.string(),
  est_cost_range: z.tuple([NumNN, NumNN]),
  expected_value_uplift_range: z.tuple([NumNN, NumNN]),
  roi_range_pct: z.tuple([Num, Num]),
  timeline_weeks: z.tuple([NumNN, NumNN]),
  confidence: z.enum(["low", "medium", "high"]),
  dependencies: z.array(z.string()).default([]),
  notes: z.string().optional().default(""),
});

const Res = z.object({
  summary: z.string(),
  priority_actions: z.array(Priority).default([]),
  quick_wins: z.array(z.object({
    title: z.string(),
    why: z.string(),
    est_cost: NumNN,
    impact: z.enum(["low","medium","high"]),
  })).default([]),
  defer_or_avoid: z.array(z.object({
    title: z.string(),
    why: z.string(),
  })).default([]),
  next_steps_checklist: z.array(z.string()).default([]),
});

// ---- Helpers ----
const parseDataUrl = (u: string) => {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(u || "");
  return m ? { mime: m[1].toLowerCase(), b64: m[2] } : null;
};
const b64Bytes = (b64: string) => (b64.length * 3) / 4 - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);

// ---- Route ----
export async function POST(req: Request) {
  const { success, reset } = await ratelimit.limit(`analyze:${clientIp(req)}`);
  if (!success) {
    const secs = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: `Too many requests. Try again in ${secs}s.` },
      { status: 429 }
    );
  }
  
  try {
    const json = await req.json();
    const p = Req.safeParse(json);
    if (!p.success) return NextResponse.json({ error: "Invalid input", details: p.error.flatten() }, { status: 400 });

    const { zip, address, homeValue, budget, timeline, room, photoBase64 } = p.data;

    // ---- cache (only when no photo) ----
    if (!photoBase64) {
      const key = cacheKey({ zip, homeValue, budget, timeline, room });
      const cached = await redis.get(key);
      if (cached) return NextResponse.json(cached);
    }

    // image checks (optional)
    let imagePart: { type: "image_url"; image_url: { url: string } } | null = null;
    if (photoBase64) {
      const info = parseDataUrl(photoBase64);
      if (!info) return NextResponse.json({ error: "Invalid image data URL" }, { status: 400 });
      if (!ALLOWED_MIME.includes(info.mime as any))
        return NextResponse.json({ error: `Unsupported image type` }, { status: 400 });
      if (b64Bytes(info.b64) / (1024 * 1024) > MAX_IMAGE_MB)
        return NextResponse.json({ error: `Image too large (max ${MAX_IMAGE_MB} MB)` }, { status: 400 });
      imagePart = { type: "image_url", image_url: { url: photoBase64 } };
    }

    const system = [
      "You are Renoview. Return ONLY one JSON object with keys:",
      "summary, priority_actions[], quick_wins[], defer_or_avoid[], next_steps_checklist[]",
      "Rules: objects only (no bullet strings), numbers only (no $/%), ranges as [min,max].",
      "Do not repeat the full address; refer to 'the property' instead.",
      'Example: {"summary":"...","priority_actions":[{"title":"Repaint","why":"...","est_cost_range":[3500,5500],"expected_value_uplift_range":[9000,15000],"roi_range_pct":[65,200],"timeline_weeks":[2,3],"confidence":"medium","dependencies":["none"],"notes":""}],"quick_wins":[{"title":"LED bulbs","why":"...","est_cost":300,"impact":"medium"}],"defer_or_avoid":[{"title":"Full reconfig","why":"..."}],"next_steps_checklist":["Pull 3 comps"]}',
    ].join("\n");



    const textBlock = {
      type: "text" as const,
      text: [
        `ZIP: ${zip}`,
        address && `Address: ${address}`,
        `Home value: $${homeValue.toLocaleString()}`,
        `Budget: $${budget.toLocaleString()}`,
        `Timeline: ${timeline}`,
        room && `Focus area: ${room}`,
        "Return ONLY JSON. No backticks."
      ].filter(Boolean).join("\n")
    };

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      { role: "user", content: imagePart ? [textBlock, imagePart] : [textBlock] }
    ];

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const raw = r.choices?.[0]?.message?.content ?? "";
    let obj: unknown;
    try { obj = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "Model returned non-JSON output", raw }, { status: 422 }); }

    // --- normalize if model returned string bullets instead of objects ---
    const strToNum = (s: string) => {
      const n = Number((s || "").replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    const parseRange = (s: string) => {
      // matches "$5,000 - $10,000" or "200 - 400"
      const m = s.match(/([\$]?\s*[\d,.\-]+)\s*[-–]\s*([\$]?\s*[\d,.\-]+)/);
      return m ? [strToNum(m[1]), strToNum(m[2])] as [number, number] : null;
    };

    const coerce = (o: any) => {
      const out = { ...o };

      // priority_actions: string[] -> object[]
      if (Array.isArray(out.priority_actions) && typeof out.priority_actions[0] === "string") {
        out.priority_actions = out.priority_actions.map((line: string) => {
          const cost = parseRange(line) || [0, 0];
          return {
            title: line.split("–")[0].split("-")[0].trim(),
            why: line.trim(),
            est_cost_range: cost,
            expected_value_uplift_range: [0, 0],
            roi_range_pct: [0, 0],
            timeline_weeks: [0, 0],
            confidence: "low",
            dependencies: [],
            notes: "",
          };
        });
      }

      // quick_wins: string[] -> object[]
      if (Array.isArray(out.quick_wins) && typeof out.quick_wins[0] === "string") {
        out.quick_wins = out.quick_wins.map((line: string) => {
          const cost = parseRange(line);
          return {
            title: line.split("–")[0].split("-")[0].trim(),
            why: line.trim(),
            est_cost: cost ? cost[0] : strToNum(line),
            impact: "medium",
          };
        });
      }

      // defer_or_avoid: string[] -> object[]
      if (Array.isArray(out.defer_or_avoid) && typeof out.defer_or_avoid[0] === "string") {
        out.defer_or_avoid = out.defer_or_avoid.map((line: string) => ({
          title: line.split("–")[0].split("-")[0].trim(),
          why: line.trim(),
        }));
      }

      // next_steps_checklist: ensure array of strings
      if (!Array.isArray(out.next_steps_checklist)) out.next_steps_checklist = [];
      return out;
    };

    obj = coerce(obj);


    const out = Res.safeParse(obj);
    if (!out.success) {
      //console.warn("MODEL_RAW:", raw); // 👈 add this
      return NextResponse.json(
        { error: "Model JSON failed schema validation", details: out.error.flatten(), raw },
        { status: 422 }
      );
    }
    
    // ---- save to cache (only when no photo) ----
    if (!photoBase64) {
      const key = cacheKey({ zip, homeValue, budget, timeline, room });
      await redis.set(key, out.data, { ex: cacheTtlSec });
    }

    return NextResponse.json(out.data);
  } catch (e) {
    console.error("[/api/analyze]", e);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
