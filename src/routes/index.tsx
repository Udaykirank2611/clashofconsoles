import { createFileRoute } from "@tanstack/react-router";
import { AmbientBackground } from "@/components/site/AmbientBackground";
import { CustomCursor } from "@/components/site/CustomCursor";
import { SectionDivider } from "@/components/site/SectionDivider";
import { Loader } from "@/components/site/Loader";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { Footer } from "@/components/site/Footer";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { Faq, FinalCta, Gallery, Location, Reviews } from "@/components/site/Sections";
import { LiveAvailability } from "@/components/site/sections/LiveAvailability";
import { Experiences } from "@/components/site/sections/Experiences";
import { Memberships } from "@/components/site/sections/Memberships";
import { ComboOffer } from "@/components/site/sections/ComboOffer";
import { RateCard } from "@/components/site/sections/RateCard";
import { UnlimitedPass } from "@/components/site/sections/UnlimitedPass";
import { StudentOffer } from "@/components/site/sections/StudentOffer";

import { WhyUs } from "@/components/site/sections/WhyUs";
import { Branches } from "@/components/site/sections/Branches";
import { FoodPreview } from "@/components/site/sections/FoodPreview";
import { useSiteContent } from "@/lib/site-content";
import { FAQS } from "@/components/site/Sections";
import { PRIMARY_PHONE, SECONDARY_PHONE } from "@/lib/contact";

const TITLE = "Clash of Consoles — Gaming Cafe in Hyderabad";
const DESC =
  "PS5 gaming, cockpit racing, VR, snooker and a private theatre in Hyderabad. Memberships, unlimited passes and student discounts at Clash of Consoles.";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Clash of Consoles",
          description: DESC,
          telephone: [`+91${PRIMARY_PHONE}`, `+91${SECONDARY_PHONE}`],
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
              opens: "10:00",
              closes: "22:00",
            },
          ],
          address: {
            "@type": "PostalAddress",
            addressLocality: "Hyderabad",
            addressRegion: "Telangana",
            addressCountry: "IN",
          },
          servesCuisine: ["Burgers", "Pizza", "Snacks"],
          priceRange: "₹₹",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
});


function Index() {
  const content = useSiteContent();

  return (
    <div className="relative">
      <AmbientBackground />
      <CustomCursor />
      <ScrollProgress />
      <Loader />
      <Navbar />
      <main>
        <Hero />
        <SectionDivider variant="beam" />
        <LiveAvailability />
        <SectionDivider variant="angled" />
        <Experiences experiences={content.experiences} branches={content.branches} />
        <SectionDivider variant="angled" />
        <Memberships plans={content.plans} />
        <ComboOffer offer={content.comboOffer} />
        <SectionDivider variant="glow" />
        <RateCard experiences={content.experiences} rates={content.rates} branches={content.branches} />
        <UnlimitedPass offer={content.unlimitedPass} />
        <SectionDivider variant="glow" />
        <StudentOffer offer={content.studentOffer} />

        <WhyUs />
        <SectionDivider variant="beam" />
        <Branches branches={content.branches} experiences={content.experiences} />
        <SectionDivider variant="angled" />
        <FoodPreview categories={content.menuCategories} menu={content.menu} />
        <Gallery />
        <SectionDivider variant="beam" />
        <Reviews />
        <Location />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
