"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const GREETING = `Hi! I'm your financial advisor. I can see your YNAB data and help you make better money decisions.

Try asking me things like:
• "Can we afford eating out tonight?"
• "How much have we spent on groceries this month?"
• "What subscriptions can I cut?"
• "When will we be debt-free?"`;

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      role: "assistant",
      content: GREETING,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

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

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message || "Sorry, I couldn't process that. Try again.",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="chat-container">
      {/* Messages */}
      <ScrollArea className="chat-messages" ref={scrollRef}>
        <div className="chat-messages-list">
          {messages.map((message) => (
            <div
              key={message.id}
              className="chat-message"
              data-role={message.role}
            >
              {message.role === "assistant" && (
                <div className="chat-message-avatar" data-role="assistant">
                  <Bot />
                </div>
              )}
              <div
                className="chat-message-bubble"
                data-role={message.role}
              >
                <div className="chat-message-text">{message.content}</div>
              </div>
              {message.role === "user" && (
                <div className="chat-message-avatar" data-role="user">
                  <User />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-loading">
              <div className="chat-message-avatar" data-role="assistant">
                <Bot />
              </div>
              <div className="chat-loading-bubble">
                <Loader2 className="chat-loading-spinner animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances..."
            className="chat-input"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            className="chat-send-button"
            disabled={!input.trim() || loading}
          >
            <Send />
          </Button>
        </form>
      </div>
    </div>
  );
}
