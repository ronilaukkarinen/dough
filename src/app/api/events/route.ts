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
  let heartbeatId: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      heartbeatId = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          if (heartbeatId) clearInterval(heartbeatId);
          if (unsubscribe) unsubscribe();
        }
      }, 15000);

      unsubscribe = eventBus.subscribe((event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`));
        } catch {
          closed = true;
          if (heartbeatId) clearInterval(heartbeatId);
          if (unsubscribe) unsubscribe();
        }
      });
    },
    cancel() {
      console.info("[events] SSE connection closed for user", user.id);
      closed = true;
      if (heartbeatId) clearInterval(heartbeatId);
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
