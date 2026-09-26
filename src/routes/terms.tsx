import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandName } from "@/components/brand-name";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | RIOTOUS Official Streetwear Store" },
      {
        name: "description",
        content: "Terms and conditions for using RIOTOUS store and custom apparel services.",
      },
      { property: "og:title", content: "Terms of Service | RIOTOUS Official Streetwear Store" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-10 py-12 md:py-16">
      <div className="mb-6 sm:mb-8">
        <Link
          to="/"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:underline"
        >
          ← Back to store
        </Link>
        <h1 className="mt-3 sm:mt-4 text-2xl sm:text-4xl font-black tracking-tight break-words">Terms of Service</h1>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">Last updated: September 1, 2026</p>
      </div>

      <div className="prose prose-neutral max-w-none space-y-6 text-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Overview</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Welcome to <BrandName />. These Terms of Service govern your use of our website, custom
            design studio, and purchase of apparel and merchandise. By accessing our store or
            placing an order, you agree to be bound by these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Custom Design & User Content</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            When you use our Customizer to upload artwork or text, you retain ownership of your
            designs while granting <BrandName /> the non-exclusive right to print, produce, and
            fulfill your order. You warrant that you own or have legal authorization to use all
            uploaded artwork, and that your designs do not infringe upon third-party copyrights or
            trademarks.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Orders, Pricing & Payment</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            All prices are listed in Indian Rupees (₹) or your local currency equivalent. We reserve
            the right to refuse or cancel any order for reasons including stock unavailability,
            pricing errors, or suspicion of fraudulent activity. Payment must be successfully
            processed prior to order fulfillment.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Intellectual Property</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            All site content, typography, branding, graphics, and interface layouts are the
            intellectual property of <BrandName /> and may not be reproduced without explicit
            written permission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Contact Information</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Questions regarding our Terms of Service should be sent to us via our{" "}
            <Link to="/contact" className="text-primary hover:underline font-medium">
              Contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
