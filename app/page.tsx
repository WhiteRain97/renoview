'use client';

import React, { useState } from "react";

const STEPS = ["Your Home", "Priorities", "Remodel"];

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
          <h2>Your Home</h2>
          <div>
            <label>Zip or City</label>
            <input value={zipOrCity} onChange={e => setZipOrCity(e.target.value)} />
          </div>
          {/* Add home value and budget range inputs */}
        </section>
      )}
      {step === 1 && (
        <section>
          <h2>Priorities</h2>
          {/* Render sliders for weights here */}
          <div className="bg-blue-500 text-white p-4">
            Tailwind is working!
          </div>
          <div>
            <label>ROI Weight</label>
            <input type="number" value={weights.roi} step={0.01} min={0} max={1}
              onChange={e => setWeights(w => ({ ...w, roi: parseFloat(e.target.value) || 0 }))} />
            {/* Repeat for other weights */}
          </div>
          {/* Show live sum */}
          <div>Total: {Object.values(weights).reduce((a, b) => a + b, 0).toFixed(2)}</div>
        </section>
      )}
      {step === 2 && (
        <section>
          <h2>Remodel</h2>
          {/* Room/subtype dropdowns and/or free text */}
          <div>
            <label>Room</label>
            <select value={room} onChange={e => setRoom(e.target.value)}>
              <option value="kitchen">Kitchen</option>
              <option value="bath">Bath</option>
              <option value="exterior">Exterior</option>
              <option value="misc">Misc</option>
            </select>
          </div>
          <div>
            <label>Subtype</label>
            <input value={subtype} onChange={e => setSubtype(e.target.value)} />
          </div>
          <div>
            <label>Or describe:</label>
            <input value={freeText} onChange={e => setFreeText(e.target.value)} />
          </div>
        </section>
      )}

      <div className="mt-4 flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}>Back</button>
        )}
        {step < STEPS.length - 1 && (
          <button disabled={!isStepValid()} onClick={() => setStep(s => s + 1)}>Next</button>
        )}
        {step === STEPS.length - 1 && (
          <button disabled={!isStepValid()}>Submit</button>
        )}
      </div>
    </main>
  );
}
