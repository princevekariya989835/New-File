/**
 * RIOTOUS Central Brevo Email Service
 * Server-only. Never import from client components.
 *
 * Uses Brevo Transactional Email API via native fetch().
 * Compatible with Cloudflare Workers and Node.js runtimes.
 * Falls back to console logging when EMAIL_MODE=development or no BREVO_API_KEY is set.
 */

import { getSql } from "@/lib/db";

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
  sender: BrevoSender;
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
  reason?: string;
}

// ─── Senders ──────────────────────────────────────────────────────────────────

export const BREVO_SENDER_AUTH: BrevoSender = {
  name: "RIOTOUS",
  email: "welcome@riotous.store",
};

export const BREVO_SENDER_ORDERS: BrevoSender = {
  name: "RIOTOUS Orders",
  email: "order@riotous.store",
};

export const BREVO_REPLY_TO: BrevoRecipient = {
  name: "RIOTOUS Support",
  email: "support@riotous.store",
};

// ─── Core Brevo API Call ──────────────────────────────────────────────────────

/**
 * Sends a transactional email via Brevo API.
 * NEVER throws — always returns a result object so callers can handle gracefully.
 */
export async function sendBrevoEmail(opts: SendBrevoEmailOptions): Promise<BrevoEmailResult> {
  const apiKey = process.env["BREVO_API_KEY"];
  const emailMode = process.env["EMAIL_MODE"] || "development";

  // Development / no-key mode: log and return success simulation
  if (!apiKey || emailMode === "development") {
    const recipientList = opts.to.map((r) => r.email).join(", ");
    console.info(
      `[Brevo Dev] EMAIL SIMULATED — To: ${recipientList} | Subject: ${opts.subject} | Type: ${opts.meta?.emailType ?? "UNKNOWN"}`,
    );
    await logEmail({
      ...opts.meta,
      recipient: opts.to[0]?.email ?? "",
      sender: opts.sender.email,
      subject: opts.subject,
      status: "simulated",
      provider: "brevo",
    });
    return { sent: true };
  }

  try {
    const payload = {
      sender: opts.sender,
      to: opts.to,
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      textContent: opts.textContent,
      replyTo: opts.replyTo ?? BREVO_REPLY_TO,
    };

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      console.warn(`[Brevo] Send failed (${res.status}): ${errorText}`);
      await logEmail({
        ...opts.meta,
        recipient: opts.to[0]?.email ?? "",
        sender: opts.sender.email,
        subject: opts.subject,
        status: "failed",
        provider: "brevo",
        errorMessage: `HTTP ${res.status}: ${errorText.slice(0, 400)}`,
      });
      return { sent: false, reason: `Provider error ${res.status}` };
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const messageId = String(body?.messageId ?? "");

    await logEmail({
      ...opts.meta,
      recipient: opts.to[0]?.email ?? "",
      sender: opts.sender.email,
      subject: opts.subject,
      status: "sent",
      provider: "brevo",
      providerMessageId: messageId,
    });

    return { sent: true, messageId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Brevo] Unexpected send error:", err);
    await logEmail({
      ...opts.meta,
      recipient: opts.to[0]?.email ?? "",
      sender: opts.sender.email,
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
        NOW(),
        ${opts.status === "sent" ? "NOW()" : null}
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
