import { clamp } from "./normalize";
import { ScorecardRequest, Confidence, ScorecardResponse } from "@/types/scorecard";

// Stub: region baseline info type
type RegionBaseline = {
  cost_value_ratio: number; // 0-1
  comps_trend: number;      // 0-10
  typical_budget: [number, number];
};

export async function calcScores({
  home_value_range,
  sell_timeline,
  budget_range,
  weights,
  remodel,
  region,
}: ScorecardRequest & { region: RegionBaseline }) {
  // === ROI Score (stub) ===
  let roi = clamp(region.cost_value_ratio * 10, 0, 10);

  // === Lifestyle Score (stub) ===
  let lifestyle = clamp(
    remodel.room === "kitchen"
      ? 8
      : remodel.room === "bath"
      ? 7
      : 6,
    0,
    10
  );

  // === Disruption Score (stub, lower is worse) ===
  let disruption = clamp(remodel.room === "kitchen" ? 5 : 7, 0, 10);

  // === Buyer Appeal Score (stub) ===
  let buyer_appeal = clamp(region.comps_trend, 0, 10);

  // === Weighted Overall ===
  const overall_score =
    weights.roi * roi +
    weights.lifestyle * lifestyle +
    weights.disruption * (10 - disruption) +
    weights.buyer_appeal * buyer_appeal;

  // Band mapping
  let band: "not recommended" | "possible" | "recommended" | "strongly recommended" = "recommended";
  if (overall_score < 6) band = "not recommended";
  else if (overall_score < 7) band = "possible";
  else if (overall_score < 9) band = "recommended";
  else band = "strongly recommended";

  return {
    overall_score: clamp(overall_score, 1, 10),
    band,
    factors: { roi, lifestyle, disruption, buyer_appeal },
    // Add stubs for signals, etc.
    signals: [
      `Local cost→value for ${remodel.room} ~${Math.round(region.cost_value_ratio * 100)}% in your market & timeline`,
      `Estimated downtime 1-2 weeks`,
      `Trend score from comps: ${region.comps_trend}`,
    ],
    sources: ["Remodeling Cost vs. Value (region)", "Internal comps"],
    recommendation: overall_score > 7.5 ? "Strong candidate - get quotes" : "Consider alternatives",
    confidence: { range_low: overall_score - 0.8, range_high: overall_score + 0.6, level: "medium" },
  };
}
