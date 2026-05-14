import {
  SummarySection,
  SummaryGrid,
  SummaryField,
} from "@/components/layout/record-summary";
import { RecordLink } from "@/components/record-link";
import {
  KindBadge,
  LikelihoodBadge,
  ScoreBadge,
  SeverityBadge,
  StatusBadge,
} from "@/components/risks/badges";
import type { RiskRow } from "@/lib/risks.functions";

export function RiskSummary({ risk }: { risk: RiskRow }) {
  return (
    <SummarySection>
      <SummaryGrid>
        <SummaryField label="Kind">
          <KindBadge value={risk.kind} />
        </SummaryField>
        <SummaryField label="Status">
          <StatusBadge value={risk.status} />
        </SummaryField>
        <SummaryField label="Severity">
          <SeverityBadge value={risk.severity} />
        </SummaryField>
        <SummaryField label="Likelihood">
          <LikelihoodBadge value={risk.likelihood} />
        </SummaryField>
        <SummaryField label="Score">
          <ScoreBadge value={risk.score} />
        </SummaryField>
        <SummaryField label="Owner">
          {risk.owner ? (
            <RecordLink
              kind="person"
              id={risk.owner.id}
              label={risk.owner.full_name || risk.owner.email}
            />
          ) : null}
        </SummaryField>
        <SummaryField label="System">
          {risk.system ? (
            <RecordLink kind="system" id={risk.system.id} label={risk.system.name} />
          ) : null}
        </SummaryField>
        <SummaryField label="Vendor">
          {risk.vendor ? (
            <RecordLink kind="vendor" id={risk.vendor.id} label={risk.vendor.name} />
          ) : null}
        </SummaryField>
        <SummaryField label="Review cadence">
          {risk.review_cadence_days
            ? `Every ${risk.review_cadence_days} days`
            : null}
        </SummaryField>
        <SummaryField label="Next review">
          {risk.next_review_due_at
            ? new Date(risk.next_review_due_at).toLocaleDateString()
            : null}
        </SummaryField>
        <SummaryField label="Description" full>
          {risk.description ? (
            <p className="whitespace-pre-wrap">{risk.description}</p>
          ) : null}
        </SummaryField>
        {risk.status === "accepted" && (
          <>
            <SummaryField label="Accepted until">
              {risk.accepted_until ?? null}
            </SummaryField>
            <SummaryField label="Acceptance justification" full>
              {risk.acceptance_justification ? (
                <p className="whitespace-pre-wrap">{risk.acceptance_justification}</p>
              ) : null}
            </SummaryField>
          </>
        )}
        <SummaryField label="Notes" full>
          {risk.notes ? (
            <p className="whitespace-pre-wrap">{risk.notes}</p>
          ) : null}
        </SummaryField>
      </SummaryGrid>
    </SummarySection>
  );
}
