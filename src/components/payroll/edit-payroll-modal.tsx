"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCafe } from "@/lib/store/cafe-context";
import type { Employee, AttendanceEntry, EmployeeJob } from "@/types";
import {
  calculateLateMinutes,
  calculateDailyLatePenalty,
  calculateMonthlyAttendanceLateStats,
  calculateJobPenalty,
  formatLateMinutesReadable,
} from "@/lib/calculations/payroll";
import {
  formatRupiah,
  formatDateShort,
  getEmployeeAttendancePeriod,
} from "@/lib/utils";
import { getScheduleDurationHours } from "@/components/schedules/schedule-block";
import {
  Clock,
  CheckSquare,
  AlertTriangle,
  Save,
  CheckCircle2,
  Calendar,
  Layers,
  Loader2,
} from "lucide-react";

interface EditPayrollModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  period?: string; // "YYYY-MM", e.g. "2026-08"
}

export function EditPayrollModal({
  open,
  onClose,
  employee,
  period = "2026-08",
}: EditPayrollModalProps) {
  const {
    attendances,
    schedules,
    saveAttendances,
    savePayrollSnapshot,
    jobCompletions,
    updateJobCompletions,
    getPositionName,
    cafeProfile,
  } = useCafe();

  const jobPenaltyRate = cafeProfile?.dendaPekerjaanPerJob ?? 5000;

  const [isSaving, setIsSaving] = useState(false);

  // Periode berbasis Tanggal Masuk Karyawan
  const periodInfo = useMemo(() => {
    return getEmployeeAttendancePeriod(employee.joinDate || "2026-08-01", 0);
  }, [employee.joinDate]);

  const { startDateStr, endDateStr, label: periodLabel } = periodInfo;

  // Jadwal karyawan dalam periode aktif (Schedule-First)
  const empSchedules = useMemo(() => {
    return schedules
      .filter(
        (s) =>
          s.employeeId === employee.id &&
          s.date >= startDateStr &&
          s.date <= endDateStr
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [schedules, employee.id, startDateStr, endDateStr]);

  // Local Attendance State derived from Schedules + DB Attendances
  const initialAttList = useMemo(() => {
    const savedAtts = attendances[employee.id] || [];

    if (empSchedules.length > 0) {
      // Map berdasarkan jadwal aktual
      return empSchedules.map((sched) => {
        const existing = savedAtts.find(
          (a) => a.date === sched.date || a.jadwalId === sched.id
        );
        return {
          id: existing?.id || `att-${sched.id}`,
          employeeId: employee.id,
          date: sched.date,
          scheduledStart: existing?.scheduledStart || sched.startTime || "08:00",
          scheduledEnd: existing?.scheduledEnd || sched.endTime || "16:00",
          actualStart: existing ? existing.actualStart : null,
          actualEnd: existing ? existing.actualEnd : null,
          jadwalId: sched.id,
        };
      });
    }

    // Jika belum ada jadwal tetapi ada data kehadiran
    if (savedAtts.length > 0) {
      return savedAtts
        .filter((a) => a.date >= startDateStr && a.date <= endDateStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return [];
  }, [attendances, empSchedules, employee.id, startDateStr, endDateStr]);

  const [attList, setAttList] = useState<AttendanceEntry[]>(initialAttList);

  // Local Job Checklist State
  const initialCompletions = useMemo(() => {
    return jobCompletions[employee.id] || {};
  }, [jobCompletions, employee.id]);

  const [completions, setCompletions] =
    useState<Record<string, boolean>>(initialCompletions);

  // Sync if initial props/state change
  React.useEffect(() => {
    setAttList(initialAttList);
    setCompletions(initialCompletions);
  }, [initialAttList, initialCompletions]);

  const employeeJobs: EmployeeJob[] = employee.jobs || [];

  // Handle Attendance changes
  const handleTimeChange = (
    index: number,
    field: "actualStart" | "actualEnd",
    value: string
  ) => {
    setAttList((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value || null,
      };
      return next;
    });
  };

  // Handle Job Checkbox
  const handleToggleJob = (jobId: string) => {
    setCompletions((prev) => ({
      ...prev,
      [jobId]: prev[jobId] === undefined ? false : !prev[jobId],
    }));
  };

  // Calculations
  const lateStats = useMemo(() => {
    return calculateMonthlyAttendanceLateStats(attList);
  }, [attList]);

  const completedJobCount = useMemo(() => {
    if (employeeJobs.length === 0) return 0;
    return employeeJobs.filter((j) => completions[j.id] !== false).length;
  }, [employeeJobs, completions]);

  const jobStats = useMemo(() => {
    return calculateJobPenalty(employeeJobs.length, completedJobCount, jobPenaltyRate);
  }, [employeeJobs.length, completedJobCount, jobPenaltyRate]);

  // Normal Daily Hours from Configurable Employee Setting (default 8)
  const normalDailyHours = employee.dailyWorkingHours || employee.jamKerjaHarian || 8;

  // Calculate live regular hours & overtime hours from Jadwal
  const { regularHours, overtimeHours } = useMemo(() => {
    let totalReg = 0;
    let totalOt = 0;

    for (const s of empSchedules) {
      const duration = getScheduleDurationHours(
        s.startTime,
        s.endTime,
        s.breakMinutes || 0
      );
      const dailyReg = Math.min(duration, normalDailyHours);
      const dailyOt = Math.max(0, duration - normalDailyHours);
      totalReg += dailyReg;
      totalOt += dailyOt;
    }

    return {
      regularHours: totalReg > 0 ? Math.round(totalReg) : 168,
      overtimeHours: Math.round(totalOt),
    };
  }, [empSchedules, normalDailyHours]);

  const overtimePay = overtimeHours * (employee.hourlyRate || 25000);
  const allowance = 200000;
  const standardDeduction = 50000;
  const grossSalary = employee.baseSalary + overtimePay + allowance;
  const totalDeductions =
    standardDeduction + lateStats.totalLatePenalty + jobStats.penalty;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (attList.length > 0) {
        await saveAttendances(employee.id, attList);
      }
      updateJobCompletions(employee.id, completions);

      // Save complete snapshot to PostgreSQL
      await savePayrollSnapshot({
        employeeId: employee.id,
        period: "2026-08",
        employeeName: employee.name,
        employeePosition: employee.position,
        regularHours,
        overtimeHours,
        baseSalary: employee.baseSalary,
        overtimePay,
        allowance,
        deduction: standardDeduction,
        totalLateMinutes: lateStats.totalLateMinutes,
        latePenalty: lateStats.dailyPenaltySum,
        repeatedLatePenalty: lateStats.repeatedPenalty,
        jobPenalty: jobStats.penalty,
        completedJobsCount: completedJobCount,
        totalJobsCount: employeeJobs.length,
        grossSalary,
        netSalary,
        status: "CALCULATED",
        jobCompletions: completions,
      });

      onClose();
    } catch (err) {
      console.error("Gagal menyimpan data kehadiran dan payroll:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-2 border-b border-[var(--border)]">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-stone-900">
                Edit Slip Gaji — {employee.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {getPositionName(employee.position)} • Periode {periodLabel} ({employee.employeeCode}) • Standar: {normalDailyHours} jam/hari
              </DialogDescription>
            </div>
            <Badge variant="brand" className="text-xs shrink-0">
              {periodLabel}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-6 pr-1">
          {/* ======================================================== */}
          {/* SECTION 1: ATTENDANCE & KETERLAMBATAN                   */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-coffee-700" />
                Attendance &amp; Jam Masuk Aktual
              </h3>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                Toleransi: 10 menit
              </span>
            </div>

            <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100/80 border-b border-[var(--border)] text-stone-600 font-semibold">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Jadwal</th>
                      <th className="py-2.5 px-3">Masuk Aktual</th>
                      <th className="py-2.5 px-3">Keluar Aktual</th>
                      <th className="py-2.5 px-3">Keterlambatan</th>
                      <th className="py-2.5 px-3 text-right">Denda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {attList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-8 text-stone-500 font-medium"
                        >
                          Belum ada jadwal kerja untuk karyawan ini pada periode {periodLabel}.
                        </td>
                      </tr>
                    ) : (
                      attList.map((item, idx) => {
                        const late = calculateLateMinutes(
                          item.scheduledStart,
                          item.actualStart
                        );
                        const dailyDenda = calculateDailyLatePenalty(late);

                        return (
                          <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                            <td className="py-2 px-3 whitespace-nowrap font-medium text-stone-800">
                              {formatDateShort(item.date)}
                            </td>
                            <td className="py-2 px-3 text-stone-600 font-mono whitespace-nowrap">
                              {item.scheduledStart} - {item.scheduledEnd}
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="time"
                                value={item.actualStart || ""}
                                onChange={(e) =>
                                  handleTimeChange(idx, "actualStart", e.target.value)
                                }
                                className="h-7 w-28 text-xs font-mono px-1.5 py-0 bg-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="time"
                                value={item.actualEnd || ""}
                                onChange={(e) =>
                                  handleTimeChange(idx, "actualEnd", e.target.value)
                                }
                                className="h-7 w-28 text-xs font-mono px-1.5 py-0 bg-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              {late > 0 ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    late >= 29
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {late} menit
                                </span>
                              ) : (
                                <span className="text-green-700 font-medium text-[11px]">
                                  Tepat Waktu
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-stone-800 whitespace-nowrap">
                              {dailyDenda > 0 ? (
                                <span className="text-red-600">
                                  {formatRupiah(dailyDenda)}
                                </span>
                              ) : (
                                <span className="text-stone-400">Rp 0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Attendance Summary Bar */}
              <div className="bg-stone-50 p-3 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[var(--muted-foreground)] block">
                    Total Keterlambatan:
                  </span>
                  <strong className="text-stone-800 text-sm">
                    {formatLateMinutesReadable(lateStats.totalLateMinutes)}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)] block">
                    Denda Harian:
                  </span>
                  <strong className="text-stone-800 text-sm">
                    {formatRupiah(lateStats.dailyPenaltySum)}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)] block">
                    Terlambat &ge; 29 mnt:
                  </span>
                  <strong className="text-amber-800 text-sm">
                    {lateStats.count29Plus} kali{" "}
                    {lateStats.repeatedPenalty > 0 && (
                      <span className="text-[10px] text-red-600 font-normal">
                        (+{formatRupiah(lateStats.repeatedPenalty)})
                      </span>
                    )}
                  </strong>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)] block font-semibold">
                    Total Denda Keterlambatan:
                  </span>
                  <strong className="text-red-600 text-sm font-bold">
                    {formatRupiah(lateStats.totalLatePenalty)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: LIST JOB & CHECKLIST PEKERJAAN              */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-coffee-700" />
                List Job &amp; Evaluasi Tugas
              </h3>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                Denda: Rp5.000 / pekerjaan belum selesai
              </span>
            </div>

            <div className="border border-[var(--border)] rounded-xl bg-white p-4 space-y-3 shadow-sm">
              {employeeJobs.length === 0 ? (
                <div className="text-center py-6 text-stone-500 text-xs">
                  Karyawan ini belum memiliki daftar pekerjaan. Buka menu Karyawan &gt; Deskripsi Pekerjaan untuk menambahkan list pekerjaan.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-stone-600 font-medium pb-1 border-b border-[var(--border-subtle)]">
                    Centang pekerjaan yang <strong>selesai</strong> dikerjakan:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {employeeJobs.map((job) => {
                      const isChecked = completions[job.id] !== false; // Default true if not explicitly false
                      return (
                        <label
                          key={job.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isChecked
                              ? "bg-green-50/50 border-green-200 text-stone-800"
                              : "bg-red-50/50 border-red-200 text-red-900"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleJob(job.id)}
                            className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span
                            className={`text-xs select-none ${
                              isChecked
                                ? "font-medium text-stone-800"
                                : "line-through text-red-600 font-semibold"
                            }`}
                          >
                            {job.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Job Summary */}
              <div className="bg-coffee-50/70 p-3 rounded-lg border border-coffee-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-stone-500 block">Pekerjaan Selesai:</span>
                    <strong className="text-green-700 text-sm font-bold">
                      {jobStats.completedCount} / {jobStats.totalJobs}
                    </strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Tidak Selesai:</span>
                    <strong className="text-red-700 text-sm font-bold">
                      {jobStats.incompleteCount}
                    </strong>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-stone-500 block">Denda List Job:</span>
                  <strong className="text-red-700 text-sm font-bold">
                    {formatRupiah(jobStats.penalty)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Summary & Actions */}
        <DialogFooter className="pt-3 border-t border-[var(--border)] flex sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-600 text-left">
            <span>Total Potongan Denda: </span>
            <strong className="text-red-600 font-bold text-sm">
              {formatRupiah(lateStats.totalLatePenalty + jobStats.penalty)}
            </strong>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Batal
            </Button>
            <Button
              variant="brand"
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={isSaving}
              id="save-payroll-attendance"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
