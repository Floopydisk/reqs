"use client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoadingDialogProps {
  isOpen: boolean;
}

export default function LoadingDialog({ isOpen }: LoadingDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-white flex flex-col items-center">
        <DialogTitle className="sr-only">Loading</DialogTitle>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F1E7A]"></div>
          <p className="text-lg font-semibold">Preparing page...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}