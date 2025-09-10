// TODO(Scorecard): implement ROI_score based on cost→value baseline,
// adjust by sell_timeline and budget fit, normalize to 0-10.
// Inputs: { home_value_range, region, budget_range, sell_timeline, remodel_type }
// Output: number 0-10. Keep pure/deterministic.

export function ROI_score(
  home_value_range: [number, number],
  region: string,
  budget_range: [number, number],
  sell_timeline: "<1y" | "1-3y" | "3-5y" | "5+y",
  remodel_type: { room: string; subtype?: string; free_text?: string }
): number {
  // TODO: Implement scoring based on cost→value baseline, timeline, and budget fit
  return 5; // stub
}

export function Lifestyle_score(
  room: string,
  subtype?: string
): number {
  // TODO: Implement table-driven lifestyle lift by room/subtype
  return 5; // stub
}

export function Disruption_score(
  room: string,
  subtype: string | undefined,
  sell_timeline: "<1y" | "1-3y" | "3-5y" | "5+y"
): number {
  // TODO: Implement inverse of estimated duration + access loss
  return 5; // stub
}

export function BuyerAppeal_score(
  room: string,
  subtype?: string,
  region?: string
): number {
  // TODO: Implement based on trend fit + local comps
  return 5; // stub
}
