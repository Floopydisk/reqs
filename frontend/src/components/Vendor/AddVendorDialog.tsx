"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, X, Loader2, CalendarIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { parseDate } from "@/lib/parseDate";
import { Calendar } from "@/components/ui/calendar";

interface VendorData {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

interface AddVendorDialogProps {
  onVendorAdded: (vendor?: VendorData) => void;
  trigger: React.ReactNode;
}

export default function AddVendorDialog({ onVendorAdded, trigger }: AddVendorDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{_id: string; name: string}[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [openStart, setOpenStart] = useState(false);
  const [mydateStart, setMydateStart] = useState("");
  const [monthStart, setMonthStart] = useState<Date | undefined>(undefined);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({ name: "", description: "" });
  const [addingCategory, setAddingCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    contactPersonDesignation: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    dateOfIncorporation: "",
    categories: [] as string[]
  });

  const token = getToken();

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendor-categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, [token]);

  const handleAddCategory = async () => {
    if (!newCategoryData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setAddingCategory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vendor-categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newCategoryData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Category added successfully");
        setNewCategoryDialog(false);
        setNewCategoryData({ name: "", description: "" });
        fetchCategories();
      } else {
        toast.error(data.message || "Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSubmit = async () => {
    const errors = [];
    if (!formData.name) errors.push('name');
    if (!formData.contactPerson) errors.push('contactPerson');
    if (!formData.contactPersonDesignation) errors.push('contactPersonDesignation');
    if (!formData.email) errors.push('email');
    if (!formData.phone) errors.push('phone');
    if (!formData.address) errors.push('address');
    // F1: Date of incorporation made optional — comment out required check
    // if (!formData.dateOfIncorporation) errors.push('dateOfIncorporation');
    if (formData.categories.length === 0) errors.push('categories');
    
    if (formData.dateOfIncorporation && new Date(formData.dateOfIncorporation) > new Date()) {
      errors.push('dateOfIncorporation');
      toast.error("Date of incorporation cannot be in the future");
    }
    
    setValidationErrors(errors);
    if (errors.length > 0) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/vendors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Vendor added successfully");
        setIsDialogOpen(false);
        setFormData({
          name: "",
          contactPerson: "",
          contactPersonDesignation: "",
          email: "",
          phone: "",
          address: "",
          website: "",
          dateOfIncorporation: "",
          categories: []
        });
        setMydateStart("");
        setValidationErrors([]);
        onVendorAdded(data.data);
      } else {
        toast.error(data.message || "Failed to add vendor");
      }
    } catch (error) {
      console.error("Error adding vendor:", error);
      toast.error("Failed to add vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isDialogOpen) {
      fetchCategories();
    }
  }, [isDialogOpen, fetchCategories]);

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className="bg-white w-full sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex justify-center items-center">
              <p className="text-xl font-semibold text-center text-[#100A1A]">
                New Vendor
              </p>
            </div>
            <div className="flex justify-center items-center">
              <p className="text-md text-center font-normal">
                Enter the details of vendor below
              </p>
            </div>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1">
            <div className="flex flex-col gap-3">
              <div className="space-y-2">
                <Label>Company Name <span className="text-red-500 -ml-1">*</span></Label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                  className={`!p-4 rounded-xl border shadow-sm ${validationErrors.includes('name') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person <span className="text-red-500 -ml-1">*</span></Label>
                <Input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData(prev => ({...prev, contactPerson: e.target.value}))}
                  className={`!p-4 rounded-xl border shadow-sm ${validationErrors.includes('contactPerson') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person Designation <span className="text-red-500 -ml-1">*</span></Label>
                <Input
                  type="text"
                  value={formData.contactPersonDesignation}
                  onChange={(e) => setFormData(prev => ({...prev, contactPersonDesignation: e.target.value}))}
                  className={`!p-4 rounded-xl border shadow-sm ${validationErrors.includes('contactPersonDesignation') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address <span className="text-red-500 -ml-1">*</span></Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  className={`!p-4 rounded-xl border shadow-sm ${validationErrors.includes('email') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number <span className="text-red-500 -ml-1">*</span></Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                  className={`!p-4 rounded-xl border shadow-sm ${validationErrors.includes('phone') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Address <span className="text-red-500 -ml-1">*</span></Label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
                  className={`!p-4 rounded-xl border shadow-sm ${validationErrors.includes('address') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({...prev, website: e.target.value}))}
                  className={`!p-4 rounded-xl border shadow-sm ${validationErrors.includes('website') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Incorporation</Label>
                <div className="relative flex gap-2">
                  <Input
                    id="date-start"
                    value={mydateStart}
                    placeholder="Select date"
                    className={`!p-4 rounded-xl border shadow-sm pr-10 ${validationErrors.includes('dateOfIncorporation') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                    onChange={(e) => {
                      setMydateStart(e.target.value);
                      const date = parseDate(e.target.value);
                      if (date) {
                        setFormData(prev => ({...prev, dateOfIncorporation: date.toISOString().split('T')[0]}));
                        setMonthStart(date);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpenStart(true);
                      }
                    }}
                  />
                  <Popover open={openStart} onOpenChange={setOpenStart}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker-start"
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                      >
                        <CalendarIcon className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden bg-white p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={formData.dateOfIncorporation ? new Date(formData.dateOfIncorporation) : undefined}
                        captionLayout="dropdown"
                        month={monthStart}
                        onMonthChange={setMonthStart}
                        disabled={(date) => date > new Date()}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({...prev, dateOfIncorporation: date.toISOString().split('T')[0]}));
                            setMydateStart(date.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }));
                          }
                          setOpenStart(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categories <span className="text-red-500 -ml-1">*</span></Label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={`w-full justify-between bg-white hover:bg-white border !p-4 rounded-xl ${validationErrors.includes('categories') ? 'border-red-500' : 'border-[#9f9f9f]'}`}
                    >
                      {formData.categories.length > 0
                        ? `${formData.categories.length} selected`
                        : "Select categories..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-white">
                    <Command>
                      <CommandInput
                        placeholder="Search or type to create..."
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList>
                        {/* F2: Inline category creation from typed text */}
                        {categorySearch.trim() &&
                          !categories.some(
                            (c) =>
                              c.name.toLowerCase() ===
                              categorySearch.trim().toLowerCase(),
                          ) && (
                            <CommandGroup>
                              <CommandItem
                                onSelect={async () => {
                                  const name = categorySearch.trim();
                                  setAddingCategory(true);
                                  try {
                                    const response = await fetch(
                                      `${API_BASE_URL}/vendor-categories`,
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${token}`,
                                        },
                                        body: JSON.stringify({ name }),
                                      },
                                    );
                                    const data = await response.json();
                                    if (data.success) {
                                      const newCat = data.data;
                                      setCategories((prev) => [...prev, newCat]);
                                      setFormData((prev) => ({
                                        ...prev,
                                        categories: [...prev.categories, newCat._id],
                                      }));
                                      setCategorySearch("");
                                      toast.success(`Category "${name}" created`);
                                    } else {
                                      toast.error(
                                        data.message || "Failed to create category",
                                      );
                                    }
                                  } catch {
                                    toast.error("Failed to create category");
                                  } finally {
                                    setAddingCategory(false);
                                  }
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Create &quot;{categorySearch.trim()}&quot;
                              </CommandItem>
                            </CommandGroup>
                          )}
                        <CommandEmpty>
                          {categorySearch.trim()
                            ? "No match — select above to create"
                            : "No categories found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {categories.map((category) => (
                            <CommandItem
                              key={category._id}
                              onSelect={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  categories: prev.categories.includes(category._id)
                                    ? prev.categories.filter(
                                        (id) => id !== category._id,
                                      )
                                    : [...prev.categories, category._id],
                                }));
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.categories.includes(category._id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {category.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.categories.map((categoryId) => {
                      const category = categories.find(c => c._id === categoryId);
                      return category ? (
                        <div key={categoryId} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {category.name}
                          <X
                            size={14}
                            className="cursor-pointer"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                categories: prev.categories.filter(id => id !== categoryId)
                              }));
                            }}
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#0F1E7A] text-white cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                  {isSubmitting ? "Adding..." : "Add Vendor"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newCategoryDialog} onOpenChange={setNewCategoryDialog}>
        <DialogContent className="bg-white w-full sm:max-w-[400px]">
          <DialogHeader>
            <h2 className="text-xl font-semibold text-center">Add New Category</h2>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name <span className="text-red-500 -ml-1">*</span></Label>
              <Input
                type="text"
                value={newCategoryData.name}
                onChange={(e) => setNewCategoryData(prev => ({...prev, name: e.target.value}))}
                className="!p-4 rounded-xl border border-[#9f9f9f] shadow-sm"
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newCategoryData.description}
                onChange={(e) => setNewCategoryData(prev => ({...prev, description: e.target.value}))}
                className="min-h-[80px] rounded-xl border border-[#9f9f9f] shadow-sm"
                placeholder="Enter category description"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAddCategory}
                disabled={addingCategory}
                className="bg-[#0F1E7A] text-white cursor-pointer flex items-center gap-2"
              >
                {addingCategory && <Loader2 className="animate-spin" size={16} />}
                {addingCategory ? "Adding..." : "Add Category"}
              </Button>
              <Button 
                onClick={() => setNewCategoryDialog(false)}
                variant="outline"
                className="border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}