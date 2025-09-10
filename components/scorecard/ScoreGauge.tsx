// TODO(Scorecard): implement ROI_score based on cost→value baseline,
// adjust by sell_timeline and budget fit, normalize to 0-10.
// Inputs: { home_value_range, region, budget_range, sell_timeline, remodel_type }
// Output: number 0-10. Keep pure/deterministic.

import React from "react";

export function ScoreGauge({
  value,
  label,
  color = "#4ade80"
}: {
  value: number; // 0-10
  label: string;
  color?: string;
}) {
  // Simple SVG arc; replace with real gauge later
  const pct = Math.max(0, Math.min(1, value / 10));
  const angle = pct * 2 * Math.PI;
  return (
    <div className="flex flex-col items-center">
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle
          cx={45}
          cy={45}
          r={38}
          stroke="#e5e7eb"
          strokeWidth={10}
          fill="none"
        />
        <circle
          cx={45}
          cy={45}
          r={38}
          stroke={color}
          strokeWidth={10}
          fill="none"
          strokeDasharray={2 * Math.PI * 38}
          strokeDashoffset={2 * Math.PI * 38 * (1 - pct)}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
        />
        <text
          x="45"
          y="50"
          textAnchor="middle"
          fontSize="2em"
          fontWeight="bold"
          fill="#111"
        >
          {value.toFixed(1)}
        </text>
      </svg>
      <span className="mt-2 text-sm">{label}</span>
    </div>
  );
}

export default ScoreGauge;
