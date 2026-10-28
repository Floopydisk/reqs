"use client";
import {
  AlarmClock,
  ArrowLeft,
  ChevronsDown,
  ChevronsUp,
  Ellipsis,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Badge } from "../src/components/ui/badge";
import { Button } from "../src/components/ui/button";
import { Textarea } from "../src/components/ui/textarea";

const ViewBid = () => {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="flex flex-col px-4 py-4 md:px-6 gap-4">
        <div
          onClick={() => router.back()}
          className="flex w-7 h-7 border-1 border-[#0F1E7A] rounded-full justify-center items-center"
        >
          <ArrowLeft color="#0F1E7A" size={18} className="cursor-pointer" />
        </div>
        <div className="grid grid-cols-[50%_40%] gap-24">
          <div className="flex flex-col bg-white gap-2 py-6 h-[900px]  rounded-md shadow-md">
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
            <div className="flex items-center gap-3 my-2 px-4">
              <AlarmClock color="#0F1E7A" />
              <p className="text-base text-[#0F1E7A] font-normal">
                Ending in <span className="font-semibold">10</span> days
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
                <Badge className="bg-[#FF3B30] text-white font-medium rounded-none">
                  You have already made a bid
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
                  Department
                </p>
                <p className="text-base text-[#0F1E7A] font-light">
                  Information Technology
                </p>
              </div>
              <div className="flex flex-col">
                <p className="text-base text-[#0F1E7A] font-semibold">
                  Quantity
                </p>
                <p className="text-base text-[#0F1E7A] font-light">20 Units</p>
              </div>
              <div className="flex flex-col">
                <p className="text-base text-[#0F1E7A] font-semibold">
                  Comments
                </p>
                <p className="text-base text-[#0F1E7A] font-light">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-10">
            <div className="flex flex-col w-[500px] h-[430px] bg-white gap-6 py-6 px-4 rounded-md shadow-md">
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
                      <p className="text-md font-semibold">Benson John</p>
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
    </>
  );
};

export default ViewBid;
