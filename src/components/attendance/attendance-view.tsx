"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCafe } from "@/lib/store/cafe-context";
import type { Employee, Schedule, AttendanceEntry } from "@/types";
import {
  cn,
  formatDateShort,
  getDayName,
  getEmployeeAttendancePeriod,
} from "@/lib/utils";
import {
  calculateLateMinutes,
  formatLateMinutesReadable,
} from "@/lib/calculations/payroll";
import { EditAttendanceDialog } from "./edit-attendance-dialog";

export function AttendanceView() {
  const {
    employees,
    positions,
    schedules,
    attendances,
    saveSingleAttendance,
    getPositionName,
  } = useCafe();

  // Selected Employee
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employees[0]?.id || ""
  );

  // Period offset relative to current period (0 = current, -1 = prev, +1 = next)
  const [periodOffset, setPeriodOffset] = useState<number>(0);

  // Active dialog state
  const [editingTarget, setEditingTarget] = useState<{
    schedule: Schedule;
    attendance?: AttendanceEntry | null;
  } | null>(null);

  // Current active employee object
  const currentEmployee = useMemo(() => {
    return (
      employees.find((e) => e.id === selectedEmployeeId) || employees[0] || null
    );
  }, [employees, selectedEmployeeId]);

  // Set default employee if selected is empty or not in list
  React.useEffect(() => {
    if (!selectedEmployeeId && employees.length > 0) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  // Dynamic attendance period based on employee join date (tanggalMasuk)
  const attendancePeriod = useMemo(() => {
    if (!currentEmployee) {
      return getEmployeeAttendancePeriod("2026-08-01", periodOffset);
    }
    return getEmployeeAttendancePeriod(
      currentEmployee.joinDate || "2026-08-01",
      periodOffset
    );
  }, [currentEmployee, periodOffset]);

  // Reset period offset when changing employee
  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    setPeriodOffset(0);
  };

  // Filter schedules for the selected employee within the active attendance period
  const periodSchedules = useMemo(() => {
    if (!currentEmployee) return [];
    return schedules
      .filter((s) => {
        if (s.employeeId !== currentEmployee.id) return false;
        return (
          s.date >= attendancePeriod.startDateStr &&
          s.date <= attendancePeriod.endDateStr
        );
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [schedules, currentEmployee, attendancePeriod]);

  // Saved attendances for current employee from PostgreSQL
  const employeeSavedAttendances = useMemo(() => {
    if (!currentEmployee) return [];
    return attendances[currentEmployee.id] || [];
  }, [attendances, currentEmployee]);

  // Compute table rows & statistics
  const { tableRows, stats } = useMemo(() => {
    let totalScheduled = periodSchedules.length;
    let presentCount = 0;
    let lateCount = 0;
    let missingCount = 0;
    let totalLateMinutes = 0;

    const rows = periodSchedules.map((schedule) => {
      const isLeave =
        schedule.status === "CUTI" ||
        schedule.status === "IZIN" ||
        schedule.status === "LIBUR";

      const att = employeeSavedAttendances.find((a) => a.date === schedule.date);
      const hasActual = Boolean(att && att.actualStart);

      let status: "HADIR" | "TERLAMBAT" | "BELUM_DIISI" | "CUTI" | "IZIN" | "LIBUR" =
        isLeave ? (schedule.status as "CUTI" | "IZIN" | "LIBUR") : "BELUM_DIISI";
      let lateMins = 0;

      if (isLeave) {
        // Leave days require no clock-in/out and are never late or missing
        status = schedule.status as "CUTI" | "IZIN" | "LIBUR";
      } else if (!hasActual) {
        status = "BELUM_DIISI";
        missingCount++;
      } else {
        lateMins = calculateLateMinutes(
          schedule.startTime || "08:00",
          att!.actualStart
        );
        if (lateMins > 0) {
          status = "TERLAMBAT";
          lateCount++;
          totalLateMinutes += lateMins;
        } else {
          status = "HADIR";
          presentCount++;
        }
      }

      return {
        schedule,
        attendance: att || null,
        status,
        lateMinutes: lateMins,
        isLeave,
      };
    });

    return {
      tableRows: rows,
      stats: {
        totalEmployees: employees.length,
        totalScheduled,
        presentCount,
        lateCount,
        missingCount,
        totalLateMinutes,
      },
    };
  }, [periodSchedules, employeeSavedAttendances, employees.length]);

  const handleSaveAttendance = async (entry: AttendanceEntry) => {
    await saveSingleAttendance(entry);
  };

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 1. COMPACT SUMMARY CARDS                                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Karyawan */}
        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-600 mb-1">
            <span className="text-xs font-medium">Total Karyawan</span>
            <Users className="h-4 w-4 text-stone-400" />
          </div>
          <p className="text-xl font-bold text-stone-900">{stats.totalEmployees}</p>
          <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            Karyawan terdaftar
          </span>
        </div>

        {/* Total Jadwal Shift */}
        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-600 mb-1">
            <span className="text-xs font-medium">Total Jadwal</span>
            <Calendar className="h-4 w-4 text-stone-400" />
          </div>
          <p className="text-xl font-bold text-stone-900">{stats.totalScheduled}</p>
          <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            Hari periode ini
          </span>
        </div>

        {/* Tepat Waktu */}
        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-medium">Tepat Waktu</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-700">{stats.presentCount}</p>
          <span className="text-[10px] text-emerald-600/80 mt-0.5">
            Presensi tepat waktu
          </span>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-xs font-medium">Terlambat</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-700">{stats.lateCount}</p>
          <span className="text-[10px] text-red-600/80 mt-0.5">
            Hari terlambat
          </span>
        </div>

        {/* Total Keterlambatan */}
        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium">Total Terlambat</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-700 font-mono">
            {formatLateMinutesReadable(stats.totalLateMinutes)}
          </p>
          <span className="text-[10px] text-amber-600/80 mt-0.5">
            {stats.totalLateMinutes} menit total
          </span>
        </div>

        {/* Belum Diisi */}
        <div className="bg-white p-3.5 rounded-xl border border-[var(--border)] shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-xs font-medium">Belum Tercatat</span>
            <HelpCircle className="h-4 w-4 text-stone-400" />
          </div>
          <p className="text-xl font-bold text-stone-700">{stats.missingCount}</p>
          <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            Shift belum diisi
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FILTER & EMPLOYEE SELECTOR                                */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1 flex-wrap sm:flex-nowrap">
          {/* Employee Selector */}
          <div className="w-full sm:w-72">
            <label htmlFor="attendance-emp-select" className="text-xs font-medium text-stone-600 block mb-1">
              Pilih Karyawan:
            </label>
            <Select
              value={selectedEmployeeId}
              onValueChange={handleSelectEmployee}
            >
              <SelectTrigger id="attendance-emp-select" className="h-9 bg-stone-50">
                <SelectValue placeholder="Pilih Karyawan" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800">{emp.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)] font-mono">
                        ({emp.employeeCode})
                      </span>
                      <span className="text-xs text-stone-500">
                        — {getPositionName(emp.position)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Period Navigation */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="flex items-center rounded-xl border border-[var(--border)] bg-white p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 text-stone-600"
              onClick={() => setPeriodOffset((prev) => prev - 1)}
              title="Periode Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs font-bold text-stone-800">
              {attendancePeriod.label}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 text-stone-600"
              onClick={() => setPeriodOffset((prev) => prev + 1)}
              title="Periode Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!attendancePeriod.isCurrent && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setPeriodOffset(0)}
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. ATTENDANCE TABLE                                          */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100/80 border-b border-[var(--border)] text-stone-700 font-semibold">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Hari</th>
                <th className="py-3 px-4">Jadwal Shift</th>
                <th className="py-3 px-4">Aktual Masuk</th>
                <th className="py-3 px-4">Aktual Keluar</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Keterlambatan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-[var(--muted-foreground)] font-medium"
                  >
                    Tidak ada jadwal kerja untuk {currentEmployee?.name || "karyawan ini"} pada periode{" "}
                    <strong>{attendancePeriod.label}</strong>.
                  </td>
                </tr>
              ) : (
                tableRows.map(({ schedule, attendance, status, lateMinutes, isLeave }) => {
                  const hasActual = Boolean(attendance && attendance.actualStart);

                  return (
                    <tr
                      key={schedule.id}
                      className="hover:bg-stone-50/70 transition-colors"
                    >
                      {/* Tanggal */}
                      <td className="py-3 px-4 font-medium text-stone-900 whitespace-nowrap">
                        {formatDateShort(schedule.date)}
                      </td>

                      {/* Hari */}
                      <td className="py-3 px-4 text-stone-600 font-medium whitespace-nowrap">
                        {getDayName(schedule.date)}
                      </td>

                      {/* Jadwal */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isLeave ? (
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded border",
                              schedule.status === "CUTI"
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : schedule.status === "IZIN"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-stone-100 text-stone-700 border-stone-200"
                            )}
                          >
                            {schedule.status} {schedule.notes ? `• ${schedule.notes}` : ""}
                          </span>
                        ) : (
                          <>
                            <span className="font-mono text-stone-800 font-semibold">
                              {schedule.startTime} – {schedule.endTime}
                            </span>
                            {schedule.isOvernight && (
                              <span className="ml-1.5 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                +1H
                              </span>
                            )}
                          </>
                        )}
                      </td>

                      {/* Aktual Masuk */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        {isLeave ? (
                          <span className="text-stone-400 font-normal">—</span>
                        ) : attendance?.actualStart ? (
                          <strong className="text-stone-900">{attendance.actualStart}</strong>
                        ) : (
                          <span className="text-stone-400 font-normal">--:--</span>
                        )}
                      </td>

                      {/* Aktual Keluar */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        {isLeave ? (
                          <span className="text-stone-400 font-normal">—</span>
                        ) : attendance?.actualEnd ? (
                          <span className="text-stone-800">{attendance.actualEnd}</span>
                        ) : (
                          <span className="text-stone-400 font-normal">--:--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {status === "CUTI" ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border border-purple-300 font-semibold text-[11px]">
                            Cuti
                          </Badge>
                        ) : status === "IZIN" ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-300 font-semibold text-[11px]">
                            Izin
                          </Badge>
                        ) : status === "LIBUR" ? (
                          <Badge className="bg-stone-100 text-stone-700 hover:bg-stone-100 border border-stone-300 font-semibold text-[11px]">
                            Libur
                          </Badge>
                        ) : status === "HADIR" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-semibold gap-1 text-[11px]">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Hadir</span>
                          </Badge>
                        ) : status === "TERLAMBAT" ? (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-300 font-semibold gap-1 text-[11px]">
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            <span>Terlambat</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-200 font-medium text-[11px] gap-1">
                            <HelpCircle className="h-3 w-3 text-amber-600" />
                            <span>Belum Diisi</span>
                          </Badge>
                        )}
                      </td>

                      {/* Keterlambatan */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isLeave ? (
                          <span className="text-stone-400">—</span>
                        ) : lateMinutes > 0 ? (
                          <span className="font-semibold text-red-600 font-mono">
                            {formatLateMinutesReadable(lateMinutes)}
                          </span>
                        ) : hasActual ? (
                          <span className="text-emerald-700 font-medium text-xs">
                            Tepat Waktu
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isLeave ? (
                          <span className="text-[11px] text-stone-400 font-medium px-2 py-1">
                            {schedule.status}
                          </span>
                        ) : (
                          <Button
                            variant={hasActual ? "outline" : "brand"}
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1"
                            onClick={() =>
                              setEditingTarget({
                                schedule,
                                attendance,
                              })
                            }
                            title={
                              hasActual
                                ? "Edit data kehadiran tanggal ini"
                                : "Catat kehadiran jam masuk & keluar"
                            }
                          >
                            {hasActual ? (
                              <>
                                <Pencil className="h-3 w-3" />
                                <span>Edit</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" />
                                <span>Catat</span>
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. MODAL DIALOG EDIT / ISI KEHADIRAN                         */}
      {/* ============================================================ */}
      {editingTarget && currentEmployee && (
        <EditAttendanceDialog
          open={Boolean(editingTarget)}
          onClose={() => setEditingTarget(null)}
          employee={currentEmployee}
          schedule={editingTarget.schedule}
          existingAttendance={editingTarget.attendance}
          onSave={handleSaveAttendance}
        />
      )}
    </div>
  );
}
