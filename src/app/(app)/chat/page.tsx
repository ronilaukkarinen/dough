"use client";

import { useLocale } from "@/lib/locale-context";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  const { t } = useLocale();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t.chat.title}
        </h1>
      </div>
      <ChatInterface />
    </div>
  );
}
