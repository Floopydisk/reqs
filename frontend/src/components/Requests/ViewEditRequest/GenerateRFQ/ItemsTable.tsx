"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SquarePen, Trash } from "lucide-react";
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
import { Item } from "../../types";

interface ItemsTableProps {
  items: Item[];
  selectedItems: string[];
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
}

export default function ItemsTable({
  items,
  selectedItems,
  onEditItem,
  onDeleteItem,
  onBulkDelete,
}: ItemsTableProps) {
  const [bulkSelectedItems, setBulkSelectedItems] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");

  const displayedItems = items.filter(
    (item) => Boolean(item._id) && selectedItems.includes(item._id),
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setBulkSelectedItems(displayedItems.map((item) => item._id));
    } else {
      setBulkSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setBulkSelectedItems([...bulkSelectedItems, itemId]);
    } else {
      setBulkSelectedItems(bulkSelectedItems.filter((id) => id !== itemId));
    }
  };

  const handleApply = () => {
    if (bulkAction === "delete" && bulkSelectedItems.length > 0) {
      if (bulkSelectedItems.length === displayedItems.length) {
        toast.error("At least one item must remain in the list");
        return;
      }
      onBulkDelete(bulkSelectedItems);
      setBulkSelectedItems([]);
      setBulkAction("");
    }
  };

  const isAllSelected =
    displayedItems.length > 0 &&
    bulkSelectedItems.length === displayedItems.length;
  const isApplyDisabled =
    bulkAction !== "delete" ||
    bulkSelectedItems.length === 0 ||
    bulkSelectedItems.length === displayedItems.length;
  return (
    <div className="flex flex-col w-full gap">
      <div className="flex gap-3">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-[180px] border border-[#9f9f9f]">
            <SelectValue placeholder="Bulk Actions" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>

        <Button
          className="bg-[#0F1E7A] text-white cursor-pointer capitalize"
          onClick={handleApply}
          disabled={isApplyDisabled}
        >
          Apply
        </Button>
      </div>
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all items"
                />
              </TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>QTY</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedItems.map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  <Checkbox
                    checked={bulkSelectedItems.includes(item._id)}
                    onCheckedChange={(checked) =>
                      handleSelectItem(item._id, checked as boolean)
                    }
                    aria-label={`Select ${item.itemName}`}
                  />
                </TableCell>
                <TableCell>{item.itemName}</TableCell>
                <TableCell>{item.UOM || "N/A"}</TableCell>
                <TableCell>{item.units || "N/A"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <div
                      className="cursor-pointer"
                      onClick={() => onEditItem(item)}
                    >
                      <SquarePen size={18} color="#0F1E7A" />
                    </div>
                    <div
                      className={`cursor-pointer ${
                        displayedItems.length === 1
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      onClick={() => {
                        if (displayedItems.length > 1) {
                          onDeleteItem(item._id);
                        }
                      }}
                    >
                      <Trash
                        size={18}
                        color={
                          displayedItems.length === 1 ? "#9CA3AF" : "#ED3237"
                        }
                      />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {displayedItems.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-sm text-gray-500"
                >
                  No selected items to display.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
