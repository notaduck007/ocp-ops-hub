import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, KeyRound, Building2, LifeBuoy, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reports/")({
  component: ReportsIndex,
});

const REPORTS = [
  {
    id: "governance",
    title: "Quarterly IT Risk & Governance",
    desc: "Risks, incidents, changes, policies, reviews across a date range.",
    icon: ShieldCheck,
  },
  { id: "mfa", title: "MFA Coverage", desc: "Per system, per person type.", icon: KeyRound },
  {
    id: "vendor-sla",
    title: "Vendor & SLA Health",
    desc: "Open breaches, contracts expiring 90/180 days.",
    icon: Building2,
  },
  { id: "dr", title: "DR Readiness", desc: "Critical systems, runbooks, last test.", icon: LifeBuoy },
];

function ReportsIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Printable summaries. Each opens a print-friendly view — use your browser's Print dialog to save as PDF.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.id}
              to="/reports/$reportId"
              params={{ reportId: r.id }}
              className="block"
            >
              <Card className="transition-colors hover:border-primary">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <CardDescription>{r.desc}</CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
