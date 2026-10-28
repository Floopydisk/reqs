"use client";

// Warehouse Manager POs list — reuses PM's PO dashboard view
import PMDashboard from "@/components/pm/PMDashboard";

export const dynamic = "force-dynamic";

export default function WMPOsPage() {
  return <PMDashboard page="pos" />;
}
