"use client";

import { useState, useEffect, useRef } from "react";
import { BadgeCheck, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GRNPOItem {
  _id?: string;
  itemDescription: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
}

export interface GRNExistingDelivery {
  itemId: string;
  deliveredQty: number;
}

export interface GRNExistingRecord {
  items: GRNExistingDelivery[];
}

export interface GRNPayload {
  items: Array<{
    itemId: string;
    description: string;
    brand: string;
    orderedQty: number;
    deliveredQty: number;
    orderedPrice: number;
    deliveredPrice: number;
  }>;
  receivingEmployee: string;
  remarks: string;
}

export interface GRNSubmitResult {
  grnNumber: string;
  receivingEmployee: string;
  submittedDate: string;
  totalDeliveredQty: number;
}

interface GenerateGRNDialogProps {
  isOpen: boolean;
  onClose: () => void;
  poNumber: string;
  items: GRNPOItem[];
  existingGRNs?: GRNExistingRecord[];
  // TODO: wire to POST /purchase-orders/:id/grn when endpoint is ready
  onSubmit: (payload: GRNPayload) => Promise<GRNSubmitResult>;
  // TODO: wire to GET /users?search= when endpoint is ready
  onSearchEmployees?: (query: string) => Promise<string[]>;
}

// ─── Internal row type ────────────────────────────────────────────────────────

interface DeliveryRow {
  itemId: string;
  description: string;
  brand: string;
  orderedQty: number;
  previouslyDelivered: number;
  remainingQty: number;
  fullyDelivered: boolean;
  selected: boolean;
  deliveredQty: string;
  orderedPrice: number;
  deliveredPrice: string;
}

type Step = 1 | 2 | 3 | 4; // 4 = success screen

const STEPS = [
  { id: 1, label: "Delivery Details" },
  { id: 2, label: "Receiver Details" },
  { id: 3, label: "Review Details" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenerateGRNDialog({
  isOpen,
  onClose,
  poNumber,
  items,
  existingGRNs = [],
  onSubmit,
  onSearchEmployees,
}: GenerateGRNDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [receivingEmployee, setReceivingEmployee] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GRNSubmitResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Initialise rows each time the dialog opens
  useEffect(() => {
    if (!isOpen) return;

    const prevMap: Record<string, number> = {};
    existingGRNs.forEach((grn) => {
      grn.items.forEach((d) => {
        prevMap[d.itemId] = (prevMap[d.itemId] ?? 0) + d.deliveredQty;
      });
    });

    setRows(
      items.map((item) => {
        const itemId = item._id ?? item.itemDescription;
        const previouslyDelivered = prevMap[itemId] ?? 0;
        const remainingQty = Math.max(0, item.quantity - previouslyDelivered);
        return {
          itemId,
          description: item.itemDescription,
          brand: item.brand ?? "",
          orderedQty: item.quantity,
          previouslyDelivered,
          remainingQty,
          fullyDelivered: remainingQty <= 0,
          selected: false,
          deliveredQty: "",
          orderedPrice: item.unitPrice,
          deliveredPrice: "",
        };
      }),
    );

    setStep(1);
    setReceivingEmployee("");
    setEmployeeQuery("");
    setRemarks("");
    setResult(null);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced employee search
  useEffect(() => {
    if (!employeeQuery.trim() || !onSearchEmployees) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const t = setTimeout(async () => {
      const res = await onSearchEmployees(employeeQuery);
      setSuggestions(res);
      setShowSuggestions(res.length > 0);
    }, 300);
    return () => clearTimeout(t);
  }, [employeeQuery, onSearchEmployees]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const selectableRows = rows.filter((r) => !r.fullyDelivered);
  const allSelected =
    selectableRows.length > 0 && selectableRows.every((r) => r.selected);
  const selectedRows = rows.filter(
    (r) => r.selected && parseInt(r.deliveredQty) > 0,
  );
  const step1Valid = selectedRows.length > 0;
  const step2Valid =
    receivingEmployee.trim() !== "" && remarks.trim() !== "";

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const toggleAll = () => {
    const next = !allSelected;
    setRows((prev) =>
      prev.map((r) => (r.fullyDelivered ? r : { ...r, selected: next })),
    );
  };

  const toggleRow = (itemId: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.itemId === itemId ? { ...r, selected: !r.selected } : r,
      ),
    );

  const updateRow = (
    itemId: string,
    field: "deliveredQty" | "deliveredPrice",
    value: string,
  ) =>
    setRows((prev) =>
      prev.map((r) => (r.itemId === itemId ? { ...r, [field]: value } : r)),
    );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: GRNPayload = {
        items: selectedRows.map((r) => ({
          itemId: r.itemId,
          description: r.description,
          brand: r.brand,
          orderedQty: r.orderedQty,
          deliveredQty: parseInt(r.deliveredQty) || 0,
          orderedPrice: r.orderedPrice,
          deliveredPrice: parseFloat(r.deliveredPrice) || 0,
        })),
        receivingEmployee,
        remarks,
      };
      const res = await onSubmit(payload);
      setResult(res);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setResult(null);
    onClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl bg-white flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold">Generate GRN</DialogTitle>
          <p className="text-sm text-gray-500">{poNumber}</p>
        </DialogHeader>

        {/* ── Stepper (hidden on success) ─────────────────────────────────── */}
        {step !== 4 && (
          <div className="flex items-center flex-shrink-0 mb-1">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      step >= s.id
                        ? "bg-[#0F1E7A] text-white"
                        : "border-2 border-gray-300 text-gray-400"
                    }`}
                  >
                    {s.id}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      step === s.id ? "text-[#0F1E7A] font-semibold" : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-3 ${
                      step > s.id ? "bg-[#0F1E7A]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 1: Delivery Details ────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-shrink-0 mb-3">
              <h3 className="text-base font-semibold">What was delivered?</h3>
              <p className="text-sm text-gray-500">
                Choose the items you received and enter the necessary details.
              </p>
            </div>

            <div className="overflow-auto flex-1 border border-gray-200 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10 py-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="text-xs py-2">Description</TableHead>
                    <TableHead className="text-xs py-2">Brand</TableHead>
                    <TableHead className="text-xs py-2 text-center">Ordered Qty</TableHead>
                    <TableHead className="text-xs py-2 text-center">Delivered Qty</TableHead>
                    <TableHead className="text-xs py-2 text-center">Ordered Price</TableHead>
                    <TableHead className="text-xs py-2 text-center">Delivered Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.itemId}
                      className={row.fullyDelivered ? "opacity-50 bg-gray-50" : ""}
                    >
                      <TableCell className="py-2">
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() =>
                            !row.fullyDelivered && toggleRow(row.itemId)
                          }
                          disabled={row.fullyDelivered}
                        />
                      </TableCell>
                      <TableCell
                        className={`text-sm py-2 ${
                          row.fullyDelivered
                            ? "line-through text-gray-400"
                            : ""
                        }`}
                      >
                        {row.description}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 py-2">
                        {row.brand || "—"}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-sm">{row.orderedQty}</span>
                        {row.previouslyDelivered > 0 && row.remainingQty > 0 && (
                          <span className="block text-xs text-red-500 font-medium leading-tight">
                            {row.remainingQty} left*
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1 justify-center">
                          <Input
                            type="number"
                            min={0}
                            max={row.remainingQty || row.orderedQty}
                            value={row.deliveredQty}
                            onChange={(e) =>
                              updateRow(row.itemId, "deliveredQty", e.target.value)
                            }
                            disabled={!row.selected || row.fullyDelivered}
                            placeholder="0"
                            className="w-16 h-7 text-center text-sm p-1 bg-gray-50 disabled:opacity-40"
                          />
                          <Pencil className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-center py-2">
                        ₦{row.orderedPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1 justify-center">
                          <span className="text-sm text-gray-500">₦</span>
                          <Input
                            type="number"
                            min={0}
                            value={row.deliveredPrice}
                            onChange={(e) =>
                              updateRow(row.itemId, "deliveredPrice", e.target.value)
                            }
                            disabled={!row.selected || row.fullyDelivered}
                            placeholder="0"
                            className="w-20 h-7 text-sm p-1 bg-gray-50 disabled:opacity-40"
                          />
                          <Pencil className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pt-4 border-t mt-3 flex-shrink-0">
              <Button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="bg-[#0F1E7A] hover:bg-[#0a1555] text-white disabled:opacity-40"
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Receiver Details ────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-5 flex-1 overflow-auto">
            <div>
              <h3 className="text-base font-semibold">Who received the items?</h3>
              <p className="text-sm text-gray-500">
                Choose who received the items and add any relevant remarks.
              </p>
            </div>

            <div className="space-y-2" ref={searchRef}>
              <label className="text-sm font-medium text-gray-700">
                Receiving employee
              </label>
              <div className="relative">
                <Input
                  value={employeeQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmployeeQuery(val);
                    setReceivingEmployee("");
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Search employee name..."
                  className="bg-white"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                    {suggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                        onMouseDown={() => {
                          setReceivingEmployee(name);
                          setEmployeeQuery(name);
                          setShowSuggestions(false);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Remarks</label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add a note about this delivery..."
                className="min-h-[120px] bg-white resize-none"
              />
            </div>

            <div className="flex justify-between pt-4 border-t mt-auto flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-gray-300"
              >
                ← Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!step2Valid}
                className="bg-[#0F1E7A] hover:bg-[#0a1555] text-white disabled:opacity-40"
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review Details ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-4 flex-1 overflow-auto">
            <div>
              <h3 className="text-base font-semibold">Review delivery</h3>
              <p className="text-sm text-gray-500">
                Confirm that the details are correct before submitting.
              </p>
            </div>

            {/* Delivery Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Delivery Details</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="h-7 text-xs border-gray-300"
                >
                  Update Details
                </Button>
              </div>
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs py-2">Description</TableHead>
                      <TableHead className="text-xs py-2">Brand</TableHead>
                      <TableHead className="text-xs py-2 text-center font-semibold">
                        Ordered Qty
                      </TableHead>
                      <TableHead className="text-xs py-2 text-center">Delivered Qty</TableHead>
                      <TableHead className="text-xs py-2 text-center">Ordered Price</TableHead>
                      <TableHead className="text-xs py-2 text-center">Delivered Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRows.map((row) => (
                      <TableRow key={row.itemId}>
                        <TableCell className="text-sm py-2">{row.description}</TableCell>
                        <TableCell className="text-sm text-gray-500 py-2">
                          {row.brand || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-center font-semibold py-2">
                          {row.orderedQty}
                        </TableCell>
                        <TableCell className="text-sm text-center py-2">
                          {parseInt(row.deliveredQty) || 0}
                        </TableCell>
                        <TableCell className="text-sm text-center py-2">
                          ₦{row.orderedPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-center py-2">
                          ₦{(parseFloat(row.deliveredPrice) || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Receiver Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Receiver Details</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(2)}
                  className="h-7 text-xs border-gray-300"
                >
                  Update Details
                </Button>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Receiving employee</p>
                  <p className="text-sm bg-white border border-gray-200 rounded px-3 py-2">
                    {receivingEmployee}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Remarks</p>
                  <p className="text-sm bg-white border border-gray-200 rounded px-3 py-2 whitespace-pre-wrap">
                    {remarks}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#0F1E7A] hover:bg-[#0a1555] text-white py-3 font-semibold uppercase tracking-wide"
              >
                {submitting ? "Submitting..." : "Received Delivery"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ─────────────────────────────────────────────── */}
        {step === 4 && result && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-[#0F1E7A] flex items-center justify-center">
              <BadgeCheck className="w-9 h-9 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-1">GRN submitted successfully</h3>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{result.grnNumber}</span>{" "}
                has been submitted and is awaiting confirmation from{" "}
                <span className="font-semibold text-gray-700">{result.receivingEmployee}</span>.
              </p>
            </div>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                <Clock className="w-4 h-4" />
                <span>Awaiting Confirmation</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Receiving employee</p>
                  <p className="font-medium">{result.receivingEmployee}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Submitted Date</p>
                  <p className="font-medium">{result.submittedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Delivered Qty</p>
                  <p className="font-medium">{result.totalDeliveredQty} items</p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleClose}
              className="w-full bg-[#0F1E7A] hover:bg-[#0a1555] text-white font-semibold uppercase tracking-wide"
            >
              Back to Purchase Order
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
