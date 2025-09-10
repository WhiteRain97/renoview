// TODO(Scorecard): implement ROI_score based on cost→value baseline,
// adjust by sell_timeline and budget fit, normalize to 0-10.
// Inputs: { home_value_range, region, budget_range, sell_timeline, remodel_type }
// Output: number 0-10. Keep pure/deterministic.

type RemodelType = { room: string; subtype?: string; free_text?: string };

export interface CostValueBaseline {
  region: string;
  room: string;
  subtype?: string;
  cost: number;
  value: number;
  roi_pct: number;
  year: number;
}

const cache: Record<string, { data: CostValueBaseline; ts: number }> = {};

const MOCK_BASELINE: CostValueBaseline = {
  region: "DFW",
  room: "kitchen",
  subtype: "countertops",
  cost: 4000,
  value: 3500,
  roi_pct: 87.5,
  year: 2025,
};

// TTL (ms)
const CACHE_TTL = 1000 * 60 * 10; // 10 min

export async function getCostValueBaseline(
  region: string,
  room: string,
  subtype?: string
): Promise<CostValueBaseline> {
  const key = `${region}:${room}:${subtype || ""}`;
  const now = Date.now();

  // Serve from cache if fresh
  if (cache[key] && now - cache[key].ts < CACHE_TTL) {
    return cache[key].data;
  }

  // (Stub) Load baseline from source (replace with real fetch in prod)
  const baseline = MOCK_BASELINE;

  // Save to cache (stale-while-revalidate: could trigger async refresh here)
  cache[key] = { data: baseline, ts: now };

  return baseline;
}
