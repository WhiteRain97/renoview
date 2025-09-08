# API Contract

## POST /api/analyze
Analyzes inputs and returns an ROI plan.

### Request (JSON)
```json
{
  "zip": "75028",
  "address": "123 Main St, Flower Mound, TX 75028",
  "homeValue": 650000,
  "budget": 25000,
  "timeline": "4-6 weeks",
  "room": "kitchen|bathroom|exterior|whole-home|other",
  "photoBase64": "data:image/jpeg;base64,..."
}
```

- `photoBase64` optional. If present, validate type (`image/jpeg|png|webp`) and size (< 3 MB).

### Response (200 JSON)
Object matching the schema in PROMPTS.md. Example:
```json
{
  "summary": "In 75028, light kitchen refresh and exterior curb appeal offer the highest ROI within 4-6 weeks.",
  "priority_actions": [
    {
      "title": "Repaint kitchen cabinets (spray)",
      "why": "Modernizes for <$5k and comps show faster DOM when kitchens are light & bright.",
      "est_cost_range": [3500, 5500],
      "expected_value_uplift_range": [9000, 15000],
      "roi_range_pct": [65, 200],
      "timeline_weeks": [2, 3],
      "confidence": "medium",
      "dependencies": ["none"],
      "notes": "Use durable enamel; change hardware; soft-close hinges optional."
    }
  ],
  "quick_wins": [
    { "title": "LED can lights & 3000K bulbs", "why": "Bright sells; cheap.", "est_cost": 300, "impact": "medium" }
  ],
  "defer_or_avoid": [
    { "title": "Full kitchen reconfiguration", "why": "Over-budget and time constraints before listing." }
  ],
  "next_steps_checklist": [
    "Pull 3 local comps within 0.5 mi and ±10% sqft.",
    "Get 2 bids for cabinet repaint; require spray finish, references."
  ]
}
```

### Errors
- 400: invalid input (bad zip, oversize image, etc.)
- 422: model output invalid JSON
- 500: unexpected server error

## POST /api/geo/validate
Validates that ZIP matches the free-form address. Returns `{ isMatch: boolean, normalizedCity: string|null }`.
