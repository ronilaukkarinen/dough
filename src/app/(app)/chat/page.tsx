"use client";

import { useLocale } from "@/lib/locale-context";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  const { t } = useLocale();
  return (
    <div className="page-stack">
      <div>
        <h1 className="page-heading">{t.chat.title}</h1>
      </div>
      <ChatInterface />
    </div>
  );
}
