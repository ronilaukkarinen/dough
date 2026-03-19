"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Copy, Check } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { useEvent } from "@/lib/use-events";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sender?: string;
}

export function ChatInterface() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageCountRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      const viewport = el.querySelector("[data-slot=scroll-area-viewport]") || el.firstElementChild;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, []);

  // Load messages and start polling
  useEffect(() => {
    console.debug("[chat] Loading messages and user");
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) setCurrentUser(d.user.display_name || d.user.email);
    }).catch(() => {});

    fetch("/api/chat/messages")
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          console.info("[chat] Loaded", data.messages.length, "messages");
          const msgs = data.messages.map((m: { id: number; role: string; content: string; sender?: string }) => ({
            id: m.id.toString(),
            role: m.role as "user" | "assistant",
            content: m.content,
            sender: m.sender,
          }));
          setMessages(msgs);
          messageCountRef.current = msgs.length;
        } else {
          const greeting = t.chat.greeting;
          setMessages([{ id: "greeting", role: "assistant", content: greeting }]);
          fetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", content: greeting }),
          }).catch(() => {});
          messageCountRef.current = 1;
        }
      })
      .catch(() => {
        setMessages([{ id: "greeting", role: "assistant", content: t.chat.greeting }]);
      })
      .finally(() => {
        setInitialLoading(false);
        setTimeout(scrollToBottom, 100);
      });

  }, []);

  // SSE: receive new chat messages in real time
  useEvent("chat:message", useCallback((data: unknown) => {
    const msg = data as { id: number; role: string; content: string; sender: string | null; userId: number | null };
    console.debug("[chat] SSE message received:", msg.role, msg.sender);
    setMessages((prev) => {
      // Avoid duplicates — check by DB id OR by matching content+role (optimistic vs SSE)
      if (prev.some((m) => m.id === String(msg.id) || (m.content === msg.content && m.role === msg.role))) return prev;
      return [...prev, {
        id: String(msg.id),
        role: msg.role as "user" | "assistant",
        content: msg.content,
        sender: msg.sender || undefined,
      }];
    });
    messageCountRef.current++;
    if (msg.role === "assistant") setLoading(false);
    setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]));

  // SSE: receive typing indicators in real time
  useEvent("chat:typing", useCallback((data: unknown) => {
    const typing = data as { userId: number; name: string; typing: boolean };
    setTypingUsers((prev) => {
      if (typing.typing) {
        return prev.includes(typing.name) ? prev : [...prev, typing.name];
      }
      return prev.filter((n) => n !== typing.name);
    });
  }, []));

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Broadcast typing status
  const broadcastTyping = useCallback(() => {
    fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typing: true }),
    }).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: false }),
      }).catch(() => {});
    }, 4000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      sender: currentUser,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Stop typing indicator
    fetch("/api/chat/typing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ typing: false }) }).catch(() => {});

    // Save user message
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: userContent }),
      });
      messageCountRef.current++;
    } catch {}

    // Fire AI request
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
      }),
    })
      .then((r) => r.json())
      .then(() => {
        // Response handled via SSE broadcast — don't add here to avoid duplicates
      })
      .catch(() => {
        console.warn("[chat] AI request failed, SSE will pick up response if it completes");
      });
  };

  if (initialLoading) {
    return (
      <div className="chat-container">
        <div className="chat-loading-center">
          <div className="typing-dots"><span /><span /><span /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <ScrollArea className="chat-messages" ref={scrollRef}>
        <div className="chat-messages-list">
          {messages.map((message) => {
            const isSelf = message.role === "user" && message.sender === currentUser;
            const isOtherUser = message.role === "user" && message.sender !== currentUser;
            const bubbleType = message.role === "assistant" ? "assistant" : isSelf ? "self" : "other";

            return (
            <div key={message.id} className="chat-message" data-type={bubbleType}>
              {bubbleType !== "self" && (
                <div className="chat-message-avatar" data-type={bubbleType}>
                  {message.role === "assistant" ? <Bot /> : <User />}
                </div>
              )}
              <div className="chat-message-bubble" data-type={bubbleType}>
                {isOtherUser && message.sender && (
                  <div className="chat-message-sender">{message.sender}</div>
                )}
                <div className="chat-message-text">
                  {message.role === "assistant" ? (
                    <ReactMarkdown components={{
                      strong: ({ children }) => {
                        const text = String(children);
                        const hasEuro = text.includes("€");
                        if (!hasEuro) return <strong>{children}</strong>;
                        const hasMinus = text.includes("-") || text.includes("\u2212");
                        const hasPercent = text.includes("%");
                        const cls = hasMinus ? "chat-amount-negative" : hasPercent ? "chat-amount-neutral" : "chat-amount-positive";
                        return <strong className={cls}>{children}</strong>;
                      }
                    }}>{message.content}</ReactMarkdown>
                  ) : message.content}
                </div>
                {message.role === "assistant" && (
                  <button
                    type="button"
                    className="chat-copy-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        navigator.clipboard.writeText(message.content).then(() => {
                          setCopiedId(message.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        });
                      } catch {
                        const ta = document.createElement("textarea");
                        ta.value = message.content;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand("copy");
                        document.body.removeChild(ta);
                        setCopiedId(message.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }
                    }}
                  >
                    {copiedId === message.id ? <Check /> : <Copy />}
                  </button>
                )}
              </div>
              {bubbleType === "self" && (
                <div className="chat-message-avatar" data-type="self"><User /></div>
              )}
            </div>
            );
          })}
          {loading && (
            <div className="chat-loading">
              <div className="chat-message-avatar" data-type="assistant"><Bot /></div>
              <div className="chat-loading-bubble">
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            </div>
          )}
          {typingUsers.length > 0 && !loading && (
            <div className="chat-typing-indicator">
              {typingUsers.join(", ")} {typingUsers.length === 1
                ? (t.chat.thinking || "is typing...")
                : (t.chat.thinking || "are typing...")}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <textarea
            ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              if (e.target.value.length > 0) broadcastTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={t.chat.placeholder}
            className="chat-textarea"
            disabled={loading}
            rows={1}
          />
          <Button type="submit" size="icon" className="chat-send-button" disabled={!input.trim() || loading}>
            <Send />
          </Button>
        </form>
      </div>
    </div>
  );
}
