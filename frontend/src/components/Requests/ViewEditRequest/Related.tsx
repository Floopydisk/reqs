"use client";

import { useState } from "react";
import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RelatedItem {
  _id: string;
  title: string;
  department: string;
}

export interface GRNRecord {
  _id: string;
  grnNumber: string;
  receivingEmployee: string | { firstName?: string; lastName?: string };
  status: string;
  createdAt: string;
  items: Array<{ deliveredQty: number }>;
}

export interface JCFRecord {
  _id: string;
  jcfNumber: string;
  receivingEmployee: string | { firstName?: string; lastName?: string };
  status: string;
  createdAt: string;
  items: Array<{ deliveredQty?: number }>;
}

interface RelatedTabsProps {
  requests?: RelatedItem[];
  rfqs?: RelatedItem[];
  pos?: RelatedItem[];
  grns?: GRNRecord[];
  jcfs?: JCFRecord[];
  defaultTab?: "request" | "rfq" | "po" | "grn" | "jcf";
  onViewItem: (item: RelatedItem, type: "request" | "rfq" | "po") => void;
  onDownloadGRN?: (grn: GRNRecord) => void;
  onDownloadJCF?: (jcf: JCFRecord) => void;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function employeeName(
  emp: GRNRecord["receivingEmployee"] | JCFRecord["receivingEmployee"],
): string {
  if (!emp) return "—";
  if (typeof emp === "string") return emp;
  return [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—";
}

function totalDelivered(grn: GRNRecord): number {
  return grn.items.reduce((sum, i) => sum + (i.deliveredQty ?? 0), 0);
}

export default function Related({
  requests = [],
  rfqs = [],
  pos = [],
  grns,
  jcfs,
  defaultTab,
  onViewItem,
  onDownloadGRN,
  onDownloadJCF,
}: RelatedTabsProps) {
  const hasGRNs = Array.isArray(grns);
  const hasJCFs = Array.isArray(jcfs);

  const initialTab =
    defaultTab ??
    (hasJCFs ? "jcf" : hasGRNs ? "grn" : "request");

  const [activeTab, setActiveTab] = useState<"request" | "rfq" | "po" | "grn" | "jcf">(
    initialTab as "request" | "rfq" | "po" | "grn" | "jcf",
  );

  const tabs = [
    { id: "request" as const, label: "REQUEST", data: requests },
    { id: "rfq" as const, label: "RFQs", data: rfqs },
    { id: "po" as const, label: "POs", data: pos },
    ...(hasGRNs ? [{ id: "grn" as const, label: "GRNs", data: grns }] : []),
    ...(hasJCFs ? [{ id: "jcf" as const, label: "JCFs", data: jcfs }] : []),
  ];

  const activeData =
    activeTab === "grn"
      ? (grns ?? [])
      : activeTab === "jcf"
        ? (jcfs ?? [])
        : tabs.find((t) => t.id === activeTab)?.data ?? [];

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-6">Related</h2>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-lg font-semibold transition-colors relative ${
              activeTab === tab.id
                ? "text-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0F1E7A]" />
            )}
          </button>
        ))}
      </div>

      {/* GRNs table */}
      {activeTab === "grn" && (
        <>
          {(grns ?? []).length === 0 ? (
            <div className="text-center py-12 text-gray-500">No GRNs found</div>
          ) : (
            <div className="bg-white rounded-xl overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-base font-semibold">S/N</TableHead>
                    <TableHead className="text-base font-semibold">
                      Receiving employee
                    </TableHead>
                    <TableHead className="text-base font-semibold">Status</TableHead>
                    <TableHead className="text-base font-semibold">
                      Submitted Date
                    </TableHead>
                    <TableHead className="text-base font-semibold">
                      Delivered Qty
                    </TableHead>
                    <TableHead className="text-base font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(grns ?? []).map((grn) => (
                    <TableRow key={grn._id}>
                      <TableCell className="text-base font-medium">
                        {grn.grnNumber}
                      </TableCell>
                      <TableCell className="text-base">
                        {employeeName(grn.receivingEmployee)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={grn.status} />
                      </TableCell>
                      <TableCell className="text-base">
                        {formatDate(grn.createdAt)}
                      </TableCell>
                      <TableCell className="text-base">
                        {totalDelivered(grn)} items
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => onDownloadGRN?.(grn)}
                          className="bg-[#0F1E7A] text-white hover:bg-[#0a1555] px-5 py-2 rounded-lg"
                        >
                          <Download className="w-4 h-4 mr-1.5" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* JCFs table */}
      {activeTab === "jcf" && (
        <>
          {(jcfs ?? []).length === 0 ? (
            <div className="text-center py-12 text-gray-500">No JCFs found</div>
          ) : (
            <div className="bg-white rounded-xl overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-base font-semibold">S/N</TableHead>
                    <TableHead className="text-base font-semibold">
                      Receiving employee
                    </TableHead>
                    <TableHead className="text-base font-semibold">Status</TableHead>
                    <TableHead className="text-base font-semibold">
                      Submitted Date
                    </TableHead>
                    <TableHead className="text-base font-semibold">
                      Delivered Qty
                    </TableHead>
                    <TableHead className="text-base font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(jcfs ?? []).map((jcf) => (
                    <TableRow key={jcf._id}>
                      <TableCell className="text-base font-medium">
                        {jcf.jcfNumber}
                      </TableCell>
                      <TableCell className="text-base">
                        {employeeName(jcf.receivingEmployee)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={jcf.status} />
                      </TableCell>
                      <TableCell className="text-base">
                        {formatDate(jcf.createdAt)}
                      </TableCell>
                      <TableCell className="text-base">
                        {jcf.items.length} item{jcf.items.length !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => onDownloadJCF?.(jcf)}
                          className="bg-[#0F1E7A] text-white hover:bg-[#0a1555] px-5 py-2 rounded-lg"
                        >
                          <Download className="w-4 h-4 mr-1.5" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Standard REQUEST / RFQ / PO tables */}
      {activeTab !== "grn" && activeTab !== "jcf" && (
        <>
          {activeData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No {tabs.find((t) => t.id === activeTab)?.label.toLowerCase()} found
            </div>
          ) : (
            <div className="bg-white rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-base font-semibold">
                      {activeTab === "request"
                        ? "Request Title"
                        : activeTab === "rfq"
                        ? "RFQ Title"
                        : "PO Title"}
                    </TableHead>
                    <TableHead className="text-base font-semibold">
                      Department
                    </TableHead>
                    <TableHead className="text-base font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activeData as RelatedItem[]).map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="text-base">{item.title}</TableCell>
                      <TableCell className="text-base">{item.department}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() =>
                            onViewItem(item, activeTab as "request" | "rfq" | "po")
                          }
                          className="bg-[#0F1E7A] text-white hover:bg-[#0a1555] px-8 py-2 rounded-lg"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
