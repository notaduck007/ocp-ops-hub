import { format } from "date-fns";

import {
  SummarySection,
  SummaryGrid,
  SummaryField,
} from "@/components/layout/record-summary";
import { RecordMetaFooter } from "@/components/layout/record-meta-footer";
import { RecordLink } from "@/components/record-link";
import {
  IncidentStatusBadge,
  SeverityBadge,
} from "@/components/incidents/badges";
import type { IncidentRow } from "@/lib/incidents.functions";

export function IncidentSummary({ incident }: { incident: IncidentRow }) {
  return (
    <div>
      <SummarySection>
        <SummaryGrid>
          <SummaryField label="Severity">
            <SeverityBadge value={incident.severity} />
          </SummaryField>
          <SummaryField label="Status">
            <IncidentStatusBadge value={incident.status} />
          </SummaryField>
          <SummaryField label="Declared at">
            {incident.declared_at
              ? format(new Date(incident.declared_at), "PPp")
              : null}
          </SummaryField>
          <SummaryField label="Declared by">
            {incident.declarer
              ? incident.declarer.full_name ?? incident.declarer.email
              : null}
          </SummaryField>
          <SummaryField label="Resolved at">
            {incident.resolved_at
              ? format(new Date(incident.resolved_at), "PPp")
              : null}
          </SummaryField>
          <SummaryField label="Closed at">
            {incident.closed_at
              ? format(new Date(incident.closed_at), "PPp")
              : null}
          </SummaryField>
          <SummaryField label="Impact summary" full>
            {incident.impact_summary ? (
              <p className="whitespace-pre-wrap">{incident.impact_summary}</p>
            ) : null}
          </SummaryField>
          <SummaryField label="Root cause" full>
            {incident.root_cause ? (
              <p className="whitespace-pre-wrap">{incident.root_cause}</p>
            ) : null}
          </SummaryField>
          <SummaryField label="Affected systems" full>
            {Array.isArray(incident.systems) && incident.systems.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {incident.systems.map((s: any) => (
                  <RecordLink key={s.id} kind="system" id={s.id} label={s.name} />
                ))}
              </div>
            ) : null}
          </SummaryField>
        </SummaryGrid>
      </SummarySection>
      <RecordMetaFooter record={incident} />
    </div>
  );
}
