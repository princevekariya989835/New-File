import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandName } from "@/components/brand-name";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Return Policy | RIOTOUS Customer Care Team" },
      {
        name: "description",
        content:
          "Returns, size exchanges, and refund guidelines for RIOTOUS streetwear apparel. 7-day hassle-free returns with doorstep courier pickup.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Refund & Return Policy | RIOTOUS Customer Care Team" },
      {
        property: "og:description",
        content:
          "Returns, size exchanges, and refund guidelines for RIOTOUS streetwear apparel. 7-day hassle-free returns with doorstep courier pickup.",
      },
      { property: "og:url", content: "https://riotous.store/refund-policy" },
      { property: "og:image", content: "https://riotous.store/assets/riotous-logo.png" },
      { name: "twitter:image", content: "https://riotous.store/assets/riotous-logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://riotous.store/refund-policy" }],
    scripts: [
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
              name: "Refund & Return Policy",
              item: "https://riotous.store/refund-policy",
            },
          ],
        }),
      },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:px-10">
      <div className="mb-8">
        <Link
          to="/"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:underline"
        >
          ← Back to store
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Refund & Return Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 1, 2026</p>
      </div>

      <div className="prose prose-neutral max-w-none space-y-6 text-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Return Window</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We offer a <strong className="text-foreground">7-day return and exchange window</strong>{" "}
            from the date of delivery. To be eligible for a return, items must be unworn, unwashed,
            and in their original condition with all tags attached.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Custom & Personalized Items</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Items created via our Customizer with user-uploaded artwork are custom printed
            specifically for you. Because of this, custom-designed items are final sale unless they
            arrive damaged, defective, or misprinted.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. How to Initiate a Return</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You can easily initiate a return or exchange by visiting your{" "}
            <Link to="/account/orders" className="text-primary hover:underline font-medium">
              My Orders
            </Link>{" "}
            dashboard or contacting our support team via the{" "}
            <Link to="/contact" className="text-primary hover:underline font-medium">
              Contact page
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Refunds</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Once we receive and inspect your returned items at our facility, approved refunds will
            be processed back to your original payment method within 5–7 business days.
          </p>
        </section>
      </div>
    </div>
  );
}
