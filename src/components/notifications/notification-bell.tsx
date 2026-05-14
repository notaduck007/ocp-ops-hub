import { Bell } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { ListItemSkeleton } from "@/components/layout/skeletons";

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
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px]">
              {unread.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => allMut.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <>
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">All caught up.</div>
          ) : items.map((n: any) => (
            <button
              key={n.id}
              onClick={() => !n.read_at && readMut.mutate(n.id)}
              className={`block w-full border-b px-3 py-2 text-left hover:bg-muted/50 ${!n.read_at ? "bg-accent/40" : ""}`}
            >
              <div className="text-sm font-medium">{n.kind.replace("cadence.", "Review due: ")}</div>
              <div className="text-xs text-muted-foreground">
                {n.payload?.target_type} · due {n.payload?.next_due_at ? new Date(n.payload.next_due_at).toLocaleDateString() : "—"}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
