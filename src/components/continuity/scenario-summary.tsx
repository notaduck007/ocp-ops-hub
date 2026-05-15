import {
  SummarySection,
  SummaryGrid,
  SummaryField,
  MarkdownBlock,
} from "@/components/layout/record-summary";
import { RecordMetaFooter } from "@/components/layout/record-meta-footer";
import { RecordLink } from "@/components/record-link";
import type { ContinuityScenarioRow } from "@/lib/continuity.functions";

export function ContinuityScenarioSummary({ scenario }: { scenario: ContinuityScenarioRow }) {
  return (
    <div className="space-y-4">
      <SummarySection>
        <SummaryGrid>
          <SummaryField label="Decision authority">
            {scenario.decision_authority ? (
              <RecordLink
                kind="person"
                id={scenario.decision_authority.id}
                label={
                  scenario.decision_authority.full_name ??
                  scenario.decision_authority.email
                }
              />
            ) : null}
          </SummaryField>
          <SummaryField label="Trigger" full>
            {scenario.trigger_summary ? (
              <p className="whitespace-pre-wrap">{scenario.trigger_summary}</p>
            ) : null}
          </SummaryField>
          <SummaryField label="Impact" full>
            {scenario.impact_summary ? (
              <p className="whitespace-pre-wrap">{scenario.impact_summary}</p>
            ) : null}
          </SummaryField>
        </SummaryGrid>
      </SummarySection>

      <SummarySection title="Linked systems & runbooks">
        <div className="space-y-3">
          <div>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Systems
            </div>
            {scenario.linked_systems.length === 0 ? (
              <p className="text-sm text-muted-foreground">None linked.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {scenario.linked_systems.map((sys) => (
                  <RecordLink
                    key={sys.id}
                    kind="system"
                    id={sys.id}
                    label={sys.name}
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Runbooks
            </div>
            {scenario.linked_runbooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">None linked.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {scenario.linked_runbooks.map((rb) => (
                  <RecordLink
                    key={rb.id}
                    kind="runbook"
                    id={rb.id}
                    label={rb.title}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SummarySection>

      <SummarySection title="Comms template">
        <MarkdownBlock
          source={scenario.comms_template_md}
          empty="No template defined."
        />
      </SummarySection>
      <RecordMetaFooter record={scenario} />
    </div>
  );
}
