import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send, Image, History, Zap, Plus, X,
  Loader2, FolderOpen, Globe, Terminal, Square,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatHistory } from "@/components/chat/ChatHistory";
import { ContextHealthBar } from "./ContextHealthBar";
import { FileSidebar } from "./FileSidebar";
import { LivePreviewPanel } from "./LivePreviewPanel";
import { useCodeChat } from "@/hooks/useCodeChat";
import { useShutdownListener } from "@/hooks/useShutdownListener";
import { useToast } from "@/hooks/use-toast";
import { t, langLabels, type Lang } from "@/lib/i18n";
import { extractFilesFromMessages, buildPreviewHtml } from "@/lib/fileExtractor";
import { supabase } from "@/integrations/supabase/client";

interface OrchestratorDashboardProps {
  onBack: () => void;
}

export const OrchestratorDashboard = ({ onBack }: OrchestratorDashboardProps) => {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fastMode, setFastMode] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useShutdownListener();

  const {
    messages, isLoading, sessions,
    streamChat, stopStreaming, startNewChat, loadSession, deleteSession,
  } = useCodeChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const projectFiles = useMemo(() => extractFilesFromMessages(messages), [messages]);
  const previewHtml = useMemo(() => buildPreviewHtml(projectFiles), [projectFiles]);

  // Save project to DB when we have files
  useEffect(() => {
    const saveProject = async () => {
      if (projectFiles.length === 0 || !previewHtml) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const firstMsg = messages.find(m => m.role === "user");
      const name = firstMsg
        ? (typeof firstMsg.content === "string" ? firstMsg.content : "AI Project").slice(0, 60)
        : "AI Project";

      await supabase.from("projects").upsert(
        { user_id: user.id, name, html_content: previewHtml },
        { onConflict: "user_id,name" as any }
      ).select();
    };
    saveProject();
  }, [previewHtml, projectFiles.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Too large", description: "Max 10MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const getMessageText = (content: any): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.find((c: any) => c.type === "text")?.text || "";
    }
    return "";
  };

  const getMessageImage = (content: any): string | null => {
    if (Array.isArray(content)) {
      return content.find((c: any) => c.type === "image_url")?.image_url?.url || null;
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if ((!message && !imagePreview) || isLoading) return;

    const prefix = fastMode ? "[FAST MODE] Be extremely concise. Minimal explanation, maximum code. " : "";
    streamChat((prefix + message) || "Analyze this image.", imagePreview || undefined);
    setInput("");
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const cycleLang = () => {
    const langs: Lang[] = ["en", "bs", "hr", "sr"];
    const idx = langs.indexOf(lang);
    setLang(langs[(idx + 1) % langs.length]);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">CoderAi</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">v2.0</span>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {fastMode ? t(lang, "fastMode") : t(lang, "normalMode")}
            </span>
            <Switch checked={fastMode} onCheckedChange={setFastMode} className="h-5 w-9" />
            {fastMode && <Zap className="h-3.5 w-3.5 text-primary" />}
          </div>

          {/* Context Health */}
          <div className="hidden md:flex ml-2 pl-2 border-l border-border">
            <ContextHealthBar messages={messages} lang={lang} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={cycleLang} className="h-7 gap-1.5 text-xs px-2">
            <Globe className="h-3.5 w-3.5" />
            {langLabels[lang]}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowFiles(!showFiles)} className="h-7 gap-1.5 text-xs px-2">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(lang, "projectFiles")}</span>
            {projectFiles.length > 0 && (
              <span className="text-[10px] font-mono bg-primary/10 text-primary px-1 rounded">
                {projectFiles.length}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="h-7 gap-1.5 text-xs px-2">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(lang, "history")}</span>
          </Button>
          <Button variant="default" size="sm" onClick={startNewChat} className="h-7 gap-1.5 text-xs px-2">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(lang, "newChat")}</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <Terminal className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold mb-1.5">{t(lang, "welcome")}</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">{t(lang, "welcomeSub")}</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const text = getMessageText(message.content);
                  const image = getMessageImage(message.content);
                  return (
                    <div key={index}>
                      {image && message.role === "user" && (
                        <div className="flex justify-end px-4 pt-2">
                          <img src={image} alt="Uploaded" className="max-w-[180px] max-h-[180px] rounded-lg border border-border object-cover" />
                        </div>
                      )}
                      <ChatMessage role={message.role} content={text} />
                    </div>
                  );
                })
              )}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 p-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-muted-foreground">{t(lang, "thinking")}</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3 bg-card shrink-0">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              {imagePreview && (
                <div className="mb-2 relative inline-block">
                  <img src={imagePreview} alt="Preview" className="h-16 rounded-lg border border-border object-cover" />
                  <button type="button" onClick={() => setImagePreview(null)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="relative flex items-end gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <Button type="button" variant="ghost" size="icon" disabled={isLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute left-2 bottom-2 h-7 w-7 text-muted-foreground hover:text-foreground">
                  <Image className="h-4 w-4" />
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={imagePreview ? t(lang, "imagePrompt") : t(lang, "sendPlaceholder")}
                  className="min-h-[48px] max-h-28 resize-none pl-11 pr-20 text-sm"
                  disabled={false}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  {isLoading && (
                    <Button type="button" size="icon" variant="destructive" className="h-7 w-7" onClick={stopStreaming}>
                      <Square className="h-3 w-3" />
                    </Button>
                  )}
                  <Button type="submit" size="icon" disabled={(!input.trim() && !imagePreview) || isLoading} className="h-7 w-7">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">{t(lang, "enterSend")}</p>
            </form>
          </div>
        </div>

        {/* Live Preview */}
        <div className="hidden lg:block w-[45%] shrink-0">
          <LivePreviewPanel html={previewHtml} lang={lang} />
        </div>

        {/* File Sidebar */}
        {showFiles && (
          <FileSidebar
            files={projectFiles}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            onClose={() => setShowFiles(false)}
            lang={lang}
          />
        )}
      </div>

      {/* Chat History */}
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
