import type { Metadata } from "next";
import { AttendanceView } from "@/components/attendance/attendance-view";

export const metadata: Metadata = {
  title: "Kehadiran Karyawan",
};

export default function KehadiranPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Kehadiran</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Kelola dan pantau kehadiran karyawan berdasarkan jadwal kerja.
        </p>
      </div>

      <AttendanceView />
    </div>
  );
}
