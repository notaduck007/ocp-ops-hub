import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchSystemsForGrant } from "@/lib/people.functions";

type Props = {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  selectedLabel?: string | null;
};

export function SystemCombobox({
  value,
  onChange,
  placeholder = "Select system…",
  disabled,
  selectedLabel,
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

  const selected = systems.find((s) => s.id === value);
  const label = selected?.name || selectedLabel || (value ? "Selected system" : null);

  return (
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
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search systems…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>No systems found.</CommandEmpty>
            <CommandGroup>
              {systems.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.id}
                  onSelect={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === s.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{s.name}</span>
                    <span className="text-xs capitalize text-muted-foreground">{s.category}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
