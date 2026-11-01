import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Instagram, Phone } from "lucide-react";
import { BrandName } from "@/components/brand-name";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact RIOTOUS | Customer Support & Custom Orders" },
      {
        name: "description",
        content:
          "Reach RIOTOUS about streetwear orders, custom DTF prints, or bulk production. Connect via Email, Phone, or Instagram.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Contact RIOTOUS | Customer Support & Custom Orders" },
      {
        property: "og:description",
        content:
          "Reach RIOTOUS about streetwear orders, custom DTF prints, or bulk production. Connect via Email, Phone, or Instagram.",
      },
      { property: "og:url", content: "https://riotous.store/contact" },
      { property: "og:image", content: "https://riotous.store/assets/riotous-logo.png" },
      { name: "twitter:image", content: "https://riotous.store/assets/riotous-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "RIOTOUS",
          url: "https://riotous.store/contact",
          telephone: "+91 90998 66791",
          email: "support@riotous.store",
          description:
            "Premium DTF printed streetwear studio in Surat, India. Orders, custom prints and wholesale support.",
          areaServed: "IN",
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              opens: "10:00",
              closes: "19:00",
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://riotous.store/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Contact",
              item: "https://riotous.store/contact",
            },
          ],
        }),
      },
    ],
  }),
});
