export const CONSTANTS = {
  // Requisitions
  REQUISITION: {
    API: {
      APPROVE_BULK_REQUISITION_ITEMS: (requisitionId: string) =>
        `/requisitions/${requisitionId}/items/bulk-approve`,
      REJECT_BULK_REQUISITION_ITEMS: (requisitionId: string) =>
        `/requisitions/${requisitionId}/items/bulk-reject`,
      APPROVE_REQUISITION_ITEM: (requisitionId: string, itemId: string) =>
        `/requisitions/${requisitionId}/items/${itemId}/approve`,
      REJECT_REQUISITION_ITEM: (requisitionId: string, itemId: string) =>
        `/requisitions/${requisitionId}/items/${itemId}/reject`,
      HR_APPROVE_REQUISITION_ITEM: (requisitionId: string, itemId: string) =>
        `/requisitions/${requisitionId}/items/${itemId}/hr-approve`,
      HR_REJECT_REQUISITION_ITEM: (requisitionId: string, itemId: string) =>
        `/requisitions/${requisitionId}/items/${itemId}/hr-reject`,
      REJECT_REQUISITION: (requisitionId: string) =>
        `/requisitions/${requisitionId}/department-rejection`,
      HOF_APPROVE_REQUISITION: (requisitionId: string) =>
        `/requisitions/${requisitionId}/hof-approval`,
      HOF_REJECT_REQUISITION: (requisitionId: string) =>
        `/requisitions/${requisitionId}/hof-reject`,
    },
    COMMENT: {
      ITEM_APPROVAL: "Approved for requisition",
      ITEM_REJECTION: "Rejected for requisition",
      REJECTION: "Rejected for procurement",
    },
    NOTIFICATION: {
      PROVIDE_APPROVAL_COMMENT_WARN: "Please provide a reason for approval",
      APPROVE_REQUISITION_ITEM_SUCCESS:
        "Requisition item approved successfully",
      APPROVE_REQUISITION_ITEM_ERROR: "Error approving requisition item",
      APPROVE_REQUISITION_ITEM_FAIL: "Failed to approve requisition item",
      PROVIDE_REJECTION_COMMENT_WARN: "Please provide a reason for rejection",
      REJECT_REQUISITION_ITEM_SUCCESS: "Requisition item rejected successfully",
      REJECT_REQUISITION_ITEM_ERROR: "Error rejecting requisition item",
      REJECT_REQUISITION_ITEM_FAIL: "Failed to reject requisition item",
      REJECT_REQUISITION_SUCCESS: "Requisition rejected successfully",
      REJECT_REQUISITION_ERROR: "Error rejecting requisition",
      REJECT_REQUISITION_FAIL: "Failed to reject requisition",
    },
  },
  LOCATION: {
    PAGE: "locations",
    API: {
      LOCATIONS: "/locations",
      LOCATION_BY_ID: (id: string) => `/locations/${id}`,
    },
    NOTIFICATION: {
      FETCH_LOCATION_ERROR: "Failed to fetch locations",
      CREATE_LOCATION_SUCCESS: "Location created successfully",
      CREATE_LOCATION_FAIL: "Failed to create locations",
      CREATE_LOCATION_ERROR: "Error creating location",
      UPDATE_LOCATION_SUCCESS: "Location updated successfully",
      UPDATE_LOCATION_FAIL: "Failed to update locations",
      UPDATE_LOCATION_ERROR: "Error updating location",
      DELETE_LOCATION_SUCCESS: "Location deleted successfully",
      DELETE_LOCATION_FAIL: "Failed to delete locations",
      DELETE_LOCATION_ERROR: "Error deleting location",
    },
  },
} as const;
