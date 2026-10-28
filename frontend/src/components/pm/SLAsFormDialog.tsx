"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import React, { ReactNode, useState } from "react";
import { SLA } from "@/services/slaService";

type SLAsFormDialogProps = {
  children: ReactNode;
  handleSLAFormChange: (field: "title" | "content", value: string) => void;
  currentSLA: SLA;
  submit?: (slaId?: string) => Promise<void>;
  mode: "create" | "edit" | "view" | "delete";
  isLoading: boolean;
};

export default function SLAsFormDialog({
  children,
  handleSLAFormChange,
  currentSLA,
  submit,
  mode,
  isLoading,
}: SLAsFormDialogProps) {
  const [slaFormDialogOpen, setSlaFormDialogOpen] = useState<boolean>(false);
  let title = "";
  let submitButtonText = "";

  switch (mode) {
    case "create":
      title = "New";
      submitButtonText = "Create";
      break;
    case "edit":
      title = "Edit";
      submitButtonText = "Update";
      break;
    case "view":
      title = "View";
      break;
    case "delete":
      title = "Delete";
      submitButtonText = "Delete";
      break;
    default:
  }

  const slaId = currentSLA._id || currentSLA.id || "";

  return (
    <Dialog
      open={slaFormDialogOpen}
      onOpenChange={(open) => {
        setSlaFormDialogOpen(open);
      }}
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[650px] flex flex-col bg-white overflow-hidden">
          <DialogHeader className="flex justify-center items-center">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {title} SLA Template
            </DialogTitle>
          </DialogHeader>

          {mode === "delete" ? (
            <div className="py-4 text-center text-sm text-gray-700">
              Are you sure you want to delete this Service Level Agreement (SLA) template:{" "}
              <span className="font-semibold">{currentSLA.title}</span>?
            </div>
          ) : (
            <fieldset
              disabled={mode === "view"}
              className="[&_*]:disabled:opacity-100 flex flex-col w-full space-y-4 overflow-y-auto flex-1 px-1 py-2"
            >
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="p-3 rounded-md border border-gray-300 shadow-sm bg-white focus:ring-2 focus:ring-[#0F1E7A]"
                  placeholder="e.g., Standard Equipment Delivery SLA"
                  value={currentSLA.title}
                  onChange={(e) => handleSLAFormChange("title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Agreement Content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  className="p-3 rounded-md border border-gray-300 shadow-sm bg-white focus:ring-2 focus:ring-[#0F1E7A] min-h-[180px]"
                  placeholder="Enter the detailed terms of the service level agreement..."
                  rows={8}
                  value={currentSLA.content}
                  onChange={(e) => handleSLAFormChange("content", e.target.value)}
                />
              </div>
            </fieldset>
          )}

          <DialogFooter className="flex gap-3 mt-4 pt-2 border-t">
            {mode !== "view" && (
              <Button
                type="button"
                onClick={() => {
                  submit?.(slaId).then(() => {
                    setSlaFormDialogOpen(false);
                  });
                }}
                className={`flex-1 text-white ${
                  mode === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#0F1E7A] hover:bg-[#0a1555]"
                }`}
                disabled={isLoading}
              >
                {isLoading
                  ? submitButtonText.slice(0, -1) + "ing..."
                  : submitButtonText}
              </Button>
            )}
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-gray-100"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
