import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchVendors } from "@/lib/slas.functions";

export function VendorCombobox({
  value, onChange, placeholder = "Select vendor", disabled,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const search = useServerFn(searchVendors);
  const { data: rows = [] } = useQuery({
    queryKey: ["vendor-search", q],
    queryFn: () => search({ data: { q } }),
  });
  const selected = rows.find((r) => r.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline" role="combobox" disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          {selected?.name ?? placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search vendors…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>No vendors found.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear" onSelect={() => { onChange(null); setOpen(false); }}
                  className="text-muted-foreground"
                >
                  Clear
                </CommandItem>
              )}
              {rows.map((r) => (
                <CommandItem
                  key={r.id} value={r.id}
                  onSelect={() => { onChange(r.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === r.id ? "opacity-100" : "opacity-0")} />
                  {r.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
