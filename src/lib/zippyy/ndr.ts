/**
 * Zippyy Non-Delivery Report (NDR) Management Module
 */
import { isZippyyConfigured, zippyyRequest } from "./client";
import type { ZippyyNdrActionRequest, ZippyyNdrActionResponse } from "./types";

/**
 * Executes an NDR action with Zippyy (e.g., schedule a reattempt on a specific date or trigger RTO).
 */
export async function actionZippyyNdr(
  req: ZippyyNdrActionRequest,
): Promise<ZippyyNdrActionResponse> {
  const shipmentId = req.shipmentId || "";
  const awb = req.awbNumber || "";

  if (isZippyyConfigured() && (shipmentId || awb)) {
    try {
      const res = await zippyyRequest<any>("/v1/external/ndr/action", {
        method: "POST",
        body: JSON.stringify({
          shipment_id: shipmentId,
          awb_number: awb,
          action: req.action, // "REATTEMPT" or "RTO"
          remarks: req.remarks || (req.action === "REATTEMPT" ? "Customer requested reattempt" : "Customer refused delivery"),
          deferred_date: req.deferredDate,
          phone: req.updatedPhone,
          address: req.updatedAddress,
        }),
      });

      return {
        success: true,
        shipmentId,
        awbNumber: awb,
        actionTaken: req.action,
        message: res.message || `NDR action '${req.action}' submitted successfully to Zippyy`,
        status: res.status || (req.action === "REATTEMPT" ? "REATTEMPT_SCHEDULED" : "RTO_INITIATED"),
      };
    } catch (err: any) {
      console.error("[Zippyy NDR] Action API call failed:", err);
      throw new Error(err.message || "Failed to process NDR action with Zippyy");
    }
  }

  // Sandbox / Dev response
  return {
    success: true,
    shipmentId,
    awbNumber: awb,
    actionTaken: req.action,
    message: `NDR action '${req.action}' recorded successfully (Sandbox Mode)`,
    status: req.action === "REATTEMPT" ? "REATTEMPT_SCHEDULED" : "RTO_INITIATED",
  };
}
