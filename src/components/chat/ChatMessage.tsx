import { User, Bot } from "lucide-react";
import { MessageContent } from "./MessageContent";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={`flex gap-4 p-4 ${isUser ? "bg-muted/50" : "bg-background"}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? "bg-primary text-primary-foreground" : "bg-emerald-600 text-white"
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm mb-1">{isUser ? "You" : "Code Assistant"}</p>
        <div className="text-foreground">
          <MessageContent content={content} />
        </div>
      </div>
    </div>
  );
};
