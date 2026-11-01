/**
 * RIOTOUS Central Brevo Email Service
 * Server-only. Never import from client components.
 *
 * Uses Brevo Transactional Email API via native fetch().
 * Official endpoint: POST https://api.brevo.com/v3/smtp/email
 * Compatible with Cloudflare Workers and Node.js runtimes.
 *
 * Exclusively handles ALL outgoing transactional emails across RIOTOUS.
 */

import { getSql } from "@/lib/db";
import {
  getBrevoApiKey,
  getEmailMode,
  getEmailFrom,
  getBrevoSenderName,
} from "@/lib/env.server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrevoSender {
  name: string;
  email: string;
}

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface SendBrevoEmailOptions {
  sender?: BrevoSender;
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: BrevoRecipient;
  /** Metadata for email_logs table */
  meta?: {
    userId?: string | null;
    orderId?: string | null;
    emailType: string;
  };
}

export interface BrevoEmailResult {
  sent: boolean;
  messageId?: string;
  httpStatus?: number;
  reason?: string;
}

// ─── Default Senders ──────────────────────────────────────────────────────────

export const BREVO_SENDER_AUTH: BrevoSender = {
  name: "RIOTOUS",
  email: "order@riotous.store",
};

export const BREVO_SENDER_ORDERS: BrevoSender = {
  name: "RIOTOUS Orders",
  email: "order@riotous.store",
};

export const BREVO_REPLY_TO: BrevoRecipient = {
  name: "RIOTOUS Support",
  email: "support@riotous.store",
};

/**
 * Masks an email address for safe diagnostics without leaking PII.
 * Example: "customer@example.com" -> "c***r@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Resolves the verified sender identity configured in environment/secrets.
 * Uses BREVO_SENDER_EMAIL / EMAIL_FROM and BREVO_SENDER_NAME.
 */
export function getVerifiedSender(defaultSender?: BrevoSender): BrevoSender {
  const envFrom = getEmailFrom();
  const configuredName = getBrevoSenderName();
  const fallback = defaultSender ?? BREVO_SENDER_ORDERS;

  if (envFrom) {
    const match = envFrom.match(/^(.*?)\s*<(.+)>$/);
    if (match) {
      return {
        name: match[1].trim() || configuredName || fallback.name,
        email: match[2].trim(),
      };
    }
    if (envFrom.includes("@")) {
      return {
        name: configuredName || fallback.name,
        email: envFrom.trim(),
      };
    }
  }

  return {
    name: configuredName || fallback.name,
    email: fallback.email,
  };
}

// ─── Core Brevo API Call ──────────────────────────────────────────────────────

/**
 * Sends a transactional email via Brevo Official API:
 * POST https://api.brevo.com/v3/smtp/email
 *
 * NEVER throws — always returns a structured result object so callers can handle gracefully.
 * Awaited by callers to prevent Cloudflare Worker runtime termination.
 */
export async function sendBrevoEmail(opts: SendBrevoEmailOptions): Promise<BrevoEmailResult> {
  const apiKey = getBrevoApiKey();
  const emailMode = getEmailMode();
  const emailType = opts.meta?.emailType ?? "TRANSACTIONAL";

  // Validate recipients
  const validRecipients = (opts.to || [])
    .map((r) => ({
      email: String(r.email || "").trim(),
      name: r.name ? String(r.name).trim() : undefined,
    }))
    .filter((r) => r.email && r.email.includes("@"));

  if (validRecipients.length === 0) {
    const errReason = "No valid recipient email address provided";
    console.warn(`[Brevo Trace] Send aborted: ${errReason} (Event: ${emailType})`);
    return { sent: false, reason: errReason };
  }

  const primaryRecipient = validRecipients[0].email;
  const maskedRecipient = maskEmail(primaryRecipient);
  const sender = getVerifiedSender(opts.sender);

  console.log(
    `[Brevo Trace] Initiating email workflow — Event: ${emailType} | To: ${maskedRecipient} | Mode: ${emailMode} | HasKey: ${Boolean(apiKey)} | KeyLen: ${apiKey?.length ?? 0} | Sender: ${sender.email}`,
  );

  // Simulation mode check (explicitly configured via EMAIL_MODE=simulation or mock)
  if (emailMode === "simulation" || emailMode === "mock") {
    console.info(
      `[Brevo Trace] EMAIL SIMULATED — Event: ${emailType} | To: ${maskedRecipient} | Subject: "${opts.subject}"`,
    );
    await logEmail({
      ...opts.meta,
      recipient: primaryRecipient,
      sender: sender.email,
      subject: opts.subject,
      status: "simulated",
      provider: "brevo",
      providerMessageId: `sim_${Date.now()}`,
    });
    return { sent: true, messageId: `sim_${Date.now()}`, httpStatus: 200 };
  }

  // Missing API Key check: Do NOT report false-positive success!
  if (!apiKey || apiKey.trim() === "") {
    const reason = "BREVO_API_KEY secret is not present in runtime environment";
    console.warn(
      `[Brevo Trace] DISPATCH BLOCKED: ${reason} (Event: ${emailType} | To: ${maskedRecipient}). Configure BREVO_API_KEY secret in Cloudflare Dashboard or via wrangler.`,
    );
    await logEmail({
      ...opts.meta,
      recipient: primaryRecipient,
      sender: sender.email,
      subject: opts.subject,
      status: "failed",
      provider: "brevo",
      errorMessage: reason,
    });
    return { sent: false, reason };
  }

  try {
    const payload: Record<string, unknown> = {
      sender,
      to: validRecipients,
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      replyTo: opts.replyTo ?? BREVO_REPLY_TO,
    };

    if (opts.textContent) {
      payload.textContent = opts.textContent;
    }

    // Abort controller with 10-second timeout to protect Worker execution
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log(
      `[Brevo Trace] Dispatching HTTP POST https://api.brevo.com/v3/smtp/email — Event: ${emailType} | To: ${maskedRecipient}`,
    );

    let res: Response;
    try {
      res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log(
      `[Brevo Trace] HTTP Response received — Event: ${emailType} | Status: ${res.status} ${res.statusText}`,
    );

    // Parse HTTP response
    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown response body");
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.message) {
          errorMessage = `HTTP ${res.status}: ${errorJson.message}`;
        }
      } catch {
        errorMessage = `HTTP ${res.status}: ${errorText.slice(0, 200)}`;
      }

      console.warn(
        `[Brevo Trace] Brevo API rejected dispatch — Event: ${emailType} | Status: ${res.status} | Sanitized Detail: ${errorMessage}`,
      );

      await logEmail({
        ...opts.meta,
        recipient: primaryRecipient,
        sender: sender.email,
        subject: opts.subject,
        status: "failed",
        provider: "brevo",
        errorMessage: errorMessage.slice(0, 400),
      });

      return {
        sent: false,
        httpStatus: res.status,
        reason: errorMessage,
      };
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const messageId = String(body?.messageId ?? "");

    console.info(
      `[Brevo Trace] Brevo dispatch accepted — Event: ${emailType} | Status: ${res.status} | MessageID: ${messageId || "N/A"} | To: ${maskedRecipient}`,
    );

    await logEmail({
      ...opts.meta,
      recipient: primaryRecipient,
      sender: sender.email,
      subject: opts.subject,
      status: "sent",
      provider: "brevo",
      providerMessageId: messageId || undefined,
    });

    return {
      sent: true,
      messageId: messageId || undefined,
      httpStatus: res.status,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const message = isAbort
      ? "Brevo API request timed out after 10s"
      : err instanceof Error
        ? err.message
        : String(err);

    console.error(`[Brevo] Unexpected send error for ${maskedRecipient}:`, message);
    await logEmail({
      ...opts.meta,
      recipient: primaryRecipient,
      sender: sender.email,
      subject: opts.subject,
      status: "failed",
      provider: "brevo",
      errorMessage: message.slice(0, 400),
    });

    return { sent: false, reason: message };
  }
}

// ─── Email Logging ────────────────────────────────────────────────────────────

interface LogEmailOpts {
  userId?: string | null;
  orderId?: string | null;
  emailType?: string;
  recipient: string;
  sender: string;
  subject: string;
  status: "sent" | "failed" | "simulated";
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
}

async function logEmail(opts: LogEmailOpts) {
  try {
    const sql = getSql();
    const id = `eml_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();
    const sentAt = opts.status === "sent" ? nowIso : null;

    await sql`
      INSERT INTO email_logs (
        id, user_id, order_id, email_type, recipient, sender, status,
        provider, provider_message_id, error_message, created_at, sent_at
      ) VALUES (
        ${id},
        ${opts.userId ?? null},
        ${opts.orderId ?? null},
        ${opts.emailType ?? "UNKNOWN"},
        ${opts.recipient},
        ${opts.sender},
        ${opts.status},
        ${opts.provider},
        ${opts.providerMessageId ?? null},
        ${opts.errorMessage ?? null},
        ${nowIso},
        ${sentAt}
      )
    `;
  } catch (logErr) {
    // Never let logging failures affect email delivery or business logic
    console.warn("[Brevo] Email logging failed (non-fatal):", logErr);
  }
}

// ─── Idempotency Helper ───────────────────────────────────────────────────────

/**
 * Returns true if a specific email type has already been successfully sent for an order.
 * Use this before triggering state-transition emails to prevent duplicates.
 */
export async function hasEmailBeenSent(orderId: string, emailType: string): Promise<boolean> {
  if (!orderId || !emailType) return false;
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id FROM email_logs
      WHERE order_id = ${orderId}
        AND email_type = ${emailType}
        AND status IN ('sent', 'simulated')
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false; // Fail open — allow send attempt if check fails
  }
}
