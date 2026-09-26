import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CustomerOrder } from "@/lib/orders.functions";

interface CancelOrderModalProps {
  order: CustomerOrder | null;
  isOpen: boolean;
  isCancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelOrderModal({
  order,
  isOpen,
  isCancelling,
  onClose,
  onConfirm,
}: CancelOrderModalProps) {
  if (!order) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isCancelling) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-border/80 bg-card p-5 sm:p-6 md:p-8 shadow-2xl"
        aria-describedby="cancel-order-description"
      >
        <div className="flex flex-col items-center sm:items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-red/10 text-brand-red shrink-0">
            <AlertTriangle className="h-6 w-6 text-brand-red" />
          </div>

          <DialogHeader className="space-y-1.5 text-center sm:text-left">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Cancel Order
            </DialogTitle>
            <DialogDescription
              id="cancel-order-description"
              className="text-sm text-muted-foreground leading-relaxed"
            >
              Are you sure you want to cancel this order?
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Dynamic Order Details Callout */}
        <div className="mt-3 rounded-xl border border-border/70 bg-secondary/50 p-4 space-y-2 text-left">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-medium text-muted-foreground">Order:</span>
            <span className="font-mono font-bold text-foreground">#{order.name}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            This action cannot be undone and the reserved stock will be restored.
          </p>
        </div>

        {/* Action Buttons: [ Keep Order ] [ Cancel Order ] */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isCancelling}
            onClick={onClose}
            className="h-11 min-h-[44px] w-full sm:w-auto rounded-full px-5 text-sm font-semibold border-border hover:bg-secondary transition-colors cursor-pointer"
          >
            Keep Order
          </Button>

          <Button
            type="button"
            disabled={isCancelling}
            onClick={onConfirm}
            className="h-11 min-h-[44px] w-full sm:w-auto rounded-full px-6 text-sm font-bold uppercase tracking-wider bg-brand-red text-white hover:bg-brand-red/90 shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Order"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
