"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Item, ItemType, Vendor, WORK_TOOL_SUBCATEGORIES } from "./types";

interface ItemFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentItem: Item;
  handleItemFormChange: (
    field: keyof Item,
    value: string | number | boolean | File | null | string[]
  ) => void;
  handleAddItem: () => void;
  editingItemId: string | null;
  vendors: Vendor[];
  vendorsLoading: boolean;
  isViewMode?: boolean;
  onStartEdit?: () => void;
}

export default function ItemFormDialog({
  isOpen,
  onOpenChange,
  currentItem,
  handleItemFormChange,
  handleAddItem,
  editingItemId,
  vendors,
  vendorsLoading,
  isViewMode = false,
  onStartEdit,
}: ItemFormDialogProps) {
  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const isService = currentItem.itemType === "service";
  const isWorkTool = currentItem.isWorkTool === true || currentItem.isWorkTool === "true";

  const handleSubcategoryToggle = (option: string) => {
    handleItemFormChange("workToolSubcategory", [option]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] max-h-[600px] flex flex-col bg-white items-center overflow-hidden">
        <DialogHeader className="flex justify-center items-center">
          <DialogTitle className="text-2xl">
            {isViewMode ? "View Item" : editingItemId ? "Edit Item" : "New Item"}
          </DialogTitle>
          <DialogDescription>
            {isViewMode ? "Item details" : "Enter the details of the item below"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col w-full max-w-xl space-y-5 overflow-y-auto flex-1 px-1">
          <div className="space-y-2">
            <Label>Item Description {!isViewMode && <span className="compulsory-field">*</span>}</Label>
            <Input
              placeholder="e.g., A4 Paper"
              className="!p-4 rounded-md border shadow-sm bg-white"
              value={currentItem.itemName}
              onChange={(e) => handleItemFormChange("itemName", e.target.value)}
              disabled={isViewMode}
              required={!isViewMode}
            />
          </div>
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <div className="w-full space-y-2">
              <Label>Item Type {!isViewMode && <span className="compulsory-field">*</span>}</Label>
              <Select
                value={currentItem.itemType}
                onValueChange={(value: ItemType) =>
                  handleItemFormChange("itemType", value)
                }
                disabled={isViewMode}
                required={!isViewMode}
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
                className="!p-4 rounded-md border shadow-sm bg-white"
                value={currentItem.preferredBrand}
                onChange={(e) =>
                  handleItemFormChange("preferredBrand", e.target.value)
                }
                disabled={isViewMode}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Detailed Specification {!isViewMode && <span className="compulsory-field">*</span>}</Label>
            <Textarea
              className="min-h-[100px] rounded-md border shadow-sm bg-white"
              value={currentItem.itemDescription}
              onChange={(e) =>
                handleItemFormChange("itemDescription", e.target.value)
              }
              disabled={isViewMode}
              required={!isViewMode}
            />
          </div>
          {!isViewMode && (
          <div className="space-y-2">
            <Label>Attach Image</Label>
            <div className="flex items-center gap-2 border border-[#9f9f9f] px-3 rounded-md shadow-sm py-0 bg-white">
              <Upload className="h-w w-5 text-gray-500" />
              <Input
                type="file"
                accept=".png,.jpg,.jpeg"
                className="border-none shadow-none focus-visible:ring-0 p-0 text-sm"
                onChange={(e) =>
                  handleItemFormChange(
                    "uploadImage",
                    e.target.files ? e.target.files[0] : null
                  )
                }
              />
            </div>
          </div>
          )}
          {!isService && (
            <div className="w-full flex flex-col sm:flex-row gap-3">
              <div className="w-full space-y-2">
                <Label>Units {!isViewMode && <span className="compulsory-field">*</span>}</Label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  className="!p-4 rounded-md border shadow-sm bg-white"
                  value={currentItem.units}
                  onChange={(e) =>
                    handleItemFormChange(
                      "units",
                      e.target.value ? parseInt(e.target.value) : ""
                    )
                  }
                  disabled={isViewMode}
                  required={!isViewMode}
                />
              </div>
              <div className="w-full space-y-2">
                <Label>UOM (Unit of Measure)</Label>
                <Input
                  placeholder="e.g., Reams, Pieces, Packs"
                  className="!p-4 rounded-md border shadow-sm bg-white"
                  value={currentItem.UOM}
                  onChange={(e) => handleItemFormChange("UOM", e.target.value)}
                  disabled={isViewMode}
                />
              </div>
            </div>
          )}
          {!isService && <div className="w-full flex gap-3">
            {/* A5: Recommended Vendor section commented out — not required at requisition stage
            <div className="w-full space-y-2">
              <Label>Recommended Vendor</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger className="!bg-white" asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between bg-white hover:bg-white"
                  >
                    {currentItem.recommendedVendor
                      ? vendors.find(
                          (vendor) =>
                            vendor._id === currentItem.recommendedVendor
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
                              handleItemFormChange(
                                "recommendedVendor",
                                vendor._id === currentItem.recommendedVendor
                                  ? ""
                                  : vendor._id
                              );
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                currentItem.recommendedVendor === vendor._id
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
            */}
            <div className="w-full space-y-2">
              <Label>Is this a personal work tool? (e.g. computers and accessories, phones and accessories) {!isViewMode && <span className="compulsory-field">*</span>}</Label>
              <Select
                value={
                  typeof currentItem.isWorkTool === "boolean"
                    ? currentItem.isWorkTool.toString()
                    : ""
                }
                onValueChange={(value) =>
                  handleItemFormChange("isWorkTool", value === "true")
                }
                disabled={isViewMode}
                required={!isViewMode}
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
          </div>}
          {!isService && isWorkTool && (
            <div className="space-y-2">
              <Label>Personal Work Tool Category {!isViewMode && <span className="compulsory-field">*</span>}</Label>
              <div className="grid grid-cols-2 gap-2">
                {WORK_TOOL_SUBCATEGORIES.map((option) => {
                  const checked = (currentItem.workToolSubcategory ?? []).includes(option);
                  return (
                    <Label
                      key={option}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors font-normal ${
                        isViewMode
                          ? "cursor-default opacity-70"
                          : "cursor-pointer"
                      } ${
                        checked
                          ? "border-[#0F1E7A] bg-blue-50 text-[#0F1E7A]"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="workToolSubcategory"
                        className="accent-[#0F1E7A]"
                        checked={checked}
                        disabled={isViewMode}
                        onChange={() => !isViewMode && handleSubcategoryToggle(option)}
                      />
                      {option}
                    </Label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col sm:flex-row gap-3 mt-4 flex-shrink-0">
          {isViewMode ? (
            <Button
              type="button"
              className="w-full bg-[#0F1E7A] text-white cursor-pointer"
              onClick={onStartEdit}
            >
              Edit Item
            </Button>
          ) : (
            <>
              <div className="w-1/2">
                <Button
                  onClick={handleAddItem}
                  className="w-full bg-[#0F1E7A] text-white cursor-pointer"
                >
                  {editingItemId ? "Update Item" : "Add Item"}
                </Button>
              </div>
              <div className="w-1/2">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border border-[#DE1216] text-[#DE1216] hover:bg-red-50 hover:text-[#DE1216]"
                  >
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
