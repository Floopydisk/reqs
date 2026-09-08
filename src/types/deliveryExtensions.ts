import mongoose from "mongoose";
import { DeliveryStatus } from "../types/enums";

// Extended interface for verification to include comments
export interface IVerificationExtended {
  verifiedBy: mongoose.Types.ObjectId;
  verifiedAt: Date;
  notes?: string;
  comments?: string; // Added comments field
}

// Extended interface for requester verification
export interface IRequesterVerification extends IVerificationExtended {
  quantityCorrect: boolean;
  qualityMeetingRequirements: boolean;
  images?: {
    name: string;
    url: string;
    uploadedBy: mongoose.Types.ObjectId;
    uploadedAt: Date;
  }[];
}

// Extended interface for HOD approval
export interface IHodApproval extends IVerificationExtended {
  approved: boolean;
}

// Interface for inventory confirmation
export interface IInventoryConfirmation {
  confirmedBy: mongoose.Types.ObjectId;
  confirmedAt: Date;
  notes: string;
}

// Interface for department confirmation
export interface IDepartmentConfirmation {
  confirmedBy: mongoose.Types.ObjectId;
  confirmedAt: Date;
  notes: string;
}

// Extended delivery interface to include new properties
export interface IDeliveryExtended {
  inventoryConfirmation?: IInventoryConfirmation;
  departmentConfirmation?: IDepartmentConfirmation;
  requesterVerification?: IRequesterVerification;
  hodApproval?: IHodApproval;
  pmNotification?: {
    notifiedBy: mongoose.Types.ObjectId;
    notifiedAt: Date;
    message: string;
    expectedDeliveryDate: Date;
  };
  inventoryVerification?: IVerificationExtended;
  departmentVerification?: IVerificationExtended;
}

// Export types for use in the controllers
export type DeliveryWithExtensions = mongoose.Document &
  IDeliveryExtended & {
    _id: mongoose.Types.ObjectId;
    id: string;
  };
