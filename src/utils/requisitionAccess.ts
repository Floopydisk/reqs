import { ItemStatus, RequisitionStatus, UserRole } from "../types/enums";
import {
  getWorkToolCategory,
  hasActiveWorkToolItems as hasActiveWorkToolItemsHelper,
  isActiveWorkToolItem,
  isUserWorkToolDepartmentHead,
} from "./workTool";

const idOf = (value: any): string | undefined => {
  const id = value?._id || value?.id || value;
  return id === undefined || id === null ? undefined : String(id);
};

const POST_APPROVAL_STATUSES = new Set<string>([
  RequisitionStatus.HOF_APPROVED,
  RequisitionStatus.PROCUREMENT_REVIEW,
  RequisitionStatus.RFQ_GENERATION,
  RequisitionStatus.VENDOR_BIDDING,
  RequisitionStatus.VENDOR_ASSIGNED,
  RequisitionStatus.PO_PENDING_APPROVAL,
  RequisitionStatus.PO_APPROVED,
  RequisitionStatus.NEGOTIATION,
  RequisitionStatus.PO_GENERATED,
  RequisitionStatus.PO_GENERATION,
  RequisitionStatus.VENDOR_ACKNOWLEDGED,
  RequisitionStatus.DELIVERED,
  RequisitionStatus.PARTIALLY_DELIVERED,
  RequisitionStatus.INVENTORY_CONFIRMED,
  RequisitionStatus.DEPARTMENT_CONFIRMED,
  RequisitionStatus.COMPLETED,
  RequisitionStatus.PAID,
]);

const HHRA_STATUSES = new Set<string>([
  RequisitionStatus.HR_REVIEW,
  RequisitionStatus.HR_APPROVED,
  RequisitionStatus.HHRA_REVIEW,
  RequisitionStatus.HHRA_APPROVED,
  RequisitionStatus.HOD_TOOL_COMMENT,
]);

const hasActiveWorkToolItems = (requisition: any): boolean => {
  const items = requisition?.items || requisition;
  return hasActiveWorkToolItemsHelper(items);
};

const hasReachedDepartmentApproval = (status: string): boolean =>
  status === RequisitionStatus.DEPARTMENT_APPROVED ||
  POST_APPROVAL_STATUSES.has(status);

export function canAccessRequisition(user: any, requisition: any): boolean {
  if (!user || !requisition) return false;

  const role = user.role;
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return true;
  const designation = String(user.designation || "").toLowerCase();
  const isHhraDepartmentHead =
    role === UserRole.DEPARTMENT_HEAD &&
    designation === "head, human resources & admin";
  const isFinanceDepartmentHead =
    role === UserRole.DEPARTMENT_HEAD && designation === "head, finance";

  const currentUserId = idOf(user);
  const requesterId = idOf(requisition.requester || requisition.requesterId);
  // 1. Creator / Requester can always view requisition
  if (currentUserId && requesterId === currentUserId) return true;

  // 2. All personnel who have approved/acted on this requisition (in approvals history)
  // must be able to view and monitor it until the end
  if (currentUserId && Array.isArray(requisition.approvals)) {
    const hasApproved = requisition.approvals.some((ap: any) => {
      const approverId = idOf(ap?.approver || ap?.approverId);
      return approverId === currentUserId;
    });
    if (hasApproved) return true;
  }

  // 3. Current assigned approver
  const assignedApproverId = idOf(
    requisition.assignedApprover || requisition.assignedApproverId,
  );
  if (currentUserId && assignedApproverId && currentUserId === assignedApproverId) {
    return true;
  }

  const departmentHeadId = idOf(
    requisition.department?.head ||
      requisition.department?.headId ||
      requisition.departmentHead,
  );
  const status = String(requisition.status || "");
  const requisitionDepartmentId = idOf(
    requisition.department || requisition.departmentId,
  );
  const userDepartmentId = idOf(user.department || user.departmentId);
  const isDepartmentHead =
    user.role === UserRole.DEPARTMENT_HEAD &&
    currentUserId &&
    userDepartmentId === requisitionDepartmentId &&
    (!departmentHeadId || departmentHeadId === currentUserId);

  // 4. Department Head of the requisition's department:
  // Once submitted (not draft), the HoD can view and monitor the requisition
  // across all subsequent statuses till the end
  if (
    currentUserId &&
    (departmentHeadId === currentUserId || isDepartmentHead) &&
    status !== RequisitionStatus.DRAFT
  ) {
    return true;
  }

  // 5. Work Tool Category Department Head:
  // Can view work-tool requisitions during HR review, HoD comment, and all subsequent stages
  if (
    user.role === UserRole.DEPARTMENT_HEAD &&
    hasActiveWorkToolItems(requisition)
  ) {
    const items = requisition.items || [];
    const activeTool = Array.isArray(items)
      ? items.find(isActiveWorkToolItem)
      : undefined;
    const category = activeTool ? getWorkToolCategory(activeTool) : undefined;
    if (category && isUserWorkToolDepartmentHead(user, category)) {
      if (
        status === RequisitionStatus.HOD_TOOL_COMMENT ||
        status === RequisitionStatus.HR_REVIEW ||
        status === RequisitionStatus.DEPARTMENT_APPROVED ||
        POST_APPROVAL_STATUSES.has(status)
      ) {
        return true;
      }
    }
  }

  // 6. HHRA / Head of HR
  if (
    ([UserRole.HHRA, UserRole.HEAD_OF_HR, UserRole.HR_APPROVER].includes(role) ||
      isHhraDepartmentHead) &&
    (HHRA_STATUSES.has(status) ||
      (hasActiveWorkToolItems(requisition) &&
        (status === RequisitionStatus.DEPARTMENT_APPROVED ||
          POST_APPROVAL_STATUSES.has(status) ||
          status === RequisitionStatus.HR_REJECTED ||
          status === RequisitionStatus.CANCELLED)))
  ) {
    return true;
  }

  // 7. Head of Finance
  if (
    ([UserRole.HEAD_OF_FINANCE, UserRole.FINANCE_MANAGER, UserRole.ACCOUNTS_APPROVER].includes(role) ||
      isFinanceDepartmentHead) &&
    (hasReachedDepartmentApproval(status) ||
      status === RequisitionStatus.HOF_REJECTED ||
      status === RequisitionStatus.CANCELLED)
  ) {
    return true;
  }

  // 8. Procurement Manager
  if (
    role === UserRole.PROCUREMENT_MANAGER &&
    (status === RequisitionStatus.DEPARTMENT_APPROVED ||
      POST_APPROVAL_STATUSES.has(status) ||
      status === RequisitionStatus.CANCELLED)
  ) {
    return true;
  }

  // 9. Senior Management
  if (
    role === UserRole.SENIOR_MANAGEMENT &&
    [
      RequisitionStatus.NEGOTIATION,
      RequisitionStatus.PO_GENERATED,
      RequisitionStatus.PO_PENDING_APPROVAL,
      RequisitionStatus.PO_APPROVED,
      RequisitionStatus.DELIVERED,
      RequisitionStatus.COMPLETED,
      RequisitionStatus.PAID,
    ].includes(status as RequisitionStatus)
  ) {
    return true;
  }

  return false;
}
