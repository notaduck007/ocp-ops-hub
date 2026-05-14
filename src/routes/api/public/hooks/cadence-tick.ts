import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Daily cadence engine: surface upcoming/overdue recurring tasks as notifications
// (email sending is stubbed — log the payload only)
export const Route = createFileRoute("/api/public/hooks/cadence-tick")({
  server: {
    handlers: {
      POST: async () => {
        const horizon = new Date(Date.now() + 14 * 86400_000).toISOString();
        const reminderCutoff = new Date(Date.now() - 7 * 86400_000).toISOString();

        const { data: tasks, error } = await supabaseAdmin
          .from("recurring_tasks")
          .select("*")
          .is("archived_at", null)
          .lte("next_due_at", horizon);

        if (error) {
          return new Response(
            JSON.stringify({ ok: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const due = (tasks ?? []).filter(
          (t) => !t.last_reminder_sent_at || t.last_reminder_sent_at < reminderCutoff,
        );

        let inserted = 0;
        for (const t of due) {
          const payload = {
            task_id: t.id,
            kind: t.kind,
            target_type: t.target_type,
            target_id: t.target_id,
            next_due_at: t.next_due_at,
          };

          await supabaseAdmin.from("notifications").insert({
            user_id: t.owner_id,
            kind: `cadence.${t.kind}`,
            payload,
          });

          await supabaseAdmin
            .from("recurring_tasks")
            .update({ last_reminder_sent_at: new Date().toISOString() })
            .eq("id", t.id);

          // Email sending is stubbed for v1 (DNS for opencompute.org Resend not verified)
          console.log("[cadence-tick] would-send email:", payload);
          inserted++;
        }

        return new Response(
          JSON.stringify({ ok: true, processed: inserted, scanned: tasks?.length ?? 0 }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
