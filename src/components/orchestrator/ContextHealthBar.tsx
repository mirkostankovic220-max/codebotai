import { t, type Lang } from "@/lib/i18n";
import { Brain } from "lucide-react";

interface ContextHealthBarProps {
  messages: Array<{ role: string; content: any }>;
  lang: Lang;
}

const MAX_CONTEXT = 128000; // approximate token limit

const estimateTokens = (messages: Array<{ role: string; content: any }>): number => {
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") chars += m.content.length;
    else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part.type === "text") chars += part.text.length;
        if (part.type === "image_url") chars += 1000; // images cost more
      }
    }
  }
  return Math.floor(chars / 4); // rough char-to-token estimate
};

export const ContextHealthBar = ({ messages, lang }: ContextHealthBarProps) => {
  const tokens = estimateTokens(messages);
  const pct = Math.min((tokens / MAX_CONTEXT) * 100, 100);
  
  const getColor = () => {
    if (pct < 50) return "bg-emerald-500";
    if (pct < 80) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2 px-3">
      <Brain className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
        {t(lang, "contextHealth")}
      </span>
      <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{Math.round(pct)}%</span>
    </div>
  );
};
