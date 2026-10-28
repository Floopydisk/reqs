"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ConfirmDeliveryItem {
  name: string;
  ordered: number;
  delivered: number;
}

export interface GRNConfirmData {
  type: "grn";
  poNumber: string;
  receiver: string;
  deliveredBy: string;
  deliveryDate: string;
  department: string;
  items: ConfirmDeliveryItem[];
  remark?: string;
}

export interface JCFConfirmData {
  type: "jcf";
  poNumber: string;
  vendor: string;
  service: string;
  serviceDate: string;
  receiver: string;
  department: string;
  completionRemarks?: string;
}

export type ConfirmDeliveryData = GRNConfirmData | JCFConfirmData;

interface ConfirmDeliveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ConfirmDeliveryData;
  // TODO: wire to POST /purchase-orders/:poId/grns/:grnId/confirm (or /jcfs/:jcfId/confirm)
  onConfirm: () => Promise<void>;
  /** "originator" (default) = the requester confirming receipt.
   *  "pm" = Procurement Manager doing final sign-off after originator confirmed. */
  confirmerRole?: "originator" | "pm";
  /** GRN/JCF reference number shown in the PM subtitle, e.g. "GRN-0231" */
  documentReference?: string;
}

// ─── Badge icon ───────────────────────────────────────────────────────────────

function BadgeSeal() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20">
      <defs>
        <linearGradient id="sealGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0F1E7A" />
        </linearGradient>
      </defs>
      {/* Octagonal seal shape */}
      <path
        d="M40 4 L54 10 L66 22 L72 36 L66 50 L54 62 L40 68 L26 62 L14 50 L8 36 L14 22 L26 10 Z"
        fill="url(#sealGrad)"
      />
      {/* Checkmark */}
      <path
        d="M26 40 L35 49 L54 30"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900 text-right max-w-[55%]">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConfirmDeliveryDialog({
  isOpen,
  onClose,
  data,
  onConfirm,
  confirmerRole = "originator",
  documentReference,
}: ConfirmDeliveryDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white gap-0 [&>button]:hidden">
        <div className="flex min-h-[480px]">
          {/* ── Left: confirmation prompt ─────────────────────────────────── */}
          <div className="flex-1 flex flex-col items-center justify-center px-10 py-12 bg-gray-50 border-r border-gray-100">
            <BadgeSeal />
            <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-3 text-center">
              Confirm your delivery
            </h2>
            {confirmerRole === "pm" ? (
              <p className="text-sm text-gray-500 text-center max-w-[280px] leading-relaxed">
                The receiving employee has confirmed the delivery for{" "}
                <span className="font-bold text-gray-700">{documentReference}</span>.
                Please review the submitted details and confirm the{" "}
                {data.type === "grn" ? "GRN" : "JCF"} to complete the procurement process.
              </p>
            ) : (
              <p className="text-sm text-gray-500 text-center max-w-[260px] leading-relaxed">
                Please review the details below and confirm that the items and quantities match what you received.
              </p>
            )}
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="mt-8 w-full max-w-[240px] py-6 bg-[#0F1E7A] hover:bg-[#0b154b] text-white font-bold tracking-widest text-sm"
            >
              {loading ? "CONFIRMING..." : "CONFIRM DELIVERY"}
            </Button>
          </div>

          {/* ── Right: details card ───────────────────────────────────────── */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* PO header */}
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Package className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Order ID: {data.poNumber}</p>
                <span className="inline-block mt-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded">
                  Awaiting your confirmation
                </span>
              </div>
            </div>

            {data.type === "grn" ? (
              <>
                {/* Delivery summary */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3 mb-4">
                  <p className="font-semibold text-gray-900 text-sm">Delivery summary</p>
                  <DetailRow label="Receiver" value={data.receiver} />
                  <DetailRow label="Delivered by" value={data.deliveredBy} />
                  <DetailRow label="Delivery date" value={data.deliveryDate} />
                  <DetailRow label="Department" value={data.department} />
                </div>

                {/* Items received */}
                <div className="border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-gray-900 text-sm mb-3">Items received</p>
                  <div className="space-y-4">
                    {data.items.map((item, i) => (
                      <div key={i} className="space-y-1.5">
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Ordered</span>
                          <span className="font-semibold tabular-nums">{item.ordered}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Delivered</span>
                          <span className="font-semibold tabular-nums">{item.delivered}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Remark */}
                {data.remark && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 text-sm mb-2">Remark from Store Manager</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{data.remark}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Service Details */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3 mb-4">
                  <p className="font-semibold text-gray-900 text-sm">Service Details</p>
                  <DetailRow label="Vendor" value={data.vendor} />
                  <DetailRow label="Service" value={data.service} />
                  <DetailRow label="Service date" value={data.serviceDate} />
                  <DetailRow label="Receiver" value={data.receiver} />
                  <DetailRow label="Department" value={data.department} />
                </div>

                {/* Completion remarks */}
                {data.completionRemarks && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 text-sm mb-2">Completion remarks</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{data.completionRemarks}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
