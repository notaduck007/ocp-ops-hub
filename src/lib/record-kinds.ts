import {
  Server,
  UserCircle,
  Building2,
  ShieldAlert,
  AlertOctagon,
  GitPullRequestArrow,
  BookText,
  BookOpenCheck,
  type LucideIcon,
} from "lucide-react";

export type RecordKind =
  | "system"
  | "person"
  | "vendor"
  | "risk"
  | "incident"
  | "change"
  | "policy"
  | "runbook";

export const KIND_ICON: Record<RecordKind, LucideIcon> = {
  system: Server,
  person: UserCircle,
  vendor: Building2,
  risk: ShieldAlert,
  incident: AlertOctagon,
  change: GitPullRequestArrow,
  policy: BookText,
  runbook: BookOpenCheck,
};

export const KIND_LABEL: Record<RecordKind, string> = {
  system: "Systems",
  person: "People",
  vendor: "Vendors",
  risk: "Risks",
  incident: "Incidents",
  change: "Changes",
  policy: "Policies",
  runbook: "Runbooks",
};

export type KindRoute = { to: string; params: Record<string, string> };

export const KIND_ROUTE: Record<RecordKind, (id: string) => KindRoute> = {
  system: (id) => ({ to: "/systems/$systemId", params: { systemId: id } }),
  person: (id) => ({ to: "/people/$personId", params: { personId: id } }),
  vendor: (id) => ({ to: "/vendors/$vendorId", params: { vendorId: id } }),
  risk: (id) => ({ to: "/risks/$riskId", params: { riskId: id } }),
  incident: (id) => ({
    to: "/incidents/$incidentId",
    params: { incidentId: id },
  }),
  change: (id) => ({ to: "/changes/$changeId", params: { changeId: id } }),
  policy: (id) => ({ to: "/policies/$policyId", params: { policyId: id } }),
  runbook: (id) => ({ to: "/runbooks/$runbookId", params: { runbookId: id } }),
};
