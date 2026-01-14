import { useState, useRef, useEffect } from "react";
import { Send, Plus, History, Code2, Loader2 } from "lucide-react";
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
  const [isIdentified, setIsIdentified] = useState(false);
  const [awaitingIdentification, setAwaitingIdentification] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const isCodeRequest = (message: string) => {
    const codeKeywords = [
      "make", "create", "build", "generate", "write", "code", "implement",
      "develop", "design", "add", "fix", "update", "modify", "change"
    ];
    const lowerMessage = message.toLowerCase();
    return codeKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    // Check if typing "Identification" to show history
    if (message.toLowerCase() === "identification") {
      setShowHistory(true);
      setInput("");
      return;
    }

    // Check if awaiting identification response
    if (awaitingIdentification) {
      if (message.toLowerCase() === "mirko") {
        setIsIdentified(true);
        setAwaitingIdentification(false);
        toast({
          title: "Access Granted",
          description: "Welcome, Mirko! Processing your request...",
        });
        if (pendingMessage) {
          streamChat(pendingMessage);
          setPendingMessage(null);
        }
      } else {
        toast({
          title: "Access Denied",
          description: "Sorry, you don't have permission. Try again.",
          variant: "destructive",
        });
        setAwaitingIdentification(false);
        setPendingMessage(null);
      }
      setInput("");
      return;
    }

    // Check if this is a code request that needs identification
    if (isCodeRequest(message) && !isIdentified) {
      setPendingMessage(message);
      setAwaitingIdentification(true);
      setInput("");
      return;
    }

    // Send message (either already identified or not a code request)
    streamChat(message);
    setInput("");
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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
          <Button
            variant="default"
            size="sm"
            onClick={startNewChat}
            className="gap-2"
          >
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
                Your AI-powered coding assistant. Ask me anything about code!
              </p>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                💡 Tip: Type <code className="bg-background px-1.5 py-0.5 rounded font-mono">Identification</code> to access chat history
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage key={index} role={message.role} content={message.content} />
            ))
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

      {/* Identification Prompt */}
      {awaitingIdentification && (
        <div className="px-4 pb-2 max-w-4xl mx-auto w-full">
          <div className="p-4 bg-muted rounded-lg border border-border">
            <p className="font-medium text-sm mb-2">🔐 Identification Required</p>
            <p className="text-xs text-muted-foreground">
              Please type your name in the chat to continue with this code request.
            </p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4 bg-card">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about code..."
              className="min-h-[56px] max-h-32 resize-none pr-12"
              disabled={isLoading || !!pendingMessage}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading || !!pendingMessage}
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
