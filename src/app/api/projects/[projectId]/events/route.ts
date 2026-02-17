import { NextResponse } from "next/server";
import { initializeDb } from "@/lib/db";
import { eventBus } from "@/lib/events/emitter";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    initializeDb();
    const { projectId } = await params;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const unsubscribe = eventBus.onProject(projectId, (event) => {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch {
            // Stream may have been closed
          }
        });

        // Clean up when the client disconnects
        request.signal.addEventListener("abort", () => {
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Controller may already be closed
          }
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Failed to establish SSE connection:", error);
    return NextResponse.json(
      { error: "Failed to establish event stream" },
      { status: 500 },
    );
  }
}
