import { NextRequest, NextResponse } from "next/server";
import { calcScores } from "../../lib/scoring/factors";
import { normalizeWeights } from "../../lib/scoring/normalize";
import { getCostValueBaseline } from "../../lib/markets/cost_value";
import { ScorecardRequest, Confidence, ScorecardResponse } from "@/types/scorecard";

// Request schema
/*type ScorecardRequest = {
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
};*/

// Response schema
/*type Confidence = {
  range_low: number;
  range_high: number;
  level: "low" | "medium" | "high";
};*/

/*type ScorecardResponse = {
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
  confidence: Confidence;
  sources: string[];
  share_url: string;
};*/

// Helper: always returns the correct Confidence type
function toConfidence(obj: any, overall_score: number): Confidence {
  if (
    obj &&
    typeof obj.range_low === "number" &&
    typeof obj.range_high === "number" &&
    (obj.level === "low" || obj.level === "medium" || obj.level === "high")
  ) {
    return obj;
  }
  return {
    range_low: overall_score - 0.8,
    range_high: overall_score + 0.6,
    level: "medium"
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScorecardRequest;

    // Normalize weights
    const weights = normalizeWeights(body.weights);
    const typedWeights = {
      roi: weights.roi,
      lifestyle: weights.lifestyle,
      disruption: weights.disruption,
      buyer_appeal: weights.buyer_appeal,
    };
    
    // Load region baseline for scoring (stub)
    const region = await getCostValueBaseline(
      body.zip_or_city,
      body.remodel.room,
      body.remodel.subtype
    );

    // Patch: convert CostValueBaseline to RegionBaseline
    const budgetMin = Math.round(region.cost * 0.9);
    const budgetMax = Math.round(region.cost * 1.1);
    
    const regionBaseline = {
      cost_value_ratio: region.roi_pct / 100,
      comps_trend: 0,
      typical_budget: [budgetMin, budgetMax] as [number, number], // enforce tuple
    };

    // Calculate scores (stub)
    const result = await calcScores({
      ...body,
      weights: typedWeights,
      region: regionBaseline,
    });

    // Build response with safe confidence type
    const response: ScorecardResponse = {
      ...result,
      weights: typedWeights,
      signals: result.signals ?? [],
      recommendation: result.recommendation ?? "Strong candidate - get quotes",
      confidence: toConfidence(result.confidence, result.overall_score),
      sources: result.sources ?? ["Remodeling Cost vs. Value (region)", "Internal comps"],
      band: result.band ?? "recommended",
      share_url: `/scorecard/abc123`, // Generate real share URL in prod
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Invalid payload or server error" }, { status: 400 });
  }
}
