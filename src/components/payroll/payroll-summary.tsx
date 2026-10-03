"use client";

import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";
import { DollarSign, Users, Clock, CheckCircle } from "lucide-react";
import type { Payroll } from "@/types";

interface PayrollSummaryProps {
  payrolls?: Payroll[];
}

export function PayrollSummary({ payrolls = [] }: PayrollSummaryProps) {
  const summary = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalOvertime = 0;
    let totalAllowance = 0;
    let totalDeduction = 0;
    let draftCount = 0;
    let calculatedCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    for (const p of payrolls) {
      totalGross += p.grossSalary;
      totalNet += p.netSalary;
      totalOvertime += p.overtimePay;
      totalAllowance += p.allowance;
      const totalLate = (p.latePenalty || 0) + (p.repeatedLatePenalty || 0);
      const totalJob = p.jobPenalty || 0;
      totalDeduction += p.deduction + totalLate + totalJob;

      if (p.status === "APPROVED") approvedCount++;
      else if (p.status === "PAID") paidCount++;
      else if (p.status === "DRAFT") draftCount++;
      else calculatedCount++;
    }

    return {
      totalEmployees: payrolls.length,
      totalGross,
      totalNet,
      totalOvertime,
      totalAllowance,
      totalDeduction,
      draftCount,
      calculatedCount,
      approvedCount,
      paidCount,
    };
  }, [payrolls]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="p-4 bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
              Total Gaji Bersih
            </p>
            <p className="text-xl font-bold text-stone-800 mt-1">
              {formatRupiah(summary.totalNet)}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Akumulasi take home pay
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
              Total Karyawan
            </p>
            <p className="text-xl font-bold text-stone-800 mt-1">
              {summary.totalEmployees} Orang
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Terhitung dalam payroll
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
              Total Upah Lembur
            </p>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {formatRupiah(summary.totalOvertime)}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Berdasarkan shift lembur
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase">
              Status Periode
            </p>
            <p className="text-xl font-bold text-stone-800 mt-1">
              {summary.approvedCount + summary.paidCount} Disetujui / Dibayar
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              {summary.calculatedCount} Dihitung, {summary.draftCount} Draft
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );
}
