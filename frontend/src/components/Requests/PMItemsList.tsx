"use client";

import { Item } from "./types";
import { Folder, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PMItemsListProps {
  items: Item[];
  onViewItem: (item: Item) => void;
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  showError?: boolean;
}

export default function PMItemsList({
  items,
  onViewItem,
  selectedItems,
  onSelectionChange,
  showError = false,
}: PMItemsListProps) {
  // Filter to only show departmentApproved items
  const approvedItems = items;
  // const approvedItems = items.filter(
  //   (item) => item.status === "departmentApproved"
  // );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(approvedItems.map((item) => item._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, itemId]);
    } else {
      onSelectionChange(selectedItems.filter((id) => id !== itemId));
    }
  };

  const isAllSelected =
    approvedItems.length > 0 && selectedItems.length === approvedItems.length;
  const isSomeSelected =
    selectedItems.length > 0 && selectedItems.length < approvedItems.length;

  if (approvedItems.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center mt-20 lg:mt-0">
          <Folder size={80} />
          <p className="text-center max-w-sm">
            Your item list is empty. Please contact the department head to
            revisit request.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full bg-white border-2 rounded-xl shadow-xl p-5 transition-all duration-3000 ease-in-out ${
        showError ? "border-red-500" : "border-[#e5e5e5e5]"
      }`}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all items"
                className={
                  isSomeSelected ? "data-[state=checked]:bg-gray-400" : ""
                }
              />
            </TableHead>
            <TableHead>Item Description</TableHead>
            <TableHead>QTY</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {approvedItems.map((item) => (
            <TableRow key={item._id}>
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(item._id)}
                  onCheckedChange={(checked) =>
                    handleSelectItem(item._id, checked as boolean)
                  }
                  aria-label={`Select ${item.itemName}`}
                />
              </TableCell>
              <TableCell>{item.itemName}</TableCell>
              <TableCell>{item.units || "N/A"}</TableCell>
              <TableCell>
                {item.itemType[0].toUpperCase() + item.itemType.slice(1) ||
                  "N/A"}
              </TableCell>
              <TableCell>
                {item.status
                  ? item.status[0].toUpperCase() + item.status.slice(1)
                  : "N/A"}
              </TableCell>
              <TableCell className="flex gap-0">
                <Button
                  variant="ghost"
                  //   className="!px-2 !lg:px-1"
                  onClick={() => onViewItem(item)}
                  className="bg-blue-900 hover:bg-blue-800 text-white px-4"
                >
                  &nbsp;View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
