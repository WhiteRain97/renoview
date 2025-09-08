# Implementation TODO (Execution-Ready)

## 1) Input Validation (Zod)
- Add `zod` and define schemas for `/api/analyze` and `/api/geo/validate`.
- Enforce zip: 5 digits; homeValue/budget: number >= 0; timeline: whitelist.
- Image: accept jpeg/png/webp only; < 3 MB; strip EXIF.

## 2) Model I/O Hardening
- Use `response_format: { type: "json_schema", json_schema: {...} }` or tool calling for guaranteed JSON.
- If raw text is returned, attempt `JSON.parse` with fallback repair (`stripTrailingCommas`, etc.).
- Reject if final object fails schema; return 422 to client with actionable message.

## 3) Safety & Secrets
- Read API key only on server. Ensure no client bundle leaks `process.env.OPENAI_API_KEY`.
- Rate limit by IP (e.g., `@upstash/ratelimit` + Redis) or Vercel Edge Config.
- Log only hashed IP & coarse zip (no full address) to avoid PII accumulation.

## 4) Costs & Telemetry
- Capture token usage and model in server logs.
- Add a `?debug=1` panel in dev that shows prompt, tokens, and costs (never in prod).
- Cache last good plan per `{zip, priceBand}` for 24h (KV) to reduce costs.

## 5) UX Enhancements
- Add room presets (kitchen/bath/exterior/whole-home).
- Show client-side validation and image preview; compress images before upload.
- Provide “Download PDF” export in addition to TXT.

## 6) Photo Conditioning
- If photo provided, include it as `content: [{type:"input_text", ...}, {type:"input_image", ...}]` for vision models.
- Gate vision path behind explicit checkbox consent.

## 7) Testing
- Add sample payload fixtures and golden JSON snapshots.
- Add e2e test that verifies server returns valid JSON for 5 typical scenarios.

## 8) Deployment
- Add `vercel.json` with regions, edge runtime for `geo/validate`, node runtime for `analyze`.
- Provide `.env.example` with documented keys.
