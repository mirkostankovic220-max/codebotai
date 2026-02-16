import { useState, useRef, useEffect } from "react";
import { Send, Image, History, Code2, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { ChatHistory } from "./ChatHistory";
import { useCodeChat } from "@/hooks/useCodeChat";
import { useToast } from "@/hooks/use-toast";

export const CodeChatInterface = () => {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    messages,
    isLoading,
    sessions,
    streamChat,
    startNewChat,
    loadSession,
    deleteSession,
  } = useCodeChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 10MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if ((!message && !imagePreview) || isLoading) return;

    if (message.toLowerCase() === "identification") {
      setShowHistory(true);
      setInput("");
      return;
    }

    streamChat(message || "Analyze this image.", imagePreview || undefined);
    setInput("");
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getMessageText = (content: any): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      const textPart = content.find((c: any) => c.type === "text");
      return textPart?.text || "";
    }
    return "";
  };

  const getMessageImage = (content: any): string | null => {
    if (Array.isArray(content)) {
      const imgPart = content.find((c: any) => c.type === "image_url");
      return imgPart?.image_url?.url || null;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">CodeBot</h1>
            <p className="text-xs text-muted-foreground">AI Coding Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
          <Button variant="default" size="sm" onClick={startNewChat} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center mb-6">
                <Code2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to CodeBot</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Your AI-powered coding assistant. Ask me anything about code or upload an image for analysis!
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const text = getMessageText(message.content);
              const image = getMessageImage(message.content);
              return (
                <div key={index}>
                  {image && message.role === "user" && (
                    <div className="flex justify-end px-4 pt-2">
                      <img src={image} alt="Uploaded" className="max-w-[200px] max-h-[200px] rounded-lg border border-border object-cover" />
                    </div>
                  )}
                  <ChatMessage role={message.role} content={text} />
                </div>
              );
            })
          )}
          
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-4 p-4 bg-background">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 bg-card">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-border object-cover" />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="relative flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute left-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Image className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={imagePreview ? "Add a prompt for the image..." : "Ask me anything about code..."}
              className="min-h-[56px] max-h-32 resize-none pl-12 pr-12"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={(!input.trim() && !imagePreview) || isLoading}
              className="absolute right-2 bottom-2 h-8 w-8"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift + Enter for new line
          </p>
        </form>
      </div>

      {/* Chat History Sidebar */}
      {showHistory && (
        <ChatHistory
          sessions={sessions}
          onSelectSession={(session) => {
            loadSession(session);
            setShowHistory(false);
          }}
          onDeleteSession={deleteSession}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};
