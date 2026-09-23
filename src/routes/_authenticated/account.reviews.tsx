import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { getMyReviews } from "@/lib/reviews.functions";
import { Stars } from "@/components/reviews/star-rating";
import { reviewImageUrl } from "@/lib/review-images";
import { productImageUrl } from "@/lib/product-images";
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/lib/reviews-shared";

export const Route = createFileRoute("/_authenticated/account/reviews")({
  head: () => ({
    meta: [
      { title: "My Product Reviews & Feedback | RIOTOUS Account" },
      {
        name: "description",
        content: "Reviews you have written on RIOTOUS products and their approval status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});
