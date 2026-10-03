"use client";

import React, { useState } from "react";
import { Sidebar, MobileSidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { CafeProvider } from "@/lib/store/cafe-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <CafeProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--background)]">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setMobileNavOpen(true)} />

          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-6 animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </CafeProvider>
  );
}
