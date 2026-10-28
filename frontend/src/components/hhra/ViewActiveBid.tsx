"use client";
import { AlarmClock, ArrowLeft, CalendarIcon, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Badge } from "../ui/badge";
import { Slider } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import Link from "next/link";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { parseDate } from "@/lib/parseDate";
import { Label } from "../ui/label";

const CustomSlider = styled(Slider)({
  "& .MuiSlider-mark": {
    width: 50,
    height: 50,
    borderRadius: "50%",
    backgroundColor: "#e5e5e5",
  },
  "& .MuiSlider-markActive": {
    opacity: 1,
    backgroundColor: "red",
  },
});

const marks = [{ value: 0 }, { value: 40 }, { value: 70 }, { value: 98 }];

function formatDate(date: Date | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const ViewRequest = () => {
  const [value, setValue] = useState<number[]>([2, 42]);

  const handleChange = (event: Event, newValue: number[]) => {
    setValue(newValue);
  };

  const [openStart, setOpenStart] = useState(false);
  const [mydateStart, setMydateStart] = useState("12/12/25");
  const [dateStart, setDateStart] = useState<Date | undefined>(
    parseDate(mydateStart) || undefined
  );
  const [monthStart, setMonthStart] = useState<Date | undefined>(dateStart);

  // Bid Deadline

  const [openEnd, setOpenEnd] = useState(false);
  const [mydateEnd, setMydateEnd] = useState("12/20/25");
  const [dateEnd, setDateEnd] = useState<Date | undefined>(
    parseDate(mydateEnd) || undefined
  );
  const [monthEnd, setMonthEnd] = useState<Date | undefined>(dateEnd);

  const router = useRouter();

  const tableContent = [
    {
      vendor: "HP Nigeria",
      price: "100,000",
      status: "Bidding",
    },
    {
      vendor: "HP Nigeria",
      price: "100,000",
      status: "Bidding",
    },
    {
      vendor: "HP Nigeria",
      price: "100,000",
      status: "Withdrawn",
    },
    {
      vendor: "HP Nigeria",
      price: "100,000",
      status: "Bidding",
    },
    {
      vendor: "HP Nigeria",
      price: "100,000",
      status: "Withdrawn",
    },
  ];
  return (
    <>
      <div className="flex flex-col py-4 px-4 md:px-6 gap-4">
        <div
          onClick={() => router.back()}
          className="flex w-7 h-7 border-1 border-[#0F1E7A] rounded-full justify-center items-center"
        >
          <ArrowLeft color="#0F1E7A" size={18} className="cursor-pointer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[50%_40%] gap-24">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col bg-white gap-2 py-6 rounded-md shadow-md">
              <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#F6B40E]" />
                  <p className="text-sm text-[#F6B40E] font-medium">
                    Active Bids
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-white border border-[#0F1E7A] text-[#0F1E7A] font-medium">
                    IT Dept
                  </Badge>
                  <Badge className="bg-white border border-[#0F1E7A] text-[#0F1E7A] font-medium">
                    General
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4">
                <AlarmClock color="#0F1E7A" />
                <p className="text-base text-[#0F1E7A] font-normal">
                  Ending in <span className="font-semibold">10</span> days
                </p>
              </div>
              <div className="flex items-center px-4">
                <p className="text-xl text-[#0F1E7A] font-semibold">
                  View Request
                </p>
              </div>
              <div className="flex flex-col relative">
                <div className="flex bg-[#D9D9D9] justify-center items-center">
                  <Image
                    src="/product.png"
                    alt="product"
                    width={250}
                    height={250}
                    className="object-contain items-center py-10"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 px-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <p className="text-base text-[#0F1E7A] font-semibold">
                      Alienware
                    </p>
                    <p className="text-base text-[#0F1E7A] font-light">
                      Aurora R12 RTX{" "}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-base text-end text-[#DE1216] font-semibold">
                      Deadline
                    </p>
                    <p className="text-base text-[#DE1216] font-light">
                      26th of June, 2025
                    </p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-base text-[#0F1E7A] font-semibold">
                    Item Description
                  </p>
                  <p className="text-base text-[#0F1E7A] font-light">
                    GeForce RTX 3080 10GB GDDR6X, Intel Core i7 11700KF, 16GB
                    HyperX Fury DDR4 XMP RAM, 1TB HDD + 512GB SSD, Lunar Light
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-base text-[#0F1E7A] font-semibold">
                    Quantity
                  </p>
                  <p className="text-base text-[#0F1E7A] font-light">
                    20 Units
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-base text-[#0F1E7A] font-semibold">
                    Unit Cost
                  </p>
                  <p className="text-base text-[#0F1E7A] font-light">
                    $100 000
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-base text-[#0F1E7A] font-semibold">
                    Delivery Date
                  </p>
                  <p className="text-base text-[#0F1E7A] font-light">3/07/25</p>
                </div>
                <div className="flex flex-col">
                  <p className="text-base text-[#0F1E7A] font-semibold">
                    Additional Information
                  </p>
                  <p className="text-base text-[#0F1E7A] font-light">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                    do eiusmod tempor incididunt.
                  </p>
                </div>
              </div>
              <div className="grid w-full px-4">
                <div className="w-full py-3 shadow-md rounded-md">
                  <div className="px-3">
                    <Slider
                      getAriaLabel={() => "Temperature range"}
                      value={value}
                      onChange={handleChange}
                      marks={marks}
                      sx={{
                        "& .MuiSlider-mark": {
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: "#e5e5e5",
                          border: "1px solid #e5e5e5",
                        },
                      }}
                      className="text-base text-black font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <p className="font-normal">Bids Received</p>
                    <p className="pl-3 text-center font-normal">HHRA Review</p>
                    <p className="pl-3 text-center font-normal">Negotiation</p>
                    <p className="font-normal">End Bid</p>
                  </div>
                </div>
              </div>
              <div className="w-full flex justify-center items-center mt-3">
                <Button className="bg-[#ED3237] px-6 py-4 text-xl text-white font-semibold">
                  Close
                </Button>
              </div>
            </div>
            
            {/* Comment from Procurement Manager  */}
            <div className="flex flex-col bg-white gap-2 px-4 py-6 gap-3 rounded-md shadow-md">
              <p className="font-medium">Comment from Procurement Manager </p>
              <div className="flex flex-col gap-1">
                <Label>Bid Start</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date-start"
                    value={mydateStart}
                    placeholder="12/12/25"
                    className="bg-background pr-10 border"
                    onChange={(e) => {
                      setMydateStart(e.target.value);
                      const date = parseDate(e.target.value);
                      if (date) {
                        setDateStart(date);
                        setMonthStart(date);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpenStart(true);
                      }
                    }}
                  />
                  <Popover open={openStart} onOpenChange={setOpenStart}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker-start"
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                      >
                        <CalendarIcon className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto overflow-hidden bg-white p-0"
                      align="end"
                    >
                      <Calendar
                        mode="single"
                        selected={dateStart}
                        captionLayout="dropdown"
                        month={monthStart}
                        onMonthChange={setMonthStart}
                        onSelect={(date) => {
                          setDateStart(date);
                          setMydateStart(formatDate(date));
                          setOpenStart(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Bid Deadline</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date-end"
                    value={mydateEnd}
                    placeholder="12/20/25"
                    className="bg-background pr-10 border"
                    onChange={(e) => {
                      setMydateEnd(e.target.value);
                      const date = parseDate(e.target.value);
                      if (date) {
                        setDateEnd(date);
                        setMonthEnd(date);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpenEnd(true);
                      }
                    }}
                  />
                  <Popover open={openEnd} onOpenChange={setOpenEnd}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker-end"
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                      >
                        <CalendarIcon className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto overflow-hidden bg-white p-0"
                      align="end"
                    >
                      <Calendar
                        mode="single"
                        selected={dateEnd}
                        captionLayout="dropdown"
                        month={monthEnd}
                        onMonthChange={setMonthEnd}
                        onSelect={(date) => {
                          setDateEnd(date);
                          setMydateEnd(formatDate(date));
                          setOpenEnd(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Additional Information</Label>
                <Textarea placeholder="" className="h-[100px]" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            {/* Bids  */}
            <div className="flex flex-col bg-white gap-2 px-4 py-6 rounded-md shadow-md">
              <div>
                <p className="text-3xl text-[#0F1E7A] font-semibold">Bids</p>
              </div>
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableContent.map((item, index) => {
                      const isWithdrawn = item.status === "Withdrawn";

                      return (
                        <TableRow
                          key={index}
                          className={`${
                            isWithdrawn ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          <TableCell>{item.vendor}</TableCell>
                          <TableCell>{item.price}</TableCell>
                          <TableCell className={"text-[#000] font-medium"}>
                            {item.status}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={
                                isWithdrawn ? "#" : "/hhra/request?view=details"
                              }
                              aria-disabled={isWithdrawn}
                            >
                              <Button
                                className={`bg-[#0F1E7A] text-white cursor-pointer capitalize ${
                                  isWithdrawn
                                    ? "opacity-40 cursor-not-allowed pointer-events-none"
                                    : ""
                                }`}
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

              <div className="w-full flex justify-center items-center mt-3">
                <Button className="bg-[#0F1E7A] px-6 py-4 text-xl text-white font-semibold">
                  Submit
                </Button>
              </div>
            </div>

            {/* Comments */}
            <div className="flex flex-col gap-10">
              <div className="flex flex-col w-full bg-white gap-6 py-6 px-4 rounded-md shadow-md">
                <div className="flex justify-between items-center">
                  <p className="text-xl text-[#0F1E7A] font-medium">Comments</p>
                  <X />
                </div>
                <div className="flex gap-3 ">
                  <div>
                    <Image
                      src="/avatar.png"
                      alt=""
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  </div>
                  <div className="flex flex-col ">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col ">
                        <p className="text-md text-[#0F1E7A] font-semibold">
                          Procurement Manager
                        </p>
                        <p className="text-sm font-light">27 Mins ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className="bg-[#0F1E7A26] text-sm text-[#0F1E7A] font-medium">
                    daramola@daystar.org
                  </Badge>
                  <Badge className="bg-[#7A0F4A26] text-sm text-[#7A0F4A] font-medium">
                    Nkemjika@daystar.org
                  </Badge>
                </div>
                <div className="flex flex-col mt-4 gap-1">
                  <p className="text-base text-[#4F7396] font-medium">Reply</p>
                  <div className="relative">
                    <Textarea
                      className="bg-[#F0F1F7] h-[150px] "
                      placeholder="Enter your comment"
                    />
                    <Button className="absolute bottom-2 right-2  bg-[#0F1E7A] px-4 py-2 text-white text-sm font-medium">
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewRequest;
