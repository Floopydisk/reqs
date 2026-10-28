"use client";
import { Ellipsis, Send, Upload } from "lucide-react";
import Image from "next/image";
import React, { useRef, useState } from "react";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Label } from "../src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../src/components/ui/select";
import { Slider } from "../src/components/ui/slider";
import { Textarea } from "../src/components/ui/textarea";

const ViewRequest = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [value, setValue] = useState([0])

  return (
    <>
      <div className="grid grid-cols-[50%_40%] py-4 px-4 md:px-6 gap-24">
        <div className="flex flex-col gap-2">
          <p className="text-3xl text-[#0F1E7A] font-medium">
            Create New Request
          </p>
          <div className="flex flex-col space-y-3">
            <div className="grid w-full max-w-md items-center">
              <Label htmlFor="ItemDesc" className="text-md font-normal">
                Request Title
              </Label>
              <Input
                type="text"
                id="ItemDesc"
                name="ItemDesc"
                className="border"
              />
            </div>
            <div className="grid w-full max-w-md">
              <Label htmlFor="message" className="text-md font-normal">
                Item Description
              </Label>
              <Textarea
                id="message"
                name="message"
                className="h-[50px] overflow-y-auto"
              />
            </div>
            <div className="grid w-full max-w-md">
              <Label className="text-md font-normal">Category</Label>
              <Select>
                <SelectTrigger className="bg-gray-100 w-full border-1">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectGroup>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="blueberry">Blueberry</SelectItem>
                    <SelectItem value="grapes">Grapes</SelectItem>
                    <SelectItem value="pineapple">Pineapple</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full max-w-md ">
              <Label className="text-md font-normal">Urgency</Label>
              <div className="flex flex-col px-4 py-6 gap-3 border rounded-md">
                <div className="relative w-full">
                  <Slider
                    max={100}
                    step={3}
                    
                    className="w-full bg-[#0F1E7A] "
                  />

                  <div className="absolute top-1/2 left-0 w-full flex justify-between items-center -translate-y-1/2 pointer-events-none">
                    <div className="w-7 h-7 rounded-full bg-transparent border" />
                    <div className="w-7 h-7 rounded-full bg-transparent border" />
                    <div className="w-7 h-7 rounded-full bg-transparent border" />
                  </div>
                </div>
                <div className=" w-full flex justify-between items-center ">
                  <p>Low</p>
                  <p>Medium</p>
                  <p>High</p>
                </div>
              </div>
            </div>
            <div className="grid w-full max-w-md items-center">
              <Label htmlFor="justification" className="text-md font-normal">
                Justification
              </Label>
              <Input
                type="text"
                id="justification"
                name="Justification"
                className="border"
              />
            </div>
            <div className="grid w-full max-w-md items-center">
              <Label htmlFor="attachImg" className="text-md font-normal">
                Attach Image
              </Label>
              <label
                htmlFor="attachImg"
                className="cursor-pointer border rounded-md px-4 py-2 text-xs text-gray-500 hover:bg-gray-100"
              >
                {fileName ||
                  "Upload image most preferably in PNG, JPEG format."}
              </label>
              <div className="relative">
                <Input
                  type="file"
                  id="attachImg"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Upload
                  size={18}
                  color="gray"
                  className="absolute top-[-28px] right-5"
                />
              </div>
            </div>
            <div className="grid w-full max-w-md items-center">
              <Label htmlFor="uom" className="text-md font-normal">
                Units
              </Label>
              <Input type="text" id="uom" name="uom" className="border-1" />
            </div>
            <div className="grid w-full max-w-md items-center">
              <Label htmlFor="price" className="text-md font-normal">
                (₦) Unit Price
              </Label>
              <Input
                type="number"
                id="price"
                name="price"
                className="border-1"
              />
            </div>
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
                  A better understanding of usage can aid in prioritizing future
                  efforts, be clear on the laptop requirements and also adjust
                  the price
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
                            <p className="text-md font-semibold">Benson John</p>
                            <p className="text-sm font-light">27 Mins ago</p>
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
                            <p className="text-md font-semibold">Benson John</p>
                            <p className="text-sm font-light">27 Mins ago</p>
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
      <div className="px-6">
          <Button className="bg-[#0F1E7A] text-base text-white font-medium">Proceed</Button>
        </div>
    </>
  );
};

export default ViewRequest;
