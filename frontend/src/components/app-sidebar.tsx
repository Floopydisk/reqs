"use client"

import * as React from "react"
import Image from "next/image"
import Menu from "@/components/Menu"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="bg-[#0F1E7A] py-4 px-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5! hover:bg-transparent active:bg-transparent"
            >
              <a href="#" className="flex items-center gap-2">
                <Image
                  src="/daystar_logo.png"
                  alt="logo"
                  width={36}
                  height={18}
                  className="object-cover"
                />
                <span className="text-xl font-bold text-white">requisite</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-[#0F1E7A]">
        <Menu />
      </SidebarContent>
    </Sidebar>
  )
}
