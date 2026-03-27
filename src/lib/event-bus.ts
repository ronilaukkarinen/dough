// In-memory event bus for SSE broadcasting
// Lives in the Node.js process — no external dependencies

type EventType =
  | "chat:message"
  | "chat:typing"
  | "chat:reaction"
  | "sync:complete"
  | "data:updated";

interface BusEvent {
  type: EventType;
  data: unknown;
  timestamp: number;
}

type Listener = (event: BusEvent) => void;

class EventBus {
  private listeners: Set<Listener> = new Set();
  private recentEvents: BusEvent[] = [];
  private maxRecent = 50;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    console.debug("[event-bus] Subscriber added, total:", this.listeners.size);
    return () => {
      this.listeners.delete(listener);
      console.debug("[event-bus] Subscriber removed, total:", this.listeners.size);
    };
  }

  emit(type: EventType, data: unknown): void {
    const event: BusEvent = { type, data, timestamp: Date.now() };
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecent) {
      this.recentEvents.shift();
    }
    console.debug("[event-bus] Emitting:", type, "to", this.listeners.size, "subscribers");
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("[event-bus] Listener error:", err);
      }
    }
  }

  getRecentEvents(since?: number): BusEvent[] {
    if (!since) return [];
    return this.recentEvents.filter((e) => e.timestamp > since);
  }

  get subscriberCount(): number {
    return this.listeners.size;
  }
}

// Singleton — shared across all API routes in the same process
const globalBus = globalThis as typeof globalThis & { __eventBus?: EventBus };
if (!globalBus.__eventBus) {
  globalBus.__eventBus = new EventBus();
  console.info("[event-bus] Initialized");
}

export const eventBus = globalBus.__eventBus;
