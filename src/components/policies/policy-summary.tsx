import { format } from "date-fns";

import {
  SummarySection,
  SummaryGrid,
  SummaryField,
  MarkdownBlock,
} from "@/components/layout/record-summary";
import { RecordMetaFooter } from "@/components/layout/record-meta-footer";
import { RecordLink } from "@/components/record-link";
import { PolicyStatusBadge } from "@/components/policies/badges";
import type { PolicyRow } from "@/lib/policies.functions";

export function PolicySummary({ policy }: { policy: PolicyRow }) {
  return (
    <div className="space-y-4">
      <SummarySection>
        <SummaryGrid>
          <SummaryField label="Status">
            <PolicyStatusBadge value={policy.status} />
          </SummaryField>
          <SummaryField label="Version">v{policy.version}</SummaryField>
          <SummaryField label="Owner">
            {policy.owner ? (
              <RecordLink
                kind="person"
                id={policy.owner.id}
                label={policy.owner.full_name ?? policy.owner.email}
              />
            ) : null}
          </SummaryField>
          <SummaryField label="Next review due">
            {policy.next_review_due_at
              ? format(new Date(policy.next_review_due_at), "PP")
              : null}
          </SummaryField>
        </SummaryGrid>
      </SummarySection>
      <SummarySection title="Body">
        <MarkdownBlock source={policy.body_md} />
      </SummarySection>
      <RecordMetaFooter record={policy} />
    </div>
  );
}
