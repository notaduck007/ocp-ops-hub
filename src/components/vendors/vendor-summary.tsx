import { ExternalLink } from "lucide-react";

import {
  SummarySection,
  SummaryGrid,
  SummaryField,
} from "@/components/layout/record-summary";
import { RecordLink } from "@/components/record-link";
import { VendorStatusBadge, ContractEndBadge } from "@/components/vendors/badges";
import type { VendorRow } from "@/lib/vendors.functions";

export function VendorSummary({ vendor }: { vendor: VendorRow }) {
  return (
    <SummarySection>
      <SummaryGrid>
        <SummaryField label="Status">
          <VendorStatusBadge value={vendor.status} />
        </SummaryField>
        <SummaryField label="Internal owner">
          {vendor.internal_owner ? (
            <RecordLink
              kind="person"
              id={vendor.internal_owner.id}
              label={
                vendor.internal_owner.full_name ||
                vendor.internal_owner.email ||
                "—"
              }
            />
          ) : null}
        </SummaryField>
        <SummaryField label="Website" full>
          {vendor.website ? (
            <a
              href={vendor.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {vendor.website}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </SummaryField>
        <SummaryField label="Primary contact">
          {vendor.primary_contact_name || vendor.primary_contact_email ? (
            <div>
              <div>{vendor.primary_contact_name || "—"}</div>
              {vendor.primary_contact_email && (
                <a
                  href={`mailto:${vendor.primary_contact_email}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {vendor.primary_contact_email}
                </a>
              )}
            </div>
          ) : null}
        </SummaryField>
        <SummaryField label="Escalation contact">
          {vendor.escalation_contact_name || vendor.escalation_contact_email ? (
            <div>
              <div>{vendor.escalation_contact_name || "—"}</div>
              {vendor.escalation_contact_email && (
                <a
                  href={`mailto:${vendor.escalation_contact_email}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {vendor.escalation_contact_email}
                </a>
              )}
            </div>
          ) : null}
        </SummaryField>
        <SummaryField label="Contract end">
          {vendor.contract_end_at ? (
            <span className="inline-flex items-center gap-2">
              {new Date(vendor.contract_end_at).toLocaleDateString()}
              <ContractEndBadge
                date={vendor.contract_end_at}
                windowDays={vendor.renewal_window_days}
              />
            </span>
          ) : null}
        </SummaryField>
        <SummaryField label="Renewal window">
          {vendor.renewal_window_days
            ? `${vendor.renewal_window_days} days`
            : null}
        </SummaryField>
        <SummaryField label="Contract URL" full>
          {vendor.contract_url ? (
            <a
              href={vendor.contract_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {vendor.contract_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </SummaryField>
        <SummaryField label="Notes" full>
          {vendor.notes ? (
            <p className="whitespace-pre-wrap">{vendor.notes}</p>
          ) : null}
        </SummaryField>
      </SummaryGrid>
    </SummarySection>
  );
}
