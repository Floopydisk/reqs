"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";

interface BusinessCategorySelectorProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  label?: string;
  placeholder?: string;
  page?: "signup" | "vendorProfile";
}

const categories = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
  { value: "it", label: "IT" },
  { value: "construction", label: "Construction" },
  { value: "officeSupplies", label: "Office Supplies" },
];

export default function BusinessCategorySelector({
  selectedCategories,
  onCategoryChange,
  label = "Business Categories",
  placeholder = "Select categories",
  page = "signup",
}: BusinessCategorySelectorProps) {
  const handleCategoryChange = (categoryValue: string, checked: boolean) => {
    const updatedCategories = checked
      ? [...selectedCategories, categoryValue]
      : selectedCategories.filter((cat) => cat !== categoryValue);
    onCategoryChange(updatedCategories);
  };

  const removeCategory = (categoryValue: string) => {
    const updatedCategories = selectedCategories.filter(
      (cat) => cat !== categoryValue
    );
    onCategoryChange(updatedCategories);
  };

  return (
    <div
      className={page === "vendorProfile" ? " !font-light !text-gray-700 " : ""}
    >
      <Label
        className={
          page === "vendorProfile" ? " !font-light !text-gray-700 " : ""
        }
      >
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={`mt-2 w-full min-h-[48px] flex items-center justify-between border rounded-lg p-3 cursor-pointer ${
              page === "vendorProfile"
                ? " border-transparent bg-gray-100"
                : " border-[#121212] bg-white"
            }`}
          >
            <div
              className={`flex flex-wrap gap-2 flex-1${
                page === "vendorProfile" ? " !text-gray-700" : ""
              }`}
            >
              {selectedCategories.length > 0 ? (
                selectedCategories.map((categoryValue) => {
                  const category = categories.find(
                    (cat) => cat.value === categoryValue
                  );
                  return (
                    <span
                      key={categoryValue}
                      className="inline-flex items-center gap-1 bg-[#0A1A6B] text-white text-sm px-2 py-1 rounded"
                    >
                      {category?.label}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCategory(categoryValue);
                        }}
                        className="hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className={`w-full p-4 bg-white${
            page === "vendorProfile" ? " border !border-gray-400" : ""
          }`}
          align="start"
        >
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.value} className="flex items-center space-x-2">
                <Checkbox
                  className={
                    page === "vendorProfile" ? " border border-gray-400 " : ""
                  }
                  id={category.value}
                  checked={selectedCategories.includes(category.value)}
                  onCheckedChange={(checked) =>
                    handleCategoryChange(category.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={category.value}
                  className={`text-sm font-normal cursor-pointer${
                    page === "vendorProfile" ? " !text-gray-900" : ""
                  }`}
                >
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
