import type { Metadata } from "next";
import { ScheduleCalendar } from "@/components/schedules/schedule-calendar";

export const metadata: Metadata = {
  title: "Jadwal Kerja",
};

export default function JadwalPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Jadwal Kerja Karyawan</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Atur dan pantau shift kerja seluruh tim kafe secara mingguan atau harian
        </p>
      </div>

      <ScheduleCalendar />
    </div>
  );
}
