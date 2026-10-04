import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { refundSections } from "@/lib/legal-content";

const TITLE = "Refund & Cancellation Policy — Clash of Consoles";
const DESC =
  "Refund and cancellation rules for bookings, memberships and payments at Clash of Consoles Hyderabad.";

export const Route = createFileRoute("/refund-policy")({
  component: RefundPolicyPage,
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

function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund & Cancellation Policy"
      intro="This policy explains when refunds or cancellations are available for bookings, memberships and payments at Clash of Consoles."
      updated="October 2026"
      sections={refundSections}
    />
  );
}
