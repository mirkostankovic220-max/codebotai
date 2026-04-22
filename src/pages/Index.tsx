import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import Auth from "@/pages/Auth";
import Projects from "@/pages/Projects";
import { OrchestratorDashboard } from "@/components/orchestrator/OrchestratorDashboard";

const Index = () => {
  const [view, setView] = useState<"projects" | "chat">("projects");

  return (
    <AuthGuard fallback={<Auth />}>
      {view === "projects" ? (
        <Projects onOpenChat={() => setView("chat")} />
      ) : (
        <OrchestratorDashboard onBack={() => setView("projects")} />
      )}
    </AuthGuard>
  );
};

export default Index;
