'use client';

import React, { useState } from "react";
import { ScoreGauge } from "@/components/scorecard/ScoreGauge";
import { MiniFactorCircle } from "@/components/scorecard/MiniFactorCircle";

const STEPS = ["Your Home", "Priorities", "Remodel"];

function normalizeWeights(weights: Record<string, number>, changedKey: string, newValue: number): Record<string, number> {
  const keys = Object.keys(weights);
  const restKeys = keys.filter(k => k !== changedKey);
  const restTotal = restKeys.reduce((sum, k) => sum + weights[k], 0);
  let remaining = 1 - newValue;
  let normalized = { ...weights, [changedKey]: newValue };

  if (restTotal === 0) {
    // Set others to 0 if all rest are 0
    restKeys.forEach(k => normalized[k] = 0);
  } else {
    restKeys.forEach(k => {
      normalized[k] = weights[k] / restTotal * remaining;
    });
  }
  // Clamp tiny float errors
  Object.keys(normalized).forEach(k => {
    if (normalized[k] < 0) normalized[k] = 0;
    if (normalized[k] > 1) normalized[k] = 1;
  });
  // Re-normalize sum to exactly 1.0 to avoid float errors
  const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1.0) > 0.0001) {
    // Distribute error to first key
    const error = 1.0 - sum;
    const firstKey = keys[0];
    normalized[firstKey] = Math.max(0, Math.min(1, normalized[firstKey] + error));
  }
  return normalized;
}

// A simple "overall" mock calculation, weighted sum of factors
function calcOverallScore(weights: Record<string, number>) {
  // For now, just a weighted sum of each factor *10 (so all 10s gives 10)
  return (
    weights.roi * 10 +
    weights.lifestyle * 10 +
    weights.disruption * 10 +
    weights.buyer_appeal * 10
  );
}

export default function ScorecardPage() {
  const [step, setStep] = useState(0);

  // Step 1: Home Inputs
  const [homeValue, setHomeValue] = useState<[number, number]>([400000, 500000]);
  const [zipOrCity, setZipOrCity] = useState("");
  const [sellTimeline, setSellTimeline] = useState("<1y");
  const [budget, setBudget] = useState<[number, number]>([10000, 25000]);

  // Step 2: Priorities
  const [weights, setWeights] = useState({
    roi: 0.5, lifestyle: 0.2, disruption: 0.2, buyer_appeal: 0.1
  });

  // Step 3: Remodel
  const [room, setRoom] = useState("kitchen");
  const [subtype, setSubtype] = useState("");
  const [freeText, setFreeText] = useState("");

  // Validation per step (example)
  const isStepValid = () => {
    if (step === 0) return zipOrCity && homeValue[0] > 0 && budget[0] > 0;
    if (step === 1) {
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      return Math.abs(total - 1.0) < 0.01;
    }
    if (step === 2) return room || freeText.trim();
    return false;
  };

  // For mock preview, just use weights for factor scores (10*weight, so 0-10)
  const factorScores = {
    roi: Math.round(weights.roi * 10 * 10) / 10,
    lifestyle: Math.round(weights.lifestyle * 10 * 10) / 10,
    disruption: Math.round(weights.disruption * 10 * 10) / 10,
    buyer_appeal: Math.round(weights.buyer_appeal * 10 * 10) / 10,
  };
  const overallScore = Math.round(
    (factorScores.roi + factorScores.lifestyle + factorScores.disruption + factorScores.buyer_appeal) * 10
  ) / 40; // Range 0-10, just for demo

  return (
    <main className="mx-auto max-w-2xl p-6">
      <nav className="flex mb-6 gap-2 text-sm">
        {STEPS.map((label, i) => (
          <div key={label}
            className={`px-3 py-1 rounded ${step === i ? 'bg-blue-100 font-bold' : 'bg-gray-100'}`}>
            {label}
          </div>
        ))}
      </nav>

      {step === 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Your Home</h2>
          <div className="mb-2">
            <label className="block">Zip or City</label>
            <input
              value={zipOrCity}
              onChange={e => setZipOrCity(e.target.value)}
              className="border px-2 py-1 rounded w-full"
            />
          </div>
          <div className="mb-2">
            <label className="block">Home Value Range</label>
            <input
              type="number"
              value={homeValue[0]}
              onChange={e => setHomeValue([parseInt(e.target.value) || 0, homeValue[1]])}
              className="border px-2 py-1 rounded w-24 mr-2"
              min={0}
            />
            to
            <input
              type="number"
              value={homeValue[1]}
              onChange={e => setHomeValue([homeValue[0], parseInt(e.target.value) || 0])}
              className="border px-2 py-1 rounded w-24 ml-2"
              min={0}
            />
          </div>
          <div className="mb-2">
            <label className="block">Budget Range</label>
            <input
              type="number"
              value={budget[0]}
              onChange={e => setBudget([parseInt(e.target.value) || 0, budget[1]])}
              className="border px-2 py-1 rounded w-24 mr-2"
              min={0}
            />
            to
            <input
              type="number"
              value={budget[1]}
              onChange={e => setBudget([budget[0], parseInt(e.target.value) || 0])}
              className="border px-2 py-1 rounded w-24 ml-2"
              min={0}
            />
          </div>
          <div className="mb-2">
            <label className="block">Sell Timeline</label>
            <select
              value={sellTimeline}
              onChange={e => setSellTimeline(e.target.value as any)}
              className="border px-2 py-1 rounded"
            >
              <option value="<1y">&lt;1 year</option>
              <option value="1-3y">1-3 years</option>
              <option value="3-5y">3-5 years</option>
              <option value="5+y">5+ years</option>
            </select>
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Priorities</h2>
          <div className="space-y-4">
            {[
              { key: "roi", label: "ROI (Resale)" },
              { key: "lifestyle", label: "Lifestyle" },
              { key: "disruption", label: "Disruption" },
              { key: "buyer_appeal", label: "Buyer Appeal" }
            ].map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between items-center">
                  <label>{label}</label>
                  <span>{Math.round(weights[key as keyof typeof weights] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={weights[key as keyof typeof weights]}
                  onChange={e => setWeights(w => normalizeWeights(w, key, parseFloat(e.target.value) || 0))}
                  className="w-full accent-blue-500"
                />
              </div>
            ))}
            <div className="text-right text-xs text-gray-500">
              Total: {(Object.values(weights).reduce((a, b) => a + b, 0) * 100).toFixed(0)}%
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          {/* Scorecard preview panel */}
          <div className="mb-6 p-4 bg-gray-50 rounded shadow-sm">
            <div className="flex flex-col items-center">
              <ScoreGauge
                value={calcOverallScore(weights) / 4}
                label="Overall"
              />
            </div>
            <div className="flex flex-row justify-between mt-6">
              <MiniFactorCircle value={factorScores.roi} label="ROI" />
              <MiniFactorCircle value={factorScores.lifestyle} label="Lifestyle" />
              <MiniFactorCircle value={factorScores.disruption} label="Disruption" />
              <MiniFactorCircle value={factorScores.buyer_appeal} label="Buyer Appeal" />
            </div>
          </div>
          {/* Remodel fields */}
          <h2 className="text-lg font-semibold mb-2">Remodel</h2>
          <div className="mb-2">
            <label className="block">Room</label>
            <select
              value={room}
              onChange={e => setRoom(e.target.value)}
              className="border px-2 py-1 rounded"
            >
              <option value="kitchen">Kitchen</option>
              <option value="bath">Bath</option>
              <option value="exterior">Exterior</option>
              <option value="misc">Misc</option>
            </select>
          </div>
          <div className="mb-2">
            <label className="block">Subtype</label>
            <input
              value={subtype}
              onChange={e => setSubtype(e.target.value)}
              className="border px-2 py-1 rounded w-full"
            />
          </div>
          <div className="mb-2">
            <label className="block">Or describe:</label>
            <input
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              className="border px-2 py-1 rounded w-full"
            />
          </div>
        </section>
      )}

      <div className="mt-4 flex gap-2">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            disabled={!isStepValid()}
            onClick={() => setStep(s => s + 1)}
            className={`px-4 py-2 rounded bg-blue-500 text-white ${!isStepValid() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
          >
            Next
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button
            disabled={!isStepValid()}
            className={`px-4 py-2 rounded bg-green-500 text-white ${!isStepValid() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'}`}
          >
            Submit
          </button>
        )}
      </div>
    </main>
  );
}
