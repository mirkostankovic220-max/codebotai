import { X, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (id: string) => void;
  onClose: () => void;
}

export const ChatHistory = ({ sessions, onSelectSession, onDeleteSession, onClose }: ChatHistoryProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-0 top-0 h-full w-80 bg-card border-r border-border shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Chat History</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-65px)]">
          <div className="p-2">
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No chat history yet
              </p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-2 p-3 rounded-lg hover:bg-accent cursor-pointer mb-1"
                  onClick={() => onSelectSession(session)}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
