import {
  SummarySection,
  SummaryGrid,
  SummaryField,
} from "@/components/layout/record-summary";
import { RecordMetaFooter } from "@/components/layout/record-meta-footer";
import { RecordLink } from "@/components/record-link";
import type { SlaRow } from "@/lib/slas.functions";

export function SlaSummary({ sla }: { sla: SlaRow }) {
  return (
    <div>
      <SummarySection>
        <SummaryGrid>
          <SummaryField label="Vendor">
            {sla.vendor ? (
              <RecordLink kind="vendor" id={sla.vendor.id} label={sla.vendor.name} />
            ) : null}
          </SummaryField>
          <SummaryField label="System">
            {sla.system ? (
              <RecordLink kind="system" id={sla.system.id} label={sla.system.name} />
            ) : (
              <span className="text-muted-foreground">Vendor-wide</span>
            )}
          </SummaryField>
          <SummaryField label="Target">
            {sla.target_type.replace(/_/g, " ")}: {String(sla.target_value)}
          </SummaryField>
          <SummaryField label="Review cadence">
            Every {sla.review_cadence_days} days
          </SummaryField>
          <SummaryField label="Last reviewed">
            {sla.last_reviewed_at
              ? new Date(sla.last_reviewed_at).toLocaleDateString()
              : null}
          </SummaryField>
          <SummaryField label="Notes" full>
            {sla.notes ? (
              <p className="whitespace-pre-wrap">{sla.notes}</p>
            ) : null}
          </SummaryField>
        </SummaryGrid>
      </SummarySection>
      <RecordMetaFooter record={sla as any} />
    </div>
  );
}
