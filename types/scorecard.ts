export type ScorecardRequest = {
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

export type Confidence = {
  range_low: number;
  range_high: number;
  level: "low" | "medium" | "high";
};

export type ScorecardResponse = {
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
};
