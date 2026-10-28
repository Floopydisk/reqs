"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlarmClock,
  ArrowLeft,
  Calendar1,
  ChevronDownIcon,
  CircleCheckBig,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useRef, useState } from "react";
import { styled } from "@mui/material/styles";
import { Slider } from "@mui/material";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Link from "next/link";

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

const NewRequest = () => {
  const router = useRouter();

  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState<number[]>([2, 52]);

  const handleChange = (event: Event, newValue: number[]) => {
    setValue(newValue);
  };

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  return (
    <>
      <div className="flex flex-col py-4 px-4 md:px-6 gap-4">
        <div
          onClick={() => router.back()}
          className="flex w-7 h-7 border-1 border-[#0F1E7A] rounded-full justify-center items-center"
        >
          <ArrowLeft color="#0F1E7A" size={18} className="cursor-pointer" />
        </div>
        <p className="text-2xl text-[#0F1E7A] font-medium">
          Create New Request
        </p>
        <div className="grid grid-cols-[50%_40%] gap-24">
          <div className="flex flex-col bg-white gap-2 py-6 h-full rounded-md shadow-md">
            <div className="flex flex-col gap-3 px-4 py-4">
              <div>
                <Label className="text-base">Request Title</Label>
                <Input className="border" placeholder="Request Title" />
              </div>
              <div className="grid w-full">
                <Label className="text-base">Item Description</Label>
                <Textarea className="h-30" />
              </div>
              <div className="grid w-full">
                <Label className="text-md font-medium">Category</Label>
                <Select>
                  <SelectTrigger className="bg-white w-full border">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectGroup>
                      <SelectItem value="apple" className="hover:bg-[#e5e5e5]">
                        Apple
                      </SelectItem>
                      <SelectItem value="banana" className="hover:bg-[#e5e5e5]">
                        Banana
                      </SelectItem>
                      <SelectItem
                        value="blueberry"
                        className="hover:bg-[#e5e5e5]"
                      >
                        Blueberry
                      </SelectItem>
                      <SelectItem value="grapes" className="hover:bg-[#e5e5e5]">
                        Grapes
                      </SelectItem>
                      <SelectItem
                        value="pineapple"
                        className="hover:bg-[#e5e5e5]"
                      >
                        Pineapple
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
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
                        color: "#0F1E7A", 
                        "& .MuiSlider-thumb": {
                          backgroundColor: "#0F1E7A",
                          border: "2px solid white",
                        },
                        "& .MuiSlider-track": {
                          backgroundColor: "#0F1E7A", 
                        },
                        "& .MuiSlider-rail": {
                          backgroundColor: "#e5e5e5", 
                        },
                        "& .MuiSlider-mark": {
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          backgroundColor: "#e5e5e5",
                          border: "1px solid black",
                        },
                        "& .MuiSlider-markActive": {
                          backgroundColor: "#0F1E7A", 
                          borderColor: "#0F1E7A",
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
                <Label className="text-base">Justification</Label>
                <Input className="border" />
              </div>
              <div className="grid w-full items-center">
                <Label htmlFor="attachment" className="text-md font-normal">
                  Attach Image
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
              <div className="grid">
                <Label className="text-base">Units</Label>
                <Input className="border" />
              </div>
              <div className="grid w-full items-center">
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
              <div className="grid w-full">
                <Label htmlFor="date" className="text-base">
                  Preferred Date Needed
                </Label>
                <div className="w-full">
                  <div className="relative w-full">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="date"
                          className="w-full bg-white justify-between font-normal"
                        >
                          {date ? date.toLocaleDateString() : "05/31/2025"}
                          <Calendar1 />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-full overflow-hidden p-0 bg-white"
                      >
                        <Calendar
                          mode="single"
                          selected={date}
                          className="bg-white"
                          captionLayout="dropdown"
                          onSelect={(date) => {
                            setDate(date);
                            setOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-center">
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
                      <Button
                        variant="outline"
                        className="text-base text-[#0F1E7A] border-1 border-[#0F1E7A] font-medium hover:bg-[#0F1E7A26]"
                      >
                        View Request
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="border-1 border-[#DE1216] text-base text-[#DE1216]">
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[400px] h-[350px] bg-white">
                          <DialogHeader>
                            <DialogTitle className="text-2xl text-center mt-3 font-medium">
                            Cancel Request
                            </DialogTitle>
                            <DialogDescription className="mt-2">
                              <div className="flex flex-col items-center gap-4">
                                <p className="text-sm font-medium">
                                Are you sure you want to delete this request?
                                </p>
                                <div className="flex items-center justify-center">
                                  <div className="relative w-[80px] h-[80px]">
                                    <Image src="/stop.png" alt="stop" fill />
                                  </div>
                                </div>
                              </div>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="w-full flex flex-col gap-4">
                            <Link href={"/"}>
                            <Button
                              variant="outline"
                              className="border-1 border-[#DE1216] text-base text-[#DE1216]"
                            >
                              Yes
                            </Button>
                            </Link>
                            <DialogClose asChild className="w-full">
                              <Button className="w-full text-base text-[#0F1E7A] border-1 border-[#0F1E7A] font-medium hover:bg-[#0F1E7A26]">
                                No
                              </Button>
                            </DialogClose>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </DialogContent>
                </Dialog>
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

export default NewRequest;
