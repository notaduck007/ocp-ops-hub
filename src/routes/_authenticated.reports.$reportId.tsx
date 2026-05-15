import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { PageHeaderSkeleton, DetailFormSkeleton } from "@/components/layout/skeletons";
import {
  getDrReadinessReport,
  getGovernanceReport,
  getMfaCoverageReport,
  getVendorSlaReport,
} from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/reports/$reportId")({
  component: ReportPage,
});

const TITLES: Record<string, string> = {
  governance: "Quarterly IT Risk & Governance Report",
  mfa: "MFA Coverage Report",
  "vendor-sla": "Vendor & SLA Health Report",
  dr: "DR Readiness Report",
};

function ReportPage() {
  const { reportId } = Route.useParams();
  const title = TITLES[reportId];
  if (!title) throw notFound();

  const today = new Date();
  const ninetyAgo = new Date(today.getTime() - 90 * 86_400_000);
  const [from, setFrom] = useState(ninetyAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  return (
    <PageShell>
      <div className="print:hidden">
        <PageHeader
          backTo={{ to: "/reports", label: "Reports" }}
          title={title}
          actions={
            <div className="flex flex-wrap items-end gap-3">
              {reportId === "governance" && (
                <>
                  <div>
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </>
              )}
              <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print / Save as PDF
              </Button>
            </div>
          }
        />
      </div>

      <article className="mx-auto max-w-4xl space-y-6 rounded-md border bg-card p-8 print:border-0 print:p-0">
        <header className="border-b pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Generated {new Date().toLocaleString()}
            {reportId === "governance" && ` · Range ${from} → ${to}`}
          </p>
        </header>

        {reportId === "governance" && <GovernanceBody from={from} to={to} />}
        {reportId === "mfa" && <MfaBody />}
        {reportId === "vendor-sla" && <VendorSlaBody />}
        {reportId === "dr" && <DrBody />}
      </article>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function GovernanceBody({ from, to }: { from: string; to: string }) {
  const fn = useServerFn(getGovernanceReport);
  const { data, isLoading } = useQuery({
    queryKey: ["report-gov", from, to],
    queryFn: () => fn({ data: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` } }),
  });
  if (isLoading || !data) return <DetailFormSkeleton rows={3} />;
  return (
    <div className="space-y-6">
      <Section title={`Risks (accepted/closed): ${data.risks.length}`}>
        <ul className="list-inside list-disc text-sm">
          {data.risks.map((r) => (
            <li key={r.id}>{r.title} — score {r.score} · {r.status}</li>
          ))}
          {data.risks.length === 0 && <li className="list-none text-muted-foreground">None</li>}
        </ul>
      </Section>
      <Section title={`Incidents: ${data.incidents.length}`}>
        <p className="text-sm">
          Sev1: {data.incidents_by_severity[1] ?? 0} · Sev2: {data.incidents_by_severity[2] ?? 0} ·
          Sev3: {data.incidents_by_severity[3] ?? 0} · Sev4: {data.incidents_by_severity[4] ?? 0}
        </p>
        <ul className="list-inside list-disc text-sm">
          {data.incidents.map((i) => (
            <li key={i.id}>Sev{i.severity} · {i.title} ({i.status})</li>
          ))}
        </ul>
      </Section>
      <Section title={`Changes completed: ${data.changes.length}`}>
        <ul className="list-inside list-disc text-sm">
          {data.changes.map((c) => (
            <li key={c.id}>{c.title} — {c.class}</li>
          ))}
        </ul>
      </Section>
      <Section title={`Policies approved/retired: ${data.policies.length}`}>
        <ul className="list-inside list-disc text-sm">
          {data.policies.map((p) => (
            <li key={p.id}>{p.title} v{p.version} ({p.status})</li>
          ))}
        </ul>
      </Section>
      <Section title={`Access review campaigns completed: ${data.reviews.length}`}>
        <ul className="list-inside list-disc text-sm">
          {data.reviews.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function MfaBody() {
  const fn = useServerFn(getMfaCoverageReport);
  const { data, isLoading } = useQuery({ queryKey: ["report-mfa"], queryFn: () => fn() });
  if (isLoading || !data) return <DetailFormSkeleton rows={3} />;
  return (
    <table className="w-full text-sm">
      <thead className="border-b text-left">
        <tr>
          <th className="py-2">System</th>
          <th>Criticality</th>
          <th>MFA</th>
          <th>Grants</th>
          <th>By type</th>
        </tr>
      </thead>
      <tbody>
        {data.systems.map((s) => (
          <tr key={s.system_id} className="border-b">
            <td className="py-2 font-medium">{s.system}</td>
            <td>{s.criticality}</td>
            <td>{s.mfa_required ? "Required" : "Not required"}</td>
            <td>{s.grants_total}</td>
            <td className="text-xs">
              {Object.entries(s.by_type).map(([t, n]) => `${t}: ${n}`).join(" · ") || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VendorSlaBody() {
  const fn = useServerFn(getVendorSlaReport);
  const { data, isLoading } = useQuery({ queryKey: ["report-vendor-sla"], queryFn: () => fn() });
  if (isLoading || !data) return <DetailFormSkeleton rows={3} />;
  return (
    <div className="space-y-6">
      <Section title={`Open SLA breaches: ${data.open_breaches.length}`}>
        <ul className="list-inside list-disc text-sm">
          {data.open_breaches.map((b) => (
            <li key={b.id}>{new Date(b.occurred_at).toLocaleDateString()} — {b.impact_summary}</li>
          ))}
        </ul>
      </Section>
      <Section title="Vendor contracts">
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr><th className="py-2">Vendor</th><th>Contract end</th><th>≤90d</th><th>≤180d</th><th>SLAs</th></tr>
          </thead>
          <tbody>
            {data.vendors.map((v) => (
              <tr key={v.id} className="border-b">
                <td className="py-2 font-medium">{v.name}</td>
                <td>{v.contract_end_at ?? "—"}</td>
                <td>{v.expires_within_90d ? "Yes" : ""}</td>
                <td>{v.expires_within_180d ? "Yes" : ""}</td>
                <td>{v.sla_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function DrBody() {
  const fn = useServerFn(getDrReadinessReport);
  const { data, isLoading } = useQuery({ queryKey: ["report-dr"], queryFn: () => fn() });
  if (isLoading || !data) return <DetailFormSkeleton rows={3} />;
  return (
    <div className="space-y-6">
      {data.systems.map((s) => (
        <Section key={s.id} title={s.name}>
          <p className="text-xs text-muted-foreground">
            RTO {s.rto_minutes ?? "?"}m · RPO {s.rpo_minutes ?? "?"}m
          </p>
          <ul className="list-inside list-disc text-sm">
            {s.runbooks.map((r) => (
              <li key={r.id}>
                <strong>{r.title}</strong> ({r.scenario}) — last test:{" "}
                {r.last_test ? `${r.last_test.result} on ${new Date(r.last_test.performed_at).toLocaleDateString()}` : "never"}
              </li>
            ))}
            {s.runbooks.length === 0 && <li className="list-none text-muted-foreground">No runbooks</li>}
          </ul>
        </Section>
      ))}
      {data.systems.length === 0 && (
        <p className="text-sm text-muted-foreground">No critical systems on file.</p>
      )}
    </div>
  );
}
