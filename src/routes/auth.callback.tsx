import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // The lovable broker calls supabase.auth.setSession() before redirecting
    // back here. We just wait for the session to be present, then bounce.
    let cancelled = false;

    async function go() {
      for (let i = 0; i < 50 && !cancelled; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      if (!cancelled) {
        toast.error("Sign-in did not complete. Please try again.");
        navigate({ to: "/login", replace: true });
      }
    }

    go();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Signing you in…
    </div>
  );
}
