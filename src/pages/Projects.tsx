import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Terminal, Plus, Trash2, Eye, LogOut, ArrowRight,
  Shield, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useShutdownListener } from "@/hooks/useShutdownListener";

interface Project {
  id: string;
  name: string;
  html_content: string;
  created_at: string;
  updated_at: string;
}

interface ProjectsProps {
  onOpenChat: () => void;
}

const Projects = ({ onOpenChat }: ProjectsProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [username, setUsername] = useState("");
  const [isMod, setIsMod] = useState(false);
  const [cmdInput, setCmdInput] = useState("");
  const { toast } = useToast();

  useShutdownListener();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();
      if (profile) setUsername(profile.username);

      // Check moderator
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (roles?.some((r: any) => r.role === "moderator")) setIsMod(true);

      // Load projects
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (data) setProjects(data);
      setLoading(false);
    };
    init();
  }, []);

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((p) => p.filter((x) => x.id !== id));
    if (previewProject?.id === id) setPreviewProject(null);
  };

  const handleCommand = async () => {
    if (!cmdInput.startsWith("/")) return;
    const cmd = cmdInput.slice(1).toLowerCase().trim();
    setCmdInput("");

    if (cmd === "shutdown") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("system_commands").insert({
        command: "shutdown",
        issued_by: user.id,
        reason: "Server has been shutdown or its Update",
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Shutdown issued", description: "All users will be disconnected." });
      }
    } else {
      toast({ title: "Unknown command", description: `/${cmd}`, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="font-bold text-sm tracking-tight">CoderAi</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">v2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isMod && <Shield className="inline h-3 w-3 mr-1 text-primary" />}
            {username}
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onOpenChat}>
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Projects List */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-lg font-bold">Your Projects</h2>
            <p className="text-xs text-muted-foreground">Projects created by AI conversations</p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {loading ? (
                <div className="col-span-full flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : projects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Terminal className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No projects yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a chat to create your first project</p>
                  <Button size="sm" className="mt-4 gap-2" onClick={onOpenChat}>
                    <ArrowRight className="h-3.5 w-3.5" /> Start Coding
                  </Button>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="bg-card border border-border rounded-lg p-3 group hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold truncate flex-1">{project.name}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteProject(project.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                    {project.html_content && (
                      <div className="mt-2 h-24 rounded border border-border overflow-hidden bg-background">
                        <iframe
                          srcDoc={project.html_content}
                          className="w-full h-full border-0 pointer-events-none"
                          sandbox="allow-scripts"
                          title={project.name}
                        />
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="mt-2 w-full gap-1.5 text-xs"
                      onClick={() => setPreviewProject(project)}
                      disabled={!project.html_content}
                    >
                      <Eye className="h-3 w-3" /> Run Preview
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Moderator Command Bar */}
          {isMod && (
            <div className="border-t border-border p-2 bg-card">
              <div className="flex items-center gap-2 max-w-xl mx-auto">
                <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                <input
                  value={cmdInput}
                  onChange={(e) => setCmdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCommand()}
                  placeholder="/shutdown"
                  className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCommand}>
                  Run
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {previewProject && (
          <div className="hidden md:flex flex-col w-[45%] border-l border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-semibold truncate">{previewProject.name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreviewProject(null)}>
                <span className="text-xs">✕</span>
              </Button>
            </div>
            <div className="flex-1 bg-background">
              {previewProject.html_content ? (
                <iframe
                  srcDoc={previewProject.html_content}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title={previewProject.name}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                  No preview available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
