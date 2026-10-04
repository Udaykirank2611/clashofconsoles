import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { termsSections } from "@/lib/legal-content";

const TITLE = "Terms & Conditions — Clash of Consoles";
const DESC =
  "Booking, payment, membership, coupon and café rules for Clash of Consoles gaming café in Hyderabad.";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
  }),
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & Conditions"
      intro="These Terms & Conditions apply to all bookings, memberships, passes, coupons and food orders at Clash of Consoles."
      updated="October 2026"
      sections={termsSections}
    />
  );
}
