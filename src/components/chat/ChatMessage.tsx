import { User, Terminal } from "lucide-react";
import { MessageContent } from "./MessageContent";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 px-4 py-3 ${isUser ? "bg-muted/30" : "bg-background"}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
        isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/15 text-primary"
      }`}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Terminal className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-xs mb-1 text-muted-foreground">{isUser ? "You" : "CoderAi"}</p>
        <div className="text-sm text-foreground">
          <MessageContent content={content} />
        </div>
      </div>
    </div>
  );
};
