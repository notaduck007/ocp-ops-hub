import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Server,
  UserCircle,
  Building2,
  ShieldAlert,
  AlertOctagon,
  GitPullRequestArrow,
  BookText,
  BookOpenCheck,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearch, type SearchHit } from "@/lib/search.functions";

const ICONS: Record<SearchHit["kind"], typeof Server> = {
  system: Server,
  person: UserCircle,
  vendor: Building2,
  risk: ShieldAlert,
  incident: AlertOctagon,
  change: GitPullRequestArrow,
  policy: BookText,
  runbook: BookOpenCheck,
};

const ROUTE: Record<SearchHit["kind"], (id: string) => { to: string; params: any }> = {
  system: (id) => ({ to: "/systems/$systemId", params: { systemId: id } }),
  person: (id) => ({ to: "/people/$personId", params: { personId: id } }),
  vendor: (id) => ({ to: "/vendors/$vendorId", params: { vendorId: id } }),
  risk: (id) => ({ to: "/risks/$riskId", params: { riskId: id } }),
  incident: (id) => ({ to: "/incidents/$incidentId", params: { incidentId: id } }),
  change: (id) => ({ to: "/changes/$changeId", params: { changeId: id } }),
  policy: (id) => ({ to: "/policies/$policyId", params: { policyId: id } }),
  runbook: (id) => ({ to: "/runbooks/$runbookId", params: { runbookId: id } }),
};

const LABELS: Record<SearchHit["kind"], string> = {
  system: "Systems",
  person: "People",
  vendor: "Vendors",
  risk: "Risks",
  incident: "Incidents",
  change: "Changes",
  policy: "Policies",
  runbook: "Runbooks",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const search = useServerFn(globalSearch);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data } = useQuery({
    queryKey: ["global-search", q],
    queryFn: () => search({ data: { q } }),
    enabled: open && q.trim().length > 0,
    staleTime: 30_000,
  });

  const grouped = (data?.hits ?? []).reduce<Record<string, SearchHit[]>>((acc, h) => {
    (acc[h.kind] ||= []).push(h);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder="Search systems, people, vendors, risks…"
      />
      <CommandList>
        <CommandEmpty>{q ? "No results." : "Type to search."}</CommandEmpty>
        {(Object.keys(grouped) as SearchHit["kind"][]).map((kind) => {
          const Icon = ICONS[kind];
          return (
            <CommandGroup key={kind} heading={LABELS[kind]}>
              {grouped[kind].map((hit) => (
                <CommandItem
                  key={`${kind}:${hit.id}`}
                  value={`${kind} ${hit.label} ${hit.sublabel ?? ""}`}
                  onSelect={() => {
                    const r = ROUTE[kind](hit.id);
                    setOpen(false);
                    setQ("");
                    navigate(r as any);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span>{hit.label}</span>
                  {hit.sublabel && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {hit.sublabel}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
