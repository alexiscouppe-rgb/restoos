"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, MessageSquare, Star,
  Users, Settings, ChevronDown, Utensils, BarChart3, Upload,
} from "lucide-react";

interface SidebarProps {
  restaurant: { id: string; name: string; logoUrl: string | null };
  userRole: string;
}

const navItems = [
  { label: "Dashboard",    href: "/dashboard",              icon: LayoutDashboard, exact: true },
  { label: "Réservations", href: "/dashboard/reservations", icon: Calendar },
  { label: "Inbox",        href: "/dashboard/inbox",        icon: MessageSquare },
  { label: "Avis",         href: "/dashboard/reviews",      icon: Star },
  { label: "Contacts",     href: "/dashboard/contacts",     icon: Users },
  { label: "Analytics",    href: "/dashboard/analytics",    icon: BarChart3 },
  { label: "Importer",     href: "/dashboard/import",       icon: Upload },
];

export function Sidebar({ restaurant, userRole }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-screen w-[216px] flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Restaurant selector */}
      <div className="p-3">
        <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-sidebar-accent transition-colors duration-150 group">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Utensils className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
              {restaurant.name}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight capitalize font-medium">
              {userRole}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
        </button>
      </div>

      <div className="mx-3 border-t border-sidebar-border/60" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-colors",
                active ? "text-sidebar-primary-foreground" : "text-muted-foreground"
              )} strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings */}
      <div className="p-3 border-t border-sidebar-border/60">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
            isActive("/dashboard/settings")
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isActive("/dashboard/settings") ? "text-sidebar-primary-foreground" : "text-muted-foreground"
          )} strokeWidth={isActive("/dashboard/settings") ? 2.5 : 2} />
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
