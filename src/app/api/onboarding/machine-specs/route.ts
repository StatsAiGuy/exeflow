import { NextResponse } from "next/server";
import { scanCapabilities } from "@/lib/system/capability-scanner";
import { initializeDb } from "@/lib/db";

export async function POST() {
  try {
    initializeDb();
    const capabilities = scanCapabilities();
    return NextResponse.json(capabilities);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to scan machine specs" },
      { status: 500 },
    );
  }
}
