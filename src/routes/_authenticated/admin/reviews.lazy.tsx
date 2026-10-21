import { createLazyFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FilterX,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
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

export const Route = createLazyFileRoute("/_authenticated/admin/reviews")({
  component: AdminReviewsPage,
});

function img(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith("http") || path.startsWith("/api/") ? path : productImageUrl(path);
}

type SortKey = "newest" | "oldest" | "highest" | "lowest";

type FormState = {
  reviewId: string | null;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  title: string;
  review: string;
  images: string[];
  verifiedPurchase: boolean;
  isSample: boolean;
  status: ReviewStatus;
  adminNote: string;
};

const emptyForm: FormState = {
  reviewId: null,
  productId: "",
  userId: "",
  authorName: "",
  rating: 5,
  title: "",
  review: "",
  images: [],
  verifiedPurchase: false,
  isSample: false,
  status: "approved",
  adminNote: "",
};

const PAGE_SIZE = 15;

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all w-full cursor-pointer ${
        active
          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
          : "border-border/60 bg-card/50 hover:bg-card hover:border-border"
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums tracking-tight">{value}</p>
    </button>
  );
}

function AdminReviewsPage() {
  const { user } = useAuth();
  const listFn = useServerFn(adminListReviews);
  const statusFn = useServerFn(adminUpdateReviewStatus);
  const deleteFn = useServerFn(adminDeleteReview);
  const optionsFn = useServerFn(adminReviewFormOptions);
  const saveFn = useServerFn(adminSaveReview);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"" | "customer" | "sample">("");
  const [status, setStatus] = useState<"" | ReviewStatus>("");
  const [verification, setVerification] = useState<"" | "yes" | "no">("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<FormState | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const listQ = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => listFn(),
    refetchInterval: 30_000,
  });

  const optionsQ = useQuery({
    queryKey: ["admin", "review-options"],
    queryFn: () => optionsFn(),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    qc.invalidateQueries({ queryKey: ["reviews"] });
  };

  const setStatusM = useMutation({
    mutationFn: (v: { reviewId: string; status?: ReviewStatus; adminNote?: string | null }) =>
      statusFn({ data: v }),
    onMutate: (vars) => setUpdatingId(vars.reviewId),
    onSuccess: (_, vars) => {
      if (vars.status) {
        toast.success(`Review updated to "${REVIEW_STATUS_LABEL[vars.status] || vars.status}"`);
      } else {
        toast.success("Internal note saved successfully");
      }
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update review"),
    onSettled: () => setUpdatingId(null),
  });

  const deleteM = useMutation({
    mutationFn: (reviewId: string) => deleteFn({ data: { reviewId } }),
    onMutate: (id) => setUpdatingId(id),
    onSuccess: () => {
      toast.success("Review permanently deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete review"),
    onSettled: () => setUpdatingId(null),
  });

  const saveM = useMutation({
    mutationFn: (f: FormState) =>
      saveFn({
        data: {
          reviewId: f.reviewId,
          productId: f.productId,
          userId: f.userId || null,
          authorName: f.authorName || null,
          rating: f.rating,
          title: f.title,
          review: f.review,
          images: f.images,
          isSample: f.isSample,
          status: f.status,
          adminNote: f.adminNote,
        },
      }),
    onSuccess: (res: any) => {
      if (res?.isVerified) {
        toast.success("Review saved (Confirmed delivered purchase verification)");
      } else {
        toast.success("Review saved successfully");
      }
      setForm(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save review"),
  });

  const all = useMemo(() => (Array.isArray(listQ.data) ? listQ.data : []), [listQ.data]);

  const stats = useMemo(() => {
    const by = (s: ReviewStatus) => all.filter((r) => r.status === s).length;
    const approved = all.filter((r) => r.status === "approved");
    const avg = approved.length
      ? Math.round((approved.reduce((a, r) => a + r.rating, 0) / approved.length) * 10) / 10
      : 0;
    return {
      total: all.length,
      customer: all.filter((r) => !r.is_sample).length,
      sample: all.filter((r) => Boolean(r.is_sample)).length,
      verified: all.filter((r) => r.verified_purchase).length,
      unverified: all.filter((r) => !r.verified_purchase).length,
      pending: by("pending"),
      approved: by("approved"),
      rejected: by("rejected"),
      hidden: by("hidden"),
      avg,
    };
  }, [all]);

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [q, sourceFilter, status, verification, ratingFilter, productFilter, sort]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = all.filter((r) => {
      if (sourceFilter === "customer" && r.is_sample) return false;
      if (sourceFilter === "sample" && !r.is_sample) return false;
      if (status && r.status !== status) return false;
      if (verification === "yes" && !r.verified_purchase) return false;
      if (verification === "no" && r.verified_purchase) return false;
      if (ratingFilter && Math.round(r.rating) !== Number(ratingFilter)) return false;

      if (productFilter) {
        const matchId = r.product_id === productFilter;
        const matchSlug = r.product?.slug === productFilter;
        const matchProd = (optionsQ.data?.products ?? []).find((p: any) => p.id === productFilter);
        const matchAlt = matchProd && (r.product_id === matchProd.slug || r.product?.name === matchProd.name);
        if (!matchId && !matchSlug && !matchAlt) return false;
      }

      if (!term) return true;
      return [
        r.id,
        r.author_name,
        r.customer_name,
        r.customer_email,
        r.user_id,
        r.product?.name,
        r.product?.slug,
        r.product_id,
        r.title,
        r.review,
        r.admin_note,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });

    const sorted = [...filtered];
    if (sort === "oldest") sorted.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    else if (sort === "highest") sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") sorted.sort((a, b) => a.rating - b.rating);
    else sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return sorted;
  }, [all, q, sourceFilter, status, verification, ratingFilter, productFilter, sort, optionsQ.data]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const hasActiveFilters = Boolean(
    q.trim() || sourceFilter || status || verification || ratingFilter || productFilter || sort !== "newest",
  );

  const resetFilters = () => {
    setQ("");
    setSourceFilter("");
    setStatus("");
    setVerification("");
    setRatingFilter("");
    setProductFilter("");
    setSort("newest");
    setPage(1);
  };

  const startEdit = (r: AdminReview) => {
    setForm({
      reviewId: r.id,
      productId: r.product_id,
      userId: r.user_id || "",
      authorName: r.customer_name || r.author_name || "",
      rating: r.rating,
      title: r.title ?? "",
      review: r.review ?? "",
      images: r.images ?? [],
      verifiedPurchase: r.verified_purchase,
      isSample: Boolean(r.is_sample),
      status: r.status,
      adminNote: r.admin_note ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onPick = async (files: FileList | null) => {
    if (!files?.length || !form || !user) return;
    const room = MAX_REVIEW_IMAGES - form.images.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (!chosen.length) return toast.error(`Up to ${MAX_REVIEW_IMAGES} photos`);
    setUploading(true);
    try {
      for (const f of chosen) {
        const invalid = validateReviewImage(f);
        if (invalid) {
          toast.error(invalid);
          continue;
        }
        const path = await uploadReviewImage(f, user.id);
        setForm((cur) => (cur ? { ...cur, images: [...cur.images, path] } : cur));
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Product Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.pending > 0 ? (
              <span className="font-semibold text-amber-500">{stats.pending} awaiting moderation · </span>
            ) : null}
            {stats.total} total reviews in database · {stats.approved} live & published
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setForm({ ...emptyForm });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="rounded-full bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add review
          </Button>
          <Button variant="outline" size="sm" onClick={() => refresh()} className="rounded-full">
            <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          <AdminEraseDataButton
            section="reviews"
            sectionLabel="Reviews"
            onSuccess={() => refresh()}
          />
        </div>
      </div>

      {/* Interactive Metric Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        <StatCard
          label="Total"
          value={stats.total}
          active={status === "" && sourceFilter === "" && verification === ""}
          onClick={() => {
            setStatus("");
            setSourceFilter("");
            setVerification("");
          }}
        />
        <StatCard
          label="Customer"
          value={stats.customer}
          active={sourceFilter === "customer"}
          onClick={() => setSourceFilter((prev) => (prev === "customer" ? "" : "customer"))}
        />
        <StatCard
          label="Sample"
          value={stats.sample}
          active={sourceFilter === "sample"}
          onClick={() => setSourceFilter((prev) => (prev === "sample" ? "" : "sample"))}
        />
        <StatCard
          label="Verified"
          value={stats.verified}
          active={verification === "yes"}
          onClick={() => setVerification((prev) => (prev === "yes" ? "" : "yes"))}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          active={status === "pending"}
          onClick={() => setStatus((prev) => (prev === "pending" ? "" : "pending"))}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          active={status === "approved"}
          onClick={() => setStatus((prev) => (prev === "approved" ? "" : "approved"))}
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          active={status === "rejected"}
          onClick={() => setStatus((prev) => (prev === "rejected" ? "" : "rejected"))}
        />
        <StatCard label="Avg rating" value={stats.avg ? `${stats.avg.toFixed(1)} ★` : "—"} />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card/40 p-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reviewer, product, title, content…"
          className="h-9 w-full sm:w-64"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as "" | "customer" | "sample")}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Sources</option>
          <option value="customer">Customer reviews</option>
          <option value="sample">Sample content</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | ReviewStatus)}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Statuses</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REVIEW_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={verification}
          onChange={(e) => setVerification(e.target.value as "" | "yes" | "no")}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Verification</option>
          <option value="yes">Verified Buyer</option>
          <option value="no">Unverified</option>
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} Star{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="h-9 max-w-[200px] rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Products</option>
          {(optionsQ.data?.products ?? []).map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
          >
            <FilterX className="mr-1.5 h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </div>

      {/* Add / Edit Review Modal / Form */}
      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveM.mutate(form);
          }}
          className="rounded-2xl border border-primary/30 bg-card p-5 shadow-lg animate-in fade-in-50 duration-200"
        >
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-bold">
              {form.reviewId ? "Edit Product Review" : "Add New Product Review"}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForm(null)}
              className="h-8 w-8 rounded-full p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-semibold">
              Target Product <span className="text-destructive">*</span>
              <select
                required
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a product</option>
                {(optionsQ.data?.products ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold">
              Linked Customer Profile (Optional)
              <select
                value={form.userId}
                onChange={(e) => {
                  const uid = e.target.value;
                  const selectedCustomer = (optionsQ.data?.customers ?? []).find(
                    (c: any) => c.id === uid,
                  );
                  setForm({
                    ...form,
                    userId: uid,
                    authorName:
                      form.authorName ||
                      selectedCustomer?.full_name ||
                      selectedCustomer?.email?.split("@")[0] ||
                      "",
                  });
                }}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Guest / Unlinked</option>
                {(optionsQ.data?.customers ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name ? `${c.full_name} (${c.email})` : c.email || c.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold">
              Reviewer / Display Name <span className="text-destructive">*</span>
              <Input
                className="mt-1.5 h-9"
                placeholder="e.g. Rahul Sharma"
                required
                maxLength={100}
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold">
              Star Rating <span className="text-destructive">*</span>
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <StarPicker
                value={form.rating}
                onChange={(v) => setForm({ ...form, rating: v })}
                disabled={saveM.isPending}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {form.rating} of 5 Stars
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="text-xs font-semibold">
              Review Headline / Title
              <Input
                className="mt-1 h-9"
                placeholder="Brief summary headline (e.g. Incredible print quality and heavy cotton)"
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>

            <label className="text-xs font-semibold">
              Detailed Review Text <span className="text-destructive">*</span>
              <Textarea
                className="mt-1 min-h-24 text-sm"
                placeholder="Customer review feedback…"
                required
                maxLength={2000}
                value={form.review}
                onChange={(e) => setForm({ ...form, review: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-semibold">
              Content Source Tag
              <select
                value={form.isSample ? "sample" : "customer"}
                onChange={(e) => setForm({ ...form, isSample: e.target.value === "sample" })}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="customer">Genuine Customer Review</option>
                <option value="sample">Sample Content (Labelled)</option>
              </select>
            </label>

            <label className="text-xs font-semibold">
              Moderation Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ReviewStatus })}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {REVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REVIEW_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-xs font-semibold">
              <span>Verified Purchase Status</span>
              <div className="mt-1.5 flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-xs">
                {form.verifiedPurchase ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-500">
                    <ShieldCheck className="h-4 w-4" /> Verified Buyer
                  </span>
                ) : (
                  <span className="text-muted-foreground">Unverified Buyer</span>
                )}
              </div>
            </div>
          </div>

          <label className="mt-4 block text-xs font-semibold">
            Internal Staff / Audit Note (Optional)
            <Input
              className="mt-1.5 h-9"
              placeholder="Internal moderation notes or customer order reference…"
              maxLength={500}
              value={form.adminNote}
              onChange={(e) => setForm({ ...form, adminNote: e.target.value })}
            />
          </label>

          {/* Attached Images */}
          <div className="mt-4">
            <p className="text-xs font-semibold">Customer Photo Attachments</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {form.images.map((p) => (
                <div key={p} className="relative h-16 w-16 overflow-hidden rounded-lg border shadow-xs">
                  <img src={reviewImageUrl(p)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, images: form.images.filter((x) => x !== p) })}
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 shadow-xs hover:bg-destructive hover:text-white transition-colors"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {form.images.length < MAX_REVIEW_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:border-foreground transition-colors cursor-pointer"
                  aria-label="Add photo"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4" />
                      <span className="text-[10px] mt-1">Upload</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => onPick(e.target.files)}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 border-t pt-4">
            <Button type="submit" disabled={saveM.isPending || uploading} className="rounded-md">
              {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.reviewId ? "Save Changes" : "Create Review"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(null)} className="rounded-md">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Main Content Area */}
      {listQ.isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border bg-card/40 p-4 flex flex-wrap items-start gap-4 shadow-xs"
            >
              <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-36 rounded" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-48 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3.5 w-1/2 rounded" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : listQ.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <h3 className="mt-2 text-base font-semibold text-destructive">
            Failed to load reviews from database
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {listQ.error instanceof Error ? listQ.error.message : "Database connection or network issue."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => listQ.refetch()}
            className="mt-4 rounded-full"
          >
            <RotateCw className="mr-1.5 h-3.5 w-3.5" /> Retry Request
          </Button>
        </div>
      ) : all.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/30 p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-semibold">No reviews in database</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            There are currently no reviews recorded in the database.
          </p>
          <Button
            onClick={() => setForm({ ...emptyForm })}
            className="mt-4 rounded-full bg-primary"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add first review
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/30 p-10 text-center">
          <FilterX className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <h3 className="mt-2 text-sm font-semibold">No reviews match your filters</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search keywords, status, source, or star rating filter.
          </p>
          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 rounded-full">
            Reset all filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {pagedRows.map((r) => {
              const isUpdatingThis = updatingId === r.id;
              const currentNote = notes[r.id] ?? r.admin_note ?? "";
              const hasNoteChanged = currentNote !== (r.admin_note ?? "");

              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-border shadow-xs"
                >
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Product Thumbnail / Fallback */}
                    {img(r.product?.image) ? (
                      <img
                        src={img(r.product?.image)!}
                        alt=""
                        className="h-16 w-16 rounded-lg border object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted/40 shrink-0 text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                    )}

                    {/* Review Body */}
                    <div className="min-w-0 flex-1">
                      {/* Title Bar & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold tracking-tight text-foreground">
                          {r.product?.name ?? `Product (${r.product_id})`}
                        </span>

                        {r.product?.slug && (
                          <a
                            href={`/product/${r.product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            title="Open live product page in new tab"
                          >
                            View on store <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        {r.product?.isDeleted && (
                          <span className="rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-bold text-destructive">
                            Deleted Product Record
                          </span>
                        )}

                        {r.is_sample ? (
                          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                            Sample Content
                          </span>
                        ) : (
                          <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                            Customer Review
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            REVIEW_STATUS_TONE[r.status] ?? "bg-muted text-muted-foreground"
                          }`}
                        >
                          {REVIEW_STATUS_LABEL[r.status] || r.status}
                        </span>

                        {r.verified_purchase ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            <ShieldCheck className="h-3 w-3" /> Verified Buyer
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Unverified
                          </span>
                        )}
                      </div>

                      {/* Author & Order Meta */}
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {r.author_name || r.customer_name || "Customer"}
                        </span>
                        {r.customer_email ? ` (${r.customer_email})` : ""} · {dateTime(r.created_at)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Order: {r.order_id ? `#${r.order_id.slice(0, 8)}` : "Direct / Guest"} · User ID:{" "}
                        {r.user_id ? `${r.user_id.slice(0, 8)}…` : "Not linked"} · ID: {r.id}
                      </p>

                      {/* Stars & Text */}
                      <Stars value={r.rating} className="mt-2" />
                      {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
                      {r.review && (
                        <p className="mt-1 whitespace-pre-line text-sm text-foreground/90 leading-relaxed">
                          {r.review}
                        </p>
                      )}

                      {/* Images */}
                      {r.images.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.images.map((p) => (
                            <a
                              key={p}
                              href={reviewImageUrl(p)}
                              target="_blank"
                              rel="noreferrer"
                              className="h-16 w-16 overflow-hidden rounded-lg border hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={reviewImageUrl(p)}
                                alt="Review attachment"
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                        {/* Internal Note Input */}
                        <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-[260px] flex-1">
                          <Input
                            value={currentNote}
                            onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                            placeholder="Internal note / audit remarks…"
                            className="h-8 text-xs"
                          />
                          {hasNoteChanged && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs shrink-0"
                              disabled={isUpdatingThis}
                              onClick={() =>
                                setStatusM.mutate({
                                  reviewId: r.id,
                                  adminNote: currentNote,
                                })
                              }
                            >
                              {isUpdatingThis ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Save Note"
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Edit Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(r)}
                          className="h-8 text-xs rounded-md"
                        >
                          Edit
                        </Button>

                        {/* Status Change Buttons */}
                        {(["approved", "rejected", "hidden", "pending"] as ReviewStatus[])
                          .filter((s) => s !== r.status)
                          .map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={s === "approved" ? "default" : "outline"}
                              disabled={isUpdatingThis}
                              className={`h-8 text-xs rounded-md ${
                                s === "approved"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : s === "rejected"
                                    ? "hover:bg-destructive/10 hover:text-destructive"
                                    : ""
                              }`}
                              onClick={() =>
                                setStatusM.mutate({
                                  reviewId: r.id,
                                  status: s,
                                  adminNote: notes[r.id] ?? r.admin_note ?? null,
                                })
                              }
                            >
                              {isUpdatingThis ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              {s === "pending"
                                ? "Restore to pending"
                                : s.charAt(0).toUpperCase() + s.slice(1)}
                            </Button>
                          ))}

                        {/* Delete Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={isUpdatingThis}
                          onClick={() => {
                            if (confirm(`Permanently delete review by "${r.author_name || "Customer"}"? This cannot be undone.`)) {
                              deleteM.mutate(r.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(page * PAGE_SIZE, rows.length)} of {rows.length} reviews
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <span className="px-2 text-xs font-medium tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
