import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequestData } from "../src/components/Requests/types";

interface RequestFormProps {
  formData: RequestData;
  isEditMode: boolean;
  urgency: number[];
  setUrgency: (urgency: number[]) => void;
  handleChange: (field: keyof RequestData, value: string | number) => void;
}

export default function RequestForm({
  formData,
  isEditMode,
  urgency,
  setUrgency,
  handleChange,
}: RequestFormProps) {

  return (
    <div className="view-edit flex flex-col gap-6 px-4 py-6 my-5 rounded-md shadow-md bg-white">
      <div className="space-y-2">
        <Label>Request Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          readOnly={!isEditMode}
          className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Item Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          readOnly={!isEditMode}
          className="min-h-[100px] rounded-xl border border-[#9f9f9f] shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        {isEditMode ? (
          <Select
            value={formData.category}
            onValueChange={(value) => handleChange("category", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={formData.category}
            readOnly
            className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Urgency</Label>
        <div className="p-3 rounded-xl border border-[#9f9f9f] shadow-sm">
          <Slider
            min={0}
            max={2}
            step={1}
            value={urgency}
            onValueChange={isEditMode ? setUrgency : undefined}
            disabled={!isEditMode}
            className="my-2 [&>span:first-child]:h-2 [&>span:first-child]:bg-gray-200"
          />
          <div className="flex justify-between text-sm text-gray-700">
            <span
              className={urgency[0] === 0 ? "font-semibold text-[#0d1b5e]" : ""}
            >
              Low
            </span>
            <span
              className={urgency[0] === 1 ? "font-semibold text-[#0d1b5e]" : ""}
            >
              Medium
            </span>
            <span
              className={urgency[0] === 2 ? "font-semibold text-[#0d1b5e]" : ""}
            >
              High
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Justification</Label>
        <Textarea
          value={formData.justification}
          onChange={(e) => handleChange("justification", e.target.value)}
          readOnly={!isEditMode}
          className="min-h-[120px] rounded-xl border border-[#9f9f9f] shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Attach Image</Label>
        <div className="flex items-center gap-2 border border-[#9f9f9f] p-3 rounded-xl shadow-sm py-2">
          <Upload className="h-5 w-5 text-gray-500" />
          <Input
            type="file"
            accept=".png,.jpg,.jpeg"
            disabled={!isEditMode}
            className="border-none shadow-none focus-visible:ring-0 p-0 text-sm"
          />
        </div>
        <p className="text-xs text-gray-500">
          Upload image most preferably in PNG, JPEG format.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Units</Label>
        <Input
          type="number"
          value={formData.quantityNeeded}
          onChange={(e) =>
            handleChange("quantityNeeded", parseInt(e.target.value))
          }
          readOnly={!isEditMode}
          className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Unit Price (₦)</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.estimatedUnitPrice}
          onChange={(e) =>
            handleChange("estimatedUnitPrice", parseFloat(e.target.value))
          }
          readOnly={!isEditMode}
          className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
        />
      </div>
    </div>
  );
}
