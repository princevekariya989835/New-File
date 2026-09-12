import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  Play,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  uploadHeroMedia,
  validateHeroMediaFile,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_VIDEO_EXTENSIONS,
} from "@/lib/hero-media";
import type { WebsiteHeroConfig } from "@/lib/website-config.types";

interface HeroMediaUploaderProps {
  hero: WebsiteHeroConfig;
  onChange: (updatedHero: Partial<WebsiteHeroConfig>) => void;
  disabled?: boolean;
}

export function HeroMediaUploader({ hero, onChange, disabled }: HeroMediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const isVideo =
    hero.mediaType === "video"
      ? Boolean(hero.videoUrl || (hero.mediaUrl && hero.mediaType === "video"))
      : Boolean(hero.videoUrl && !hero.imageUrl);

  const currentMediaUrl = isVideo
    ? hero.videoUrl || hero.mediaUrl || ""
    : hero.imageUrl || hero.mediaUrl || "";

  const hasMedia = Boolean(currentMediaUrl && currentMediaUrl.trim() !== "");

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadError(null);
      const validation = validateHeroMediaFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || "Invalid file selected.");
        toast.error(validation.error || "Invalid file selected.");
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);

      try {
        const result = await uploadHeroMedia(file, (percent) => {
          setUploadProgress(percent);
        });

        if (result.success && result.mediaUrl) {
          if (result.mediaType === "video") {
            onChange({
              mediaType: "video",
              mediaUrl: result.mediaUrl,
              videoUrl: result.mediaUrl,
              imageUrl: "",
              mediaFileName: result.fileName,
              mediaFileSize: result.sizeBytes,
            });
          } else {
            onChange({
              mediaType: "image",
              mediaUrl: result.mediaUrl,
              imageUrl: result.mediaUrl,
              videoUrl: "",
              mediaFileName: result.fileName,
              mediaFileSize: result.sizeBytes,
            });
          }

          toast.success(
            `Hero ${result.mediaType === "video" ? "Video" : "Image"} uploaded to draft! Save draft or publish to make it live.`,
          );
        }
      } catch (err: any) {
        const msg = err.message || "Failed to upload hero media. Please try again.";
        setUploadError(msg);
        toast.error(msg);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (videoInputRef.current) videoInputRef.current.value = "";
      }
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled || isUploading) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
      }
    },
    [disabled, isUploading, handleFileUpload],
  );

  const handleRemoveMedia = useCallback(() => {
    onChange({
      mediaType: "image",
      mediaUrl: "",
      imageUrl: "",
      videoUrl: "",
      mediaFileName: undefined,
      mediaFileSize: undefined,
    });
    toast.info("Hero media removed from draft. Publish website to apply to live site.");
  }, [onChange]);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/60 p-5 shadow-sm">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.svg,.avif,.gif"
        className="hidden"
        disabled={disabled || isUploading}
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov"
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold tracking-tight">HERO MEDIA</h4>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Draft Mode
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload custom background image or video for the landing hero section.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Upload Image
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => videoInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <VideoIcon className="h-3.5 w-3.5" />
            Upload Video
          </Button>

          {hasMedia && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveMedia}
              disabled={disabled || isUploading}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Media
            </Button>
          )}
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-2 text-primary">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Uploading Hero Media...
            </span>
            <span className="text-primary font-mono">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Processing and saving to persistent storage. Please do not close this window.
          </p>
        </div>
      )}

      {/* Error Alert */}
      {uploadError && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setUploadError(null)}
            className="h-6 px-2 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Media Display & Preview */}
      {hasMedia ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              CURRENT HERO MEDIA ({isVideo ? "Hero Video" : "Static Image"})
            </span>
            <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[280px]">
              {hero.mediaFileName || currentMediaUrl}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border bg-neutral-950 aspect-video md:aspect-[21/9] max-h-[260px] flex items-center justify-center group shadow-inner">
            {isVideo ? (
              <video
                key={currentMediaUrl}
                src={currentMediaUrl}
                controls
                muted
                playsInline
                autoPlay
                loop
                preload="metadata"
                className="h-full w-full object-contain md:object-cover"
                onError={(e) => {
                  console.error("[Hero Video Preview Error]:", e);
                  setUploadError(
                    "This video could not be played by your browser. Please check that it is an H.264/AAC MP4 or WebM video.",
                  );
                }}
              >
                <source src={currentMediaUrl} type="video/mp4" />
                <source src={currentMediaUrl} type="video/webm" />
                <source src={currentMediaUrl} />
              </video>
            ) : (
              <img
                src={currentMediaUrl}
                alt="Hero Draft Preview"
                className="h-full w-full object-cover"
                onError={() => {
                  setUploadError("Image failed to load. Please re-upload.");
                }}
              />
            )}

            <div className="absolute top-2 left-2 rounded-md bg-black/75 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm flex items-center gap-1.5">
              {isVideo ? (
                <>
                  <VideoIcon className="h-3 w-3 text-red-400" />
                  <span>Hero Video</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-3 w-3 text-blue-400" />
                  <span>Static Image</span>
                </>
              )}
            </div>

            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  isVideo ? videoInputRef.current?.click() : imageInputRef.current?.click()
                }
                disabled={disabled || isUploading}
                className="h-7 px-2.5 text-[11px] font-semibold bg-white/90 hover:bg-white text-black shadow"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Replace {isVideo ? "Video" : "Image"}
              </Button>
            </div>
          </div>

          {/* Media Info Card */}
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs space-y-1.5 font-mono">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Filename:
                </span>
                <span className="font-semibold truncate block">
                  {hero.mediaFileName || "Uploaded file"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Size:
                </span>
                <span className="font-semibold block">
                  {hero.mediaFileSize
                    ? `${(hero.mediaFileSize / (1024 * 1024)).toFixed(2)} MB`
                    : "Stored"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Type:
                </span>
                <span className="font-semibold block">{isVideo ? "video/mp4" : "image/jpeg"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-sans">
                  Status:
                </span>
                <span className="text-emerald-500 font-semibold block flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              </div>
            </div>
            <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground truncate">
              <span className="text-foreground/70 font-sans mr-1">URL:</span> {currentMediaUrl}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Persistent Storage Ready
              </span>
              <span>•</span>
              <span>Draft reference saved</span>
            </div>

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {showUrlInput ? "Hide Direct URL Editor" : "Edit Direct URL / Path"}
            </button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone State */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragOver ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:bg-card/70"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Upload className="h-6 w-6" />
          </div>

          <p className="text-sm font-semibold">
            Drag & drop hero image or video here, or choose an upload option
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Supported Images: JPG, PNG, WEBP, SVG (up to 25MB) • Videos: MP4, WebM (up to 100MB)
          </p>

          <div className="flex items-center gap-3 mt-4">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="gap-1.5"
            >
              <ImageIcon className="h-4 w-4" />
              Upload Image
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="gap-1.5"
            >
              <VideoIcon className="h-4 w-4" />
              Upload Video
            </Button>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {showUrlInput ? "Hide Direct URL" : "Or enter media URL manually"}
            </button>
          </div>
        </div>
      )}

      {/* Optional Direct URL Input */}
      {showUrlInput && (
        <div className="grid gap-3 pt-2 border-t border-border/60 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hero-manual-type" className="text-xs">
              Media Type
            </Label>
            <select
              id="hero-manual-type"
              value={hero.mediaType || "image"}
              onChange={(e) => {
                const newType = e.target.value as "video" | "image";
                onChange({
                  mediaType: newType,
                  videoUrl: newType === "video" ? currentMediaUrl : "",
                  imageUrl: newType === "image" ? currentMediaUrl : "",
                });
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
            >
              <option value="video">Hero Video (MP4 / WebM)</option>
              <option value="image">Hero Static Image</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hero-manual-url" className="text-xs">
              Direct Media URL / Path
            </Label>
            <Input
              id="hero-manual-url"
              value={currentMediaUrl}
              onChange={(e) => {
                const val = e.target.value;
                if (hero.mediaType === "video") {
                  onChange({ videoUrl: val, mediaUrl: val });
                } else {
                  onChange({ imageUrl: val, mediaUrl: val });
                }
              }}
              placeholder={
                hero.mediaType === "video"
                  ? "/videos/riotus-hero.mp4 or /api/media/med_..."
                  : "/assets/hero-bg.jpg or /api/media/med_..."
              }
              className="h-9 text-xs font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
