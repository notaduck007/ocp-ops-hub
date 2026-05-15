import { format } from "date-fns";

import {
  SummarySection,
  SummaryGrid,
  SummaryField,
} from "@/components/layout/record-summary";
import { RecordMetaFooter } from "@/components/layout/record-meta-footer";
import { RecordLink } from "@/components/record-link";
import {
  ChangeClassBadge,
  ChangeStatusBadge,
} from "@/components/changes/badges";
import type { ChangeRow } from "@/lib/changes.functions";

export function ChangeSummary({ change }: { change: ChangeRow }) {
  return (
    <div>
      <SummarySection>
        <SummaryGrid>
          <SummaryField label="Class">
            <ChangeClassBadge value={change.class} />
          </SummaryField>
          <SummaryField label="Status">
            <ChangeStatusBadge value={change.status} />
          </SummaryField>
          <SummaryField label="Requester">
            {change.requester
              ? change.requester.full_name ?? change.requester.email
              : null}
          </SummaryField>
          <SummaryField label="Scheduled at">
            {change.scheduled_at
              ? format(new Date(change.scheduled_at), "PPp")
              : null}
          </SummaryField>
          <SummaryField label="Linked incident">
            {change.linked_incident ? (
              <RecordLink
                kind="incident"
                id={change.linked_incident.id}
                label={change.linked_incident.title}
              />
            ) : null}
          </SummaryField>
          <SummaryField label="Affected systems">
            {Array.isArray(change.systems) && change.systems.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {change.systems.map((s) => (
                  <RecordLink key={s.id} kind="system" id={s.id} label={s.name} />
                ))}
              </div>
            ) : null}
          </SummaryField>
          <SummaryField label="Description" full>
            {change.description ? (
              <p className="whitespace-pre-wrap">{change.description}</p>
            ) : null}
          </SummaryField>
          <SummaryField label="Risk summary" full>
            {change.risk_summary ? (
              <p className="whitespace-pre-wrap">{change.risk_summary}</p>
            ) : null}
          </SummaryField>
          <SummaryField label="Rollback plan" full>
            {change.rollback_plan ? (
              <p className="whitespace-pre-wrap">{change.rollback_plan}</p>
            ) : null}
          </SummaryField>
          <SummaryField label="Comms plan" full>
            {change.comms_plan ? (
              <p className="whitespace-pre-wrap">{change.comms_plan}</p>
            ) : null}
          </SummaryField>
        </SummaryGrid>
      </SummarySection>
      <RecordMetaFooter record={change} />
    </div>
  );
}
