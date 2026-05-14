export type StatusIntent =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "critical"
  | "muted";

export const STATUS_CLASSES: Record<StatusIntent, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
  critical: "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
  muted: "bg-muted text-muted-foreground ring-1 ring-border",
};

export const STATUS_LABELS: Record<StatusIntent, string> = {
  neutral: "Neutral",
  info: "Info",
  success: "Success / good",
  warning: "Warning / attention",
  danger: "Danger / overdue",
  critical: "Critical",
  muted: "Inactive / closed",
};
