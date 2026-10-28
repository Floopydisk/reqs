"use client";
import { Item, Vendor, ItemType } from "../../types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getToken } from "@/lib/auth";
import { parseDate } from "@/lib/parseDate";
import { API_BASE_URL } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarIcon,
  Plus,
  SquarePen,
  Trash,
  Check,
  ChevronsUpDown,
  Upload,
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
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import { toast } from "sonner";

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
  const [isLoading, setIsLoading] = useState(true);
  const selectedItemsParam = searchParams?.get("selectedItems");

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
      try {
        let allVendors: Vendor[] = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
          const response = await fetch(
            `${API_BASE_URL}/vendors?page=${currentPage}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
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

        setVendors(allVendors);
      } catch (error) {
        console.error("Failed to fetch vendors", error);
      } finally {
        setVendorsLoading(false);
      }

      // Fetch requisition details
      try {
        const res = await fetch(
          `${API_BASE_URL}/requisitions/${requisitionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.success) {
          const req = data.data;
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
  }, [requisitionId, router, selectedItemsParam]);

  const handleCompleteRFQ = () => {
    console.log("ToDo: Complete RFQ");
  };

  return (
    <div className="flex flex-col pt-8 pb-16 px-4 lg:px-12 gap-6">
      <div className="w-full flex items-center justify-start lg:justify-between gap-4">
        <Button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#0d1b5e] hover:underline border rounded-full "
        >
          <ArrowLeft />
        </Button>
      </div>

      <h1 className="text-2xl lg:text-3xl font-bold text-[#0F1E7A]">
        Generate RFQ
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-[50%_45%]  w-full lg:max-w-7xl gap-24">
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
                  placeholder={
                    locationsLoading ? "Loading..." : "Select Location"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {locations.map((location) => (
                  <SelectItem
                    key={location._id}
                    value={location._id}
                    className="hover:bg-gray-100 data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white"
                  >
                    {location.name.charAt(0).toUpperCase() +
                      location.name.slice(1)}
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
              className="min-h-[100px] rounded-xl border border-[#9f9f9f] shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">VENDOR INFORMATION</h2>
            {/* fix alignmwnt issues here */}
            <div className="flex gap-10">
              <div className="w-[50%] flex gap-4">
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger className="!bg-white !w-[200px]" asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between bg-white hover:bg-white"
                    >
                      {selectedVendor
                        ? vendors.find(
                            (vendor) => vendor._id === selectedVendor
                          )?.name
                        : vendorsLoading
                        ? "Loading vendors..."
                        : "Choose a vendor"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0 bg-white">
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
                                  vendor._id === selectedVendor
                                    ? ""
                                    : vendor._id
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
                <Button className="bg-[#0F1E7A] text-white cursor-pointer">
                  Add
                </Button>
              </div>

              <div className="w-[50%] flex justify-end items-center">
                <Dialog>
                  <DialogTrigger className="bg-white" asChild>
                    <Button className="bg-[#0F1E7A] text-white cursor-pointer">
                      <Plus size={22} />{" "}
                      <span className="hidden lg:flex">New Vendor</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white max-w-[500px]">
                    <DialogHeader></DialogHeader>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-center items-center">
                          <p className="text-xl font-semibold text-center text-[#100A1A]">
                            New Vendor
                          </p>
                        </div>
                        <div className="flex justify-center items-center">
                          <p className="text-md text-center font-normal">
                            Enter the details of vendor below
                          </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="space-y-2">
                            <Label>
                              Company Name{" "}
                              <span className="text-red-500 -ml-1">*</span>
                            </Label>
                            <Input
                              type={"text"}
                              className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>
                              Contact Person
                              <span className="text-red-500 -ml-1">*</span>
                            </Label>
                            <Input
                              type={"text"}
                              className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>
                              Phone Number
                              <span className="text-red-500 -ml-1">*</span>
                            </Label>
                            <Input
                              type={"tel"}
                              className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                              type={"email"}
                              className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                              type={"text"}
                              className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <Button className="bg-[#0F1E7A] text-white cursor-pointer">
                            Add Vendor
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              type="button"
              onClick={handleCompleteRFQ}
              className="font-bold text-base bg-[#0F1E7A] hover:bg-[#0b154b] text-white py-6 px-10"
            >
              Complete RFQ
            </Button>

            <Button
              type="button"
              className="font-bold text-base bg-red-600 hover:bg-red-700 text-white py-6 px-10"
            >
              Cancel
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-md font-bold ">REQUEST DETAILS</p>
          <p className="text-md font-normal text-[#4F7396]">
            Choose the items that you would like to add to the RFQ below. Note
            that you can edit any of the items to fit the relevant
            specifications.
          </p>

          <div className="flex flex-col w-full gap">
            <div className="flex gap-3">
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Bulk Actions" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="approve">Approve</SelectItem>
                </SelectContent>
              </Select>

              <Button className="bg-[#0F1E7A] text-white cursor-pointer capitalize">
                Apply
              </Button>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead>QTY</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items
                    .filter((item) => selectedItems.includes(item._id))
                    .map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.UOM || "N/A"}</TableCell>
                        <TableCell>{item.units || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <div
                              className="cursor-pointer"
                              onClick={() => {
                                setEditingItem(item);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <SquarePen size={18} color="#0F1E7A" />
                            </div>
                            <div
                              className={`cursor-pointer ${
                                selectedItems.length === 1
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              onClick={() => {
                                if (selectedItems.length > 1) {
                                  setSelectedItems(
                                    selectedItems.filter(
                                      (id) => id !== item._id
                                    )
                                  );
                                }
                              }}
                            >
                              <Trash
                                size={18}
                                color={
                                  selectedItems.length === 1
                                    ? "#9CA3AF"
                                    : "#ED3237"
                                }
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="flex  justify-center items-center">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger className="bg-white" asChild>
                <Button
                  className="border border-[#0F1E7A] cursor-pointer"
                  onClick={() => {
                    setDialogSelectedItems([...selectedItems]);
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus size={18} />{" "}
                  <span className="hidden lg:flex">Add New Item</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white">
                <DialogHeader></DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-col w-full gap">
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Checkbox
                                checked={
                                  items.length > 0 &&
                                  dialogSelectedItems.length === items.length
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setDialogSelectedItems(
                                      items.map((item) => item._id)
                                    );
                                  } else {
                                    setDialogSelectedItems([]);
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item._id}>
                              <TableCell>
                                <Checkbox
                                  checked={dialogSelectedItems.includes(
                                    item._id
                                  )}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setDialogSelectedItems([
                                        ...dialogSelectedItems,
                                        item._id,
                                      ]);
                                    } else {
                                      setDialogSelectedItems(
                                        dialogSelectedItems.filter(
                                          (id) => id !== item._id
                                        )
                                      );
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>{item.itemName}</TableCell>
                              <TableCell>{item.itemType}</TableCell>
                              <TableCell className="text-[#F59313]">
                                {item.status || "Pending"}
                              </TableCell>
                              <TableCell>
                                <Button className="bg-[#0F1E7A] h-[35px] text-white cursor-pointer capitalize">
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="w-full flex items-center justify-center gap-3 mt-4">
                        <Button
                          className="bg-[#0F1E7A] text-white cursor-pointer"
                          onClick={() => {
                            if (dialogSelectedItems.length === 0) {
                              return;
                            }
                            setSelectedItems([...dialogSelectedItems]);
                            setIsDialogOpen(false);
                          }}
                          disabled={dialogSelectedItems.length === 0}
                        >
                          Add item(s)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit RFQ Item Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md h-[80vh] max-h-[600px] flex flex-col bg-white items-center overflow-hidden">
              <DialogHeader className="flex justify-center items-center">
                <h2 className="text-2xl font-bold">Edit RFQ Item</h2>
                <p className="text-sm text-gray-600">
                  Enter the details of the item below
                </p>
              </DialogHeader>
              {editingItem && (
                <div className="flex flex-col w-full max-w-xl space-y-5 overflow-y-auto flex-1 px-1">
                  <div className="space-y-2">
                    <Label>
                      Name of Item <span className="compulsory-field">*</span>
                    </Label>
                    <Input
                      placeholder="e.g., A4 Paper"
                      value={editingItem.itemName}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          itemName: e.target.value,
                        })
                      }
                      className="!p-4 rounded-md border shadow-sm bg-white"
                    />
                  </div>
                  <div className="w-full flex gap-3">
                    <div className="w-full space-y-2">
                      <Label>
                        Item Type <span className="compulsory-field">*</span>
                      </Label>
                      <Select
                        value={editingItem.itemType}
                        onValueChange={(value: ItemType) =>
                          setEditingItem({ ...editingItem, itemType: value })
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full space-y-2">
                      <Label>Brand</Label>
                      <Input
                        placeholder="e.g., HP"
                        value={editingItem.preferredBrand || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            preferredBrand: e.target.value,
                          })
                        }
                        className="!p-4 rounded-md border shadow-sm bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Item Description{" "}
                      <span className="compulsory-field">*</span>
                    </Label>
                    <Textarea
                      value={editingItem.itemDescription}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          itemDescription: e.target.value,
                        })
                      }
                      className="min-h-[100px] rounded-md border shadow-sm bg-white"
                    />
                  </div>
                  <div className="w-full flex gap-3">
                    <div className="w-full space-y-2">
                      <Label>Units</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10"
                        value={editingItem.units}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            units: e.target.value
                              ? parseInt(e.target.value)
                              : "",
                          })
                        }
                        className="!p-4 rounded-md border shadow-sm bg-white"
                      />
                    </div>
                    <div className="w-full space-y-2">
                      <Label>UOM (Unit of Measure)</Label>
                      <Input
                        placeholder="e.g., Reams, Pieces, Packs"
                        value={editingItem.UOM || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            UOM: e.target.value,
                          })
                        }
                        className="!p-4 rounded-md border shadow-sm bg-white"
                      />
                    </div>
                  </div>
                  <div className="w-full flex gap-3">
                    <div className="w-full space-y-2">
                      <Label>Recommended Vendor</Label>
                      <Popover>
                        <PopoverTrigger className="!bg-white" asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between bg-white hover:bg-white"
                          >
                            {editingItem.recommendedVendor
                              ? vendors.find(
                                  (vendor) =>
                                    vendor._id === editingItem.recommendedVendor
                                )?.name
                              : vendorsLoading
                              ? "Loading vendors..."
                              : "Select vendor..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0 bg-white">
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
                                      setEditingItem({
                                        ...editingItem,
                                        recommendedVendor:
                                          vendor._id ===
                                          editingItem.recommendedVendor
                                            ? ""
                                            : vendor._id,
                                      });
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        editingItem.recommendedVendor ===
                                        vendor._id
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
                    </div>
                    <div className="w-full space-y-2">
                      <Label>
                        Is this a worktool?{" "}
                        <span className="compulsory-field">*</span>
                      </Label>
                      <Select
                        value={
                          typeof editingItem.isWorkTool === "boolean"
                            ? editingItem.isWorkTool.toString()
                            : ""
                        }
                        onValueChange={(value) =>
                          setEditingItem({
                            ...editingItem,
                            isWorkTool: value === "true",
                          })
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              <div className="w-full flex gap-3 mt-4 flex-shrink-0">
                <div className="w-1/2">
                  <Button
                    className="w-full bg-[#0F1E7A] text-white cursor-pointer"
                    onClick={() => {
                      setItems(
                        items.map((item) =>
                          item._id === editingItem?._id ? editingItem : item
                        )
                      );
                      setIsEditDialogOpen(false);
                    }}
                  >
                    Update Item
                  </Button>
                </div>
                <div className="w-1/2">
                  <Button
                    variant="outline"
                    className="w-full border border-[#DE1216] text-[#DE1216] hover:bg-red-50 hover:text-[#DE1216]"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Loading Dialog */}
      <Dialog open={isLoading}>
        <DialogContent className="sm:max-w-md bg-white flex flex-col items-center">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F1E7A]"></div>
            <p className="text-lg font-semibold">Preparing page...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GenerateRFQ;
