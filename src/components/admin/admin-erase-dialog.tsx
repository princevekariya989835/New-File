import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Lock, Eye, EyeOff, ShieldAlert, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminResetSectionData, type AdminResetSection } from "@/lib/admin-reset.functions";

interface AdminEraseDataButtonProps {
  section: AdminResetSection;
  sectionLabel: string;
  variant?: "outline" | "destructive" | "ghost" | "secondary";
  size?: "sm" | "default" | "icon" | "lg";
  buttonText?: string;
  className?: string;
  onSuccess?: () => void;
}

export function AdminEraseDataButton({
  section,
  sectionLabel,
  variant = "destructive",
  size = "sm",
  buttonText,
  className,
  onSuccess,
}: AdminEraseDataButtonProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const resetFn = useServerFn(adminResetSectionData);
  const qc = useQueryClient();

  const eraseMutation = useMutation({
    mutationFn: async (pwd: string) => {
      return resetFn({ data: { section, password: pwd } });
    },
    onSuccess: (res) => {
      toast.success(res.message || `All ${sectionLabel} data has been erased.`);
      setPassword("");
      setErrorMsg("");
      setOpen(false);

      // Invalidate queries so UI refreshes immediately
      qc.invalidateQueries();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to erase data. Please verify your password.";
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const handleOpen = () => {
    setPassword("");
    setErrorMsg("");
    setOpen(true);
  };

  const handleClose = () => {
    if (eraseMutation.isPending) return;
    setPassword("");
    setErrorMsg("");
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg("Please enter the security password.");
      return;
    }
    setErrorMsg("");
    eraseMutation.mutate(password);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={className ?? "gap-1.5 font-medium"}
        title={`Erase all ${sectionLabel} data`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {buttonText || `Erase All ${sectionLabel} Data`}
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? handleClose() : setOpen(true))}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader className="space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto sm:mx-0">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-xl font-bold text-destructive">
                Erase All {sectionLabel} Data
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                This action is <span className="font-semibold text-foreground">irreversible</span>.
                It will permanently delete all records stored under the{" "}
                <span className="font-semibold text-foreground">{sectionLabel}</span> module.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Security Confirmation Required</p>
                <p className="text-destructive/90">
                  Please enter the administrative reset password to confirm this operation.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor={`pwd-${section}`}
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Security Password
              </Label>
              <div className="relative">
                <Input
                  id={`pwd-${section}`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter Prince@955123"
                  className="pr-10 h-10 font-mono text-sm"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errorMsg && (
                <p className="text-xs font-medium text-destructive animate-in fade-in">
                  {errorMsg}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={eraseMutation.isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={eraseMutation.isPending || !password.trim()}
                className="w-full sm:w-auto gap-1.5"
              >
                {eraseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Erasing Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Confirm & Erase All
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
