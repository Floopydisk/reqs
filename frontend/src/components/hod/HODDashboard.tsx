"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumericFormat } from "react-number-format";
import DashboardCard from "@/components/DashboardCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable, { Column } from "@/components/DataTable";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserId, getAuthData } from "@/lib/auth";
import getLocationName, { Location } from "@/lib/getLocationName";
import { RequisitionShape } from "@/types/requisition";

interface HDODashboardProps {
  page?: "hodDashboard" | "hodRequisitions" | "hodRequests" | "hhraRequisitions" | "hofRequisitions" | "hofDashboard";
  routePrefix?: string;
}

export default function HDODashboard({
  page = "hodDashboard",
  routePrefix = "/hod",
}: HDODashboardProps = {}) {
  const columns: Column<RequisitionShape>[] = [
    { key: "title", label: "Request Title" },
    {
      key: "items",
      label: "No. of Items",
      render: (value) => value.length,
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
      label: page === "hodRequests" ? "Requisition Number" : "Staff",
      render: (_, row) => {
        if (page === "hodRequests") {
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
            <Link href={`${routePrefix}/requisitions/${row._id}`}>View</Link>
          </Button>

          {(page === "hodRequests" || row.requester._id === userId) &&
            ["submitted", "rejected", "draft"].includes(row.status) && (
            <Button
              asChild
              className="bg-blue-900 hover:bg-blue-800 text-white px-4"
            >
              <Link href={`${routePrefix}/requisitions/${row._id}?mode=edit`}>
                Edit
              </Link>
            </Button>
          )}
        </div>
      ),
    },
  ];
  const [loading, setLoading] = useState(false);
  const [requisitions, setRequisitions] = useState<RequisitionShape[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const itemsPerPage: number = 10;

  // const user = getUser();
  const userId = getUserId();
  const token = getToken();
  const authdata = getAuthData();
  const departmentId =
    authdata?.user?.department?._id ||
    (authdata?.user?.department as any)?.id ||
    (authdata?.user as any)?.departmentId ||
    (typeof authdata?.user?.department === "string" ? authdata?.user?.department : undefined);

  const dashboardCardItems = [
    {
      key: 1,
      imgSrc: "/requisition-requests.svg",
      title: "Total Requests",
      color: "#0F1E7A",
      value: dashboardStats.total,
    },
    {
      key: 2,
      imgSrc: "/pending-requests.svg",
      title: "Pending Requests",
      color: "#F59313",
      value: dashboardStats.pending,
    },
    {
      key: 3,
      imgSrc: "/approved-requests.svg",
      title: "Approved Requests",
      color: "#26850B",
      value: dashboardStats.approved,
    },
    {
      key: 4,
      imgSrc: "/rejected-requests.svg",
      title: "Rejected Requests",
      color: "#DE1216",
      value: dashboardStats.rejected,
    },
  ];

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

  const fetchRequisitions = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true);

      try {
        // D3: hhraRequisitions/hofRequisitions use the unfiltered /requisitions endpoint so HHRA and HOF see all
        const endpoint =
          page === "hhraRequisitions" || page === "hofRequisitions" || page === "hofDashboard"
            ? `${API_BASE_URL}/requisitions?page=${pageNum}&limit=${itemsPerPage}`
            : (page === "hodDashboard" || page === "hodRequisitions" || page === "hodRequests") && departmentId
              ? `${API_BASE_URL}/departments/${departmentId}/requisitions?page=${pageNum}&limit=${itemsPerPage}`
              : page === "hodDashboard" || page === "hodRequisitions" || page === "hodRequests"
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

          // Handle both pagination formats
          if (data.pagination) {
            // New format with pagination object
            setCurrentPage(data.pagination.page);
            setTotalPages(data.pagination.pages);
            setTotalCount(data.pagination.total);
          } else {
            // Old format with direct properties
            setCurrentPage(data.currentPage);
            setTotalPages(data.totalPages);
            setTotalCount(data.total);
          }

          // Calculate stats from total count
          const stats = {
            total: data.pagination?.total || data.total,
            pending: 0,
            approved: 0,
            rejected: 0,
          };

          // Calculate stats from current page data (limited view)
          data.data.forEach((req: RequisitionShape) => {
            if (
              req.status === "draft" ||
              req.status === "pending" ||
              req.status === "submitted" ||
              req.status === "hrReview" ||
              req.status === "hodToolComment"
            )
              stats.pending++;
            else if (
              req.status === "departmentApproved" ||
              req.status === "hofApproved" ||
              req.status === "hhrApproved" ||
              req.status === "procurementApproved" ||
              req.status === "approved" ||
              req.status?.toLowerCase().includes("approved")
            )
              stats.approved++;
            else if (
              req.status === "cancelled" ||
              req.status === "rejected" ||
              req.status?.toLowerCase().includes("reject")
            )
              stats.rejected++;
          });

          setDashboardStats(stats);
        }
      } catch (error) {
        console.error("Error fetching requisitions:", error);
      } finally {
        setLoading(false);
      }
    },
    [userId, token, page, departmentId],
  );

  useEffect(() => {
    if (userId && token) {
      fetchLocations();
      fetchRequisitions(1);
    }
  }, [userId, token, fetchRequisitions, fetchLocations]);

  const handlePageChange = (page: number) => {
    fetchRequisitions(page);
  };

  return (
    <div className="flex flex-col gap-4 p-6 lg:p-12 !pb-16">
      {(page === "hodDashboard" || page === "hofDashboard") && (
        <div className="flex flex-col gap-4">
          <p className="text-2xl text-[#0F1E7A] font-semibold font-normal">
            Summary
          </p>

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
          {page === "hodRequests"
            ? "My Requests"
            : page === "hodRequisitions" || page === "hofRequisitions" || page === "hhraRequisitions"
              ? "Requests"
              : page === "hodDashboard" || page === "hofDashboard"
                ? "Requests summary"
                : ""}
        </p>

        {page !== "hodRequisitions" && page !== "hofRequisitions" && page !== "hhraRequisitions" && (
          <Button
            asChild
            className="px-4 md:px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-base md:text-md text-white cursor-pointer"
          >
            <Link href={`${routePrefix}/my-requests/create-new` as any}>
              <Plus size={22} />{" "}
              <span className="hidden lg:flex">New Request</span>
            </Link>
          </Button>
        )}
      </div>

      {/* <InpageSearch size="large" className="mb-7" /> */}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F1E7A]"></div>
          <span className="ml-2 text-gray-600">Loading requisitions...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={requisitions}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          loading={loading}
        />
      )}
    </div>
  );
}
