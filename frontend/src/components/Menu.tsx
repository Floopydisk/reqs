"use client";

import { API_BASE_URL } from "@/lib/config";
import { getUser, clearAuthCookies } from "@/lib/auth";
import {
  SquarePen,
  LayoutGrid,
  MapPin,
  User,
  Gavel,
  Package,
  FileCog,
  ShoppingCart,
  LogOut,
  LucideIcon,
  CircleDollarSign,
  FileSpreadsheet,
  Store,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";

type MenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

const menuItems: Record<string, MenuItem[]> = {
  user: [
    { icon: LayoutGrid, label: "Dashboard", href: "/user" },
    { icon: SquarePen, label: "Requisition", href: "/user/requisition" },
  ],
  vendor: [
    { icon: LayoutGrid, label: "Dashboard", href: "/vendor" },
    { icon: Gavel, label: "Bids", href: "/vendor/bids" },
    { icon: User, label: "Profile", href: "/vendor/profile" },
  ],
  hod: [
    { icon: LayoutGrid, label: "Dashboard", href: "/hod" },
    { icon: FileCog, label: "Requisitions", href: "/hod/requisitions" },
    { icon: Package, label: "My Requests", href: "/hod/my-requests" },
  ],
  hof: [
    { icon: LayoutGrid, label: "Dashboard", href: "/hof" },
    { icon: FileCog, label: "Requisitions", href: "/hof/requisitions" },
    { icon: Package, label: "My Requests", href: "/hof/my-requests" },
    { icon: FileSpreadsheet, label: "POs", href: "/hof/pos" },
  ],
  pm: [
    { icon: LayoutGrid, label: "Dashboard", href: "/pm" },
    { icon: FileCog, label: "Requisitions", href: "/pm/requisitions" },
    { icon: Package, label: "My Requests", href: "/pm/my-requests" },
    { icon: CircleDollarSign, label: "RFQs", href: "/pm/rfqs" },
    { icon: FileSpreadsheet, label: "POs", href: "/pm/pos" },
    { icon: Store, label: "Vendors", href: "/pm/vendors" },
    { icon: MapPin, label: "Locations", href: "/pm/locations" },
    { icon: FileCheck, label: "SLAs", href: "/pm/slas" },
    // { icon: ShoppingCart, label: "Vendors", href: "/pm/vendors" },
    // { icon: Gavel, label: "Bids", href: "/pm/bids" },
  ],
  // TODO: update role key once backend finalises Warehouse Manager role name
  wm: [
    { icon: LayoutGrid, label: "Dashboard", href: "/wm" },
    { icon: FileSpreadsheet, label: "POs", href: "/wm/pos" },
  ],
  hhra: [
    { icon: LayoutGrid, label: "Dashboard", href: "/hhra" },
    { icon: FileCog, label: "Requisitions", href: "/hhra/requisitions" },
    { icon: Package, label: "My Requests", href: "/hhra/my-requests" },
    { icon: SquarePen, label: "All Requests", href: "/hhra/requests" },
    { icon: CircleDollarSign, label: "RFQs", href: "/hhra/rfqs" },
    { icon: FileSpreadsheet, label: "POs", href: "/hhra/pos" },
    { icon: Store, label: "Vendors", href: "/hhra/vendors" },
    // D4: Locations management is PM-only; HHRA should not add/manage locations
    // { icon: MapPin, label: "Locations", href: "/hhra/locations" },
  ],
};

type MenuProps = {
  showText?: boolean;
};

const Menu = ({ showText = true }: MenuProps) => {
  const pathname = usePathname();
  const currentPathname = pathname ?? "";
  const router = useRouter();
  const user = getUser();
  const { setOpenMobile } = useSidebar();

  // Get role from URL first, fallback to user's role if on shared routes
  let role = (currentPathname.split("/")[1] || user?.role || "user") as keyof typeof menuItems;
  if (!menuItems[role] && user?.role) {
    role = user.role as keyof typeof menuItems;
  }

  const items = menuItems[role] || [];

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "GET",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed. Please try again.");
    } finally {
      localStorage.removeItem("authData");
      clearAuthCookies();
      for (let i = 0; i < window.history.length; i++) {
        window.history.pushState(null, "", "/");
      }
      window.location.replace("/");
    }
  };

  return (
    <div className="flex flex-col py-6 gap-2 w-full h-full">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === `/${role}`
            ? currentPathname === item.href
            : currentPathname === item.href || currentPathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setOpenMobile(false)}
            className={`flex items-center w-full ${
              showText ? "gap-3 px-6 justify-start" : "justify-center"
            } text-md py-2 mx-2 transition-colors duration-200 ${
              isActive
                ? "bg-white text-[#0F1E7A] font-semibold"
                : "text-white hover:bg-white hover:text-[#0F1E7A]"
            }`}
          >
            <Icon className="w-5 h-5" />
            {showText && <p className="text-base">{item.label}</p>}
          </Link>
        );
      })}

      <button
        onClick={handleLogout}
        className="flex items-center justify-center lg:justify-start gap-3 text-md py-2 px-4 md:px-6 transition-colors text-red-500 hover:bg-red-500 hover:text-white cursor-pointer mt-auto"
      >
        <LogOut className="w-7 h-7 lg:w-5 lg:h-5" />
        {showText && <p className="hidden lg:block text-base">Logout</p>}
      </button>
    </div>
  );
};

export default Menu;
