import type { Database } from "@/integrations/supabase/types";
import type { StatusIntent } from "./status-tokens";

type Criticality = Database["public"]["Enums"]["criticality"];
type RiskStatus = Database["public"]["Enums"]["risk_status"];
type RiskKind = Database["public"]["Enums"]["risk_kind"];
type IncidentStatus = Database["public"]["Enums"]["incident_status"];
type ChangeClass = Database["public"]["Enums"]["change_class"];
type ChangeStatus = Database["public"]["Enums"]["change_status"];
type PolicyStatus = Database["public"]["Enums"]["policy_status"];
type DrTestResult = Database["public"]["Enums"]["dr_test_result"];
type VendorStatus = Database["public"]["Enums"]["vendor_status"];
type BreachStatus = Database["public"]["Enums"]["breach_status"];
type PersonType = Database["public"]["Enums"]["person_type"];
type PersonStatus = Database["public"]["Enums"]["person_status"];
type AccessRoleLevel = Database["public"]["Enums"]["access_role_level"];

export type Severity = 1 | 2 | 3 | 4;

export const SEVERITY_INTENT: Record<Severity, StatusIntent> = {
  1: "muted",
  2: "info",
  3: "warning",
  4: "critical",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  1: "Low",
  2: "Med",
  3: "High",
  4: "Crit",
};

export const CRITICALITY_INTENT: Record<Criticality, StatusIntent> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "critical",
};

export const RISK_STATUS_INTENT: Record<RiskStatus, StatusIntent> = {
  open: "danger",
  mitigating: "warning",
  accepted: "info",
  closed: "muted",
};

export const RISK_KIND_INTENT: Record<RiskKind, StatusIntent> = {
  risk: "neutral",
  exception: "info",
};

export const INCIDENT_STATUS_INTENT: Record<IncidentStatus, StatusIntent> = {
  declared: "danger",
  contained: "warning",
  resolved: "success",
  post_mortem: "info",
  closed: "muted",
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  declared: "Declared",
  contained: "Contained",
  resolved: "Resolved",
  post_mortem: "Post-mortem",
  closed: "Closed",
};

export const CHANGE_CLASS_INTENT: Record<ChangeClass, StatusIntent> = {
  standard: "neutral",
  normal: "info",
  emergency: "danger",
};

export const CHANGE_STATUS_INTENT: Record<ChangeStatus, StatusIntent> = {
  proposed: "neutral",
  approved: "success",
  rejected: "danger",
  in_flight: "warning",
  completed: "info",
  rolled_back: "danger",
};

export const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  proposed: "Proposed",
  approved: "Approved",
  rejected: "Rejected",
  in_flight: "In flight",
  completed: "Completed",
  rolled_back: "Rolled back",
};

export const POLICY_STATUS_INTENT: Record<PolicyStatus, StatusIntent> = {
  draft: "neutral",
  approved: "success",
  retired: "muted",
};

export const DR_RESULT_INTENT: Record<DrTestResult, StatusIntent> = {
  pass: "success",
  partial: "warning",
  fail: "danger",
};

export const VENDOR_STATUS_INTENT: Record<VendorStatus, StatusIntent> = {
  active: "success",
  onboarding: "info",
  offboarding: "warning",
  terminated: "muted",
};

export const BREACH_STATUS_INTENT: Record<BreachStatus, StatusIntent> = {
  open: "danger",
  escalated: "critical",
  remediated: "success",
  closed_no_action: "muted",
};

export const PERSON_TYPE_INTENT: Record<PersonType, StatusIntent> = {
  staff: "info",
  contractor: "warning",
  vendor_user: "neutral",
  service_account: "muted",
};

export const PERSON_STATUS_INTENT: Record<PersonStatus, StatusIntent> = {
  active: "success",
  inactive: "muted",
  offboarded: "danger",
};

export const ROLE_LEVEL_INTENT: Record<AccessRoleLevel, StatusIntent> = {
  read: "neutral",
  write: "info",
  admin: "warning",
  owner: "danger",
};
