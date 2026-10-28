"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  Upload,
  Ellipsis,
  Send,
  CircleCheckBig,
} from "lucide-react";
import TableContent from "@/components/TableContent";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { styled } from "@mui/material/styles";
import { Slider } from "@mui/material";

const CustomSlider = styled(Slider)({
  "& .MuiSlider-mark": {
    width: 50, // increase size
    height: 50, // increase size
    borderRadius: "50%",
    backgroundColor: "black", // color of the marks
  },
  "& .MuiSlider-markActive": {
    opacity: 1,
    backgroundColor: "red", // active mark color
  },
});

const marks = [{ value: 0 }, { value: 50 }, { value: 96 }];

const NewRequest = () => {
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);


  const [value, setValue] = useState<number[]>([2, 52]);

  const handleChange = (event: Event, newValue: number[]) => {
    setValue(newValue);
  };
  return (
    <div className="flex flex-col py-4 px-4 md:px-6 gap-4">
      <p className="text-2xl text-[#0F1E7A] font-medium">Create New Request</p>
      <div className="grid grid-cols-[60%_40%]">
        <div className="flex flex-col space-y-3">
          <div className="grid w-full max-w-md items-center">
            <Label htmlFor="ItemDesc" className="text-md font-normal">
              Request Title
            </Label>
            <Input type="text" id="title" name="title" className="border-1" />
          </div>
          <div className="grid w-full max-w-md">
            <Label htmlFor="itemDescription" className="text-md font-normal">
              Item Description
            </Label>
            <Textarea
              id="itemDescription"
              name="itemDescription"
              className="h-[80px] overflow-y-auto"
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
          <div className="grid w-full max-w-md">
            <Label htmlFor="urgency" className="text-md font-normal">
              Urgency
            </Label>
            <div className="py-3 border rounded-md">
              <div className="px-3">
                <Slider
                  getAriaLabel={() => "Temperature range"}
                  value={value}
                  onChange={handleChange}
                  // valueLabelDisplay="auto"
                  marks={marks}
                  sx={{
                    "& .MuiSlider-mark": {
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: "#e5e5e5",
                      border:'1px solid black'
                    },
                  }}
                  className="text-base text-black font-bold"
                />
              </div>
              <div className="flex justify-between items-center px-2">
                <p>Low</p>
                <p className="pl-3 text-center">Medium</p>
                <p>High</p>
              </div>
            </div>
          </div>
          <div className="grid w-full max-w-md items-center">
            <Label htmlFor="ItemDesc" className="text-md font-normal">
              Justfication
            </Label>
            <Input type="text" id="title" name="title" className="border-1" />
          </div>
          <div className="grid w-full max-w-md items-center">
            <Label htmlFor="attachment" className="text-md font-normal">
              Attachment
            </Label>
            <label
              htmlFor="attachment"
              className="cursor-pointer border rounded-md px-4 py-2 text-xs text-gray-500 hover:bg-gray-100"
            >
              {fileName || "Upload image most preferably in PNG, JPEG format."}
            </label>
            <div className="relative">
              <Input
                type="file"
                id="attachment"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
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
            <Input type="number" id="price" name="price" className="border-1" />
          </div>
          <div className="mt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="submit"
                  className="bg-[#0F1E7A] px-10 text-white text-md font-medium"
                >
                  Proceed
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[400px] h-[350px] bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-center mt-3 font-medium">
                    Request Submitted
                  </DialogTitle>
                  <DialogDescription className="mt-2">
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-base font-medium">
                        The request has been successfully created.
                      </p>
                      <div className="flex items-center justify-center">
                      <CircleCheckBig size={70} color="#26850a" />
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <Button variant="outline" className="text-base text-[#0F1E7A] border-1 border-[#0F1E7A] font-medium hover:bg-[#0F1E7A26]">View Request</Button>
                    <Button className="border-1 border-[#DE1216] text-base text-[#DE1216]">Confirm</Button>
                </div>
              </DialogContent>
            </Dialog>
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
    </div>
  );
};

export default NewRequest;
