export enum UserRole {
  STAFF = "staff",
  DEPARTMENT_HEAD = "departmentHead",
  PROCUREMENT_MANAGER = "procurementManager",
  HR_APPROVER = "hrApprover",
  HEAD_OF_FINANCE = "headOfFinance", // HoF - approves PO first
  HEAD_OF_HR = "headOfHr", // HHR - approves PO second
  STORE_MANAGER = "storeManager", // Manages GRN and delivery
  WAREHOUSE_MANAGER = "warehouseManager", // Compatibility alias for warehouse/store manager
  ADMIN = "admin",
  SUPER_ADMIN = "superAdmin",
  // @deprecated roles - kept for backward compatibility during migration
  ACCOUNTS_APPROVER = "accountsApprover",
  HHRA = "hhra",
  SENIOR_MANAGEMENT = "seniorManagement",
  INVENTORY_MANAGER = "inventoryManager",
  FINANCE_MANAGER = "financeManager",
}

export enum JCFStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pendingApproval",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum RequisitionStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  DEPARTMENT_APPROVED = "departmentApproved",
  DEPARTMENT_REJECTED = "departmentRejected",
  HR_REVIEW = "hrReview", // For working tools
  HR_APPROVED = "hrApproved",
  HR_REJECTED = "hrRejected",
  HOF_APPROVED = "hofApproved",
  HOF_REJECTED = "hofRejected",
  PROCUREMENT_REVIEW = "procurementReview",
  RFQ_GENERATION = "rfqGeneration", // PM generating RFQ
  VENDOR_BIDDING = "vendorBidding", // RFQs issued to vendors
  VENDOR_ASSIGNED = "vendorAssigned", // PO created from selected RFQ
  PO_PENDING_APPROVAL = "poPendingApproval", // PO awaiting HoF/HHR approval
  PO_APPROVED = "poApproved", // PO fully approved
  DELIVERED = "delivered", // All items delivered
  PARTIALLY_DELIVERED = "partiallyDelivered", // Some items delivered
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  // @deprecated - kept for backward compatibility
  HHRA_REVIEW = "hhraReview",
  HHRA_APPROVED = "hhraApproved",
  HHRA_REJECTED = "hhraRejected",
  ACCOUNTS_REVIEW = "accountsReview",
  ACCOUNTS_APPROVED = "accountsApproved",
  ACCOUNTS_REJECTED = "accountsRejected",
  NEGOTIATION = "negotiation",
  PO_GENERATED = "poGenerated",
  VENDOR_ACKNOWLEDGED = "vendorAcknowledged",
  INVENTORY_CONFIRMED = "inventoryConfirmed",
  DEPARTMENT_CONFIRMED = "departmentConfirmed",
  PAID = "paid",
  PO_GENERATION = "poGeneration",
}

export enum RequisitionCategory {
  PRODUCT = "product",
  SERVICE = "service",
}

export enum ItemStatus {
  PENDING = "pending",
  DEPARTMENT_APPROVED = "departmentApproved",
  DEPARTMENT_REJECTED = "departmentRejected",
  HR_REVIEW = "hrReview", // For working tools only
  HR_APPROVED = "hrApproved",
  HR_REJECTED = "hrRejected",
  PROCUREMENT_REVIEW = "procurementReview", // With PM
  RFQ_GENERATED = "rfqGenerated",
  VENDOR_SELECTED = "vendorSelected",
  PO_GENERATED = "poGenerated",
  DELIVERED = "delivered",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  // @deprecated - kept for backward compatibility
  HHRA_APPROVED = "hhraApproved",
  HHRA_REJECTED = "hhraRejected",
  VENDOR_BIDDING = "vendorBidding",
}

export enum RequisitionUrgency {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum RequisitionPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

// RFQ (Request for Quotation) Status
export enum RFQStatus {
  DRAFT = "draft",
  ISSUED = "issued", // RFQ sent to vendor
  QUOTE_RECEIVED = "quoteReceived", // Vendor quote received and uploaded
  VENDOR_ASSIGNED = "vendorAssigned", // Vendor selected and PO created
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// GRN (Goods Received Note) Status
export enum GRNStatus {
  DRAFT = "draft",
  PENDING_RECEIVER_CONFIRMATION = "pendingReceiverConfirmation", // Awaiting requester confirmation
  PENDING_PM_CONFIRMATION = "pendingPmConfirmation", // Awaiting PM final confirmation
  DELIVERED = "delivered", // Final confirmation complete
  REJECTED = "rejected",
}

// Remove BidStatus and NegotiationStatus as they're no longer needed

export enum PurchaseOrderStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted", // Submitted for approval
  HOF_APPROVED = "hofApproved", // Head of Finance approved
  APPROVED = "approved", // Both HoF and HHR approved
  REJECTED = "rejected",
  COMPLETED = "completed", // All items delivered via GRN
  CANCELLED = "cancelled",
  // @deprecated - kept for backward compatibility
  ISSUED = "issued",
  ACKNOWLEDGED = "acknowledged",
  FULFILLED = "fulfilled",
}

export enum DeliveryStatus {
  SCHEDULED = "scheduled",
  PM_NOTIFIED = "pmNotified",
  PENDING = "pending",
  DELIVERED = "delivered",
  REQUESTER_VERIFIED = "requesterVerified",
  REQUESTER_REJECTED = "requesterRejected",
  HOD_APPROVED = "hodApproved",
  HOD_REJECTED = "hodRejected",
  COMPLETED = "completed",
  INVENTORY_VERIFIED = "inventoryVerified",
  INVENTORY_CONFIRMED = "inventoryConfirmed",
  DEPARTMENT_VERIFIED = "departmentVerified",
  DEPARTMENT_CONFIRMED = "departmentConfirmed",
}
