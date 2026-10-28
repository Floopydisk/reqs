import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CancelRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
}

export default function CancelRequestModal({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  onCancel,
}: CancelRequestModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className="bg-white max-w-2xl" asChild>
        <Button
          variant="outline"
          className="border-red-600 text-red-600 hover:bg-red-50 flex-1 py-6"
        >
          Cancel Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>Cancel Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason for cancellation</Label>
            <Textarea
              value={reason}
              className="mt-2"
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Please provide a reason for cancelling this request"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={onCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
