"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { getUser, clearAuthCookies } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { API_BASE_URL } from "@/lib/config";
import AdvancedSearchModal from "./AdvancedSearchModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  CircleUser,
  Crown,
  Gem,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Search,
  Settings,
} from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import Menu from "./Menu";
import { useState, useEffect } from "react";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // If the tab is restored from bfcache (back/forward) after logout,
  // no network request fires so middleware never runs — catch it here.
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

  // Get current role from URL or user data
  const currentRole = pathname?.split("/")[1] || user?.role || "user";
  const notificationsPath = `/${currentRole}/notifications`;

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
      // Overwrite every history entry in this tab with '/' so clicking
      // back never restores a dashboard page from this session.
      for (let i = 0; i < window.history.length; i++) {
        window.history.pushState(null, "", "/");
      }
      window.location.replace("/");
    }
  };

  return (
    <div className="flex sticky top-0 z-10 py-4 px-4 md:px-6 lg:px-6 xl:px-6  justify-between items-center bg-[#0F1E7A] border-b-1 border-[#FFF]">
      <div className="flex justify-center items-center gap-2">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger className="md:hidden mr-2">
            <MenuIcon color="white" size={24} />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="!bg-[#0F1E7A] !text-white pt-10 w-[260px] flex flex-col"
          >
            <div className="flex-1 overflow-y-auto">
              <Menu />
            </div>
          </SheetContent>
        </Sheet>
        <Image
          src="/daystar_logo.png"
          alt="logo"
          width={40}
          height={20}
          className="object-cover"
        />
        <p className="text-2xl lg:text-3xl text-white font-bold">requisite</p>
      </div>

      <div className="flex justify-center items-center gap-6">
        <div className="flex justify-center items-center gap-[14px]">
          <AdvancedSearchModal
            trigger={
              <Search
                color="#FFF"
                className="cursor-pointer w-5 h-5 sm:w-6 sm:h-6"
              />
            }
            onSearch={(query) => console.log("Search:", query)}
          />

          <div>
            <Settings color="#FFF" className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <NotificationDropdown notificationsPath={notificationsPath} />
        </div>

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
                    <span className="">
                      <CircleUser size={25} />
                    </span>
                    <span>
                      {capitalize(user?.firstName || "")}{" "}
                      {capitalize(user?.lastName || "")}
                    </span>
                  </p>

                  <p className="font-semibold flex items-center gap-2 mb-4">
                    <span className="">
                      <Mail size={25} />
                    </span>
                    <span>{capitalize(user?.email || "")}</span>
                  </p>

                  <p className="font-semibold flex items-center gap-2 mb-4">
                    <span className="">
                      <Crown size={25} />
                    </span>
                    <span>
                      {capitalize(user?.designation || user?.role || "")}
                    </span>
                  </p>

                  {user?.role !== "vendor" && (
                    <p className="font-semibold flex items-center gap-2 mb-4">
                      <span className="">
                        <Gem size={25} />
                      </span>
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
  );
};

export default Navbar;
