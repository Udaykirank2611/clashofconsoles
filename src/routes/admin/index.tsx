import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/admin/Dashboard";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({
    meta: [
      { title: "Admin Console — Clash of Consoles" },
      { name: "description", content: "Branch dashboard for managing bookings, stations, pricing and coupons." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Console — Clash of Consoles" },
      { property: "og:description", content: "Branch dashboard for Clash of Consoles managers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
