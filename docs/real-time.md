## Real-time event system

Dough uses Server-Sent Events (SSE) for real-time updates across all connected clients. No WebSocket server or extra services needed.

### Architecture

```
Client A (browser) ──EventSource──> /api/events ──┐
                                                   ├── EventBus (in-memory, Node.js singleton)
Client B (browser) ──EventSource──> /api/events ──┘
                                                   ↑
API routes emit events ────────────────────────────┘
```

### Event types

- `chat:message` - new chat message from any user or AI
- `chat:typing` - typing indicator start/stop
- `sync:complete` - YNAB sync finished
- `data:updated` - any data change (transaction added, etc)

### How it works

1. `src/lib/event-bus.ts` - in-memory pub/sub singleton, lives in the Node.js process
2. `src/app/api/events/route.ts` - SSE endpoint, subscribes to EventBus, streams events to client
3. `src/lib/use-events.ts` - client hook, manages shared EventSource connection
4. API routes call `eventBus.emit()` when data changes

### Client usage

```tsx
import { useEvent } from "@/lib/use-events";

// In any component
useEvent("sync:complete", useCallback((data) => {
  console.log("Sync finished!", data);
  refreshDashboard();
}, []));
```

### Connection management

- Single shared EventSource per browser tab
- Auto-reconnects on disconnect (3s delay)
- Heartbeat every 15s keeps connection alive
- Disconnects when no components are subscribed

### Fallback

If SSE fails (proxy issues, etc), the app still works. The initial data loads via normal fetch calls. SSE just makes updates instant instead of requiring page refresh.

### Limitations

- EventBus is in-memory, doesn't persist across server restarts
- Only works within a single Node.js process (no clustering)
- Fine for a personal/household app with 2-5 users
