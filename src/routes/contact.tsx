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
          "Reach RIOTOUS about orders, custom prints, or wholesale. Email, Phone, or Instagram.",
      },
      { property: "og:title", content: "Contact RIOTOUS | Customer Support & Custom Orders" },
      {
        property: "og:description",
        content: "Get in touch with the RIOTOUS team.",
      },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "RIOTOUS",
          url: "https://riotous.store/contact",
          telephone: "+91 90998 66791",
          description:
            "Premium DTF printed streetwear studio. Orders, custom prints and wholesale support.",
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
    ],
  }),
});
