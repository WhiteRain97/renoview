// Types for Remodel ROI Scorecard API

export interface ScorecardRequest {
  home_value_range: [number, number]; // e.g. [400000, 500000]
  zip_or_city: string;
  sell_timeline: "<1y" | "1-3y" | "3-5y" | "5+y";
  budget_range: [number, number];
  weights: {
    roi: number;
    lifestyle: number;
    disruption: number;
    buyer_appeal: number;
  };
  remodel: {
    room: "kitchen" | "bath" | "exterior" | "misc";
    subtype?: string;
    free_text?: string;
  };
}

export interface ScorecardResponse {
  overall_score: number;
  band: "not recommended" | "neutral" | "recommended";
  factors: {
    roi: number;
    lifestyle: number;
    disruption: number;
    buyer_appeal: number;
  };
  weights: {
    roi: number;
    lifestyle: number;
    disruption: number;
    buyer_appeal: number;
  };
  signals: string[];
  recommendation: string;
  confidence: { range_low: number; range_high: number; level: "low" | "medium" | "high" };
  sources: string[];
  share_url?: string;
}
