import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Loader2, Package, ArrowRight, LifeBuoy, CheckCircle2 } from "lucide-react";
import { SiteLoader } from "@/components/site-loader";
import { getMyOrders, type CustomerOrder } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/catalog";
import { useAuth } from "@/hooks/use-auth";
import { CustomerReturns } from "@/components/returns/customer-returns";
import {
  getMySupportRequests,
  submitSupportRequest,
  type SupportRequest,
} from "@/lib/support.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/returns")({
  head: () => ({
    meta: [
      { title: "Order Returns & Customer Support | RIOTOUS Account" },
      {
        name: "description",
        content:
          "Request a return within 7 days of delivery or raise a support request with the RIOTOUS team.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});
