import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { privacySections } from "@/lib/legal-content";

const TITLE = "Privacy Policy — Clash of Consoles";
const DESC =
  "How Clash of Consoles Hyderabad collects, uses and protects your booking, membership and contact information.";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
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

function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This Privacy Policy explains what information Clash of Consoles collects from customers and how that information is used and protected."
      updated="October 2026"
      sections={privacySections}
    />
  );
}
