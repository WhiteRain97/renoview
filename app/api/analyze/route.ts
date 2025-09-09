import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import baselines from "../../data/roi_baselines.json";

// ---------- Upstash (rate limit + cache) ----------
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "1 h"), // 10/hour per IP
  prefix: "rvw:rl",
});
const cacheTtlSec = 6 * 60 * 60; // 6h
const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
  req.headers.get("x-real-ip") ??
  "unknown";
const cacheKey = (p: {
  zip: string; homeValue: number; budget: number; timeline: string; room?: string; region: string; homeAge: string;
}) =>
  `rvw:plan:v1:${p.zip}:${Math.round(p.homeValue/50000)}:${Math.round(p.budget/5000)}:${p.timeline}:${p.room ?? ""}:${p.region}:${p.homeAge}`;

// ---------- OpenAI + images ----------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB ?? 3);
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

// ---------- Schemas ----------
const toNum = (v: unknown) =>
  typeof v === "string" ? Number(v.replace(/[^0-9.\-]/g, "")) : v;
const Num   = z.preprocess(toNum, z.number());
const NumNN = z.preprocess(toNum, z.number().nonnegative());

const TIMELINES = [
  "2 - 4 weeks","4 - 6 weeks","6 - 8 weeks","2 - 3 months","3 - 6 months","6+ months",
] as const;
const ROOMS = ["Kitchen","Bathroom","Exterior","Whole-home","Other"] as const;

const Address = z
  .string()
  .max(120, "address too long")
  .transform(s => s.replace(/\r?\n/g, " ").trim())
  .optional()
  .default("");

const Req = z.object({
  zip: z.string().regex(/^\d{5}$/, "ZIP must be 5 digits").refine(z => z !== "00000", "invalid ZIP"),
  address: Address,
  homeValue: NumNN.refine(n => n >= 40_000 && n <= 10_000_000, "homeValue out of range"),
  budget: NumNN.refine(n => n <= 2_000_000, "budget too large"),
  timeline: z.enum(TIMELINES),
  room: z.enum(ROOMS).optional().default("Other"),
  photoBase64: z.string().nullable().optional(),
  // (optional for now; read from raw JSON with defaults if omitted)
  region: z.string().optional(),     // e.g., "southwest"
  homeAge: z.string().optional(),    // e.g., "11-30"
});

const Priority = z.object({
  title: z.string(),
  why: z.string(),
  est_cost_range: z.tuple([NumNN, NumNN]),
  expected_value_uplift_range: z.tuple([NumNN, NumNN]),
  roi_range_pct: z.tuple([Num, Num]),
  timeline_weeks: z.tuple([NumNN, NumNN]),
  confidence: z.enum(["low","medium","high"]),
  dependencies: z.array(z.string()).default([]),
  notes: z.string().optional().default(""),
});

const ProjectRow = z.object({
  project_type: z.string(),
  est_cost_range: z.tuple([NumNN, NumNN]),
  roi_pct_range: z.tuple([Num, Num]),
  expected_value_uplift_range: z.tuple([NumNN, NumNN]),
  source: z.string(),
  note: z.string().optional().default(""),
});

const Res = z.object({
  summary: z.string(),
  market_insights: z.array(z.string()).default([]),
  room_specific: z.array(z.string()).default([]),
  timeline_fit: z.string().optional().default(""),
  projects: z.array(ProjectRow).default([]),
  priority_actions: z.array(Priority).default([]),
  quick_wins: z.array(z.object({
    title: z.string(), why: z.string(), est_cost: NumNN, impact: z.enum(["low","medium","high"]),
  })).default([]),
  defer_or_avoid: z.array(z.object({ title: z.string(), why: z.string() })).default([]),
  next_steps_checklist: z.array(z.string()).default([]),
});

// ---------- Helpers ----------
const parseDataUrl = (u: string) => {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(u || "");
  return m ? { mime: m[1].toLowerCase(), b64: m[2] } : null;
};
const b64Bytes = (b64: string) =>
  (b64.length * 3) / 4 - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);

// ---------- Route ----------
export async function POST(req: Request) {
  // rate limit
  const { success, reset } = await ratelimit.limit(`analyze:${clientIp(req)}`);
  if (!success) {
    const secs = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json({ error: `Too many requests. Try again in ${secs}s.` }, { status: 429 });
  }

  try {
    const json = await req.json();
    const p = Req.safeParse(json);
    if (!p.success) return NextResponse.json({ error: "Invalid input", details: p.error.flatten() }, { status: 400 });

    const { zip, address, homeValue, budget, timeline, room, photoBase64 } = p.data;
    const region = (json.region || "southwest").toLowerCase();
    const homeAge = json.homeAge || "11-30";

    // deterministic projects from baselines
    const rows = (baselines as any[]).filter(r =>
      r.region === region && r.home_age === homeAge && (!room || r.room === room)
    );
    const projects = rows.map((r: any) => {
      const est_cost_range: [number, number] = [r.cost_low, r.cost_high];
      const roi_pct_range: [number, number] = [r.roi_low_pct, r.roi_high_pct];
      const expected_value_uplift_range: [number, number] = [
        Math.round(est_cost_range[0] * (roi_pct_range[0] / 100)),
        Math.round(est_cost_range[1] * (roi_pct_range[1] / 100)),
      ];
      return {
        project_type: r.project_type,
        est_cost_range,
        roi_pct_range,
        expected_value_uplift_range,
        source: r.source,
        note: r.note || "",
      };
    });

    // cache (no photo); include region/homeAge in key
    if (!photoBase64) {
      const key = cacheKey({ zip, homeValue, budget, timeline, room, region, homeAge });
      const cached = await redis.get(key);
      if (cached) return NextResponse.json(cached);
    }

    // image checks (optional)
    let imagePart: { type: "image_url"; image_url: { url: string } } | null = null;
    if (photoBase64) {
      const info = parseDataUrl(photoBase64);
      if (!info) return NextResponse.json({ error: "Invalid image data URL" }, { status: 400 });
      if (!ALLOWED_MIME.includes(info.mime as any))
        return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
      if (b64Bytes(info.b64) / (1024 * 1024) > MAX_IMAGE_MB)
        return NextResponse.json({ error: `Image too large (max ${MAX_IMAGE_MB} MB)` }, { status: 400 });
      imagePart = { type: "image_url", image_url: { url: photoBase64 } };
    }

    const system = [
      "You are Renoview. Return ONLY one JSON object with keys:",
      "summary, market_insights[], priority_actions[], quick_wins[], room_specific[], timeline_fit, defer_or_avoid[], next_steps_checklist[]",
      "Rules: objects only (no bullet strings), numbers only (no $/%), ranges as [min,max].",
      "Always personalize using the user's inputs (ZIP, home value, budget, timeline, room).",
      "Ground advice in realistic, local-ish cost/value ranges for that price band; be concise and specific.",
      "Use ONLY the numbers in DATA_TABLE for costs/ROI/value-uplift. Do not invent figures.",
      "If DATA_TABLE is empty, say so and provide general guidance without numbers.",
      "Do not repeat the full address; refer to 'the property' instead.",
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
        `DATA_TABLE:\n${JSON.stringify(projects).slice(0, 12000)}\n(Use only these numbers for costs/ROI.)`,
        "Return ONLY JSON. No backticks.",
      ].filter(Boolean).join("\n"),
    };

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      { role: "user", content: imagePart ? [textBlock, imagePart] : [textBlock] },
    ];

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    const raw = r.choices?.[0]?.message?.content ?? "";
    let obj: any;
    try { obj = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "Model returned non-JSON output", raw }, { status: 422 }); }

    // tolerant normalization (if model sends strings)
    const strToNum = (s: string) => {
      const n = Number((s || "").replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    const parseRange = (s: string) => {
      const m = s.match(/([\$]?\s*[\d,.\-]+)\s*[-–]\s*([\$]?\s*[\d,.\-]+)/);
      return m ? [strToNum(m[1]), strToNum(m[2])] as [number, number] : null;
    };
    const coerce = (o: any) => {
      const out = { ...o };
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
      if (Array.isArray(out.defer_or_avoid) && typeof out.defer_or_avoid[0] === "string") {
        out.defer_or_avoid = out.defer_or_avoid.map((line: string) => ({
          title: line.split("–")[0].split("-")[0].trim(),
          why: line.trim(),
        }));
      }
      if (!Array.isArray(out.next_steps_checklist)) out.next_steps_checklist = [];
      return out;
    };
    obj = coerce(obj);

    const out = Res.safeParse(obj);
    if (!out.success) {
      return NextResponse.json(
        { error: "Model JSON failed schema validation", details: out.error.flatten(), raw },
        { status: 422 }
      );
    }

    // inject deterministic table, then cache
    out.data.projects = projects;
    if (!photoBase64) {
      const key = cacheKey({ zip, homeValue, budget, timeline, room, region, homeAge });
      await redis.set(key, out.data, { ex: cacheTtlSec });
    }

    return NextResponse.json(out.data);
  } catch (e: any) {
    const msg = e?.response?.data?.error?.message || e?.message || "Analysis failed";
    console.error("[/api/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
