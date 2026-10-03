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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, AlertTriangle, Trash2 } from "lucide-react";
import { useCafe } from "@/lib/store/cafe-context";
import type { Schedule } from "@/types";

// ============================================================
// TYPES & HELPERS
// ============================================================

type LeaveStatus = "CUTI" | "IZIN" | "LIBUR";

const STATUS_LABELS: Record<LeaveStatus, string> = {
  CUTI: "Cuti",
  IZIN: "Izin",
  LIBUR: "Libur",
};

function normalizeLeaveStatus(status?: string | null): LeaveStatus {
  if (status === "CUTI" || status === "IZIN" || status === "LIBUR") return status;
  return "CUTI";
}

function isWorkStatus(status?: string | null): boolean {
  return (
    status === "KERJA" ||
    status === "BEKERJA" ||
    status === "TERJADWAL" ||
    status === "TERLAMBAT"
  );
}

// ============================================================
// PROPS
// ============================================================

interface LeaveFormProps {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  /** Existing leave schedule record — required for edit mode */
  schedule?: Schedule;
  defaultDate?: string;
  defaultEmployeeId?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function LeaveForm({
  open,
  onClose,
  mode,
  schedule,
  defaultDate = "",
  defaultEmployeeId = "",
}: LeaveFormProps) {
  const {
    employees,
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    getPositionName,
  } = useCafe();

  // Form state
  const [employeeId, setEmployeeId] = useState(
    schedule?.employeeId ?? defaultEmployeeId
  );
  const [date, setDate] = useState(schedule?.date ?? defaultDate);
  const [status, setStatus] = useState<LeaveStatus>(
    normalizeLeaveStatus(schedule?.status)
  );
  const [notes, setNotes] = useState(schedule?.notes ?? "");

  // UI states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Re-sync when modal opens or props change
  useEffect(() => {
    if (open) {
      setEmployeeId(schedule?.employeeId ?? defaultEmployeeId);
      setDate(schedule?.date ?? defaultDate);
      setStatus(normalizeLeaveStatus(schedule?.status));
      setNotes(schedule?.notes ?? "");
      setErrorMessage("");
      setShowDeleteConfirm(false);
    }
  }, [open, schedule, defaultDate, defaultEmployeeId]);

  // --------------------------------------------------------
  // Conflict detection from context (schedules)
  // --------------------------------------------------------
  const conflictSchedule =
    mode === "add" && employeeId && date
      ? (schedules.find(
          (s) =>
            s.employeeId === employeeId &&
            s.date === date &&
            s.id !== schedule?.id
        ) ?? null)
      : null;

  const conflictIsWork = conflictSchedule !== null && isWorkStatus(conflictSchedule.status);
  const conflictIsLeave =
    conflictSchedule !== null &&
    (conflictSchedule.status === "CUTI" ||
      conflictSchedule.status === "IZIN" ||
      conflictSchedule.status === "LIBUR");

  const conflictEmployee = conflictSchedule
    ? employees.find((e) => e.id === conflictSchedule.employeeId)
    : null;

  // --------------------------------------------------------
  // Handlers
  // --------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      if (!employeeId) {
        setErrorMessage("Karyawan wajib dipilih.");
        setSaving(false);
        return;
      }
      if (!date) {
        setErrorMessage("Tanggal wajib diisi.");
        setSaving(false);
        return;
      }

      let res;

      if (mode === "edit" && schedule) {
        // Update existing leave record (status, notes)
        res = await updateSchedule(schedule.id, {
          status,
          notes,
          startTime: null,
          endTime: null,
          isOvernight: false,
        });
      } else if (conflictSchedule) {
        // Replace existing record (KERJA → leave, or leave → different leave)
        // Update the SAME record to preserve unique constraint
        res = await updateSchedule(conflictSchedule.id, {
          status,
          notes,
          startTime: null,
          endTime: null,
          isOvernight: false,
        });
      } else {
        // Create brand-new leave record
        res = await addSchedule({
          employeeId,
          date,
          status,
          notes,
          startTime: null,
          endTime: null,
          isOvernight: false,
        });
      }

      if (!res.success) {
        setErrorMessage(res.error || "Gagal menyimpan status.");
        setSaving(false);
        return;
      }

      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;
    setDeleting(true);
    setErrorMessage("");
    try {
      const res = await deleteSchedule(schedule.id);
      if (!res.success) {
        setErrorMessage(res.error || "Gagal menghapus status.");
        setDeleting(false);
        return;
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan saat menghapus.");
    } finally {
      setDeleting(false);
    }
  };

  // Dynamic button label
  const submitLabel = (): string => {
    if (saving) return "Menyimpan...";
    if (mode === "edit") return "Simpan Perubahan";
    if (conflictIsWork) return `Tetapkan ${STATUS_LABELS[status]}`;
    if (conflictIsLeave) return "Perbarui Status";
    return "Simpan";
  };

  const submitVariant = (): "brand" | "destructive" => {
    if (conflictIsWork) return "brand";
    return "brand";
  };

  const activeEmployees = employees.filter((e) => e.status !== "INACTIVE");

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Atur Libur / Izin" : "Edit Libur / Izin"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Tetapkan status cuti, izin, atau libur untuk karyawan pada tanggal tertentu."
              : `Edit status non-kerja — ${schedule?.employeeName}`}
          </DialogDescription>
        </DialogHeader>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Conflict: KERJA will be replaced — custom confirmation warning */}
        {mode === "add" && conflictIsWork && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              <strong>{conflictEmployee?.name ?? "Karyawan"}</strong> sudah
              memiliki jadwal kerja
              {conflictSchedule?.startTime && conflictSchedule?.endTime
                ? ` ${conflictSchedule.startTime}–${conflictSchedule.endTime}`
                : ""}{" "}
              pada tanggal ini. Menetapkan{" "}
              <strong>{STATUS_LABELS[status]}</strong> akan mengganti jadwal
              kerja pada tanggal ini.
            </span>
          </div>
        )}

        {/* Conflict: existing leave will be updated */}
        {mode === "add" && conflictIsLeave && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
            <span>
              Karyawan sudah memiliki status{" "}
              <strong>{conflictSchedule?.status}</strong> pada tanggal ini.
              Menyimpan akan memperbarui status tersebut.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Karyawan */}
          <div className="space-y-1.5">
            <label
              htmlFor="leave-employee"
              className="text-sm font-medium text-stone-700"
            >
              Karyawan <span className="text-red-500">*</span>
            </label>
            <Select
              value={employeeId}
              onValueChange={(v) => {
                setEmployeeId(v);
                setErrorMessage("");
              }}
              disabled={mode === "edit"}
              required
            >
              <SelectTrigger id="leave-employee">
                <SelectValue placeholder="Pilih karyawan" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <span className="flex items-center gap-2">
                      <span>{emp.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        — {getPositionName(emp.position)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal */}
          <div className="space-y-1.5">
            <label
              htmlFor="leave-date"
              className="text-sm font-medium text-stone-700"
            >
              Tanggal <span className="text-red-500">*</span>
            </label>
            <Input
              id="leave-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrorMessage("");
              }}
              disabled={mode === "edit"}
              required
            />
          </div>

          {/* Status Hari — CUTI / IZIN / LIBUR only */}
          <div className="space-y-1.5">
            <label
              htmlFor="leave-status"
              className="text-sm font-medium text-stone-700"
            >
              Status Hari <span className="text-red-500">*</span>
            </label>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as LeaveStatus);
                setErrorMessage("");
              }}
              required
            >
              <SelectTrigger id="leave-status">
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUTI">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span>Cuti</span>
                  </span>
                </SelectItem>
                <SelectItem value="IZIN">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Izin</span>
                  </span>
                </SelectItem>
                <SelectItem value="LIBUR">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-stone-400" />
                    <span>Libur</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Catatan / Alasan */}
          <div className="space-y-1.5">
            <label
              htmlFor="leave-notes"
              className="text-sm font-medium text-stone-700"
            >
              Catatan / Alasan{" "}
              <span className="text-stone-400 font-normal text-xs">
                (opsional)
              </span>
            </label>
            <textarea
              id="leave-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                status === "CUTI"
                  ? "Contoh: Cuti keluarga, Cuti tahunan"
                  : status === "IZIN"
                  ? "Contoh: Izin sakit, Izin urusan penting"
                  : "Contoh: Libur mingguan"
              }
              rows={2}
              className="flex w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-stone-800 shadow-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 resize-none"
            />
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2">
            {/* Edit mode: Hapus Status with confirmation */}
            {mode === "edit" && showDeleteConfirm && (
              <div className="mr-auto flex items-center gap-2">
                <span className="text-xs text-red-700 font-medium">
                  Hapus status ini?
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="h-8 text-xs"
                >
                  {deleting ? "Menghapus..." : "Ya, Hapus"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-8 text-xs"
                >
                  Batal
                </Button>
              </div>
            )}

            {mode === "edit" && !showDeleteConfirm && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus Status
              </Button>
            )}

            {!showDeleteConfirm && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={saving || deleting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant={submitVariant()}
                  disabled={saving || deleting}
                  id="leave-save-btn"
                >
                  {submitLabel()}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
