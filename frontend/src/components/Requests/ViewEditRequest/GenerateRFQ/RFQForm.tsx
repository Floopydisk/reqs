"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarIcon,
  Plus,
  ChevronsUpDown,
  Check,
  X,
  SquarePen,
  Trash,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { parseDate } from "@/lib/parseDate";
import { Vendor } from "../../types";
import { useState } from "react";
import AddVendorDialog from "@/components/Vendor/AddVendorDialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

interface Location {
  _id: string;
  name: string;
}

interface SuggestedVendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
}

interface SelectedVendor {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
}

interface Item {
  _id: string;
  units: number | "";
  UOM?: string;
  recommendedVendor?: string;
}

interface RFQFormProps {
  rfqTitle: string;
  setRfqTitle: (title: string) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  locations: Location[];
  locationsLoading: boolean;
  mydateStart: string;
  setMydateStart: (date: string) => void;
  dateStart: Date | undefined;
  setDateStart: (date: Date | undefined) => void;
  monthStart: Date | undefined;
  setMonthStart: (month: Date | undefined) => void;
  openStart: boolean;
  setOpenStart: (open: boolean) => void;
  vendors: Vendor[];
  vendorsLoading: boolean;
  selectedVendor: string;
  setSelectedVendor: (vendor: string) => void;
  comboboxOpen: boolean;
  setComboboxOpen: (open: boolean) => void;
  handleCompleteRFQ: () => void;
  items: Item[];
  recommendedVendors?: Vendor[];
  selectedItems: string[];
  requisitionId: string;
  onVendorAdded?: () => void;
}

function formatDate(date: Date | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function RFQForm({
  rfqTitle,
  setRfqTitle,
  selectedLocation,
  setSelectedLocation,
  locations,
  locationsLoading,
  mydateStart,
  setMydateStart,
  dateStart,
  setDateStart,
  monthStart,
  setMonthStart,
  openStart,
  setOpenStart,
  vendors,
  vendorsLoading,
  selectedVendor,
  setSelectedVendor,
  comboboxOpen,
  setComboboxOpen,
  handleCompleteRFQ,
  items,
  recommendedVendors = [],
  selectedItems,
  requisitionId,
  onVendorAdded,
}: RFQFormProps) {
  const router = useRouter();
  const [selectedVendors, setSelectedVendors] = useState<SelectedVendor[]>([]);
  const [evaluationCriteria, setEvaluationCriteria] = useState("");
  const [termsOfService, setTermsOfService] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert recommended vendors to suggested vendors format, filtering out selected ones
  const suggestedVendors: SuggestedVendor[] = recommendedVendors
    .filter((vendor) => !selectedVendors.some((sv) => sv.id === vendor._id))
    .map((vendor) => ({
      id: vendor._id,
      name: vendor.name,
      contact: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
    }));

  const addVendorToSelected = (vendor: SuggestedVendor) => {
    if (!selectedVendors.some((sv) => sv.id === vendor.id)) {
      setSelectedVendors((prev) => [...prev, vendor]);
    }
  };

  const handleVendorAdded = (newVendor?: Vendor) => {
    if (onVendorAdded) {
      onVendorAdded();
    }
    if (newVendor) {
      const vendorToAdd: SelectedVendor = {
        id: newVendor._id,
        name: newVendor.name,
        contact: newVendor.contactPerson,
        phone: newVendor.phone,
        email: newVendor.email,
        address: newVendor.address,
      };
      setSelectedVendors((prev) => [...prev, vendorToAdd]);
    }
  };

  const removeSelectedVendor = (id: string) => {
    setSelectedVendors((prev) => prev.filter((vendor) => vendor.id !== id));
  };

  const issueRfqRecords = async (rfqIds: string[]) => {
    if (rfqIds.length === 0) {
      throw new Error("No RFQ IDs were returned for issuing");
    }

    const token = getToken();
    const endpoint =
      rfqIds.length === 1
        ? `${API_BASE_URL}/rfqs/${rfqIds[0]}/issue`
        : `${API_BASE_URL}/rfqs/issue-multiple`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: rfqIds.length === 1 ? undefined : JSON.stringify({ rfqIds }),
    });

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to issue RFQ(s)");
      }
      return data;
    }

    const text = await response.text();
    throw new Error(text || "Failed to issue RFQ(s)");
  };

  const handleCompleteRFQSubmit = async () => {
    // Validation
    if (!rfqTitle.trim()) {
      toast.error("RFQ Title is required");
      return;
    }
    if (!selectedLocation) {
      toast.error("Location is required");
      return;
    }
    if (!evaluationCriteria.trim()) {
      toast.error("Evaluation Criteria is required");
      return;
    }
    if (!dateStart) {
      toast.error("Expected Delivery Date is required");
      return;
    }
    if (!termsOfService.trim()) {
      toast.error("Terms of Service is required");
      return;
    }
    if (selectedVendors.length === 0) {
      toast.error("At least one vendor must be selected");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getToken();
      const payload = {
        vendors: selectedVendors.map((v) => v.id),
        itemIds: selectedItems,
        items: items
          .filter((item) => selectedItems.includes(item._id))
          .map((item) => ({
            itemId: item._id,
            quantity: item.units || 0,
            ...(item.UOM && { uom: item.UOM }),
          })),
        evaluationCriteria,
        termsOfService,
        title: rfqTitle,
        deliveryLocation: selectedLocation,
        expectedDeliveryDate: dateStart.toISOString().split("T")[0],
      };

      const response = await fetch(
        `${API_BASE_URL}/requisitions/${requisitionId}/rfqs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        const match = text.match(/<pre>\s*([\s\S]*?)\s*<\/pre>/i);
        let errorMessage = match ? match[1].replace(/<br>|&nbsp;/gi, " ").trim() : text;
        errorMessage = errorMessage.split(" at ")[0].trim();
        data = { success: false, message: errorMessage };
      }

      if (data.success) {
        const createdRfqIds = Array.isArray(data.data)
          ? data.data
              .map((rfq: { _id?: string; id?: string }) => rfq._id || rfq.id)
              .filter(Boolean)
          : data.data
            ? [data.data._id || data.data.id].filter(Boolean)
            : [];

        await issueRfqRecords(createdRfqIds);

        toast.success(
          createdRfqIds.length > 1
            ? "RFQs generated and issued successfully!"
            : "RFQ generated and issued successfully!",
        );
        router.push("/pm/rfqs");
      } else {
        toast.error(data.message || "Failed to generate RFQ");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while generating RFQ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 my-5 rounded-md shadow-md bg-white">
      <div className="space-y-2">
        <Label>
          RFQ Title <span className="text-red-500 -ml-1">*</span>
        </Label>
        <Input
          value={rfqTitle}
          onChange={(e) => setRfqTitle(e.target.value)}
          className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>
          Location<span className="text-red-500 -ml-1">*</span>
        </Label>
        <Select
          value={selectedLocation}
          onValueChange={setSelectedLocation}
          disabled={locationsLoading}
          required
        >
          <SelectTrigger className="w-full bg-white border border-[#9f9f9f]">
            <SelectValue
              placeholder={locationsLoading ? "Loading..." : "Select Location"}
            />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {locations.map((location) => (
              <SelectItem
                key={location._id}
                value={location._id}
                className="hover:bg-gray-100 data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white"
              >
                {location.name.charAt(0).toUpperCase() + location.name.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>
          Evaluation Criteria<span className="text-red-500 -ml-1">*</span>
        </Label>
        <Textarea
          id="criteria"
          value={evaluationCriteria}
          onChange={(e) => setEvaluationCriteria(e.target.value)}
          className="min-h-[100px] rounded-xl border border-[#9f9f9f] shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>
          Expected Delivery Date
          <span className="text-red-500 -ml-1">*</span>
        </Label>
        <div className="relative flex gap-2">
          <Input
            id="date-start"
            value={mydateStart}
            placeholder="Select date"
            className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm pr-10"
            onChange={(e) => {
              setMydateStart(e.target.value);
              const date = parseDate(e.target.value);
              if (date) {
                setDateStart(date);
                setMonthStart(date);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpenStart(true);
              }
            }}
          />
          <Popover open={openStart} onOpenChange={setOpenStart}>
            <PopoverTrigger asChild>
              <Button
                id="date-picker-start"
                variant="ghost"
                className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              >
                <CalendarIcon className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden bg-white p-0"
              align="end"
            >
              <Calendar
                mode="single"
                selected={dateStart}
                captionLayout="dropdown"
                month={monthStart}
                onMonthChange={setMonthStart}
                onSelect={(date) => {
                  setDateStart(date);
                  setMydateStart(formatDate(date));
                  setOpenStart(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="itemDescription">
          Terms of Service <span className="text-red-500 -ml-1">*</span>
        </Label>
        <Textarea
          id="itemDescription"
          name="itemDescription"
          value={termsOfService}
          onChange={(e) => setTermsOfService(e.target.value)}
          className="min-h-[100px] rounded-xl border border-[#9f9f9f] shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">VENDOR INFORMATION</h2>
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="flex-1 justify-between bg-white hover:bg-white border border-[#9f9f9f] min-w-0"
                >
                  <span className="truncate">
                    {selectedVendor
                      ? vendors.find((vendor) => vendor._id === selectedVendor)
                          ?.name
                      : vendorsLoading
                      ? "Loading vendors..."
                      : "Choose a vendor"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-3rem)] sm:w-[350px] p-0 bg-white" align="start">
                <Command>
                  <CommandInput placeholder="Search vendor..." />
                  <CommandList>
                    <CommandEmpty>No vendor found.</CommandEmpty>
                    <CommandGroup>
                      {vendors.map((vendor) => (
                        <CommandItem
                          key={vendor._id}
                          value={vendor.name}
                          onSelect={() => {
                            setSelectedVendor(
                              vendor._id === selectedVendor ? "" : vendor._id
                            );
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedVendor === vendor._id
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          {vendor.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              className="bg-[#0F1E7A] hover:bg-[#0b154b] text-white cursor-pointer shrink-0 px-5"
              onClick={() => {
                if (selectedVendor) {
                  const vendor = vendors.find((v) => v._id === selectedVendor);
                  if (
                    vendor &&
                    !selectedVendors.find((sv) => sv.id === vendor._id)
                  ) {
                    const newVendor = {
                      id: vendor._id,
                      name: vendor.name,
                      contact: vendor.contactPerson,
                      phone: vendor.phone,
                      email: vendor.email,
                      address: vendor.address,
                    };
                    setSelectedVendors((prev) => [...prev, newVendor]);
                    setSelectedVendor("");
                  }
                }
              }}
            >
              Add
            </Button>
          </div>

          <div className="shrink-0 flex justify-end items-center">
            <AddVendorDialog
              onVendorAdded={handleVendorAdded}
              trigger={
                <Button className="bg-[#0F1E7A] hover:bg-[#0b154b] text-white cursor-pointer w-full sm:w-auto">
                  <Plus size={22} className="mr-1" /> New Vendor
                </Button>
              }
            />
          </div>
        </div>

        {suggestedVendors.length > 0 && (
          <div className="vendor-suggestions my-3">
            <p className="text-base font-normal">
              {suggestedVendors.length === 1
                ? `Suggested Vendor`
                : `Suggested Vendors`}
            </p>

            <div className="suggestions w-full flex items-center gap-5 pt-1 pb-4 overflow-x-auto">
              {suggestedVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="w-fit flex-shrink-0 flex flex-col gap-2 border border-gray-200 rounded-md shadow-sm hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                  onClick={() => addVendorToSelected(vendor)}
                >
                  <div className="p-3">
                    <h4 className="font-bold whitespace-nowrap">
                      {vendor.name}
                    </h4>
                    <p className="whitespace-nowrap">{vendor.contact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedVendors.length > 0 && (
          <div className="selected-vendors w-full flex flex-col gap-4 my-3">
            {selectedVendors.map((vendor, index) => (
              <div
                key={vendor.id}
                className={`vendor-selected-${
                  index + 1
                } w-full flex flex-col gap-3 p-3 border border-gray-200 rounded-md shadow-sm text-sm font-bold`}
              >
                <p>
                  Company Name:{" "}
                  <span className="font-normal">{vendor.name}</span>
                </p>
                <p>
                  Contact Person:{" "}
                  <span className="font-normal">{vendor.contact}</span>
                </p>
                <p>
                  Phone No.: <span className="font-normal">{vendor.phone}</span>
                </p>
                <p>
                  Email Address:{" "}
                  <span className="font-normal">{vendor.email}</span>
                </p>
                <p>
                  Address: <span className="font-normal">{vendor.address}</span>
                </p>

                <div className="selected-vendor-action-buttons flex flex-row justify-start items-center">
                  <div className="flex gap-2">
                    {/* G1: Edit icon removed — vendor details are not editable at RFQ stage
                    <div className="cursor-pointer">
                      <SquarePen size={20} color="#0F1E7A" />
                    </div>
                    */}
                    <div
                      className="cursor-pointer"
                      onClick={() => removeSelectedVendor(vendor.id)}
                    >
                      <Trash size={20} color="#ED3237" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-6">
        <Button
          type="button"
          onClick={handleCompleteRFQSubmit}
          disabled={isSubmitting}
          className="font-bold text-base bg-[#0F1E7A] hover:bg-[#0b154b] text-white py-6 px-10"
        >
          {isSubmitting ? "Generating..." : "Complete RFQ"}
        </Button>

        <Button
          type="button"
          className="font-bold text-base bg-red-600 hover:bg-red-700 text-white py-6 px-10"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
