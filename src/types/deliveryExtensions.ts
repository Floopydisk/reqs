import { Document } from "./interfaces";
import { DeliveryStatus } from "../types/enums";

// Extended interface for verification to include comments
export interface IVerificationExtended {
  verifiedBy: string | any;
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
    uploadedBy: string | any;
    uploadedAt: Date;
  }[];
}

// Extended interface for HOD approval
export interface IHodApproval extends IVerificationExtended {
  approved: boolean;
}

// Interface for inventory confirmation
export interface IInventoryConfirmation {
  confirmedBy: string | any;
  confirmedAt: Date;
  notes: string;
}

// Interface for department confirmation
export interface IDepartmentConfirmation {
  confirmedBy: string | any;
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
    notifiedBy: string | any;
    notifiedAt: Date;
    message: string;
    expectedDeliveryDate: Date;
  };
  inventoryVerification?: IVerificationExtended;
  departmentVerification?: IVerificationExtended;
}

// Export types for use in the controllers
export type DeliveryWithExtensions = Document &
  IDeliveryExtended & {
    _id: string | any;
    id: string;
  };

