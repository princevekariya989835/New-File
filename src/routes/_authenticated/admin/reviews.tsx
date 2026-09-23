import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import {
  adminListReviews,
  adminUpdateReviewStatus,
  adminDeleteReview,
  adminReviewFormOptions,
  adminSaveReview,
} from "@/lib/admin-reviews.functions";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_TONE,
  type AdminReview,
  type ReviewStatus,
} from "@/lib/reviews-shared";
import { Stars, StarPicker } from "@/components/reviews/star-rating";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MAX_REVIEW_IMAGES,
  reviewImageUrl,
  uploadReviewImage,
  validateReviewImage,
} from "@/lib/review-images";
import { productImageUrl } from "@/lib/product-images";
import { dateTime } from "@/components/admin/format";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Product Review Moderation | RIOTOUS Admin Management" },
      { name: "description", content: "Moderate, approve, and manage customer product reviews." },
    ],
  }),
});
