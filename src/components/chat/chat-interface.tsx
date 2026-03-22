"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Copy, Check, Paperclip, X, ChevronUp } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { useEvent } from "@/lib/use-events";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { copyToClipboard } from "@/lib/clipboard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sender?: string;
  image_thumb?: string;
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
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
  const [chatImageType, setChatImageType] = useState("");
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const chatFileRef = useRef<HTMLInputElement>(null);
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
          console.info("[chat] Loaded", data.messages.length, "messages, hasOlder:", data.hasOlder);
          const msgs = data.messages.map((m: { id: number; role: string; content: string; sender?: string; image_thumb?: string }) => ({
            id: m.id.toString(),
            role: m.role as "user" | "assistant",
            content: m.content,
            sender: m.sender,
            image_thumb: m.image_thumb || undefined,
          }));
          setMessages(msgs);
          setHasOlder(!!data.hasOlder);
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

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasOlder || messages.length === 0) return;
    const oldestId = messages[0]?.id;
    if (!oldestId || oldestId === "greeting") return;

    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/chat/messages?before=${oldestId}`);
      const data = await res.json();
      if (data.messages?.length > 0) {
        const older = data.messages.map((m: { id: number; role: string; content: string; sender?: string; image_thumb?: string }) => ({
          id: m.id.toString(),
          role: m.role as "user" | "assistant",
          content: m.content,
          sender: m.sender,
          image_thumb: m.image_thumb || undefined,
        }));
        setMessages((prev) => [...older, ...prev]);
        setHasOlder(!!data.hasOlder);
        console.info("[chat] Loaded", older.length, "older messages, hasOlder:", data.hasOlder);
      } else {
        setHasOlder(false);
      }
    } catch (err) {
      console.error("[chat] Failed to load older messages:", err);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasOlder, messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userContent = input.trim();
    const thumb = chatImagePreview || undefined;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      sender: currentUser,
      image_thumb: thumb,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Stop typing indicator
    fetch("/api/chat/typing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ typing: false }) }).catch(() => {});

    // Save user message with thumbnail
    try {
      await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: userContent, image_thumb: thumb }),
      });
      messageCountRef.current++;
    } catch {}

    // Fire AI request (include image if attached)
    const chatBody: Record<string, unknown> = {
      messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
    };
    if (chatImage) {
      chatBody.image = chatImage;
      chatBody.image_media_type = chatImageType;
      chatBody.add_expense = true;
      setChatImage(null);
      setChatImagePreview(null);
      setChatImageType("");
    }

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatBody),
    })
      .then((r) => r.json())
      .then((data) => {
        // Add from fetch response if SSE hasn't delivered it yet (dedup prevents doubles)
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.role === "assistant" && m.content === data.message)) return prev;
            console.info("[chat] Adding assistant message from fetch response");
            return [...prev, { id: `fallback-${Date.now()}`, role: "assistant" as const, content: data.message }];
          });
          setLoading(false);
        }
      })
      .catch(() => {
        console.warn("[chat] AI request failed");
        setLoading(false);
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
          {hasOlder && (
            <div className="chat-load-older">
              <button type="button" className="chat-load-older-btn" onClick={loadOlder} disabled={loadingOlder}>
                <ChevronUp />
                {loadingOlder ? "..." : (t.chat.loadOlder || "Load older")}
              </button>
            </div>
          )}
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
                {message.image_thumb && (
                  message.image_thumb === "pdf"
                    ? <span className="chat-pdf-badge">PDF</span>
                    : message.image_thumb.startsWith("data:application/pdf")
                      ? <object data={message.image_thumb} type="application/pdf" className="chat-pdf-preview">{/* PDF */}</object>
                      : <img src={message.image_thumb} alt="" className="chat-bubble-image" />
                )}
                {isOtherUser && message.sender && (
                  <div className="chat-message-sender">{message.sender}</div>
                )}
                <div className="chat-message-text">
                  {message.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
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
                      copyToClipboard(message.content).then(() => {
                        setCopiedId(message.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      });
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
        {chatImagePreview && (
          <div className="chat-image-preview">
            {chatImagePreview.startsWith("data:application/pdf")
              ? <object data={chatImagePreview} type="application/pdf" className="chat-pdf-preview">{/* PDF */}</object>
              : <img src={chatImagePreview} alt="Attached" />}
            <button type="button" className="chat-image-remove" onClick={() => { setChatImage(null); setChatImagePreview(null); setChatImageType(""); }}>
              <X />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            ref={chatFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              console.info("[chat] File attached:", file.name, file.type);
              setChatImageType(file.type);
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                setChatImage(dataUrl.split(",")[1]);
                // For images, create a small thumbnail for persistence. For PDFs, use a placeholder.
                if (file.type.startsWith("image/")) {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const maxSize = 200;
                    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setChatImagePreview(canvas.toDataURL("image/jpeg", 0.7));
                  };
                  img.src = dataUrl;
                } else if (file.type === "application/pdf") {
                  setChatImagePreview(dataUrl);
                }
              };
              reader.readAsDataURL(file);
              e.target.value = "";
            }}
          />
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
          <div className="chat-action-buttons">
            <button type="button" className="chat-attach-btn" onClick={() => chatFileRef.current?.click()} disabled={loading}>
              <Paperclip />
            </button>
            <Button type="submit" size="icon" className="chat-send-button" disabled={!input.trim() || loading}>
              <Send />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
