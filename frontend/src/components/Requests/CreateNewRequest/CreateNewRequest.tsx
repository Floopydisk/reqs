"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { getAuthData, getToken } from "@/lib/auth";
import { parseDate } from "@/lib/parseDate";
import RequestForm from "../RequestForm";
import ItemsList from "../ItemsList";
import ItemFormDialog from "../ItemFormDialog";
import BatchItemUpload from "../BatchItemUpload";
import { Item, Vendor, validateWorkToolItemCategories } from "../types";

interface CreateNewRequestProps {
  page: "user" | "hod" | "hof" | "pm" | "hhra";
  data: unknown[];
}

interface DepartmentOption {
  _id: string;
  name: string;
}

export default function CreateNewRequest({
  page,
  data,
}: CreateNewRequestProps) {
  const router = useRouter();
  const requestsPath = {
    user: "/user/requisition",
    hod: "/hod/my-requests",
    hof: "/hof/my-requests",
    pm: "/pm/my-requests",
    hhra: "/hhra/my-requests",
  }[page];
  const authDepartment = getAuthData()?.user?.department as ({ _id?: string; id?: string; name?: string } | null | undefined);
  const authDeptId = authDepartment?._id || authDepartment?.id || "";
  const [departmentId, setDepartmentId] = useState(authDeptId);
  const effectiveDepartmentId = departmentId || authDeptId;
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [urgency, setUrgency] = useState([1]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    justification: "",
    deliveryLocation: "",
  });

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

  const urgencyMap = ["low", "medium", "high"];

  const token = getToken();

  const buildRequisitionFormData = (formattedDate?: string) => {
    const body = new FormData();
    body.append("title", formData.title);
    // A1: urgency removed from payload — field no longer collected at requisition stage
    // body.append("urgency", urgencyMap[urgency[0]]);
    body.append("justification", formData.justification);
    body.append("deliveryLocation", formData.deliveryLocation);
    if (effectiveDepartmentId) {
      body.append("departmentId", effectiveDepartmentId);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Please add at least one item before proceeding.");
      return;
    }
    if (!effectiveDepartmentId) {
      toast.error("Please select a requisitioning department.");
      return;
    }
    const categoryError = validateWorkToolItemCategories(items);
    if (categoryError) {
      toast.error(categoryError);
      return;
    }

    const formattedDate = dateStart
      ? new Date(dateStart.getTime() - dateStart.getTimezoneOffset() * 60000)
          .toISOString()
          .split("T")[0]
      : undefined;

    const requestBody = buildRequisitionFormData(formattedDate);

    setLoading(true);

    try {
      const createResponse = await fetch(`${API_BASE_URL}/requisitions/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: requestBody,
      });

      const createData = await createResponse.json();

      if (createData.success) {
        toast.success("Requisition created and submitted successfully!");
        router.push(requestsPath);
      } else {
        if (createData.errors) {
          // Handle validation errors from the API
          Object.values(createData.errors).forEach((error) => {
            if (typeof error === "string") {
              toast.error(error);
            }
          });
        } else {
          toast.error(createData.message || "Failed to create requisition");
        }
      }
    } catch (error) {
      console.error("Error creating requisition:", error);
      toast.error("Error creating requisition");
    } finally {
      setLoading(false);
    }
  };

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
          break; // Stop fetching if an error occurs on any page
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

  const handleItemFormChange = (
    field: keyof Item,
    value: string | number | boolean | File | null | string[],
  ) => {
    setCurrentItem((prev) =>
      field === "itemType" && value === "service"
        ? { ...prev, itemType: "service", isWorkTool: false, workToolSubcategory: [] }
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
      (!currentItem.workToolSubcategory || currentItem.workToolSubcategory.length === 0)
    ) {
      toast.error("Please select a personal work tool category");
      return;
    }

    const updatedItems = editingItemId !== null
      ? items.map((item) => (item._id === editingItemId ? currentItem : item))
      : [...items, { ...currentItem, _id: Date.now().toString() }];
    const categoryError = validateWorkToolItemCategories(updatedItems);
    if (categoryError) {
      toast.error(categoryError);
      return;
    }

    if (editingItemId !== null) {
      // Update existing item
      setItems(updatedItems);
      toast.success("Item updated successfully!");
    } else {
      // Add new item
      setItems(updatedItems);
      toast.success("Item added successfully!");
    }

    resetCurrentItem();
    setIsItemDialogOpen(false);
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

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item._id !== id));
    toast.success("Item removed.");
  };

  const [dateStart, setDateStart] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (token) {
      fetchAllVendors(token);
    }
  }, [token]);

  useEffect(() => {
    if (authDeptId || !token) return;

    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/departments?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          throw new Error(result.message || "Could not load departments.");
        }
        setDepartments(result.data);
      } catch (error) {
        console.error("Error fetching departments:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load departments.",
        );
      } finally {
        setDepartmentsLoading(false);
      }
    };

    void fetchDepartments();
  }, [authDeptId, token]);

  return (
    <div className="w-full lg:w-full flex flex-col px-4 py-8 pb-16">
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center">
          <Link
            href={requestsPath}
            className="flex items-center gap-2 text-[#0d1b5e] hover:underline border rounded-full p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        <h1 className="text-2xl lg:text-3xl font-bold text-[#0F1E7A] mb-6">
          Create New Request
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[50%_45%]  w-full lg:max-w-7xl gap-10">
        <RequestForm
          urgency={urgency}
          loading={loading}
          isCreating={true} // isEditMode will default to true
          formData={formData}
          dateStart={dateStart}
          setUrgency={setUrgency}
          setFormData={setFormData}
          setDateStart={setDateStart}
          departmentId={departmentId}
          departments={departments}
          departmentsLoading={departmentsLoading}
          onDepartmentChange={setDepartmentId}
          handleSubmit={handleSubmit}
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-lg font-semibold text-[#0F1E7A]">Items</p>
            <BatchItemUpload
              onItemsAdded={(newItems) => {
                const updatedItems = [...items, ...newItems];
                const categoryError = validateWorkToolItemCategories(updatedItems);
                if (categoryError) {
                  toast.error(categoryError);
                  return;
                }
                setItems(updatedItems);
              }}
            />
          </div>

          <ItemsList
            items={items}
            onDeleteItem={handleDeleteItem}
            onAddNewItem={() => {
              resetCurrentItem();
              setEditingItemId(null);
              setIsViewMode(false);
              setIsItemDialogOpen(true);
            }}
            onViewItem={(item) => {
              setCurrentItem(item);
              setEditingItemId(null);
              setIsViewMode(true);
              setIsItemDialogOpen(true);
            }}
            onEditItem={(item) => {
              setCurrentItem(item);
              setEditingItemId(item._id);
              setIsViewMode(false);
              setIsItemDialogOpen(true);
            }}
          />

          <ItemFormDialog
            vendors={vendors}
            isOpen={isItemDialogOpen}
            currentItem={currentItem}
            editingItemId={editingItemId}
            handleAddItem={handleAddItem}
            vendorsLoading={vendorsLoading}
            isViewMode={isViewMode}
            onStartEdit={() => {
              setIsViewMode(false);
              setEditingItemId(currentItem._id);
            }}
            onOpenChange={(open) => {
              setIsItemDialogOpen(open);
              if (!open) setIsViewMode(false);
            }}
            handleItemFormChange={handleItemFormChange}
          />
        </div>
      </div>
    </div>
  );
}
