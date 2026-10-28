"use client";

import { Item, UserTypes } from "./types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dispatch, SetStateAction, useState } from "react";
import { Folder, Edit, Trash2, Plus, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ItemsListProps = ViewItemsListProps | CreateItemsListProps;

interface BaseItemsListProps {
  items: Item[];
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onAddNewItem: () => void;
  onViewItem: (item: Item) => void;
  isEditMode?: boolean;
}

interface ViewItemsListProps extends BaseItemsListProps {
  selectedItems: string[];
  approveBulkRequisitionItems: () => Promise<void>;
  rejectBulkRequisitionItems: () => Promise<void>;
  isItemRequestLoading: boolean;
  itemComment: string;
  setItemComment: Dispatch<SetStateAction<string>>;
  handleItemCheck: (itemId: string, checked: string | boolean) => void;
  userType: UserTypes;
}

interface CreateItemsListProps extends BaseItemsListProps {
  selectedItems?: never;
  approveBulkRequisitionItems?: never;
  rejectBulkRequisitionItems?: never;
  isItemRequestLoading?: never;
  itemComment?: never;
  setItemComment?: never;
  handleItemCheck?: never;
  userType?: never;
}

export default function ItemsList({
  items,
  selectedItems,
  approveBulkRequisitionItems,
  rejectBulkRequisitionItems,
  isItemRequestLoading,
  itemComment,
  setItemComment,
  handleItemCheck,
  onEditItem,
  onDeleteItem,
  onAddNewItem,
  onViewItem,
  userType,
  isEditMode = true,
}: ItemsListProps) {
  const [bulkAction, setBulkAction] = useState("");
  const [bulkItemModalOpen, setBulkItemModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingItems = items.filter((item) => item.status === "pending");
  const showSelection = userType === "hod" && !isEditMode;

  if (items.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center mt-20 lg:mt-0">
          <Folder size={80} />
          <p className="text-center max-w-sm">
            Your item list is empty. Click the button below to create an item.
          </p>
          <div>
            <Button
              disabled={!isEditMode}
              onClick={onAddNewItem}
              className="flex flex-row border border-[#0F1E7A] mt-5 cursor-pointer bg-white text-[#0F1E7A] hover:bg-gray-100"
            >
              <Plus /> Add New Item
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-2 border-[#e5e5e5e5] rounded-xl shadow-xl p-3 sm:p-5">
      {showSelection && (
        <div className="flex flex-wrap gap-2 sm:w-8/25 mb-2">
          <Select
            value={bulkAction}
            onValueChange={(value) => {
              setBulkAction(value);
            }}
          >
            <SelectTrigger className="w-full bg-white border-2 border-black">
              <SelectValue placeholder={"Bulk action"} />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem
                value={"approve"}
                className="hover:bg-gray-100 data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white"
              >
                Approve
              </SelectItem>
              <SelectItem
                value={"reject"}
                className="hover:bg-gray-100 data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white"
              >
                Deny
              </SelectItem>
            </SelectContent>
          </Select>
          <Dialog
            open={bulkItemModalOpen}
            onOpenChange={(open: boolean) => {
              setItemComment("");
              setBulkItemModalOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button
                disabled={!selectedItems.length}
                className="px-6 py-4 bg-[#0F1E7A] text-md text-white cursor-pointer capitalize"
              >
                Apply
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white">
              <DialogHeader>
                <DialogTitle className="capitalize">
                  {bulkAction} Bulk Item
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>
                    {bulkAction === "approve"
                      ? "Approval Comment"
                      : "Reason for Denial"}{" "}
                  </Label>
                  <Textarea
                    value={itemComment}
                    onChange={(e) => setItemComment(e.target.value)}
                    placeholder={
                      bulkAction === "approve"
                        ? "Add a comment for approval"
                        : "Please provide a reason for denying this item(s)"
                    }
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  {bulkAction === "approve" ? (
                    <Button
                      onClick={() =>
                        approveBulkRequisitionItems().then(() => {
                          setBulkItemModalOpen(false);
                        })
                      }
                      disabled={isItemRequestLoading}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isItemRequestLoading ? "Approving..." : "Approve"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        rejectBulkRequisitionItems().then(() => {
                          setBulkItemModalOpen(false);
                        })
                      }
                      disabled={isItemRequestLoading}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isItemRequestLoading ? "Denying..." : "Deny"}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
      <div className="overflow-x-auto w-full">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelection && (
                <TableHead>
                  {" "}
                  <Checkbox
                    id="header-checkbox"
                    disabled={!pendingItems.length}
                    checked={
                      (pendingItems.length &&
                        selectedItems.length === pendingItems.length) ||
                      (selectedItems.length < items.length &&
                        selectedItems.length > 0 &&
                        "indeterminate")
                    }
                    onCheckedChange={(checked) =>
                      handleItemCheck("header-checkbox", checked as boolean)
                    }
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Item Description</TableHead>
              <TableHead>QTY</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const isApproved =
                item.status === "departmentApproved" ||
                item.status === "hrReview";
              const isDenied = item.status === "rejected";
              return (
                <TableRow
                  key={item._id}
                  className={
                    isApproved
                      ? "bg-green-50"
                      : isDenied
                        ? "bg-red-50 opacity-60"
                        : ""
                  }
                >
                  {showSelection && (
                    <TableCell>
                      <Checkbox
                        id={item._id}
                        disabled={item.status !== "pending"}
                        checked={isApproved || selectedItems.includes(item._id)}
                        onCheckedChange={(checked) =>
                          !isApproved &&
                          !isDenied &&
                          handleItemCheck(item._id, checked)
                        }
                        className={
                          isApproved
                            ? "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 opacity-100 cursor-not-allowed"
                            : isDenied
                              ? "opacity-40 cursor-not-allowed"
                              : ""
                        }
                      />
                    </TableCell>
                  )}
                  <TableCell>{item.itemName}</TableCell>
                  <TableCell>{item.units || "N/A"}</TableCell>
                  <TableCell>
                    {item.itemType[0].toUpperCase() + item.itemType.slice(1) ||
                      "N/A"}
                  </TableCell>
                  <TableCell>
                    {item.status ? (
                      <StatusBadge
                        status={item.status}
                        className="text-xs px-2 py-1"
                      />
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell className="flex gap-0">
                    {/* Todo: make reusable isHod() and other methods based on user data. keep in auth*/}
                    {userType === "hod" && !isEditMode ? (
                      <Button
                        variant="default"
                        className="px-6 py-4 bg-[#0F1E7A] text-md text-white cursor-pointer capitalize"
                        onClick={() => onViewItem(item)}
                      >
                        View
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="!px-2 !lg:px-1"
                          onClick={() => onViewItem(item)}
                        >
                          <Eye size={24} className="!text-[#0F1E7A]" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="!px-2 !lg:px-1"
                          disabled={!isEditMode}
                          onClick={() => onEditItem(item)}
                        >
                          <Edit size={24} className="!text-[#0F1E7A]" />
                        </Button>
                        {pendingDeleteId === item._id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs px-2 h-8 cursor-pointer"
                              onClick={() => {
                                onDeleteItem(item._id);
                                setPendingDeleteId(null);
                              }}
                            >
                              Delete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-gray-700 text-xs px-2 h-8 cursor-pointer"
                              onClick={() => setPendingDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            className="!px-2 !lg:px-1"
                            disabled={!isEditMode}
                            onClick={() => setPendingDeleteId(item._id)}
                          >
                            <Trash2 size={24} className="!text-red-500" />
                          </Button>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button
        disabled={!isEditMode}
        onClick={onAddNewItem}
        className="flex flex-row border border-[#0F1E7A] mt-5 cursor-pointer bg-white text-[#0F1E7A] hover:bg-gray-100 mt-10 mx-auto"
      >
        <Plus /> Add Another Item
      </Button>
    </div>
  );
}
