import { RequisitionStatus, ItemStatus } from "../types/enums";

/**
 * Aggregates item statuses to determine the overall requisition status
 * Workflow:
 * 1. Requisition submitted -> items are pending
 * 2. HOD approves items:
 *    - Non-working tools -> departmentApproved
 *    - Working tools -> hrReview
 * 3. If any item is in hrReview -> requisition status is HR_REVIEW ("Approved by HOD (hr review)")
 * 4. HR approves working tools -> item status becomes hrApproved
 * 5. When all active items are approved (combination of departmentApproved and hrApproved, with all working tools hrApproved) ->
 *    requisition status moves to DEPARTMENT_APPROVED (ready for Head of Finance review / RFQ generation)
 * @param requisition - The requisition document with items
 * @returns Updated requisition status based on item statuses
 */
export function aggregateRequisitionStatus(
  requisition: any
): RequisitionStatus {
  const items = requisition.items;

  if (!items || items.length === 0) {
    return RequisitionStatus.DRAFT;
  }

  // Count items by status
  const statusCounts = {
    pending: 0,
    departmentApproved: 0,
    departmentRejected: 0,
    hrReview: 0,
    hrApproved: 0,
    hrRejected: 0,
    rfqGenerated: 0,
    vendorSelected: 0,
    poGenerated: 0,
    delivered: 0,
    cancelled: 0,
  };

  items.forEach((item: any) => {
    const status = item.status || ItemStatus.PENDING;
    switch (status) {
      case ItemStatus.PENDING:
        statusCounts.pending++;
        break;
      case ItemStatus.DEPARTMENT_APPROVED:
        statusCounts.departmentApproved++;
        break;
      case ItemStatus.DEPARTMENT_REJECTED:
        statusCounts.departmentRejected++;
        break;
      case ItemStatus.HR_REVIEW:
        statusCounts.hrReview++;
        break;
      case ItemStatus.HR_APPROVED:
        statusCounts.hrApproved++;
        break;
      case ItemStatus.HR_REJECTED:
        statusCounts.hrRejected++;
        break;
      case ItemStatus.RFQ_GENERATED:
        statusCounts.rfqGenerated++;
        break;
      case ItemStatus.VENDOR_SELECTED:
        statusCounts.vendorSelected++;
        break;
      case ItemStatus.PO_GENERATED:
        statusCounts.poGenerated++;
        break;
      case ItemStatus.DELIVERED:
        statusCounts.delivered++;
        break;
      case ItemStatus.CANCELLED:
        statusCounts.cancelled++;
        break;
    }
  });

  const totalItems = items.length;
  const activeItems = totalItems - statusCounts.cancelled;

  // If all items are cancelled, requisition is cancelled
  if (statusCounts.cancelled === totalItems) {
    return RequisitionStatus.CANCELLED;
  }

  // If all active items are delivered, requisition is delivered
  if (activeItems > 0 && statusCounts.delivered === activeItems) {
    return RequisitionStatus.DELIVERED;
  }

  // If some items delivered, partially delivered
  if (statusCounts.delivered > 0 && statusCounts.delivered < activeItems) {
    return RequisitionStatus.PARTIALLY_DELIVERED;
  }

  // If items in RFQ or vendor selected stages
  if (
    statusCounts.rfqGenerated > 0 ||
    statusCounts.vendorSelected > 0 ||
    statusCounts.poGenerated > 0
  ) {
    return RequisitionStatus.RFQ_GENERATION;
  }

  // If any HR rejected
  if (statusCounts.hrRejected > 0) {
    return RequisitionStatus.HR_REJECTED;
  }

  // If any department rejected
  if (statusCounts.departmentRejected > 0) {
    return RequisitionStatus.DEPARTMENT_REJECTED;
  }

  // If any items are actively in HR review (working tools awaiting HR decision)
  if (statusCounts.hrReview > 0) {
    return RequisitionStatus.HR_REVIEW;
  }

  // Check if any items are working tools
  const hasWorkingTools = items.some(
    (item: any) => item.isWorkTool && item.status !== ItemStatus.CANCELLED
  );

  // If all active items are approved
  const approvedCount =
    statusCounts.departmentApproved + statusCounts.hrApproved;

  if (activeItems > 0 && approvedCount === activeItems) {
    if (hasWorkingTools) {
      const allWorkingToolsApproved = items
        .filter(
          (item: any) =>
            item.isWorkTool && item.status !== ItemStatus.CANCELLED
        )
        .every((item: any) => item.status === ItemStatus.HR_APPROVED);

      if (allWorkingToolsApproved) {
        return RequisitionStatus.DEPARTMENT_APPROVED;
      }
      return RequisitionStatus.HR_REVIEW;
    }

    return RequisitionStatus.DEPARTMENT_APPROVED;
  }

  // If all pending, requisition is submitted
  if (statusCounts.pending === totalItems) {
    return RequisitionStatus.SUBMITTED;
  }

  // Default to submitted for mixed states
  return RequisitionStatus.SUBMITTED;
}

/**
 * Updates requisition status based on item statuses and saves the requisition
 * Automatically routes to HR if working tools are department approved
 * @param requisition - The requisition document with items
 * @returns Promise<void>
 */
export async function updateRequisitionStatusFromItems(
  requisition: any
): Promise<void> {
  // Check if any department-approved items are working tools and need HR routing
  const departmentApprovedWorkingTools = requisition.items.filter(
    (item: any) =>
      item.isWorkTool && item.status === ItemStatus.DEPARTMENT_APPROVED
  );

  // Automatically route working tools to HR review
  if (departmentApprovedWorkingTools.length > 0) {
    for (const item of departmentApprovedWorkingTools) {
      item.status = ItemStatus.HR_REVIEW;
    }
  }

  const newStatus = aggregateRequisitionStatus(requisition);

  if (requisition.status !== newStatus) {
    requisition.status = newStatus;
  }
}
