"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Keep for HOD/PM actions if needed
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUser } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import Comments from "./CommentsSection";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import ItemFormDialog from "../ItemFormDialog";
import ItemsList from "../ItemsList";
import ItemViewDialog from "../ItemViewDialog";
import { Textarea } from "@/components/ui/textarea";
import RequestForm from "../RequestForm";
import {
  Item,
  UserTypes,
  Vendor,
  validateWorkToolItemCategories,
} from "../types";
import { formatStatus } from "@/lib/statusFormatter";
import PMItemsList from "../PMItemsList";
import Related from "./Related";
import { requisitionService } from "@/services/requisitionService";
import { CONSTANTS } from "@/lib/constants";
import ConfirmDeliveryDialog, {
  ConfirmDeliveryData,
} from "@/components/GRN/ConfirmDeliveryDialog";

interface RequestData {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantityNeeded: number;
  justification: string;
  requisitionNumber: string;
  image: string;
  deliveryLocation: string;
  priority: "low" | "medium" | "high";
  attachment?: string;
  department?: { _id?: string; id?: string; name?: string };
  requester?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status?: string;
  assignedApprover?: string | { _id: string };
  items?: Item[];
  deliveryDate?: string;
  related?: {
    requests?: Array<{ _id: string; title: string; department: string }>;
    rfqs?: Array<{ _id: string; title: string; department: string }>;
    pos?: Array<{ _id: string; title: string; department: string }>;
  };
  // B2: Approval timestamps — shape matches types.ts RequestData.approvals + extended fields
  approvals?: {
    stage?: string;
    approver?: string | { firstName?: string; lastName?: string };
    approverName?: string;
    approverRole?: string;
    approvedAt?: string;
    status?: string;
    timestamp?: string;
    comments?: string;
    _id?: string;
  }[];
  departmentApprovedAt?: string;
  departmentApprovedBy?: { firstName?: string; lastName?: string };
}

// Define a type for the item object received from the API
type BackendItem = Omit<Item, "id"> & { _id: string };

interface ViewEditRequestProps {
  requisitionId: string;
  userType: UserTypes;
  isEditMode: boolean;
  onEditModeChange: (mode: boolean) => void;
}

export default function ViewEditRequest({
  requisitionId,
  userType,
  isEditMode,
  onEditModeChange,
}: ViewEditRequestProps) {
  const router = useRouter();
  const token = getToken();
  const user = getUser();
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [formData, setFormData] = useState<RequestData>({
    _id: "",
    title: "",
    description: "",
    category: "",
    quantityNeeded: 0,
    justification: "",
    requisitionNumber: "",
    image: "",
    deliveryLocation: "",
    priority: "medium",
    attachment: "",
    requester: { _id: "", firstName: "", lastName: "" },
    status: "",
    items: [],
  });

  const [urgency, setUrgency] = useState([1]);
  const [items, setItems] = useState<Item[]>([]);
  const [related, setRelated] = useState<{
    requests: Array<{ _id: string; title: string; department: string }>;
    rfqs: Array<{ _id: string; title: string; department: string }>;
    pos: Array<{ _id: string; title: string; department: string }>;
  }>({ requests: [], rfqs: [], pos: [] });
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isItemViewDialogOpen, setIsItemViewDialogOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState<Date | undefined>();

  const [currentItem, setCurrentItem] = useState<Item>({
    _id: "",
    itemName: "",
    itemType: "",
    preferredBrand: "",
    itemDescription: "",
    uploadImage: null,
    units: "",
    UOM: "",
    recommendedVendor: "",
    isWorkTool: "",
    workToolSubcategory: [],
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDenialModal, setShowDenialModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [showItemsError, setShowItemsError] = useState(false);
  const [itemComment, setItemComment] = useState("");
  const [isItemRequestLoading, setIsItemRequestLoading] = useState(false);
  const [pendingDeliveryConfirmation, setPendingDeliveryConfirmation] =
    useState<ConfirmDeliveryData | null>(null);
  const [isConfirmDeliveryOpen, setIsConfirmDeliveryOpen] = useState(false);

  /* Guard against ?mode=edit URL bypass: force view mode if status doesn't allow editing */
  useEffect(() => {
    if (
      isEditMode &&
      formData.status &&
      !["submitted", "rejected", "draft"].includes(formData.status)
    ) {
      onEditModeChange(false);
    }
  }, [formData.status, isEditMode, onEditModeChange]);

  const refreshRequisitionState = async () => {
    const response = await fetch(
      `${API_BASE_URL}/requisitions/${requisitionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    if (!data.success) return;

    setFormData((previous) => ({ ...previous, ...data.data }));
    setItems(
      (data.data.items || []).map((item: BackendItem, index: number) => ({
        ...item,
        id: item._id || index,
      })),
    );
  };

  const priorityMap: Record<number, RequestData["priority"]> = {
    0: "low",
    1: "medium",
    2: "high",
  };

  const buildRequisitionFormData = (formattedDate?: string) => {
    const body = new FormData();
    body.append("title", formData.title);
    // A1: urgency removed from payload — field no longer collected at requisition stage
    // body.append("urgency", priorityMap[urgency[0]]);
    body.append("justification", formData.justification);
    body.append("deliveryLocation", formData.deliveryLocation);
    if (formattedDate) {
      body.append("deliveryDate", formattedDate);
    }

    items.forEach((item, index) => {
      const { _id, uploadImage, ...rest } = item;
      const { recommendedVendor, ...itemPayload } = rest;
      const payload = recommendedVendor
        ? { ...itemPayload, recommendedVendor }
        : itemPayload;

      body.append(`item_${index}`, JSON.stringify(payload));

      if (uploadImage) {
        body.append(`uploadImage_${index}`, uploadImage);
      }
    });

    return body;
  };

  const backPath =
    userType === "hod"
      ? "/hod/requisitions"
      : userType === "hof"
        ? "/hof/requisitions"
        : userType === "procurementManager"
          ? "/pm/requisitions"
          : userType === "hhra"
            ? "/hhra/requisitions"
            : "/user/requisition";

  const relatedBasePath =
    userType === "hod"
      ? "/hod"
      : userType === "hof"
        ? "/hof"
        : userType === "procurementManager"
          ? "/pm"
          : userType === "hhra"
            ? "/hhra"
            : "/user";

  const canAccessProcurementPages =
    userType === "procurementManager" ||
    userType === "hof" ||
    userType === "hhra";

  const handleRelatedView = (
    item: { _id: string },
    type: "request" | "rfq" | "po",
  ) => {
    if (type === "request") {
      if (userType === "user") {
        router.push(`/user/requisition/${item._id}`);
        return;
      }

      router.push(`${relatedBasePath}/requisitions/${item._id}`);
      return;
    }

    if (!canAccessProcurementPages) {
      toast.error("You do not have access to view this item.");
      return;
    }

    if (type === "rfq") {
      if (userType === "procurementManager") {
        router.push(`/pm/rfqs/${item._id}`);
      } else if (userType === "hof") {
        toast.error("You do not have access to view RFQs.");
      } else {
        router.push(`/hhra/rfqs/${item._id}`);
      }
      return;
    }

    if (userType === "procurementManager") {
      router.push(`/pm/pos/${item._id}`);
    } else if (userType === "hof") {
      router.push(`/hof/pos/${item._id}`);
    } else {
      router.push(`/hhra/pos/${item._id}`);
    }
  };

  useEffect(() => {
    const urgencyMap: Record<string, number> = {
      low: 0,
      medium: 1,
      high: 2,
    };

    const reversePriorityMap: Record<RequestData["priority"], number> = {
      low: 0,
      medium: 1,
      high: 2,
    };

    const fetchRequest = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/requisitions/${requisitionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (data.success) {
          const req = data.data;
          setFormData({
            ...req,
            title: req.title,
            justification: req.justification,
          });
          setRelated({
            requests: req.related?.requests || [],
            rfqs: req.related?.rfqs || [],
            pos: req.related?.pos || [],
          });
          setItems(
            req.items.map((item: BackendItem, index: number) => ({
              ...item,
              id: item._id || index,
            })),
          );
          console.log(
            "Items from page: ",
            req.items.map((item: BackendItem, index: number) => ({
              ...item,
              id: item._id || index,
            })),
          );
          const urgencyValue = req.urgency || req.priority;
          setUrgency([urgencyMap[urgencyValue] || 1]);
          if (req.deliveryDate) {
            setDateStart(new Date(req.deliveryDate));
          }
        } else setNotFound(true);
      } catch (error) {
        console.error(error);
        setNotFound(true);
      }
    };
    fetchRequest();

    const fetchAllVendors = async (token: string) => {
      setVendorsLoading(true);
      let allVendors: Vendor[] = [];
      let currentPage = 1;
      let totalPages = 1;

      try {
        do {
          const response = await fetch(
            `${API_BASE_URL}/vendors?page=${currentPage}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = await response.json();
          if (data.success) {
            allVendors = [...allVendors, ...data.data];
            totalPages = data.pagination.pages;
            currentPage++;
          } else {
            console.error("Failed to fetch a page of vendors:", data.message);
            break;
          }
        } while (currentPage <= totalPages);

        setVendors(allVendors);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        toast.error("Could not load vendors.");
      } finally {
        setVendorsLoading(false);
      }
    };

    if (token) {
      fetchAllVendors(token);
    }

    // TODO: Replace with real endpoint once backend provides it.
    // GET /requisitions/:id/pending-delivery-confirmation
    // Expected response: { success: true, data: ConfirmDeliveryData | null }
    // This fetches any GRN (product) or JCF (service) that is awaiting originator confirmation.
    const fetchPendingConfirmation = async () => {
      if (userType !== "user") return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/requisitions/${requisitionId}/pending-delivery-confirmation`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        if (data.success && data.data) {
          setPendingDeliveryConfirmation(data.data);
        }
      } catch {
        // silently ignore — endpoint may not exist yet
      }
    };

    if (token) {
      fetchPendingConfirmation();
    }
  }, [requisitionId, token, isEditMode, userType]);

  const handleItemFormChange = (
    field: keyof Item,
    value: string | number | boolean | File | null | string[],
  ) => {
    setCurrentItem((prev) =>
      field === "itemType" && value === "service"
        ? {
            ...prev,
            itemType: "service",
            isWorkTool: false,
            workToolSubcategory: [],
          }
        : field === "isWorkTool" && value === false
          ? { ...prev, isWorkTool: false, workToolSubcategory: [] }
          : { ...prev, [field]: value },
    );
  };

  const handleAddItem = () => {
    if (
      !currentItem.itemName ||
      !currentItem.itemType ||
      !currentItem.itemDescription ||
      typeof currentItem.isWorkTool !== "boolean"
    ) {
      toast.error("Please fill all required fields marked with *");
      return;
    }
    if (currentItem.itemType === "product" && !currentItem.units) {
      toast.error("Units is required for product items");
      return;
    }
    if (
      currentItem.isWorkTool === true &&
      currentItem.itemType !== "service" &&
      (!currentItem.workToolSubcategory ||
        currentItem.workToolSubcategory.length === 0)
    ) {
      toast.error("Please select a personal work tool category");
      return;
    }

    const updatedItems =
      editingItemId !== null
        ? items.map((item) => (item._id === editingItemId ? currentItem : item))
        : [...items, { ...currentItem, _id: Date.now().toString() }];
    const categoryError = validateWorkToolItemCategories(updatedItems);
    if (categoryError) {
      toast.error(categoryError);
      return;
    }

    if (editingItemId !== null) {
      setItems(updatedItems);
      toast.success("Item updated successfully!");
    } else {
      setItems(updatedItems);
      toast.success("Item added successfully!");
    }

    resetCurrentItem();
    setIsItemDialogOpen(false);
  };

  const handleDeleteItem = (id: number | string) => {
    setItems(items.filter((item) => item._id !== id));
    toast.success("Item removed.");
  };

  /* canEdit: request is still with the requester (hasn't entered the approval chain) */
  const canEdit =
    !formData.status ||
    ["submitted", "rejected", "draft"].includes(formData.status);

  const handleResubmit = async () => {
    const categoryError = validateWorkToolItemCategories(items);
    if (categoryError) {
      toast.error(categoryError);
      return;
    }
    setLoading(true);
    try {
      const formattedDate = dateStart
        ? new Date(dateStart.getTime() - dateStart.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0]
        : undefined;

      const requestBody = buildRequisitionFormData(formattedDate);
      requestBody.append("status", "submitted");

      const res = await fetch(`${API_BASE_URL}/requisitions/${requisitionId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: requestBody,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Request resubmitted successfully!");
        onEditModeChange(false);
        await refreshRequisitionState();
      } else {
        toast.error(data.message || "Failed to resubmit request");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while resubmitting");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const categoryError = validateWorkToolItemCategories(items);
    if (categoryError) {
      toast.error(categoryError);
      return;
    }
    setLoading(true);
    try {
      const formattedDate = dateStart
        ? new Date(dateStart.getTime() - dateStart.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0]
        : undefined;

      const requestBody = buildRequisitionFormData(formattedDate);

      const res = await fetch(`${API_BASE_URL}/requisitions/${requisitionId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: requestBody,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Request updated successfully!");
        onEditModeChange(false);
      } else {
        toast.error(data.message || "Failed to update request");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while updating");
    } finally {
      setLoading(false);
    }
  };

  const resetCurrentItem = () => {
    setCurrentItem({
      _id: "",
      itemName: "",
      itemType: "",
      preferredBrand: "",
      itemDescription: "",
      uploadImage: null,
      units: "",
      UOM: "",
      recommendedVendor: "",
      isWorkTool: "",
    });
    setEditingItemId(null);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/requisitions/${requisitionId}/cancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: cancelReason }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Request cancelled successfully");
        router.push(backPath);
      } else {
        toast.error(data.message || "Failed to cancel request");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error cancelling request");
    } finally {
      setShowCancelModal(false);
      setCancelReason("");
    }
  };

  const handleItemCheck = (itemId: string, checked: string | boolean) => {
    if (formData.status === "cancelled") {
      toast.warning("Cannot act on items in a cancelled requisition");
      return;
    }
    if (itemId === "header-checkbox") {
      if (checked) {
        const updatedSelection: string[] = [];
        for (let i = 0; i < items.length; i++) {
          // For loop was used due to the `continue` feature to avoid returning types like null, undefined or Boolean
          if (items[i].status === "pending") {
            updatedSelection.push(items[i]._id);
          }
        }
        setSelectedItems(updatedSelection);
      } else {
        setSelectedItems([]);
      }
    } else {
      const updatedItems = checked
        ? [...selectedItems, itemId]
        : selectedItems.filter((item) => item !== itemId);
      setSelectedItems(updatedItems);
    }
  };

  const approveBulkRequisitionItems = async (silentComment?: string) => {
    const comment = silentComment ?? itemComment;
    if (!silentComment && !comment.trim()) {
      // Errors were thrown to allow the modal close only when the request is successful
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.PROVIDE_APPROVAL_COMMENT_WARN,
      );
    }

    const body = {
      itemIds: selectedItems,
      comments: comment.trim() || CONSTANTS.REQUISITION.COMMENT.ITEM_APPROVAL,
    };

    setIsItemRequestLoading(true);
    try {
      const data = await requisitionService.approveBulkRequisitionItems(
        requisitionId,
        body,
      );
      if (data.success) {
        toast.success(
          CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_SUCCESS,
        );
        setItems(data.data.requisition.items); // update state on items table
        setViewingItem(data.data.item); // update state on item view dialog
      } else {
        throw toast.error(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_FAIL,
        );
      }
    } catch (error) {
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_ERROR,
      );
    } finally {
      setIsItemRequestLoading(false);
    }
  };

  const rejectBulkRequisitionItems = async () => {
    if (!itemComment.trim()) {
      // Errors were thrown to allow the modal close only when the request is successful
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.PROVIDE_REJECTION_COMMENT_WARN,
      );
    }

    const body = {
      itemIds: selectedItems,
      comments:
        itemComment.trim() || CONSTANTS.REQUISITION.COMMENT.ITEM_REJECTION,
    };

    setIsItemRequestLoading(true);
    try {
      const data = await requisitionService.rejectBulkRequisitionItems(
        requisitionId,
        body,
      );
      if (data.success) {
        toast.success(
          CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_SUCCESS,
        );
        setItems(data.data.requisition.items); // update state on items table
        setViewingItem(data.data.item); // update state on item view dialog
      } else {
        throw toast.error(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ITEM_FAIL,
        );
      }
    } catch (error) {
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ITEM_ERROR,
      );
    } finally {
      setIsItemRequestLoading(false);
    }
  };

  const approveRequisitionItem = async (itemId: string) => {
    if (!itemComment.trim()) {
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.PROVIDE_APPROVAL_COMMENT_WARN,
      );
    }

    const body = {
      comments:
        itemComment.trim() || CONSTANTS.REQUISITION.COMMENT.ITEM_APPROVAL,
    };

    setIsItemRequestLoading(true);
    try {
      const data = await requisitionService.approveRequisitionItem(
        requisitionId,
        itemId,
        body,
      );
      console.log(data);
      if (data.success) {
        toast.success(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_SUCCESS,
        );
        setItems(data.data.requisition.items); // update state on items table
        setViewingItem(data.data.item); // update state on item view dialog
      } else {
        throw toast.error(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_FAIL,
        );
      }
    } catch (error) {
      console.error(error);
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_ERROR,
      );
    } finally {
      setIsItemRequestLoading(false);
    }
  };

  const approveHrRequisitionItem = async (itemId: string) => {
    if (!itemComment.trim()) {
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.PROVIDE_APPROVAL_COMMENT_WARN,
      );
    }

    const body = {
      comments:
        itemComment.trim() || CONSTANTS.REQUISITION.COMMENT.ITEM_APPROVAL,
    };

    setIsItemRequestLoading(true);
    try {
      const data = await requisitionService.approveHrRequisitionItem(
        requisitionId,
        itemId,
        body,
      );
      if (data.success) {
        toast.success(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_SUCCESS,
        );
        setItems(data.data.requisition.items);
        setViewingItem(data.data.item);
      } else {
        throw toast.error(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_FAIL,
        );
      }
    } catch (error) {
      console.error(error);
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.APPROVE_REQUISITION_ITEM_ERROR,
      );
    } finally {
      setIsItemRequestLoading(false);
    }
  };

  const rejectRequisitionItem = async (itemId: string) => {
    if (!itemComment.trim()) {
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.PROVIDE_REJECTION_COMMENT_WARN,
      );
    }

    const body = {
      comments:
        itemComment.trim() ||
        CONSTANTS.REQUISITION.NOTIFICATION.PROVIDE_REJECTION_COMMENT_WARN,
    };

    setIsItemRequestLoading(true);
    try {
      const data = await requisitionService.rejectRequisitionItem(
        requisitionId,
        itemId,
        body,
      );
      if (data.success) {
        toast.success(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ITEM_SUCCESS,
        );
        setItems(data.data.requisition.items); // update state on items table
        setViewingItem(data.data.item); // update state on item view dialog
      } else {
        throw toast.error(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ITEM_FAIL,
        );
      }
    } catch (error) {
      console.error(error);
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ITEM_ERROR,
      );
    } finally {
      setIsItemRequestLoading(false);
    }
  };

  const rejectHrRequisitionItem = async (itemId: string) => {
    if (!itemComment.trim()) {
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.PROVIDE_REJECTION_COMMENT_WARN,
      );
    }

    const body = {
      comments:
        itemComment.trim() ||
        CONSTANTS.REQUISITION.NOTIFICATION.PROVIDE_REJECTION_COMMENT_WARN,
    };

    setIsItemRequestLoading(true);
    try {
      const data = await requisitionService.rejectHrRequisitionItem(
        requisitionId,
        itemId,
        body,
      );
      if (data.success) {
        toast.success(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ITEM_SUCCESS,
        );
        setItems(data.data.requisition.items);
        setViewingItem(data.data.item);
      } else {
        throw toast.error(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ITEM_FAIL,
        );
      }
    } catch (error) {
      console.error(error);
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ITEM_ERROR,
      );
    } finally {
      setIsItemRequestLoading(false);
    }
  };

  const rejectRequisition = async () => {
    if (!denialReason.trim()) {
      toast.error("A reason for denial is required");
      return;
    }
    setApprovalLoading(true);

    const body = {
      comments: denialReason.trim(),
    };

    try {
      const data =
        userType === "hhra"
          ? await fetch(
              `${API_BASE_URL}/requisitions/${requisitionId}/hhra-approval`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  status: "rejected",
                  comments: body.comments,
                }),
              },
            ).then((response) => response.json())
          : userType === "hof"
            ? await requisitionService.hofRejectRequisition(requisitionId, body)
            : await requisitionService.rejectRequisition(requisitionId, body);
      if (data.success) {
        toast.success(
          CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_SUCCESS,
        );
        setFormData(data.data);
        setShowDenialModal(false);
      } else {
        toast.error(
          data.message ||
            CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_FAIL,
        );
      }
    } catch (error) {
      console.error(error);
      throw toast.error(
        CONSTANTS.REQUISITION.NOTIFICATION.REJECT_REQUISITION_ERROR,
      );
    } finally {
      setApprovalLoading(false);
      setDenialReason("");
    }
  };

  const handleApproval = async () => {
    setApprovalLoading(true);
    try {
      const genericApprovalComment =
        userType === "hod"
          ? "Approved by Head of Department"
          : userType === "hhra"
            ? "Approved by HR Administration"
            : userType === "hof"
              ? "Approved by Head of Finance"
              : "Approved for procurement";

      // Silently approve all selected items before approving the request
      if (selectedItems.length > 0) {
        const silentComment = approvalComment.trim() || genericApprovalComment;
        const body = {
          itemIds: selectedItems,
          comments: silentComment,
        };
        const bulkRes = await requisitionService.approveBulkRequisitionItems(
          requisitionId,
          body,
        );
        if (bulkRes && !bulkRes.success) {
          toast.error(bulkRes.message || "Failed to approve selected items");
          return;
        }
      }

      const comment = approvalComment.trim() || genericApprovalComment;

      if (userType === "hof") {
        const data = await requisitionService.hofApproveRequisition(
          requisitionId,
          { comments: comment },
        );
        if (data.success) {
          toast.success("Request approved successfully");
          await refreshRequisitionState();
          setShowApprovalModal(false);
        } else {
          toast.error(data.message || "Failed to approve request");
        }
      } else if (userType === "hhra") {
        const workToolIds = items
          .filter(
            (item) =>
              item.itemType !== "service" &&
              (item.isWorkTool === true ||
                (item.isWorkTool as unknown) === "true") &&
              item.status === "hrReview",
          )
          .map((item) => item._id);

        if (workToolIds.length === 0) {
          toast.error("There are no work-tool items awaiting HHRA approval");
          return;
        }

        // The API retains per-item HR approval. Keep it invisible to HHRA by
        // approving every eligible tool item as part of the request action.
        for (const itemId of workToolIds) {
          const itemResponse =
            await requisitionService.approveHrRequisitionItem(
              requisitionId,
              itemId,
              { comments: comment },
            );
          if (!itemResponse.success) {
            toast.error(
              itemResponse.message || "Failed to approve work-tool items",
            );
            return;
          }
        }

        await refreshRequisitionState();
        toast.success(
          "Work-tool items approved; requisition is awaiting the HoD tool comment",
        );
        setShowApprovalModal(false);
      } else {
        const res = await fetch(
          `${API_BASE_URL}/requisitions/${requisitionId}/department-approval`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "approved", comments: comment }),
          },
        );
        const data = await res.json();
        if (data.success) {
          toast.success("Request approved successfully");
          await refreshRequisitionState();
          setShowApprovalModal(false);
        } else {
          toast.error(data.message || "Failed to approve request");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Error approving request");
    } finally {
      setApprovalLoading(false);
    }
  };

  /* handleDenial — never called (Deny button uses rejectRequisition); HOF branch had wrong endpoint
  const handleDenial = async () => {
    if (!denialReason.trim()) {
      toast.error("Please provide a reason for denial");
      return;
    }

    setApprovalLoading(true);
    try {
      const isHof = userType === "hof";
      const res = await fetch(
        isHof
          ? `${API_BASE_URL}/requisitions/${requisitionId}/department-approval`
          : `${API_BASE_URL}/requisitions/${requisitionId}/cancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: isHof
            ? JSON.stringify({ status: "rejected", comments: denialReason })
            : JSON.stringify({ reason: denialReason }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Request denied successfully");
        setFormData(data.data);
        setShowDenialModal(false);
      } else {
        toast.error(data.message || "Failed to deny request");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error denying request");
    } finally {
      setApprovalLoading(false);
      setDenialReason("");
    }
  };
  */

  const submitHodToolComment = async () => {
    const comments = approvalComment.trim();
    if (!comments) {
      toast.error("Please provide the required tool comment");
      return;
    }
    setApprovalLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/requisitions/${requisitionId}/hod-tool-comment`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comments }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        toast.error(data.message || "Failed to submit tool comment");
        return;
      }
      toast.success("Tool comment submitted for Procurement Manager review");
      await refreshRequisitionState();
      setApprovalComment("");
      setShowApprovalModal(false);
    } catch (error) {
      console.error(error);
      toast.error("Error submitting tool comment");
    } finally {
      setApprovalLoading(false);
    }
  };

  const canAddToolComment = (() => {
    if (formData.status !== "hodToolComment") return false;

    const isHodOrApprover =
      userType === "hod" ||
      user?.role === "departmentHead" ||
      userType === "hof" ||
      user?.role === "headOfFinance" ||
      userType === "hhra" ||
      user?.role === "headOfHr" ||
      user?.role === "hhra";

    if (!isHodOrApprover) return false;

    const currentUserId = String(user?.id || (user as any)?._id || "").trim();

    // 1. Check assignedApprover match
    const assignedId = String(
      (typeof formData.assignedApprover === "string"
        ? formData.assignedApprover
        : (formData.assignedApprover as any)?.id ||
          (formData.assignedApprover as any)?._id) || "",
    ).trim();

    if (currentUserId && assignedId && currentUserId === assignedId) {
      return true;
    }

    // 2. Check pending HOD_TOOL_COMMENT approval record
    const toolApproval = formData.approvals?.find(
      (a: any) =>
        a.stage === "HOD_TOOL_COMMENT" || a.approverRole === "hodToolComment",
    );
    if (toolApproval) {
      const approverId = String(
        (typeof toolApproval.approver === "string"
          ? toolApproval.approver
          : (toolApproval.approver as any)?.id ||
            (toolApproval.approver as any)?._id ||
            (toolApproval as any)?.approverId) || "",
      ).trim();
      if (currentUserId && approverId && currentUserId === approverId) {
        return true;
      }
    }

    // 3. Check work tool category routing vs user's department
    const activeTool = (formData.items || items)?.find(
      (item: any) =>
        item.itemType !== "service" &&
        (item.isWorkTool === true || item.isWorkTool === "true") &&
        item.status !== "cancelled",
    );
    if (activeTool) {
      const rawCategory = Array.isArray(activeTool.workToolSubcategory)
        ? activeTool.workToolSubcategory[0]
        : activeTool.workToolSubcategory;
      const category =
        typeof rawCategory === "string" ? rawCategory.trim() : "";
      const userDeptName = String(user?.department?.name || "").toLowerCase();
      const userDeptCode = String(
        (user?.department as any)?.code || "",
      ).toUpperCase();
      const userDeptId = String(
        (user?.department as any)?.id || (user?.department as any)?._id || "",
      ).trim();
      const isDeptHead = userType === "hod" || user?.role === "departmentHead";

      if (isDeptHead) {
        if (
          category === "Laptop Accessories" ||
          category === "Phone Accessories"
        ) {
          if (
            userDeptId === "12" ||
            userDeptCode === "IT" ||
            userDeptCode === "ICT" ||
            userDeptName.includes("information technology") ||
            userDeptName.includes("it")
          ) {
            return true;
          }
        } else if (category === "Office Equipment") {
          if (
            userDeptCode === "4" ||
            userDeptCode === "HR" ||
            userDeptName.includes("human resources") ||
            userDeptName.includes("office management")
          ) {
            return true;
          }
        } else if (category === "Security Accessories") {
          if (
            userDeptCode === "SEC" ||
            userDeptCode === "SECURITY" ||
            userDeptName.includes("security")
          ) {
            return true;
          }
        }
      }
    }

    // 4. Fallback: If assignedId is not specified and user is HoD, allow adding comment
    if (
      (userType === "hod" || user?.role === "departmentHead") &&
      !assignedId
    ) {
      return true;
    }

    return false;
  })();

  const handleConfirmDelivery = async () => {
    // TODO: wire to POST /purchase-orders/:poId/grns/:grnId/confirm (or /jcfs/:jcfId/confirm)
    // when the backend endpoint is available.
    toast.info("Delivery confirmation endpoint not yet available.");
    setPendingDeliveryConfirmation(null);
  };

  const handleGenerateRFQ = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to generate RFQ");
      setShowItemsError(true);
      setTimeout(() => setShowItemsError(false), 10000);
      return;
    }
    // Work-tool items (never services) must have completed HHRA review.
    const workToolsPendingReview = selectedItems.some((id) => {
      const item = items.find((i) => i._id === id || (i as any).id === id);
      return (
        item?.itemType !== "service" &&
        (item?.isWorkTool === true ||
          (item?.isWorkTool as unknown) === "true") &&
        item?.status !== "hrApproved"
      );
    });
    if (workToolsPendingReview) {
      toast.error(
        "All work-tool items must complete HHRA review before generating an RFQ.",
      );
      return;
    }
    const selectedItemsParam = selectedItems.join(",");
    router.push(
      `/pm/requisitions/${requisitionId}/generate-rfq?selectedItems=${selectedItemsParam}`,
    );
  };

  if (notFound)
    return (
      <div className="w-full flex flex-col justify-center items-center h-[80vh] text-center">
        <h2 className="text-2xl font-bold text-[#0F1E7A] mb-4">
          Request Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          The request you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button
          onClick={() => router.back()}
          className="bg-[#0F1E7A] hover:bg-[#0b154b] text-white px-6 py-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );

  if (!formData._id)
    return (
      <div className="w-full flex justify-center items-center h-[80vh] text-gray-500">
        <div className="flex gap-2 items-center">
          <Loader2 className="animate-spin" />
          <p>Loading request details...</p>
        </div>
      </div>
    );

  return (
    <div className="pt-8 pb-16 px-4 lg:px-12">
      <div className="w-full flex items-center mb-4">
        <Link
          href={backPath}
          className="flex items-center gap-2 text-[#0d1b5e] hover:underline border rounded-full p-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="w-full flex items-center gap-2 mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0F1E7A]">
          {isEditMode ? "Update Request" : "View Request"} -{" "}
          {formData.requisitionNumber}{" "}
        </h1>
        {formData.status && (
          <span className="status-badge ml-4">
            {formatStatus(formData.status)}
          </span>
        )}
      </div>

      {/* <div className="w-full flex flex-col lg:flex-row gap-8 container"> */}
      <div className="grid grid-cols-1 lg:grid-cols-[50%_45%]  w-full lg:max-w-7xl gap-10">
        <div className="w-full flex flex-col pb-16">
          <div className="request relative w-full space-y-5">
            {/* Request Status */}
            {/* {formData.status && (
              <div className="status-badge absolute top-0 right-0 z-[5]">
                <span
                  className={`py-3 px-4 rounded-sm text-sm font-semibold text-white ${
                    formData.status === "submitted"
                      ? "bg-orange-500"
                      : formData.status === "departmentApproved"
                      ? "bg-green-500"
                      : formData.status === "cancelled"
                      ? "bg-red-500"
                      : "bg-gray-500"
                  }`}
                >
                  {formData.status}
                </span>
              </div>
            )} */}

            {/* Request Image */}
            {/* <div className="w-full space-y-2">
              <div className="relative w-full h-[300px] rounded-xl overflow-hidden bg-gray-100">
                <Image
                  fill
                  alt="Request Image"
                  src={formData.image || "/request-image.png"}
                  className="object-contain"
                />
              </div>
              {formData.requester && (
                <p className="text-sm text-gray-600 font-semibold text-end my-4">
                  Requested by:{" "}
                  {user?.id === formData.requester._id
                    ? "You"
                    : `${formData.requester.firstName} ${formData.requester.lastName}`}
                </p>
              )}
            </div> */}

            <RequestForm
              formData={formData}
              setFormData={setFormData}
              urgency={urgency}
              setUrgency={setUrgency}
              dateStart={dateStart}
              setDateStart={setDateStart}
              handleSubmit={handleSave}
              loading={loading}
              isEditMode={isEditMode}
              overrideDepartmentName={formData.department?.name}
            />

            {/* B2: Approval history timestamps */}
            {!isEditMode &&
              formData.approvals &&
              formData.approvals.length > 0 && (
                <div className="w-full bg-white border rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F1E7A] uppercase tracking-wide">
                    Approval History
                  </h3>
                  {formData.approvals.map((approval, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-1 border-l-2 border-green-400 pl-3 text-sm"
                    >
                      <p className="font-semibold text-gray-800">
                        {approval.approverRole === "hodToolComment"
                          ? "Head of Department Tool Comment"
                          : approval.approverRole === "hod"
                            ? "Head of Department"
                            : approval.approverRole === "hof"
                              ? "Head of Finance"
                              : approval.approverRole === "hhr"
                                ? "Head of Human Resources"
                                : approval.approverRole || "Approver"}
                      </p>
                      {(approval.approverName || approval.approver) && (
                        <p className="text-gray-600">
                          {approval.approverName ||
                            (typeof approval.approver === "object"
                              ? (approval.approver as any)?.name ||
                                `${approval.approver?.firstName || ""} ${approval.approver?.lastName || ""}`.trim()
                              : typeof approval.approver === "string" &&
                                  !/^[0-9a-fA-F]{24}$/.test(
                                    approval.approver,
                                  ) &&
                                  isNaN(Number(approval.approver))
                                ? approval.approver
                                : "")}
                        </p>
                      )}
                      {approval.approvedAt && (
                        <p className="text-gray-500 text-xs">
                          {new Date(approval.approvedAt).toLocaleString()}
                        </p>
                      )}
                      {approval.comments && (
                        <p className="text-gray-600 italic text-xs">
                          {approval.comments}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            {(formData.status === "departmentApproved" ||
              formData.status === "hofApproved") &&
              userType === "procurementManager" && (
                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <Button
                    type="button"
                    onClick={handleGenerateRFQ}
                    className="font-bold text-base bg-[#0F1E7A] hover:bg-[#0b154b] text-white py-6 px-10"
                  >
                    Generate RFQ
                  </Button>

                  <Button
                    type="button"
                    className="font-bold text-base bg-red-600 hover:bg-red-700 text-white py-6 px-10"
                  >
                    Close
                  </Button>
                </div>
              )}

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              {isEditMode ? (
                <>
                  <Button
                    onClick={() => onEditModeChange(false)}
                    className="border border-red-600 text-red-600 bg-transparent! hover:bg-red-500! hover:text-white! flex-1 py-6"
                  >
                    Cancel Edit
                  </Button>
                  {formData.status === "rejected" ? (
                    <Button
                      disabled={loading}
                      onClick={handleResubmit}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 py-6"
                    >
                      {loading ? "Resubmitting..." : "Resubmit"}
                    </Button>
                  ) : (
                    <Button
                      disabled={loading}
                      onClick={handleSave}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 py-6"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {(userType === "user" ||
                    user?.id === formData.requester?._id) &&
                    canEdit && (
                      <Button
                        onClick={() => onEditModeChange(true)}
                        className="bg-[#0F1E7A] hover:bg-[#0b154b] text-white flex-1 py-6 w-full"
                      >
                        Edit
                      </Button>
                    )}
                  {(userType === "user" ||
                    user?.id === formData.requester?._id) &&
                    formData.status === "rejected" && (
                      <Button
                        disabled={loading}
                        onClick={handleResubmit}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 py-6"
                      >
                        {loading ? "Resubmitting..." : "Resubmit"}
                      </Button>
                    )}
                  {canAddToolComment && (
                    <Dialog
                      open={showApprovalModal}
                      onOpenChange={setShowApprovalModal}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white flex-1 py-6">
                          Add Tool Comment
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-white">
                        <DialogHeader>
                          <DialogTitle>Required Tool Comment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            value={approvalComment}
                            onChange={(e) => setApprovalComment(e.target.value)}
                            placeholder="Add your comment for the personal work tool"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setShowApprovalModal(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={submitHodToolComment}
                              disabled={approvalLoading}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {approvalLoading
                                ? "Submitting..."
                                : "Submit Comment"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {(userType === "hod" ||
                    userType === "hhra" ||
                    userType === "hof") &&
                    formData.status !== "hodToolComment" && (
                      <>
                        {(() => {
                          const canActOnRequest =
                            userType === "hof"
                              ? formData.status === "departmentApproved" ||
                                formData.status === "hrApproved"
                              : userType === "hhra"
                                ? formData.status === "hrReview"
                                : formData.status === "submitted";
                          return (
                            <>
                              <Dialog
                                open={showApprovalModal}
                                onOpenChange={(open) => {
                                  if (
                                    userType !== "hod" ||
                                    selectedItems.length > 0
                                  ) {
                                    setShowApprovalModal(open);
                                  } else {
                                    toast.error(
                                      "Select at least one item to approve before proceeding",
                                    );
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    disabled={
                                      !canActOnRequest ||
                                      (userType === "hod" &&
                                        selectedItems.length === 0)
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white flex-1 py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Approve
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl bg-white">
                                  <DialogHeader>
                                    <DialogTitle>Approve Request</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Approval Comment</Label>
                                      {(userType === "hod" ||
                                        userType === "hhra") && (
                                        <span className="flex text-xs pt-2 leading-none text-gray-500">
                                          {selectedItems.length} of{" "}
                                          {items?.filter(
                                            (i) => i.status === "pending",
                                          ).length ?? 0}{" "}
                                          pending item(s) selected.
                                          {(items?.filter(
                                            (i) => i.status === "pending",
                                          ).length ?? 0) -
                                            selectedItems.length >
                                            0 &&
                                            ` ${(items?.filter((i) => i.status === "pending").length ?? 0) - selectedItems.length} item(s) will remain pending.`}
                                        </span>
                                      )}
                                      <Textarea
                                        value={approvalComment}
                                        onChange={(e) =>
                                          setApprovalComment(e.target.value)
                                        }
                                        placeholder="Add a comment for approval"
                                        className="mt-2"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          setShowApprovalModal(false)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={handleApproval}
                                        disabled={approvalLoading}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        {approvalLoading
                                          ? "Approving..."
                                          : "Approve"}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog
                                open={showDenialModal}
                                onOpenChange={setShowDenialModal}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    disabled={!canActOnRequest}
                                    className="bg-red-600 hover:bg-red-700 text-white flex-1 py-6"
                                  >
                                    Deny
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl bg-white">
                                  <DialogHeader>
                                    <DialogTitle>Deny Request</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>
                                        Reason for Denial{" "}
                                        <span className="text-red-500">*</span>
                                      </Label>
                                      <Textarea
                                        value={denialReason}
                                        onChange={(e) =>
                                          setDenialReason(e.target.value)
                                        }
                                        placeholder="A reason is required before denying this request"
                                        className="mt-2"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          setShowDenialModal(false)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={rejectRequisition}
                                        disabled={
                                          approvalLoading ||
                                          !denialReason.trim()
                                        }
                                        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {approvalLoading
                                          ? "Denying..."
                                          : "Deny"}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          );
                        })()}
                      </>
                    )}
                </>
              )}
              {(userType === "user" || user?.id === formData.requester?._id) &&
                canEdit &&
                formData.status !== "cancelled" && (
                  <Dialog
                    open={showCancelModal}
                    onOpenChange={setShowCancelModal}
                  >
                    <DialogTrigger className="bg-white max-w-2xl" asChild>
                      <Button
                        variant="destructive"
                        className="flex-1 py-6 bg-red-600 hover:bg-red-700"
                      >
                        Cancel Request
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-white">
                      <DialogHeader>
                        <DialogTitle>Cancel Request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Reason for cancellation</Label>
                          <Textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Please provide a reason for cancelling this request"
                            className="mt-2"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelModal(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCancel}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Confirm Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* {isEditMode ? ( */}
          <>
            {userType !== "procurementManager" ? (
              <div className="flex flex-col gap-10">
                <ItemsList
                  isEditMode={isEditMode}
                  items={
                    userType === "hhra"
                      ? items.filter(
                          (item) =>
                            item.itemType !== "service" &&
                            (item.isWorkTool === true ||
                              (item.isWorkTool as unknown) === "true"),
                        )
                      : items
                  }
                  selectedItems={selectedItems}
                  approveBulkRequisitionItems={approveBulkRequisitionItems}
                  rejectBulkRequisitionItems={rejectBulkRequisitionItems}
                  isItemRequestLoading={isItemRequestLoading}
                  itemComment={itemComment}
                  setItemComment={setItemComment}
                  handleItemCheck={handleItemCheck}
                  onAddNewItem={() => {
                    resetCurrentItem();
                    setIsItemDialogOpen(true);
                  }}
                  onEditItem={(item) => {
                    setCurrentItem(item);
                    setEditingItemId(item._id);
                    setIsItemDialogOpen(true);
                  }}
                  onViewItem={(item) => {
                    setViewingItem(item);
                    setIsItemViewDialogOpen(true);
                  }}
                  onDeleteItem={handleDeleteItem}
                  userType={userType}
                />
                {/* D1: Show Related panel (RFQs/POs) for HOF and HHRA */}
                {(userType === "hof" || userType === "hhra") && (
                  <Related
                    requests={related.requests}
                    rfqs={related.rfqs}
                    pos={related.pos}
                    onViewItem={handleRelatedView}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-10">
                <PMItemsList
                  items={items}
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                  onViewItem={(item) => {
                    setViewingItem(item);
                    setIsItemViewDialogOpen(true);
                  }}
                  showError={showItemsError}
                />

                <Related
                  requests={related.requests}
                  rfqs={related.rfqs}
                  pos={related.pos}
                  onViewItem={handleRelatedView}
                />
              </div>
            )}
            <ItemFormDialog
              vendors={vendors}
              isOpen={isItemDialogOpen}
              currentItem={currentItem}
              handleAddItem={handleAddItem}
              editingItemId={editingItemId}
              vendorsLoading={vendorsLoading}
              onOpenChange={setIsItemDialogOpen}
              handleItemFormChange={handleItemFormChange}
            />
            {viewingItem && (
              <ItemViewDialog
                isOpen={isItemViewDialogOpen}
                onOpenChange={setIsItemViewDialogOpen}
                currentItem={viewingItem}
                vendors={vendors}
                userType={userType}
                approveRequisitionItem={approveRequisitionItem}
                rejectRequisitionItem={rejectRequisitionItem}
                approveHrRequisitionItem={approveHrRequisitionItem}
                rejectHrRequisitionItem={rejectHrRequisitionItem}
                itemComment={itemComment}
                setItemComment={setItemComment}
                isItemRequestLoading={isItemRequestLoading}
              />
            )}
          </>
          {/* ) : ( */}
          <Comments entityId={requisitionId} entityType="requisitions" />
          {/* )} */}
        </div>
      </div>

      {/* Pending delivery confirmation banner — visible to request originator only */}
      {userType === "user" && pendingDeliveryConfirmation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
          <div className="flex items-center justify-between gap-4 bg-[#0F1E7A] text-white px-5 py-4 rounded-xl shadow-2xl">
            <div className="flex flex-col">
              <p className="font-semibold text-sm">
                Delivery awaiting your confirmation
              </p>
              <p className="text-xs text-blue-200 mt-0.5">
                {pendingDeliveryConfirmation.poNumber} ·{" "}
                {pendingDeliveryConfirmation.type === "grn"
                  ? "Goods received"
                  : "Service completed"}
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-white text-[#0F1E7A] hover:bg-blue-50 font-semibold text-xs px-4"
              onClick={() => setIsConfirmDeliveryOpen(true)}
            >
              Review &amp; Confirm
            </Button>
          </div>
        </div>
      )}

      {/* Confirm delivery dialog */}
      {pendingDeliveryConfirmation && (
        <ConfirmDeliveryDialog
          isOpen={isConfirmDeliveryOpen}
          onClose={() => setIsConfirmDeliveryOpen(false)}
          data={pendingDeliveryConfirmation}
          onConfirm={handleConfirmDelivery}
        />
      )}
    </div>
  );
}
