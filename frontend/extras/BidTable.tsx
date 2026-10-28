"use client"
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Button } from "../src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";

const BidTable = () => {
  const [visitedBids, setVisitedBids] = useState<string[]>([]);
  const itemsTable = [
    {
      id: "1",
      itemDescription: "New Microphones",
      qty: 12,
      uom: 4,
      deadline: "08-May-2025",
      category: "CONST",
      price: 100000,
      status: "Approved",
    },
    {
      id: "2",
      itemDescription: "Projector Screens",
      qty: 5,
      uom: 2,
      deadline: "12-May-2025",
      category: "EQUIP",
      price: 250000,
      status: "Pending",
    },
    {
      id: "3",
      itemDescription: "Office Chairs",
      qty: 30,
      uom: 1,
      deadline: "15-May-2025",
      category: "FURN",
      price: 450000,
      status: "Rejected",
    },
    {
      id: "4",
      itemDescription: "Laptops",
      qty: 10,
      uom: 1,
      deadline: "20-May-2025",
      category: "IT",
      price: 1500000,
      status: "Approved",
    },
    {
      id: "5",
      itemDescription: "Stationery Supplies",
      qty: 200,
      uom: 50,
      deadline: "25-May-2025",
      category: "OFFICE",
      price: 120000,
      status: "Pending",
    },
    {
      id: "6",
      itemDescription: "Air Conditioners",
      qty: 6,
      uom: 1,
      deadline: "30-May-2025",
      category: "ELEC",
      price: 900000,
      status: "Approved",
    },
    {
      id: "7",
      itemDescription: "LED Monitors",
      qty: 15,
      uom: 1,
      deadline: "02-Jun-2025",
      category: "IT",
      price: 750000,
      status: "Rejected",
    },
    {
      id: "8",
      itemDescription: "Conference Tables",
      qty: 3,
      uom: 1,
      deadline: "05-Jun-2025",
      category: "FURN",
      price: 300000,
      status: "Approved",
    },
    {
      id: "9",
      itemDescription: "Networking Cables",
      qty: 100,
      uom: 20,
      deadline: "08-Jun-2025",
      category: "IT",
      price: 180000,
      status: "Pending",
    },
    {
      id: "10",
      itemDescription: "Whiteboards",
      qty: 8,
      uom: 2,
      deadline: "10-Jun-2025",
      category: "EQUIP",
      price: 100000,
      status: "Approved",
    },
  ];

  useEffect(() => {
    const stored = localStorage.getItem("visitedBids");
    if (stored) {
      setVisitedBids(JSON.parse(stored));
    }
  }, []);

  const handleVisit = (id: string) => {
    const updated = [...new Set([...visitedBids, id])];
    setVisitedBids(updated);
    localStorage.setItem("visitedBids", JSON.stringify(updated));
  };


  return (
    <>
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Item Description</TableHead>
              <TableHead>QTY</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
          {itemsTable.map((item) => {
            const hasVisited = visitedBids.includes(item.id);
            return (
              <TableRow key={item.id}>
                <TableCell>{item.itemDescription}</TableCell>
                <TableCell>{item.qty}</TableCell>
                <TableCell>{item.deadline}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.price}</TableCell>
                <TableCell
                  className={
                    item.status === "Approved"
                      ? "text-[#26850B]"
                      : item.status === "Pending"
                      ? "text-[#F6B40E]"
                      : "text-[#DE1216]"
                  }
                >
                  {item.status}
                </TableCell>
                <TableCell>
                  <Link
                    href={
                      hasVisited
                        ? `/vendor/bids?view=make-bid&id=${item.id}`
                        : `/vendor/bids?view=view-bid&id=${item.id}`
                    }
                    onClick={() => handleVisit(item.id)}
                  >
                    <Button className="bg-[#0F1E7A] text-white cursor-pointer capitalize">
                      {hasVisited ? "View" : "Place Bid"}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>
    </>
  );
};

export default BidTable;
