"use client";

import Image from "next/image";
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BusinessCategorySelector from "@/components/BusinessCategorySelector";
import { Edit } from "lucide-react";

export default function ProfileForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    contactPerson: "",
    phone: "",
    dateOfIncorporation: "",
    password: "",
    businessCategories: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (categories: string[]) => {
    setFormData((prev) => ({
      ...prev,
      businessCategories: categories,
    }));
  };

  const handleEdit = () => {
    console.log("Form data:", formData);
  };

  const handleImageEdit = () => {
    console.log("Handle edit profile image");
  };

  return (
    <div className="bg-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-10">
      <div className="container mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--primary-color)] mb-6 sm:mb-8 uppercase">
          Profile
        </h1>

        <Card className="bg-white shadow-sm">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8">
              <div className="flex-shrink-0 flex justify-center lg:justify-start">
                <div
                  className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-gray-200 group cursor-pointer"
                  onClick={handleImageEdit}
                >
                  <Image
                    width={160}
                    height={160}
                    src="/avatar.jpg"
                    alt="Profile image"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.15)" }}
                  >
                    <Edit className="w-6 h-6 text-white drop-shadow-lg" />
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="companyName"
                    className="text-gray-600 font-normal"
                  >
                    Name of Company
                  </Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="bg-gray-100 border-0 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-600 font-normal">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-gray-100 border-0 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="contactPerson"
                    className="text-gray-600 font-normal"
                  >
                    Contact Person
                  </Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className="bg-gray-100 border-0 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-600 font-normal">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="bg-gray-100 border-0 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dateOfIncorporation"
                    className="text-gray-600 font-normal"
                  >
                    Date of Incorporation
                  </Label>
                  <Input
                    id="dateOfIncorporation"
                    name="dateOfIncorporation"
                    type="date"
                    value={formData.dateOfIncorporation}
                    onChange={handleInputChange}
                    className="bg-gray-100 border-0 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-gray-600 font-normal"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="bg-gray-100 border-0 h-12"
                  />
                </div>

                <BusinessCategorySelector
                  selectedCategories={formData.businessCategories}
                  onCategoryChange={handleCategoryChange}
                  label="Business Category"
                  page="vendorProfile"
                />

                <div className="pt-4">
                  <Button
                    onClick={handleEdit}
                    className="bg-[var(--primary-color)] hover:bg-blue-800 text-white px-8 sm:px-16 h-12 text-base w-full sm:w-auto"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
