"use client";

import React from "react";
import Link from "next/link";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCafe } from "@/lib/store/cafe-context";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { managerProfile } = useCafe();
  const nama = managerProfile?.nama || "Ahmad Ridwan";
  const role = managerProfile?.role === "MANAGER" ? "Manajer" : managerProfile?.role || "Manajer";
  const fotoProfil = managerProfile?.fotoProfilPath;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-sm px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden shrink-0 text-stone-600"
        onClick={onMenuClick}
        aria-label="Buka menu navigasi"
        id="mobile-menu-button"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Title (mobile only) */}
      {title && (
        <h1 className="lg:hidden text-base font-semibold text-stone-800 truncate">
          {title}
        </h1>
      )}

      {/* Search — desktop */}
      <div className="hidden lg:flex flex-1 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            id="global-search"
            placeholder="Cari karyawan, jadwal..."
            className="pl-8 h-8 text-sm bg-[var(--muted)] border-transparent focus-visible:bg-white focus-visible:border-brand-300"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Mobile search */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden text-stone-600"
          aria-label="Cari"
        >
          <Search className="h-4.5 w-4.5" />
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-stone-600 relative"
            aria-label="Notifikasi"
            id="notification-button"
          >
            <Bell className="h-4.5 w-4.5" />
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-500 border-2 border-white" />
          </Button>
        </div>

        {/* User profile link */}
        <Link
          href="/profile"
          id="user-menu-button"
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-[var(--muted)] transition-colors outline-none cursor-pointer"
          aria-label="Buka profil saya"
          title="Profil Saya"
        >
          <Avatar className="h-7 w-7 shrink-0">
            {fotoProfil ? (
              <AvatarImage src={fotoProfil} alt={nama} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-xs bg-coffee-700 text-amber-100 font-semibold">
              {getInitials(nama)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-stone-800 leading-none truncate max-w-[140px]">
              {nama}
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
              {role}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
