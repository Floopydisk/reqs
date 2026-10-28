"use client";

import HHRADashboard from "@/components/hhra/HHRADashboard";

export default function HOFPurchaseOrdersPage() {
  return <HHRADashboard page="pos" routePrefix="/hof" approvalType="hof" />;
}
