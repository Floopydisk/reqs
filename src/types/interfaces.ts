/* eslint-disable @typescript-eslint/no-namespace */
export type ObjectId = any;

export interface Document {
  _id?: any;
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

export namespace Types {
  export type ObjectId = any;
}

export const Types = {
  ObjectId: class ObjectId {
    private id: string;
    constructor(id?: any) {
      this.id = id ? String(id) : "";
    }
    toString() {
      return this.id;
    }
  },
};

import {
  UserRole,
  RequisitionStatus,
  // BidStatus, // @deprecated - removed
  // NegotiationStatus, // @deprecated - removed
  PurchaseOrderStatus,
  DeliveryStatus,
  RequisitionUrgency,
  RFQStatus,
  GRNStatus,
  JCFStatus,
} from "./enums";

export interface IUser extends Document {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  department?: string; // Reference to Department
  // @deprecated - vendor field removed
  // vendor?: string; // Reference to Vendor if role is VENDOR
  profileImage?: string;
  isActive: boolean;
  isApproved: boolean;
  designation: string;
  designationId: string;
  createdAt: Date;
  updatedAt: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface IDepartment extends Document {
  name: string;
  code: string;
  description?: string;
  head: string; // Reference to User with DEPARTMENT_HEAD role
  dep: string; // Reference to User with DEPARTMENT_HEAD role
  members: string[]; // Array of User IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendorCategory extends Document {
  name: string;
  description?: string;
  createdBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendor extends Document {
  name: string; // Company name
  contactPerson: string;
  contactPersonDesignation?: string; // Role/designation of contact person in the company
  email: string;
  phone: string;
  address: string;
  website?: string; // Company website URL
  dateOfIncorporation?: Date; // Date company was incorporated
  categories: string[]; // Array of VendorCategory IDs (business categories)
  documents: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  cacDocument?: {
    // CAC (Corporate Affairs Commission) document
    name: string;
    url: string;
    uploadedAt: Date;
  };
  rating?: number;
  isVerified: boolean;
  isActive: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

export interface IItem {
  _id?: ObjectId;
  itemName: string;
  itemType: "product" | "service";
  preferredBrand?: string;
  itemDescription: string;
  uploadImage?: string;
  units?: number;
  UOM?: string;
  recommendedVendor?: ObjectId;
  isWorkTool: boolean;
  // Item-level status tracking
  status?: string;
  // HOD approval
  departmentApprovedBy?: ObjectId;
  departmentApprovedAt?: Date;
  departmentRejectedBy?: ObjectId;
  departmentRejectedAt?: Date;
  departmentComments?: string;
  // HR approval (for working tools)
  hrApprovedBy?: ObjectId;
  hrApprovedAt?: Date;
  hrRejectedBy?: ObjectId;
  hrRejectedAt?: Date;
  hrComments?: string;
  // @deprecated - HHRA fields kept for backward compatibility
  hhraApprovedBy?: ObjectId;
  hhraApprovedAt?: Date;
  hhraRejectedBy?: ObjectId;
  hhraRejectedAt?: Date;
  hhraComments?: string;
  procurementComments?: string;
  // RFQ reference
  rfq?: ObjectId;
  // @deprecated - bidding fields
  selectedVendorsForItem?: ObjectId[];
  purchaseOrder?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILocation extends Document {
  name: string;
  address?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
}

export interface IRequisition extends Document {
  requisitionNumber: string;
  title: string;
  urgency?: RequisitionUrgency;
  justification: string;
  deliveryLocation: ObjectId;
  deliveryDate: Date;
  items: IItem[];
  requester: ObjectId;
  department: ObjectId;
  assignedApprover?: ObjectId;
  status: RequisitionStatus;
  requestApprovedAt?: Date;
  poApprovedAt?: Date;
  attachments?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  approvals?: {
    stage: string;
    approver: ObjectId; // Reference to User
    status: "approved" | "rejected" | "pending";
    comments?: string;
    timestamp: Date;
  }[];
  vendorCategory?: ObjectId; // Reference to VendorCategory
  additionalInfo?: string; // Additional information
  purchaseOrder?: ObjectId; // Reference to PurchaseOrder
  delivery?: ObjectId; // Reference to Delivery (deprecated - use GRN)
  createdAt: Date;
  updatedAt: Date;
  cancelledBy?: string;
  cancellationReason?: string | null;
  cancelledAt?: Date;
  // Payment tracking fields
  paymentStatus?: "unpaid" | "partially_paid" | "fully_paid";
  paymentAmount?: number;
  paymentDate?: Date;
  paymentReference?: string;
  paymentNotes?: string;
  paymentBy?: ObjectId;
  relatedRfqs?: ObjectId[];
  relatedPos?: ObjectId[];
}

export interface IPurchaseOrderApproval {
  approver: ObjectId;
  approverRole: "hof" | "hhr";
  status?: "approved" | "rejected" | "pending";
  approvedAt?: Date;
  rejectedAt?: Date;
  feedback?: string;
  reason?: string;
}

export interface IPurchaseOrderQuote {
  vendor?: ObjectId;
  filename: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt: Date;
  uploadedBy?: ObjectId;
}

export interface IPurchaseOrderItem {
  itemId?: ObjectId;
  itemDescription: string;
  detailsSpecification?: string;
  quantity: number;
  uom: string;
  brand?: string;
  unitPrice: number;
  totalPrice: number;
  lineType?: string; // 'requisition' | 'service_charge' | 'logistics' | 'custom'
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  title?: string;
  requisition: ObjectId;
  rfq: ObjectId;
  vendor: ObjectId;
  items: IPurchaseOrderItem[];
  subtotal?: number;
  discount?: number;
  discountType?: "fixed" | "percentage";
  discountAmount?: number;
  vat?: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount: number;
  totalPrice?: number; // Compatibility alias
  deliveryLocation: ObjectId;
  deliveryDate: Date;
  deliveryContact: ObjectId;
  deliveryAddressSnapshot?: {
    name: string;
    address?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
  };
  shipping: string;
  generalTerms?: string;
  evaluationCriteria?: string;
  termsOfService?: string;
  paymentTerms?: string;
  quoteUrl?: string;
  vendorQuote?: string;
  vendorQuotes?: IPurchaseOrderQuote[];
  approvals: IPurchaseOrderApproval[];
  status: PurchaseOrderStatus;
  createdBy: ObjectId;
  submittedBy?: ObjectId;
  submittedAt?: Date;
  pdfUrl?: string;
  serviceClassificationOverride?: string;
  serviceClassificationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  // @deprecated fields - kept for backward compatibility
  bid?: ObjectId;
  notes?: string;
  issuedBy?: ObjectId;
  issuedAt?: Date;
  acknowledgedBy?: ObjectId | string;
  acknowledgedAt?: Date;
  attachments?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
}

export interface IJCFApproval {
  approver: ObjectId;
  status: "approved" | "rejected" | "pending";
  comments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
}

export interface IJCF extends Document {
  jcfNumber: string;
  purchaseOrder: ObjectId;
  requisition: ObjectId;
  vendor: ObjectId;
  createdBy: ObjectId; // PM
  approver: ObjectId; // Requester
  serviceDescription: string;
  completionEvidence?: string;
  rating?: number;
  status: JCFStatus;
  approval?: IJCFApproval;
  attachments?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  pdfUrl?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRFQItem {
  itemId: ObjectId; // Reference to item in requisition
  itemDescription: string; // Item Name + Brand
  detailedSpecification: string; // From item description
  uom: string;
  quantity: number;
  expectedDeliveryDate: Date;
}

export interface IRFQ extends Document {
  rfqNumber: string;
  title: string;
  requisition: ObjectId;
  vendors: ObjectId[];
  vendor: ObjectId; // Reference to Vendor Master
  relatedPos?: ObjectId[];
  items: IRFQItem[];
  evaluationCriteria: string;
  termsAndConditions: string;
  deliveryLocation: ObjectId;
  expectedDeliveryDate?: Date;
  status: RFQStatus;
  createdBy: ObjectId;
  issuedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGRNItem {
  itemId: ObjectId; // Reference to item in PO
  itemDescription: string;
  quantityOrdered: number;
  quantityReceived: number;
  uom: string;
  condition: string; // Good, Damaged, etc.
  remarks?: string;
}

export interface IGRNApproval {
  approver: ObjectId;
  approverRole: string; // "receiver" | "pm"
  status: "pending" | "approved" | "rejected";
  approvedAt?: Date;
  comments?: string;
}

export interface IGRN extends Document {
  grnNumber: string;
  purchaseOrder: ObjectId;
  requisition: ObjectId;
  items: IGRNItem[];
  generalRemarks?: string;
  // Approval chain: Store Manager creates -> Receiver confirms -> PM final confirmation
  createdBy: ObjectId; // Store Manager
  receiver: ObjectId; // Defaults to requester, can be edited
  approvals: IGRNApproval[];
  status: GRNStatus;
  deliveredAt?: Date; // Final confirmation timestamp
  createdAt: Date;
  updatedAt: Date;
}

export interface IDelivery extends Document {
  deliveryNumber: string;
  purchaseOrder: ObjectId;
  requisition: ObjectId; // Reference to Requisition
  vendor: ObjectId; // Reference to Vendor
  items: {
    name: string;
    description?: string;
    quantityOrdered: number;
    quantityDelivered: number;
    unitPrice: number;
    totalPrice: number;
    condition: "good" | "damaged" | "incomplete";
    notes?: string;
  }[];
  deliveryDate: Date;
  receivedBy?: string; // Reference to User (inventory manager)
  receivedAt?: Date;
  status: DeliveryStatus;
  attachments?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  notes?: string;
  inventoryVerification?: {
    verifiedBy: string; // Reference to User
    verifiedAt: Date;
    notes?: string;
  };
  departmentVerification?: {
    verifiedBy: string; // Reference to User
    verifiedAt: Date;
    notes?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IItemHistory extends Document {
  requisitionId: ObjectId;
  itemId: ObjectId;
  action: string;
  performedBy: ObjectId;
  previousStatus?: string;
  newStatus?: string;
  comments?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
