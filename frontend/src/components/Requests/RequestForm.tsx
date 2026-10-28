"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getToken, getAuthData } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@mui/material";
import { cn } from "@/lib/utils";
// import page from "@/app/(dashboard)/pm/generate-rfq/page";

interface RequestFormProps<
  T extends { title: string; justification: string; deliveryLocation: string }
> {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  urgency: number[];
  setUrgency: React.Dispatch<React.SetStateAction<number[]>>;
  dateStart: Date | undefined;
  setDateStart: React.Dispatch<React.SetStateAction<Date | undefined>>;
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  isEditMode?: boolean;
  isCreating?: boolean;
  departmentId?: string;
  departments?: { _id: string; name: string }[];
  departmentsLoading?: boolean;
  onDepartmentChange?: (departmentId: string) => void;
  /** When viewing an existing request, pass the request's own department name to
   *  override the logged-in user's department (which would be wrong for cross-dept viewers). */
  overrideDepartmentName?: string;
}

interface Location {
  _id: string;
  name: string;
  address?: string;
}

function formatDate(date: Date | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const marks = [{ value: 0 }, { value: 1 }, { value: 2 }];

export default function RequestForm<
  T extends { title: string; justification: string; deliveryLocation: string }
>({
  formData,
  setFormData,
  urgency,
  setUrgency,
  dateStart,
  setDateStart,
  handleSubmit,
  loading,
  isEditMode = true,
  isCreating = false,
  departmentId = "",
  departments = [],
  departmentsLoading = false,
  onDepartmentChange,
  overrideDepartmentName,
}: RequestFormProps<T>) {
  const [openStart, setOpenStart] = useState(false);
  const [monthStart, setMonthStart] = useState<Date | undefined>(dateStart);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const authData = getAuthData();
  const authDeptName = authData?.user?.department?.name as string | undefined;
  // Prefer the request's own department (when viewing); fall back to auth user's dept (when creating)
  const departmentName = overrideDepartmentName ?? authDeptName;

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/locations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        const locationList = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.locations)
              ? data.locations
              : [];
        setLocations(locationList);
      } catch (error) {
        console.error("Failed to fetch locations", error);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-white space-y-5 border-2 border-[#e5e5e5e5] shadow-xl p-5 rounded-xl"
    >
      {/* A3: Requisitioning department — auto-populated from auth, read-only */}
      {departmentName && (
        <div className="space-y-2 mb-6">
          <Label>Requisitioning Department</Label>
          <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-default select-none">
            {departmentName}
          </div>
        </div>
      )}
      {!departmentName && onDepartmentChange && (
        <div className="space-y-2 mb-6">
          <Label>
            Requisitioning Department <span className="compulsory-field">*</span>
          </Label>
          <Select
            value={departmentId}
            onValueChange={onDepartmentChange}
            disabled={departmentsLoading || !isEditMode}
            required
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue
                placeholder={
                  departmentsLoading ? "Loading..." : "Select Department"
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {departments.map((department) => (
                <SelectItem
                  key={department._id}
                  value={department._id}
                  className="data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white focus:bg-[#0F1E7A]/10"
                >
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2 mb-6">
        <Label>
          Request Title <span className="compulsory-field">*</span>
        </Label>
        <Input
          placeholder="Request title"
          className="bg-white"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          readOnly={!isEditMode}
          required
        />
      </div>

      {/* A1: Urgency field commented out — not collected at requisition creation stage
      <div className="space-y-2 mb-6">
        <Label>
          Urgency <span className="compulsory-field">*</span>
        </Label>
        <div className="w-full py-3 shadow-md rounded-md bg-white">
          <div className="pl-3 pr-6">
            <Slider
              max={2}
              step={1}
              marks={marks}
              value={Array.isArray(urgency) ? urgency[0] : urgency}
              disabled={!isEditMode}
              onChange={(e, val) =>
                setUrgency(Array.isArray(val) ? val : [val])
              }
              sx={{
                color: "#0F1E7A",
                "& .MuiSlider-thumb": {
                  backgroundColor: "#0F1E7A",
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
                  border: "1px solid #e5e5e5",
                },
              }}
            />
          </div>
          <div className="flex justify-between items-center px-2">
            <p className="font-normal">Low</p>
            <p className="pl-3 text-center font-normal">Medium</p>
            <p className="font-normal">High</p>
          </div>
        </div>
      </div>
      */}

      <div className="space-y-2 mb-6">
        <Label>
          Justification <span className="compulsory-field">*</span>
        </Label>
        <Textarea
          placeholder="Justification"
          className="min-h-[100px] bg-white"
          value={formData.justification}
          onChange={(e) =>
            setFormData({ ...formData, justification: e.target.value })
          }
          readOnly={!isEditMode}
          required
        />
      </div>

      <div className="space-y-2 mb-6">
        <Label>
          Delivery Location <span className="compulsory-field">*</span>
        </Label>
        <Select
          // className="w-full"
          value={formData.deliveryLocation}
          onValueChange={(value) =>
            setFormData({ ...formData, deliveryLocation: value })
          }
          disabled={!isEditMode || locationsLoading}
          required
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue
              placeholder={locationsLoading ? "Loading..." : "Select Location"}
            />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {locations.map((location) => (
              <SelectItem
                key={location._id}
                value={location._id}
                className="hover:bg-gray-100 data-[state=checked]:bg-[#0F1E7A] data-[state=checked]:text-white"
              >
                {location.name.charAt(0).toUpperCase() + location.name.slice(1)}
                {location.address ? ` — ${location.address}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label>
          Preferred Delivery Date <span className="compulsory-field">*</span>
        </Label>
        <Popover open={openStart} onOpenChange={isEditMode ? setOpenStart : undefined}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={!isEditMode}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateStart && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              {dateStart ? formatDate(dateStart) : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden bg-white p-0" align="start">
            <Calendar
              mode="single"
              selected={dateStart}
              captionLayout="dropdown"
              month={monthStart}
              onMonthChange={setMonthStart}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              onSelect={(date) => {
                setDateStart(date);
                if (date) setMonthStart(date);
                setOpenStart(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {isCreating && (
        <div className="w-full flex items-center gap-4 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#0d1b5e] hover:bg-[#0b154b] text-white rounded-lg text-base p-6"
          >
            {loading ? "Creating..." : "Proceed"}
          </Button>
          {/* <Button
            type="submit"
            disabled={loading}
            className="text-[#0d1b5e] border border-[#0b154b] bg-white rounded-lg text-base p-6"
          >
            Cancel
          </Button> */}
        </div>
      )}
    </form>
  );
}
