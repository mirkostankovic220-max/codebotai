import { FileCode2, Download, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t, type Lang } from "@/lib/i18n";
import { type ProjectFile } from "@/lib/fileExtractor";
import JSZip from "jszip";

interface FileSidebarProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (name: string) => void;
  onClose: () => void;
  onLivePreview?: () => void;
  hasPreview?: boolean;
  lang: Lang;
}

export const FileSidebar = ({ files, selectedFile, onSelectFile, onClose, onLivePreview, hasPreview, lang }: FileSidebarProps) => {
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.name, file.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLangIcon = (lang: string) => {
    const colors: Record<string, string> = {
      html: "text-orange-400", css: "text-blue-400", javascript: "text-yellow-400",
      typescript: "text-blue-500", tsx: "text-blue-500", jsx: "text-yellow-400",
      python: "text-green-400", json: "text-amber-400", sql: "text-purple-400",
    };
    return colors[lang] || "text-muted-foreground";
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border w-64">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          {t(lang, "projectFiles")}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5">
          {files.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">{t(lang, "noFiles")}</p>
          ) : (
            files.map((file) => (
              <button
                key={file.name}
                onClick={() => onSelectFile(file.name)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                  selectedFile === file.name
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <FileCode2 className={`h-3.5 w-3.5 flex-shrink-0 ${getLangIcon(file.language)}`} />
                <span className="truncate">{file.name}</span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {files.length > 0 && (
        <div className="p-2 border-t border-border space-y-1.5">
          {onLivePreview && (
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2 text-xs h-8"
              onClick={onLivePreview}
              disabled={!hasPreview}
            >
              <Eye className="h-3.5 w-3.5" />
              Live Preview
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs h-8"
            onClick={handleDownloadZip}
          >
            <Download className="h-3.5 w-3.5" />
            {t(lang, "downloadZip")}
          </Button>
        </div>
      )}
    </div>
  );
};
