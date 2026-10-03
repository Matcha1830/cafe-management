"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Payroll } from "@/types";
import { formatRupiah, formatPeriod } from "@/lib/utils";
import { Printer, Download, Coffee, AlertCircle, CheckSquare, Clock } from "lucide-react";
import { useCafe } from "@/lib/store/cafe-context";
import { formatLateMinutesReadable } from "@/lib/calculations/payroll";

interface PayslipModalProps {
  open: boolean;
  onClose: () => void;
  payroll: Payroll;
}

export function PayslipModal({ open, onClose, payroll }: PayslipModalProps) {
  const { getPositionName, cafeProfile } = useCafe();

  const namaKafe = cafeProfile?.namaKafe || "Kopi Nusantara";
  const logoPath = cafeProfile?.logoPath;
  const alamat = cafeProfile?.alamat || "Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan";
  const telepon = cafeProfile?.telepon || "(021) 7890-1234";

  const handlePrint = () => {
    window.print();
  };

  const totalLatePenalty =
    (payroll.latePenalty || 0) + (payroll.repeatedLatePenalty || 0);
  const totalJobPenalty = payroll.jobPenalty || 0;
  const standardDeduction = payroll.deduction || 0;
  const grandTotalDeductions =
    standardDeduction + totalLatePenalty + totalJobPenalty;

  const takeHomePay = Math.max(0, payroll.grossSalary - grandTotalDeductions);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Slip Gaji Karyawan</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                <span>Cetak</span>
              </Button>
              <Button
                variant="brand"
                size="sm"
                className="gap-1.5"
                onClick={() => alert("Fitur unduh PDF akan hadir pada tahap integrasi.")}
              >
                <Download className="h-4 w-4" />
                <span>Unduh PDF</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Payslip Card */}
        <div className="payslip-container p-6 bg-white border border-[var(--border)] rounded-xl space-y-6 text-stone-800">
          {/* Cafe Header */}
          <div className="flex items-center justify-between border-b pb-4 border-stone-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-coffee-700 text-amber-100 font-bold overflow-hidden shadow-sm">
                {logoPath ? (
                  <img src={logoPath} alt={namaKafe} className="h-full w-full object-cover" />
                ) : (
                  <Coffee className="h-6 w-6" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-stone-900 leading-tight uppercase">
                  {namaKafe}
                </h2>
                {alamat && <p className="text-xs text-stone-500">{alamat}</p>}
                {telepon && <p className="text-xs text-stone-500">Telp: {telepon}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-stone-100 text-stone-800 font-mono text-xs px-2.5 py-1 rounded font-bold border border-stone-300">
                SLIP GAJI
              </span>
              <p className="text-xs text-stone-500 mt-1">
                Periode: <strong className="text-stone-800">{formatPeriod(payroll.period)}</strong>
              </p>
            </div>
          </div>

          {/* Employee Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-lg border border-stone-200">
            <div>
              <p className="text-stone-500">Nama Karyawan:</p>
              <p className="font-semibold text-stone-900 text-sm mt-0.5">{payroll.employeeName}</p>
            </div>
            <div>
              <p className="text-stone-500">ID Karyawan / Ref:</p>
              <p className="font-mono font-medium text-stone-800 text-sm mt-0.5">{payroll.employeeId}</p>
            </div>
            <div>
              <p className="text-stone-500">Jabatan:</p>
              <p className="font-medium text-stone-800 mt-0.5">{getPositionName(payroll.employeePosition)}</p>
            </div>
            <div>
              <p className="text-stone-500">Total Jam Kerja / Lembur:</p>
              <p className="font-medium text-stone-800 mt-0.5">
                {payroll.regularHours} Jam {payroll.overtimeHours > 0 ? `(+${payroll.overtimeHours} Jam Lembur)` : ""}
              </p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Penghasilan */}
              <div className="border border-stone-200 rounded-lg p-3">
                <p className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 border-b pb-1">
                  A. Penghasilan
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Gaji Pokok</span>
                    <span className="font-medium">{formatRupiah(payroll.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Upah Lembur ({payroll.overtimeHours || 0} Jam)</span>
                    <span className="font-medium">{formatRupiah(payroll.overtimePay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Tunjangan Operasional</span>
                    <span className="font-medium">{formatRupiah(payroll.allowance)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1.5 text-stone-900">
                    <span>Total Penghasilan Kotor</span>
                    <span>{formatRupiah(payroll.grossSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Potongan Standar */}
              <div className="border border-stone-200 rounded-lg p-3">
                <p className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 border-b pb-1">
                  B. Potongan Standar
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600">BPJS Ketenagakerjaan / Iuran</span>
                    <span className="font-medium">{formatRupiah(payroll.deduction)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Potongan Lainnya</span>
                    <span>Rp 0</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1.5 text-stone-900 mt-5">
                    <span>Subtotal Potongan Pokok</span>
                    <span>{formatRupiah(payroll.deduction)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Penalty Sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Evaluasi Keterlambatan */}
              <div className="border border-stone-200 rounded-lg p-3 bg-red-50/20">
                <p className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 border-b pb-1 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-700" />
                  C. Keterlambatan
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Total Keterlambatan:</span>
                    <span className="font-semibold text-stone-800">
                      {formatLateMinutesReadable(payroll.totalLateMinutes || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Denda Durasi:</span>
                    <span className="font-medium text-stone-800">
                      {formatRupiah(payroll.latePenalty || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Penalti Keterlambatan Berulang:</span>
                    <span className="font-medium text-stone-800">
                      {formatRupiah(payroll.repeatedLatePenalty || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1.5 text-red-700">
                    <span>Total Denda Keterlambatan</span>
                    <span>{formatRupiah(totalLatePenalty)}</span>
                  </div>
                </div>
              </div>

              {/* Evaluasi List Job */}
              <div className="border border-stone-200 rounded-lg p-3 bg-amber-50/20">
                <p className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 border-b pb-1 flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-coffee-700" />
                  D. Evaluasi List Job
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Pekerjaan Selesai:</span>
                    <span className="font-semibold text-stone-800">
                      {payroll.completedJobsCount || 0} / {payroll.totalJobsCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Tidak Selesai:</span>
                    <span className="font-semibold text-red-700">
                      {Math.max(0, (payroll.totalJobsCount || 0) - (payroll.completedJobsCount || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1.5 text-red-700 mt-5">
                    <span>Denda List Job (@Rp5.000)</span>
                    <span>{formatRupiah(totalJobPenalty)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Total Box */}
            <div className="bg-coffee-50 border border-coffee-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-coffee-800 uppercase font-semibold">
                  Total Gaji Diterima (Take Home Pay)
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Penghasilan Bersih = (A - B - C - D)
                </p>
              </div>
              <p className="text-xl font-bold text-coffee-900 font-mono">
                {formatRupiah(takeHomePay)}
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-stone-300 text-center text-xs text-stone-600">
            <div>
              <p>Penerima,</p>
              <div className="h-16"></div>
              <p className="font-semibold text-stone-900 underline">{payroll.employeeName}</p>
            </div>
            <div>
              <p>Manajer Operasional,</p>
              <div className="h-16"></div>
              <p className="font-semibold text-stone-900 underline">Ahmad Ridwan</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

