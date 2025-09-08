import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { address = "", zip = "" } = await req.json();
    const zip5 = String(zip).trim().slice(0, 5);
    if (!/^\d{5}$/.test(zip5)) {
      return NextResponse.json({ error: "Invalid ZIP" }, { status: 400 });
    }
    const isMatch = address ? address.includes(zip5) : true;
    return NextResponse.json({ isMatch, normalizedCity: null });
  } catch {
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
