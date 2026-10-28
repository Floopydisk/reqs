"use client";

import { useParams } from "next/navigation";
import ViewEditVendor from "@/components/Vendor/ViewEditVendor/ViewEditVendor";

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params?.id ?? "";

  return <ViewEditVendor vendorId={vendorId} />;
}
