import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandName } from "@/components/brand-name";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · RIOTOUS" },
      {
        name: "description",
        content: "Privacy policy detailing how RIOTOUS collects and protects your data.",
      },
      { property: "og:title", content: "Privacy Policy · RIOTOUS" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:px-10">
      <div className="mb-8">
        <Link
          to="/"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:underline"
        >
          ← Back to store
        </Link>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 1, 2026</p>
      </div>

      <div className="prose prose-neutral max-w-none space-y-6 text-foreground/90">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Information We Collect</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            At <BrandName />, we collect personal information you provide when creating an account,
            placing an order, or contacting customer support. This includes your name, email
            address, shipping address, phone number, and custom design submissions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. How We Use Your Information</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We use your data strictly to process and fulfill your orders, send order confirmation
            invoices, provide customer support updates, and secure your account via OTP
            verification. We do not sell or trade your personal data to third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Data Security & Cookies</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We employ industry-standard security protocols, encrypted password hashing, and secure
            session management to safeguard your information. We use essential cookies to maintain
            user sessions and cart synchronization.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Your Rights</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You have the right to access, update, or request deletion of your personal account
            information at any time by reaching out through our{" "}
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
