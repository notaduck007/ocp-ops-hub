import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { ListItemSkeleton } from "@/components/layout/skeletons";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const qc = useQueryClient();
  const list = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
    refetchInterval: 60_000,
  });
  const unread = items.filter((n: any) => !n.read_at);
  const visible = items.slice(0, 5);

  const readMut = useMutation({
    mutationFn: (id: string) => markOne({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const allMut = useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
              aria-label={`${unread.length} unread`}
            >
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => allMut.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {isLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : visible.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              All caught up.
            </div>
          ) : (
            visible.map((n: any) => {
              const due = n.payload?.next_due_at
                ? new Date(n.payload.next_due_at)
                : null;
              const diffDays = due
                ? Math.round((due.getTime() - Date.now()) / 86_400_000)
                : null;
              let dueLabel = "—";
              let dueColor = "text-muted-foreground";
              if (diffDays != null) {
                if (diffDays < 0) {
                  dueLabel = `${-diffDays}d overdue`;
                  dueColor = "text-red-600";
                } else if (diffDays <= 7) {
                  dueLabel = `in ${diffDays}d`;
                  dueColor = "text-amber-600";
                } else {
                  dueLabel = `in ${diffDays}d`;
                }
              }
              return (
                <button
                  key={n.id}
                  onClick={() => !n.read_at && readMut.mutate(n.id)}
                  className={cn(
                    "block w-full px-3 py-2 text-left hover:bg-muted/50",
                    !n.read_at && "bg-accent/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {String(n.kind).replace("cadence.", "Review due: ")}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {n.payload?.target_type ?? "—"} ·{" "}
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                    <div className={cn("shrink-0 text-xs", dueColor)}>{dueLabel}</div>
                  </div>
                </button>
              );
            })
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
