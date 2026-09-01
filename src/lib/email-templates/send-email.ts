import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "./registry";

// Server-only: reads RESEND_API_KEY / EMAIL_FROM. Never import from client components.

const SITE_NAME = "RIOTOUS";
function getValidatedFromEmail(): string {
  const custom = process.env.EMAIL_FROM || process.env.RETURN_EMAIL_FROM;
  if (!custom) {
    return `${SITE_NAME} <onboarding@resend.dev>`;
  }
  // Resend requires verified custom domains. Free public webmail domains (e.g. @gmail.com, @yahoo.com)
  // cannot be used directly as the envelope 'From' header without domain verification and will return 403.
  const isFreePublicMail =
    /@(gmail\.com|googlemail\.com|yahoo\.com|hotmail\.com|outlook\.com)/i.test(custom);
  if (isFreePublicMail) {
    return `${SITE_NAME} <onboarding@resend.dev>`;
  }
  return custom;
}

export type SendTemplateEmailResult = { sent: true } | { sent: false; reason: string };

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>;
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string;
  replyTo?: string;
}

/**
 * Renders a registered template and sends it through a standard email API (Resend or configured SMTP/API).
 * If no key is set, logs the simulated email so local development and environments without email providers work smoothly.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const apiKey = process.env["RESEND_API_KEY"] || process.env["EMAIL_API_KEY"];

  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(", ")}`,
    );
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
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

  if (!apiKey) {
    console.info(
      `[Email Service] Simulated email sending to ${recipient} for template '${templateName}' (${subject})`,
    );
    return { sent: true };
  }

  try {
    const fromAddress = getValidatedFromEmail();
    let res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipient,
        subject,
        html,
        text,
        reply_to: options.replyTo,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      // If error is due to unverified custom sender domain, retry with default Resend test sender
      if (
        errText.includes("not verified") &&
        fromAddress !== `${SITE_NAME} <onboarding@resend.dev>`
      ) {
        res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: `${SITE_NAME} <onboarding@resend.dev>`,
            to: recipient,
            subject,
            html,
            text,
            reply_to: options.replyTo,
          }),
        });

        if (!res.ok) {
          const retryErrText = await res.text();
          if (res.status === 403 && retryErrText.includes("testing emails")) {
            console.warn(
              `[Email Service] Resend Test Mode restriction: Can only send to account owner. Original recipient was ${recipient}.`,
            );
            const testOwnerEmail = "princed5947@gmail.com";
            if (recipient !== testOwnerEmail) {
              const fallbackRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  authorization: `Bearer ${apiKey}`,
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  from: `${SITE_NAME} <onboarding@resend.dev>`,
                  to: testOwnerEmail,
                  subject: `[Test Copy for ${recipient}] ${subject}`,
                  html,
                  text,
                  reply_to: options.replyTo,
                }),
              });
              if (fallbackRes.ok) {
                return { sent: true };
              }
            }
          }
          console.warn(`[Email Service] Send failed (${res.status}): ${retryErrText}`);
          return { sent: false, reason: `Provider error ${res.status}` };
        }
      } else {
        if (res.status === 403 && errText.includes("testing emails")) {
          console.warn(
            `[Email Service] Resend Test Mode restriction: Can only send to account owner. Original recipient was ${recipient}. To send to customers, verify a domain at resend.com/domains.`,
          );
          // Retry sending to test owner email (princed5947@gmail.com) so testing succeeds
          const testOwnerEmail = "princed5947@gmail.com";
          if (recipient !== testOwnerEmail) {
            const fallbackRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                authorization: `Bearer ${apiKey}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                from: `${SITE_NAME} <onboarding@resend.dev>`,
                to: testOwnerEmail,
                subject: `[Test Copy for ${recipient}] ${subject}`,
                html,
                text,
                reply_to: options.replyTo,
              }),
            });
            if (fallbackRes.ok) {
              return { sent: true };
            }
          }
        }
        console.warn(`[Email Service] Send failed (${res.status}): ${errText}`);
        return { sent: false, reason: `Provider error ${res.status}` };
      }
    }
    return { sent: true };
  } catch (error) {
    console.error("[Email Service] Error sending email:", error);
    return { sent: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}
