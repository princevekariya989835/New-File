import { createFileRoute } from "@tanstack/react-router";

type Search = {
  q?: string;
  status?: string;
  payment?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export const Route = createFileRoute("/_authenticated/admin/orders")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    status: typeof s["status"] === "string" ? s["status"] : undefined,
    payment: typeof s["payment"] === "string" ? s["payment"] : undefined,
    from: typeof s["from"] === "string" ? s["from"] : undefined,
    to: typeof s["to"] === "string" ? s["to"] : undefined,
    page:
      typeof s["page"] === "number"
        ? Math.max(1, s["page"])
        : typeof s["page"] === "string"
          ? Math.max(1, parseInt(s["page"], 10) || 1)
          : 1,
    limit:
      typeof s["limit"] === "number"
        ? Math.max(10, Math.min(100, s["limit"]))
        : typeof s["limit"] === "string"
          ? Math.max(10, Math.min(100, parseInt(s["limit"], 10) || 25))
          : 25,
  }),
  head: () => ({
    meta: [
      { title: "Order Fulfillment & Processing | RIOTOUS Admin Store" },
      { name: "description", content: "Process and fulfill customer orders for RIOTOUS." },
    ],
  }),
});
