// app/scorecard/page.tsx
import { notFound } from "next/navigation";

const enabled = process.env.NEXT_PUBLIC_SCORECARD_ENABLED === "true";

export default function ScorecardPage() {
  if (!enabled) return notFound();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Remodel ROI Scorecard</h1>
      {/* Your scorecard UI goes here */}
    </main>
  );
}
