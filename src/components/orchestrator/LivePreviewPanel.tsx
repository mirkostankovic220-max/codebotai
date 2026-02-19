import { Monitor, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t, type Lang } from "@/lib/i18n";
import { useState } from "react";

interface LivePreviewPanelProps {
  html: string | null;
  lang: Lang;
}

export const LivePreviewPanel = ({ html, lang }: LivePreviewPanelProps) => {
  const [key, setKey] = useState(0);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            {t(lang, "livePreview")}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setKey(k => k + 1)}
          disabled={!html}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 bg-background">
        {html ? (
          <iframe
            key={key}
            srcDoc={html}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-modals"
            title="Live Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Monitor className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-xs">{t(lang, "livePreview")}</p>
              <p className="text-[10px] mt-1 opacity-50">HTML output will render here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
