import type { Metadata } from "next";
import { PayrollTable } from "@/components/payroll/payroll-table";

export const metadata: Metadata = {
  title: "Slip Gaji & Payroll",
};

export default function SlipGajiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Slip Gaji & Payroll</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Rekapitulasi jam kerja, upah, tunjangan, dan cetak slip gaji karyawan
        </p>
      </div>

      <PayrollTable />
    </div>
  );
}
