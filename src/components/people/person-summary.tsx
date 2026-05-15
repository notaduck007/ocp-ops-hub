import {
  SummarySection,
  SummaryGrid,
  SummaryField,
} from "@/components/layout/record-summary";
import { RecordMetaFooter } from "@/components/layout/record-meta-footer";
import { PersonStatusBadge, PersonTypeBadge } from "@/components/people/badges";
import type { PersonRow } from "@/lib/people.functions";

export function PersonSummary({ person }: { person: PersonRow }) {
  return (
    <div>
      <SummarySection>
        <SummaryGrid>
          <SummaryField label="Type">
            <PersonTypeBadge value={person.type} />
          </SummaryField>
          <SummaryField label="Status">
            <PersonStatusBadge value={person.status} />
          </SummaryField>
          <SummaryField label="Email">
            {person.email ? (
              <a
                href={`mailto:${person.email}`}
                className="hover:underline"
              >
                {person.email}
              </a>
            ) : null}
          </SummaryField>
          <SummaryField label="Employer">{person.employer || null}</SummaryField>
          <SummaryField label="Employment start">
            {person.employment_start
              ? new Date(person.employment_start).toLocaleDateString()
              : null}
          </SummaryField>
          <SummaryField label="Employment end">
            {person.employment_end
              ? new Date(person.employment_end).toLocaleDateString()
              : null}
          </SummaryField>
          <SummaryField label="Notes" full>
            {person.notes ? (
              <p className="whitespace-pre-wrap">{person.notes}</p>
            ) : null}
          </SummaryField>
        </SummaryGrid>
      </SummarySection>
      <RecordMetaFooter record={person} />
    </div>
  );
}
