"use client";

import { toast } from "sonner";
import EditPOItem from "./EditPOItem";
import { getToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, Upload, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { SLA, slaService } from "@/services/slaService";

interface POItem {
  id: string;
  itemId: string;
  itemDescription: string;
  uom: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  total: number;
  selected: boolean;
  detailsSpecification: string;
  isService?: boolean;
  itemType?: "product" | "service";
}

interface VendorInfo {
  companyName: string;
  contactPerson: string;
  phoneNo: string;
  emailAddress: string;
  address: string;
}

interface VendorCard {
  id: string;
  companyName: string;
  contactPerson: string;
  phoneNo: string;
  emailAddress: string;
  address: string;
  phone?: string;
  email?: string;
}

interface RequestItem {
  id: string;
  itemId: string;
  itemDescription: string;
  detailedSpecification: string;
  uom: string;
  quantity: number;
  expectedDeliveryDate: string;
  itemType?: string;
  lineType?: string;
  isService?: boolean;
}

interface APIVendor {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
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
  vendor: APIVendor | APIVendor[];
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

interface POData {
  selectedVendor: string;
  selectedItems: string[];
  rfqData: RFQData;
  vendors: VendorCard[];
  items: RequestItem[];
}

interface POItemData {
  itemDescription: string;
  brand: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
  detailsSpecification: string;
  isService?: boolean;
  itemType?: "product" | "service";
}

interface Location {
  _id: string;
  name: string;
  address?: string;
  contactPerson: string;
  phoneNumber: string;
}

const GeneratePO = () => {
  const params = useParams<{ rfqId: string }>();
  const router = useRouter();
  const rfqId = params?.rfqId ?? "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [vendorId, setVendorId] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [requisitionId, setRequisitionId] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<POItem | null>(null);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [slas, setSlas] = useState<SLA[]>([]);
  const [selectedSlaId, setSelectedSlaId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  // H5: Multi-file vendor quote upload
  const [vendorQuoteFiles, setVendorQuoteFiles] = useState<File[]>([]);
  // H2: Discount and VAT
  const [discountPct, setDiscountPct] = useState(0);
  const [vatPct, setVatPct] = useState(0);

  const [formData, setFormData] = useState({
    poTitle: "",
    deliveryLocation: "",
    shipping: "",
    deliveryContact: "",
    evaluationCriteria: "",
    termsOfService: "",
    paymentTerms: "",
    slaTitle: "",
    slaContent: "",
  });

  const [items, setItems] = useState<POItem[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setLocations(data);
        } else if (data.success) {
          setLocations(data.data);
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchLocations();
    const fetchSLAs = async () => {
      try {
        const data = await slaService.fetchSLAs();
        setSlas(data);
      } catch (err) {
        console.error("Failed to load SLAs:", err);
      }
    };
    fetchSLAs();

  }, []);

  useEffect(() => {
    const poData = localStorage.getItem("poData");
    if (!poData) {
      router.push("/pm/rfqs");
      return;
    }
    try {
      const parsedData: POData = JSON.parse(poData);
      const {
        selectedVendor,
        selectedItems: selItems,
        rfqData,
        vendors,
        items: reqItems,
      } = parsedData;
      const vendor = vendors.find((v: VendorCard) => v.id === selectedVendor);
      if (!vendor) {
        router.push("/pm/rfqs");
        return;
      }
      setVendorInfo({
        companyName: vendor.companyName,
        contactPerson: vendor.contactPerson,
        phoneNo: vendor.phoneNo || vendor.phone || "",
        emailAddress: vendor.emailAddress || vendor.email || "",
        address: vendor.address,
      });
      setVendorId(selectedVendor);
      setRequisitionId(rfqData.requisition._id);
      const selectedItemDetails: POItem[] = reqItems
        .filter((item: RequestItem) => selItems.includes(item.itemId))
        .map((item: RequestItem): POItem => ({
          id: item.itemId,
          itemId: item.itemId,
          itemDescription: item.itemDescription,
          uom: item.uom,
          brand: "",
          quantity: item.quantity,
          unitPrice: 0,
          total: 0,
          selected: false,
          detailsSpecification: item.detailedSpecification || "",
          itemType:
            item.itemType === "service" ||
            item.lineType === "service" ||
            item.isService === true
              ? "service"
              : "product",
          isService:
            item.isService === true ||
            item.itemType === "service" ||
            item.lineType === "service",
        }));
      setItems(selectedItemDetails);
      setFormData((prev) => ({
        ...prev,
        poTitle: rfqData.title,
        deliveryLocation: rfqData.deliveryLocation?._id || "",
        shipping: rfqData.deliveryLocation?.name || "",
        deliveryContact: "",
        evaluationCriteria: rfqData.evaluationCriteria || "",
        termsOfService: rfqData.termsAndConditions || "",
        paymentTerms: "",
        slaTitle: prev.slaTitle || "",
        slaContent: prev.slaContent || "",
      }));
      if (rfqData.expectedDeliveryDate) {
        setDate(new Date(rfqData.expectedDeliveryDate));
      }
    } catch (error) {
      console.error("Error parsing PO data:", error);
      router.push("/pm/rfqs");
    } finally {
      setLoading(false);
    }
  }, [router]);

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

  const handleSLASelect = (slaId: string) => {
    setSelectedSlaId(slaId);
    if (!slaId || slaId === "none") {
      setFormData((prev) => ({
        ...prev,
        slaTitle: "",
        slaContent: "",
      }));
      return;
    }
    const found = slas.find((s) => (s._id || s.id) === slaId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        slaTitle: found.title || "",
        slaContent: found.content || "",
      }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    if (name === "deliveryLocation") {
      const locName = locations.find((loc) => loc._id === value)?.name || "";
      setFormData((prev) => ({ ...prev, deliveryLocation: value, shipping: locName }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const visibleItems =
    selectedItems.length > 0
      ? items.filter((item) => selectedItems.includes(item.id))
      : items;

  const subtotal = visibleItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * (vatPct / 100);
  const totalAmount = afterDiscount + vatAmount;

  const handleCompletePO = async () => {
    if (!rfqId) return;
    // H6: Validate that total amount is greater than 0 before submission
    if (totalAmount <= 0) {
toast.error("Total amount must be greater than 0. Please fill in unit prices for all items.");
return;
    }
    setSubmitting(true);
    try {
const token = getToken();
const submissionItems = visibleItems.map((item) => {
  const isService = item.itemType === "service" || item.isService === true;
  return {
    itemId: item.itemId || item.id,
    itemDescription: item.itemDescription,
    detailsSpecification: item.detailsSpecification,
    lineType: isService ? "service" : "requisition",
    quantity: isService ? 1 : item.quantity,
    uom: isService ? "service" : item.uom,
    brand: item.brand,
    unitPrice: isService ? item.total : item.unitPrice,
    totalPrice: item.total,
  };
});

const payload = {
  title: formData.poTitle,
  selectedItemIds:
    selectedItems.length > 0 ? selectedItems : visibleItems.map((item) => item.id),
  selectedVendorId: vendorId,
  deliveryDate: date ? format(date, "yyyy-MM-dd") : "",
  deliveryLocation: formData.deliveryLocation,
  deliveryContact: formData.deliveryContact,
  shipping: formData.shipping,
  generalTerms: formData.termsOfService,
  // H3: evaluationCriteria removed from payload
  // evaluationCriteria: formData.evaluationCriteria,
  termsOfService: formData.termsOfService,
  // H2: Include discount/VAT in payload
  discount: discountPct,
  vat: vatPct,
  paymentTerms: formData.paymentTerms,
  sla: formData.slaContent?.trim()
    ? {
        title: formData.slaTitle?.trim() || "Service Level Agreement",
        content: formData.slaContent.trim(),
      }
    : undefined,
  items: submissionItems,
  totalAmount,
};

      const response = await fetch(
        `${API_BASE_URL}/rfqs/${rfqId}/purchase-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (data.success) {
        const newPoId = data.data?._id || data.data?.id;
        if (newPoId && vendorQuoteFiles.length > 0) {
          for (const file of vendorQuoteFiles) {
            const formData = new FormData();
            formData.append("file", file);
            const uploadResponse = await fetch(
              `${API_BASE_URL}/purchase-orders/${newPoId}/attachments`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
              },
            );
            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok || !uploadData.success) {
              throw new Error(uploadData.message || `Failed to upload ${file.name}`);
            }
          }
        }
        if (newPoId) {
          const submitResponse = await fetch(
            `${API_BASE_URL}/purchase-orders/${newPoId}/submit`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
          const submitData = await submitResponse.json();
          if (!submitData.success) {
            toast.error(submitData.message || "PO created but could not be submitted");
          }
        }
        toast.success("Purchase Order created and submitted successfully");
        localStorage.removeItem("poData");
        router.push("/pm/pos");
      } else {
        toast.error(data.message || "Failed to create Purchase Order");
      }
    } catch (error) {
      console.error("Error creating PO:", error);
      toast.error("Failed to create Purchase Order");
    } finally {
      setSubmitting(false);
    }

    /* Old Implementation
    if (!requisitionId || !vendorId) return;
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/requisitions/${requisitionId}/purchase-orders`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: items.map((item) => ({
              name: item.itemDescription,
              description: item.detailsSpecification || "",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.total,
            })),
            totalPrice: totalAmount,
            deliveryDate: date ? format(date, "yyyy-MM-dd") : "",
            paymentTerms: formData.paymentTerms,
            notes: formData.termsOfService,
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Purchase Order created successfully");
        localStorage.removeItem("poData"); // Clean up
        router.push("/pm/pos");
      } else {
        toast.error("Failed to create Purchase Order");
      }
    } catch (error) {
      console.error("Error creating PO:", error);
      toast.error("Failed to create Purchase Order");
    }
    */
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-16 py-4 md:py-8">
      <div className="max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F1E7A]"></div>
            <span className="ml-2 text-gray-600">Loading PO data...</span>
          </div>
        ) : !vendorInfo ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-gray-600">No vendor data available.</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-blue-900 text-blue-900 hover:bg-blue-50 mb-4"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-blue-900">
                GENERATE PO
              </h1>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6 shadow-sm">
              <div className="flex gap-2 justify-between mb-4">
                {/* H1: Add Line Item button */}
                <Button
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="bg-[#0F1E7A] text-white hover:bg-blue-800"
                >
                  + Add Line Item
                </Button>
                <div className="flex gap-2">
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-40 bg-white">
                      <SelectValue placeholder="Bulk actions" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="delete" className="focus:bg-[#0F1E7A]/10">Delete Selected</SelectItem>
                      <SelectItem value="edit" className="focus:bg-[#0F1E7A]/10">Edit Selected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" className="bg-gray-400 text-white hover:bg-gray-500">
                    Apply
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2">
                        <Checkbox
                          checked={items.length > 0 && selectedItems.length === items.length}
                          onCheckedChange={(checked) => checked ? setSelectedItems(items.map(i => i.id)) : setSelectedItems([])}
                          className="data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:border-[#0F1E7A]"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Item Description</th>
                      {/* H7/H8: Item Type column for product/service distinction */}
                      <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Brand</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">QTY</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">UOM</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Unit Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Total</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const isService = item.itemType === "service";
                      return (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-4 px-2">
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => toggleItem(item.id)}
                              className="data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:border-[#0F1E7A]"
                            />
                          </td>
                          <td className="py-4 px-4 text-sm">{item.itemDescription}</td>
                          <td className="py-4 px-4 text-sm capitalize">{item.itemType || "product"}</td>
                          <td className="py-4 px-4 text-sm">{item.brand}</td>
                          {/* H8: Conditionally hide Qty/UOM/Unit Price for service items */}
                          <td className="py-4 px-4 text-sm">
                            {isService ? <span className="text-gray-400">—</span> : item.quantity}
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {isService ? <span className="text-gray-400">—</span> : item.uom}
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {isService ? <span className="text-gray-400">—</span> : `₦${item.unitPrice.toLocaleString()}`}
                          </td>
                          <td className="py-4 px-4 text-sm">₦{item.total.toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <Edit2 className="w-4 h-4 text-blue-900" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  setItems((prev) => prev.filter((i) => i.id !== item.id))
                                }
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Section - Form */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm">
                <div className="space-y-4">
                  {/* PO Title */}
                  <div className="space-y-2">
                    <Label>
                      PO Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      name="poTitle"
                      value={formData.poTitle}
                      onChange={handleInputChange}
                      className="bg-white"
                    />
                  </div>

                  {/* Delivery Location */}
                  <div className="space-y-2">
                    <Label>
                      Delivery Location <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.deliveryLocation}
                      onValueChange={(value) => {
                        const locName = locations.find((loc) => loc._id === value)?.name || "";
                        setFormData((prev) => ({ ...prev, deliveryLocation: value, shipping: locName }));
                      }}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select Location" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {/* H9: Show location name + address */}
                        {locations.map((loc) => (
                          <SelectItem
                            key={loc._id}
                            value={loc._id}
                            className="data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white focus:bg-[#0F1E7A]/10"
                          >
                            {loc.name}{loc.address ? ` — ${loc.address}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delivery Contact */}
                  <div className="space-y-2">
                    <Label>
                      Delivery Contact <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.deliveryContact}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, deliveryContact: value }))}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select Delivery Contact" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {locations.map((loc) => (
                          <SelectItem
                            key={loc._id}
                            value={`${loc.contactPerson[0].toUpperCase() + loc.contactPerson.slice(1)} - ${loc.phoneNumber}`}
                            className="data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white focus:bg-[#0F1E7A]/10"
                          >
                            {loc.contactPerson} - {loc.phoneNumber || "N/A"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* H3: Evaluation Criteria commented out — not applicable at PO stage
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Evaluation Criteria
                    </label>
                    <textarea
                      name="evaluationCriteria"
                      value={formData.evaluationCriteria}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  */}

                  {/* Expected Delivery Date */}
                  <div className="space-y-2">
                    <Label>
                      Expected Delivery Date{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-between text-left font-normal px-4 py-2 border border-gray-300 rounded-md text-sm h-auto hover:bg-transparent bg-white",
                            !date && "text-muted-foreground",
                          )}
                        >
                          {date ? (
                            format(date, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="mr-2 h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 bg-white"
                        align="center"
                      >
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          classNames={{
                            day_selected:
                              "!bg-[#0F1E7A] !text-white hover:!bg-[#0F1E7A] hover:!text-white focus:!bg-[#0F1E7A] focus:!text-white",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Terms of Service */}
                  <div className="space-y-2">
                    <Label>Terms of Service</Label>
                    <Textarea
                      name="termsOfService"
                      value={formData.termsOfService}
                      onChange={handleInputChange}
                      rows={3}
                      className="bg-white"
                    />
                  </div>

                  {/* Payment Terms */}
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Textarea
                      name="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={handleInputChange}
                      rows={3}
                      className="bg-white"
                    />
                  </div>

                  {/* Service Level Agreement (SLA) */}
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <Label className="text-base font-semibold text-[#0F1E7A]">
                        Service Level Agreement (SLA)
                      </Label>
                      <span className="text-xs text-gray-500">Optional</span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600 font-medium">Predefined SLA Template</Label>
                      <Select
                        value={selectedSlaId}
                        onValueChange={handleSLASelect}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose a predefined SLA template..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="none">-- Custom / None --</SelectItem>
                          {slas.map((s) => (
                            <SelectItem key={s._id || s.id} value={s._id || s.id || ""}>
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600 font-medium">Agreement Terms & Conditions</Label>
                      <Textarea
                        name="slaContent"
                        value={formData.slaContent}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Enter or modify the Service Level Agreement (SLA)..."
                        className="bg-white"
                      />
                      <p className="text-xs text-gray-500 italic">
                        Note: Selecting an SLA template populates this field. Modifications made here apply only to this Purchase Order and do not alter the saved template in the database.
                      </p>
                    </div>
                  </div>

                  {/* H5: Multi-file vendor quote upload */}
                  <div className="space-y-2">
                    <Label>
                      Upload Vendor&apos;s Quote(s){" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative border border-gray-300 rounded-md px-4 py-2 bg-white">
                      <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-500 flex-1 truncate">
                          {vendorQuoteFiles.length > 0
                            ? `${vendorQuoteFiles.length} file(s) selected`
                            : "Upload files"}
                        </span>
                      </div>
                      <input
                        type="file"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files) {
                            setVendorQuoteFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                    </div>
                    {vendorQuoteFiles.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {vendorQuoteFiles.map((f, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-center justify-between">
                            <span className="truncate">{f.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setVendorQuoteFiles((prev) =>
                                  prev.filter((_, idx) => idx !== i),
                                )
                              }
                              className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* H2: Discount and VAT fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Discount (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={discountPct}
                        onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>VAT (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={vatPct}
                        onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
                        className="bg-white"
                      />
                    </div>
                  </div>

                  {/* H2 + H6: Total Amount with discount/VAT breakdown */}
                  <div className="space-y-2 bg-gray-50 rounded-md p-3 border border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span>₦ {subtotal.toLocaleString()}</span>
                    </div>
                    {discountPct > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount ({discountPct}%)</span>
                        <span className="text-red-600">-₦ {discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {vatPct > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">VAT ({vatPct}%)</span>
                        <span>+₦ {vatAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-300 pt-2">
                      <span>Total Amount</span>
                      <span>₦ {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section - Vendor Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 shadow-sm h-fit">
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-sm">
                      Company Name:{" "}
                    </span>
                    <span className="text-sm">{vendorInfo.companyName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-sm">
                      Contact Person:{" "}
                    </span>
                    <span className="text-sm">{vendorInfo.contactPerson}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-sm">Phone No.: </span>
                    <span className="text-sm">{vendorInfo.phoneNo}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-sm">
                      Email Address:{" "}
                    </span>
                    <span className="text-sm">{vendorInfo.emailAddress}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-sm">Address: </span>
                    <span className="text-sm">{vendorInfo.address}</span>
                  </div>
                  {/* <div className="pt-2">
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Edit2 className="w-4 h-4 text-blue-900" />
                    </button>
                  </div> */}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full md:max-w-md flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleCompletePO}
                disabled={submitting}
                className="flex-1 py-6 bg-[#0F1E7A] text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Complete PO"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="destructive"
                className="flex-1 py-6"
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
      {/* EditPOItem modal for editing existing line items */}
      <EditPOItem
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={(itemData) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === editingItem?.id
                ? {
                    ...i,
                    ...itemData,
                    total: itemData.totalPrice,
                    itemType: (itemData as any).itemType || i.itemType,
                    isService:
                      (itemData as any).itemType === "service" ||
                      itemData.isService === true,
                  }
                : i,
            ),
          );
        }}
        itemData={
          editingItem
            ? {
                itemDescription: editingItem.itemDescription,
                brand: editingItem.brand,
                quantity: editingItem.quantity,
                uom: editingItem.uom,
                unitPrice: editingItem.unitPrice,
                totalPrice: editingItem.total,
                detailsSpecification: editingItem.detailsSpecification,
                itemType:
                  editingItem.itemType ||
                  (editingItem.isService ? "service" : "product"),
              }
            : undefined
        }
      />

      {/* H1: Add Line Item modal — reuse EditPOItem with empty data */}
      <EditPOItem
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onUpdate={(itemData) => {
          const newItem: POItem = {
            id: Date.now().toString(),
            itemId: Date.now().toString(),
            itemDescription: itemData.itemDescription,
            brand: itemData.brand,
            quantity: itemData.quantity,
            uom: itemData.uom,
            unitPrice: itemData.unitPrice,
            total: itemData.totalPrice,
            selected: false,
            detailsSpecification: itemData.detailsSpecification,
            itemType: (itemData as any).itemType || "product",
            isService:
              (itemData as any).itemType === "service" ||
              itemData.isService === true,
          };
          setItems((prev) => [...prev, newItem]);
        }}
        itemData={undefined}
      />
    </div>
  );
};

export default GeneratePO;
