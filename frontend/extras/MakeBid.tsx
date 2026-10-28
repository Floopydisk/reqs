"use client"
import { AlarmClock, ArrowLeft, Ellipsis, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { Badge } from "../src/components/ui/badge";
import { Button } from "../src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../src/components/ui/dialog";
import { Input } from "../src/components/ui/input";
import { Label } from "../src/components/ui/label";
import { Textarea } from "../src/components/ui/textarea";

const MakeBid = () => {
  const router = useRouter();
  return (
    <>
      <div className="flex flex-col px-4 py-4 md:px-6 gap-4">
        <div onClick={() => router.back()} className="flex w-7 h-7 border-1 border-[#0F1E7A] rounded-full justify-center items-center">
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
            <div className="flex bg-[#D9D9D9] justify-center items-center">
              <Image
                src="/product.png"
                alt="product"
                width={200}
                height={200}
                className="object-contain items-center py-8"
              />
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
            <div className="flex flex-col w-[500px] h-[500px] bg-white gap-4 py-6 px-4 rounded-md shadow-md">
              <p className="text-3xl text-[#0F1E7A] font-semibold">Make Bid</p>
              <div className="grid w-full">
                <Label htmlFor="bidamount" className="text-base">
                  Bid Amount(₦)
                </Label>
                <Input type="number" id="bidamount" className="border h-12" />
              </div>
              <div className="grid w-full">
                <Label htmlFor="deliverydate" className="text-base">
                  Delivery Date
                </Label>
                <Input type="text" id="deliverydate" className="border h-12" />
              </div>
              <div className="grid w-full">
                <Label className="text-base">Additional Information</Label>
                <Textarea className="h-30" />
              </div>

              <div className="flex justify-center items-center gap-6 mt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0F1E7A] px-6 text-base text-white cursor-pointer">
                      Make Bid
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="flex flex-col bg-white w-[400px] h-[200px] justify-center items-center">
                    <DialogHeader className="flex items-center">
                      <p className="text-2xl text-[#0F1E7A] font-semibold">
                        Bid Received
                      </p>
                      <p className="text-sm text-[#0F1E7A] font-light">
                        You bid is in review
                      </p>
                      <Link href={"/vendor"}>
                        <Button className="bg-[#0F1E7A] px-12  text-base text-white mt-4 cursor-pointer">
                          Go to Dashboard
                        </Button>
                      </Link>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
                <Button className="bg-[#ED3237] px-8 text-base text-white cursor-pointer">
                  Close
                </Button>
              </div>
            </div>
            <div className="flex flex-col py-5  h-[600px] border border-[#E5E5E5] rounded-md">
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
  );
};

export default MakeBid;
