import Link from "next/link";
import React from "react";
import { Button } from "../src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";

const RequestTable = () => {
  const tableItems = [
    {
      id: "1",
      itemDescription: "New Microphones",
      qty: 12,
      deadline: "08-May-2025",
      status: "Approved",
    },
    {
      id: "2",
      itemDescription: "Projector Screens",
      qty: 5,
      deadline: "12-May-2025",
      status: "Approved",
    },
    {
      id: "3",
      itemDescription: "Office Chairs",
      qty: 30,
      deadline: "15-May-2025",
      status: "Rejected",
    },
    {
      id: "4",
      itemDescription: "Laptops",
      qty: 10,
      uom: 1,
      deadline: "20-May-2025",
      status: "Active",
    },
    {
      id: "5",
      itemDescription: "Stationery Supplies",
      qty: 200,
      uom: 50,
      deadline: "25-May-2025",
      status: "Approved",
    },
    {
      id: "6",
      itemDescription: "Air Conditioners",
      qty: 6,
      deadline: "30-May-2025",
      status: "Active",
    },
    {
      id: "7",
      itemDescription: "LED Monitors",
      qty: 15,
      deadline: "02-Jun-2025",
      status: "IT",
    },
    {
      id: "8",
      itemDescription: "Conference Tables",
      qty: 3,
      deadline: "05-Jun-2025",
      status: "Rejected",
    },
    {
      id: "9",
      itemDescription: "Networking Cables",
      qty: 100,
      deadline: "08-Jun-2025",
      status: "Active",
    },
    {
      id: "10",
      itemDescription: "Whiteboards",
      qty: 8,
      deadline: "10-Jun-2025",
      status: "Approved",
    },
  ];
  
  return (
    <>
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Item Description</TableHead>
              <TableHead>QTY</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {tableItems.map((item, index) => (
              <TableRow key={index}> 
              <TableCell>{item.itemDescription}</TableCell>
              <TableCell>{item.qty}</TableCell>
              <TableCell>{item.deadline}</TableCell>
              <TableCell className={
                item.status === "Approved" ? "text-[#26850B]" : item.status === "Active" ? "text-[#F6B40E]" : "text-[#DE1216]"
              }>{item.status}</TableCell>
              <TableCell>
                <Link href={"/vendor/requests?view=make-bid"}>
                <Button className="bg-[#0F1E7A] text-white cursor-pointer capitalize">
                  Place Bid
                </Button>
                </Link>
              </TableCell>
            </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default RequestTable;
