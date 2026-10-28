// Warehouse Manager PO detail — reuses the shared PurchaseOrderDetails component.
// The component detects the wm role via authData.user.role === "warehouseManager"
// and surfaces the Generate GRN button when the PO is approved.
import PurchaseOrderDetails from "@/components/pm/PurchaseOrderDetails";

export default function WMViewPO() {
  return <PurchaseOrderDetails />;
}
