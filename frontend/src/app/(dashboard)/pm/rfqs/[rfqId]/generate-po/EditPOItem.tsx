"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface EditPOItemProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (itemData: POItemData) => void;
  itemData?: POItemData;
}

const EditPOItem: React.FC<EditPOItemProps> = ({
  isOpen,
  onClose,
  onUpdate,
  itemData,
}) => {
  const [formData, setFormData] = useState<POItemData>({
    itemDescription: itemData?.itemDescription || "",
    brand: itemData?.brand || "",
    quantity: itemData?.quantity || 0,
    uom: itemData?.uom || "",
    unitPrice: itemData?.unitPrice || 0,
    totalPrice: itemData?.totalPrice || 0,
    detailsSpecification: itemData?.detailsSpecification || "",
    itemType:
      itemData?.itemType || (itemData?.isService ? "service" : "product"),
  });

  useEffect(() => {
    if (itemData) {
      setFormData({
        itemDescription: itemData.itemDescription || "",
        brand: itemData.brand || "",
        quantity: itemData.quantity || 0,
        uom: itemData.uom || "",
        unitPrice: itemData.unitPrice || 0,
        totalPrice: itemData.totalPrice || 0,
        detailsSpecification: itemData.detailsSpecification || "",
        itemType:
          itemData.itemType || (itemData.isService ? "service" : "product"),
      });
    } else {
      setFormData({
        itemDescription: "",
        brand: "",
        quantity: 0,
        uom: "",
        unitPrice: 0,
        totalPrice: 0,
        detailsSpecification: "",
        itemType: "product",
      });
    }
  }, [itemData]);

  const isService = formData.itemType === "service";

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]:
          name === "quantity" || name === "unitPrice" || name === "totalPrice"
            ? parseFloat(value) || 0
            : value,
      };

      if (name === "totalPrice" && isService) {
        updated.totalPrice = parseFloat(value) || 0;
      } else if (name === "quantity" || name === "unitPrice") {
        updated.totalPrice = updated.quantity * updated.unitPrice;
      }

      return updated;
    });
  };

  const handleUpdate = () => {
    onUpdate(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white w-full sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex justify-center items-center">
            <p className="text-xl font-semibold text-center text-[#100A1A]">
              Edit PO Item
            </p>
          </div>
          <div className="flex justify-center items-center">
            <p className="text-md text-center font-normal">
              Update the details of the item below
            </p>
          </div>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1 p-1">
          <div className="flex flex-col gap-3">
            {/* H7: Item Type override — PM can classify as product or service */}
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select
                value={formData.itemType}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    itemType: value as "product" | "service",
                  }))
                }
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="product" className="data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white focus:bg-[#0F1E7A]/10">Product</SelectItem>
                  <SelectItem value="service" className="data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white focus:bg-[#0F1E7A]/10">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Item Description */}
            <div className="space-y-2">
              <Label>Item Description</Label>
              <Input
                type="text"
                name="itemDescription"
                value={formData.itemDescription}
                onChange={handleInputChange}
                className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
              />
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
              />
            </div>

            {/* H8: Hide Qty/UOM/Unit Price for service items */}
            {!isService && (
              <>
                {/* Quantity */}
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
    className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
  />
</div>

{/* UOM */}
<div className="space-y-2">
  <Label>UOM</Label>
  <Input
                    type="text"
                    name="uom"
                    value={formData.uom}
                    onChange={handleInputChange}
                    className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
                  />
                </div>

                {/* Unit Price */}
                <div className="space-y-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleInputChange}
                    className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
                  />
                </div>
              </>
            )}

            {/* Total Price */}
            <div className="space-y-2">
              <Label>{isService ? "Service Fee / Amount" : "Total Price"}</Label>
              <Input
                type={isService ? "number" : "text"}
                name="totalPrice"
                value={isService ? formData.totalPrice : formData.totalPrice.toLocaleString()}
                onChange={isService ? handleInputChange : undefined}
                readOnly={!isService}
                min={isService ? 0 : undefined}
                step={isService ? "0.01" : undefined}
                className={`!p-4 rounded-xl border border-[#9f9f9f] shadow-sm ${isService ? "" : "bg-gray-50"}`}
              />
            </div>

            {/* Details Specification */}
            <div className="space-y-2">
              <Label>Details Specification</Label>
              <Textarea
                name="detailsSpecification"
                value={formData.detailsSpecification}
                onChange={handleInputChange}
                className="min-h-[80px] rounded-xl border border-[#9f9f9f] shadow-sm resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleUpdate}
                className="flex-1 bg-[#0F1E7A] text-white hover:bg-blue-800"
              >
                Update
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPOItem;
