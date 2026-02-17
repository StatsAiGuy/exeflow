import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ valid: false, error: "API key required" }, { status: 400 });
    }

    // Test the API key with a minimal request
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    if (res.ok || res.status === 200) {
      return NextResponse.json({ valid: true });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({
      valid: false,
      error: data.error?.message || `API returned ${res.status}`,
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: "Failed to validate API key" },
      { status: 500 },
    );
  }
}
