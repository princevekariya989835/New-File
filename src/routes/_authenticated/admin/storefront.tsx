import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Store,
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
  ShoppingBag,
  Package,
  Mail,
  Search,
  Globe,
  RefreshCw,
} from "lucide-react";
import {
  getAdminWebsiteState,
  adminSaveWebsiteDraft,
  adminPublishWebsite,
  adminUndoLastPublish,
  adminDiscardDraft,
  adminRestoreSpecificVersion,
} from "@/lib/website-config.functions";
import { broadcastCatalogUpdate } from "@/lib/catalog-sync";
import { fetchProducts } from "@/lib/catalog";
import {
  type WebsiteConfig,
  type WebsiteVersion,
  DEFAULT_WEBSITE_CONFIG,
  type WebsiteSectionType,
} from "@/lib/website-config.types";
import { WebsiteHomepageContent } from "@/components/website-homepage-content";
import { AdminEraseDataButton } from "@/components/admin/admin-erase-dialog";
import { HeroMediaUploader } from "@/components/admin/hero-media-uploader";
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

export const Route = createFileRoute("/_authenticated/admin/storefront")({
  component: AdminStorefrontManagement,
  head: () => ({
    meta: [{ title: "Storefront CMS & Content Management | RIOTOUS Admin Console" }],
  }),
});

export function AdminStorefrontManagement() {
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
  const [activeTab, setActiveTab] = useState("homepage");

  // Dialog States
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishSummary, setPublishSummary] = useState("");
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [resetSectionTarget, setResetSectionTarget] = useState<string | null>(null);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [restoreVerTarget, setRestoreVerTarget] = useState<WebsiteVersion | null>(null);

  // Synchronize initial editor state when remote state loads
  useEffect(() => {
    if (stateData?.draft?.config && !editorConfig) {
      setEditorConfig(JSON.parse(JSON.stringify(stateData.draft.config)));
    }
  }, [stateData, editorConfig]);

  // Prevent accidental navigation with unsaved edits
  const hasLocalUnsavedChanges = useMemo(() => {
    if (!editorConfig || !stateData?.draft?.config) return false;
    return JSON.stringify(editorConfig) !== JSON.stringify(stateData.draft.config);
  }, [editorConfig, stateData?.draft?.config]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasLocalUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasLocalUnsavedChanges]);

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
      toast.success(res.message || "Storefront published successfully to live store.");
      setPublishDialogOpen(false);
      setPublishSummary("");
      broadcastCatalogUpdate({ type: "WEBSITE_CONFIG_UPDATED", timestamp: Date.now() });
      qc.invalidateQueries({ queryKey: ["admin-website-state"] });
      qc.invalidateQueries({ queryKey: ["website-config"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to publish storefront.");
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      return await undoFn();
    },
    onSuccess: (res) => {
      toast.success(res.message || "Previous storefront version restored.");
      setUndoDialogOpen(false);
      broadcastCatalogUpdate({ type: "WEBSITE_CONFIG_UPDATED", timestamp: Date.now() });
      qc.invalidateQueries({ queryKey: ["admin-website-state"] });
      qc.invalidateQueries({ queryKey: ["website-config"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
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
      toast.success(res.message || "Draft discarded. Restored to live published version.");
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
      toast.success(res.message || "Historical version restored to live.");
      setRestoreVerTarget(null);
      broadcastCatalogUpdate({ type: "WEBSITE_CONFIG_UPDATED", timestamp: Date.now() });
      qc.invalidateQueries({ queryKey: ["admin-website-state"] });
      qc.invalidateQueries({ queryKey: ["website-config"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to restore version.");
    },
  });

  // Reset to default handler for individual section
  const handleResetSection = (sectionKey: string) => {
    if (!editorConfig) return;
    const defaults = JSON.parse(JSON.stringify(DEFAULT_WEBSITE_CONFIG));
    let next = { ...editorConfig };

    switch (sectionKey) {
      case "hero":
        next.hero = defaults.hero;
        break;
      case "navigation":
        next.navigation = defaults.navigation;
        break;
      case "announcement":
        next.announcement = defaults.announcement;
        break;
      case "sections":
        next.sectionOrder = defaults.sectionOrder;
        next.collections = defaults.collections;
        next.featuredProducts = defaults.featuredProducts;
        next.whyUs = defaults.whyUs;
        next.promoBanner = defaults.promoBanner;
        next.reviewsSection = defaults.reviewsSection;
        break;
      case "footer":
        next.footer = defaults.footer;
        break;
      case "cart":
        next.cartContent = defaults.cartContent;
        break;
      case "shop":
        next.shopContent = defaults.shopContent;
        break;
      case "product":
        next.productContent = defaults.productContent;
        break;
      case "contact":
        next.contactContent = defaults.contactContent;
        break;
      case "seo":
        next.seo = defaults.seo;
        break;
      case "global":
        next.general = defaults.general;
        next.settings = defaults.settings;
        break;
      default:
        break;
    }

    setEditorConfig(next);
    setResetSectionTarget(null);
    toast.success(`Reset ${sectionKey} to default RIOTOUS content.`);
  };

  if (isLoading || !editorConfig) {
    return (
      <div className="flex min-h-[450px] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-red border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading Storefront CMS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-semibold">Failed to load storefront configuration</h3>
        </div>
        <p className="mt-2 text-sm text-destructive/80">{(error as any)?.message}</p>
      </div>
    );
  }

  const liveVerNum = stateData?.published?.versionNumber ?? 1;
  const prevVersion = stateData?.latestVersions?.find((v) => v.versionNumber < liveVerNum);

  // Safe animation settings accessor
  const heroAnim = editorConfig.hero.animationSettings || DEFAULT_WEBSITE_CONFIG.hero.animationSettings!;
  const cartContent = editorConfig.cartContent || DEFAULT_WEBSITE_CONFIG.cartContent!;
  const shopContent = editorConfig.shopContent || DEFAULT_WEBSITE_CONFIG.shopContent!;
  const productContent = editorConfig.productContent || DEFAULT_WEBSITE_CONFIG.productContent!;
  const contactContent = editorConfig.contactContent || DEFAULT_WEBSITE_CONFIG.contactContent!;

  return (
    <div className="space-y-6 pb-24">
      {/* Sticky Header Toolbar */}
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:-mx-8 border-b border-border/80 bg-background/95 px-4 sm:px-6 lg:px-8 py-4 backdrop-blur shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">Storefront CMS</h1>
                <p className="text-xs text-muted-foreground">
                  Control all visible customer storefront text, sections, navigation & UI labels without code changes.
                </p>
              </div>
            </div>

            {/* Version & Sync Status Badges */}
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

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <AdminEraseDataButton section="website" sectionLabel="Storefront CMS" />

            {/* Discard Draft */}
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

            {/* Undo Last Publish */}
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

            {/* Save Draft */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => saveDraftMutation.mutate()}
              disabled={saveDraftMutation.isPending || !hasLocalUnsavedChanges}
              className="text-xs"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
            </Button>

            {/* Publish to Live Store */}
            <Button
              size="sm"
              onClick={() => setPublishDialogOpen(true)}
              disabled={publishMutation.isPending}
              className="text-xs bg-brand-red hover:bg-brand-red/90 text-white font-semibold shadow-xs"
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Publish to Live Store
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-2">
          <TabsList className="h-11 w-full justify-start rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="homepage" className="rounded-lg text-xs font-medium gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Homepage
            </TabsTrigger>
            <TabsTrigger value="navigation" className="rounded-lg text-xs font-medium gap-1.5">
              <Menu className="h-3.5 w-3.5" />
              Navigation
            </TabsTrigger>
            <TabsTrigger value="announcement" className="rounded-lg text-xs font-medium gap-1.5">
              <Megaphone className="h-3.5 w-3.5" />
              Announcement Bar
            </TabsTrigger>
            <TabsTrigger value="sections" className="rounded-lg text-xs font-medium gap-1.5">
              <Layout className="h-3.5 w-3.5" />
              Sections
            </TabsTrigger>
            <TabsTrigger value="footer" className="rounded-lg text-xs font-medium gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Footer
            </TabsTrigger>
            <TabsTrigger value="cart" className="rounded-lg text-xs font-medium gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Cart
            </TabsTrigger>
            <TabsTrigger value="shop" className="rounded-lg text-xs font-medium gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Shop
            </TabsTrigger>
            <TabsTrigger value="product" className="rounded-lg text-xs font-medium gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Product Pages
            </TabsTrigger>
            <TabsTrigger value="contact" className="rounded-lg text-xs font-medium gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="seo" className="rounded-lg text-xs font-medium gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="global" className="rounded-lg text-xs font-medium gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Global Settings
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="rounded-lg text-xs font-semibold gap-1.5 bg-brand-red/10 text-brand-red data-[state=active]:bg-brand-red data-[state=active]:text-white"
            >
              <Eye className="h-3.5 w-3.5" />
              Live Preview
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs font-medium gap-1.5">
              <History className="h-3.5 w-3.5" />
              Version History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. HOMEPAGE TAB */}
        <TabsContent value="homepage" className="space-y-6">
          {/* Hero Content Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Hero Text & Action Buttons</h3>
                <p className="text-xs text-muted-foreground">
                  Controls the primary headline, description, eyebrow badge, and call-to-action buttons.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetSection("hero")}
                  className="text-xs"
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Reset to Default
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="hero-active" className="text-xs font-semibold">Active</Label>
                  <Switch
                    id="hero-active"
                    checked={Boolean(editorConfig.hero.active ?? editorConfig.hero.enabled ?? true)}
                    onCheckedChange={(val) =>
                      setEditorConfig({
                        ...editorConfig,
                        hero: { ...editorConfig.hero, active: val, enabled: val },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hero-badge">Eyebrow / Badge Text</Label>
                <Input
                  id="hero-badge"
                  value={editorConfig.hero.badge || ""}
                  placeholder="NEW COLLECTION 2026"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, badge: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-heading">Hero Headline</Label>
                <Input
                  id="hero-heading"
                  value={editorConfig.hero.heading || ""}
                  placeholder="WEAR YOUR ATTITUDE."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: { ...editorConfig.hero, heading: e.target.value },
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Displayed as the primary bold brand statement on the landing hero.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-desc">Hero Subtitle / Description</Label>
              <Textarea
                id="hero-desc"
                rows={3}
                value={editorConfig.hero.description || editorConfig.hero.subheading || ""}
                placeholder="Premium streetwear designed for people who refuse to blend in."
                onChange={(e) =>
                  setEditorConfig({
                    ...editorConfig,
                    hero: {
                      ...editorConfig.hero,
                      description: e.target.value,
                      subheading: e.target.value,
                    },
                  })
                }
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2 border-t border-border pt-4">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary Button
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="hero-btn1-text">Button Text</Label>
                  <Input
                    id="hero-btn1-text"
                    value={editorConfig.hero.primaryCtaText || ""}
                    placeholder="SHOP NOW"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        hero: { ...editorConfig.hero, primaryCtaText: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-btn1-link">Button Link</Label>
                  <Input
                    id="hero-btn1-link"
                    value={editorConfig.hero.primaryCtaLink || ""}
                    placeholder="/shop"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        hero: { ...editorConfig.hero, primaryCtaLink: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="hero-btn1-vis"
                    checked={heroAnim.primaryButtonVisible ?? true}
                    onCheckedChange={(val) =>
                      setEditorConfig({
                        ...editorConfig,
                        hero: {
                          ...editorConfig.hero,
                          animationSettings: { ...heroAnim, primaryButtonVisible: val },
                        },
                      })
                    }
                  />
                  <Label htmlFor="hero-btn1-vis" className="text-xs">Show Primary Button</Label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Secondary Button
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="hero-btn2-text">Button Text</Label>
                  <Input
                    id="hero-btn2-text"
                    value={editorConfig.hero.secondaryCtaText || ""}
                    placeholder="CUSTOMIZE IN 3D"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        hero: { ...editorConfig.hero, secondaryCtaText: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-btn2-link">Button Link</Label>
                  <Input
                    id="hero-btn2-link"
                    value={editorConfig.hero.secondaryCtaLink || ""}
                    placeholder="/design"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        hero: { ...editorConfig.hero, secondaryCtaLink: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="hero-btn2-vis"
                    checked={heroAnim.secondaryButtonVisible ?? true}
                    onCheckedChange={(val) =>
                      setEditorConfig({
                        ...editorConfig,
                        hero: {
                          ...editorConfig.hero,
                          animationSettings: { ...heroAnim, secondaryButtonVisible: val },
                        },
                      })
                    }
                  />
                  <Label htmlFor="hero-btn2-vis" className="text-xs">Show Secondary Button</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Hero 3D T-Shirt Animation Settings */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Hero 3D T-Shirt Animation Controls</h3>
                <p className="text-xs text-muted-foreground">
                  Fine-tune the dynamic 3D streaming T-shirt corridor without touching source code.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="anim-enabled" className="text-xs font-semibold">Enable 3D Animation</Label>
                <Switch
                  id="anim-enabled"
                  checked={heroAnim.enabled ?? true}
                  onCheckedChange={(val) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: { ...heroAnim, enabled: val },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {/* Animation Speed */}
              <div className="space-y-2">
                <Label htmlFor="anim-speed">Animation Speed</Label>
                <select
                  id="anim-speed"
                  value={heroAnim.speed || "normal"}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: {
                          ...heroAnim,
                          speed: e.target.value as "slow" | "normal" | "fast",
                        },
                      },
                    })
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <option value="slow">Slow (Smooth & Cinematic · 26s)</option>
                  <option value="normal">Normal (Default · 18s)</option>
                  <option value="fast">Fast (High Energy · 12s)</option>
                </select>
              </div>

              {/* Animation Direction */}
              <div className="space-y-2">
                <Label htmlFor="anim-dir">Stream Direction</Label>
                <select
                  id="anim-dir"
                  value={heroAnim.direction || "normal"}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: {
                          ...heroAnim,
                          direction: e.target.value as "normal" | "reverse",
                        },
                      },
                    })
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <option value="normal">Forward Stream (Towards Viewer)</option>
                  <option value="reverse">Reverse Stream (Inward)</option>
                </select>
              </div>

              {/* Animation Scale */}
              <div className="space-y-2">
                <Label htmlFor="anim-scale">Corridor Scale</Label>
                <select
                  id="anim-scale"
                  value={heroAnim.scale || 1}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: {
                          ...heroAnim,
                          scale: parseFloat(e.target.value),
                        },
                      },
                    })
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <option value="0.85">Compact (85%)</option>
                  <option value="1">Standard (100%)</option>
                  <option value="1.15">Expansive (115%)</option>
                </select>
              </div>

              {/* T-Shirt Count */}
              <div className="space-y-2">
                <Label htmlFor="anim-count">Number of T-Shirts</Label>
                <select
                  id="anim-count"
                  value={heroAnim.tshirtCount || 12}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: {
                          ...heroAnim,
                          tshirtCount: parseInt(e.target.value, 10),
                        },
                      },
                    })
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <option value="6">6 T-Shirts (Lightweight)</option>
                  <option value="12">12 T-Shirts (Balanced)</option>
                  <option value="18">18 T-Shirts (Dense Stream)</option>
                </select>
              </div>

              {/* Text Alignment */}
              <div className="space-y-2">
                <Label htmlFor="anim-align">Text Alignment</Label>
                <select
                  id="anim-align"
                  value={heroAnim.textAlignment || "center"}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: {
                          ...heroAnim,
                          textAlignment: e.target.value as "left" | "center" | "right",
                        },
                      },
                    })
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <option value="center">Centered (Default)</option>
                  <option value="left">Left Aligned</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>

              {/* Text Position */}
              <div className="space-y-2">
                <Label htmlFor="anim-pos">Text Position</Label>
                <select
                  id="anim-pos"
                  value={heroAnim.textPosition || "center"}
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: {
                          ...heroAnim,
                          textPosition: e.target.value as "top" | "center" | "bottom",
                        },
                      },
                    })
                  }
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <option value="center">Centered (Default)</option>
                  <option value="top">Upper Corridor</option>
                  <option value="bottom">Lower Corridor</option>
                </select>
              </div>
            </div>

            {/* Device Toggles */}
            <div className="flex flex-wrap items-center gap-6 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="anim-desk"
                  checked={heroAnim.desktopEnabled ?? true}
                  onCheckedChange={(val) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: { ...heroAnim, desktopEnabled: val },
                      },
                    })
                  }
                />
                <Label htmlFor="anim-desk" className="text-xs font-medium">Desktop Animation Active</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="anim-mob"
                  checked={heroAnim.mobileEnabled ?? true}
                  onCheckedChange={(val) =>
                    setEditorConfig({
                      ...editorConfig,
                      hero: {
                        ...editorConfig.hero,
                        animationSettings: { ...heroAnim, mobileEnabled: val },
                      },
                    })
                  }
                />
                <Label htmlFor="anim-mob" className="text-xs font-medium">Mobile Animation Active</Label>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. NAVIGATION TAB */}
        <TabsContent value="navigation" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Header Navigation Menu</h3>
                <p className="text-xs text-muted-foreground">
                  Control menu links, reorder items, or add new navigation destinations.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetSection("navigation")}
                  className="text-xs"
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Reset to Default
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const newId = `nav_${Date.now()}`;
                    setEditorConfig({
                      ...editorConfig,
                      navigation: [
                        ...editorConfig.navigation,
                        { id: newId, label: "New Link", to: "/shop", enabled: true },
                      ],
                    });
                  }}
                  className="text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Menu Item
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {editorConfig.navigation.map((item, index) => (
                <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2 flex-1">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Label</Label>
                        <Input
                          value={item.label}
                          onChange={(e) => {
                            const next = [...editorConfig.navigation];
                            next[index] = { ...item, label: e.target.value };
                            setEditorConfig({ ...editorConfig, navigation: next });
                          }}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">URL / Path</Label>
                        <Input
                          value={item.to}
                          onChange={(e) => {
                            const next = [...editorConfig.navigation];
                            next[index] = { ...item, to: e.target.value };
                            setEditorConfig({ ...editorConfig, navigation: next });
                          }}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...editorConfig.navigation];
                          const temp = next[index - 1];
                          next[index - 1] = next[index];
                          next[index] = temp;
                          setEditorConfig({ ...editorConfig, navigation: next });
                        }}
                        className="h-8 w-8"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === editorConfig.navigation.length - 1}
                        onClick={() => {
                          const next = [...editorConfig.navigation];
                          const temp = next[index + 1];
                          next[index + 1] = next[index];
                          next[index] = temp;
                          setEditorConfig({ ...editorConfig, navigation: next });
                        }}
                        className="h-8 w-8"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5 px-2">
                      <Switch
                        checked={item.enabled !== false}
                        onCheckedChange={(val) => {
                          const next = [...editorConfig.navigation];
                          next[index] = { ...item, enabled: val };
                          setEditorConfig({ ...editorConfig, navigation: next });
                        }}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {item.enabled !== false ? "Visible" : "Hidden"}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const next = editorConfig.navigation.filter((_, i) => i !== index);
                        setEditorConfig({ ...editorConfig, navigation: next });
                      }}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 3. ANNOUNCEMENT BAR TAB */}
        <TabsContent value="announcement" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Announcement Bar Manager</h3>
                <p className="text-xs text-muted-foreground">
                  Controls the marquee top bar across the storefront for sales, promo codes, and alerts.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetSection("announcement")}
                  className="text-xs"
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Reset to Default
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="ann-enable" className="text-xs font-semibold">Enabled</Label>
                  <Switch
                    id="ann-enable"
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
            </div>

            {/* Live Preview Bar */}
            <div
              className="rounded-xl px-4 py-2 text-center text-xs font-medium tracking-wide shadow-xs transition-colors"
              style={{
                backgroundColor: editorConfig.announcement.backgroundColor || "#e11d48",
                color: editorConfig.announcement.textColor || "#ffffff",
              }}
            >
              {editorConfig.announcement.text || "Preview announcement message"}
              {editorConfig.announcement.linkText && (
                <span className="ml-2 underline cursor-pointer">
                  {editorConfig.announcement.linkText} →
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ann-text">Announcement Text</Label>
                <Input
                  id="ann-text"
                  value={editorConfig.announcement.text}
                  placeholder="FREE SHIPPING ON ALL ORDERS OVER ₹1499 · USE CODE RIOT10 FOR 10% OFF"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      announcement: { ...editorConfig.announcement, text: e.target.value },
                    })
                  }
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ann-link-text">Call to Action Link Text</Label>
                  <Input
                    id="ann-link-text"
                    value={editorConfig.announcement.linkText || ""}
                    placeholder="Shop Drop"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        announcement: { ...editorConfig.announcement, linkText: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ann-link-url">Target URL</Label>
                  <Input
                    id="ann-link-url"
                    value={editorConfig.announcement.link || ""}
                    placeholder="/shop"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        announcement: { ...editorConfig.announcement, link: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label htmlFor="ann-bg">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="ann-bg"
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
                      className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <Input
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
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ann-fg">Text Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="ann-fg"
                      value={editorConfig.announcement.textColor || "#ffffff"}
                      onChange={(e) =>
                        setEditorConfig({
                          ...editorConfig,
                          announcement: {
                            ...editorConfig.announcement,
                            textColor: e.target.value,
                          },
                        })
                      }
                      className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <Input
                      value={editorConfig.announcement.textColor || "#ffffff"}
                      onChange={(e) =>
                        setEditorConfig({
                          ...editorConfig,
                          announcement: {
                            ...editorConfig.announcement,
                            textColor: e.target.value,
                          },
                        })
                      }
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 4. HOMEPAGE SECTIONS TAB */}
        <TabsContent value="sections" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Homepage Section Ordering & Content</h3>
                <p className="text-xs text-muted-foreground">
                  Reorder sections, toggle visibility, and customize headlines, descriptions, and CTA links.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetSection("sections")}
                className="text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reset to Default
              </Button>
            </div>

            <div className="space-y-4">
              {editorConfig.sectionOrder?.sections?.map((sec, idx) => (
                <div key={sec.id} className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-sm">{sec.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => {
                          const next = [...editorConfig.sectionOrder.sections];
                          const temp = next[idx - 1];
                          next[idx - 1] = next[idx];
                          next[idx] = temp;
                          setEditorConfig({
                            ...editorConfig,
                            sectionOrder: { sections: next },
                          });
                        }}
                        className="h-8 w-8"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === editorConfig.sectionOrder.sections.length - 1}
                        onClick={() => {
                          const next = [...editorConfig.sectionOrder.sections];
                          const temp = next[idx + 1];
                          next[idx + 1] = next[idx];
                          next[idx] = temp;
                          setEditorConfig({
                            ...editorConfig,
                            sectionOrder: { sections: next },
                          });
                        }}
                        className="h-8 w-8"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <div className="flex items-center gap-1.5 pl-2">
                        <Switch
                          checked={sec.enabled}
                          onCheckedChange={(val) => {
                            const next = [...editorConfig.sectionOrder.sections];
                            next[idx] = { ...sec, enabled: val };
                            setEditorConfig({
                              ...editorConfig,
                              sectionOrder: { sections: next },
                            });
                          }}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {sec.enabled ? "Visible" : "Hidden"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section-specific detailed fields */}
                  {sec.id === "featuredProducts" && (
                    <div className="grid gap-3 pt-2 sm:grid-cols-2 border-t border-border/50">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Section Title</Label>
                        <Input
                          value={editorConfig.featuredProducts.title || ""}
                          placeholder="Featured."
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              featuredProducts: {
                                ...editorConfig.featuredProducts,
                                title: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Section Subtitle</Label>
                        <Input
                          value={editorConfig.featuredProducts.subtitle || ""}
                          placeholder="Handpicked drops from our latest release."
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              featuredProducts: {
                                ...editorConfig.featuredProducts,
                                subtitle: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {sec.id === "promoBanner" && (
                    <div className="grid gap-3 pt-2 sm:grid-cols-3 border-t border-border/50">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Banner Title</Label>
                        <Input
                          value={editorConfig.promoBanner.title || ""}
                          placeholder="Your art. Our shirt."
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              promoBanner: {
                                ...editorConfig.promoBanner,
                                title: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Button Text</Label>
                        <Input
                          value={editorConfig.promoBanner.buttonText || ""}
                          placeholder="Open the Studio"
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              promoBanner: {
                                ...editorConfig.promoBanner,
                                buttonText: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Button Link</Label>
                        <Input
                          value={editorConfig.promoBanner.buttonLink || ""}
                          placeholder="/design"
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              promoBanner: {
                                ...editorConfig.promoBanner,
                                buttonLink: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {sec.id === "whyUs" && (
                    <div className="grid gap-3 pt-2 sm:grid-cols-2 border-t border-border/50">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Badge Text</Label>
                        <Input
                          value={editorConfig.whyUs.badge || ""}
                          placeholder="Why RIOTOUS"
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              whyUs: { ...editorConfig.whyUs, badge: e.target.value },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Section Title</Label>
                        <Input
                          value={editorConfig.whyUs.title || ""}
                          placeholder="Built for the ones who create."
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              whyUs: { ...editorConfig.whyUs, title: e.target.value },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {sec.id === "reviews" && (
                    <div className="grid gap-3 pt-2 sm:grid-cols-2 border-t border-border/50">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Badge Text</Label>
                        <Input
                          value={editorConfig.reviewsSection.badge || ""}
                          placeholder="Reviews"
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              reviewsSection: {
                                ...editorConfig.reviewsSection,
                                badge: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Section Title</Label>
                        <Input
                          value={editorConfig.reviewsSection.title || ""}
                          placeholder="Straight from the community."
                          onChange={(e) =>
                            setEditorConfig({
                              ...editorConfig,
                              reviewsSection: {
                                ...editorConfig.reviewsSection,
                                title: e.target.value,
                              },
                            })
                          }
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 5. FOOTER TAB */}
        <TabsContent value="footer" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Footer Content & Social Links</h3>
                <p className="text-xs text-muted-foreground">
                  Manage About text, copyright notice, legal policies, and official social channels.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetSection("footer")}
                className="text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reset to Default
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="foot-heading">Footer Heading</Label>
                <Input
                  id="foot-heading"
                  value={editorConfig.footer.heading || ""}
                  placeholder="Wear the print."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      footer: { ...editorConfig.footer, heading: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="foot-sub">Footer Subheading</Label>
                <Input
                  id="foot-sub"
                  value={editorConfig.footer.subheading || ""}
                  placeholder="Not the trend."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      footer: { ...editorConfig.footer, subheading: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foot-tagline">About RIOTOUS Brand Statement</Label>
              <Textarea
                id="foot-tagline"
                rows={3}
                value={editorConfig.footer.brandTagline || ""}
                placeholder="RIOTOUS creates heavyweight, DTF-printed streetwear made in India. Built for creators, artists, and culture shifters."
                onChange={(e) =>
                  setEditorConfig({
                    ...editorConfig,
                    footer: { ...editorConfig.footer, brandTagline: e.target.value },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foot-copy">Copyright Notice</Label>
              <Input
                id="foot-copy"
                value={editorConfig.footer.copyrightText || ""}
                placeholder="© 2026 RIOTOUS. All rights reserved."
                onChange={(e) =>
                  setEditorConfig({
                    ...editorConfig,
                    footer: { ...editorConfig.footer, copyrightText: e.target.value },
                  })
                }
              />
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="text-sm font-semibold">Social Channel URLs</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="soc-ig" className="text-xs">Instagram URL</Label>
                  <Input
                    id="soc-ig"
                    value={editorConfig.footer.socialLinks?.instagram || ""}
                    placeholder="https://instagram.com/riotous"
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
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="soc-fb" className="text-xs">Facebook URL</Label>
                  <Input
                    id="soc-fb"
                    value={editorConfig.footer.socialLinks?.facebook || ""}
                    placeholder="https://facebook.com/riotous"
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
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="soc-yt" className="text-xs">YouTube URL</Label>
                  <Input
                    id="soc-yt"
                    value={editorConfig.footer.socialLinks?.youtube || ""}
                    placeholder="https://youtube.com/@riotous"
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
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="soc-wa" className="text-xs">WhatsApp Support URL</Label>
                  <Input
                    id="soc-wa"
                    value={editorConfig.footer.socialLinks?.whatsapp || ""}
                    placeholder="https://wa.me/919876543210"
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
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 6. CART TAB */}
        <TabsContent value="cart" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Cart Drawer & Bag Text</h3>
                <p className="text-xs text-muted-foreground">
                  Customize the text displayed in the sliding shopping bag and checkout drawer.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetSection("cart")}
                className="text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reset to Default
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cart-heading">Cart Heading</Label>
                <Input
                  id="cart-heading"
                  value={cartContent.heading}
                  placeholder="Your bag"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      cartContent: { ...cartContent, heading: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cart-empty-msg">Empty Bag Message</Label>
                <Input
                  id="cart-empty-msg"
                  value={cartContent.emptyMessage}
                  placeholder="Your bag is empty."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      cartContent: { ...cartContent, emptyMessage: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cart-empty-sub">Empty Bag Submessage</Label>
                <Input
                  id="cart-empty-sub"
                  value={cartContent.emptySubmessage}
                  placeholder="Nothing here yet."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      cartContent: { ...cartContent, emptySubmessage: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cart-cont-shop">Continue Shopping Text</Label>
                <Input
                  id="cart-cont-shop"
                  value={cartContent.continueShoppingText}
                  placeholder="Continue Shopping"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      cartContent: { ...cartContent, continueShoppingText: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cart-checkout-btn">Checkout Button Text</Label>
                <Input
                  id="cart-checkout-btn"
                  value={cartContent.checkoutButtonText}
                  placeholder="Checkout"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      cartContent: { ...cartContent, checkoutButtonText: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cart-subtotal-lbl">Subtotal Label</Label>
                <Input
                  id="cart-subtotal-lbl"
                  value={cartContent.subtotalLabel}
                  placeholder="Subtotal"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      cartContent: { ...cartContent, subtotalLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cart-free-ship">Free Shipping Threshold Message</Label>
                <Input
                  id="cart-free-ship"
                  value={cartContent.freeShippingMessage}
                  placeholder="Free shipping on orders over ₹1499"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      cartContent: { ...cartContent, freeShippingMessage: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cart-remove-lbl">Remove Item Label</Label>
                <Input
                  id="cart-remove-lbl"
                  value={cartContent.removeText}
                  placeholder="Remove"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      cartContent: { ...cartContent, removeText: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 7. SHOP TAB */}
        <TabsContent value="shop" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Shop Page Content & Filter Labels</h3>
                <p className="text-xs text-muted-foreground">
                  Manage the collection title, description, filter text, and empty search messages on /shop.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetSection("shop")}
                className="text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reset to Default
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shop-title">Shop Page Title</Label>
                <Input
                  id="shop-title"
                  value={shopContent.pageTitle}
                  placeholder="The full collection."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      shopContent: { ...shopContent, pageTitle: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shop-desc">Shop Page Description</Label>
                <Input
                  id="shop-desc"
                  value={shopContent.pageDescription}
                  placeholder="Heavyweight DTF printed streetwear crafted in India."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      shopContent: { ...shopContent, pageDescription: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shop-filter-lbl">Filter Label</Label>
                <Input
                  id="shop-filter-lbl"
                  value={shopContent.filterLabel}
                  placeholder="Filter"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      shopContent: { ...shopContent, filterLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shop-sort-lbl">Sort Label</Label>
                <Input
                  id="shop-sort-lbl"
                  value={shopContent.sortLabel}
                  placeholder="Sort by"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      shopContent: { ...shopContent, sortLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shop-all-lbl">All Products Tab Label</Label>
                <Input
                  id="shop-all-lbl"
                  value={shopContent.allProductsLabel}
                  placeholder="All Products"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      shopContent: { ...shopContent, allProductsLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shop-no-prod">No Products Found Message</Label>
                <Input
                  id="shop-no-prod"
                  value={shopContent.noProductsFoundText}
                  placeholder="No products found matching your criteria."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      shopContent: { ...shopContent, noProductsFoundText: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 8. PRODUCT PAGES TAB */}
        <TabsContent value="product" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Product Page UI Labels</h3>
                <p className="text-xs text-muted-foreground">
                  Global text labels for single product pages (/product/$handle). Individual product details remain managed in Products.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetSection("product")}
                className="text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reset to Default
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prod-add-btn">Add to Cart Button Text</Label>
                <Input
                  id="prod-add-btn"
                  value={productContent.addToCartLabel}
                  placeholder="Add to Bag"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      productContent: { ...productContent, addToCartLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-buy-btn">Buy Now Button Text</Label>
                <Input
                  id="prod-buy-btn"
                  value={productContent.buyNowLabel}
                  placeholder="Buy Now"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      productContent: { ...productContent, buyNowLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-size-lbl">Select Size Label</Label>
                <Input
                  id="prod-size-lbl"
                  value={productContent.selectSizeLabel}
                  placeholder="Select Size"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      productContent: { ...productContent, selectSizeLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-guide-lbl">Size Guide Modal Title</Label>
                <Input
                  id="prod-guide-lbl"
                  value={productContent.sizeGuideLabel}
                  placeholder="Oversized Fit Size Guide"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      productContent: { ...productContent, sizeGuideLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-qty-lbl">Quantity Label</Label>
                <Input
                  id="prod-qty-lbl"
                  value={productContent.quantityLabel}
                  placeholder="Quantity"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      productContent: { ...productContent, quantityLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-sold-lbl">Out of Stock / Sold Out Label</Label>
                <Input
                  id="prod-sold-lbl"
                  value={productContent.outOfStockLabel}
                  placeholder="Sold out"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      productContent: { ...productContent, outOfStockLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-desc-lbl">Details / Description Tab Label</Label>
                <Input
                  id="prod-desc-lbl"
                  value={productContent.descriptionLabel}
                  placeholder="Details"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      productContent: { ...productContent, descriptionLabel: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prod-rel-lbl">Related Products Heading</Label>
                <Input
                  id="prod-rel-lbl"
                  value={productContent.relatedProductsLabel}
                  placeholder="You Might Also Like"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      productContent: { ...productContent, relatedProductsLabel: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 9. CONTACT TAB */}
        <TabsContent value="contact" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Contact Page Information</h3>
                <p className="text-xs text-muted-foreground">
                  Manage headline, support email, phone number, studio address, and operating hours on /contact.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetSection("contact")}
                className="text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reset to Default
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnt-title">Contact Page Title</Label>
                <Input
                  id="cnt-title"
                  value={contactContent.pageTitle}
                  placeholder="Say hi."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      contactContent: { ...contactContent, pageTitle: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnt-email">Support Email</Label>
                <Input
                  id="cnt-email"
                  value={contactContent.email}
                  placeholder="support@riotous.store"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      contactContent: { ...contactContent, email: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnt-desc">Description / Subtitle</Label>
              <Textarea
                id="cnt-desc"
                rows={2}
                value={contactContent.description}
                placeholder="Custom prints, wholesale, press, or you just want to nerd out about fabric — reach out."
                onChange={(e) =>
                  setEditorConfig({
                    ...editorConfig,
                    contactContent: { ...contactContent, description: e.target.value },
                  })
                }
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="cnt-phone">Phone Number</Label>
                <Input
                  id="cnt-phone"
                  value={contactContent.phone}
                  placeholder="+91 98765 43210"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      contactContent: { ...contactContent, phone: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnt-hours">Business / Studio Hours</Label>
                <Input
                  id="cnt-hours"
                  value={contactContent.businessHours}
                  placeholder="Mon — Sat · 10:00 — 19:00 IST"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      contactContent: { ...contactContent, businessHours: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnt-addr">Studio Address</Label>
                <Input
                  id="cnt-addr"
                  value={contactContent.address}
                  placeholder="Studio RIOTOUS, Surat, Gujarat, India"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      contactContent: { ...contactContent, address: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnt-ig">Instagram Handle</Label>
                <Input
                  id="cnt-ig"
                  value={contactContent.instagram}
                  placeholder="@riotous"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      contactContent: { ...contactContent, instagram: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 10. SEO TAB */}
        <TabsContent value="seo" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">SEO & Metadata Manager</h3>
                <p className="text-xs text-muted-foreground">
                  Manage search engine titles, meta descriptions, and Google Search Console verification.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetSection("seo")}
                className="text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reset to Default
              </Button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Homepage Metadata
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="seo-home-title">Homepage SEO Title</Label>
                  <Input
                    id="seo-home-title"
                    value={editorConfig.seo.homepageTitle || editorConfig.seo.metaTitle || ""}
                    placeholder="RIOTOUS — We Don't Follow Trends. We Print Them."
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        seo: {
                          ...editorConfig.seo,
                          homepageTitle: e.target.value,
                          metaTitle: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo-home-desc">Homepage Meta Description</Label>
                  <Textarea
                    id="seo-home-desc"
                    rows={2}
                    value={editorConfig.seo.homepageDescription || editorConfig.seo.metaDescription || ""}
                    placeholder="Premium DTF printed streetwear made in India."
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        seo: {
                          ...editorConfig.seo,
                          homepageDescription: e.target.value,
                          metaDescription: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 border-t border-border">
                Shop Page Metadata
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="seo-shop-title">Shop SEO Title</Label>
                  <Input
                    id="seo-shop-title"
                    value={editorConfig.seo.shopTitle || ""}
                    placeholder="Shop Oversized Streetwear & Graphic Tees | RIOTOUS"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        seo: { ...editorConfig.seo, shopTitle: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo-shop-desc">Shop Meta Description</Label>
                  <Textarea
                    id="seo-shop-desc"
                    rows={2}
                    value={editorConfig.seo.shopDescription || ""}
                    placeholder="Browse the full RIOTOUS collection. DTF printed tees, oversized fits, and limited drops."
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        seo: { ...editorConfig.seo, shopDescription: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4 border-t border-border">
                Social Sharing & Search Verification
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="seo-og-img">Default Open Graph Image URL</Label>
                  <Input
                    id="seo-og-img"
                    value={editorConfig.seo.ogImageUrl || ""}
                    placeholder="/assets/riotous-hero-graphic-clean.jpg"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        seo: { ...editorConfig.seo, ogImageUrl: e.target.value },
                      })
                    }
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo-gsc">Google Search Console Verification Tag</Label>
                  <Input
                    id="seo-gsc"
                    value={editorConfig.seo.googleSearchConsoleCode || ""}
                    placeholder="google-site-verification-code-here"
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        seo: { ...editorConfig.seo, googleSearchConsoleCode: e.target.value },
                      })
                    }
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 11. GLOBAL SETTINGS TAB */}
        <TabsContent value="global" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Global Store Settings</h3>
                <p className="text-xs text-muted-foreground">
                  Store name, currency, free shipping threshold, and maintenance mode controls.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetSection("global")}
                className="text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Reset to Default
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="glob-name">Store Name</Label>
                <Input
                  id="glob-name"
                  value={editorConfig.general.storeName}
                  placeholder="RIOTOUS"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: { ...editorConfig.general, storeName: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="glob-tagline">Store Tagline</Label>
                <Input
                  id="glob-tagline"
                  value={editorConfig.general.tagline || ""}
                  placeholder="We Don't Follow Trends. We Print Them."
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: { ...editorConfig.general, tagline: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="glob-cur">Currency Symbol</Label>
                <Input
                  id="glob-cur"
                  value={editorConfig.general.currencySymbol}
                  placeholder="₹"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: { ...editorConfig.general, currencySymbol: e.target.value },
                    })
                  }
                  className="w-24 font-mono text-center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="glob-thresh">Free Shipping Threshold (₹)</Label>
                <Input
                  id="glob-thresh"
                  type="number"
                  value={editorConfig.general.freeShippingThreshold}
                  placeholder="1499"
                  onChange={(e) =>
                    setEditorConfig({
                      ...editorConfig,
                      general: {
                        ...editorConfig.general,
                        freeShippingThreshold: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Store Maintenance Mode</h4>
                  <p className="text-xs text-muted-foreground">
                    When enabled, non-admin visitors see a maintenance screen.
                  </p>
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
                  <Label htmlFor="maint-msg">Maintenance Notice Message</Label>
                  <Textarea
                    id="maint-msg"
                    rows={2}
                    value={editorConfig.general.maintenanceMessage}
                    onChange={(e) =>
                      setEditorConfig({
                        ...editorConfig,
                        general: { ...editorConfig.general, maintenanceMessage: e.target.value },
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 12. LIVE PREVIEW TAB */}
        <TabsContent value="preview" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold">Real-Time Storefront Preview</h3>
                <p className="text-xs text-muted-foreground">
                  Simulate live customer view with your current editor configuration before publishing.
                </p>
              </div>

              {/* Viewport controls */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1">
                <Button
                  variant={previewViewport === "desktop" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewViewport("desktop")}
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </Button>
                <Button
                  variant={previewViewport === "tablet" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewViewport("tablet")}
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  <Tablet className="h-3.5 w-3.5" />
                  Tablet
                </Button>
                <Button
                  variant={previewViewport === "mobile" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewViewport("mobile")}
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </Button>
              </div>
            </div>

            {/* Container simulator */}
            <div className="flex justify-center bg-zinc-950/20 p-4 rounded-2xl overflow-hidden min-h-[600px]">
              <div
                className={`transition-all duration-300 overflow-x-hidden rounded-xl border border-border bg-background shadow-2xl ${
                  previewViewport === "mobile"
                    ? "w-[380px]"
                    : previewViewport === "tablet"
                      ? "w-[768px]"
                      : "w-full"
                }`}
              >
                <WebsiteHomepageContent
                  config={editorConfig}
                  products={catalogProducts || []}
                  isPreview={true}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 13. VERSION HISTORY TAB */}
        <TabsContent value="history" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold">Storefront Version History</h3>
              <p className="text-xs text-muted-foreground">
                Audit trail of all published storefront revisions. Restore any past version with 1-click rollback.
              </p>
            </div>

            {stateData?.latestVersions && stateData.latestVersions.length > 0 ? (
              <div className="divide-y divide-border">
                {stateData.latestVersions.map((ver) => (
                  <div key={ver.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">Version {ver.versionNumber}</span>
                        {ver.versionNumber === liveVerNum && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            CURRENT LIVE
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ver.changeSummary || "Routine storefront content update."}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        Published by {ver.publishedBy} ·{" "}
                        {new Date(ver.publishedAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {ver.versionNumber !== liveVerNum && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreVerTarget(ver)}
                        className="text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Rollback to Version {ver.versionNumber}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No past version history records found.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish Storefront to Live</DialogTitle>
            <DialogDescription>
              This will promote your current draft to the live storefront. Changes will immediately sync to all customers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="pub-summary">Change Summary (Optional)</Label>
            <Input
              id="pub-summary"
              value={publishSummary}
              onChange={(e) => setPublishSummary(e.target.value)}
              placeholder="e.g. Updated Summer sale announcement and hero headline"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="bg-brand-red text-white hover:bg-brand-red/90 font-semibold"
            >
              {publishMutation.isPending ? "Publishing..." : "Confirm & Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard Draft Changes?</DialogTitle>
            <DialogDescription>
              All unpublished edits made since the last publish will be erased and reset to match the current live store.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => discardMutation.mutate()}
              disabled={discardMutation.isPending}
            >
              {discardMutation.isPending ? "Discarding..." : "Discard Edits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo Last Publish Dialog */}
      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Undo Last Storefront Publish?</DialogTitle>
            <DialogDescription>
              This will restore the previous live storefront configuration (Version {prevVersion?.versionNumber}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => undoMutation.mutate()}
              disabled={undoMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {undoMutation.isPending ? "Restoring..." : "Confirm Rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historical Version Restore Dialog */}
      <Dialog open={Boolean(restoreVerTarget)} onOpenChange={() => setRestoreVerTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rollback to Version {restoreVerTarget?.versionNumber}?</DialogTitle>
            <DialogDescription>
              This will immediately replace the live storefront content with Version {restoreVerTarget?.versionNumber}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreVerTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (restoreVerTarget) {
                  restoreSpecificMutation.mutate(restoreVerTarget.id);
                }
              }}
              disabled={restoreSpecificMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {restoreSpecificMutation.isPending ? "Restoring..." : "Restore Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
