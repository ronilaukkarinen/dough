import { getSession } from "@/lib/auth";
import { eventBus } from "@/lib/event-bus";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.info("[events] SSE connection opened for user", user.id);

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Heartbeat every 15 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 15000);

      // Subscribe to events
      unsubscribe = eventBus.subscribe((event) => {
        if (closed) return;
        try {
          const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      });

      // Cleanup on close
      const cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        console.info("[events] SSE connection closed for user", user.id);
      };

      // AbortController handles client disconnect
      // The stream will throw when the client disconnects
      stream.cancel = () => {
        cleanup();
        return Promise.resolve();
      };
    },
    cancel() {
      closed = true;
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
