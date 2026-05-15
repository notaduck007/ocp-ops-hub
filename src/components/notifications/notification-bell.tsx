import { Bell, BellOff } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/states/empty-state";
import { ListItemSkeleton } from "@/components/layout/skeletons";
import { AttentionList } from "@/components/inbox/attention-list";
import { useAttention } from "@/hooks/use-attention";

export function NotificationBell() {
  // Option A: mirror the same data source as the dashboard "Needs Attention"
  // feed and /inbox so the three surfaces stay pixel-identical.
  const { data, isLoading } = useAttention({ ownerScope: "me", limit: 50 });
  const items = data?.items ?? [];
  const count = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
              aria-label={`${count} needing attention`}
            >
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Needs attention</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="divide-y">
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </div>
          ) : count === 0 ? (
            <EmptyState
              icon={BellOff}
              title="You're caught up"
              variant="compact"
            />
          ) : (
            <AttentionList items={items} maxRows={5} />
          )}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full justify-center text-xs">
            <Link to="/inbox">Open Inbox →</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
