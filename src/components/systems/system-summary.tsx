import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  SummarySection,
  SummaryGrid,
  SummaryField,
} from "@/components/layout/record-summary";
import { RecordMetaFooter } from "@/components/layout/record-meta-footer";
import { RecordLink } from "@/components/record-link";
import { CategoryBadge, CriticalityBadge } from "@/components/systems/badges";
import type { SystemRow } from "@/lib/systems.functions";

export function SystemSummary({ system }: { system: SystemRow }) {
  return (
    <div>
      <SummarySection>
      <SummaryGrid>
        <SummaryField label="Category">
          <CategoryBadge value={system.category} />
        </SummaryField>
        <SummaryField label="Criticality">
          <CriticalityBadge value={system.criticality} />
        </SummaryField>
        <SummaryField label="Business owner">
          {system.business_owner ? (
            <RecordLink
              kind="person"
              id={system.business_owner.id}
              label={
                system.business_owner.full_name ||
                system.business_owner.email ||
                "—"
              }
            />
          ) : null}
        </SummaryField>
        <SummaryField label="Technical owner">
          {system.technical_owner ? (
            <RecordLink
              kind="person"
              id={system.technical_owner.id}
              label={
                system.technical_owner.full_name ||
                system.technical_owner.email ||
                "—"
              }
            />
          ) : null}
        </SummaryField>
        <SummaryField label="MFA required">
          <Badge variant={system.mfa_required ? "default" : "outline"}>
            {system.mfa_required ? "Yes" : "No"}
          </Badge>
        </SummaryField>
        <SummaryField label="URL" full>
          {system.url ? (
            <a
              href={system.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {system.url}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </SummaryField>
        <SummaryField label="Data classes" full>
          {system.data_classes && system.data_classes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {system.data_classes.map((dc) => (
                <Badge key={dc} variant="secondary">
                  {dc}
                </Badge>
              ))}
            </div>
          ) : null}
        </SummaryField>
        <SummaryField label="Description" full>
          {system.description ? (
            <p className="whitespace-pre-wrap">{system.description}</p>
          ) : null}
        </SummaryField>
        <SummaryField label="Notes" full>
          {system.notes ? (
            <p className="whitespace-pre-wrap">{system.notes}</p>
          ) : null}
        </SummaryField>
      </SummaryGrid>
    </SummarySection>
    <RecordMetaFooter record={system as any} />
    </div>
  );
}
