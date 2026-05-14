import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/continuity")({
  component: () => <Outlet />,
});
