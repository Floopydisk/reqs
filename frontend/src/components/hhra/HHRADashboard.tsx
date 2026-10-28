"use client";

import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import DashboardCard from "@/components/DashboardCard";
import { RequisitionShape } from "@/types/requisition";
import { useEffect, useState, useCallback } from "react";
import DataTable, { Column } from "@/components/DataTable";
import { getToken, getUserId, getAuthData } from "@/lib/auth";
import getLocationName, { Location } from "@/lib/getLocationName";

interface RFQShape {
  _id: string;
  rfqNumber: string;
  title: string;
  requisition: {
    _id: string;
    title: string;
    requisitionNumber: string;
  };
  requester?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  vendor?: {
    _id: string;
    name: string;
  };
  deliveryLocation?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  status: string;
}

interface POShape {
  _id: string;
  poNumber?: string;
  title?: string;
  deliveryLocation?: { _id: string; name: string };
  createdAt?: string;
  vendor?: { name?: string };
  createdBy?: { _id?: string; firstName?: string; lastName?: string };
  status?: string;
}

interface ProcurementManagerDashboardProps {
  page?:
    | "hhraDashboard"
    | "hhraRequisitions"
    | "hhraRequests"
    | "procurementBids"
    | "rfqs"
    | "pos";
  routePrefix?: string;
  approvalType?: "hhr" | "hof";
}

export default function HHRADashboard({
  page = "hhraDashboard",
  routePrefix = "/hhra",
  approvalType = "hhr",
}: ProcurementManagerDashboardProps = {}) {
  const [loading, setLoading] = useState(false);
  const [requisitions, setRequisitions] = useState<RequisitionShape[]>([]);
  const [rfqs, setRfqs] = useState<RFQShape[]>([]);
  const [pos, setPos] = useState<POShape[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // const [locations, setLocations] = useState<{ _id: string; name: string }[]>(
  //   []
  // );
  const [locations, setLocations] = useState<Location[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingApprovalPoId, setPendingApprovalPoId] = useState<string | null>(
    null,
  );
  const [approvingPoId, setApprovingPoId] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    bidding: 0,
  });

  const itemsPerPage: number = 10;

  const userId = getUserId();
  const token = getToken();
  const authdata = getAuthData();

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data) {
        setLocations(data);
      }
    } catch (error) {
      console.error("Failed to fetch locations", error);
    }
  }, [token]);

  const fetchRFQs = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true);
      try {
        const endpoint = `${API_BASE_URL}/rfqs?page=${pageNum}&limit=${itemsPerPage}`;
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (data.success) {
          setRfqs(data.data);
          setCurrentPage(data.currentPage || data.pagination?.page || 1);
          setTotalPages(data.totalPages || data.pagination?.pages || 1);
          setTotalCount(data.total || data.pagination?.total || 0);
        }
      } catch (error) {
        console.error("Error fetching RFQs:", error);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const fetchPOs = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true);
      try {
        const endpoint = `${API_BASE_URL}/purchase-orders?page=${pageNum}&limit=${itemsPerPage}`;
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (data.success) {
          setPos(data.data);
          setCurrentPage(data.currentPage || data.pagination?.page || 1);
          setTotalPages(data.totalPages || data.pagination?.pages || 1);
          setTotalCount(data.total || data.pagination?.total || 0);
        }
      } catch (error) {
        console.error("Error fetching POs:", error);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const handleApprovePO = async (poId: string) => {
    if (!token) return;
    setApprovingPoId(poId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/${poId}/${approvalType}-approve`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setPos((prev) =>
          prev.map((po) =>
            po._id === poId
              ? {
                  ...po,
                  status:
                    data.data?.status ??
                    (approvalType === "hof" ? "hofApproved" : "approved"),
                }
              : po,
          ),
        );
        toast.success(data.message || "Purchase Order approved successfully");
      } else {
        toast.error(data.message || "Failed to approve Purchase Order");
      }
    } catch (error) {
      console.error("Error approving PO:", error);
      toast.error("An error occurred while approving the Purchase Order");
    } finally {
      setApprovingPoId(null);
      setPendingApprovalPoId(null);
    }
  };

  const columns: Column<RequisitionShape>[] = [
    { key: "title", label: "Request Title" },
    {
      key: "items",
      label: "No. of Items",
      render: (value) => value.length,
    },
    {
      key: "department",
      label: "Department",
      render: (value) => value.name,
    },
    {
      key: "createdAt",
      label: "Date Submitted",
      render: (value) => {
        const date = new Date(value);
        const day = date.getDate().toString().padStart(2, "0");
        const month = date.toLocaleString("default", { month: "long" });
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      },
    },
    {
      key: "requester",
      label: page === "hhraRequests" ? "Requisition Number" : "Staff",
      render: (_, row) => {
        if (page === "hhraRequests") {
          return row.requisitionNumber;
        }
        const currentUser = authdata?.user;
        return currentUser?.id === row.requester._id
          ? "You"
          : `${row.requester.firstName} ${row.requester.lastName}`;
      },
    },
    {
      key: "deliveryLocation",
      label: "Location",
      render: (location) => getLocationName(location, locations),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "_id",
      label: "Action",
      render: (_, row) => (
        <div className="flex gap-2 items-center">
          <Button
            asChild
            className="bg-blue-900 hover:bg-blue-800 text-white px-4"
          >
            <Link href={`/hhra/requests/${row._id}`}>View</Link>
          </Button>
        </div>
      ),
    },
  ];
  const rfqColumns: Column<RFQShape>[] = [
    { key: "title", label: "RFQ Title" },
    { key: "rfqNumber", label: "RFQ Number" },
    {
      key: "deliveryLocation",
      label: "Location",
      render: (location) => location?.name || "N/A",
    },
    {
      key: "createdAt",
      label: "Date Created",
      render: (value) => {
        const date = new Date(value);
        const day = date.getDate().toString().padStart(2, "0");
        const month = date.toLocaleString("default", { month: "long" });
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      },
    },
    {
      key: "vendor",
      label: "Vendor",
      render: (vendor) => vendor?.name || "N/A",
    },
    {
      key: "requester" as keyof RFQShape,
      label: "Staff",
      render: (_, row) => {
        if (!row) return "N/A";
        return "N/A";
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "_id",
      label: "Action",
      render: (_, row) => (
        <div className="flex gap-2 items-center">
          <Button
            asChild
            className="bg-blue-900 hover:bg-blue-800 text-white px-4"
          >
            <Link href={`/hhra/rfqs/${row._id}`}>View</Link>
          </Button>
        </div>
      ),
    },
  ];

  const poColumns: Column<POShape>[] = [
    {
      key: "title",
      label: "PO Title",
      render: (value) =>
        typeof value === "string" && value.trim()
          ? value
          : "Untitled Purchase Order",
    },
    { key: "poNumber", label: "PO Number" },
    {
      key: "deliveryLocation",
      label: "Location",
      render: (location) => location?.name || "N/A",
    },
    {
      key: "createdAt",
      label: "Date Created",
      render: (value) => {
        const date = new Date(value || "");
        const day = date.getDate().toString().padStart(2, "0");
        const month = date.toLocaleString("default", { month: "long" });
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      },
    },
    {
      key: "vendor",
      label: "Vendor",
      render: (vendor) => vendor?.name || "N/A",
    },
    {
      key: "createdBy",
      label: "Staff",
      render: (createdBy) => {
        if (!createdBy) return "N/A";
        const currentUser = authdata?.user;
        return currentUser?.id === createdBy._id
          ? "You"
          : `${createdBy.firstName} ${createdBy.lastName}`;
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "_id",
      label: "Action",
      render: (_, row) => {
        const showApprove =
          (approvalType === "hof" &&
            (row.status === "issued" || row.status === "submitted")) ||
          (approvalType === "hhr" && row.status === "hofApproved");

        return (
          <div className="flex gap-2 items-center">
            <Button
              asChild
              className="bg-blue-900 hover:bg-blue-800 text-white px-4"
            >
              <Link href={`${routePrefix}/pos/${row._id}`}>View</Link>
            </Button>
            {showApprove && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={approvingPoId === row._id}
                onClick={() => setPendingApprovalPoId(row._id)}
              >
                {approvingPoId === row._id ? "Approving..." : "Approve"}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const dashboardCardItems = [
    {
      key: 1,
      imgSrc: "/vendor-application.svg",
      title: "Vendor Application",
      color: "#0F1E7A",
      value: dashboardStats.total,
    },
    {
      key: 2,
      imgSrc: "/current-bids.svg",
      title: "Bids Created",
      color: "#0F1E7A",
      value: dashboardStats.pending,
    },
    {
      key: 3,
      imgSrc: "/requisition-requests.svg",
      title: "Requisitions Requests",
      color: "#0F1E7A",
      value: dashboardStats.approved,
    },
    {
      key: 4,
      imgSrc: "/pm-requests.svg",
      title: "My Requests",
      color: "#0F1E7A",
      value: dashboardStats.bidding,
    },
  ];

  const fetchRequisitions = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true);

      try {
        const endpoint =
          page === "hhraDashboard" || page === "hhraRequisitions"
            ? `${API_BASE_URL}/requisitions?page=${pageNum}&limit=${itemsPerPage}`
            : `${API_BASE_URL}/users/${userId}/requisitions?page=${pageNum}&limit=${itemsPerPage}`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();

        if (data.success) {
          setRequisitions(data.data);

          if (data.pagination) {
            setCurrentPage(data.pagination.page);
            setTotalPages(data.pagination.pages);
            setTotalCount(data.pagination.total);
          } else {
            setCurrentPage(data.currentPage);
            setTotalPages(data.totalPages);
            setTotalCount(data.total);
          }

          const stats = {
            total: data.pagination?.total || data.total,
            pending: 0,
            approved: 0,
            bidding: 0,
          };

          data.data.forEach((req: RequisitionShape) => {
            if (req.status === "departmentApproved") stats.pending++;
            else if (req.status === "procurementApproved") stats.approved++;
            else if (req.status === "bidding") stats.bidding++;
          });

          setDashboardStats(stats);
        }
      } catch (error) {
        console.error("Error fetching requisitions:", error);
      } finally {
        setLoading(false);
      }
    },
    [token, page, userId],
  );

  useEffect(() => {
    if (token) {
      fetchLocations();
      if (page === "rfqs") {
        fetchRFQs(1);
      } else if (page === "pos") {
        fetchPOs(1);
      } else {
        fetchRequisitions(1);
      }
    }
  }, [token, fetchRequisitions, fetchRFQs, fetchPOs, fetchLocations, page]);

  const handlePageChange = (pageNum: number) => {
    if (page === "rfqs") {
      fetchRFQs(pageNum);
    } else if (page === "pos") {
      fetchPOs(pageNum);
    } else {
      fetchRequisitions(pageNum);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 lg:p-12 pb-16!">
      {page === "hhraDashboard" && (
        <div className="flex flex-col gap-4">
          <p className="text-2xl text-[#0F1E7A] font-normal">Summary</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardCardItems.map((item) => (
              <DashboardCard key={item.key}>
                <div className={`flex gap-7 items-center text-[${item.color}]`}>
                  <Image
                    src={item.imgSrc}
                    alt={item.title}
                    width={59}
                    height={59}
                  />

                  <div className="flex flex-col gap-2 text-center justify-center items-center">
                    <h2 className="text-2xl lg:text-[40px] font-bold">
                      {item.value}
                    </h2>

                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                </div>
              </DashboardCard>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center py-4">
        <p className="text-md md:text-2xl text-[#0F1E7A] font-semibold leading-5">
          {page === "procurementBids"
            ? "Bid Management"
            : page === "hhraRequests"
              ? "My Requests"
              : "Requests"}
        </p>

        {page !== "hhraRequisitions" && (
          <Button
            asChild
            className="px-4 md:px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-base md:text-md text-white cursor-pointer"
          >
            <Link href="/hhra/my-requests/create-new">
              <Plus size={22} />{" "}
              <span className="hidden lg:flex">New Request</span>
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F1E7A]"></div>
          <span className="ml-2 text-gray-600">Loading requisitions...</span>
        </div>
      ) : (
        <DataTable
          columns={
            page === "rfqs" ? rfqColumns : page === "pos" ? poColumns : columns
          }
          data={page === "rfqs" ? rfqs : page === "pos" ? pos : requisitions}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          loading={loading}
        />
      )}

      <Dialog
        open={pendingApprovalPoId !== null}
        onOpenChange={(open) => {
          if (!open && !approvingPoId) setPendingApprovalPoId(null);
        }}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to approve this purchase order? This action
            cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setPendingApprovalPoId(null)}
              disabled={!!approvingPoId}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              disabled={!!approvingPoId}
              onClick={() => {
                if (pendingApprovalPoId) handleApprovePO(pendingApprovalPoId);
              }}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              {approvingPoId ? "Approving..." : "Yes, Approve"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
