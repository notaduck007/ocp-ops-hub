import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Search, Server, UserCircle, KeyRound, Building2, FileCheck2, ShieldAlert, AlertOctagon, GitPullRequestArrow, BookText } from "lucide-react";

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
    label: "Admin",
    items: [{ to: "/admin/users", label: "Users", icon: Users, adminOnly: true }],
  },
];

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: role } = useCurrentRole();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-sm font-semibold tracking-tight">OCP IT Hub</span>
      </div>
      <nav className="flex-1 space-y-4 p-2">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter((i) => !i.adminOnly || role === "admin");
          if (items.length === 0) return null;
          return (
            <div key={gi} className="space-y-1">
              {group.label && (
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
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
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
      <div className="relative hidden w-72 md:block">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search…"
          className="h-9 pl-8"
          // Placeholder for Cmd+K work in a later prompt.
          onChange={() => undefined}
        />
      </div>
      <UserMenu />
    </header>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
