"use client";

import { getToken } from "@/lib/auth";
import { parseDate } from "@/lib/parseDate";
import { API_BASE_URL } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Vendor } from "@/components/Requests/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VendorFormProps {
  vendorData: Vendor;
  setVendorData: React.Dispatch<React.SetStateAction<Vendor>>;
  isEditMode: boolean;
  loading: boolean;
  onSave: () => void;
}

interface Category {
  _id: string;
  name: string;
}

export default function VendorForm({
  vendorData,
  setVendorData,
  isEditMode,
  loading,
  onSave,
}: VendorFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [openStart, setOpenStart] = useState(false);
  const [mydateStart, setMydateStart] = useState("");
  const [monthStart, setMonthStart] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (vendorData.dateOfIncorporation) {
      const date = new Date(vendorData.dateOfIncorporation);
      setMydateStart(
        date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
      setMonthStart(date);
    }
  }, [vendorData.dateOfIncorporation]);

  const token = getToken();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/vendor-categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, [token]);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const selectedCategories = vendorData.categories || [];
  const selectedCategoryIds = selectedCategories.map((cat) =>
    typeof cat === "string" ? cat : cat._id,
  );

  const handleCategoryToggle = (category: Category) => {
    const isSelected = selectedCategoryIds.includes(category._id);

    if (isSelected) {
      setVendorData((prev) => ({
        ...prev,
        categories:
          prev.categories?.filter(
            (cat) => (typeof cat === "string" ? cat : cat._id) !== category._id,
          ) || [],
      }));
    } else {
      setVendorData((prev) => ({
        ...prev,
        categories: [...(prev.categories || []), category],
      }));
    }
  };

  const handleInputChange = (field: keyof Vendor, value: string | boolean) => {
    setVendorData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border">
      <h2 className="text-xl font-semibold text-[#0F1E7A]">
        Vendor Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Vendor Name *</Label>
          <Input
            id="name"
            value={vendorData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            disabled={!isEditMode}
            className={!isEditMode ? "bg-gray-50" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact Person *</Label>
          <Input
            id="contactPerson"
            value={vendorData.contactPerson}
            onChange={(e) => handleInputChange("contactPerson", e.target.value)}
            disabled={!isEditMode}
            className={!isEditMode ? "bg-gray-50" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPersonDesignation">
            Contact Person Designation *
          </Label>
          <Input
            id="contactPersonDesignation"
            value={vendorData.contactPersonDesignation || ""}
            onChange={(e) =>
              handleInputChange("contactPersonDesignation", e.target.value)
            }
            disabled={!isEditMode}
            className={!isEditMode ? "bg-gray-50" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={vendorData.website || ""}
            onChange={(e) => handleInputChange("website", e.target.value)}
            disabled={!isEditMode}
            className={!isEditMode ? "bg-gray-50" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={vendorData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            disabled={!isEditMode}
            className={!isEditMode ? "bg-gray-50" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={vendorData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            disabled={!isEditMode}
            className={!isEditMode ? "bg-gray-50" : ""}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address *</Label>
          <Textarea
            id="address"
            value={vendorData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            disabled={!isEditMode}
            className={!isEditMode ? "bg-gray-50" : ""}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Date of Incorporation</Label>
          <div className="relative flex gap-2">
            <Input
              value={mydateStart}
              placeholder="Select date"
              className={`!p-4 rounded-xl border shadow-sm pr-10 ${
                !isEditMode ? "bg-gray-50" : "border-[#9f9f9f]"
              }`}
              disabled={!isEditMode}
              onChange={(e) => {
                setMydateStart(e.target.value);
                const date = parseDate(e.target.value);
                if (date) {
                  setVendorData((prev) => ({
                    ...prev,
                    dateOfIncorporation: date.toISOString().split("T")[0],
                  }));
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
                  variant="ghost"
                  className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                  disabled={!isEditMode}
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
                  selected={
                    vendorData.dateOfIncorporation
                      ? new Date(vendorData.dateOfIncorporation)
                      : undefined
                  }
                  captionLayout="dropdown"
                  month={monthStart}
                  onMonthChange={setMonthStart}
                  disabled={(date) => date > new Date()}
                  onSelect={(date) => {
                    if (date) {
                      setVendorData((prev) => ({
                        ...prev,
                        dateOfIncorporation: date.toISOString().split("T")[0],
                      }));
                      setMydateStart(
                        date.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }),
                      );
                    }
                    setOpenStart(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="relative">
            <div className="flex items-center border rounded-md px-3 py-2">
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <Input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                onFocus={() => setShowCategoryDropdown(true)}
                className="border-0 p-0 focus-visible:ring-0"
                disabled={!isEditMode}
              />
            </div>

            {showCategoryDropdown && isEditMode && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredCategories.map((category) => (
                  <div
                    key={category._id}
                    className="flex items-center space-x-2 p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleCategoryToggle(category)}
                  >
                    <Checkbox
                      checked={selectedCategoryIds.includes(category._id)}
                      onChange={() => handleCategoryToggle(category)}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                ))}
                {filteredCategories.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">
                    No categories found
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedCategories.map((category) => (
                <span
                  key={typeof category === "string" ? category : category._id}
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {typeof category === "string" ? category : category.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {isEditMode && (
          <>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVerified"
                checked={vendorData.isVerified}
                onCheckedChange={(checked) =>
                  handleInputChange("isVerified", checked)
                }
              />
              <Label htmlFor="isVerified">Verified Vendor</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={vendorData.isActive}
                onCheckedChange={(checked) =>
                  handleInputChange("isActive", checked)
                }
              />
              <Label htmlFor="isActive">Active Vendor</Label>
            </div>
          </>
        )}
      </div>

      {showCategoryDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowCategoryDropdown(false)}
        />
      )}
    </div>
  );
}
