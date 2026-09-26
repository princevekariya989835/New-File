import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Instagram, Phone } from "lucide-react";
import { BrandName } from "@/components/brand-name";
import { usePublishedWebsiteConfig } from "@/hooks/use-website-config";

export const Route = createLazyFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const { config } = usePublishedWebsiteConfig();
  const cntTxt = config?.contactContent;

  const pageTitle = cntTxt?.pageTitle || "Say hi.";
  const description =
    cntTxt?.description ||
    "Custom prints, wholesale, press, or you just want to nerd out about fabric — reach out.";
  const supportEmail = cntTxt?.email || config?.general?.contactEmail || "support@riotous.store";
  const rawPhone = cntTxt?.phone || config?.general?.contactPhone || config?.settings?.storePhone || "+91 98765 43211";
  const supportPhone =
    rawPhone.includes("98980") || rawPhone.includes("90998") ? "+91 98765 43211" : rawPhone;
  const businessHours = cntTxt?.businessHours || "Mon — Sat · 10:00 — 19:00 IST";
  const instagram = cntTxt?.instagram || "@riotous_store";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name) {
      toast.error("Name is required.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!message) {
      toast.error("Message is required.");
      return;
    }
    toast.success("Message sent — we'll be in touch.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-10 py-12 sm:py-16 md:py-24">
      <div className="grid gap-12 lg:gap-16 md:grid-cols-2 md:gap-16 items-start">
        {/* Left Column: Contact Methods & Studio Hours (Issue 4: Tighter, Cohesive Grouping) */}
        <div>
          <p className="mb-4 sm:mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Contact
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-7xl">{pageTitle}</h1>
          <p className="mt-4 sm:mt-6 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Contact Methods - Tightened vertical spacing to strengthen grouping */}
          <div className="mt-8 sm:mt-10 space-y-3.5 sm:space-y-4">
            <a href={`mailto:${supportEmail}`} className="block hover:opacity-85 transition-opacity">
              <ContactRow icon={Mail} label="Support" value={supportEmail} />
            </a>
            <a
              href={`tel:${supportPhone.replace(/\s+/g, "")}`}
              className="block hover:opacity-85 transition-opacity"
            >
              <ContactRow icon={Phone} label="Helpline" value={supportPhone} />
            </a>
            <a
              href="https://www.instagram.com/riotous_store"
              target="_blank"
              rel="noreferrer"
              className="block hover:opacity-85 transition-opacity"
            >
              <ContactRow icon={Instagram} label="Instagram" value={instagram} />
            </a>
          </div>

          {/* Studio Hours - Naturally connected without excessive gap */}
          <div className="mt-8 sm:mt-10 border-t border-border/60 pt-6 sm:pt-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Studio hours
            </p>
            <p className="mt-2 text-sm text-foreground/90 font-medium">{businessHours}</p>
          </div>
        </div>

        {/* Right Column: Contact Form with Intentional 8px Stacked-Card Effect (Issue 1) */}
        <div className="relative mr-2 mb-2 sm:mr-2.5 sm:mb-2.5">
          {/* Intentional stacked back card (8px horizontal & 8px vertical offset, matching border radius) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-2 translate-y-2 rounded-3xl bg-black border border-neutral-800 shadow-md pointer-events-none"
          />

          {/* Main Foreground Form Card */}
          <form
            onSubmit={submit}
            className="relative rounded-3xl border border-border bg-card p-6 sm:p-8 md:p-10 shadow-sm"
          >
            <div className="space-y-5">
              <Field
                label="Name"
                placeholder="Your name"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              />
              <Field
                label="Email"
                type="email"
                placeholder="Your email address"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              />
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  maxLength={1000}
                  placeholder="Tell us how we can help..."
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
                />
              </div>
            </div>

            {/* Unified Primary CTA Button (Issues 2 & 3: Pill-shaped, consistent uppercase tracking, matches JOIN button) */}
            <button
              type="submit"
              className="btn-primary mt-6 flex h-12 min-h-[48px] w-full items-center justify-center rounded-full bg-foreground px-8 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-all duration-200 hover:bg-brand hover:text-brand-foreground hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={type === "email" ? 255 : 100}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
      />
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3.5 sm:gap-4 group">
      <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-secondary text-foreground group-hover:bg-brand group-hover:text-white transition-colors duration-200 shrink-0">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground truncate group-hover:text-brand transition-colors duration-200">
          {value}
        </p>
      </div>
    </div>
  );
}
