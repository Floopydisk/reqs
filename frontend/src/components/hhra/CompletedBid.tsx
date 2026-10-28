"use client";
import { Label } from "@radix-ui/react-label";
import {
  AlarmClock,
  ArrowLeft,
  CalendarIcon,
  CircleCheckBig,
  Ellipsis,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Textarea } from "../ui/textarea";
import { parseDate } from "@/lib/parseDate";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Link from "next/link";

function formatDate(date: Date | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const CompletedBid = () => {
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
            <div className="flex flex-col bg-white gap-2 py-6 h-full  rounded-md shadow-md">
              <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#14AE5C]" />
                  <p className="text-sm text-[#14AE5C] font-medium">
                    Completed Bids
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
                  HP Nigeria
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
                <div className="absolute top-0 right-0 translate-y-3">
                  <Badge className="bg-[#14AE5C] text-white font-medium rounded-none">
                  Awarded Vendor
                  </Badge>
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
              <div className="w-full flex justify-center items-center gap-6 mt-3">
                <Button
                  disabled
                  className="bg-[#0F1E7A] px-6 py-4 text-xl text-white font-semibold cursor-pointer"
                >
                  Award Bid
                </Button>
                <Button
                  disabled
                  className="bg-[#ED3237] px-6 py-4 text-xl text-white font-semibold cursor-pointer"
                >
                  Reject Bid
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

          <div className="flex flex-col gap-8">
            <div className="flex flex-col w-full bg-white gap-4 py-6 px-4 rounded-md shadow-md">
              <div className="grid w-full">
                <Label htmlFor="bidamount" className="text-base font-medium">
                  Bid Amount(₦)
                </Label>
                <Input type="number" id="bidamount" className="border h-12" />
              </div>
              <div className="grid w-full">
                <Label htmlFor="deliverydate" className="text-base font-medium">
                  Date of Delivery
                </Label>
                <Input type="text" id="deliverydate" className="border h-12" />
              </div>
              <div className="grid w-full">
                <Label className="text-base font-medium">
                  Additional Information
                </Label>
                <Textarea className="h-30" />
              </div>
            </div>
            <div className="flex flex-col py-5 bg-white h-[600px] border border-[#E5E5E5] rounded-md">
              <div className="flex items-center px-4 gap-2">
                <Image
                  src="/avatar.png"
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-full"
                />
                <Textarea
                  placeholder="Start a conversation"
                  className="h-[10px] border border-[#9F9F9F]"
                />
              </div>
              <div className="border-b-1 border-[#4F7396] py-3" />
              <div className="flex justify-between items-center px-4 mt-4">
                <div className="flex gap-3">
                  <div>
                    <Image
                      src="/avatar.png"
                      alt=""
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-md font-semibold">Benson John</p>
                        <p className="text-sm font-light">27 Mins ago</p>
                      </div>
                      <Ellipsis className="cursor-pointer" />
                    </div>

                    <p className="max-w-lg text-sm font-normal">
                      A better understanding of usage can aid in prioritizing
                      future efforts, be clear on the laptop requirements and
                      also adjust the price
                    </p>
                    <p className="text-sm font-normal text-[#0F1E7A] cursor-pointer">
                      Reply
                    </p>

                    {/* Nested reply */}
                    <div className="">
                      <div className="flex justify-between items-center  mt-4">
                        <div className="flex gap-3">
                          <div>
                            <Image
                              src="/avatar.png"
                              alt=""
                              width={36}
                              height={36}
                              className="rounded-full"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-md font-semibold">
                                  Benson John
                                </p>
                                <p className="text-sm font-light">
                                  27 Mins ago
                                </p>
                              </div>
                              <Ellipsis className="cursor-pointer" />
                            </div>
                            <p className="max-w-lg text-sm font-normal">
                              Totally agree with you! Clearer specs will really
                              help.
                            </p>
                            <p className="text-sm font-normal text-[#0F1E7A] cursor-pointer">
                              Reply
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* End nested reply */}
                    <div className="">
                      <div className="flex justify-between items-center  mt-4">
                        <div className="flex gap-3">
                          <div>
                            <Image
                              src="/avatar.png"
                              alt=""
                              width={36}
                              height={36}
                              className="rounded-full"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-md font-semibold">
                                  Benson John
                                </p>
                                <p className="text-sm font-light">
                                  27 Mins ago
                                </p>
                              </div>
                              <Ellipsis className="cursor-pointer" />
                            </div>
                            <p className="max-w-lg text-sm font-normal">
                              Totally agree with you! Clearer specs will really
                              help.
                            </p>
                            <div className="flex flex-col gap-2">
                              <p className="text-sm font-normal text-[#0F1E7A] cursor-pointer">
                                Reply
                              </p>
                              <div className="relative items-center">
                                <Textarea />
                                <div className="absolute translate-y-5 top-0 right-2 cursor-pointer">
                                  <Send color="#9F9F9F" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CompletedBid
