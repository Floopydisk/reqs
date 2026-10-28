"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { getToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import AddVendorDialog from "./AddVendorDialog";
import { Vendor } from "@/components/Requests/types";
import DashboardCard from "@/components/DashboardCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable, { Column } from "@/components/DataTable";
import React, { useEffect, useState, useCallback } from "react";

export default function VendorDashboard({ routePrefix = "/pm" }: { routePrefix?: string }) {
  const isPmRoute = routePrefix === "/pm";
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [dashboardStats, setDashboardStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    deactivated: 0,
  });

  const token = getToken();
  const itemsPerPage: number = 10;

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

  const columns: Column<Vendor>[] = [
    { key: "name", label: "Vendor Name" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    {
      key: "categories",
      label: "Categories",
      render: (value) =>
        value
          ?.map((cat: { _id: string; name: string }) => cat.name)
          .join(", ") || "N/A",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value || "pending"} />,
    },
    {
      key: "isVerified",
      label: "Verified",
      render: (value) => (
        <span className={value ? "text-green-500" : "text-red-500"}>
          {value ? "Yes" : "No"}
        </span>
      ),
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
            <Link href={`${routePrefix}/vendors/${row._id}`}>View</Link>
          </Button>
        </div>
      ),
    },
  ];

  const dashboardCardItems = [
    {
      key: 1,
      imgSrc: "/vendor-application.svg",
      title: "Total Vendors",
      color: "#0F1E7A",
      value: dashboardStats.total,
    },
    {
      key: 2,
      imgSrc: "/current-bids.svg",
      title: "Approved Vendors",
      color: "#0F1E7A",
      value: dashboardStats.approved,
    },
    {
      key: 3,
      imgSrc: "/requisition-requests.svg",
      title: "Pending Vendors",
      color: "#0F1E7A",
      value: dashboardStats.pending,
    },
    {
      key: 4,
      imgSrc: "/pm-requests.svg",
      title: "Deactivated Vendors",
      color: "#0F1E7A",
      value: dashboardStats.deactivated,
    },
  ];

  const fetchAllVendorsForStats = useCallback(async () => {
    try {
      let allVendors: Vendor[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await fetch(
          `${API_BASE_URL}/vendors?page=${currentPage}&limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        
        if (data.success) {
          allVendors = [...allVendors, ...data.data];
          totalPages = data.pagination.pages;
          currentPage++;
        } else {
          break;
        }
      } while (currentPage <= totalPages);

      const stats = {
        total: allVendors.length,
        pending: 0,
        approved: 0,
        deactivated: 0,
      };

      allVendors.forEach((vendor: Vendor) => {
        if (vendor.status === "pending") stats.pending++;
        else if (vendor.status === "approved") stats.approved++;
        if (!vendor.isActive) stats.deactivated++;
      });

      setDashboardStats(stats);
    } catch (error) {
      console.error("Error fetching vendors for stats:", error);
    }
  }, [token]);

  const fetchVendors = useCallback(
    async (pageNum: number = 1) => {
      setLoading(true);

      try {
        const endpoint = `${API_BASE_URL}/vendors?page=${pageNum}&limit=${itemsPerPage}`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();

        if (data.success) {
          setVendors(data.data);

          if (data.pagination) {
            setCurrentPage(data.pagination.page);
            setTotalPages(data.pagination.pages);
            setTotalCount(data.pagination.total);
          }
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      fetchLocations();
      fetchVendors(1);
      fetchAllVendorsForStats();
    }
  }, [token, fetchVendors, fetchLocations, fetchAllVendorsForStats]);

  const handlePageChange = (page: number) => {
    fetchVendors(page);
  };

  const handleSearchResults = (results: unknown[], totalPages: number) => {
    setSearchResults(results as Vendor[]);
    setIsSearchActive(true);
    setTotalPages(totalPages);
  };

  const handleClearSearch = () => {
    setIsSearchActive(false);
    setSearchResults([]);
    fetchVendors(1); // Restore original data
  };

  return (
    <div className="flex flex-col gap-4 p-6 lg:p-12 !pb-16">
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

      <div className="flex justify-between items-center py-4">
        <p className="text-md md:text-2xl text-[#0F1E7A] font-semibold leading-5">
          Vendors
        </p>

        {/* D4: Add New Vendor is PM-only; HHRA can only approve existing vendors */}
        {isPmRoute && (
          <AddVendorDialog
            onVendorAdded={() => {
              fetchVendors(1);
              fetchAllVendorsForStats();
            }}
            trigger={
              <Button className="bg-[#0F1E7A] text-white cursor-pointer">
                <Plus size={22} /> Add New Vendor
              </Button>
            }
          />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F1E7A]"></div>
          <span className="ml-2 text-gray-600">Loading vendors...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={isSearchActive ? searchResults : vendors}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          loading={loading}
          searchEndpoint="/vendors"
          onSearchResults={handleSearchResults}
          onClearSearch={handleClearSearch}
        />
      )}
    </div>
  );
}
