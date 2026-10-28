import {Item, RequestData} from "@/components/Requests/types";

export type ItemShape = {
  _id: string;
  itemName: string;
  itemType: string;
  preferredBrand?: string;
  itemDescription: string;
  units: number | null;
  UOM?: string;
  isWorkTool: boolean;
  workToolSubcategory?: string[];
  status: string;
  selectedVendorsForItem?: string[];
  createdAt: string;
  updatedAt: string;
};

export type ApprovalShape = {
  stage: string;
  approver: string | { _id: string; firstName: string; lastName: string; email?: string; name?: string };
  approverName?: string;
  approverRole?: string;
  status: string;
  timestamp: string;
  approvedAt?: string;
  _id: string;
  comments?: string;
};

export type RequisitionShape = {
  _id: string;
  title: string;
  urgency: string;
  justification: string;
  deliveryLocation: string | { _id: string; name: string };
  deliveryDate: string;
  items: ItemShape[];
  requester: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  department:
    | string
    | {
        _id: string;
        name: string;
      };
  status: string;
  selectedVendors: string[];
  paymentStatus: string;
  paymentAmount: number;
  shortlistedVendors: string[];
  deadlineExtensions: string[];
  approvals: ApprovalShape[];
  requisitionNumber: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
};

export type RequisitionHandleComment = {
    itemIds?: string[];
    comments: string;
}

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
}

export type HandledRequisitionItem = {
  item: Item;
  requisition: RequestData;
}

export type HandledRequisitionItemResponse = ApiResponse<HandledRequisitionItem>;
export type HandledRequisitionResponse = ApiResponse<RequestData>;
