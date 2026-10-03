import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kopi Nusantara — Manajemen Karyawan",
    template: "%s | Kopi Nusantara",
  },
  description:
    "Sistem manajemen karyawan cafe modern. Kelola jadwal, payroll, dan data karyawan dalam satu platform.",
  keywords: ["manajemen karyawan", "cafe", "jadwal kerja", "payroll", "slip gaji"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
