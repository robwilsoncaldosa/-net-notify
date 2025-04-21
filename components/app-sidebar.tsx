"use client"

import {
    LayoutDashboard,
    MessageCircle,
    Map,
    Package,
    Users
} from "lucide-react"
import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"
import Logo from "./ui/logo"
import SMS from "./ui/send-sms-icon"
import { usePathname, useRouter } from "next/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
const pathName = usePathname()

// This is sample data.
const data = {
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "Net Notify",
        logo: Logo,
      },
    ],
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        isActive: pathName === ("/dashboard"),
      },
      {
        title: "Customers",
        url: "/dashboard/customers",
        icon: Users,
        isActive: pathName === ("/dashboard/customers"),
      },
      {
        title: "Plans",
        url: "/dashboard/plans",
        icon: Package,
        isActive: pathName === ("/dashboard/plans"),
      },
      {
        title: "Areas",
        url: "/dashboard/areas",
        icon: Map,
        isActive: pathName === ("/dashboard/areas"),
      },
      {
        title: "Send SMS",
        url: "/dashboard/send-sms",
        icon: MessageCircle,
        isActive: pathName === ("/dashboard/send-sms"),
      },
    ],
    
  }
  
  return (
    <Sidebar collapsible="icon" {...props} className="border-r-transparent">
      <SidebarHeader>
      {/* @ts-expect-error will fix this later */}
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
