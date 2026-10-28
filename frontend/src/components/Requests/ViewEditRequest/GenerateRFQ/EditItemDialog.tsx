"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogHeader, DialogContent } from "@/components/ui/dialog";
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
import { Item, ItemType, Vendor } from "../../types";
import { useState } from "react";
import { toast } from "sonner";

interface EditItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingItem: Item | null;
  setEditingItem: (item: Item) => void;
  vendors: Vendor[];
  vendorsLoading: boolean;
  onUpdateItem: () => void;
}

export default function EditItemDialog({
  isOpen,
  setIsOpen,
  editingItem,
  setEditingItem,
  vendors,
  vendorsLoading,
  onUpdateItem,
}: EditItemDialogProps) {
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  if (!editingItem) return null;

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!editingItem.itemName?.trim()) {
      newErrors.itemName = "Item Description is required";
    }
    
    if (!editingItem.itemDescription?.trim()) {
      newErrors.itemDescription = "Details Specification is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateItem = () => {
    if (validateForm()) {
      onUpdateItem();
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md h-[80vh] max-h-[600px] flex flex-col bg-white items-center overflow-hidden">
        <DialogHeader className="flex justify-center items-center">
          <h2 className="text-2xl font-bold">Edit RFQ Item</h2>
          <p className="text-sm text-gray-600">
            Enter the details of the item below
          </p>
        </DialogHeader>
        <div className="flex flex-col w-full max-w-xl space-y-5 overflow-y-auto flex-1 px-1">
          <div className="space-y-2">
            <Label>
              Item Description <span className="compulsory-field">*</span>
            </Label>
            <Input
              placeholder="e.g., A4 Paper"
              value={editingItem.itemName}
              onChange={(e) => {
                setEditingItem({
                  ...editingItem,
                  itemName: e.target.value,
                });
                if (errors.itemName) {
                  setErrors({...errors, itemName: ""});
                }
              }}
              className={`!p-4 rounded-md border shadow-sm bg-white ${
                errors.itemName ? "border-red-500" : ""
              }`}
            />
            {errors.itemName && (
              <p className="text-red-500 text-sm">{errors.itemName}</p>
            )}
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              placeholder="e.g., 10"
              value={editingItem.units}
              onChange={(e) =>
                setEditingItem({
                  ...editingItem,
                  units: e.target.value ? parseInt(e.target.value) : "",
                })
              }
              className="!p-4 rounded-md border shadow-sm bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Unit of Measure (UoM))</Label>
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

          <div className="space-y-2">
            <Label>
              Details Specification <span className="compulsory-field">*</span>
            </Label>
            <Textarea
              value={editingItem.itemDescription}
              onChange={(e) => {
                setEditingItem({
                  ...editingItem,
                  itemDescription: e.target.value,
                });
                if (errors.itemDescription) {
                  setErrors({...errors, itemDescription: ""});
                }
              }}
              className={`min-h-[100px] rounded-md border shadow-sm bg-white ${
                errors.itemDescription ? "border-red-500" : ""
              }`}
            />
            {errors.itemDescription && (
              <p className="text-red-500 text-sm">{errors.itemDescription}</p>
            )}
          </div>
        </div>
        <div className="w-full flex gap-3 mt-4 flex-shrink-0">
          <div className="w-1/2">
            <Button
              className="w-full bg-[#0F1E7A] text-white cursor-pointer"
              onClick={handleUpdateItem}
            >
              Update Item
            </Button>
          </div>
          <div className="w-1/2">
            <Button
              variant="outline"
              className="w-full border border-[#DE1216] text-[#DE1216] hover:bg-red-50 hover:text-[#DE1216]"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
