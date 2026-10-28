"use client";

import { toast } from "sonner";
import { getAuthData, getToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react";
import Related from "@/components/Requests/ViewEditRequest/Related";

interface VendorCard {
  id: string;
  companyName: string;
  contactPerson: string;
  phoneNo: string;
  emailAddress: string;
  address: string;
}

interface APIVendor {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

interface RequestItem {
  id: string;
  itemId: string | { _id?: string; id?: string };
  itemDescription: string;
  detailedSpecification: string;
  uom: string;
  quantity: number;
  expectedDeliveryDate: string;
}

interface RelatedRequest {
  title: string;
  department: string;
}

interface RelatedItem {
  _id: string;
  title: string;
  department: string;
}

interface RFQData {
  _id: string;
  rfqNumber: string;
  title: string;
  requisition: {
    _id: string;
    title: string;
    requisitionNumber: string;
  };
  vendor?: APIVendor | APIVendor[] | string;
  vendors?: (APIVendor | string)[];
  items: RequestItem[];
  evaluationCriteria: string;
  termsAndConditions: string;
  deliveryLocation: {
    _id: string;
    name: string;
    address: string;
  };
  expectedDeliveryDate: string;
  status: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const ViewRFQs = () => {
  const params = useParams<{ rfqId: string }>();
  const router = useRouter();
  const rfqId = params.rfqId as string;
  const authData = getAuthData();
  const isHhra =
    authData?.user?.role === "departmentHead" &&
    authData?.user?.designation === "Head, Human Resources & Admin";
  const isReadOnly = isHhra;
  const basePath = isHhra ? "/hhra" : "/pm";

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"REQUEST" | "RFQs" | "POs">(
    "REQUEST",
  );
  const [bulkAction, setBulkAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [rfqData, setRfqData] = useState<RFQData | null>(null);
  const [vendors, setVendors] = useState<VendorCard[]>([]);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [relatedRequests, setRelatedRequests] = useState<RelatedItem[]>([]);
  const [relatedRfqs, setRelatedRfqs] = useState<RelatedItem[]>([]);
  const [relatedPos, setRelatedPos] = useState<RelatedItem[]>([]);
  const [downloadingVendorId, setDownloadingVendorId] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const downloadInProgressRef = useRef(false);

  useEffect(() => {
    if (!rfqId) {
      router.push("/pm/rfqs");
      return;
    }
    const fetchRFQData = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/rfqs/${rfqId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (data.success) {
          setRfqData(data.data);
          if (data.data?.related) {
            setRelatedRequests(data.data.related.requests || []);
            setRelatedRfqs(data.data.related.rfqs || []);
            setRelatedPos(data.data.related.pos || []);
          }
          if (data.data.related) {
            setRelatedRequests(data.data.related.requests || []);
            setRelatedRfqs(data.data.related.rfqs || []);
            setRelatedPos(data.data.related.pos || []);
          }

          const rawVendors = Array.isArray(data.data.vendors)
            ? data.data.vendors
            : data.data.vendor
              ? Array.isArray(data.data.vendor)
                ? data.data.vendor
                : [data.data.vendor]
              : [];

          if (
            rawVendors.length > 0 &&
            typeof rawVendors[0] === "object" &&
            (rawVendors[0] as APIVendor)._id
          ) {
            const vendorArray = rawVendors as APIVendor[];
            setVendors(
              vendorArray.map((v: APIVendor) => ({
                id: v._id,
                companyName: v.name,
                contactPerson: v.contactPerson || "",
                phoneNo: v.phone || "",
                emailAddress: v.email || "",
                address: v.address || "",
              })),
            );
          } else {
            const vendorIds = rawVendors.map((vendor: string | APIVendor) =>
              typeof vendor === "string"
                ? vendor
                : vendor?._id?.toString?.() || "",
            );

            const token = getToken();
            let allVendors: APIVendor[] = [];
            let currentPage = 1;
            let totalPages = 1;

            try {
              do {
                const vendorsResponse = await fetch(
                  `${API_BASE_URL}/vendors?page=${currentPage}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  },
                );

                const vendorsData = await vendorsResponse.json();
                if (vendorsData.success) {
                  allVendors = [...allVendors, ...vendorsData.data];
                  totalPages = vendorsData.pagination?.pages || 1;
                  currentPage++;
                } else {
                  break;
                }
              } while (currentPage <= totalPages);
            } catch (vendorFetchError) {
              console.error(
                "Failed to fetch vendor details:",
                vendorFetchError,
              );
            }

            const vendorMap = new Map(
              allVendors.map((vendor) => [vendor._id, vendor]),
            );

            const resolvedVendors = vendorIds
              .filter(Boolean)
              .map((vendorId: string) => {
                const vendor = vendorMap.get(vendorId);

                if (!vendor) {
                  return {
                    id: vendorId,
                    companyName: `Vendor ${vendorId.slice(-6)}`,
                    contactPerson: "",
                    phoneNo: "",
                    emailAddress: "",
                    address: "",
                  };
                }

                return {
                  id: vendor._id,
                  companyName: vendor.name,
                  contactPerson: vendor.contactPerson || "",
                  phoneNo: vendor.phone || "",
                  emailAddress: vendor.email || "",
                  address: vendor.address || "",
                };
              });

            setVendors(resolvedVendors);
          }

          const rfqItems = Array.isArray(data.data.items)
            ? data.data.items
            : [];

          setItems(
            rfqItems.map((item: RequestItem, index: number) => {
              const rawItemId = item.itemId;
              const normalizedItemId =
                typeof rawItemId === "string"
                  ? rawItemId
                  : rawItemId?._id || rawItemId?.id || "";

              return {
                ...item,
                itemId: normalizedItemId,
                id: normalizedItemId || item.id || `rfq-item-${index}`,
              };
            }),
          );
        } else {
          toast.error("Failed to fetch RFQ data");
        }
      } catch (error) {
        console.error("Error fetching RFQ:", error);
        toast.error("Failed to fetch RFQ data");
      } finally {
        setLoading(false);
      }
    };
    fetchRFQData();
  }, [rfqId, router]);

  useEffect(() => {
    const fetchRelatedItems = async () => {
      const targetId = rfqData?._id || rfqId;
      if (!targetId) {
        return;
      }

      try {
        const token = getToken();
        const response = await fetch(
          `${API_BASE_URL}/rfqs/${targetId}/related`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await response.json();
        if (data.success && data.data) {
          setRelatedRequests(data.data.requests || []);
          setRelatedRfqs(data.data.rfqs || []);
          setRelatedPos(data.data.pos || []);
        }
      } catch (error) {
        console.error("Failed to load related RFQ items", error);
      }
    };

    fetchRelatedItems();
  }, [rfqData?._id, rfqId]);

  const handleDownloadRFQ = async (vendorId?: string, vendorName?: string) => {
    const targetRfqId = rfqData?._id || rfqId;
    if (!targetRfqId || downloadInProgressRef.current) return;

    downloadInProgressRef.current = true;
    let downloadStage = "request";
    try {
      setDownloadingVendorId(vendorId || "all");
      const token = getToken();
      const query = vendorId ? `?vendorIds=${encodeURIComponent(vendorId)}` : "";
      const res = await fetch(`${API_BASE_URL}/rfqs/${targetRfqId}/download${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        const errorBody = contentType.includes("application/json")
          ? await res.json().catch(() => ({}))
          : { message: await res.text().catch(() => "") };
        toast.error(
          errorBody.message || `RFQ download failed (HTTP ${res.status})`,
        );
        return;
      }

      downloadStage = "response body";
      const contentType = res.headers.get("content-type") || "";
      if (
        !contentType.includes("application/pdf") &&
        !contentType.includes("application/zip")
      ) {
        throw new Error(`Unexpected download content type: ${contentType || "unknown"}`);
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("The RFQ download response was empty");
      }

      const disposition = res.headers.get("Content-Disposition");
      let filename = `RFQ_${rfqData?.rfqNumber || targetRfqId}${vendorName ? `_${vendorName.replace(/[^a-zA-Z0-9_-]/g, "_")}` : ""}.pdf`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      downloadStage = "save file";
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success("RFQ downloaded successfully");
    } catch (error) {
      console.error(`Download RFQ error during ${downloadStage}:`, error);
      toast.error(
        error instanceof Error
          ? `RFQ download failed during ${downloadStage}: ${error.message}`
          : `RFQ download failed during ${downloadStage}.`,
      );
    } finally {
      downloadInProgressRef.current = false;
      setDownloadingVendorId(null);
    }
  };

  const handleIssueRFQ = async () => {
    if (!rfqData || rfqData.status !== "draft") {
      return;
    }

    try {
      setIssuing(true);
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/issue`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        setRfqData((prev) => (prev ? { ...prev, status: "issued" } : prev));
        toast.success("RFQ issued successfully. You can now generate a PO.");
      } else {
        toast.error(data.message || "Failed to issue RFQ");
      }
    } catch (error) {
      console.error("Failed to issue RFQ", error);
      toast.error("Failed to issue RFQ");
    } finally {
      setIssuing(false);
    }
  };

  const canGeneratePurchaseOrder =
    rfqData?.status === "issued" || rfqData?.status === "quoteReceived";

  const toggleVendor = (id: string) => {
    setSelectedVendor((prev) => (prev === id ? null : id));
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleAllItems = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.id));
    }
  };

  const generatePO = () => {
    if (!selectedVendor || selectedItems.length === 0 || !rfqData) return;
    // Store data in localStorage for GeneratePO component
    localStorage.setItem(
      "poData",
      JSON.stringify({
        selectedVendor,
        selectedItems,
        rfqData,
        vendors,
        items,
      }),
    );
    router.push(`/pm/rfqs/${rfqId}/generate-po`);
  };

  return (
    <div className="min-h-screen w-full min-w-0 bg-gray-50 px-4 py-4 sm:px-6 lg:px-8 2xl:px-12 md:py-8">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F1E7A]"></div>
            <span className="ml-2 text-gray-600">Loading RFQ data...</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <button
                type="button"
                aria-label="Go back"
                onClick={() => router.back()}
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-900 text-blue-900 hover:bg-blue-50"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-blue-900">
                VIEW RFQs
              </h1>

              <p className="text-sm text-gray-600 mt-2">
                Choose the approved vendor below to generate the PO
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {rfqData?.status === "draft" && (
                  <button
                    onClick={handleIssueRFQ}
                    disabled={issuing}
                    className="px-5 py-2 rounded-md bg-[#0F1E7A] text-white font-medium disabled:opacity-60"
                  >
                    {issuing ? "Issuing..." : "Issue RFQ"}
                  </button>
                )}
                {!canGeneratePurchaseOrder && (
                  <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
                    Issue the RFQ before generating a PO.
                  </span>
                )}
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Left Section - Vendor Cards */}
              <div className="min-w-0 xl:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="relative min-w-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
                      onClick={() => toggleVendor(vendor.id)}
                    >
                      <div className="absolute top-4 right-4">
                        <div
                          className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                            selectedVendor === vendor.id
                              ? "bg-[#0F1E7A] border-[#0F1E7A]"
                              : "border-gray-300"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleVendor(vendor.id);
                          }}
                        ></div>
                      </div>

                      <div className="min-w-0 space-y-2 pr-8">
                        <div>
                          <span className="font-semibold text-sm">
                            Company Name:{" "}
                          </span>
                          <span className="break-words text-sm">{vendor.companyName}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">
                            Contact Person:{" "}
                          </span>
                          <span className="break-words text-sm">
                            {vendor.contactPerson}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">
                            Phone No.:{" "}
                          </span>
                          <span className="break-words text-sm">{vendor.phoneNo}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">
                            Email Address:{" "}
                          </span>
                          <span className="break-all text-sm">{vendor.emailAddress}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-sm">
                            Address:{" "}
                          </span>
                          <span className="break-words text-sm">{vendor.address}</span>
                        </div>
                      </div>

                      <button
                        className="mt-4 w-full rounded-md border-2 border-blue-900 px-4 py-2 font-semibold text-blue-900 transition-colors hover:bg-blue-900 hover:text-white sm:w-auto disabled:opacity-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadRFQ(vendor.id, vendor.companyName);
                        }}
                        disabled={downloadingVendorId === vendor.id}
                      >
                        {downloadingVendorId === vendor.id ? "Downloading..." : "Download RFQ"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Section - Related Tab */}
              <div className="min-w-0">
                <Related
                  requests={relatedRequests}
                  rfqs={relatedRfqs}
                  pos={relatedPos}
                  onViewItem={(item, type) => {
                    if (type === "request") {
                      router.push(`/pm/requisitions/${item._id}`);
                    } else if (type === "rfq") {
                      router.push(`/pm/rfqs/${item._id}`);
                    } else if (type === "po") {
                      router.push(`/pm/purchase-orders/${item._id}`);
                    }
                  }}
                />
              </div>
            </div>

            <div className="mt-6 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Request Details */}
              <div className="h-auto w-full min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">REQUEST DETAILS</h2>

                  <div className="space-y-3 text-sm text-gray-600 mb-6">
                    <p className="break-words">
                      <span className="font-semibold">RFQ Title:</span>{" "}
                      {rfqData?.title || "N/A"}
                    </p>
                    <p className="break-words">
                      <span className="font-semibold">Location:</span>{" "}
                      {rfqData?.deliveryLocation?.name || "N/A"}
                    </p>
                    <p className="break-words">
                      <span className="font-semibold">
                        Evaluation Criteria:
                      </span>{" "}
                      {rfqData?.evaluationCriteria || "N/A"}
                    </p>
                    <p className="break-words">
                      <span className="font-semibold">
                        Expected Delivery Date:
                      </span>{" "}
                      {rfqData?.expectedDeliveryDate
                        ? new Date(
                            rfqData.expectedDeliveryDate,
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p className="break-words">
                      <span className="font-semibold">Terms of Service:</span>{" "}
                      {rfqData?.termsAndConditions || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="w-full min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm sm:w-auto"
                  >
                    <option value="">Bulk actions</option>
                    <option value="delete">Delete Selected</option>
                    <option value="edit">Edit Selected</option>
                  </select>
                  <button className="w-full rounded-md bg-gray-400 px-6 py-2 font-medium text-white hover:bg-gray-500 sm:w-auto">
                    Apply
                  </button>
                </div>

                <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2">
                        <input
                          type="checkbox"
                          checked={
                            items.length > 0 &&
                            selectedItems.length === items.length
                          }
                          onChange={toggleAllItems}
                          className="w-4 h-4 text-blue-900 rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">
                        Item Description
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">
                        UOM
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">
                        QTY
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-4 px-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleItem(item.id)}
                            className="w-4 h-4 text-blue-900 rounded border-gray-300"
                          />
                        </td>
                        <td className="max-w-[280px] whitespace-normal break-words px-4 py-4 text-sm">
                          {item.itemDescription ||
                            item.detailedSpecification ||
                            "N/A"}
                        </td>
                        <td className="py-4 px-4 text-sm">{item.uom}</td>
                        <td className="py-4 px-4 text-sm">{item.quantity}</td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button className="p-1.5 hover:bg-gray-100 rounded">
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button className="p-1.5 hover:bg-gray-100 rounded">
                              <Trash2 className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 px-4 text-sm text-gray-500 text-center"
                        >
                          No RFQ items were returned for this record.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>

            <div className="my-6 flex flex-col gap-2">
              <button
                onClick={generatePO}
                disabled={
                  !canGeneratePurchaseOrder ||
                  !selectedVendor ||
                  selectedItems.length === 0
                }
                className={`w-full md:w-auto px-8 py-3 rounded-md font-semibold transition-colors ${
                  canGeneratePurchaseOrder &&
                  selectedVendor &&
                  selectedItems.length > 0
                    ? "bg-blue-900 text-white hover:bg-blue-800"
                    : "bg-gray-400 text-white cursor-not-allowed"
                }`}
              >
                {canGeneratePurchaseOrder ? "Generate PO" : "Issue RFQ First"}
              </button>
              {canGeneratePurchaseOrder && (
                <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                  {!selectedVendor && (
                    <span>• Select a vendor from the cards above</span>
                  )}
                  {selectedItems.length === 0 && (
                    <span>• Check at least one item from the items table</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewRFQs;
