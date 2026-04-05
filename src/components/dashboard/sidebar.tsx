"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  Package,
  LogOut,
  ChevronLeft,
  Menu,
  GraduationCap,
  ShieldCheck,
  CheckSquare,
  MessageSquare,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly ("super_admin" | "staff_pembayaran" | "teacher")[];
};

type NavGroup = {
  groupLabel: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    groupLabel: "Utama",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["super_admin", "staff_pembayaran", "teacher"],
      },
    ],
  },
  {
    groupLabel: "Akademik",
    items: [
      {
        label: "Siswa",
        href: "/dashboard/participants",
        icon: Users,
        roles: ["super_admin", "staff_pembayaran"],
      },
      {
        label: "Kelas",
        href: "/dashboard/classes",
        icon: BookOpen,
        roles: ["super_admin"],
      },
      {
        label: "Presensi",
        href: "/dashboard/presensi",
        icon: CheckSquare,
        roles: ["super_admin", "teacher"],
      },
      {
        label: "Pengajar",
        href: "/dashboard/teachers",
        icon: GraduationCap,
        roles: ["super_admin"],
      },
    ],
  },
  {
    groupLabel: "Keuangan",
    items: [
      {
        label: "Pembayaran",
        href: "/dashboard/payments",
        icon: CreditCard,
        roles: ["super_admin", "staff_pembayaran"],
      },
      {
        label: "Paket Pembayaran",
        href: "/dashboard/packages",
        icon: Package,
        roles: ["super_admin"],
      },
    ],
  },
  {
    groupLabel: "Pengaturan",
    items: [
      {
        label: "Akun",
        href: "/dashboard/accounts",
        icon: ShieldCheck,
        roles: ["super_admin"],
      },
      {
        label: "Template Pesan",
        href: "/dashboard/message-templates",
        icon: MessageSquare,
        roles: ["super_admin"],
      },
      {
        label: "Database",
        href: "/dashboard/database",
        icon: Database,
        roles: ["super_admin"],
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasAccess } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const roleLabel =
    user?.role === "super_admin"
      ? "Super Admin"
      : user?.role === "teacher"
      ? "Pengajar"
      : "Staff Pembayaran";

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-background p-2 rounded-lg shadow-md border"
        onClick={() => setCollapsed(!collapsed)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          collapsed
            ? "-translate-x-full lg:translate-x-0 lg:w-[72px]"
            : "translate-x-0 w-64"
        )}
      >
        {/* Logo / Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                K
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">
                Kursus
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="mx-auto">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                K
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center h-7 w-7 rounded-md hover:bg-sidebar-accent transition-colors"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter((item) =>
              hasAccess([...item.roles])
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.groupLabel} className="space-y-1">
                {/* Group label — only show after the first group */}
                {groupIdx > 0 && (
                  collapsed ? (
                    <Separator className="my-2" />
                  ) : (
                    <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                      {group.groupLabel}
                    </p>
                  )
                )}

                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) setCollapsed(true);
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0 transition-colors",
                          isActive
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                        )}
                      />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4">
          <Separator className="mb-3" />
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg",
              collapsed && "justify-center"
            )}
          >
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-sidebar-foreground">
                  {user?.name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {roleLabel}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
