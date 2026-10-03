"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  Pencil,
  FileSpreadsheet,
  CheckCircle2,
  CheckCircle,
  Clock,
  CheckSquare,
  Loader2,
  Save,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCafe } from "@/lib/store/cafe-context";
import type { Employee, Payroll } from "@/types";
import {
  cn,
  formatRupiah,
  getInitials,
  getEmployeeAttendancePeriod,
} from "@/lib/utils";
import { getScheduleDurationHours } from "@/components/schedules/schedule-block";
import {
  calculateMonthlyAttendanceLateStats,
  calculateJobPenalty,
  formatLateMinutesReadable,
} from "@/lib/calculations/payroll";
import { PayslipModal } from "./payslip";
import { EditPayrollModal } from "./edit-payroll-modal";
import { PayrollSummary } from "./payroll-summary";

interface SheetsStatus {
  connected: boolean;
  spreadsheetId?: string | null;
  googleAccountEmail?: string;
  spreadsheetUrl?: string | null;
  slipGajiSpreadsheetId?: string | null;
  slipGajiSpreadsheetUrl?: string | null;
}

type SyncState =
  | "idle"
  | "checking"
  | "syncing"
  | "success"
  | "error"
  | "redirecting";

interface ToastMessage {
  type: "success" | "error" | "info";
  text: string;
  url?: string;
}

export function PayrollTable() {
  const {
    employees,
    positions,
    getPositionName,
    schedules,
    attendances,
    payrolls,
    jobCompletions,
    savePayrollSnapshot,
    cafeProfile,
  } = useCafe();

  const jobPenaltyRate = cafeProfile?.dendaPekerjaanPerJob ?? 5000;

  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Google Sheets state
  const [sheetsStatus, setSheetsStatus] = useState<SheetsStatus | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  // Compute table rows based on active employees & real DB schedules/attendances
  const payrollRows = useMemo(() => {
    return employees.map((emp) => {
      // Dapatkan periode payroll berbasis tanggalMasuk karyawan
      const periodInfo = getEmployeeAttendancePeriod(
        emp.joinDate || "2026-08-01",
        0
      );
      const { startDateStr, endDateStr } = periodInfo;
      const periodKey = "2026-08";

      // Cek apakah sudah ada snapshot tersimpan di database
      const savedPay = payrolls.find(
        (p) =>
          p.employeeId === emp.id &&
          (p.period === periodKey ||
            p.period === startDateStr ||
            p.period === startDateStr.substring(0, 7))
      );

      const isFinalized =
        savedPay && (savedPay.status === "APPROVED" || savedPay.status === "PAID");

      // Hitung jadwal kerja dari database PostgreSQL dalam rentang periode
      const empSchedules = schedules.filter(
        (s) =>
          s.employeeId === emp.id &&
          s.date >= startDateStr &&
          s.date <= endDateStr
      );

      const normalDailyHours = emp.dailyWorkingHours || emp.jamKerjaHarian || 8;

      let calcRegularHours = 0;
      let calcOvertimeHours = 0;
      for (const s of empSchedules) {
        const isWork =
          s.status === "KERJA" ||
          s.status === "BEKERJA" ||
          s.status === "TERJADWAL" ||
          !s.status;

        if (isWork) {
          const duration = getScheduleDurationHours(
            s.startTime,
            s.endTime,
            s.breakMinutes ?? 0
          );
          calcRegularHours += Math.min(duration, normalDailyHours);
          calcOvertimeHours += Math.max(0, duration - normalDailyHours);
        }
      }

      const regularHours = isFinalized ? savedPay.regularHours : calcRegularHours;
      const overtimeHours = isFinalized ? savedPay.overtimeHours : calcOvertimeHours;

      // Upah
      const hourlyRate = emp.hourlyRate || Math.round(emp.baseSalary / 173);
      const overtimePay = isFinalized
        ? savedPay.overtimePay
        : Math.round(overtimeHours * hourlyRate * 1.5);

      const allowance = savedPay?.allowance ?? 200000;
      const standardDeduction = savedPay?.deduction ?? 50000;

      // Kehadiran dan keterlambatan real dari PostgreSQL
      const empAttendances = (attendances[emp.id] || []).filter(
        (a) => a.date >= startDateStr && a.date <= endDateStr
      );
      const lateStats = calculateMonthlyAttendanceLateStats(
        empAttendances.length > 0 ? empAttendances : attendances[emp.id] || []
      );

      // Pekerjaan harian (list job)
      const totalJobs = emp.jobs ? emp.jobs.length : (savedPay?.totalJobsCount || 0);
      const completedJobs = emp.jobs
        ? emp.jobs.filter((j) => jobCompletions[emp.id]?.[j.id] !== false).length
        : (savedPay?.completedJobsCount || totalJobs);
      const jobStats = calculateJobPenalty(totalJobs, completedJobs, jobPenaltyRate);

      // Total denda
      const totalLatePenalty = isFinalized
        ? (savedPay.latePenalty || 0) + (savedPay.repeatedLatePenalty || 0)
        : lateStats.totalLatePenalty;

      const totalJobPenalty = isFinalized
        ? savedPay.jobPenalty || 0
        : jobStats.penalty;

      const grossSalary = emp.baseSalary + overtimePay + allowance;
      const totalDeductions =
        standardDeduction + totalLatePenalty + totalJobPenalty;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      const payrollItem: Payroll = {
        id: savedPay?.id || `pay-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeePosition: emp.position,
        period: periodKey,
        regularHours,
        overtimeHours,
        baseSalary: emp.baseSalary,
        overtimePay,
        allowance,
        deduction: standardDeduction,
        grossSalary,
        netSalary,
        status: savedPay?.status || "CALCULATED",
        totalLateMinutes: lateStats.totalLateMinutes,
        latePenalty: lateStats.dailyPenaltySum,
        repeatedLatePenalty: lateStats.repeatedPenalty,
        jobPenalty: totalJobPenalty,
        completedJobsCount: completedJobs,
        totalJobsCount: totalJobs,
        createdAt: savedPay?.createdAt || new Date().toISOString(),
        updatedAt: savedPay?.updatedAt || new Date().toISOString(),
      };

      return {
        employee: emp,
        payroll: payrollItem,
        lateStats,
        jobStats,
      };
    });
  }, [employees, schedules, attendances, payrolls, jobCompletions]);

  // Filter rows
  const filtered = useMemo(() => {
    return payrollRows.filter(({ employee }) => {
      const matchSearch =
        employee.name.toLowerCase().includes(search.toLowerCase()) ||
        employee.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        employee.email.toLowerCase().includes(search.toLowerCase());
      const matchPos =
        positionFilter === "all" ||
        employee.position === positionFilter ||
        getPositionName(employee.position).toLowerCase() ===
          positionFilter.toLowerCase();
      return matchSearch && matchPos;
    });
  }, [payrollRows, search, positionFilter, getPositionName]);

  // Hitung ulang & simpan snapshot seluruh karyawan ke PostgreSQL
  const handleRecalculateAndSaveAll = async () => {
    setIsRecalculating(true);
    try {
      for (const row of payrollRows) {
        await savePayrollSnapshot({
          employeeId: row.employee.id,
          period: row.payroll.period,
          employeeName: row.employee.name,
          employeePosition: row.employee.position,
          regularHours: row.payroll.regularHours,
          overtimeHours: row.payroll.overtimeHours,
          baseSalary: row.payroll.baseSalary,
          overtimePay: row.payroll.overtimePay,
          allowance: row.payroll.allowance,
          deduction: row.payroll.deduction,
          totalLateMinutes: row.payroll.totalLateMinutes || 0,
          latePenalty: row.payroll.latePenalty || 0,
          repeatedLatePenalty: row.payroll.repeatedLatePenalty || 0,
          jobPenalty: row.payroll.jobPenalty || 0,
          completedJobsCount: row.payroll.completedJobsCount || 0,
          totalJobsCount: row.payroll.totalJobsCount || 0,
          grossSalary: row.payroll.grossSalary,
          netSalary: row.payroll.netSalary,
          status: row.payroll.status,
          jobCompletions: jobCompletions[row.employee.id] || {},
        });
      }
      alert("Perhitungan payroll seluruh karyawan berhasil disinkronkan dan disimpan ke database PostgreSQL!");
    } catch (err) {
      console.error("Gagal menyimpan snapshot payroll:", err);
      alert("Terjadi kesalahan saat menyimpan snapshot payroll ke database.");
    } finally {
      setIsRecalculating(false);
    }
  };

  const currentPayrolls = useMemo(
    () => payrollRows.map((r) => r.payroll),
    [payrollRows]
  );

  // ---- Show toast for a few seconds ----
  const showToast = useCallback((msg: ToastMessage) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  }, []);

  // ---- Fetch integration status on mount + when returning from OAuth ----
  const fetchSheetsStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google/sheets/status");
      if (res.ok) {
        const data = await res.json();
        setSheetsStatus(data);
      }
    } catch {
      // Non-fatal — status will remain null
    }
  }, []);

  useEffect(() => {
    fetchSheetsStatus();
  }, [fetchSheetsStatus]);

  // ---- Handle URL params from OAuth callback ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    if (params.get("sheets_connected") === "1") {
      fetchSheetsStatus();
      showToast({
        type: "success",
        text: "Google Sheets berhasil terhubung! Sekarang Anda bisa menyinkronkan Slip Gaji.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("sheets_connected");
      window.history.replaceState({}, "", url.toString());
    }

    const sheetsError = params.get("sheets_error");
    if (sheetsError) {
      showToast({
        type: "error",
        text: "Terjadi kesalahan saat menghubungkan Google Sheets.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("sheets_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchSheetsStatus, showToast]);

  // ---- Handle Sinkron Slip Gaji Sheets click ----
  const handleSinkronSheets = async () => {
    setSyncState("checking");

    // Re-fetch status in case it changed
    let status = sheetsStatus;
    try {
      const res = await fetch("/api/google/sheets/status");
      if (res.ok) {
        status = await res.json();
        setSheetsStatus(status);
      }
    } catch {
      // Use cached status
    }

    if (!status?.connected) {
      setSyncState("redirecting");
      showToast({
        type: "info",
        text: "Mengarahkan ke halaman otorisasi Google...",
      });
      setTimeout(() => {
        window.location.href = "/api/google/authorize";
      }, 500);
      return;
    }

    setSyncState("syncing");

    try {
      const res = await fetch("/api/google/sheets/sync-slip-gaji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: "2026-08" }),
      });

      const data = await res.json();

      if (data.success) {
        setSyncState("success");
        if (data.spreadsheetUrl) {
          setSpreadsheetUrl(data.spreadsheetUrl);
        }
        showToast({
          type: "success",
          text: data.message ?? "Slip Gaji berhasil disinkronkan ke Google Sheets!",
          url: data.spreadsheetUrl,
        });
        setTimeout(() => setSyncState("idle"), 3000);
      } else if (data.error === "SHEETS_NOT_CONNECTED") {
        setSyncState("redirecting");
        showToast({
          type: "info",
          text: "Mengarahkan ke halaman otorisasi Google...",
        });
        setTimeout(() => {
          window.location.href = "/api/google/authorize";
        }, 800);
      } else {
        setSyncState("error");
        showToast({
          type: "error",
          text: data.error || data.message || "Gagal menyinkronkan slip gaji.",
        });
        setTimeout(() => setSyncState("idle"), 3000);
      }
    } catch {
      setSyncState("error");
      showToast({
        type: "error",
        text: "Terjadi kesalahan jaringan saat menyinkronkan slip gaji.",
      });
      setTimeout(() => setSyncState("idle"), 3000);
    }
  };

  const renderSyncButtonContent = () => {
    switch (syncState) {
      case "checking":
        return (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-stone-500" />
            <span className="hidden sm:inline">Memeriksa...</span>
          </>
        );
      case "syncing":
        return (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-green-600" />
            <span className="hidden sm:inline">Menyinkronkan...</span>
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
            <span className="hidden sm:inline">Tersinkron</span>
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="hidden sm:inline">Gagal Sinkron</span>
          </>
        );
      case "redirecting":
        return (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span className="hidden sm:inline">Mengarahkan...</span>
          </>
        );
      default:
        return (
          <>
            <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
            <span className="hidden sm:inline">
              {sheetsStatus?.connected ? "Sinkronisasi Sheets" : "Hubungkan Sheets"}
            </span>
            <span className="sm:hidden">Sheets</span>
          </>
        );
    }
  };

  const isSyncing =
    syncState === "syncing" ||
    syncState === "checking" ||
    syncState === "redirecting";

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-sm border transition-all",
            toast.type === "success" &&
              "bg-green-50 border-green-200 text-green-800",
            toast.type === "error" &&
              "bg-red-50 border-red-200 text-red-800",
            toast.type === "info" &&
              "bg-blue-50 border-blue-200 text-blue-800"
          )}
        >
          {toast.type === "success" && (
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
          )}
          {toast.type === "error" && (
            <AlertCircle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
          )}
          {toast.type === "info" && (
            <Loader2 className="h-4 w-4 mt-0.5 text-blue-500 shrink-0 animate-spin" />
          )}
          <div className="flex-1">
            <span>{toast.text}</span>
            {toast.url && (
              <div className="mt-1">
                <a
                  href={toast.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 underline hover:text-green-900"
                >
                  <ExternalLink className="h-3 w-3" />
                  Buka Spreadsheet Slip Gaji
                </a>
              </div>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Dynamic Summary */}
      <PayrollSummary payrolls={currentPayrolls} />

      {/* Filter toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              id="payroll-search"
              placeholder="Cari nama / ID karyawan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-40 h-9" id="payroll-position-filter">
              <SelectValue placeholder="Semua Jabatan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jabatan</SelectItem>
              {positions.map((pos) => (
                <SelectItem key={pos.id} value={pos.code}>
                  {pos.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sinkron Sheets & Buka Spreadsheet Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs shadow-sm bg-white border-stone-300"
              onClick={handleSinkronSheets}
              disabled={isSyncing}
              id="sync-slip-gaji-sheets-btn"
              title={
                sheetsStatus?.connected
                  ? `Sinkronkan slip gaji ke Google Sheets${sheetsStatus.googleAccountEmail ? ` (${sheetsStatus.googleAccountEmail})` : ""}`
                  : "Hubungkan akun Google untuk mengaktifkan sinkronisasi Sheets"
              }
            >
              {renderSyncButtonContent()}
            </Button>

            {/* Buka Spreadsheet button — only shown when slipGajiSpreadsheetId/url exists */}
            {(spreadsheetUrl ||
              sheetsStatus?.slipGajiSpreadsheetUrl ||
              (sheetsStatus?.slipGajiSpreadsheetId
                ? `https://docs.google.com/spreadsheets/d/${sheetsStatus.slipGajiSpreadsheetId}/edit`
                : null)) && (
              <a
                href={
                  spreadsheetUrl ||
                  sheetsStatus?.slipGajiSpreadsheetUrl ||
                  `https://docs.google.com/spreadsheets/d/${sheetsStatus?.slipGajiSpreadsheetId}/edit`
                }
                target="_blank"
                rel="noopener noreferrer"
                title="Buka Spreadsheet Slip Gaji"
                className="h-9 px-2.5 inline-flex items-center justify-center gap-1 rounded-md border border-stone-300 bg-white shadow-sm text-xs font-medium text-stone-600 hover:text-green-700 hover:border-green-300 hover:bg-green-50 transition-colors shrink-0"
                id="open-slip-gaji-sheets-btn"
              >
                <span className="hidden sm:inline">Buka Spreadsheet</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <Button
            variant="brand"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={handleRecalculateAndSaveAll}
            disabled={isRecalculating}
            id="recalculate-payroll-btn"
          >
            {isRecalculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan ke DB...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Hitung Ulang &amp; Simpan</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Table - Desktop */}
      <div className="hidden lg:block rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[1020px]">
            <thead>
              <tr>
                <th className="whitespace-nowrap">Karyawan</th>
                <th className="whitespace-nowrap">Jabatan</th>
                <th className="whitespace-nowrap">Gaji Pokok</th>
                <th className="whitespace-nowrap">Jam Reguler</th>
                <th className="whitespace-nowrap">Jam Keterlambatan</th>
                <th className="whitespace-nowrap">Denda Keterlambatan</th>
                <th className="whitespace-nowrap">Lembur</th>
                <th className="whitespace-nowrap">Denda List Job</th>
                <th className="whitespace-nowrap">Total Gaji Diterima</th>
                <th className="text-right whitespace-nowrap min-w-[190px]">Slip Gaji</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-12 text-[var(--muted-foreground)]"
                  >
                    Data karyawan payroll tidak ditemukan
                  </td>
                </tr>
              ) : (
                filtered.map(({ employee, payroll, lateStats, jobStats }) => (
                  <tr key={employee.id}>
                    {/* 1. Karyawan */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-coffee-100 text-coffee-800 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(employee.name)}
                        </div>
                        <div>
                          <span className="font-semibold text-stone-900 text-sm block whitespace-nowrap">
                            {employee.name}
                          </span>
                          <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
                            {employee.employeeCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Jabatan */}
                    <td>
                      <Badge variant="brand" className="text-xs font-normal whitespace-nowrap">
                        {getPositionName(employee.position)}
                      </Badge>
                    </td>

                    {/* 3. Gaji Pokok */}
                    <td className="text-sm text-stone-800 font-medium whitespace-nowrap">
                      {formatRupiah(employee.baseSalary)}
                    </td>

                    {/* 4. Jam Reguler */}
                    <td className="text-sm text-stone-700 whitespace-nowrap font-medium">
                      {payroll.regularHours} Jam
                    </td>

                    {/* 5. Jam Keterlambatan */}
                    <td className="whitespace-nowrap">
                      {lateStats.totalLateMinutes > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          {formatLateMinutesReadable(lateStats.totalLateMinutes)}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">0m</span>
                      )}
                    </td>

                    {/* 6. Denda Keterlambatan */}
                    <td className="text-sm whitespace-nowrap">
                      {(payroll.latePenalty || 0) + (payroll.repeatedLatePenalty || 0) > 0 ? (
                        <span className="font-semibold text-red-600">
                          {formatRupiah(
                            (payroll.latePenalty || 0) + (payroll.repeatedLatePenalty || 0)
                          )}
                        </span>
                      ) : (
                        <span className="text-stone-400">Rp 0</span>
                      )}
                    </td>

                    {/* 7. Lembur */}
                    <td className="text-sm whitespace-nowrap">
                      {payroll.overtimeHours > 0 ? (
                        <span className="font-medium text-amber-700">
                          +{payroll.overtimeHours} Jam ({formatRupiah(payroll.overtimePay)})
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* 8. Denda List Job */}
                    <td className="text-sm whitespace-nowrap">
                      {(payroll.jobPenalty || 0) > 0 ? (
                        <span className="font-semibold text-red-600">
                          {formatRupiah(payroll.jobPenalty || 0)}
                        </span>
                      ) : (
                        <span className="text-stone-400">Rp 0</span>
                      )}
                    </td>

                    {/* 9. Total Gaji Diterima */}
                    <td className="text-sm font-bold text-stone-900 whitespace-nowrap font-mono">
                      {formatRupiah(payroll.netSalary)}
                    </td>

                    {/* 10. Slip Gaji Actions */}
                    <td className="text-right whitespace-nowrap min-w-[190px]">
                      <div className="flex items-center justify-end gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs text-stone-700 hover:text-stone-900 shrink-0"
                          onClick={() => setEditEmployee(employee)}
                          title="Input attendance & checklist list job"
                        >
                          <Pencil className="h-3.5 w-3.5 shrink-0" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="brand"
                          size="sm"
                          className="h-8 gap-1 text-xs shrink-0"
                          onClick={() => setSelectedPayroll(payroll)}
                          title="Buka pratinjau slip gaji"
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          <span>Lihat Slip</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile & Tablet */}
      <div className="lg:hidden space-y-3">
        {filtered.map(({ employee, payroll, lateStats, jobStats }) => (
          <div
            key={employee.id}
            className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-coffee-100 text-coffee-800 flex items-center justify-center text-xs font-bold">
                  {getInitials(employee.name)}
                </div>
                <div>
                  <p className="font-semibold text-stone-800 text-sm">
                    {employee.name}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {getPositionName(employee.position)} • {employee.employeeCode}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-stone-900 font-mono">
                {formatRupiah(employee.baseSalary)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--muted)] p-3 rounded-lg">
              <div>
                <span className="text-[var(--muted-foreground)]">Jam Reguler:</span>{" "}
                <strong className="text-stone-800">{payroll.regularHours} Jam</strong>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Lembur:</span>{" "}
                <strong className="text-amber-700">
                  {payroll.overtimeHours > 0 ? `+${payroll.overtimeHours} Jam` : "—"}
                </strong>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Terlambat:</span>{" "}
                <strong className="text-amber-800">
                  {formatLateMinutesReadable(lateStats.totalLateMinutes)}
                </strong>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Denda Terlambat:</span>{" "}
                <strong className="text-red-600">
                  {formatRupiah(
                    (payroll.latePenalty || 0) + (payroll.repeatedLatePenalty || 0)
                  )}
                </strong>
              </div>
              <div className="col-span-2 flex justify-between border-t border-[var(--border)] pt-1.5 mt-0.5">
                <span className="text-[var(--muted-foreground)]">Denda List Job:</span>
                <strong className="text-red-600 font-semibold">
                  {formatRupiah(payroll.jobPenalty || 0)}
                </strong>
              </div>
              <div className="col-span-2 flex justify-between border-t border-[var(--border)] pt-1.5 mt-0.5 bg-brand-50/50 -mx-3 -mb-3 p-3 rounded-b-lg">
                <span className="font-bold text-stone-900">Total Gaji Diterima:</span>
                <strong className="text-stone-900 font-bold font-mono">
                  {formatRupiah(payroll.netSalary)}
                </strong>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-xs text-stone-700"
                onClick={() => setEditEmployee(employee)}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Slip Gaji</span>
              </Button>
              <Button
                variant="brand"
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => setSelectedPayroll(payroll)}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Lihat Slip</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Dialogs */}
      {editEmployee && (
        <EditPayrollModal
          open={Boolean(editEmployee)}
          onClose={() => setEditEmployee(null)}
          employee={editEmployee}
          period="2026-08"
        />
      )}

      {selectedPayroll && (
        <PayslipModal
          open={Boolean(selectedPayroll)}
          onClose={() => setSelectedPayroll(null)}
          payroll={selectedPayroll}
        />
      )}
    </div>
  );
}
