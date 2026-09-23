import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Mail, Settings2 } from "lucide-react";
import {
  adminListReturns,
  adminReturnEmails,
  adminReturnHistory,
  adminUpdateReturn,
  adminGetReturnSettings,
  adminSetReturnSettings,
  type AdminReturnRecord,
} from "@/lib/admin-returns.functions";
import {
  NEXT_STATUSES,
  REFUND_STATUSES,
  RETURN_STATUSES,
  RETURN_STATUS_TONE,
  REFUND_STATUS_TONE,
} from "@/lib/returns-shared";
import { money, dateTime } from "@/components/admin/format";
import { productImageUrl } from "@/lib/product-images";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";

export const Route = createFileRoute("/_authenticated/admin/returns")({
  head: () => ({
    meta: [
      { title: "Returns & Exchange Requests | RIOTOUS Admin Support" },
      { name: "description", content: "Review and process customer return and exchange requests." },
    ],
  }),
});
