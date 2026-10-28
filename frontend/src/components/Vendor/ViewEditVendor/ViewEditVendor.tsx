"use client";

import Link from "next/link";
import { toast } from "sonner";
import { getToken, getUserRole, getUserDesignation } from "@/lib/auth";
import VendorForm from "./VendorForm";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Vendor } from "@/components/Requests/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ViewEditVendorProps {
  vendorId: string;
}

export default function ViewEditVendor({ vendorId }: ViewEditVendorProps) {
  const token = getToken();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorData, setVendorData] = useState<Vendor>({
    _id: "",
    name: "",
    contactPerson: "",
    contactPersonDesignation: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    categories: [],
    isVerified: false,
    isActive: true,
    status: "pending",
    dateOfIncorporation: "",
  });

  useEffect(() => {
    const fetchVendor = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setVendorData(data.data);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error(error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (vendorId && token) {
      fetchVendor();
    }
  }, [vendorId, token]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: vendorData.name,
          contactPerson: vendorData.contactPerson,
          contactPersonDesignation: vendorData.contactPersonDesignation,
          email: vendorData.email,
          phone: vendorData.phone,
          address: vendorData.address,
          website: vendorData.website,
          dateOfIncorporation: vendorData.dateOfIncorporation,
          categories: vendorData.categories?.map((cat) =>
            typeof cat === "string" ? cat : cat._id,
          ),
          isVerified: vendorData.isVerified,
          isActive: vendorData.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vendor updated successfully!");
        setIsEditMode(false);
        setVendorData((prev) => ({ ...prev, ...data.data }));
      } else {
        toast.error(data.message || "Failed to update vendor");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while updating");
    } finally {
      setLoading(false);
    }
  };

  const userRole = getUserRole();
  const userDesignation = getUserDesignation();
  const isHhraVendor =
    userRole === "departmentHead" &&
    userDesignation === "Head, Human Resources & Admin";

  const backPath =
    userRole === "procurementManager"
      ? "/pm/vendors"
      : isHhraVendor
        ? "/hhra/vendors"
        : "";

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vendor approved and verified successfully!");
        setVendorData((prev) => ({ ...prev, ...data.data }));
      } else {
        toast.error(data.message || "Failed to approve vendor");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error approving vendor");
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}/activate`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vendor activated successfully!");
        setVendorData((prev) => ({ ...prev, ...data.data }));
      } else {
        toast.error(data.message || "Failed to activate vendor");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error activating vendor");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/vendors/${vendorId}/deactivate`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success("Vendor deactivated successfully!");
        setVendorData((prev) => ({ ...prev, ...data.data }));
      } else {
        toast.error(data.message || "Failed to deactivate vendor");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error deactivating vendor");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      toast.error("Please provide a reason for deletion");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vendor deleted successfully!");
        router.push("/pm/vendors");
      } else {
        toast.error(data.message || "Failed to delete vendor");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error deleting vendor");
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
      setDeleteReason("");
    }
  };

  if (notFound) {
    return (
      <div className="w-full flex flex-col justify-center items-center h-[80vh] text-center">
        <h2 className="text-2xl font-bold text-[#0F1E7A] mb-4">
          Vendor Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          The vendor you&apos;re looking for doesn&apos;t exist or has been
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
  }

  if (loading && !vendorData._id) {
    return (
      <div className="w-full flex justify-center items-center h-[80vh] text-gray-500">
        <div className="flex gap-2 items-center">
          <Loader2 className="animate-spin" />
          <p>Loading vendor details...</p>
        </div>
      </div>
    );
  }

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
          {isEditMode ? "Update Vendor" : "View Vendor"} - {vendorData.name}
        </h1>
        {vendorData.status && (
          <span className="status-badge ml-4">
            <span
              className={`py-3 px-4 rounded-full text-sm font-semibold text-white ${
                vendorData.status === "approved"
                  ? "bg-green-500"
                  : vendorData.status === "pending"
                    ? "bg-orange-500"
                    : "bg-red-500"
              }`}
            >
              {vendorData.status[0].toUpperCase() + vendorData.status.slice(1)}
            </span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[60%_35%] w-full lg:max-w-7xl gap-10">
        <div className="w-full flex flex-col pb-16">
          <VendorForm
            loading={loading}
            onSave={handleSave}
            isEditMode={isEditMode}
            vendorData={vendorData}
            setVendorData={setVendorData}
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            {isEditMode ? (
              <>
                <Button
                  onClick={() => setIsEditMode(false)}
                  // className="border border-red-600 text-red-600 hover:bg-red-50 flex-1 py-6"
                  className="border border-red-600 text-red-600 bg-transparent! hover:bg-red-500! hover:text-white! flex-1 py-6"
                >
                  Cancel Edit
                </Button>
                <Button
                  disabled={loading}
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1 py-6"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                {/* D4: HHRA can only approve vendors; PM gets edit/deactivate/delete */}
                {isHhraVendor ? (
                  /* HHRA view: Approve & Verify only */
                  <>
                    {vendorData.status === "pending" && (
                      <Button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 py-6"
                      >
                        {actionLoading ? "Approving..." : "Approve & Verify"}
                      </Button>
                    )}
                  </>
                ) : (
                  /* PM view: Edit, Deactivate/Activate, Delete — no Approve (that's HHR's role) */
                  <>
                    <Button
                      onClick={() => setIsEditMode(true)}
                      className="bg-[#0F1E7A] hover:bg-[#0b154b] text-white flex-1 py-6"
                    >
                      Edit
                    </Button>
                    {vendorData.isActive ? (
                      <Button
                        onClick={handleDeactivate}
                        disabled={actionLoading}
                        className="bg-orange-600 hover:bg-orange-700 text-white flex-1 py-6"
                      >
                        {actionLoading ? "Deactivating..." : "Deactivate"}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleActivate}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1 py-6"
                      >
                        {actionLoading ? "Activating..." : "Activate"}
                      </Button>
                    )}
                    <Dialog
                      open={showDeleteModal}
                      onOpenChange={setShowDeleteModal}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1 py-6 bg-red-600 hover:bg-red-700"
                        >
                          Delete Vendor
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-white">
                        <DialogHeader>
                          <DialogTitle>Delete Vendor</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Reason for deletion</Label>
                            <Textarea
                              value={deleteReason}
                              onChange={(e) => setDeleteReason(e.target.value)}
                              placeholder="Please provide a reason for deleting this vendor"
                              className="mt-2"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => setShowDeleteModal(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleDelete}
                              disabled={actionLoading}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              {actionLoading ? "Deleting..." : "Confirm Delete"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-[#0F1E7A] mb-4">
              Vendor Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`font-semibold ${
                    vendorData.status === "approved"
                      ? "text-green-600"
                      : vendorData.status === "pending"
                        ? "text-orange-600"
                        : "text-red-600"
                  }`}
                >
                  {vendorData.status || "Pending"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Verified:</span>
                <span
                  className={`font-semibold ${
                    vendorData.isVerified ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {vendorData.isVerified ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active:</span>
                <span
                  className={`font-semibold ${
                    vendorData.isActive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {vendorData.isActive ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
