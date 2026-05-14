import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchSystemsForGrant } from "@/lib/people.functions";

type Props = {
  value: Array<{ id: string; name: string }>;
  onChange: (next: Array<{ id: string; name: string }>) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function SystemMultiCombobox({
  value,
  onChange,
  disabled,
  placeholder = "Add affected system…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const search = useServerFn(searchSystemsForGrant);

  const { data: systems = [] } = useQuery({
    queryKey: ["system-search", q],
    queryFn: () => search({ data: { q } }),
    enabled: open,
    staleTime: 30_000,
  });

  const selectedIds = new Set(value.map((v) => v.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search systems…"
              value={q}
              onValueChange={setQ}
            />
            <CommandList>
              <CommandEmpty>No systems found.</CommandEmpty>
              <CommandGroup>
                {systems.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <CommandItem
                      key={s.id}
                      value={s.id}
                      onSelect={() => {
                        if (checked) {
                          onChange(value.filter((v) => v.id !== s.id));
                        } else {
                          onChange([...value, { id: s.id, name: s.name }]);
                        }
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          checked ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{s.name}</span>
                        <span className="text-xs capitalize text-muted-foreground">
                          {s.category}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
              {s.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v.id !== s.id))}
                  className="ml-0.5 rounded hover:bg-muted-foreground/20"
                  aria-label={`Remove ${s.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
