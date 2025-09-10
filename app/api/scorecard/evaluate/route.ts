import { NextRequest, NextResponse } from "next/server";
import type { ScorecardRequest, ScorecardResponse } from "../../../lib/scorecard/types";

// TODO(Scorecard): implement ROI_score based on cost→value baseline,
// adjust by sell_timeline and budget fit, normalize to 0-10.
// Inputs: { home_value_range, region, budget_range, sell_timeline, remodel_type }
// Output: number 0-10. Keep pure/deterministic.

export async function POST(req: NextRequest) {
  const input = (await req.json()) as ScorecardRequest;

  // TODO: Validate input

  // TODO: Call scoring functions

  // TODO: Build response object
  const mock: ScorecardResponse = {
    overall_score: 8.3,
    band: "recommended",
    factors: {
      roi: 8.7,
      lifestyle: 7.9,
      disruption: 6.2,
      buyer_appeal: 8.9
    },
    weights: input.weights,
    signals: [
      "Local cost→value for kitchen countertops ~78%-92% in your market & timeline",
      "Estimated downtime 1-2 weeks with partial kitchen access",
      "Quartz trend strong in comps last 12 months"
    ],
    recommendation: "Strong candidate - get quotes",
    confidence: { range_low: 7.5, range_high: 8.9, level: "medium" },
    sources: ["Remodeling Cost vs. Value (region)", "Internal comps"],
    share_url: null
  };

  return NextResponse.json(mock);
}
