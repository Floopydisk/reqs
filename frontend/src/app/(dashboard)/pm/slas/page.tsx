"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, Eye, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { SLA, slaService } from "@/services/slaService";
import SLAsFormDialog from "@/components/pm/SLAsFormDialog";

export default function SLAsManagementPage() {
  const [slas, setSlas] = useState<SLA[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [currentSLA, setCurrentSLA] = useState<SLA>({
    title: "",
    content: "",
  });

  const fetchSLAs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await slaService.fetchSLAs();
      setSlas(data);
    } catch (error) {
      console.error("Failed to fetch SLAs:", error);
      toast.error("Failed to load SLA templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSLAs();
  }, [fetchSLAs]);

  const handleSLAFormChange = (field: "title" | "content", value: string) => {
    setCurrentSLA((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateSLA = async () => {
    if (!currentSLA.title.trim() || !currentSLA.content.trim()) {
      toast.error("Title and Content are required");
      return;
    }
    try {
      setIsSubmitting(true);
      const created = await slaService.createSLA({
        title: currentSLA.title.trim(),
        content: currentSLA.content.trim(),
      });
      setSlas((prev) => [created, ...prev]);
      toast.success("SLA template created successfully");
      setCurrentSLA({ title: "", content: "" });
    } catch (error) {
      console.error("Create SLA error:", error);
      toast.error("Failed to create SLA template");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSLA = async (slaId?: string) => {
    const id = slaId || currentSLA._id || currentSLA.id;
    if (!id) return;
    if (!currentSLA.title.trim() || !currentSLA.content.trim()) {
      toast.error("Title and Content are required");
      return;
    }
    try {
      setIsSubmitting(true);
      const updated = await slaService.updateSLA(id, {
        title: currentSLA.title.trim(),
        content: currentSLA.content.trim(),
      });
      setSlas((prev) =>
        prev.map((s) => ((s._id || s.id) === id ? { ...s, ...updated } : s)),
      );
      toast.success("SLA template updated successfully");
      setCurrentSLA({ title: "", content: "" });
    } catch (error) {
      console.error("Update SLA error:", error);
      toast.error("Failed to update SLA template");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSLA = async (slaId?: string) => {
    const id = slaId || currentSLA._id || currentSLA.id;
    if (!id) return;
    try {
      setIsSubmitting(true);
      await slaService.deleteSLA(id);
      setSlas((prev) => prev.filter((s) => (s._id || s.id) !== id));
      toast.success("SLA template deleted successfully");
      setCurrentSLA({ title: "", content: "" });
    } catch (error) {
      console.error("Delete SLA error:", error);
      toast.error("Failed to delete SLA template");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSLAs = slas.filter(
    (sla) =>
      sla.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sla.content?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F1E7A]">
              Service Level Agreements (SLAs)
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage predefined SLA templates for Purchase Order generation
            </p>
          </div>

          <SLAsFormDialog
            mode="create"
            currentSLA={currentSLA}
            handleSLAFormChange={handleSLAFormChange}
            submit={handleCreateSLA}
            isLoading={isSubmitting}
          >
            <Button
              onClick={() => setCurrentSLA({ title: "", content: "" })}
              className="bg-[#0F1E7A] hover:bg-[#0a1555] text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add SLA Template
            </Button>
          </SLAsFormDialog>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SLA templates by title or content..."
              className="pl-10 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* SLAs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F1E7A] mb-3"></div>
              <span>Loading SLA templates...</span>
            </div>
          ) : filteredSLAs.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              {searchQuery
                ? "No SLA templates match your search."
                : "No predefined SLA templates found. Click 'Add SLA Template' to create one."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-16 font-semibold">S/N</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Title</TableHead>
                    <TableHead className="font-semibold min-w-[320px]">Content Preview</TableHead>
                    <TableHead className="font-semibold w-40 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSLAs.map((sla, idx) => {
                    const id = sla._id || sla.id || String(idx);
                    return (
                      <TableRow key={id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-gray-500">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {sla.title}
                        </TableCell>
                        <TableCell className="text-gray-600 line-clamp-2 max-w-md">
                          {sla.content}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View */}
                            <SLAsFormDialog
                              mode="view"
                              currentSLA={sla}
                              handleSLAFormChange={() => {}}
                              isLoading={false}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-600 hover:text-blue-900"
                                title="View SLA"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </SLAsFormDialog>

                            {/* Edit */}
                            <SLAsFormDialog
                              mode="edit"
                              currentSLA={currentSLA}
                              handleSLAFormChange={handleSLAFormChange}
                              submit={handleUpdateSLA}
                              isLoading={isSubmitting}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-600 hover:text-green-600"
                                title="Edit SLA"
                                onClick={() =>
                                  setCurrentSLA({
                                    _id: sla._id,
                                    id: sla.id,
                                    title: sla.title,
                                    content: sla.content,
                                  })
                                }
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </SLAsFormDialog>

                            {/* Delete */}
                            <SLAsFormDialog
                              mode="delete"
                              currentSLA={currentSLA}
                              handleSLAFormChange={() => {}}
                              submit={handleDeleteSLA}
                              isLoading={isSubmitting}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-600 hover:text-red-600"
                                title="Delete SLA"
                                onClick={() =>
                                  setCurrentSLA({
                                    _id: sla._id,
                                    id: sla.id,
                                    title: sla.title,
                                    content: sla.content,
                                  })
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </SLAsFormDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
