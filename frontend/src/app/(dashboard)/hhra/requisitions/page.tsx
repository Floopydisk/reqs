import HODDashboard from "@/components/hod/HODDashboard";

export default function UserPage() {
  // D3: Use hhraRequisitions page type to fetch from /requisitions (all requisitions, not department-scoped)
  return <HODDashboard page="hhraRequisitions" routePrefix="/hhra" />;
}
