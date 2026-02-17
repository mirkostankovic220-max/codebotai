import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useShutdownListener = () => {
  useEffect(() => {
    const channel = supabase
      .channel("system-commands")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_commands" },
        (payload) => {
          const cmd = payload.new;
          if (cmd.command === "shutdown") {
            // Show shutdown overlay and sign out
            document.body.innerHTML = `
              <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0b;color:#fff;font-family:monospace;flex-direction:column;gap:12px;">
                <div style="font-size:24px;font-weight:bold;">⚠️ Server Shutdown</div>
                <div style="color:#888;font-size:14px;">${cmd.reason || "Server has been shutdown or its Update"}</div>
              </div>
            `;
            supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
