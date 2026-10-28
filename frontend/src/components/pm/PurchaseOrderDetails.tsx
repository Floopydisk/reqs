"use client";

import Link from "next/link";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { useEffect, useState } from "react";
import { getAuthData, getToken } from "@/lib/auth";
import { useParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import Related, {
  GRNRecord,
  JCFRecord,
} from "@/components/Requests/ViewEditRequest/Related";
import GenerateJCFDialog, {
  JCFPayload,
  JCFSubmitResult,
} from "@/components/GRN/GenerateJCFDialog";
import GenerateGRNDialog, {
  GRNPayload,
  GRNSubmitResult,
  GRNExistingRecord,
} from "@/components/GRN/GenerateGRNDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PopulatedUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type PopulatedVendor = {
  _id: string;
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type PopulatedLocation = {
  _id: string;
  name?: string;
  address?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
};

type PurchaseOrderItem = {
  _id?: string;
  itemDescription: string;
  quantity: number;
  uom: string;
  brand?: string;
  unitPrice: number;
  totalPrice: number;
};

type PurchaseOrderApproval = {
  approver?: PopulatedUser;
  approverRole: "hof" | "hhr";
  approvedAt?: string;
  feedback?: string;
};

type PurchaseOrder = {
  _id: string;
  poNumber?: string;
  title?: string;
  status: string;
  requisition?: {
    _id: string;
    title?: string;
    requisitionNumber?: string;
  };
  rfq?: {
    _id: string;
    rfqNumber?: string;
  };
  vendor?: PopulatedVendor;
  deliveryLocation?: PopulatedLocation;
  deliveryContact?: PopulatedUser;
  createdBy?: PopulatedUser;
  submittedBy?: PopulatedUser;
  submittedAt?: string;
  deliveryDate?: string;
  shipping?: string;
  generalTerms?: string;
  evaluationCriteria?: string;
  termsOfService?: string;
  sla?: {
    title?: string;
    content?: string;
  };
  paymentTerms?: string;
  quoteUrl?: string;
  vendorQuote?: string;
  vendorQuotes?: any[];
  attachments?: any[];
  totalAmount?: number;
  items?: PurchaseOrderItem[];
  approvals?: PurchaseOrderApproval[];
  pdfUrl?: string;
  createdAt?: string;
  related?: {
    requests?: { _id: string; title: string; department: string }[];
    rfqs?: { _id: string; title: string; department: string }[];
    pos?: { _id: string; title: string; department: string }[];
  };
};

export default function PurchaseOrderDetails() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const authData = getAuthData();
  const token = getToken();
  const poId = params.poId as string;
  const basePath = `/${pathname.split("/")[1]}`;
  const userRole = authData?.user?.role || "";
  const userDesignation = authData?.user?.designation?.toLowerCase() || "";
  const userDepartmentName = authData?.user?.department?.name?.toLowerCase() || "";

  const isHhra =
    userRole === "headOfHr" ||
    userRole === "hhra" ||
    userDesignation.includes("human resources") ||
    userDesignation.includes("hhra") ||
    (userRole === "departmentHead" &&
      (userDesignation.includes("head, human resources & admin") ||
        userDepartmentName.includes("human resources") ||
        userDepartmentName.includes("hr")));

  const isHof =
    userRole === "headOfFinance" ||
    userRole === "financeManager" ||
    userDesignation.includes("finance") ||
    userDesignation.includes("accounts") ||
    userDesignation.includes("cfo") ||
    (userRole === "departmentHead" &&
      (userDesignation.includes("head, finance") ||
        userDepartmentName.includes("finance") ||
        userDepartmentName.includes("accounts")));
  const isPm = authData?.user?.role === "procurementManager";
  // TODO: update role key once backend defines the Warehouse Manager role
  const isWm = authData?.user?.role === "warehouseManager";

  const [loading, setLoading] = useState(true);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingQuote, setDownloadingQuote] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<"hhr" | "hof" | null>(
    null,
  );
  const [pendingRejection, setPendingRejection] = useState<
    "hhr" | "hof" | null
  >(null);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  // GRN state
  const [isGRNDialogOpen, setIsGRNDialogOpen] = useState(false);
  const [grns, setGrns] = useState<GRNRecord[]>([]);
  // JCF state
  const [isJCFDialogOpen, setIsJCFDialogOpen] = useState(false);
  const [jcfs, setJcfs] = useState<JCFRecord[]>([]);
  // H4: PM edit mode for submitted POs
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<PurchaseOrderItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (!poId) {
        router.back();
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/purchase-orders/${poId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        const data = await response.json();

        if (data.success) {
          setPurchaseOrder(data.data);
        } else {
          toast.error(data.message || "Failed to fetch purchase order");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching purchase order:", error);
        toast.error("Failed to fetch purchase order");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrder();
  }, [poId, router]);

  // TODO: replace with real endpoint once backend defines GET /purchase-orders/:id/grns
  const fetchGRNs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/grns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setGrns(data.data ?? []);
    } catch {
      // silently ignore — GRN list is non-critical
    }
  };

  // TODO: replace stub with real API call once endpoint is ready
  const handleGRNSubmit = async (
    payload: GRNPayload,
  ): Promise<GRNSubmitResult> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/grn`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to create GRN");
    await fetchGRNs();
    return {
      grnNumber: data.data?.grnNumber ?? "GRN-XXXX",
      receivingEmployee: payload.receivingEmployee,
      submittedDate: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      totalDeliveredQty: payload.items.reduce(
        (sum, i) => sum + i.deliveredQty,
        0,
      ),
    };
  };

  const handleDownloadGRN = async (grn: GRNRecord) => {
    // TODO: wire to GET /grns/:id/download once endpoint exists
    toast.info("GRN download will be available once the endpoint is ready.");
    console.log("Download GRN:", grn._id);
  };

  // TODO: replace with real endpoint once backend defines GET /purchase-orders/:id/jcfs
  const fetchJCFs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/jcfs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setJcfs(data.data ?? []);
    } catch {
      // silently ignore — JCF list is non-critical
    }
  };

  // TODO: replace stub with real API call once endpoint is ready
  const handleJCFSubmit = async (
    payload: JCFPayload,
  ): Promise<JCFSubmitResult> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/jcf`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to create JCF");
    await fetchJCFs();
    return {
      jcfNumber: data.data?.jcfNumber ?? "JCF-XXXX",
      receivingEmployee: payload.receivingEmployee,
      submittedDate: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      totalItems: payload.items.length,
    };
  };

  const handleDownloadJCF = async (jcf: JCFRecord) => {
    // TODO: wire to GET /jcfs/:id/download once endpoint exists
    toast.info("JCF download will be available once the endpoint is ready.");
    console.log("Download JCF:", jcf._id);
  };

  const handleDownloadPO = async () => {
    setDownloading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/${poId}/pdf`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error("Failed to download PO");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PO-${purchaseOrder?.poNumber || poId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Purchase order downloaded successfully");
    } catch (error) {
      console.error("Error downloading PO:", error);
      toast.error("Failed to download purchase order");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadVendorQuote = async () => {
    if (!purchaseOrder) return;

    // 1. If direct S3 quote or attachment exists, open it in a new tab
    const directUrl =
      purchaseOrder.quoteUrl ||
      purchaseOrder.vendorQuote ||
      purchaseOrder.vendorQuotes?.[0]?.url ||
      purchaseOrder.attachments?.[0]?.url;

    if (directUrl) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      toast.success("Opening vendor quote");
      return;
    }

    // 2. Fall back to RFQ download endpoint via GET
    const rfqId =
      typeof purchaseOrder.rfq === "object"
        ? purchaseOrder.rfq?._id || (purchaseOrder.rfq as any)?.id
        : purchaseOrder.rfq;
    const vendorId =
      typeof purchaseOrder.vendor === "object"
        ? purchaseOrder.vendor?._id || (purchaseOrder.vendor as any)?.id
        : purchaseOrder.vendor;

    if (!rfqId) {
      toast.error("No quote document or RFQ attached to this purchase order");
      return;
    }

    setDownloadingQuote(true);
    try {
      const query = vendorId ? `?vendorIds=${vendorId}` : "";
      const response = await fetch(
        `${API_BASE_URL}/rfqs/${rfqId}/download${query}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to download vendor quote");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendor-quote-${purchaseOrder.poNumber || "doc"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Vendor quote downloaded successfully");
    } catch (error) {
      console.error("Error downloading vendor quote:", error);
      toast.error("Failed to download vendor quote");
    } finally {
      setDownloadingQuote(false);
    }
  };

  const handleApprove = async (approvalType: "hhr" | "hof") => {
    if (!purchaseOrder) return;
    setApproving(true);
    try {
      const endpoint =
        approvalType === "hof"
          ? `${API_BASE_URL}/purchase-orders/${purchaseOrder._id}/hof-approve`
          : `${API_BASE_URL}/purchase-orders/${purchaseOrder._id}/hhr-approve`;
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Purchase order approved");
        setPurchaseOrder((prev) =>
          prev
            ? {
              ...prev,
              status:
                data.data?.status ??
                (approvalType === "hof" ? "hofApproved" : "approved"),
            }
            : prev,
        );
      } else {
        toast.error(data.message || "Failed to approve purchase order");
      }
    } catch (error) {
      console.error("Error approving purchase order:", error);
      toast.error("Failed to approve purchase order");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (rejectionType: "hhr" | "hof") => {
    if (!purchaseOrder) return;
    setRejecting(true);
    try {
      const endpoint =
        rejectionType === "hof"
          ? `${API_BASE_URL}/purchase-orders/${purchaseOrder._id}/hof-reject`
          : `${API_BASE_URL}/purchase-orders/${purchaseOrder._id}/hhr-reject`;
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback: rejectionFeedback }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || "Purchase order rejected");
        setPurchaseOrder((prev) =>
          prev ? { ...prev, status: data.data?.status ?? "rejected" } : prev,
        );
        setPendingRejection(null);
        setRejectionFeedback("");
      } else {
        toast.error(data.message || "Failed to reject purchase order");
      }
    } catch (error) {
      console.error("Error rejecting purchase order:", error);
      toast.error("Failed to reject purchase order");
    } finally {
      setRejecting(false);
    }
  };

  // H4: Save PM edits to a submitted PO
  const handleSaveEdit = async () => {
    if (!purchaseOrder) return;
    setSavingEdit(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/${purchaseOrder._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items: editedItems }),
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Purchase order updated successfully");
        setPurchaseOrder((prev) =>
          prev ? { ...prev, items: editedItems } : prev,
        );
        setIsEditMode(false);
      } else {
        toast.error(data.message || "Failed to update purchase order");
      }
    } catch (error) {
      console.error("Error updating PO:", error);
      toast.error("Failed to update purchase order");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRelatedView = (
    item: { _id: string },
    type: "request" | "rfq" | "po",
  ) => {
    if (type === "request") {
      router.push(`${basePath}/requisitions/${item._id}`);
      return;
    }
    if (type === "rfq") {
      router.push(`${basePath}/rfqs/${item._id}`);
      return;
    }
    router.push(`${basePath}/pos/${item._id}`);
  };

  const formatMoney = (value?: number) => {
    if (typeof value !== "number") return "N/A";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (value?: string) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 md:px-16 py-8">
        <div className="flex items-center justify-center py-10 text-gray-600">
          Loading purchase order...
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return null;
  }

  const approvals = purchaseOrder.approvals || [];
  const canHofApprove =
    purchaseOrder.status === "issued" || purchaseOrder.status === "submitted";
  const canHhraApprove = purchaseOrder.status === "hofApproved";

  // A PO is treated as a service PO when all items lack a meaningful brand.
  // TODO: replace with an explicit `type` field once backend provides it.
  const isServicePO = !!(
    purchaseOrder.items?.length &&
    purchaseOrder.items.every(
      (item) =>
        !item.brand || ["", "n/a"].includes(item.brand.trim().toLowerCase()),
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-16 py-6 md:py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-900 text-blue-900 hover:bg-blue-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
                Purchase Order
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold text-blue-900">
                {purchaseOrder.title?.trim() || "Untitled Purchase Order"}
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-600">
                {purchaseOrder.poNumber || "No PO Number"}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {isHof
                  ? "Review the purchase order and provide finance approval."
                  : isHhra
                    ? "Review the purchase order and approve it for PM processing."
                    : "Review purchase order details."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Overview
            </p>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {purchaseOrder.status}
              </p>
              <p>
                <span className="font-semibold">Requisition:</span>{" "}
                {purchaseOrder.requisition?.requisitionNumber ||
                  purchaseOrder.requisition?.title ||
                  "N/A"}
              </p>
              <p>
                <span className="font-semibold">RFQ:</span>{" "}
                {purchaseOrder.rfq?.rfqNumber || "N/A"}
              </p>
              <p>
                <span className="font-semibold">Created By:</span>{" "}
                {purchaseOrder.createdBy
                  ? `${purchaseOrder.createdBy.firstName || ""} ${purchaseOrder.createdBy.lastName || ""
                    }`.trim()
                  : "N/A"}
              </p>
              <p>
                <span className="font-semibold">Submitted:</span>{" "}
                {formatDate(purchaseOrder.submittedAt)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Vendor and Delivery
            </p>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Vendor:</span>{" "}
                {purchaseOrder.vendor?.name || "N/A"}
              </p>
              {purchaseOrder.vendor?.contactPerson && (
                <p>
                  <span className="font-semibold">Contact Person:</span>{" "}
                  {purchaseOrder.vendor.contactPerson}
                </p>
              )}
              {purchaseOrder.vendor?.phone && (
                <p>
                  <span className="font-semibold">Phone:</span>{" "}
                  {purchaseOrder.vendor.phone}
                </p>
              )}
              {purchaseOrder.vendor?.email && (
                <p>
                  <span className="font-semibold">Vendor Email:</span>{" "}
                  {purchaseOrder.vendor.email}
                </p>
              )}
              {purchaseOrder.vendor?.address && (
                <p>
                  <span className="font-semibold">Address:</span>{" "}
                  {purchaseOrder.vendor.address}
                </p>
              )}
              <p>
                <span className="font-semibold">Delivery Location:</span>{" "}
                {purchaseOrder.deliveryLocation?.name || "N/A"}
              </p>
              <p>
                <span className="font-semibold">Delivery Date:</span>{" "}
                {formatDate(purchaseOrder.deliveryDate)}
              </p>
              <p>
                <span className="font-semibold">Shipping:</span>{" "}
                {purchaseOrder.shipping || "N/A"}
              </p>
              <p>
                <span className="font-semibold">Delivery Contact:</span>{" "}
                {purchaseOrder.deliveryContact
                  ? `${purchaseOrder.deliveryContact.firstName || ""} ${purchaseOrder.deliveryContact.lastName || ""
                    }`.trim()
                  : "N/A"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Financials
            </p>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-semibold">Total Amount:</span>{" "}
                {formatMoney(purchaseOrder.totalAmount)}
              </p>
              <p>
                <span className="font-semibold">Payment Terms:</span>{" "}
                {purchaseOrder.paymentTerms || "N/A"}
              </p>
              <p>
                <span className="font-semibold">Terms of Service:</span>{" "}
                {purchaseOrder.termsOfService || "N/A"}
              </p>
              <p>
                <span className="font-semibold">Evaluation Criteria:</span>{" "}
                {purchaseOrder.evaluationCriteria || "N/A"}
              </p>
              {purchaseOrder.sla && (purchaseOrder.sla.title || purchaseOrder.sla.content) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="font-semibold block text-sm mb-1 text-gray-900">
                    SLA: {purchaseOrder.sla.title || "Service Level Agreement"}
                  </span>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-200 whitespace-pre-line">
                    {purchaseOrder.sla.content}
                  </p>
                </div>
              )}
              {((purchaseOrder.vendorQuotes && purchaseOrder.vendorQuotes.length > 0) ||
                (purchaseOrder.attachments && purchaseOrder.attachments.length > 0) ||
                purchaseOrder.quoteUrl) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="font-semibold block text-sm mb-2 text-gray-900">
                      Uploaded Vendor Quote(s) & Attachments:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {purchaseOrder.quoteUrl &&
                        !purchaseOrder.vendorQuotes?.length &&
                        !purchaseOrder.attachments?.length && (
                          <a
                            href={purchaseOrder.quoteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 text-xs font-medium rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Vendor Quote
                          </a>
                        )}
                      {/* {purchaseOrder.vendorQuotes?.map((quote: any, idx: number) => (
                        <a
                          key={`vq-${idx}`}
                          href={quote.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 text-xs font-medium rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {quote.filename || `Quote ${idx + 1}`}
                        </a>
                      ))} */}
                      {purchaseOrder.attachments?.map((att: any, idx: number) => (
                        <a
                          key={`att-${idx}`}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-medium rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {att.name || att.filename || `Attachment ${idx + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  Items
                </p>
                <h2 className="mt-2 text-lg font-semibold text-gray-900">
                  Purchase Order Line Items
                </h2>
              </div>
              {purchaseOrder.pdfUrl && (
                <Link
                  href={purchaseOrder.pdfUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Link>
              )}
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 pr-4 font-medium">Description</th>
                    <th className="py-3 pr-4 font-medium">Brand</th>
                    <th className="py-3 pr-4 font-medium">Qty</th>
                    <th className="py-3 pr-4 font-medium">UOM</th>
                    <th className="py-3 pr-4 font-medium">Unit Price</th>
                    <th className="py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchaseOrder.items || []).map((item, index) => (
                    <tr
                      key={item._id || `${item.itemDescription}-${index}`}
                      className="border-b border-gray-100"
                    >
                      <td className="py-4 pr-4 text-gray-800">
                        {item.itemDescription || "N/A"}
                      </td>
                      <td className="py-4 pr-4 text-gray-700">
                        {item.brand || "N/A"}
                      </td>
                      <td className="py-4 pr-4 text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="py-4 pr-4 text-gray-700">{item.uom}</td>
                      <td className="py-4 pr-4 text-gray-700">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="py-4 font-medium text-gray-900">
                        {formatMoney(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                  {(purchaseOrder.items || []).length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-gray-500"
                      >
                        No purchase order items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Approval Trail
            </p>
            <div className="mt-4 space-y-4">
              {approvals.length > 0 ? (
                approvals.map((approval, index) => (
                  <div
                    key={`${approval.approverRole}-${index}`}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      {approval.approverRole === "hof"
                        ? "Head of Finance"
                        : "Head of Human Resources"}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {approval.approver
                        ? `${approval.approver.firstName || ""} ${approval.approver.lastName || ""}`.trim()
                        : "Approver"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(approval.approvedAt)}
                    </p>
                    {approval.feedback && (
                      <p className="mt-2 text-sm text-gray-600">
                        {approval.feedback}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  <FileText className="h-4 w-4" />
                  No approvals recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <Related
          requests={purchaseOrder.related?.requests || []}
          rfqs={purchaseOrder.related?.rfqs || []}
          pos={purchaseOrder.related?.pos || []}
          grns={isServicePO ? undefined : grns}
          jcfs={isServicePO ? jcfs : undefined}
          defaultTab={isServicePO ? "jcf" : "grn"}
          onViewItem={handleRelatedView}
          onDownloadGRN={handleDownloadGRN}
          onDownloadJCF={handleDownloadJCF}
        />

        {/* C6: HOF Approve + Reject buttons */}
        {isHof && canHofApprove && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={approving}
              onClick={() => setPendingApproval("hof")}
              className="rounded-md bg-green-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {approving ? "Approving..." : "Approve PO (HoF)"}
            </button>
            <button
              disabled={rejecting}
              onClick={() => setPendingRejection("hof")}
              className="rounded-md bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {rejecting ? "Rejecting..." : "Reject PO"}
            </button>
          </div>
        )}
        {/* C6: HHRA Approve + Reject buttons */}
        {isHhra && canHhraApprove && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={approving}
              onClick={() => setPendingApproval("hhr")}
              className="rounded-md bg-green-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {approving ? "Approving..." : "Final Approve PO (HHRA)"}
            </button>
            <button
              disabled={rejecting}
              onClick={() => setPendingRejection("hhr")}
              className="rounded-md bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {rejecting ? "Rejecting..." : "Reject PO"}
            </button>
          </div>
        )}
        {/* Sequential approval status notices */}
        {isHhra && (purchaseOrder.status === "submitted" || purchaseOrder.status === "issued") && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Awaiting Head of Finance (HoF) Approval:</strong> This purchase order must first be approved by the Head of Finance before HHRA can grant final approval.
          </div>
        )}
        {isHof && purchaseOrder.status === "hofApproved" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong>Head of Finance Approval Completed:</strong> This purchase order has received Finance approval and is currently awaiting final approval from the Head of HR & Admin (HHRA).
          </div>
        )}

        {/* Approval confirmation dialog */}
        <Dialog
          open={pendingApproval !== null}
          onOpenChange={(open) => {
            if (!open) setPendingApproval(null);
          }}
        >
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Confirm Approval</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Are you sure you want to approve this purchase order? This action
              cannot be undone.
            </p>
            <DialogFooter className="gap-2">
              <button
                onClick={() => setPendingApproval(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={approving}
                onClick={async () => {
                  if (!pendingApproval) return;
                  await handleApprove(pendingApproval);
                  setPendingApproval(null);
                }}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
              >
                {approving ? "Approving..." : "Yes, Approve"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* C6: Rejection confirmation dialog */}
        <Dialog
          open={pendingRejection !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPendingRejection(null);
              setRejectionFeedback("");
            }
          }}
        >
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Reject Purchase Order</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Please provide a reason for rejecting this purchase order.
            </p>
            <Textarea
              value={rejectionFeedback}
              onChange={(e) => setRejectionFeedback(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="bg-white"
            />
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingRejection(null);
                  setRejectionFeedback("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={rejecting}
                onClick={async () => {
                  if (!pendingRejection) return;
                  await handleReject(pendingRejection);
                }}
              >
                {rejecting ? "Rejecting..." : "Confirm Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isPm && (
          <div className="flex flex-wrap gap-3">
            {/* H4: Edit PO button for PM when status is submitted */}
            {purchaseOrder.status === "submitted" && (
              <button
                onClick={() => {
                  setEditedItems(
                    purchaseOrder.items ? [...purchaseOrder.items] : [],
                  );
                  setIsEditMode(true);
                }}
                className="rounded-md border border-blue-900 px-5 py-3 text-sm font-semibold text-blue-900 transition-colors hover:bg-blue-50"
              >
                Edit PO
              </button>
            )}
            <button
              onClick={handleDownloadVendorQuote}
              disabled={downloadingQuote}
              className="rounded-md border border-blue-900 px-5 py-3 text-sm font-semibold text-blue-900 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingQuote ? "Downloading..." : "Download Vendor Quote"}
            </button>
            {/* C6: Gate Download PO button — only available after full approval */}
            {purchaseOrder.status === "approved" && (
              <button
                onClick={handleDownloadPO}
                disabled={downloading}
                className="rounded-md bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading ? "Downloading..." : "Download PO"}
              </button>
            )}
            {/* GRN: product POs — PM path */}
            {!isServicePO && purchaseOrder.status === "approved" && (
              <button
                onClick={() => setIsGRNDialogOpen(true)}
                className="rounded-md bg-[#0F1E7A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0a1555]"
              >
                Generate GRN
              </button>
            )}
            {/* JCF: service POs — available to PM once approved */}
            {isServicePO && purchaseOrder.status === "approved" && (
              <button
                onClick={() => setIsJCFDialogOpen(true)}
                className="rounded-md bg-[#0F1E7A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0a1555]"
              >
                Generate JCF
              </button>
            )}
          </div>
        )}
        {/* GRN: product POs — Warehouse Manager path */}
        {isWm && !isServicePO && purchaseOrder.status === "approved" && (
          <button
            onClick={() => setIsGRNDialogOpen(true)}
            className="rounded-md bg-[#0F1E7A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0a1555]"
          >
            Generate GRN
          </button>
        )}

        {/* H4: Inline edit mode panel for PM */}
        {isPm && isEditMode && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-4">
              Edit PO Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 pr-4 font-medium">Description</th>
                    <th className="py-3 pr-4 font-medium">Qty</th>
                    <th className="py-3 pr-4 font-medium">UOM</th>
                    <th className="py-3 pr-4 font-medium">Unit Price</th>
                    <th className="py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {editedItems.map((item, index) => (
                    <tr
                      key={item._id || index}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 pr-4">
                        <Input
                          type="text"
                          value={item.itemDescription}
                          onChange={(e) => {
                            const updated = [...editedItems];
                            updated[index] = {
                              ...updated[index],
                              itemDescription: e.target.value,
                            };
                            setEditedItems(updated);
                          }}
                          className="w-full bg-white text-sm h-8"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...editedItems];
                            const qty = parseFloat(e.target.value) || 0;
                            updated[index] = {
                              ...updated[index],
                              quantity: qty,
                              totalPrice: qty * updated[index].unitPrice,
                            };
                            setEditedItems(updated);
                          }}
                          className="w-20 bg-white text-sm h-8"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          type="text"
                          value={item.uom}
                          onChange={(e) => {
                            const updated = [...editedItems];
                            updated[index] = {
                              ...updated[index],
                              uom: e.target.value,
                            };
                            setEditedItems(updated);
                          }}
                          className="w-24 bg-white text-sm h-8"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...editedItems];
                            const price = parseFloat(e.target.value) || 0;
                            updated[index] = {
                              ...updated[index],
                              unitPrice: price,
                              totalPrice: price * updated[index].quantity,
                            };
                            setEditedItems(updated);
                          }}
                          className="w-28 bg-white text-sm h-8"
                        />
                      </td>
                      <td className="py-3 text-gray-700">
                        {formatMoney(
                          editedItems[index].quantity *
                          editedItems[index].unitPrice,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="bg-blue-900 hover:bg-blue-800 text-white"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditMode(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* GRN Dialog — product POs */}
        {(isWm || isPm) && purchaseOrder && !isServicePO && (
          <GenerateGRNDialog
            isOpen={isGRNDialogOpen}
            onClose={() => setIsGRNDialogOpen(false)}
            poNumber={purchaseOrder.poNumber ?? ""}
            items={(purchaseOrder.items ?? []).map((item) => ({
              _id: item._id,
              itemDescription: item.itemDescription,
              brand: item.brand,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }))}
            existingGRNs={grns.map<GRNExistingRecord>((grn) => ({
              items: grn.items.map((i) => ({
                itemId:
                  (i as { itemId?: string; deliveredQty: number }).itemId ?? "",
                deliveredQty: i.deliveredQty,
              })),
            }))}
            onSubmit={handleGRNSubmit}
          />
        )}

        {/* JCF Dialog — service POs, PM only */}
        {isPm && purchaseOrder && isServicePO && (
          <GenerateJCFDialog
            isOpen={isJCFDialogOpen}
            onClose={() => setIsJCFDialogOpen(false)}
            poNumber={purchaseOrder.poNumber ?? ""}
            rfqNumber={purchaseOrder.rfq?.rfqNumber}
            items={(purchaseOrder.items ?? []).map((item) => ({
              _id: item._id,
              itemDescription: item.itemDescription,
              vendor: purchaseOrder.vendor?.name ?? "—",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }))}
            onSubmit={handleJCFSubmit}
          />
        )}
      </div>
    </div>
  );
}
