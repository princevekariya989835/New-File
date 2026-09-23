import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasAdminPanelAccess } from "@/lib/auth";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Shirt,
  Truck,
  Gift,
} from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign Up & Sign In | RIOTOUS Streetwear Official" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Sign up or sign in to your RIOTOUS account to shop, save custom designs and track orders.",
      },
      { property: "og:title", content: "Sign Up & Sign In | RIOTOUS Streetwear Official" },
      {
        property: "og:description",
        content: "Sign up or sign in to your RIOTOUS account to shop, save custom designs and track orders.",
      },
    ],
  }),
});
