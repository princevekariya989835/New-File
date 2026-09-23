import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Loader2,
  Package,
  ArrowRight,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
  ChevronRight,
  Info,
} from "lucide-react";
import { SiteLoader } from "@/components/site-loader";
import { toast } from "sonner";
import { getMyOrders, cancelMyOrder, type CustomerOrder } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/account/orders")({
  head: () => ({
    meta: [
      { title: "Track My Orders & Purchase History | RIOTOUS Account" },
      { name: "description", content: "View your RIOTOUS order history." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
