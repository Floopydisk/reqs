"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CalendarIcon,
  Upload,
  Loader2,
  ChevronDown,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BusinessCategorySelector from "@/components/BusinessCategorySelector";

export default function SignupForm() {
  const router = useRouter();

  const [date, setDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    company: "",
    contact: "",
    designation: "",
    address: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    website: "",
    category: [] as string[],
    cac: null as File | null,
  });

  const handleCategoryChange = (categories: string[]) => {
    setFormData((prev) => ({
      ...prev,
      category: categories,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const getPasswordBorderColor = () => {
    if (!formData.password) return "border-[#121212]";

    const isValidLength = formData.password.length >= 6;
    const passwordsMatch = formData.password === formData.confirmPassword;

    if (formData.confirmPassword) {
      // Both fields have values - check length and match
      return isValidLength && passwordsMatch
        ? "!border-green-500"
        : "!border-red-500";
    } else {
      // Only password field has value - check length only
      return isValidLength ? "!border-green-500" : "!border-red-500";
    }
  };

  const getConfirmPasswordBorderColor = () => {
    if (!formData.confirmPassword) return "border-[#121212]";

    const isValidLength = formData.password.length >= 6;
    const passwordsMatch = formData.password === formData.confirmPassword;

    return isValidLength && passwordsMatch
      ? "!border-green-500"
      : "!border-red-500";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, cac: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (formData.category.length === 0) {
      toast.error("Please select at least one business category.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.company,
        contactPerson: formData.contact,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        categories: formData.category,
        // unused - these fields are collected but not sent to API
        designation: formData.designation, // unused
        website: formData.website, // unused
        confirmPassword: formData.confirmPassword, // unused
        dateOfIncorporation: date?.toISOString(), // unused
        cac: formData.cac, // unused
      };

      const res = await fetch(`${API_BASE_URL}/auth/vendor/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: payload.name,
          contactPerson: payload.contactPerson,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          password: payload.password,
          // categories: payload.categories,
          categories: ["68e8f9e2422236a67ce0cc33"],
        }),
      });

      let data;
      const contentType = res.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // Handle HTML error responses
        const htmlText = await res.text();
        const errorMatch = htmlText.match(/Error: ([^<]+)/);
        data = { message: errorMatch ? errorMatch[1] : "An error occurred" };
      }

      if (!res.ok) {
        if (data.errors && Object.keys(data.errors).length > 0) {
          // Show specific validation errors
          Object.values(data.errors).forEach((error) => {
            toast.error(error as string);
          });
        } else {
          toast.error(data.message || "Failed to submit form");
        }
        return;
      }

      toast.success(data.message || "Vendor registered successfully!");
      router.push("/");

      setFormData({
        company: "",
        contact: "",
        designation: "",
        address: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        website: "",
        category: [],
        cac: null,
      });
      setDate(undefined);
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="signup-form w-full max-w-4xl lg:max-w-7xl mx-auto bg-white rounded-2xl p-4 sm:p-6 md:p-8 lg:p-16 shadow-sm border border-gray-100"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
        {/* Left Column */}
        <div className="space-y-6 sm:space-y-8">
          <div>
            <Label htmlFor="company">Name of Company</Label>
            <Input
              id="company"
              placeholder="Enter full name"
              value={formData.company}
              onChange={handleChange}
              className="mt-2 border border-[#121212] rounded-lg p-3"
              required
            />
          </div>

          <div>
            <Label htmlFor="contact">Name of Contact Person</Label>
            <Input
              id="contact"
              value={formData.contact}
              onChange={handleChange}
              placeholder="Nancy"
              className="mt-2 border border-[#121212] rounded-lg p-3"
            />
          </div>

          <div>
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={handleChange}
              className="mt-2 border border-[#121212] rounded-lg p-3"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={handleChange}
              className="mt-2 border border-[#121212] rounded-lg p-3"
            />
          </div>

          <div>
            <Label htmlFor="date">Date of Incorporation</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "mt-2 w-full justify-between text-left font-normal bg-white border border-[#121212] rounded-lg",
                    !date && "text-muted-foreground"
                  )}
                >
                  {date ? format(date, "PPP") : "Select date"}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  captionLayout="dropdown"
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  modifiersClassNames={{
                    selected:
                      "!bg-[#0A1A6B] !text-white hover:!bg-[#0A1A6B] hover:!text-white",
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="cac">Upload CAC document</Label>
            <div className="relative mt-2">
              <Input
                id="cac"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpeg,.jpg,.png"
                className="cursor-pointer border border-[#121212] rounded-lg"
              />
              <Upload className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <p className="!text-xs text-gray-500 mt-1">PDF, JPEG, or PNG</p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 sm:space-y-8">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="nancy@gmail.com"
              className="mt-2 border border-[#121212] rounded-lg p-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className={`mt-2 border ${getPasswordBorderColor()} rounded-lg p-3 pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 6 characters long
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`mt-2 border ${getConfirmPasswordBorderColor()} rounded-lg p-3 pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+23480xxxxxxxx"
              value={formData.phone}
              onChange={handleChange}
              className="mt-2 border border-[#121212] rounded-lg p-3"
            />
          </div>

          <div>
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.example.com"
              value={formData.website}
              onChange={handleChange}
              className="mt-2 border border-[#121212] rounded-lg p-3"
            />
          </div>

          <div className="mt-8">
            <BusinessCategorySelector
              selectedCategories={formData.category}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        </div>
      </div>

      {/* Submit Section */}
      <div className="flex flex-col items-center mt-6 sm:mt-8">
        <Button
          type="submit"
          disabled={loading}
          className="w-full sm:w-3/4 md:w-1/2 bg-[#0A1A6B] text-white py-4 sm:py-6 rounded-lg hover:bg-[#0C248A]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Registering...
            </>
          ) : (
            "Register"
          )}
        </Button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account?{" "}
          <Link href="/" className="text-[#0A1A6B] hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </form>
  );
}
