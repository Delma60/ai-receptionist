import Link from "next/link";
import { LayoutDashboard, Bot, Phone, Blocks, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Navigation items based on your app's route structure
const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agents", url: "/agents", icon: Bot },
  { title: "Calls", url: "/calls", icon: Phone },
  { title: "Integrations", url: "/integrations", icon: Blocks },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {/* 1. The Sidebar Component */}
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-14 items-center px-4 font-semibold">
            AI Receptionist
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {/* Using the `render` prop pattern from Base UI */}
                    <SidebarMenuButton render={<Link href={item.url} />}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {/* Optional: Add user profile, logout, or upgrade buttons here */}
        </SidebarFooter>
      </Sidebar>

      {/* 2. The Main Content Area wrapped in SidebarInset */}
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
          {/* SidebarTrigger toggles the sidebar on mobile and collapses it on desktop */}
          <SidebarTrigger />

          {/* You can add breadcrumbs, search bars, or user menus here */}
          <div className="flex-1"></div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
