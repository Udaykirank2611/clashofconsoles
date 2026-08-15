import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/admin/login")) return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login" });
  },
  component: () => (
    <div className="theme-admin-light relative min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70"
        style={{ background: "var(--gradient-arena)" }}
      />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  ),
});

