import type { Metadata } from "next";
import { EmployeeTable } from "@/components/employees/employee-table";

export const metadata: Metadata = {
  title: "Karyawan",
};

export default function KaryawanPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Karyawan</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Kelola data dan informasi seluruh karyawan kafe
        </p>
      </div>

      <EmployeeTable />
    </div>
  );
}
