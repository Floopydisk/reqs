import { apiClient } from "@/lib/apiClient";
import { CONSTANTS } from "@/lib/constants";
import {
  RequisitionHandleComment,
  HandledRequisitionItemResponse,
  HandledRequisitionResponse,
} from "@/types/requisition";

export const requisitionService = {
  approveBulkRequisitionItems: (
    requisitionId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionItemResponse> => {
    return apiClient.put<HandledRequisitionItemResponse>(
      CONSTANTS.REQUISITION.API.APPROVE_BULK_REQUISITION_ITEMS(requisitionId),
      body,
    );
  },
  rejectBulkRequisitionItems: (
    requisitionId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionItemResponse> => {
    return apiClient.put<HandledRequisitionItemResponse>(
      CONSTANTS.REQUISITION.API.REJECT_BULK_REQUISITION_ITEMS(requisitionId),
      body,
    );
  },
  approveRequisitionItem: (
    requisitionId: string,
    itemId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionItemResponse> => {
    return apiClient.put<HandledRequisitionItemResponse>(
      CONSTANTS.REQUISITION.API.APPROVE_REQUISITION_ITEM(requisitionId, itemId),
      body,
    );
  },
  rejectRequisitionItem: (
    requisitionId: string,
    itemId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionItemResponse> => {
    return apiClient.put<HandledRequisitionItemResponse>(
      CONSTANTS.REQUISITION.API.REJECT_REQUISITION_ITEM(requisitionId, itemId),
      body,
    );
  },
  approveHrRequisitionItem: (
    requisitionId: string,
    itemId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionItemResponse> => {
    return apiClient.put<HandledRequisitionItemResponse>(
      CONSTANTS.REQUISITION.API.HR_APPROVE_REQUISITION_ITEM(
        requisitionId,
        itemId,
      ),
      body,
    );
  },
  rejectHrRequisitionItem: (
    requisitionId: string,
    itemId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionItemResponse> => {
    return apiClient.put<HandledRequisitionItemResponse>(
      CONSTANTS.REQUISITION.API.HR_REJECT_REQUISITION_ITEM(
        requisitionId,
        itemId,
      ),
      body,
    );
  },
  rejectRequisition: (
    requisitionId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionResponse> => {
    return apiClient.put<HandledRequisitionResponse>(
      CONSTANTS.REQUISITION.API.REJECT_REQUISITION(requisitionId),
      body,
    );
  },
  hofApproveRequisition: (
    requisitionId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionResponse> => {
    return apiClient.put<HandledRequisitionResponse>(
      CONSTANTS.REQUISITION.API.HOF_APPROVE_REQUISITION(requisitionId),
      body,
    );
  },
  hofRejectRequisition: (
    requisitionId: string,
    body: RequisitionHandleComment,
  ): Promise<HandledRequisitionResponse> => {
    return apiClient.put<HandledRequisitionResponse>(
      CONSTANTS.REQUISITION.API.HOF_REJECT_REQUISITION(requisitionId),
      body,
    );
  },
};
