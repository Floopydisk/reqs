"use client";

import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Upload, Download } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Item, WORK_TOOL_SUBCATEGORIES } from "./types";

// Template columns in order
const TEMPLATE_HEADERS = [
  "Item Description",
  "Item Type (product/service)",
  "Brand",
  "Detailed Specification",
  "Units",
  "UOM",
  "Is Personal Work Tool (yes/no)",
  "Personal Work Tool Category",
];

const VALID_ITEM_TYPES = ["product", "service"];
const VALID_WORK_TOOL = ["yes", "no"];

interface ParseError {
  row: number;
  field: string;
  message: string;
}

interface BatchItemUploadProps {
  onItemsAdded: (items: Item[]) => void;
}

function generateTemplate() {
  const exampleRow = [
    "A4 Paper",
    "product",
    "HP",
    "80gsm A4 paper, white, box of 5 reams",
    "10",
    "Reams",
    "no",
    "",
  ];
  const subCatNote = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    WORK_TOOL_SUBCATEGORIES.join(" | "),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    exampleRow,
    subCatNote,
  ]);

  // Column widths
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 28 }));

  XLSX.utils.book_append_sheet(wb, ws, "Items");
  XLSX.writeFile(wb, "requisition_items_template.xlsx");
}

function parseWorkToolSubcategory(raw: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,|;]/)
    .map((s) => s.trim())
    .filter((s) =>
      WORK_TOOL_SUBCATEGORIES.includes(
        s as (typeof WORK_TOOL_SUBCATEGORIES)[number],
      ),
    );
}

export default function BatchItemUpload({
  onItemsAdded,
}: BatchItemUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      });

      if (rows.length < 2) {
        toast.error("The file is empty or has no data rows.");
        return;
      }

      // Validate header row
      const header = rows[0].map((h) => String(h).trim());
      const missingHeaders = TEMPLATE_HEADERS.filter(
        (h) => !header.includes(h),
      );
      if (missingHeaders.length > 0) {
        toast.error(
          `File is missing columns: ${missingHeaders.join(", ")}. Please use the template.`,
        );
        return;
      }

      const colIndex = (name: string) => header.indexOf(name);

      const errors: ParseError[] = [];
      const items: Item[] = [];

      // Skip header row; also skip the note row if it has no Item Description
      const dataRows = rows.slice(1).filter((row) => {
        const name = String(row[colIndex("Item Description")] ?? "").trim();
        return name.length > 0;
      });

      if (dataRows.length === 0) {
        toast.error("No data rows found in the file.");
        return;
      }

      dataRows.forEach((row, idx) => {
        const rowNum = idx + 2; // 1-indexed, accounting for header
        const get = (col: string) => String(row[colIndex(col)] ?? "").trim();

        const itemName = get("Item Description");
        const itemType = get("Item Type (product/service)").toLowerCase();
        const preferredBrand = get("Brand");
        const itemDescription = get("Detailed Specification");
        const unitsRaw = get("Units");
        const UOM = get("UOM");
        const isWorkToolRaw = get("Is Personal Work Tool (yes/no)").toLowerCase();
        const subcategoryRaw = get("Personal Work Tool Category");

        // Required field checks
        if (!itemName)
          errors.push({
            row: rowNum,
            field: "Item Description",
            message: "Required",
          });
        if (!itemDescription)
          errors.push({
            row: rowNum,
            field: "Detailed Specification",
            message: "Required",
          });
        if (!VALID_ITEM_TYPES.includes(itemType))
          errors.push({
            row: rowNum,
            field: "Item Type",
            message: `Must be "product" or "service", got "${itemType}"`,
          });
        if (!VALID_WORK_TOOL.includes(isWorkToolRaw))
          errors.push({
            row: rowNum,
            field: "Is Personal Work Tool",
            message: `Must be "yes" or "no", got "${isWorkToolRaw}"`,
          });
        if (itemType === "product" && !unitsRaw)
          errors.push({
            row: rowNum,
            field: "Units",
            message: "Required for product items",
          });

        const isWorkTool = isWorkToolRaw === "yes";
        const workToolSubcategory = isWorkTool
          ? parseWorkToolSubcategory(subcategoryRaw)
          : [];
        if (isWorkTool && workToolSubcategory.length !== 1) {
          errors.push({
            row: rowNum,
            field: "Personal Work Tool Category",
            message: "Select exactly one valid category",
          });
        }

        if (errors.filter((e) => e.row === rowNum).length === 0) {
          const units = unitsRaw ? parseInt(unitsRaw, 10) : "";
          items.push({
            _id: `batch-${Date.now()}-${rowNum}`,
            itemName,
            itemType: itemType as "product" | "service",
            preferredBrand,
            itemDescription,
            uploadImage: null,
            units: isNaN(units as number) ? "" : units,
            UOM,
            recommendedVendor: "",
            isWorkTool,
            workToolSubcategory,
          });
        }
      });

      if (errors.length > 0) {
        const summary = errors
          .slice(0, 5)
          .map((e) => `Row ${e.row} — ${e.field}: ${e.message}`)
          .join("\n");
        toast.error(
          `${errors.length} error(s) found. Fix them and re-upload.\n\n${summary}${errors.length > 5 ? `\n…and ${errors.length - 5} more.` : ""}`,
          { duration: 8000 },
        );
        return;
      }

      onItemsAdded(items);
      toast.success(`${items.length} item(s) added from file.`);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      toast.error(
        "Failed to read the file. Ensure it is a valid .xlsx, .xls, or .csv file.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button
        type="button"
        variant="outline"
        onClick={generateTemplate}
        className="flex items-center gap-2 border-[#0F1E7A] text-[#0F1E7A] hover:bg-blue-50"
      >
        <Download size={16} />
        Download Template
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 border-[#0F1E7A] text-[#0F1E7A] hover:bg-blue-50"
      >
        <Upload size={16} />
        {uploading ? "Reading file…" : "Upload Items"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
