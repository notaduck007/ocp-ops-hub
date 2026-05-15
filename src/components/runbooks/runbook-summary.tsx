import { format } from "date-fns";

import {
  SummarySection,
  SummaryGrid,
  SummaryField,
  MarkdownBlock,
} from "@/components/layout/record-summary";
import { RecordMetaFooter } from "@/components/layout/record-meta-footer";
import { RecordLink } from "@/components/record-link";
import { ScenarioBadge } from "@/components/runbooks/badges";
import type { RunbookRow } from "@/lib/runbooks.functions";

export function RunbookSummary({ runbook }: { runbook: RunbookRow }) {
  return (
    <div className="space-y-4">
      <SummarySection>
        <SummaryGrid>
          <SummaryField label="Scenario">
            <ScenarioBadge value={runbook.scenario} />
          </SummaryField>
          <SummaryField label="System">
            {runbook.system ? (
              <RecordLink
                kind="system"
                id={runbook.system.id}
                label={runbook.system.name}
              />
            ) : null}
          </SummaryField>
          <SummaryField label="Owner">
            {runbook.owner ? (
              <RecordLink
                kind="person"
                id={runbook.owner.id}
                label={runbook.owner.full_name ?? runbook.owner.email}
              />
            ) : null}
          </SummaryField>
          <SummaryField label="Last tested">
            {runbook.last_tested_at
              ? format(new Date(runbook.last_tested_at), "PP")
              : null}
          </SummaryField>
          <SummaryField label="Next test due">
            {runbook.next_test_due_at
              ? format(new Date(runbook.next_test_due_at), "PP")
              : null}
          </SummaryField>
        </SummaryGrid>
      </SummarySection>
      <SummarySection title="Body">
        <MarkdownBlock source={runbook.body_md} />
      </SummarySection>
      <RecordMetaFooter record={runbook} />
    </div>
  );
}
