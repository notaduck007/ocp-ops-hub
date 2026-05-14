import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DrResultBadge } from "@/components/runbooks/badges";
import { getDrPlan } from "@/lib/dr-plan.functions";
import { DetailFormSkeleton } from "@/components/layout/skeletons";

export const Route = createFileRoute("/_authenticated/dr-plan")({
  component: DrPlanPage,
});

function fmtMin(m: number | null) {
  if (m == null) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

function DrPlanPage() {
  const fn = useServerFn(getDrPlan);
  const { data, isLoading } = useQuery({
    queryKey: ["dr-plan"],
    queryFn: () => fn(),
  });

  if (isLoading || !data) return <DetailFormSkeleton rows={5} />;

  return (
    <div className="space-y-8 print:space-y-6">
      <style>{`
        @media print {
          @page { margin: 16mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .dr-page-break { page-break-before: always; }
        }
      `}</style>

      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Disaster Recovery Plan
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">OCP — DR Plan</h1>
          <p className="text-sm text-muted-foreground">
            Generated {format(new Date(data.generated_at), "PPP p")}
          </p>
        </div>
        <Button onClick={() => window.print()} className="no-print">
          <Printer className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">1. RTO / RPO matrix</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>RTO</TableHead>
                <TableHead>RPO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.critical_systems.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-muted-foreground">No critical systems defined.</TableCell></TableRow>
              ) : (
                data.critical_systems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="capitalize">{s.criticality}</TableCell>
                    <TableCell>{fmtMin(s.rto_minutes)}</TableCell>
                    <TableCell>{fmtMin(s.rpo_minutes)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="dr-page-break">
        <h2 className="mb-3 text-xl font-semibold">2. Restore runbooks</h2>
        {data.restore_runbooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No restore runbooks for critical systems.</p>
        ) : (
          <div className="space-y-6">
            {data.restore_runbooks.map((rb) => (
              <div key={rb.id} className="rounded-lg border bg-card p-5">
                <div className="mb-2">
                  <h3 className="text-lg font-semibold">{rb.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {rb.system_name} · Owner {rb.owner_name ?? "—"}
                    {rb.last_tested_at && <> · Last tested {format(new Date(rb.last_tested_at), "PP")}</>}
                  </p>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{rb.body_md}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dr-page-break">
        <h2 className="mb-3 text-xl font-semibold">3. Roles & escalation</h2>
        {data.continuity_scenarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">No continuity scenarios defined.</p>
        ) : (
          <div className="space-y-4">
            {data.continuity_scenarios.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-5">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Decision authority: {c.decision_authority_name ?? "—"}
                </p>
                {c.trigger_summary && (
                  <p className="mt-2 text-sm"><strong>Trigger:</strong> {c.trigger_summary}</p>
                )}
                {c.impact_summary && (
                  <p className="mt-1 text-sm"><strong>Impact:</strong> {c.impact_summary}</p>
                )}
                {c.comms_template_md && (
                  <div className="prose prose-sm mt-3 max-w-none dark:prose-invert">
                    <ReactMarkdown>{c.comms_template_md}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dr-page-break">
        <h2 className="mb-3 text-xl font-semibold">4. Recent test results (last 12 months)</h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Runbook</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_tests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">No tests in the last 12 months.</TableCell></TableRow>
              ) : (
                data.recent_tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{format(new Date(t.performed_at), "PP")}</TableCell>
                    <TableCell className="text-sm">{t.runbook_title}</TableCell>
                    <TableCell className="text-sm">{t.system_name}</TableCell>
                    <TableCell><DrResultBadge value={t.result as any} /></TableCell>
                    <TableCell className="text-sm">{t.performed_by_name ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
