"use client";

import React, { useState, useEffect } from "react";
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
import { Clock, Save, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Employee, Schedule, AttendanceEntry } from "@/types";
import { formatDate, getDayName } from "@/lib/utils";
import { calculateLateMinutes, formatLateMinutesReadable } from "@/lib/calculations/payroll";

interface EditAttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  schedule: Schedule;
  existingAttendance?: AttendanceEntry | null;
  onSave: (entry: AttendanceEntry) => Promise<void>;
}

export function EditAttendanceDialog({
  open,
  onClose,
  employee,
  schedule,
  existingAttendance,
  onSave,
}: EditAttendanceDialogProps) {
  const [actualStart, setActualStart] = useState<string>("");
  const [actualEnd, setActualEnd] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setActualStart(existingAttendance?.actualStart || schedule.startTime || "");
      setActualEnd(existingAttendance?.actualEnd || schedule.endTime || "");
    }
  }, [open, existingAttendance, schedule]);

  // Hitung live keterlambatan
  const lateMinutes = calculateLateMinutes(schedule.startTime || "08:00", actualStart);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const entryToSave: AttendanceEntry = {
        id: existingAttendance?.id || `att-${schedule.id}`,
        employeeId: employee.id,
        date: schedule.date,
        scheduledStart: existingAttendance?.scheduledStart || schedule.startTime || "08:00",
        scheduledEnd: existingAttendance?.scheduledEnd || schedule.endTime || "16:00",
        actualStart: actualStart || null,
        actualEnd: actualEnd || null,
        jadwalId: schedule.id,
      };

      await onSave(entryToSave);
      onClose();
    } catch (error) {
      console.error("Gagal menyimpan data kehadiran:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const dayName = getDayName(schedule.date);
  const formattedDate = formatDate(schedule.date);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-md p-5 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-[var(--border)]">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-coffee-700" />
                <span>{existingAttendance?.actualStart ? "Edit Kehadiran" : "Catat Kehadiran"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--muted-foreground)] mt-1">
                {employee.name} • {dayName}, {formattedDate}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs text-stone-600 bg-stone-50">
              {employee.employeeCode}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-3">
          {/* Info Jadwal Kerja (Snapshot) */}
          <div className="bg-[var(--color-cream-50)] border border-[var(--border)] rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-stone-500 block font-medium">Jadwal Shift:</span>
              <span className="font-bold text-stone-800 text-sm font-mono mt-0.5">
                {schedule.startTime} – {schedule.endTime}
              </span>
            </div>
            {schedule.isOvernight && (
              <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                Shift Malam (+1 Hari)
              </Badge>
            )}
          </div>

          {/* Input Jam Masuk & Keluar Aktual */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 block">
                Jam Masuk Aktual <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={actualStart}
                onChange={(e) => setActualStart(e.target.value)}
                required
                className="h-9 text-sm font-mono bg-white"
                id="input-actual-start"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 block">
                Jam Keluar Aktual
              </label>
              <Input
                type="time"
                value={actualEnd}
                onChange={(e) => setActualEnd(e.target.value)}
                className="h-9 text-sm font-mono bg-white"
                id="input-actual-end"
              />
            </div>
          </div>

          {/* Status Keterlambatan Realtime */}
          <div className="bg-stone-50 border border-[var(--border-subtle)] rounded-xl p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Evaluasi Keterlambatan:</span>
              {lateMinutes > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <span>Terlambat {formatLateMinutesReadable(lateMinutes)}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Tepat Waktu (Toleransi 10 mnt)</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">
              {lateMinutes > 0
                ? `Masuk pada ${actualStart || "--:--"} (jadwal ${schedule.startTime}). Dihitung selisih penuh ${lateMinutes} menit.`
                : `Masuk pada ${actualStart || "--:--"} masih dalam batas toleransi masuk kafe (0–10 menit).`}
            </p>
          </div>

          <DialogFooter className="pt-2 border-t border-[var(--border)] flex sm:flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="sm"
              disabled={isSaving || !actualStart}
              className="gap-1.5"
              id="submit-attendance-btn"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan Kehadiran</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
