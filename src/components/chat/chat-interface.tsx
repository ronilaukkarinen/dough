"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

async function saveMessage(role: string, content: string) {
  try {
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    });
    console.debug("[chat] Message saved:", role);
  } catch (err) {
    console.error("[chat] Failed to save message:", err);
  }
}

export function ChatInterface() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted messages on mount
  useEffect(() => {
    console.debug("[chat] Loading persisted messages");
    fetch("/api/chat/messages")
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          console.info("[chat] Loaded", data.messages.length, "messages from database");
          setMessages(
            data.messages.map((m: { id: number; role: string; content: string; created_at: string }) => ({
              id: m.id.toString(),
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: new Date(m.created_at),
            }))
          );
        } else {
          // Show greeting if no history
          setMessages([
            {
              id: "greeting",
              role: "assistant",
              content: t.chat.greeting,
              timestamp: new Date(),
            },
          ]);
        }
      })
      .catch((err) => {
        console.error("[chat] Failed to load messages:", err);
        setMessages([
          {
            id: "greeting",
            role: "assistant",
            content: t.chat.greeting,
            timestamp: new Date(),
          },
        ]);
      })
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userContent = input.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Save user message to DB
    saveMessage("user", userContent);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const assistantContent = data.message || t.chat.errorProcess;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
        },
      ]);

      // Save assistant message to DB
      saveMessage("assistant", assistantContent);
    } catch {
      const errorContent = t.chat.errorGeneral;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
        },
      ]);
      saveMessage("assistant", errorContent);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearChat = async () => {
    console.info("[chat] Clearing chat history");
    try {
      await fetch("/api/chat/messages", { method: "DELETE" });
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: t.chat.greeting,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error("[chat] Failed to clear chat:", err);
    }
  };

  if (initialLoading) {
    return (
      <div className="chat-container">
        <div className="chat-loading">
          <Loader2 className="chat-loading-spinner animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {messages.length > 1 && (
        <div className="chat-toolbar">
          <button className="chat-clear-btn" onClick={handleClearChat} title="Clear chat">
            <Trash2 />
          </button>
        </div>
      )}
      <ScrollArea className="chat-messages" ref={scrollRef}>
        <div className="chat-messages-list">
          {messages.map((message) => (
            <div key={message.id} className="chat-message" data-role={message.role}>
              {message.role === "assistant" && (
                <div className="chat-message-avatar" data-role="assistant"><Bot /></div>
              )}
              <div className="chat-message-bubble" data-role={message.role}>
                <div className="chat-message-text">{message.content}</div>
              </div>
              {message.role === "user" && (
                <div className="chat-message-avatar" data-role="user"><User /></div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-loading">
              <div className="chat-message-avatar" data-role="assistant"><Bot /></div>
              <div className="chat-loading-bubble">
                <Loader2 className="chat-loading-spinner animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat.placeholder}
            className="chat-input"
            disabled={loading}
          />
          <Button type="submit" size="icon" className="chat-send-button" disabled={!input.trim() || loading}>
            <Send />
          </Button>
        </form>
      </div>
    </div>
  );
}
