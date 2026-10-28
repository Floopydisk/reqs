"use client";

import React, { Dispatch, SetStateAction, useState } from "react";
import Image from "next/image";
import { Item, UserTypes, Vendor } from "./types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/StatusBadge";

interface ItemViewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentItem: Item;
  vendors: Vendor[];
  userType: UserTypes;
  approveRequisitionItem: (item: string) => Promise<void>;
  rejectRequisitionItem: (item: string) => Promise<void>;
  approveHrRequisitionItem?: (item: string) => Promise<void>;
  rejectHrRequisitionItem?: (item: string) => Promise<void>;
  itemComment: string;
  setItemComment: Dispatch<SetStateAction<string>>;
  isItemRequestLoading: boolean;
}

export default function ItemViewDialog({
  isOpen,
  onOpenChange,
  currentItem,
  vendors,
  userType,
  approveRequisitionItem,
  rejectRequisitionItem,
  approveHrRequisitionItem,
  rejectHrRequisitionItem,
  itemComment,
  setItemComment,
  isItemRequestLoading,
}: ItemViewDialogProps) {
  const noImage = "/no-image.svg";

  const [approveItemDialogOpen, setApproveItemDialogOpen] = useState(false);
  const [rejectItemDialogOpen, setRejectItemDialogOpen] = useState(false);

  const isHod = userType === "hod";
  const isHhra = userType === "hhra";
  const canUseDepartmentActions = isHod || isHhra;
  const approveHandler = isHhra
    ? approveHrRequisitionItem
    : approveRequisitionItem;
  const rejectHandler = isHhra
    ? rejectHrRequisitionItem
    : rejectRequisitionItem;
  const approvalDisabled = currentItem.status !== (isHhra ? "hrReview" : "pending");

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find((v) => v._id === vendorId);
    return vendor ? vendor.name : "N/A";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] max-h-[600px] flex flex-col bg-white items-center overflow-hidden">
        <DialogHeader className="flex justify-center items-center">
          <DialogTitle className="text-2xl">Item Details</DialogTitle>
          <DialogDescription>
            View the details of the item below
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col w-full max-w-xl space-y-5 overflow-y-auto flex-1 px-1">
          {currentItem.imageUrl && (
            <div className="space-y-2">
              <Image
                src={currentItem.imageUrl || noImage}
                alt={currentItem.itemName || "Item Image"}
                className="w-full h-auto rounded-md"
                width={500}
                height={300}
              />
            </div>
          )}
          <div className="w-full flex gap-2">
            <div className="w-full space-y-2">
              <Label className="font-bold">Item Description</Label>
              <div className="p-4 rounded-md text-gray-700">
                {currentItem.itemName || "N/A"}
              </div>
            </div>

            <div className="w-full space-y-2">
              <Label className="font-bold">Status</Label>
              <div className="p-4 rounded-md text-gray-700">
                {currentItem.status ? (
                  <StatusBadge
                    status={currentItem.status}
                    className="text-sm px-2 py-1"
                  />
                ) : (
                  "N/A"
                )}
              </div>
            </div>
          </div>
          <div className="w-full flex gap-3">
            <div className="w-full space-y-2">
              <Label className="font-bold">Item Type</Label>
              <div className="p-4 rounded-md text-gray-700 capitalize">
                {currentItem.itemType || "N/A"}
              </div>
            </div>
            <div className="w-full space-y-2">
              <Label className="font-bold">Brand</Label>
              <div className="p-4 rounded-md text-gray-700">
                {currentItem.preferredBrand || "N/A"}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Detailed Specification</Label>
            <div className="p-4 rounded-md text-gray-700">
              {currentItem.itemDescription || "N/A"}
            </div>
          </div>
          <div className="w-full flex gap-3">
            <div className="w-full space-y-2">
              <Label className="font-bold">Units</Label>
              <div className="p-4 rounded-md text-gray-700">
                {currentItem.units || "N/A"}
              </div>
            </div>
            <div className="w-full space-y-2">
              <Label className="font-bold">UOM (Unit of Measure)</Label>
              <div className="p-4 rounded-md text-gray-700">
                {currentItem.UOM || "N/A"}
              </div>
            </div>
          </div>
          <div className="w-full flex gap-3">
            <div className="w-full space-y-2">
              <Label className="font-bold">Recommended Vendor</Label>
              <div className="p-4 rounded-md text-gray-700">
                {getVendorName(currentItem.recommendedVendor)}
              </div>
            </div>
            <div className="w-full space-y-2">
              <Label className="font-bold">Is this a worktool?</Label>
              <div className="p-4 rounded-md text-gray-700">
                {currentItem.isWorkTool === true || currentItem.isWorkTool === "true"
                  ? "Yes"
                  : currentItem.isWorkTool === false || currentItem.isWorkTool === "false"
                    ? "No"
                    : "N/A"}
              </div>
            </div>
          </div>
          {(currentItem.isWorkTool === true || currentItem.isWorkTool === "true") &&
            currentItem.itemType !== "service" &&
            Array.isArray(currentItem.workToolSubcategory) &&
            currentItem.workToolSubcategory.length > 0 && (
              <div className="space-y-2">
                <Label className="font-bold">Personal Work Tool Category</Label>
                <div className="p-4 rounded-md text-gray-700">
                  {currentItem.workToolSubcategory.join(", ")}
                </div>
              </div>
            )}
        </div>

        <div className="flex gap-2 w-full mt-4">
          {canUseDepartmentActions && (
            <>
              <Dialog
                open={approveItemDialogOpen}
                onOpenChange={(open) => {
                  setItemComment("");
                  setApproveItemDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    disabled={approvalDisabled || !approveHandler}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  >
                    Approve
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full sm:max-w-2xl bg-white">
                  <DialogHeader>
                    <DialogTitle>Approve Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Approval Comment</Label>
                      <Textarea
                        value={itemComment}
                        onChange={(e) => setItemComment(e.target.value)}
                        placeholder="Add a comment for approval"
                        className="mt-2"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        onClick={() =>
                          approveHandler?.(currentItem._id).then(() => {
                            setApproveItemDialogOpen(false);
                            onOpenChange(false);
                          })
                        }
                        disabled={isItemRequestLoading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isItemRequestLoading ? "Approving..." : "Approve"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog
                open={rejectItemDialogOpen}
                onOpenChange={(open) => {
                  setItemComment("");
                  setRejectItemDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    disabled={approvalDisabled || !rejectHandler}
                    className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  >
                    Deny
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full sm:max-w-2xl bg-white">
                  <DialogHeader>
                    <DialogTitle>Deny Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Reason for Denial</Label>
                      <Textarea
                        value={itemComment}
                        onChange={(e) => setItemComment(e.target.value)}
                        placeholder="Please provide a reason for denying this request"
                        className="mt-2"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        onClick={() =>
                          rejectHandler?.(currentItem._id).then(() => {
                            setRejectItemDialogOpen(false);
                            onOpenChange(false);
                          })
                        }
                        disabled={isItemRequestLoading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isItemRequestLoading ? "Denying..." : "Deny"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          <DialogClose asChild>
            <Button type="button" className="flex-1 bg-[#0F1E7A] text-white">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
