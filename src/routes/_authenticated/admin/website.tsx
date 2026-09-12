import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Globe,
  Save,
  Send,
  RotateCcw,
  Trash2,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  Sparkles,
  Layout,
  Menu,
  FileText,
  Settings,
  Megaphone,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Store,
} from "lucide-react";
import {
  getAdminWebsiteState,
  adminSaveWebsiteDraft,
  adminPublishWebsite,
  adminUndoLastPublish,
  adminDiscardDraft,
  adminRestoreSpecificVersion,
} from "@/lib/website-config.functions";
import { fetchProducts } from "@/lib/catalog";
import {
  type WebsiteConfig,
  type WebsiteVersion,
  DEFAULT_WEBSITE_CONFIG,
  type WebsiteSectionType,
} from "@/lib/website-config.types";
import { WebsiteHomepageContent } from "@/components/website-homepage-content";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/website")({
  component: AdminWebsiteManagement,
  head: () => ({
    meta: [{ title: "Website Management · RIOTOUS Admin" }],
  }),
});

function AdminWebsiteManagement() {
  const qc = useQueryClient();
  const getStateFn = useServerFn(getAdminWebsiteState);
  const saveDraftFn = useServerFn(adminSaveWebsiteDraft);
  const publishFn = useServerFn(adminPublishWebsite);
  const undoFn = useServerFn(adminUndoLastPublish);
  const discardFn = useServerFn(adminDiscardDraft);
  const restoreVerFn = useServerFn(adminRestoreSpecificVersion);

  // Queries
  const {
    data: stateData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-website-state"],
    queryFn: () => getStateFn(),
  });

  const { data: catalogProducts } = useQuery({
    queryKey: ["products", "catalog-all"],
    queryFn: () => fetchProducts(50),
  });

  // Local draft editor state
  const [editorConfig, setEditorConfig] = useState<WebsiteConfig | null>(null);
  const [activeTab, setActiveTab] = useState("hero");

  // Dialog States
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishSummary, setPublishSummary] = useState("");
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [restoreVerTarget, setRestoreVerTarget] = useState<WebsiteVersion | null>(null);

  // Synchronize initial editor state when remote state loads
  useEffect(() => {
    if (stateData?.draft?.config && !editorConfig) {
      setEditorConfig(JSON.parse(JSON.stringify(stateData.draft.config)));
    }
  }, [stateData, editorConfig]);

  // Track unsaved local edits vs saved remote draft
  const hasLocalUnsavedChanges = useMemo(() => {
    if (!editorConfig || !stateData?.draft?.config) return false;
    return JSON.stringify(editorConfig) !== JSON.stringify(stateData.draft.config);
  }, [editorConfig, stateData?.draft?.config]);

  // Track if saved draft differs from live published
  const draftDiffersFromLive = useMemo(() => {
    if (!stateData?.published?.config || !editorConfig) return false;
    return JSON.stringify(editorConfig) !== JSON.stringify(stateData.published.config);
  }, [editorConfig, stateData?.published?.config]);

  // Mutations
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!editorConfig) throw new Error("No config to save");
      return await saveDraftFn({ data: { config: editorConfig } });
    },
    onSuccess: (res) => {
      toast.success(res.message || "Draft saved successfully.");
      qc.invalidateQueries({ queryKey: ["admin-website-state"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save draft.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!editorConfig) throw new Error("No config to publish");
      return await publishFn({
        data: {
          changeSummary: publishSummary || undefined,
          directConfig: editorConfig,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || "Website published successfully.");
      setPublishDialogOpen(false);
      setPublishSummary("");
      qc.invalidateQueries({ queryKey: ["admin-website-state"] });
      qc.invalidateQueries({ queryKey: ["website-config"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to publish website.");
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      return await undoFn();
    },
    onSuccess: (res) => {
      toast.success(res.message || "Previous website version restored.");
      setUndoDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-website-state"] });
      qc.invalidateQueries({ queryKey: ["website-config"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to undo last publish.");
    },
  });

  const discardMutation = useMutation({
    mutationFn: async () => {
      return await discardFn();
    },
    onSuccess: (res) => {
      if (res.config) {
        setEditorConfig(JSON.parse(JSON.stringify(res.config)));
      }
      toast.success(res.message || "Draft discarded.");
      setDiscardDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-website-state"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to discard draft.");
    },
  });

  const restoreSpecificMutation = useMutation({
    mutationFn: async (versionId: string) => {
      return await restoreVerFn({ data: { versionId } });
    },
    onSuccess: (res) => {
      toast.success(res.message || "Version restored.");
      setRestoreVerTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-website-state"] });
      qc.invalidateQueries({ queryKey: ["website-config"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to restore version.");
    },
  });

  if (isLoading || !editorConfig) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-red border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading Website Management system...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-lg font-bold">Failed to load website configuration</h2>
        <p className="mt-2 text-sm text-muted-foreground">{(error as any)?.message}</p>
        <Button
          onClick={() => qc.invalidateQueries({ queryKey: ["admin-website-state"] })}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  const liveVerNum = stateData?.published?.versionNumber ?? 1;
  const prevVersion = stateData?.latestVersions?.find((v) => v.versionNumber < liveVerNum);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header & Action Controls Bar */}
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:-mx-8 border-b border-border/80 bg-background/95 px-4 sm:px-6 lg:px-8 py-4 backdrop-blur shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">Website Management</h1>
                <p className="text-xs text-muted-foreground">
                  Draft / Preview / Publish / Undo system · Customer website updates ONLY on publish
                </p>
              </div>
            </div>

            {/* Version & Status Badges */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE: Version {liveVerNum}
              </span>

              {hasLocalUnsavedChanges ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Unsaved changes in editor
                </span>
              ) : draftDiffersFromLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 font-medium text-blue-600 dark:text-blue-400">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Draft Saved (Unpublished)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-0.5 font-medium text-zinc-600 dark:text-zinc-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Draft matches live
                </span>
              )}

              {stateData?.published?.publishedAt && (
                <span className="text-muted-foreground">
                  Published:{" "}
                  {new Date(stateData.published.publishedAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Erase Section Data Button */}
            <AdminEraseDataButton section="website" />

            {/* Discard Draft Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiscardDialogOpen(true)}
              disabled={discardMutation.isPending || !draftDiffersFromLive}
              className="text-xs"
              title="Discard draft changes and reset to live published version"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Discard Draft
            </Button>

            {/* Undo Last Publish Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUndoDialogOpen(true)}
              disabled={undoMutation.isPending || !prevVersion}
              className="text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
              title={
                prevVersion
                  ? `Undo last publish (Restore Version ${prevVersion.versionNumber})`
                  : "No previous version available"
              }
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {undoMutation.isPending ? "Restoring..." : "Undo Last Publish"}
            </Button>

            {/* Save Draft Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => saveDraftMutation.mutate()}
              disabled={saveDraftMutation.isPending}
              className="text-xs font-semibold"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
            </Button>

            {/* Publish Website Button */}
            <Button
              size="sm"
              onClick={() => setPublishDialogOpen(true)}
              disabled={publishMutation.isPending}
              className="bg-brand-red text-xs font-bold text-white hover:bg-brand-red/90 shadow-sm"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {publishMutation.isPending ? "Publishing..." : "Publish Website"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-2">
          <TabsList className="h-11 w-full justify-start rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="hero" className="rounded-lg text-xs font-medium gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Hero
            </TabsTrigger>
            <TabsTrigger value="featured" className="rounded-lg text-xs font-medium gap-1.5">
              <Layout className="h-3.5 w-3.5" />
              Featured Products
            </TabsTrigger>
            <TabsTrigger value="collections" className="rounded-lg text-xs font-medium gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="promo" className="rounded-lg text-xs font-medium gap-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              Banners & CTA
            </TabsTrigger>
            <TabsTrigger value="announcement" className="rounded-lg text-xs font-medium gap-1.5">
              <Sliders className="h-3.5 w-3.5" />
              Announcement Bar
            </TabsTrigger>
            <TabsTrigger value="navigation" className="rounded-lg text-xs font-medium gap-1.5">
              <Menu className="h-3.5 w-3.5" />
              Navigation
            </TabsTrigger>
            <TabsTrigger value="footer" className="rounded-lg text-xs font-medium gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Footer & Socials
            </TabsTrigger>
            <TabsTrigger value="sections" className="rounded-lg text-xs font-medium gap-1.5">
              <ArrowUp className="h-3.5 w-3.5" />
              Section Order
            </TabsTrigger>
            <TabsTrigger value="seo" className="rounded-lg text-xs font-medium gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg text-xs font-medium gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Website Settings
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="rounded-lg text-xs font-semibold gap-1.5 bg-brand-red/10 text-brand-red data-[state=active]:bg-brand-red data-[state=active]:text-white"
            >
              <Eye className="h-3.5 w-3.5" />
              Real Preview
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs font-medium gap-1.5">
              <History className="h-3.5 w-3.5" />
              Version History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. HERO TAB */}
        <TabsContent value="hero" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Hero Section Management</h3>
                <p className="text-xs text-muted-foreground">
                  Controls the primary landing hero, headline, video/image media, and action
                  buttons.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="hero-active" className="text-xs font-semibold">
                  Active
                </Label>
                <Switch
                  id="hero-active"
                  checked={editorConfig.hero.active}
                  onCheckedChange={(val) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, active: val },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hero-badge">Eyebrow / Badge Text</Label>
                <Input
                  id="hero-badge"
                  value={editorConfig.hero.badge}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, badge: e.target.value },
                    })
                  }
                  placeholder="e.g. Premium DTF apparel · Made in India"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-align">Text Alignment</Label>
                <select
                  id="hero-align"
                  value={editorConfig.hero.alignment}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, alignment: e.target.value as any },
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Centered</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="hero-heading">Main Heading (Line breaks supported)</Label>
                <Textarea
                  id="hero-heading"
                  rows={2}
                  value={editorConfig.hero.heading}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, heading: e.target.value },
                    })
                  }
                  placeholder="We Don't Follow Trends.&#10;We Print Them."
                  className="font-bold text-lg"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="hero-desc">Description Body</Label>
                <Textarea
                  id="hero-desc"
                  rows={3}
                  value={editorConfig.hero.description}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, description: e.target.value },
                    })
                  }
                  placeholder="Premium DTF printed apparel made for creators..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-primary-text">Primary CTA Button Text</Label>
                <Input
                  id="hero-primary-text"
                  value={editorConfig.hero.primaryCtaText}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, primaryCtaText: e.target.value },
                    })
                  }
                  placeholder="Shop Now"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-primary-link">Primary CTA Link</Label>
                <Input
                  id="hero-primary-link"
                  value={editorConfig.hero.primaryCtaLink}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, primaryCtaLink: e.target.value },
                    })
                  }
                  placeholder="/shop"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-secondary-text">Secondary CTA Button Text</Label>
                <Input
                  id="hero-secondary-text"
                  value={editorConfig.hero.secondaryCtaText}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, secondaryCtaText: e.target.value },
                    })
                  }
                  placeholder="Design Your Own"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-secondary-link">Secondary CTA Link</Label>
                <Input
                  id="hero-secondary-link"
                  value={editorConfig.hero.secondaryCtaLink}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, secondaryCtaLink: e.target.value },
                    })
                  }
                  placeholder="/design"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-media-type">Background Media Type</Label>
                <select
                  id="hero-media-type"
                  value={editorConfig.hero.mediaType}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, mediaType: e.target.value as any },
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="video">Hero Video (Preserves Video Animation)</option>
                  <option value="image">Static Background Image</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-media-url">
                  {editorConfig.hero.mediaType === "video" ? "Video URL" : "Image URL"}
                </Label>
                <Input
                  id="hero-media-url"
                  value={
                    editorConfig.hero.mediaType === "video"
                      ? editorConfig.hero.videoUrl
                      : editorConfig.hero.imageUrl
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (editorConfig.hero.mediaType === "video") {
                      setEditorConfig({
                        ...editorConfig,
                        hero: { ...editorConfig.hero, videoUrl: val },
                      });
                    } else {
                      setEditorConfig({
                        ...editorConfig,
                        hero: { ...editorConfig.hero, imageUrl: val },
                      });
                    }
                  }}
                  placeholder={
                    editorConfig.hero.mediaType === "video"
                      ? "/videos/riotus-hero.mp4"
                      : "/assets/hero-bg.jpg"
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. FEATURED PRODUCTS TAB */}
        <TabsContent value="featured" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Featured Products Grid</h3>
                <p className="text-xs text-muted-foreground">
                  Select which products to showcase on the homepage, or leave empty for newest.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="feat-active" className="text-xs font-semibold">
                  Enabled
                </Label>
                <Switch
                  id="feat-active"
                  checked={editorConfig.featuredProducts.enabled}
                  onCheckedChange={(val) =>
                    setEditorConfig({
                      ...editorConfig,
                      featuredProducts: { ...editorConfig.featuredProducts, enabled: val },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feat-title">Section Heading</Label>
                <Input
                  id="feat-title"
                  value={editorConfig.featuredProducts.title}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      featuredProducts: { ...editorConfig.featuredProducts, title: e.target.value },
                    })
                  }
                  placeholder="Featured."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feat-limit">Max Products Display Limit</Label>
                <Input
                  id="feat-limit"
                  type="number"
                  min={1}
                  max={24}
                  value={editorConfig.featuredProducts.limit}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      featuredProducts: {
                        ...editorConfig.featuredProducts,
                        limit: Number(e.target.value) || 8,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="feat-sub">Section Subtitle</Label>
                <Input
                  id="feat-sub"
                  value={editorConfig.featuredProducts.subtitle}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      featuredProducts: {
                        ...editorConfig.featuredProducts,
                        subtitle: e.target.value,
                      },
                    })
                  }
                  placeholder="Handpicked drops from our latest release."
                />
              </div>
            </div>

            {/* Product Selector Picker */}
            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-sm font-semibold">
                Curate Featured Products ({editorConfig.featuredProducts.productIds.length}{" "}
                Selected)
              </Label>
              <p className="text-xs text-muted-foreground">
                Click any product to toggle its inclusion in the featured section. If none are
                selected, the latest drops will be automatically shown.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-80 overflow-y-auto p-2 border border-border rounded-xl bg-muted/20">
                {(catalogProducts || []).map((p) => {
                  const isSelected =
                    editorConfig.featuredProducts.productIds.includes(p.node.id) ||
                    editorConfig.featuredProducts.productIds.includes(p.node.productId);
                  const imgUrl = p.node.images.edges[0]?.node.url;

                  return (
                    <button
                      key={p.node.id}
                      type="button"
                      onClick={() => {
                        const current = editorConfig.featuredProducts.productIds;
                        const id = p.node.id;
                        const next = isSelected
                          ? current.filter((x) => x !== id && x !== p.node.productId)
                          : [...current, id];
                        setEditorConfig({
                          ...editorConfig,
                          featuredProducts: { ...editorConfig.featuredProducts, productIds: next },
                        });
                      }}
                      className={`relative flex flex-col items-center p-2 rounded-lg border text-left text-xs transition-all ${
                        isSelected
                          ? "border-brand-red bg-brand-red/10 ring-1 ring-brand-red"
                          : "border-border bg-card hover:border-foreground/40"
                      }`}
                    >
                      <div className="aspect-square w-full rounded bg-muted/60 overflow-hidden mb-1.5 flex items-center justify-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={p.node.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-semibold line-clamp-1 w-full">{p.node.title}</p>
                      <p className="text-[10px] text-muted-foreground w-full">
                        ₹{p.node.priceRange.minVariantPrice.amount}
                      </p>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-brand-red text-white rounded-full p-0.5 shadow">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. COLLECTIONS TAB */}
        <TabsContent value="collections" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Homepage Collection Cards</h3>
                <p className="text-xs text-muted-foreground">
                  Configure visual category cards shown on the homepage grid.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newCol = {
                    id: `col_${Date.now()}`,
                    title: "New Collection",
                    tag: "Featured Drop",
                    link: "/shop",
                    bgColor: "bg-brand-red",
                    enabled: true,
                  };
                  setEditorConfig({
                    ...editorConfig,
                    collections: [...editorConfig.collections, newCol],
                  });
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Collection Card
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {editorConfig.collections.map((col, idx) => (
                <div
                  key={col.id}
                  className="rounded-xl border border-border bg-background p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
                      Card #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`col-en-${col.id}`} className="text-xs">
                        Enabled
                      </Label>
                      <Switch
                        id={`col-en-${col.id}`}
                        checked={col.enabled}
                        onCheckedChange={(val) => {
                          const updated = [...editorConfig.collections];
                          updated[idx].enabled = val;
                          setEditorConfig({ ...editorConfig, collections: updated });
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          const updated = editorConfig.collections.filter((_, i) => i !== idx);
                          setEditorConfig({ ...editorConfig, collections: updated });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={col.title}
                        onChange={(e) => {
                          const updated = [...editorConfig.collections];
                          updated[idx].title = e.target.value;
                          setEditorConfig({ ...editorConfig, collections: updated });
                        }}
                        placeholder="DTF Printed Tees"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Tag / Eyebrow</Label>
                      <Input
                        value={col.tag}
                        onChange={(e) => {
                          const updated = [...editorConfig.collections];
                          updated[idx].tag = e.target.value;
                          setEditorConfig({ ...editorConfig, collections: updated });
                        }}
                        placeholder="Signature"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Destination Link</Label>
                      <Input
                        value={col.link}
                        onChange={(e) => {
                          const updated = [...editorConfig.collections];
                          updated[idx].link = e.target.value;
                          setEditorConfig({ ...editorConfig, collections: updated });
                        }}
                        placeholder="/shop"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Image URL (Optional)</Label>
                      <Input
                        value={col.imageUrl || ""}
                        onChange={(e) => {
                          const updated = [...editorConfig.collections];
                          updated[idx].imageUrl = e.target.value;
                          setEditorConfig({ ...editorConfig, collections: updated });
                        }}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 4. PROMOTIONAL BANNER & CTA TAB */}
        <TabsContent value="promo" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Design Studio CTA & Promotional Banners</h3>
                <p className="text-xs text-muted-foreground">
                  Custom call-to-action banner shown before footer.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="promo-en" className="text-xs font-semibold">
                  Enabled
                </Label>
                <Switch
                  id="promo-en"
                  checked={editorConfig.promoBanner.enabled}
                  onCheckedChange={(val) =>
                    setEditorConfig({
                      ...editorConfig,
                      promoBanner: { ...editorConfig.promoBanner, enabled: val },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promo-status">Banner Status</Label>
                <select
                  id="promo-status"
                  value={editorConfig.promoBanner.status}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      promoBanner: { ...editorConfig.promoBanner, status: e.target.value as any },
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active (Visible)</option>
                  <option value="draft">Draft (Admin Only)</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-badge">Badge / Eyebrow</Label>
                <Input
                  id="promo-badge"
                  value={editorConfig.promoBanner.badge}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      promoBanner: { ...editorConfig.promoBanner, badge: e.target.value },
                    })
                  }
                  placeholder="Design Studio"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="promo-title">Headline</Label>
                <Input
                  id="promo-title"
                  value={editorConfig.promoBanner.title}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      promoBanner: { ...editorConfig.promoBanner, title: e.target.value },
                    })
                  }
                  placeholder="Your art. Our shirt. Zero limits."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="promo-desc">Description</Label>
                <Textarea
                  id="promo-desc"
                  rows={2}
                  value={editorConfig.promoBanner.description}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      promoBanner: { ...editorConfig.promoBanner, description: e.target.value },
                    })
                  }
                  placeholder="Upload artwork, add text, place it front, back or sleeve..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-btn-txt">Button Label</Label>
                <Input
                  id="promo-btn-txt"
                  value={editorConfig.promoBanner.buttonText}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      promoBanner: { ...editorConfig.promoBanner, buttonText: e.target.value },
                    })
                  }
                  placeholder="Open the Studio"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-btn-lnk">Button Link</Label>
                <Input
                  id="promo-btn-lnk"
                  value={editorConfig.promoBanner.buttonLink}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      promoBanner: { ...editorConfig.promoBanner, buttonLink: e.target.value },
                    })
                  }
                  placeholder="/design"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. ANNOUNCEMENT BAR TAB */}
        <TabsContent value="announcement" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Top Announcement Bar</h3>
                <p className="text-xs text-muted-foreground">
                  A high-visibility banner across the very top of the page for flash sales, coupon
                  codes, and shipping updates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="ann-en" className="text-xs font-semibold">
                  Enabled
                </Label>
                <Switch
                  id="ann-en"
                  checked={editorConfig.announcement.enabled}
                  onCheckedChange={(val) =>
                    setEditorConfig({
                      ...editorConfig,
                      announcement: { ...editorConfig.announcement, enabled: val },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ann-text">Announcement Message</Label>
                <Input
                  id="ann-text"
                  value={editorConfig.announcement.text}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      announcement: { ...editorConfig.announcement, text: e.target.value },
                    })
                  }
                  placeholder="🔥 FREE SHIPPING ON ALL ORDERS OVER ₹1499 · USE CODE RIOT10 FOR 10% OFF 🔥"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-link">CTA Destination Link</Label>
                <Input
                  id="ann-link"
                  value={editorConfig.announcement.link}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      announcement: { ...editorConfig.announcement, link: e.target.value },
                    })
                  }
                  placeholder="/shop"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-link-txt">CTA Link Text</Label>
                <Input
                  id="ann-link-txt"
                  value={editorConfig.announcement.linkText}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      announcement: { ...editorConfig.announcement, linkText: e.target.value },
                    })
                  }
                  placeholder="Shop Drop"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-bg">Background Color (Hex)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="ann-bg-picker"
                    value={editorConfig.announcement.backgroundColor || "#e11d48"}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        announcement: {
                          ...editorConfig.announcement,
                          backgroundColor: e.target.value,
                        },
                      })
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-border p-1"
                  />
                  <Input
                    id="ann-bg"
                    value={editorConfig.announcement.backgroundColor}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        announcement: {
                          ...editorConfig.announcement,
                          backgroundColor: e.target.value,
                        },
                      })
                    }
                    placeholder="#e11d48"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ann-txt-color">Text Color (Hex)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="ann-txt-picker"
                    value={editorConfig.announcement.textColor || "#ffffff"}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        announcement: { ...editorConfig.announcement, textColor: e.target.value },
                      })
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-border p-1"
                  />
                  <Input
                    id="ann-txt-color"
                    value={editorConfig.announcement.textColor}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        announcement: { ...editorConfig.announcement, textColor: e.target.value },
                      })
                    }
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 6. NAVIGATION MENU TAB */}
        <TabsContent value="navigation" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Header Navigation Menu</h3>
                <p className="text-xs text-muted-foreground">
                  Customize the links displayed in the customer header navigation bar.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newNav = {
                    id: `nav_${Date.now()}`,
                    label: "New Link",
                    to: "/shop",
                    enabled: true,
                  };
                  setEditorConfig({
                    ...editorConfig,
                    navigation: [...editorConfig.navigation, newNav],
                  });
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Nav Item
              </Button>
            </div>

            <div className="space-y-3">
              {editorConfig.navigation.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {idx + 1}
                    </span>
                    <Input
                      value={item.label}
                      onChange={(e) => {
                        const updated = [...editorConfig.navigation];
                        updated[idx].label = e.target.value;
                        setEditorConfig({ ...editorConfig, navigation: updated });
                      }}
                      placeholder="Label (e.g. Shop)"
                      className="w-full sm:w-44"
                    />
                  </div>

                  <Input
                    value={item.to}
                    onChange={(e) => {
                      const updated = [...editorConfig.navigation];
                      updated[idx].to = e.target.value;
                      setEditorConfig({ ...editorConfig, navigation: updated });
                    }}
                    placeholder="Route (e.g. /shop)"
                    className="flex-1"
                  />

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor={`nav-en-${item.id}`} className="text-xs">
                        Enabled
                      </Label>
                      <Switch
                        id={`nav-en-${item.id}`}
                        checked={item.enabled}
                        onCheckedChange={(val) => {
                          const updated = [...editorConfig.navigation];
                          updated[idx].enabled = val;
                          setEditorConfig({ ...editorConfig, navigation: updated });
                        }}
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        const updated = editorConfig.navigation.filter((_, i) => i !== idx);
                        setEditorConfig({ ...editorConfig, navigation: updated });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 7. FOOTER & SOCIALS TAB */}
        <TabsContent value="footer" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold">Footer & Social Links</h3>
              <p className="text-xs text-muted-foreground">
                Manage footer tagline, newsletter options, social media URLs, and link columns.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="foot-heading">Footer Heading</Label>
                <Input
                  id="foot-heading"
                  value={editorConfig.footer.heading}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      footer: { ...editorConfig.footer, heading: e.target.value },
                    })
                  }
                  placeholder="Wear the print. Not the trend."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="foot-sub">Footer Subtitle</Label>
                <Input
                  id="foot-sub"
                  value={editorConfig.footer.subheading}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      footer: { ...editorConfig.footer, subheading: e.target.value },
                    })
                  }
                  placeholder="Join our streetwear community for secret drops..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="foot-copy">Copyright Notice</Label>
                <Input
                  id="foot-copy"
                  value={editorConfig.footer.copyrightText}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      footer: { ...editorConfig.footer, copyrightText: e.target.value },
                    })
                  }
                  placeholder="Made in India. All rights reserved."
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold">Social Media Handles & Links</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Instagram URL</Label>
                  <Input
                    value={editorConfig.footer.socialLinks.instagram}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        footer: {
                          ...editorConfig.footer,
                          socialLinks: {
                            ...editorConfig.footer.socialLinks,
                            instagram: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://instagram.com/riotous"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">YouTube URL</Label>
                  <Input
                    value={editorConfig.footer.socialLinks.youtube}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        footer: {
                          ...editorConfig.footer,
                          socialLinks: {
                            ...editorConfig.footer.socialLinks,
                            youtube: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://youtube.com/@riotous"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Facebook URL</Label>
                  <Input
                    value={editorConfig.footer.socialLinks.facebook}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        footer: {
                          ...editorConfig.footer,
                          socialLinks: {
                            ...editorConfig.footer.socialLinks,
                            facebook: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://facebook.com/riotous"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp Contact URL</Label>
                  <Input
                    value={editorConfig.footer.socialLinks.whatsapp}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        footer: {
                          ...editorConfig.footer,
                          socialLinks: {
                            ...editorConfig.footer.socialLinks,
                            whatsapp: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://wa.me/919876543210"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 8. HOMEPAGE SECTION ORDER TAB */}
        <TabsContent value="sections" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold">Homepage Section Layout & Ordering</h3>
              <p className="text-xs text-muted-foreground">
                Reorder or toggle visibility of top-level sections on the homepage.
              </p>
            </div>

            <div className="space-y-3">
              {editorConfig.sectionOrder.sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{sec.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                        Key: {sec.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 mr-4">
                      <Label htmlFor={`sec-en-${sec.id}`} className="text-xs font-medium">
                        Visible
                      </Label>
                      <Switch
                        id={`sec-en-${sec.id}`}
                        checked={sec.enabled}
                        onCheckedChange={(val) => {
                          const updated = [...editorConfig.sectionOrder.sections];
                          updated[idx].enabled = val;
                          setEditorConfig({
                            ...editorConfig,
                            sectionOrder: { sections: updated },
                          });
                        }}
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={idx === 0}
                      onClick={() => {
                        const updated = [...editorConfig.sectionOrder.sections];
                        const temp = updated[idx - 1];
                        updated[idx - 1] = updated[idx];
                        updated[idx] = temp;
                        setEditorConfig({
                          ...editorConfig,
                          sectionOrder: { sections: updated },
                        });
                      }}
                      title="Move section up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={idx === editorConfig.sectionOrder.sections.length - 1}
                      onClick={() => {
                        const updated = [...editorConfig.sectionOrder.sections];
                        const temp = updated[idx + 1];
                        updated[idx + 1] = updated[idx];
                        updated[idx] = temp;
                        setEditorConfig({
                          ...editorConfig,
                          sectionOrder: { sections: updated },
                        });
                      }}
                      title="Move section down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 9. SEO TAB */}
        <TabsContent value="seo" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold">
                Search Engine Optimization (SEO) & Social Graph
              </h3>
              <p className="text-xs text-muted-foreground">
                Set meta tags and search crawler attributes. Follows the same draft/publish
                lifecycle.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="seo-title">Meta Title</Label>
                <Input
                  id="seo-title"
                  value={editorConfig.seo.metaTitle}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      seo: { ...editorConfig.seo, metaTitle: e.target.value },
                    })
                  }
                  placeholder="RIOTOUS — We Don't Follow Trends. We Print Them."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="seo-desc">Meta Description</Label>
                <Textarea
                  id="seo-desc"
                  rows={3}
                  value={editorConfig.seo.metaDescription}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      seo: { ...editorConfig.seo, metaDescription: e.target.value },
                    })
                  }
                  placeholder="Premium DTF printed streetwear made in India..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo-og-title">OpenGraph Title</Label>
                <Input
                  id="seo-og-title"
                  value={editorConfig.seo.ogTitle}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      seo: { ...editorConfig.seo, ogTitle: e.target.value },
                    })
                  }
                  placeholder="RIOTOUS — Premium DTF Streetwear"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo-canon">Canonical URL</Label>
                <Input
                  id="seo-canon"
                  value={editorConfig.seo.canonicalUrl}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      seo: { ...editorConfig.seo, canonicalUrl: e.target.value },
                    })
                  }
                  placeholder="https://riotous.store"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 10. WEBSITE SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold">General Store Settings</h3>
              <p className="text-xs text-muted-foreground">
                Store-wide preferences, contact information, and maintenance mode controls.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="set-store-name">Store Name</Label>
                <Input
                  id="set-store-name"
                  value={editorConfig.general.storeName}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: { ...editorConfig.general, storeName: e.target.value },
                    })
                  }
                  placeholder="RIOTOUS"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="set-curr">Currency Symbol</Label>
                <Input
                  id="set-curr"
                  value={editorConfig.general.currencySymbol}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: { ...editorConfig.general, currencySymbol: e.target.value },
                    })
                  }
                  placeholder="₹"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="set-email">Support Contact Email</Label>
                <Input
                  id="set-email"
                  type="email"
                  value={editorConfig.general.contactEmail}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: { ...editorConfig.general, contactEmail: e.target.value },
                    })
                  }
                  placeholder="support@riotous.store"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="set-phone">Support Contact Phone</Label>
                <Input
                  id="set-phone"
                  value={editorConfig.general.contactPhone}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: { ...editorConfig.general, contactPhone: e.target.value },
                    })
                  }
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="set-free-ship">Free Shipping Threshold (₹)</Label>
                <Input
                  id="set-free-ship"
                  type="number"
                  value={editorConfig.general.freeShippingThreshold}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: {
                        ...editorConfig.general,
                        freeShippingThreshold: Number(e.target.value) || 1499,
                      },
                    })
                  }
                  placeholder="1499"
                />
              </div>

              {/* Maintenance Mode with Security Notice */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-bold">Store Maintenance Mode</p>
                      <p className="text-xs text-muted-foreground">
                        When enabled, non-admin customers see a maintenance placeholder.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={editorConfig.general.maintenanceMode}
                    onCheckedChange={(val) =>
                      setEditorConfig({
                        ...editorConfig,
                        general: { ...editorConfig.general, maintenanceMode: val },
                      })
                    }
                  />
                </div>

                {editorConfig.general.maintenanceMode && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="set-maint-msg">Maintenance Message</Label>
                    <Input
                      id="set-maint-msg"
                      value={editorConfig.general.maintenanceMessage}
                      onChange={(e) =>
                        setEditorConfig({
                          ...editorConfig,
                          general: { ...editorConfig.general, maintenanceMessage: e.target.value },
                        })
                      }
                      placeholder="We are currently updating our store with new drops..."
                    />
                    <p className="text-[11px] text-amber-600 font-medium">
                      Note: Maintenance mode will only take effect on the live website after
                      clicking "Publish Website".
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 11. REAL LIVE PREVIEW TAB */}
        <TabsContent value="preview" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Eye className="h-4 w-4 text-brand-red" />
                  Real Frontend Component Preview (Using Draft Configuration)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Renders the authentic storefront components using your current working draft. Live
                  customer site remains untouched.
                </p>
              </div>

              {/* Viewport Width Controls */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
                <Button
                  size="sm"
                  variant={previewViewport === "desktop" ? "default" : "ghost"}
                  onClick={() => setPreviewViewport("desktop")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </Button>
                <Button
                  size="sm"
                  variant={previewViewport === "tablet" ? "default" : "ghost"}
                  onClick={() => setPreviewViewport("tablet")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Tablet className="h-3.5 w-3.5" />
                  Tablet
                </Button>
                <Button
                  size="sm"
                  variant={previewViewport === "mobile" ? "default" : "ghost"}
                  onClick={() => setPreviewViewport("mobile")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </Button>
              </div>
            </div>

            {/* Preview Frame Canvas */}
            <div className="flex justify-center bg-zinc-950 p-2 sm:p-6 rounded-2xl overflow-x-auto min-h-[650px]">
              <div
                style={{
                  width:
                    previewViewport === "mobile"
                      ? "375px"
                      : previewViewport === "tablet"
                        ? "768px"
                        : "100%",
                  transition: "width 0.3s ease-in-out",
                }}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-background shadow-2xl"
              >
                {/* Simulated Header in Preview */}
                <div className="bg-black/90 py-3 px-6 text-white text-xs flex items-center justify-between border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="font-bold tracking-wider">
                      {editorConfig.general.storeName} PREVIEW
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Mode: Draft Simulation ({previewViewport})
                  </div>
                </div>

                <div className="max-h-[800px] overflow-y-auto">
                  <WebsiteHomepageContent
                    config={editorConfig}
                    products={catalogProducts || []}
                    isPreview={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 12. VERSION HISTORY TAB */}
        <TabsContent value="history" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold">Website Version History & Audit Trail</h3>
              <p className="text-xs text-muted-foreground">
                Every published website version is archived permanently. You can restore any past
                version at any time.
              </p>
            </div>

            <div className="space-y-3">
              {(stateData.latestVersions || []).map((ver) => {
                const isCurrentLive = ver.versionNumber === liveVerNum;

                return (
                  <div
                    key={ver.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                      isCurrentLive
                        ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                        : "border-border bg-background hover:border-foreground/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">Version {ver.versionNumber}</span>
                        {isCurrentLive ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            CURRENT LIVE
                          </span>
                        ) : ver.status === "restored" ? (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                            Restoration Snapshot
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Published by{" "}
                        <span className="font-semibold text-foreground">{ver.publishedBy}</span> on{" "}
                        {new Date(ver.publishedAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {ver.changeSummary && (
                        <p className="mt-1 text-xs italic text-foreground/80">
                          “{ver.changeSummary}”
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {!isCurrentLive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRestoreVerTarget(ver)}
                          className="text-xs"
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Restore Version {ver.versionNumber}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* CONFIRMATION DIALOG: PUBLISH WEBSITE */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-brand-red" />
              Publish Website to Live?
            </DialogTitle>
            <DialogDescription className="text-sm">
              Your current draft configuration will immediately become live for all customers on the
              storefront.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Live Version:</span>
                <span className="font-bold">Version {liveVerNum}</span>
              </div>
              <div className="flex justify-between text-brand-red">
                <span>New Published Version:</span>
                <span className="font-bold">Version {liveVerNum + 1}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="publish-sum" className="text-xs">
                Optional Change Summary / Note
              </Label>
              <Input
                id="publish-sum"
                value={publishSummary}
                onChange={(e) => setPublishSummary(e.target.value)}
                placeholder="e.g. Updated hero banner for festive drop"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
              disabled={publishMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="bg-brand-red text-white hover:bg-brand-red/90 font-bold"
            >
              {publishMutation.isPending ? "Publishing..." : "Confirm & Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: UNDO LAST PUBLISH */}
      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-amber-600">
              <RotateCcw className="h-5 w-5" />
              Undo Last Publish?
            </DialogTitle>
            <DialogDescription className="text-sm">
              This will restore the customer-facing website to the previous published version while
              preserving full version history.
            </DialogDescription>
          </DialogHeader>

          {prevVersion && (
            <div className="rounded-xl bg-amber-500/10 p-3 text-xs space-y-1.5 border border-amber-500/20">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Live Version:</span>
                <span className="font-bold">Version {liveVerNum}</span>
              </div>
              <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold">
                <span>Restore To:</span>
                <span>Version {prevVersion.versionNumber}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUndoDialogOpen(false)}
              disabled={undoMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => undoMutation.mutate()}
              disabled={undoMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700 font-bold"
            >
              {undoMutation.isPending ? "Restoring..." : "Restore Previous Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: DISCARD DRAFT */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-destructive">
              <Trash2 className="h-5 w-5" />
              Discard Unpublished Draft?
            </DialogTitle>
            <DialogDescription className="text-sm">
              This will throw away all unpublished changes in your draft and reset the editor to the
              current live published version.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDiscardDialogOpen(false)}
              disabled={discardMutation.isPending}
            >
              Keep Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => discardMutation.mutate()}
              disabled={discardMutation.isPending}
              className="font-bold"
            >
              {discardMutation.isPending ? "Discarding..." : "Discard Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: RESTORE SPECIFIC VERSION */}
      {restoreVerTarget && (
        <Dialog open={!!restoreVerTarget} onOpenChange={(o) => !o && setRestoreVerTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <RotateCcw className="h-5 w-5 text-brand-red" />
                Restore Version {restoreVerTarget.versionNumber}?
              </DialogTitle>
              <DialogDescription className="text-sm">
                This will promote the snapshot of Version {restoreVerTarget.versionNumber} to live
                and create a new audited version record.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRestoreVerTarget(null)}
                disabled={restoreSpecificMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => restoreSpecificMutation.mutate(restoreVerTarget.id)}
                disabled={restoreSpecificMutation.isPending}
                className="bg-brand-red text-white hover:bg-brand-red/90 font-bold"
              >
                {restoreSpecificMutation.isPending
                  ? "Restoring..."
                  : `Restore Version ${restoreVerTarget.versionNumber}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
