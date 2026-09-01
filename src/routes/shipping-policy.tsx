import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandName } from "@/components/brand-name";

export const Route = createFileRoute("/shipping-policy")({
  head: () => ({
    meta: [
      { title: "Shipping Policy · RIOTOUS" },
      {
        name: "description",
        content: "Shipping timelines, rates and fulfillment details for RIOTOUS orders.",
      },
      { property: "og:title", content: "Shipping Policy · RIOTOUS" },
    ],
  }),
  component: ShippingPolicyPage,
});

function ShippingPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:px-10">
      <div className="mb-8">
        <Link
          to="/"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:underline"
        >
          ← Back to store
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Shipping Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 1, 2026</p>
      </div>

      <div className="prose prose-neutral max-w-none space-y-6 text-foreground/90">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Processing Time</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Standard and custom apparel orders are printed and prepared for dispatch within 1–3
            business days. Custom prints with intricate requirements may require an additional day
            for quality assurance.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Shipping Rates & Delivery Timelines</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We offer free shipping on all orders over ₹1,999. Standard domestic delivery across
            India takes approximately 5–7 business days depending on your location.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Order Tracking</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Once your order is dispatched from our fulfillment center, you will receive an email
            notification containing tracking information. You can also view shipment updates anytime
            in your{" "}
            <Link to="/account/orders" className="text-primary hover:underline font-medium">
              My Orders
            </Link>{" "}
            dashboard.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Shipping Inquiries</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If you have questions about your delivery status or need expedited shipping assistance,
            please visit our{" "}
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
