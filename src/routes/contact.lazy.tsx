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
    <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
      <div className="grid gap-16 md:grid-cols-2 md:gap-24 items-start">
        <div>
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Contact
          </p>
          <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">{pageTitle}</h1>
          <p className="mt-6 max-w-md text-muted-foreground leading-relaxed">
            {description}
          </p>

          <div className="mt-12 space-y-6">
            <a href={`mailto:${supportEmail}`} className="block hover:opacity-80 transition-opacity">
              <ContactRow icon={Mail} label="Support" value={supportEmail} />
            </a>
            <a
              href={`tel:${supportPhone.replace(/\s+/g, "")}`}
              className="block hover:opacity-80 transition-opacity"
            >
              <ContactRow icon={Phone} label="Helpline" value={supportPhone} />
            </a>
            <a
              href="https://www.instagram.com/riotous_store"
              target="_blank"
              rel="noreferrer"
              className="block hover:opacity-80 transition-opacity"
            >
              <ContactRow icon={Instagram} label="Instagram" value={instagram} />
            </a>
          </div>

          <div className="mt-12 border-t border-border pt-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Studio hours
            </p>
            <p className="mt-3 text-sm">{businessHours}</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-border bg-secondary/40 p-6 sm:p-8 md:p-8"
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
          <button
            type="submit"
            className="mt-6 h-12 w-full rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Send message
          </button>
        </form>
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
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
