import React, { useState, useRef, useEffect } from "react";
import {
  CalendarIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";
import { RequestData } from "../types";

interface VendorCategory {
  _id: string;
  name: string;
  description: string;
}

interface PMApprovalFormProps {
  requisitionId: string;
  formData: RequestData;
  onActionSuccess?: () => void;
}

export default function PMCommentForm({
  formData,
  requisitionId,
  onActionSuccess,
}: PMApprovalFormProps) {
  const token = getToken();
  const [bidStart, setBidStart] = useState<Date>();
  const [bidDeadline, setBidDeadline] = useState<Date>();
  const [vendorCategory, setVendorCategory] = useState<string>("");
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>(
    []
  );
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [errors, setErrors] = useState({
    bidStart: "",
    bidDeadline: "",
    vendorCategory: "",
    additionalInfo: "",
    dateRange: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const [submitStatus, setSubmitStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    const fetchVendorCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/vendor-categories`);
        if (response.ok) {
          const data = await response.json();
          setVendorCategories(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch vendor categories:", error);
      }
    };
    fetchVendorCategories();
  }, []);

  const validateForm = () => {
    const newErrors = {
      bidStart: "",
      bidDeadline: "",
      vendorCategory: "",
      additionalInfo: "",
      dateRange: "",
    };
    let isValid = true;

    // Validate Bid Start
    if (!bidStart) {
      newErrors.bidStart = "Bid start date is required";
      isValid = false;
    }

    // Validate Bid Deadline
    if (!bidDeadline) {
      newErrors.bidDeadline = "Bid deadline is required";
      isValid = false;
    }

    // Validate Vendor Category
    if (!vendorCategory) {
      newErrors.vendorCategory = "Vendor category is required";
      isValid = false;
    }

    // Validate Additional Information
    const textContent = editorRef.current?.textContent || "";
    if (!textContent.trim()) {
      newErrors.additionalInfo = "Additional information is required";
      isValid = false;
    } else if (textContent.trim().length < 10) {
      newErrors.additionalInfo =
        "Additional information must be at least 10 characters";
      isValid = false;
    }

    // Validate date range
    if (bidStart && bidDeadline) {
      if (bidDeadline <= bidStart) {
        newErrors.dateRange =
          "Bid deadline date must be at least 24 hours after bid start date";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handlePublish = async () => {
    // Clear previous status
    setSubmitStatus({ type: "", message: "" });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/requisitions/${requisitionId}/initiate-bidding`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            biddingStartDate: bidStart?.toISOString(),
            biddingDeadline: bidDeadline?.toISOString(),
            vendorCategoryId: vendorCategory,
            additionalInfo: editorRef.current?.innerHTML || "",

            // selectedVendorIds: [
            //   "5f7b1a9b9c9d440000a1b1c2",
            //   "5f7b1a9b9c9d440000a1b1c3",
            // ],

            // biddingMessage:
            //   "Please submit your best competitive pricing for this requisition.",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      toast.success(data.message || "Request published successfully!");
      onActionSuccess?.();

      // Reset form
      setBidStart(undefined);
      setBidDeadline(undefined);
      setVendorCategory("");
      setAdditionalInfo("");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
      setErrors({
        bidStart: "",
        bidDeadline: "",
        vendorCategory: "",
        additionalInfo: "",
        dateRange: "",
      });
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message:
          (error as Error).message ||
          "Failed to publish request. Please try again.",
      });
      toast.error((error as Error).message || "Failed to publish request.");
    } finally {
      setIsSubmitting(false);
      setShowPublishModal(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Replace with your actual cancel endpoint and payload
      const response = await fetch(
        `${API_BASE_URL}/requisitions/${requisitionId}/cancel`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Cancellation failed.");

      toast.success(data.message || "Request cancelled successfully.");
      setShowCancelModal(false);
      setCancelReason("");
      onActionSuccess?.();
    } catch (error) {
      toast.error((error as Error).message || "Failed to cancel request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full mx-auto p-4 rounded-md shadow-md bg-white">
      <h1 className="text-base font-semibold mb-8 text-[#121212]">
        Important Information
      </h1>

      <div className="space-y-6">
        {/* Status Alert */}
        {submitStatus.message && (
          <Alert
            className={
              submitStatus.type === "success"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }
          >
            <AlertDescription
              className={
                submitStatus.type === "success"
                  ? "text-green-800"
                  : "text-red-800"
              }
            >
              {submitStatus.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Date Range Error */}
        {errors.dateRange && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {errors.dateRange}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* Bid Start */}
          <div className="w-full lg:w-1/2 space-y-2">
            <Label>Bid Start</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-between text-left font-normal bg-white border border-[#9f9f9f] rounded-xl p-4 h-auto shadow-sm",
                    !bidStart && "text-muted-foreground",
                    errors.bidStart && "border-red-500"
                  )}
                >
                  {bidStart ? format(bidStart, "PPP") : "Select date"}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white" align="start">
                <Calendar
                  mode="single"
                  selected={bidStart}
                  onSelect={(date) => {
                    setBidStart(date);
                    setErrors((prev) => ({
                      ...prev,
                      bidStart: "",
                      dateRange: "",
                    }));
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.bidStart && (
              <p className="text-red-500 text-sm mt-1">{errors.bidStart}</p>
            )}
          </div>

          {/* Bid Deadline */}
          <div className="w-full lg:w-1/2 space-y-2">
            <Label>Bid Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-between text-left font-normal bg-white border border-[#9f9f9f] rounded-xl p-4 h-auto shadow-sm",
                    !bidDeadline && "text-muted-foreground",
                    errors.bidDeadline && "border-red-500"
                  )}
                >
                  {bidDeadline ? format(bidDeadline, "PPP") : "Select date"}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white" align="start">
                <Calendar
                  mode="single"
                  selected={bidDeadline}
                  onSelect={(date) => {
                    setBidDeadline(date);
                    setErrors((prev) => ({
                      ...prev,
                      bidDeadline: "",
                      dateRange: "",
                    }));
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.bidDeadline && (
              <p className="text-red-500 text-sm mt-1">{errors.bidDeadline}</p>
            )}
          </div>
        </div>

        {/* Vendor Category */}
        <div className="space-y-2">
          <Label>Vendor Category</Label>
          <Select
            value={vendorCategory}
            onValueChange={(value) => {
              setVendorCategory(value);
              setErrors((prev) => ({ ...prev, vendorCategory: "" }));
            }}
          >
            <SelectTrigger
              className={cn(
                "w-full bg-white border border-[#9f9f9f] rounded-xl p-4 h-auto shadow-sm",
                errors.vendorCategory && "border-red-500"
              )}
            >
              <SelectValue placeholder="Select vendor category" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {vendorCategories.map((category) => (
                <SelectItem
                  key={category._id}
                  value={category._id}
                  className="hover:bg-[#0F1E7A] hover:text-white focus:bg-[#0F1E7A] focus:text-white data-[highlighted]:bg-[#0F1E7A] data-[highlighted]:text-white"
                >
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vendorCategory && (
            <p className="text-red-500 text-sm mt-1">{errors.vendorCategory}</p>
          )}
        </div>

        {/* Additional Information */}
        <div className="space-y-2">
          <Label>Additional Information</Label>
          <div
            className={`border rounded-xl shadow-sm ${
              errors.additionalInfo ? "border-red-500" : "border-[#9f9f9f]"
            }`}
          >
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-gray-200">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  document.execCommand("bold", false);
                  setActiveFormats((prev) => ({ ...prev, bold: !prev.bold }));
                }}
                className={`h-8 w-8 p-0 ${
                  activeFormats.bold
                    ? "bg-[#0F1E7A] text-white hover:bg-[#0F1E7A]/90"
                    : ""
                }`}
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  document.execCommand("italic", false);
                  setActiveFormats((prev) => ({
                    ...prev,
                    italic: !prev.italic,
                  }));
                }}
                className={`h-8 w-8 p-0 ${
                  activeFormats.italic
                    ? "bg-[#0F1E7A] text-white hover:bg-[#0F1E7A]/90"
                    : ""
                }`}
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  document.execCommand("underline", false);
                  setActiveFormats((prev) => ({
                    ...prev,
                    underline: !prev.underline,
                  }));
                }}
                className={`h-8 w-8 p-0 ${
                  activeFormats.underline
                    ? "bg-[#0F1E7A] text-white hover:bg-[#0F1E7A]/90"
                    : ""
                }`}
              >
                <Underline className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  document.execCommand("insertUnorderedList", false)
                }
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => document.execCommand("insertOrderedList", false)}
                className="h-8 w-8 p-0"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </div>
            {/* Editor */}
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[200px] p-3 outline-none"
              style={{ wordBreak: "break-word" }}
              onInput={(e) => {
                setAdditionalInfo(e.currentTarget.innerHTML);
                setErrors((prev) => ({ ...prev, additionalInfo: "" }));
              }}
              onMouseUp={() => {
                setActiveFormats({
                  bold: document.queryCommandState("bold"),
                  italic: document.queryCommandState("italic"),
                  underline: document.queryCommandState("underline"),
                });
              }}
              onKeyUp={() => {
                setActiveFormats({
                  bold: document.queryCommandState("bold"),
                  italic: document.queryCommandState("italic"),
                  underline: document.queryCommandState("underline"),
                });
              }}
              suppressContentEditableWarning={true}
            />
          </div>
          {errors.additionalInfo && (
            <p className="text-red-500 text-sm mt-1">{errors.additionalInfo}</p>
          )}
        </div>

        {formData.status === "departmentApproved" && (
          <div className="flex items-center justify-center gap-6 px-auto lg:px-32 mt-8">
            <Button
              onClick={() => {
                if (validateForm()) {
                  setShowPublishModal(true);
                }
              }}
              className="bg-[#0F1E7A] hover:bg-[#0b154b] text-white flex-1 py-6"
            >
              Publish Request
            </Button>

            <Button
              onClick={() => setShowCancelModal(true)}
              className="bg-red-500 hover:bg-red-700 text-white flex-1 py-6"
            >
              Cancel Request
            </Button>
          </div>
        )}
      </div>

      {/* Publish Confirmation Modal */}
      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Publish</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Vendors will be able to see this request. Are you sure you want to
              publish?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPublishModal(false)}
            >
              Back
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Publishing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Cancel Request</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="cancelReason">Reason for Cancellation</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Back
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
