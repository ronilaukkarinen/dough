"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Load persisted messages on mount
  useEffect(() => {
    console.debug("[chat] Loading persisted messages");
    fetch("/api/chat/messages")
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          console.info("[chat] Loaded", data.messages.length, "messages");
          setMessages(
            data.messages.map((m: { id: number; role: string; content: string }) => ({
              id: m.id.toString(),
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        } else {
          // Save greeting to DB so it persists
          const greeting = t.chat.greeting;
          setMessages([{ id: "greeting", role: "assistant", content: greeting }]);
          fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", content: greeting }),
          }).catch(() => {});
        }
      })
      .catch(() => {
        setMessages([{ id: "greeting", role: "assistant", content: t.chat.greeting }]);
      })
      .finally(() => setInitialLoading(false));
  }, []);

  // Poll for new messages when waiting for AI response
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    console.debug("[chat] Starting poll for AI response");
    pollRef.current = setInterval(() => {
      fetch("/api/chat/messages")
        .then((r) => r.json())
        .then((data) => {
          if (data.messages?.length > 0) {
            const latest = data.messages[data.messages.length - 1];
            if (latest.role === "assistant") {
              console.info("[chat] AI response received via poll");
              setMessages(
                data.messages.map((m: { id: number; role: string; content: string }) => ({
                  id: m.id.toString(),
                  role: m.role as "user" | "assistant",
                  content: m.content,
                }))
              );
              setLoading(false);
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            }
          }
        })
        .catch(() => {});
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Save user message
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: userContent }),
      });
    } catch {}

    // Start polling for response (so user can navigate away)
    startPolling();

    // Fire and forget the AI request
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.message,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setLoading(false);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          // Save assistant message
          fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", content: data.message }),
          }).catch(() => {});
        }
      })
      .catch(() => {
        // Don't save errors, just keep polling
        console.warn("[chat] AI request failed, polling will pick up response if it completes");
      });
  };

  if (initialLoading) {
    return (
      <div className="chat-container">
        <div className="chat-loading-center">
          <div className="typing-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
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
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
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
