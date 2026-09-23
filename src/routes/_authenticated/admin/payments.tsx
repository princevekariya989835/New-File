import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  adminListPayments,
  adminUpdatePaymentStatus,
  type AdminPayment,
  type PaymentStatus,
  type PaymentMethod,
} from "@/lib/admin-payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";
import {
  CreditCard,
  Receipt,
  Search,
  ArrowUpDown,
  Eye,
  RefreshCcw,
  ShieldAlert,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payment Gateway & Transactions | RIOTOUS Admin Store" },
      {
        name: "description",
        content: "Manage store transactions, payment statuses, refunds, and financial performance.",
      },
    ],
  }),
});
