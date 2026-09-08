import mongoose, { Document } from "mongoose";
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
  createdBy?: mongoose.Types.ObjectId;
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
  _id?: mongoose.Types.ObjectId;
  itemName: string;
  itemType: "product" | "service";
  preferredBrand?: string;
  itemDescription: string;
  uploadImage?: string;
  units?: number;
  UOM?: string;
  recommendedVendor?: mongoose.Types.ObjectId;
  isWorkTool: boolean;
  // Item-level status tracking
  status?: string;
  // HOD approval
  departmentApprovedBy?: mongoose.Types.ObjectId;
  departmentApprovedAt?: Date;
  departmentRejectedBy?: mongoose.Types.ObjectId;
  departmentRejectedAt?: Date;
  departmentComments?: string;
  // HR approval (for working tools)
  hrApprovedBy?: mongoose.Types.ObjectId;
  hrApprovedAt?: Date;
  hrRejectedBy?: mongoose.Types.ObjectId;
  hrRejectedAt?: Date;
  hrComments?: string;
  // @deprecated - HHRA fields kept for backward compatibility
  hhraApprovedBy?: mongoose.Types.ObjectId;
  hhraApprovedAt?: Date;
  hhraRejectedBy?: mongoose.Types.ObjectId;
  hhraRejectedAt?: Date;
  hhraComments?: string;
  procurementComments?: string;
  // RFQ reference
  rfq?: mongoose.Types.ObjectId;
  // @deprecated - bidding fields
  selectedVendorsForItem?: mongoose.Types.ObjectId[];
  purchaseOrder?: mongoose.Types.ObjectId;
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
  deliveryLocation: mongoose.Types.ObjectId;
  deliveryDate: Date;
  items: IItem[];
  requester: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  assignedApprover?: mongoose.Types.ObjectId;
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
    approver: mongoose.Types.ObjectId; // Reference to User
    status: "approved" | "rejected" | "pending";
    comments?: string;
    timestamp: Date;
  }[];
  vendorCategory?: mongoose.Types.ObjectId; // Reference to VendorCategory
  additionalInfo?: string; // Additional information
  purchaseOrder?: mongoose.Types.ObjectId; // Reference to PurchaseOrder
  delivery?: mongoose.Types.ObjectId; // Reference to Delivery (deprecated - use GRN)
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
  paymentBy?: mongoose.Types.ObjectId;
  relatedRfqs?: mongoose.Types.ObjectId[];
  relatedPos?: mongoose.Types.ObjectId[];
}

export interface IPurchaseOrderApproval {
  approver: mongoose.Types.ObjectId;
  approverRole: "hof" | "hhr";
  status?: "approved" | "rejected" | "pending";
  approvedAt?: Date;
  rejectedAt?: Date;
  feedback?: string;
  reason?: string;
}

export interface IPurchaseOrderQuote {
  vendor?: mongoose.Types.ObjectId;
  filename: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt: Date;
  uploadedBy?: mongoose.Types.ObjectId;
}

export interface IPurchaseOrderItem {
  itemId?: mongoose.Types.ObjectId;
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
  requisition: mongoose.Types.ObjectId;
  rfq: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
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
  deliveryLocation: mongoose.Types.ObjectId;
  deliveryDate: Date;
  deliveryContact: mongoose.Types.ObjectId;
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
  createdBy: mongoose.Types.ObjectId;
  submittedBy?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  pdfUrl?: string;
  serviceClassificationOverride?: string;
  serviceClassificationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  // @deprecated fields - kept for backward compatibility
  bid?: mongoose.Types.ObjectId;
  notes?: string;
  issuedBy?: mongoose.Types.ObjectId;
  issuedAt?: Date;
  acknowledgedBy?: mongoose.Types.ObjectId | string;
  acknowledgedAt?: Date;
  attachments?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
}

export interface IJCFApproval {
  approver: mongoose.Types.ObjectId;
  status: "approved" | "rejected" | "pending";
  comments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
}

export interface IJCF extends Document {
  jcfNumber: string;
  purchaseOrder: mongoose.Types.ObjectId;
  requisition: mongoose.Types.ObjectId;
  vendor: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId; // PM
  approver: mongoose.Types.ObjectId; // Requester
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
  itemId: mongoose.Types.ObjectId; // Reference to item in requisition
  itemDescription: string; // Item Name + Brand
  detailedSpecification: string; // From item description
  uom: string;
  quantity: number;
  expectedDeliveryDate: Date;
}

export interface IRFQ extends Document {
  rfqNumber: string;
  title: string;
  requisition: mongoose.Types.ObjectId;
  vendors: mongoose.Types.ObjectId[];
  vendor: mongoose.Types.ObjectId; // Reference to Vendor Master
  relatedPos?: mongoose.Types.ObjectId[];
  items: IRFQItem[];
  evaluationCriteria: string;
  termsAndConditions: string;
  deliveryLocation: mongoose.Types.ObjectId;
  expectedDeliveryDate?: Date;
  status: RFQStatus;
  createdBy: mongoose.Types.ObjectId;
  issuedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGRNItem {
  itemId: mongoose.Types.ObjectId; // Reference to item in PO
  itemDescription: string;
  quantityOrdered: number;
  quantityReceived: number;
  uom: string;
  condition: string; // Good, Damaged, etc.
  remarks?: string;
}

export interface IGRNApproval {
  approver: mongoose.Types.ObjectId;
  approverRole: string; // "receiver" | "pm"
  status: "pending" | "approved" | "rejected";
  approvedAt?: Date;
  comments?: string;
}

export interface IGRN extends Document {
  grnNumber: string;
  purchaseOrder: mongoose.Types.ObjectId;
  requisition: mongoose.Types.ObjectId;
  items: IGRNItem[];
  generalRemarks?: string;
  // Approval chain: Store Manager creates -> Receiver confirms -> PM final confirmation
  createdBy: mongoose.Types.ObjectId; // Store Manager
  receiver: mongoose.Types.ObjectId; // Defaults to requester, can be edited
  approvals: IGRNApproval[];
  status: GRNStatus;
  deliveredAt?: Date; // Final confirmation timestamp
  createdAt: Date;
  updatedAt: Date;
}

export interface IDelivery extends Document {
  deliveryNumber: string;
  purchaseOrder: mongoose.Types.ObjectId;
  requisition: mongoose.Types.ObjectId; // Reference to Requisition
  vendor: mongoose.Types.ObjectId; // Reference to Vendor
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
  requisitionId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  action: string;
  performedBy: mongoose.Types.ObjectId;
  previousStatus?: string;
  newStatus?: string;
  comments?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
