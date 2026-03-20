"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/locale-context";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  const { t } = useLocale();

  // Mark messages as read when visiting chat
  useEffect(() => {
    fetch("/api/chat/unread", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <div className="chat-page">
      <ChatInterface />
    </div>
  );
}
