"use client";

import Image from "next/image";
import { toast } from "sonner";
import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getUser, clearAuthCookies } from "@/lib/auth";
import AdvancedSearchModal from "@/components/AdvancedSearchModal";
import NotificationDropdown from "@/components/NotificationDropdown";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  Gem,
  Mail,
  Menu,
  Crown,
  LogOut,
  Search,
  Settings,
  CircleUser,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";

export function SiteHeader() {
  const pathname = usePathname();
  const user = getUser();
  const { toggleSidebar, isMobile, state } = useSidebar();

  const TriggerIcon = isMobile
    ? Menu
    : state === "expanded"
      ? PanelRightOpen
      : PanelRightClose;
  const currentRole = pathname?.split("/")[1] || user?.role || "user";
  const notificationsPath = `/${currentRole}/notifications`;

  // If the tab is restored from bfcache (back/forward) after logout,
  // no network request fires — catch it here.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !localStorage.getItem("authData")) {
        window.location.replace("/");
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const capitalize = (str: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

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
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-white/20 bg-[#0F1E7A] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <Button
          size="icon"
          variant="ghost"
          data-sidebar="trigger"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="-ml-1 size-7 text-white hover:bg-white/10 hover:text-white"
        >
          <TriggerIcon className="size-5" />
        </Button>
        <Separator
          orientation="vertical"
          className="mx-2 bg-white/30 data-[orientation=vertical]:h-4"
        />

        {user?.role && (
          <span className="hidden sm:inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white capitalize">
            {user.role}
          </span>
        )}

        <div className="ml-auto flex items-center gap-4">
          <AdvancedSearchModal
            trigger={
              <Search
                color="#FFF"
                className="cursor-pointer w-5 h-5 sm:w-6 sm:h-6"
              />
            }
            onSearch={(query) => console.log("Search:", query)}
          />

          <Settings color="#FFF" className="w-5 h-5 sm:w-6 sm:h-6" />

          <NotificationDropdown notificationsPath={notificationsPath} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Image
                src="/avatar.png"
                alt=""
                width={28}
                height={28}
                className="rounded-full cursor-pointer sm:w-9 sm:h-9"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[287px] bg-white border-none mr-4">
              <DropdownMenuLabel className="!p-0">
                <div className="flex flex-col items-start gap-2">
                  <div className="text-sm text-[var(--primary-color)] pt-5 px-5">
                    <p className="font-semibold flex items-center gap-2 mb-4">
                      <CircleUser size={25} />
                      <span>
                        {capitalize(user?.firstName || "")}{" "}
                        {capitalize(user?.lastName || "")}
                      </span>
                    </p>
                    <p className="font-semibold flex items-center gap-2 mb-4">
                      <Mail size={25} />
                      <span>{capitalize(user?.email || "")}</span>
                    </p>
                    <p className="font-semibold flex items-center gap-2 mb-4">
                      <Crown size={25} />
                      <span>
                        {capitalize(user?.designation || user?.role || "")}
                      </span>
                    </p>
                    {user?.role !== "vendor" && (
                      <p className="font-semibold flex items-center gap-2 mb-4">
                        <Gem size={25} />
                        <span>{capitalize(user?.department?.name || "")}</span>
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <div className="border-b border-gray-200 mx-4" />
              <div className="p-4 mx-auto w-full flex items-center justify-center">
                <Button
                  onClick={handleLogout}
                  className="w-auto bg-[var(--primary-color)] hover:bg-red-500 text-white cursor-pointer"
                >
                  <div className="flex justify-center items-center gap-2">
                    <LogOut size={20} />
                    <span>Logout</span>
                  </div>
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
