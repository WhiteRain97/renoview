// Clamp value in [min, max]
export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// Normalize weights to sum to 1.0
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;
  const normed: Record<string, number> = {};
  for (const k of Object.keys(weights)) {
    normed[k] = weights[k] / sum;
  }
  return normed;
}
