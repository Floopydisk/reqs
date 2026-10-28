"use client"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlarmClock, ArrowLeft, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useRef, useState } from "react";
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
    backgroundColor: "red", 
  },
});

const marks = [{ value: 0 }, { value: 50 }, { value: 96 }];

const DeniedRequest = () => {
    const router = useRouter();

    const [fileName, setFileName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
  
    const [value, setValue] = useState<number[]>([2, 52]);
  
    const handleChange = (event: Event, newValue: number[]) => {
      setValue(newValue);
    };
  return (
    <>
         <div className="flex flex-col py-4 px-4 md:px-6 gap-4">
        <div
          onClick={() => router.back()}
          className="flex w-7 h-7 border-1 border-[#0F1E7A] rounded-full justify-center items-center"
        >
          <ArrowLeft color="#0F1E7A" size={18} className="cursor-pointer" />
        </div>
        <p className="text-2xl text-[#0F1E7A] font-medium">View Request</p>
        <div className="grid grid-cols-[50%_40%] gap-24">
          <div className="flex flex-col bg-white gap-2 py-6 h-full rounded-md shadow-md">
            <div className="flex items-center gap-3 px-4"></div>
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
                  This request was denied.
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-3 px-4 py-4">
              <div>
                <Input
                  className="border"
                  placeholder="Alienware Aurora R12 RTX 3080 Gaming Desktop- NVIDIA GEForce"
                />
              </div>
              <div className="grid">
                <Label className="text-base">Department</Label>
                <Input className="border" />
              </div>
              <div className="grid w-full">
                <Label className="text-base">Item Description</Label>
                <Textarea className="h-30" />
              </div>
              <div className="grid w-full">
                <Label htmlFor="urgency" className="text-base">
                  Confirm Urgency Level
                </Label>
                <div className="py-3 border rounded-md">
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
                          border: "1px solid black",
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
              <div className="grid">
                <Label className="text-base">Category</Label>
                <Input className="border" />
              </div>
              <div className="grid">
                <Label className="text-base">Quantity</Label>
                <Input className="border" />
              </div>
              <div className="grid w-full items-center">
                <Label htmlFor="price" className="text-md font-normal">
                  Estimated Cost(₦)
                </Label>
                <Input
                  type="number"
                  id="price"
                  name="price"
                  className="border-1"
                />
              </div>
              <div className="grid w-full items-center">
                <Label htmlFor="attachment" className="text-md font-normal">
                  Attachment
                </Label>
                <label
                  htmlFor="attachment"
                  className="cursor-pointer border rounded-md px-4 py-2 text-xs text-gray-500 hover:bg-gray-100"
                >
                  {fileName ||
                    "Upload image most preferably in PNG, JPEG format."}
                </label>
                <div className="relative">
                  <Input
                    type="file"
                    id="attachment"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={(e) =>
                      setFileName(e.target.files?.[0]?.name || "")
                    }
                  />
                  <Upload
                    size={18}
                    color="gray"
                    className="absolute top-[-28px] right-5"
                  />
                </div>
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
  )
}

export default DeniedRequest
