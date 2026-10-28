"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumericFormat } from "react-number-format";
import DashboardCard from "@/components/DashboardCard";
import DataTable, { Column } from "@/components/DataTable";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getUserId } from "@/lib/auth";
// import RequestsCard from "./Vendor/RequestsCard";
import { vendorRequestsData } from "@/data/mock/tableData";
import RequestsCard from "./RequestsCard";
import StatusBadge from "../src/components/StatusBadge";

interface VendorDashboardProps {
  page?: "vendorDashboard" | "vendorBids";
}

type RequisitionShape = {
  _id: string;
  title: string;
  category: string;
  description: string;
  quantityNeeded: number;
  image: string;
  estimatedUnitPrice: number;
  priority: string;
  justification: string;
  requester: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  department: {
    _id: string;
    name: string;
    code: string;
  };
  status: string;
  selectedVendors: [];
  paymentStatus: string;
  paymentAmount: 0;
  shortlistedVendors: [];
  deadlineExtensions: [];
  approvals: [
    {
      stage: string;
      approver: string;
      status: string;
      timestamp: string;
      _id: string;
      comments: string;
    }
  ];
  requisitionNumber: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
};

export default function VendorDashboard({
  page = "vendorDashboard",
}: VendorDashboardProps = {}) {
  const columns: Column<RequisitionShape>[] = [
    { key: "title", label: "Title" },
    { key: "quantityNeeded", label: "QTY" },
    { key: "category", label: "Category" },
    {
      key: "createdAt",
      label: "Date",
      render: (value) => {
        const date = new Date(value);
        const day = date.getDate().toString().padStart(2, "0");
        const month = date.toLocaleString("default", { month: "long" });
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      },
    },
    {
      key: "estimatedUnitPrice",
      label: "Price",
      render: (value) => (
        <NumericFormat
          prefix="₦ "
          value={value}
          decimalScale={2}
          fixedDecimalScale
          displayType="text"
          thousandSeparator=","
        />
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value} />,
    },
    // {
    //   key: "requester",
    //   label: page === "hodRequests" ? "Requisition Number" : "Requester",
    //   render: (_, row) => {
    //     if (page === "hodRequests") {
    //       return row.requisitionNumber;
    //     }
    //     const currentUser = authdata?.user;
    //     return currentUser?.id === row.requester._id
    //       ? "You"
    //       : `${row.requester.firstName} ${row.requester.lastName}`;
    //   },
    // },
    {
      key: "_id",
      label: "Action",
      render: (_, row) => (
        <div className="flex gap-2 items-center">
          <Button
            asChild
            className="bg-blue-900 hover:bg-blue-800 text-white px-4"
          >
            <Link href={`/hod/requisitions/${row._id}`}>View</Link>
          </Button>

          {/* {(page === "hodRequests" || row.requester._id === userId) && ( */}
          <Button
            asChild
            className="bg-blue-900 hover:bg-blue-800 text-white px-4"
          >
            <Link href={`/hod/requisitions/${row._id}?mode=edit`}>Edit</Link>
          </Button>
          {/* )} */}
        </div>
      ),
    },
  ];
  const [loading, setLoading] = useState(false);
  const [requisitions, setRequisitions] = useState<RequisitionShape[]>([]);
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

  const dashboardCardItems = [
    {
      key: 1,
      imgSrc: "/open-requests.svg",
      title: "Open Requests",
      color: "#0F1E7A",
      value: dashboardStats.total,
    },
    {
      key: 2,
      imgSrc: "/active-bids.svg",
      title: "Active Bids",
      color: "#F6B40E",
      value: dashboardStats.pending,
    },
    {
      key: 3,
      imgSrc: "/completed-bids.svg",
      title: "Approved Bids",
      color: "#26850B",
      value: dashboardStats.approved,
    },
    {
      key: 4,
      imgSrc: "/rejected-bids.svg",
      title: "Rejected Bids",
      color: "#DE1216",
      value: dashboardStats.rejected,
    },
  ];

  const fetchRequisitions = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true);

      try {
        // To reconcile actual api endpoint and creds
        const endpoint =
          // page === "vendorDashboard" || page === "hodRequisitions"
          //   ? `${API_BASE_URL}/departments/${departmentId}/requisitions?page=${pageNum}&limit=${itemsPerPage}`
          //   : `${API_BASE_URL}/users/${userId}/requisitions?page=${pageNum}&limit=${itemsPerPage}`;

          `${API_BASE_URL}/users/${userId}/requisitions?page=${pageNum}&limit=${itemsPerPage}`;

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
              req.status === "submitted"
            )
              stats.pending++;
            else if (req.status === "departmentApproved") stats.approved++;
            else if (req.status === "cancelled") stats.rejected++;
          });

          setDashboardStats(stats);
        }
      } catch (error) {
        console.error("Error fetching requisitions:", error);
      } finally {
        setLoading(false);
      }
    },
    [userId, token]
  );

  useEffect(() => {
    if (userId && token) {
      fetchRequisitions(1);
    }
  }, [userId, token, fetchRequisitions]);

  const handlePageChange = (page: number) => {
    fetchRequisitions(page);
  };

  return (
    <div className="flex flex-col gap-4 p-6 lg:p-12 !pb-16">
      {page === "vendorDashboard" && (
        <div className="flex flex-col gap-4 mb-8">
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

      <p className="text-2xl text-[#0F1E7A] font-semibold leading-5">
        Requests
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F1E7A]"></div>
          <span className="ml-2 text-gray-600">Loading requisitions...</span>
        </div>
      ) : (
        <>
          {page === "vendorBids" ? (
            <DataTable
              columns={columns}
              data={requisitions}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              loading={loading}
            />
          ) : (
            <RequestsCard data={vendorRequestsData} />
          )}
        </>
      )}
    </div>
  );
}
