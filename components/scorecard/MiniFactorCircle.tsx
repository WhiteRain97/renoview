// TODO(Scorecard): implement ROI_score based on cost→value baseline,
// adjust by sell_timeline and budget fit, normalize to 0-10.
// Inputs: { home_value_range, region, budget_range, sell_timeline, remodel_type }
// Output: number 0-10. Keep pure/deterministic.

import React from "react";

export function MiniFactorCircle({
  value,
  label,
  color = "#60a5fa"
}: {
  value: number; // 0-10
  label: string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / 10));
  return (
    <div className="flex flex-col items-center mx-2">
      <svg width={54} height={54} viewBox="0 0 54 54">
        <circle
          cx={27}
          cy={27}
          r={22}
          stroke="#e5e7eb"
          strokeWidth={7}
          fill="none"
        />
        <circle
          cx={27}
          cy={27}
          r={22}
          stroke={color}
          strokeWidth={7}
          fill="none"
          strokeDasharray={2 * Math.PI * 22}
          strokeDashoffset={2 * Math.PI * 22 * (1 - pct)}
          strokeLinecap="round"
          transform="rotate(-90 27 27)"
        />
        <text
          x="27"
          y="32"
          textAnchor="middle"
          fontSize="1.1em"
          fontWeight="bold"
          fill="#111"
        >
          {value.toFixed(1)}
        </text>
      </svg>
      <span className="mt-1 text-xs">{label}</span>
    </div>
  );
}

export default MiniFactorCircle;
