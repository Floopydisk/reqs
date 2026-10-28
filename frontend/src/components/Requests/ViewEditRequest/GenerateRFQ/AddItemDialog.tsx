"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import { Item } from "../../types";

interface AddItemDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  items: Item[];
  selectedItems: string[];
  dialogSelectedItems: string[];
  setDialogSelectedItems: (items: string[]) => void;
  onAddItems: () => void;
}

export default function AddItemDialog({
  isOpen,
  setIsOpen,
  items,
  selectedItems,
  dialogSelectedItems,
  setDialogSelectedItems,
  onAddItems,
}: AddItemDialogProps) {
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const availableItems = items.filter(
    (item) => Boolean(item._id) && !selectedItems.includes(item._id),
  );

  return (
    <div className="flex justify-center items-center">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger className="bg-white" asChild>
          <Button
            className="border border-[#0F1E7A] cursor-pointer"
            onClick={() => {
              setDialogSelectedItems([]);
              setIsOpen(true);
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
                {availableItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <p className="text-gray-500 text-center">
                      No additional items available to add. All current
                      requisition items are already in this RFQ.
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Checkbox
                              checked={
                                availableItems.length > 0 &&
                                dialogSelectedItems.length ===
                                  availableItems.length
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setDialogSelectedItems(
                                    availableItems.map((item) => item._id),
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
                        {availableItems.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>
                              <Checkbox
                                checked={dialogSelectedItems.includes(item._id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setDialogSelectedItems([
                                      ...dialogSelectedItems,
                                      item._id,
                                    ]);
                                  } else {
                                    setDialogSelectedItems(
                                      dialogSelectedItems.filter(
                                        (id) => id !== item._id,
                                      ),
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
                              <Button
                                className="bg-[#0F1E7A] h-[35px] text-white cursor-pointer capitalize"
                                onClick={() => {
                                  setViewingItem(item);
                                  setIsViewDialogOpen(true);
                                }}
                              >
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
                        onClick={onAddItems}
                        disabled={dialogSelectedItems.length === 0}
                      >
                        Add item(s)
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md h-[80vh] max-h-[600px] flex flex-col bg-white items-center overflow-hidden">
          <DialogHeader className="flex justify-center items-center">
            <h2 className="text-2xl font-bold">View Item Details</h2>
          </DialogHeader>
          {viewingItem && (
            <div className="flex flex-col w-full max-w-xl space-y-5 overflow-y-auto flex-1 px-1">
              <div className="space-y-2">
                <Label>Item Description</Label>
                <Input
                  value={viewingItem.itemName || ""}
                  readOnly
                  className="!p-4 rounded-md border shadow-sm bg-gray-50"
                />
              </div>

              <div className="flex gap-3 w-full">
                <div className="space-y-2 w-full">
                  <Label>Item Type</Label>
                  <Input
                    value={viewingItem.itemType || ""}
                    readOnly
                    className="!p-4 rounded-md border shadow-sm bg-gray-50 capitalize"
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label>Brand</Label>
                  <Input
                    value={viewingItem.preferredBrand || "N/A"}
                    readOnly
                    className="!p-4 rounded-md border shadow-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <div className="space-y-2 w-full">
                  <Label>Quantity</Label>
                  <Input
                    value={viewingItem.units || ""}
                    readOnly
                    className="!p-4 rounded-md border shadow-sm bg-gray-50"
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label>Unit of Measure (UoM)</Label>
                  <Input
                    value={viewingItem.UOM || "N/A"}
                    readOnly
                    className="!p-4 rounded-md border shadow-sm bg-gray-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Details Specification</Label>
                <Textarea
                  value={viewingItem.itemDescription || ""}
                  readOnly
                  className="min-h-[100px] rounded-md border shadow-sm bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Is this a personal work tool?</Label>
                <Input
                  value={viewingItem.isWorkTool ? "Yes" : "No"}
                  readOnly
                  className="!p-4 rounded-md border shadow-sm bg-gray-50"
                />
              </div>
            </div>
          )}
          <div className="w-full flex gap-3 mt-4 flex-shrink-0">
            <Button
              className="w-full bg-[#0F1E7A] text-white cursor-pointer"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
