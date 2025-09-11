import { NextRequest, NextResponse } from "next/server";
import { calcScores } from "../../lib/scoring/factors";
import { normalizeWeights } from "../../lib/scoring/normalize";
import { getRegionBaseline } from "../../lib/markets/cost_value";

// Request schema
type ScorecardRequest = {
  home_value_range: [number, number];
  zip_or_city: string;
  sell_timeline: "<1y" | "1-3y" | "3-5y" | "5+";
  budget_range: [number, number];
  weights: {
    roi: number;
    lifestyle: number;
    disruption: number;
    buyer_appeal: number;
  };
  remodel: {
    room: string;
    subtype?: string;
    free_text?: string;
  };
};

// Response schema
type ScorecardResponse = {
  overall_score: number;
  band: "not recommended" | "possible" | "recommended" | "strongly recommended";
  factors: {
    roi: number;
    lifestyle: number;
    disruption: number;
    buyer_appeal: number;
  };
  weights: ScorecardRequest['weights'];
  signals: string[];
  recommendation: string;
  confidence: {
    range_low: number;
    range_high: number;
    level: "low" | "medium" | "high";
  };
  sources: string[];
  share_url: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScorecardRequest;

    // Normalize weights
    const weights = normalizeWeights(body.weights);

    // Load region baseline for scoring (stub)
    const region = await getRegionBaseline(body.zip_or_city);

    // Calculate scores (stub)
    const result = await calcScores({
      ...body,
      weights,
      region,
    });

    // Example signals, sources, band, recommendation, confidence
    const response: ScorecardResponse = {
      ...result,
      weights,
      signals: result.signals ?? [],
      recommendation: result.recommendation ?? "Strong candidate - get quotes",
      confidence: result.confidence ?? { range_low: result.overall_score - 0.8, range_high: result.overall_score + 0.6, level: "medium" },
      sources: result.sources ?? ["Remodeling Cost vs. Value (region)", "Internal comps"],
      band: result.band ?? "recommended",
      share_url: `/scorecard/abc123`, // Generate real share URL in prod
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Invalid payload or server error" }, { status: 400 });
  }
}
