import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import ApprovalModal from "./ApprovalModal";
import DenialModal from "./DenialModal";
import CancelRequestModal from "./CancelRequestModal";
import { RequestActionsProps } from "../types";

export default function RequestActions({
  isEditMode,
  loading,
  userType,
  formData,
  user,
  backPath,
  onEditModeChange,
  onSave,
  showApprovalModal,
  setShowApprovalModal,
  approvalComment,
  setApprovalComment,
  onApproval,
  showDenialModal,
  setShowDenialModal,
  denialReason,
  setDenialReason,
  onDenial,
  approvalLoading,
  showCancelModal,
  setShowCancelModal,
  cancelReason,
  setCancelReason,
  onCancel,
}: RequestActionsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-6">
      {isEditMode ? (
        <>
          <Button
            variant="outline"
            // className="flex-1 py-6"
            className="border border-red-600 text-red-600 bg-transparent! hover:bg-red-500! hover:text-white! flex-1 py-6"
            onClick={() => onEditModeChange(false)}
          >
            Cancel Edit
          </Button>
          <Button
            disabled={loading}
            onClick={onSave}
            className="bg-[#0F1E7A] hover:bg-[#0b154b] text-white flex-1 py-6"
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </>
      ) : (
        <>
          {/* <Button
            onClick={() => router.push(backPath)}
            className="bg-gray-600 hover:bg-[#0b154b] text-white flex-1 py-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Close
          </Button> */}

          {(userType === "user" || user?.id === formData.requester?._id) && (
            <Button
              onClick={() => onEditModeChange(true)}
              className="bg-[#0F1E7A] hover:bg-[#0b154b] text-white flex-1 py-6"
            >
              Edit
            </Button>
          )}

          {userType === "hod" && formData.status === "submitted" && (
            <>
              <ApprovalModal
                open={showApprovalModal}
                onOpenChange={setShowApprovalModal}
                comment={approvalComment}
                onCommentChange={setApprovalComment}
                onApprove={onApproval}
                loading={approvalLoading}
              />
              <DenialModal
                open={showDenialModal}
                onOpenChange={setShowDenialModal}
                reason={denialReason}
                onReasonChange={setDenialReason}
                onDeny={onDenial}
                loading={approvalLoading}
              />
            </>
          )}
        </>
      )}

      {(userType === "user" || user?.id === formData.requester?._id) && (
        <CancelRequestModal
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          reason={cancelReason}
          onReasonChange={setCancelReason}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}
