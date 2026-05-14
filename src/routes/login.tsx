import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.45c-.28 1.45-1.12 2.68-2.39 3.5v2.92h3.86c2.26-2.08 3.57-5.15 3.57-8.66z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.86-2.92c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.11C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.35A7.2 7.2 0 0 1 4.87 12c0-.82.14-1.61.4-2.35V6.54H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.29 5.46l3.98-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.74c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.18 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.54l3.98 3.11C6.22 6.85 8.87 4.74 12 4.74z"
      />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // If already signed in, bounce to dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback`,
      extraParams: { hd: "opencompute.org", prompt: "select_account" },
    });
    if (result.error) {
      setBusy(false);
      toast.error(result.error.message ?? "Sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">OCP IT Hub</h1>
          <p className="text-sm text-muted-foreground">
            Internal tool for Open Compute Project IT
          </p>
        </div>
        <Button onClick={signIn} disabled={busy} className="w-full" size="lg" variant="outline">
          <GoogleIcon />
          <span className="ml-2">{busy ? "Redirecting…" : "Sign in with Google"}</span>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Restricted to @opencompute.org accounts.
        </p>
      </div>
    </div>
  );
}
