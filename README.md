# Renoview Starter (No-Experience Guide)

This is a prebuilt project that does exactly what you wanted:
- A web page where you enter ZIP, address (optional), home value, budget, timeline, and an optional photo (kitchen/bathroom/exterior).
- It sends those inputs **directly to ChatGPT** on the server (your API key is safe).
- Whatever ChatGPT replies is shown in the output card. Nothing is hard-coded.

## 0) Prereqs
- Install Node.js (LTS) from https://nodejs.org (one-time).
- Create an OpenAI API key at https://platform.openai.com (one-time).

## 1) Setup
1. Open Terminal (Mac) or Command Prompt/PowerShell (Windows).
2. Go into this folder (after unzipping): `cd renoview-starter`
3. Copy `.env.example` to `.env.local`, then paste your key:
   ```
   OPENAI_API_KEY=sk-...your real key ...
   ```
4. Install dependencies:
   ```
   npm install
   ```

## 2) Run it
```
npm run dev
```
- Then open http://localhost:3000 in your browser.
- Fill the form, optionally upload a photo, and click "Analyze".
- The result comes straight from ChatGPT.

## 3) Deploy (optional, easy)
- Push this folder to a GitHub repo.
- Create a project on https://vercel.com and import the repo.
- In Vercel → Settings → Environment Variables, add `OPENAI_API_KEY` with your key.
- Deploy. Done.

## Notes
- Your API key is used **only on the server** under `app/api/analyze/route.ts`.
- ZIP/address validation route is `app/api/geo/validate/route.ts` (very simple string check - replace with a real geocoder later if you want).
- The page UI is in `app/page.tsx`.
