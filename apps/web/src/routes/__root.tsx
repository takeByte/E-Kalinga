import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
});

/**
 * Chrome-free root. Each area renders its own shell:
 * public pages use `PublicHeader`, dashboards use `DashboardShell`.
 */
function RootComponent() {
  return <Outlet />;
}
