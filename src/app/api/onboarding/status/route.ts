import { NextResponse } from "next/server";
import { isOnboardingComplete } from "@/lib/config";

export async function GET() {
  try {
    return NextResponse.json({ complete: isOnboardingComplete() });
  } catch {
    return NextResponse.json({ complete: false });
  }
}
