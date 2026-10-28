"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MakeBid from "../../../../../extras/MakeBid";
import RequestTable from "../../../../../extras/RequestTable";
import ViewBid from "../../../../../extras/ViewBid";
import ViewRequest from "../../../../../extras/ViewRequest";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const RequestsPageContent = () => {
  const searchParams = useSearchParams();
  const view = searchParams?.get("view");

  if (view === "new") {
    return <ViewRequest />;
  }

  if (view === "make-bid") {
    return <ViewBid />;
  }

  if (view === "view-bid") {
    return <MakeBid />;
  }

  return (
    <div className="flex flex-col py-4 px-4 md:px-6 gap-10">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="relative w-[100%]">
          <Input
            type="text"
            placeholder="Search Item"
            className="bg-[#FFFFFF] pl-4 pr-4 py-2 w-full h-12 rounded-md shadow-md"
          />
          <Search
            color="black"
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>
        <Button className="h-12 px-6 py-4 bg-[#0F1E7A] text-md text-white cursor-pointer capitalize">
          advanced search
        </Button>
      </div>
      <div className="flex justify-between items-center gap-4">
        <p className="text-2xl text-[#0F1E7A] font-medium ">Open Requests</p>
        <div>
          <Link href={"/vendor/requests?view=new"}>
            <Button className="px-4 md:px-6 py-4 bg-[#0F1E7A] text-base md:text-md text-white cursor-pointer">
              <Plus size={22} /> New Requests
            </Button>
          </Link>
        </div>
      </div>
      <RequestTable />
    </div>
  );
};

const RequestsPage = () => (
  <Suspense fallback={<div>Loading requests...</div>}>
    <RequestsPageContent />
  </Suspense>
);

export default RequestsPage;
