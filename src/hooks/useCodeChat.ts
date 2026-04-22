import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

type MessageContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

type Message = { role: "user" | "assistant"; content: MessageContent };

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-chat`;
const STORAGE_KEY = "code-chat-sessions";

const readStoredSessions = (): ChatSession[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((session: any) => ({
      ...session,
      timestamp: new Date(session.timestamp),
      messages: Array.isArray(session.messages) ? session.messages : [],
    }));
  } catch (error) {
    console.warn("Failed to restore chat sessions", error);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

export const useCodeChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSessions(readStoredSessions());
  }, []);

  const persistSessions = (nextSessions: ChatSession[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSessions));
  };

  const saveSession = (currentMessages: Message[]) => {
    if (currentMessages.length === 0) return;
    
    const firstUserMessage = currentMessages.find(m => m.role === "user");
    const contentText = firstUserMessage ? (
      typeof firstUserMessage.content === "string" 
        ? firstUserMessage.content 
        : firstUserMessage.content.find(c => c.type === "text")?.text || "Image chat"
    ) : "New Chat";
    const title = contentText.slice(0, 50) + (contentText.length > 50 ? "..." : "");
    
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title,
      timestamp: new Date(),
      messages: currentMessages,
    };
    
    setSessions(prev => {
      const updated = [newSession, ...prev].slice(0, 50);
      persistSessions(updated);
      return updated;
    });
  };

  const stopStreaming = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  const streamChat = async (userMessage: string, imageBase64?: string) => {
    // If currently streaming, abort first
    if (abortRef.current) {
      abortRef.current.abort();
    }

    let content: MessageContent;
    if (imageBase64) {
      content = [
        { type: "text", text: userMessage || "Analyze this image in detail." },
        { type: "image_url", image_url: { url: imageBase64 } },
      ];
    } else {
      content = userMessage;
    }

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      const finalMessages = [...newMessages, { role: "assistant" as const, content: assistantContent }];
      setMessages(finalMessages);
      saveSession(finalMessages);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // User stopped — keep what we have
        if (assistantContent) {
          const partial = [...newMessages, { role: "assistant" as const, content: assistantContent }];
          setMessages(partial);
        }
        return;
      }
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    if (messages.length > 0) {
      saveSession(messages);
    }
    setMessages([]);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      persistSessions(updated);
      return updated;
    });
  };

  return {
    messages,
    isLoading,
    sessions,
    streamChat,
    stopStreaming,
    startNewChat,
    loadSession,
    deleteSession,
  };
};
