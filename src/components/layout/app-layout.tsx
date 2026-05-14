import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Search, Server, UserCircle, KeyRound, Building2, FileCheck2, ShieldAlert, AlertOctagon, GitPullRequestArrow, BookText, ClipboardCheck, BookOpenCheck, LifeBuoy, FileText, ScrollText, BarChart3, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette } from "@/components/command-palette";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useAuth, useCurrentRole } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

type NavGroup = { label: string | null; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Inventory",
    items: [
      { to: "/systems", label: "Systems", icon: Server },
      { to: "/people", label: "People", icon: UserCircle },
      { to: "/access", label: "Access", icon: KeyRound },
      { to: "/vendors", label: "Vendors", icon: Building2 },
      { to: "/slas", label: "SLAs", icon: FileCheck2 },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/risks", label: "Risks", icon: ShieldAlert },
      { to: "/policies", label: "Policies", icon: BookText },
      { to: "/reviews", label: "Access Reviews", icon: ClipboardCheck },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/incidents", label: "Incidents", icon: AlertOctagon },
      { to: "/changes", label: "Changes", icon: GitPullRequestArrow },
    ],
  },
  {
    label: "Resilience",
    items: [
      { to: "/runbooks", label: "Runbooks", icon: BookOpenCheck },
      { to: "/continuity", label: "Continuity", icon: LifeBuoy },
      { to: "/dr-plan", label: "DR Plan", icon: FileText },
    ],
  },
  {
    label: "Insights",
    items: [{ to: "/reports", label: "Reports", icon: BarChart3 }],
  },
  {
    label: "Admin",
    items: [
      { to: "/admin/users", label: "Users", icon: Users, adminOnly: true },
      { to: "/admin/audit", label: "Audit Log", icon: ScrollText, adminOnly: true },
    ],
  },
];

const SIDEBAR_KEY = "ocp.sidebar.collapsed";

function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {}
  }, []);
  const update = (v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
    } catch {}
  };
  return [collapsed, update];
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: role } = useCurrentRole();

  return (
    <aside className={cn("hidden shrink-0 flex-col border-r bg-card md:flex", collapsed ? "w-14" : "w-60")}>
      <div className="flex h-14 items-center justify-between gap-2 border-b px-3">
        {!collapsed && <span className="text-sm font-semibold tracking-tight">OCP IT Hub</span>}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-1 space-y-4 p-2">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter((i) => !i.adminOnly || role === "admin");
          if (items.length === 0) return null;
          return (
            <div key={gi} className="space-y-1">
              {group.label && !collapsed && (
                <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  {group.label}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground/50">/</span>}
          <span className={cn(i === segments.length - 1 && "font-medium text-foreground")}>
            {seg}
          </span>
        </span>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const { data: role } = useCurrentRole();
  if (!user) return null;
  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();
  const avatar = (user.user_metadata?.avatar_url as string | undefined) ?? undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar className="h-7 w-7">
            {avatar ? <AvatarImage src={avatar} /> : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm md:inline">{user.email}</span>
          {role && (
            <Badge variant="secondary" className="hidden md:inline-flex">
              {role}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-sm font-medium">{user.email}</span>
          {role && (
            <Badge variant="secondary" className="w-fit">
              {role}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => supabase.auth.signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <div className="flex-1">
        <Breadcrumbs />
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
        className="hidden h-9 w-72 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-accent md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>
      <NotificationBell />
      <UserMenu />
    </header>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
