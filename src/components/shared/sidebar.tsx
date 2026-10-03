"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  Coffee,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCafe } from "@/lib/store/cafe-context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Karyawan", href: "/karyawan", icon: Users },
  { label: "Jadwal", href: "/jadwal", icon: Calendar },
  { label: "Kehadiran", href: "/kehadiran", icon: Clock },
  { label: "Slip Gaji", href: "/slip-gaji", icon: FileText },
];

const secondaryNavItems: NavItem[] = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Pengaturan", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { cafeProfile, managerProfile } = useCafe();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await signOut({ callbackUrl: "/login" });
  };

  const namaKafe = cafeProfile?.namaKafe || "Kopi Nusantara";
  const logoPath = cafeProfile?.logoPath;
  const managerName = managerProfile?.nama || "Ahmad Ridwan";
  const managerPhoto = managerProfile?.fotoProfilPath;

  return (
    <aside
      className={cn(
        "relative hidden lg:flex flex-col border-r border-[var(--sidebar-border)] bg-white transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center gap-3 px-4 border-b border-[var(--sidebar-border)]",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coffee-700 shadow-sm overflow-hidden">
          {logoPath ? (
            <img
              src={logoPath}
              alt={namaKafe}
              className="h-full w-full object-cover"
            />
          ) : (
            <Coffee className="h-4.5 w-4.5 text-amber-100" />
          )}
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="text-sm font-bold text-stone-800 leading-tight truncate">
              {namaKafe}
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Manajemen Kafe
            </p>
          </div>
        )}
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
        className="absolute -right-3 top-[16px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-white shadow-sm text-[var(--muted-foreground)] hover:text-stone-800 hover:shadow-md transition-all duration-150"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col justify-between">
        {/* Menu Utama (Upper section) */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-1 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Menu Utama
            </p>
          )}
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      collapsed && "justify-center px-0 py-3",
                      isActive
                        ? "bg-coffee-700 text-white shadow-sm"
                        : "text-stone-600 hover:bg-[var(--muted)] hover:text-stone-800"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0",
                        isActive ? "text-amber-200" : "text-stone-400"
                      )}
                    />
                    {!collapsed && (
                      <span className="animate-fade-in truncate">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-300" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Sistem (Lower section near bottom) */}
        <div className="mt-6 mb-1">
          {!collapsed && (
            <p className="px-3 mb-1 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Sistem
            </p>
          )}
          <ul className="space-y-0.5">
            {secondaryNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      collapsed && "justify-center px-0 py-3",
                      isActive
                        ? "bg-coffee-700 text-white shadow-sm"
                        : "text-stone-600 hover:bg-[var(--muted)] hover:text-stone-800"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0",
                        isActive ? "text-amber-200" : "text-stone-400"
                      )}
                    />
                    {!collapsed && (
                      <span className="animate-fade-in truncate">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-300" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* User Profile */}
      <div className={cn(
        "border-t border-[var(--sidebar-border)] p-3",
        collapsed ? "flex justify-center" : ""
      )}>
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 cursor-pointer hover:bg-[var(--muted)] transition-colors w-full",
            collapsed && "justify-center"
          )}
          title={collapsed ? managerName : undefined}
        >
          <Avatar className="h-8 w-8 shrink-0">
            {managerPhoto ? (
              <AvatarImage src={managerPhoto} alt={managerName} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-xs bg-coffee-100 text-coffee-800 font-semibold">
              {getInitials(managerName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="animate-fade-in flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-stone-800 leading-tight truncate">
                {managerName}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">
                Manajer
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="ml-auto text-[var(--muted-foreground)] hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </Link>
      </div>
    </aside>
  );
}

// Mobile sidebar overlay
export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { cafeProfile, managerProfile } = useCafe();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    await signOut({ callbackUrl: "/login" });
  };

  const namaKafe = cafeProfile?.namaKafe || "Kopi Nusantara";
  const logoPath = cafeProfile?.logoPath;
  const managerName = managerProfile?.nama || "Ahmad Ridwan";
  const managerPhoto = managerProfile?.fotoProfilPath;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-[var(--sidebar-border)] shadow-xl transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-coffee-700 shadow-sm overflow-hidden">
              {logoPath ? (
                <img
                  src={logoPath}
                  alt={namaKafe}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Coffee className="h-5 w-5 text-amber-100" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800 truncate">{namaKafe}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Manajemen Kafe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-stone-500"
            aria-label="Tutup menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col justify-between">
          <div>
            <p className="px-2 mb-2 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Menu Utama
            </p>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-coffee-700 text-white"
                          : "text-stone-600 hover:bg-[var(--muted)]"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isActive ? "text-amber-200" : "text-stone-400"
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-6">
            <p className="px-2 mb-2 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Sistem
            </p>
            <ul className="space-y-0.5">
              {secondaryNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-coffee-700 text-white"
                          : "text-stone-600 hover:bg-[var(--muted)]"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isActive ? "text-amber-200" : "text-stone-400"
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-[var(--sidebar-border)] p-4">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-[var(--muted)] transition-colors"
          >
            <Avatar className="h-9 w-9 shrink-0">
              {managerPhoto ? (
                <AvatarImage src={managerPhoto} alt={managerName} className="object-cover" />
              ) : null}
              <AvatarFallback className="text-sm bg-coffee-100 text-coffee-800 font-semibold">
                {getInitials(managerName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-stone-800 truncate">{managerName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Manajer</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </aside>
    </>
  );
}
