"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

const VendorDetails = () => {
  const tableContent = [
    {
      item: "Microphone",
      price: "100,000",
      status: "Completed",
    },
    {
      item: "Speakers",
      price: "100,000",
      status: "Rejected",
    },
    {
      item: "Office Chair",
      price: "100,000",
      status: "Completed",
    },
    {
      item: "Speakers",
      price: "100,000",
      status: "Active",
    },
    {
      item: "Speakers",
      price: "100,000",
      status: "Completed",
    },
  ];

  const router = useRouter();
  return (
    <>
      <div className="flex flex-col py-4 px-4 md:px-6 gap-4">
        <div
          onClick={() => router.back()}
          className="flex w-7 h-7 border-1 border-[#0F1E7A] rounded-full justify-center items-center"
        >
          <ArrowLeft color="#0F1E7A" size={18} className="cursor-pointer" />
        </div>
        <div className="flex justify-between items-center gap-16">
          <div className="flex flex-col bg-white w-full py-6 rounded-md shadow-md">
            <div className="flex flex-col px-10 gap-6">
              <p className="text-3xl text-[#0F1E7A] font-medium capitalize text-center">
                HP Nigeria
              </p>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <p>Contact Person</p>
                  <p className="font-semibold">Nancy</p>
                </div>
                <div className="flex flex-col">
                  <p>Phone Number</p>
                  <p className="font-semibold">+234 808xxxxxx</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <p>Email Address</p>
                  <p className="font-semibold">nancy@gmail.com </p>
                </div>
                <div className="flex flex-col">
                  <div className="flex justify-start">
                    <p>Address</p>
                  </div>
                  <p className="font-semibold">2 Ziatech Road, Ikeja</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <div className="flex"><p>Category</p></div>
                  <p className="font-semibold">IT, Office Supplies</p>
                </div>
                <div className="flex flex-col">
                  <p>Date of Incorporation</p>
                  <p className="font-semibold">24th of May, 2016</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <p>CAC Document</p>
                  <p className="font-semibold">view file</p>
                </div>
                <div className="flex flex-col">
                  <p>Website</p>
                  <p className="font-semibold">https:xxxxxxxxxxxxxx</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col bg-white px-6 py-6 rounded-md shadow-md">
              <div>
                <p className="text-3xl text-[#0F1E7A] font-semibold">Past Bids</p>
              </div>
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableContent.map((item, index) => {
                      return (
                        <TableRow
                          key={index}
                        >
                          <TableCell>{item.item}</TableCell>
                          <TableCell>{item.price}</TableCell>
                          <TableCell className={item.status === "Completed" ? "text-[#26850B]" : item.status === "Active" ? "text-[#F6B40E]" : item.status === "Rejected" ? "text-[#ED3237]" : "text-[#000]"}>
                            {item.status}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={
                                "/hhra/request?view=details"
                              }
                            >
                              <Button
                                className={`bg-[#0F1E7A] text-white cursor-pointer capitalize`}
                              >
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

        </div>
      </div>
    </>
  );
};

export default VendorDetails;
