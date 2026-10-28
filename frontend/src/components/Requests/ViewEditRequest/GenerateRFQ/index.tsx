"use client";
// import { Item, Vendor } from "../types";
import { getToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import RFQForm from "./RFQForm";
import RequestDetails from "./RequestDetails";
import EditItemDialog from "./EditItemDialog";
import LoadingDialog from "./LoadingDialog";
import { Item, Vendor } from "../../types";

interface Location {
  _id: string;
  name: string;
}

interface RequestData {
  _id: string;
  title: string;
  deliveryLocation: string;
  deliveryDate?: string;
  items?: Item[];
}

function formatDate(date: Date | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const GenerateRFQ = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const requisitionId = params?.requisitionId as string;

  const today = new Date();
  const [rfqTitle, setRfqTitle] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openStart, setOpenStart] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [mydateStart, setMydateStart] = useState(formatDate(today));
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [dateStart, setDateStart] = useState<Date | undefined>(today);
  const [monthStart, setMonthStart] = useState<Date | undefined>(today);
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [dialogSelectedItems, setDialogSelectedItems] = useState<string[]>([]);
  const [recommendedVendors, setRecommendedVendors] = useState<Vendor[]>([]);
  const selectedItemsParam = searchParams?.get("selectedItems");

  const fetchVendors = useCallback(async () => {
    setVendorsLoading(true);
    const token = getToken();
    try {
      let allVendors: Vendor[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await fetch(
          `${API_BASE_URL}/vendors?page=${currentPage}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await response.json();
        if (data.success) {
          allVendors = [...allVendors, ...data.data];
          totalPages = data.pagination.pages;
          currentPage++;
        } else {
          break;
        }
      } while (currentPage <= totalPages);

      // Merge with existing recommended vendors to ensure they aren't lost
      const vendorIds = new Set(allVendors.map((v) => v._id));
      const uniqueRecommended = recommendedVendors.filter(
        (v) => !vendorIds.has(v._id),
      );
      setVendors([...allVendors, ...uniqueRecommended]);
    } catch (error) {
      console.error("Failed to fetch vendors", error);
    } finally {
      setVendorsLoading(false);
    }
  }, [recommendedVendors]);

  useEffect(() => {
    // Check if requisitionId exists and selectedItems are provided
    if (!requisitionId || !selectedItemsParam) {
      toast.error("Invalid requisition ID or no items selected.");
      router.push("/pm/requisitions");
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      const token = getToken();

      // Fetch locations
      try {
        const response = await fetch(`${API_BASE_URL}/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data) {
          setLocations(data);
        }
      } catch (error) {
        console.error("Failed to fetch locations", error);
      } finally {
        setLocationsLoading(false);
      }

      // Fetch vendors
      await fetchVendors();

      // Fetch requisition details
      try {
        const res = await fetch(
          `${API_BASE_URL}/requisitions/${requisitionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (data.success) {
          const req = data.data;
          console.log("Requisition details fetched:", req);
          setRequestData(req);
          setRfqTitle(req.title);
          setSelectedLocation(req.deliveryLocation);

          if (req.deliveryDate) {
            const deliveryDate = new Date(req.deliveryDate);
            setDateStart(deliveryDate);
            setMydateStart(formatDate(deliveryDate));
            setMonthStart(deliveryDate);
          }

          if (req.items) {
            setItems(req.items);

            // Extract recommended vendors and merge with existing vendors
            const recommendedVendors: Vendor[] = [];
            req.items.forEach((item: Item) => {
              if (
                item.recommendedVendor &&
                typeof item.recommendedVendor === "object"
              ) {
                recommendedVendors.push(item.recommendedVendor as Vendor);
              }
            });
            console.log("Recommended vendors extracted:", recommendedVendors);
            setRecommendedVendors(recommendedVendors);

            // Merge with existing vendors, avoiding duplicates
            setVendors((currentVendors) => {
              const vendorIds = new Set(currentVendors.map((v) => v._id));
              const uniqueRecommended = recommendedVendors.filter(
                (v) => !vendorIds.has(v._id),
              );
              return [...currentVendors, ...uniqueRecommended];
            });

            // Get selected items from URL params
            if (selectedItemsParam) {
              const selectedIds = selectedItemsParam.split(",");
              setSelectedItems(selectedIds);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch requisition", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // The dependency on fetchVendors is omitted to prevent an infinite loop.
    // fetchVendors depends on recommendedVendors, which is set inside this effect.
    // The effect corrects the vendor list after fetching, so the stale fetchVendors is acceptable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requisitionId, searchParams, router]);

  const handleCompleteRFQ = () => {
    console.log("ToDo: Complete RFQ");
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (editingItem) {
      setItems(
        items.map((item) =>
          item._id === editingItem._id ? editingItem : item,
        ),
      );
      setIsEditDialogOpen(false);
    }
  };

  console.log("Items: ", items);

  return (
    <div className="flex flex-col pt-8 pb-16 px-4 lg:px-12 gap-6">
      <div className="w-full flex items-center justify-start lg:justify-between gap-4">
        <Button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#0d1b5e] hover:underline border rounded-full"
        >
          <ArrowLeft />
        </Button>
      </div>

      <h1 className="text-2xl lg:text-3xl font-bold text-[#0F1E7A]">
        Generate RFQ
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[50%_45%] w-full lg:max-w-7xl gap-24">
        <RFQForm
          rfqTitle={rfqTitle}
          setRfqTitle={setRfqTitle}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          locations={locations}
          locationsLoading={locationsLoading}
          mydateStart={mydateStart}
          setMydateStart={setMydateStart}
          dateStart={dateStart}
          setDateStart={setDateStart}
          monthStart={monthStart}
          setMonthStart={setMonthStart}
          openStart={openStart}
          setOpenStart={setOpenStart}
          vendors={vendors}
          vendorsLoading={vendorsLoading}
          selectedVendor={selectedVendor}
          setSelectedVendor={setSelectedVendor}
          comboboxOpen={comboboxOpen}
          setComboboxOpen={setComboboxOpen}
          handleCompleteRFQ={handleCompleteRFQ}
          items={items}
          recommendedVendors={recommendedVendors}
          selectedItems={selectedItems}
          requisitionId={requisitionId}
          onVendorAdded={fetchVendors}
        />

        <RequestDetails
          items={items}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          dialogSelectedItems={dialogSelectedItems}
          setDialogSelectedItems={setDialogSelectedItems}
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          onEditItem={handleEditItem}
        />
      </div>

      <EditItemDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        editingItem={editingItem}
        setEditingItem={setEditingItem!}
        vendors={vendors}
        vendorsLoading={vendorsLoading}
        onUpdateItem={handleUpdateItem}
      />

      <LoadingDialog isOpen={isLoading} />
    </div>
  );
};

export default GenerateRFQ;
