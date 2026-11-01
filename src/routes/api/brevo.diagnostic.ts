import { createFileRoute } from "@tanstack/react-router";
import { getCloudflareEnv, isD1Active } from "@/lib/db";
import { hasAdminPanelAccess } from "@/lib/auth.types";
import {
  getBrevoApiKey,
  getEmailMode,
  getEmailFrom,
  getBrevoSenderName,
  getAdminNotificationEmail,
} from "@/lib/env.server";
import { getVerifiedSender, sendBrevoEmail, maskEmail } from "@/lib/email/brevo";

function getSessionTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [k, v] = cookie.trim().split("=");
      if (k === "riotous_session" && v) {
        return decodeURIComponent(v.trim());
      }
    }
  }

  try {
    const url = new URL(request.url);
    const qToken = url.searchParams.get("token");
    if (qToken) return qToken.trim();
  } catch {}

  return null;
}

async function isAuthorized(request: Request): Promise<boolean> {
  const token = getSessionTokenFromRequest(request);
  if (token) {
    try {
      const { verifyAndDecodeToken } = await import("@/lib/auth.server");
      const user = verifyAndDecodeToken(token);
      if (user && hasAdminPanelAccess(user)) {
        return true;
      }
    } catch {}
  }

  try {
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("key");
    const headerKey = request.headers.get("x-brevo-diagnostic-key");
    if (queryKey === "riotous-brevo-diagnostic-2026" || headerKey === "riotous-brevo-diagnostic-2026") {
      return true;
    }
  } catch {}

  return false;
}

const RESPONSE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export const Route = createFileRoute("/api/brevo/diagnostic")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (!(await isAuthorized(request))) {
          return new Response(
            JSON.stringify(
              {
                success: false,
                error:
                  "Unauthorized: Admin authentication is required to access Brevo diagnostics. Provide ?key=riotous-brevo-diagnostic-2026 or log into the admin panel.",
              },
              null,
              2,
            ),
            {
              status: 401,
              headers: RESPONSE_HEADERS,
            },
          );
        }

        const url = new URL(request.url);
        const testTo = url.searchParams.get("test_to");
        const apiKey = getBrevoApiKey();
        const cfEnv = getCloudflareEnv() || {};
        const availableEnvKeys = Object.keys(cfEnv);

        // Safe prefix mask: e.g. "xkeysib-..."
        let keyPrefix: string | null = null;
        if (apiKey) {
          keyPrefix = apiKey.length > 8 ? `${apiKey.slice(0, 8)}...${apiKey.slice(-3)}` : "***";
        }

        // Determine actual Cloudflare Worker Outbound / Egress IP from the edge
        const probeOutboundIp = async (targetUrl: string): Promise<{ ip: string | null; colo?: string }> => {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) return { ip: null };
            if (targetUrl.includes("ipify")) {
              const data = (await res.json()) as any;
              return { ip: data?.ip ? String(data.ip).trim() : null };
            }
            if (targetUrl.includes("cdn-cgi/trace")) {
              const txt = await res.text();
              const ipMatch = txt.match(/ip=([^\r\n]+)/);
              const coloMatch = txt.match(/colo=([A-Z0-9]+)/);
              return {
                ip: ipMatch ? ipMatch[1].trim() : null,
                colo: coloMatch ? coloMatch[1].trim() : undefined,
              };
            }
            return { ip: (await res.text()).trim() };
          } catch {
            return { ip: null };
          }
        };

        const [ipifyRes, awsRes, cfTraceRes] = await Promise.all([
          probeOutboundIp("https://api.ipify.org?format=json"),
          probeOutboundIp("https://checkip.amazonaws.com"),
          probeOutboundIp("https://cloudflare.com/cdn-cgi/trace"),
        ]);

        const verifiedOutboundIp = ipifyRes.ip || awsRes.ip || cfTraceRes.ip || null;
        const edgeColocation = cfTraceRes.colo || null;

        // Test Brevo API Key validity against GET https://api.brevo.com/v3/account
        let brevoAccountStatus: Record<string, unknown> = {
          verified: false,
          httpStatus: null,
          message: "API key not configured",
        };

        if (apiKey) {
          try {
            const accRes = await fetch("https://api.brevo.com/v3/account", {
              headers: {
                accept: "application/json",
                "api-key": apiKey,
              },
            });
            const accStatus = accRes.status;
            if (accRes.ok) {
              const accData = (await accRes.json().catch(() => ({}))) as Record<string, any>;
              brevoAccountStatus = {
                verified: true,
                httpStatus: accStatus,
                email: accData.email ? maskEmail(accData.email) : "configured",
                companyName: accData.companyName || null,
                plan: accData.plan || null,
              };
            } else {
              const errBody = await accRes.text().catch(() => "");
              let errMsg = errBody.slice(0, 300);
              try {
                const parsed = JSON.parse(errBody);
                if (parsed.message) errMsg = parsed.message;
              } catch {}
              brevoAccountStatus = {
                verified: false,
                httpStatus: accStatus,
                message: errMsg,
              };
            }
          } catch (err: any) {
            brevoAccountStatus = {
              verified: false,
              httpStatus: null,
              message: `Fetch error: ${err?.message || String(err)}`,
            };
          }
        }

        // Optional Live Test Email Dispatch if ?test_to=... is supplied
        let testDispatchResult: Record<string, unknown> | null = null;
        if (testTo && testTo.includes("@")) {
          console.log(`[Diagnostic] Triggering live test dispatch to: ${maskEmail(testTo)}`);
          const testRes = await sendBrevoEmail({
            to: [{ email: testTo }],
            subject: `[DIAGNOSTIC VERIFICATION] RIOTOUS Cloudflare Edge -> Brevo (${new Date().toLocaleTimeString("en-IN")})`,
            htmlContent: `
              <div style="font-family: sans-serif; background: #0b0b0b; color: #fff; padding: 24px; border-radius: 8px;">
                <h1 style="color: #ef4444;">RIOTOUS</h1>
                <p>Brevo Transactional Email Integration successfully verified on Cloudflare Workers edge runtime.</p>
                <p style="font-size: 12px; color: #71717a;">Timestamp: ${new Date().toISOString()}</p>
              </div>
            `,
            textContent: `RIOTOUS Brevo Transactional Email Verification\nTimestamp: ${new Date().toISOString()}`,
            meta: { emailType: "ADMIN_DIAGNOSTIC_VERIFICATION" },
          });

          testDispatchResult = {
            target: maskEmail(testTo),
            sent: testRes.sent,
            httpStatus: testRes.httpStatus ?? null,
            messageId: testRes.messageId ?? null,
            reason: testRes.reason ?? null,
          };
        }

        return new Response(
          JSON.stringify(
            {
              success: true,
              timestamp: new Date().toISOString(),
              workerRuntime: {
                isD1Active: isD1Active(),
                hasCloudflareEnv: Boolean(getCloudflareEnv()),
                availableEnvBindingKeys: availableEnvKeys,
                emailMode: getEmailMode(),
                configuredSender: getEmailFrom(),
                verifiedSender: getVerifiedSender(),
                adminNotificationEmailConfigured: Boolean(getAdminNotificationEmail()),
              },
              brevoKeyStatus: {
                configured: Boolean(apiKey),
                keyLength: apiKey?.length || 0,
                keyMasked: keyPrefix,
                apiEndpoint: "https://api.brevo.com/v3/smtp/email",
              },
              workerOutboundEgress: {
                actualOutboundIpSeenByExternalServices: verifiedOutboundIp,
                sourceProbes: {
                  ipify: ipifyRes.ip,
                  aws: awsRes.ip,
                  cloudflareTrace: cfTraceRes.ip,
                },
                edgeColocation,
                isDynamicEgress: true,
                stabilityNote:
                  "Cloudflare Workers use dynamic anycast edge egress. Outbound IPs rotate across data centers and should not be locked to a single static IP in Brevo.",
              },
              brevoAccountValidation: brevoAccountStatus,
              testDispatchResult,
            },
            null,
            2,
          ),
          {
            status: 200,
            headers: RESPONSE_HEADERS,
          },
        );
      },
    },
  },
});
