"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export interface AdvancedSearchFilters {
  searchQuery: string;
  category: string;
  dateRange: string;
}

interface SearchModalProps {
  trigger: React.ReactNode;
  onSearch?: (filters: AdvancedSearchFilters) => void;
}

export default function AdvancedSearchModal({ trigger, onSearch }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState(""); // This is the main search term inside the modal
  const [category, setCategory] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [open, setOpen] = useState(false);

  const handleSearch = () => {
    if (onSearch) {
      onSearch({ searchQuery, category, dateRange });
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setSearchQuery("");
    setCategory("");
    setDateRange("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="flex flex-col w-[90vw] max-w-[1000px] bg-[#F3F3F3] p-10 border-none gap-6">
        <div className="flex gap-4 py-4">
          <div className="relative w-[100%]">
            <Input
              type="text"
              placeholder="Search Item"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#FFFFFF] pl-4 pr-4 py-2 w-full h-12 rounded-md shadow-md"
            />
            <Search
              color="black"
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
          <Button 
            onClick={handleSearch}
            className="h-12 px-6 py-4 bg-[#0F1E7A] text-md text-white cursor-pointer capitalize"
          >
            Search
          </Button>
        </div>
        
        <div className="flex flex-col gap-1">
          <Label className="text-md font-normal">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-[#FFFFFF] w-[250px] border-white">
              <SelectValue
                className="text-[#767676] text-md font-light"
                placeholder="Select Category"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="service">Service</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-md font-normal">Select Date</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="bg-[#FFFFFF] w-[250px] border-white">
                <SelectValue
                  className="text-[#767676] text-md font-light"
                  placeholder="Custom Date"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end gap-4">
          <Button 
            onClick={handleCancel}
            className="text-md font-medium border border-[#000]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSearch}
            className="bg-[#0F1E7A] text-md text-white font-medium"
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}