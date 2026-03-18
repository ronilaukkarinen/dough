import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          AI Advisor
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask anything about your finances
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
