import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, X } from "lucide-react";

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
import { searchUsersForOwner } from "@/lib/systems.functions";

type Props = {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Optional label for the currently selected user when known (avoids extra fetch) */
  selectedLabel?: string | null;
};

export function OwnerCombobox({
  value,
  onChange,
  placeholder = "Select owner…",
  disabled,
  selectedLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const search = useServerFn(searchUsersForOwner);

  const { data: users = [] } = useQuery({
    queryKey: ["owner-search", q],
    queryFn: () => search({ data: { q } }),
    enabled: open,
    staleTime: 30_000,
  });

  // Show the selected user's label even when not in the current results.
  const selected = users.find((u) => u.id === value);
  const labelForSelected =
    selected?.full_name || selected?.email || selectedLabel || (value ? "Selected user" : null);

  return (
    <div className="flex items-center gap-1">
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
              {labelForSelected ?? placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or email…"
              value={q}
              onValueChange={setQ}
            />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {users.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={u.id}
                    onSelect={() => {
                      onChange(u.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === u.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{u.full_name || u.email}</span>
                      {u.full_name && (
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
