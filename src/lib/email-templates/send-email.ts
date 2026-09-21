/**
 * RIOTOUS Legacy Template Email Bridge
 * Routes legacy `sendTemplateEmail()` calls through the central Brevo service.
 * Server-only: never import from client components.
 */

import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "./registry";
import { sendBrevoEmail, BREVO_SENDER_AUTH, BREVO_SENDER_ORDERS, BREVO_REPLY_TO } from "@/lib/email/brevo";

export type SendTemplateEmailResult = { sent: true } | { sent: false; reason: string };

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>;
  /** Dedupes retries of the same logical send; not used by Brevo (idempotency handled per order/type). */
  idempotencyKey?: string;
  replyTo?: string;
}

/**
 * Renders a registered React Email template and sends it via Brevo.
 * Falls back to console logging in development or when BREVO_API_KEY is absent.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(", ")}`,
    );
  }

  // Template-level `to` takes precedence (e.g. admin notification templates)
  const recipient = template.to || to;
  if (!recipient) {
    throw new Error("Recipient is required (the template defines no fixed recipient)");
  }

  const templateData = options.templateData ?? {};
  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function" ? template.subject(templateData) : template.subject;

  // Pick sender based on template type
  const isOrderTemplate =
    templateName.includes("order") ||
    templateName.includes("admin") ||
    templateName.includes("payment") ||
    templateName.includes("shipping") ||
    templateName.includes("return");

  const sender = isOrderTemplate ? BREVO_SENDER_ORDERS : BREVO_SENDER_AUTH;

  const result = await sendBrevoEmail({
    sender,
    to: [{ email: recipient }],
    subject,
    htmlContent: html,
    textContent: text,
    replyTo: BREVO_REPLY_TO,
    meta: { emailType: templateName.toUpperCase().replace(/-/g, "_") },
  });

  if (!result.sent) {
    return { sent: false, reason: result.reason ?? "Unknown error" };
  }
  return { sent: true };
}
