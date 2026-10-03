"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { type Schedule } from "@/types";
import { Trash2, AlertCircle } from "lucide-react";
import { useCafe } from "@/lib/store/cafe-context";
import { formatDate, getDayName } from "@/lib/utils";

interface ScheduleFormProps {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  schedule?: Schedule;
  defaultDate?: string;
  defaultEmployeeId?: string;
  defaultTime?: string;
}

export function ScheduleForm({
  open,
  onClose,
  mode,
  schedule,
  defaultDate = "",
  defaultEmployeeId = "",
  defaultTime = "",
}: ScheduleFormProps) {
  const {
    employees,
    schedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    deleteSchedulesByDate,
    getPositionName,
  } = useCafe();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [formData, setFormData] = useState(() => ({
    employeeId: schedule?.employeeId ?? defaultEmployeeId,
    date: schedule?.date ?? defaultDate,
    startTime: schedule?.startTime ?? (defaultTime || "08:00"),
    endTime: schedule?.endTime ?? "16:00",
    breakMinutes: String(schedule?.breakMinutes ?? 0),
    notes: schedule?.notes ?? "",
  }));

  // Re-sync form state when modal opens or props change
  React.useEffect(() => {
    if (open) {
      setFormData({
        employeeId: schedule?.employeeId ?? defaultEmployeeId,
        date: schedule?.date ?? defaultDate,
        startTime: schedule?.startTime ?? (defaultTime || "08:00"),
        endTime: schedule?.endTime ?? "16:00",
        breakMinutes: String(schedule?.breakMinutes ?? 0),
        notes: schedule?.notes ?? "",
      });
      setErrorMessage("");
    }
  }, [open, schedule, defaultDate, defaultEmployeeId, defaultTime]);

  const update = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      if (!formData.employeeId) {
        setErrorMessage("Karyawan wajib dipilih.");
        setSaving(false);
        return;
      }
      if (!formData.date) {
        setErrorMessage("Tanggal wajib diisi.");
        setSaving(false);
        return;
      }
      if (!formData.startTime || !formData.endTime) {
        setErrorMessage("Jam mulai dan jam selesai wajib diisi.");
        setSaving(false);
        return;
      }

      // Check if employee already has a CUTI/IZIN/LIBUR on that date
      if (mode === "add") {
        const existingLeave = schedules.find(
          (s) =>
            s.employeeId === formData.employeeId &&
            s.date === formData.date &&
            (s.status === "CUTI" || s.status === "IZIN" || s.status === "LIBUR")
        );
        if (existingLeave) {
          setErrorMessage(
            `Karyawan berstatus ${existingLeave.status} pada tanggal ini. Hapus atau ubah status Libur/Izin terlebih dahulu.`
          );
          setSaving(false);
          return;
        }
      }

      const payload = {
        employeeId: formData.employeeId,
        date: formData.date,
        status: "KERJA",
        startTime: formData.startTime,
        endTime: formData.endTime,
        notes: formData.notes,
      };

      if (mode === "add") {
        const res = await addSchedule(payload);
        if (!res.success) {
          setErrorMessage(res.error || "Gagal membuat jadwal.");
          setSaving(false);
          return;
        }
      } else if (schedule) {
        const res = await updateSchedule(schedule.id, payload);
        if (!res.success) {
          setErrorMessage(res.error || "Gagal memperbarui jadwal.");
          setSaving(false);
          return;
        }
      }

      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan saat menyimpan jadwal.");
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
        setErrorMessage(res.error || "Gagal menghapus jadwal.");
        setDeleting(false);
        return;
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan saat menghapus jadwal.");
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmResetDay = async () => {
    if (!formData.date) return;
    setIsResetting(true);
    try {
      const res = await deleteSchedulesByDate(formData.date);
      if (res.success) {
        setIsResetDialogOpen(false);
        onClose();
      } else {
        setErrorMessage(res.error || "Gagal mereset jadwal hari.");
      }
    } catch (err) {
      console.error("Gagal reset hari:", err);
      setErrorMessage("Terjadi kesalahan saat mereset jadwal hari.");
    } finally {
      setIsResetting(false);
    }
  };

  const activeEmployees = employees.filter((e) => e.status !== "INACTIVE");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Tambah Jadwal Kerja" : "Edit Jadwal Kerja"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Atur shift kerja harian untuk karyawan."
              : `Edit shift kerja — ${schedule?.employeeName}`}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee */}
          <div className="space-y-1.5">
            <label htmlFor="sched-employee" className="text-sm font-medium text-stone-700">
              Karyawan <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.employeeId}
              onValueChange={(v) => update("employeeId", v)}
              required
            >
              <SelectTrigger id="sched-employee">
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

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="sched-date" className="text-sm font-medium text-stone-700">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <Input
              id="sched-date"
              type="date"
              value={formData.date}
              onChange={(e) => update("date", e.target.value)}
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50/80 rounded-xl border border-[var(--border)]">
            <div className="space-y-1.5">
              <label htmlFor="sched-start" className="text-sm font-medium text-stone-700">
                Jam Mulai <span className="text-red-500">*</span>
              </label>
              <Input
                id="sched-start"
                type="time"
                value={formData.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sched-end" className="text-sm font-medium text-stone-700">
                Jam Selesai <span className="text-red-500">*</span>
              </label>
              <Input
                id="sched-end"
                type="time"
                value={formData.endTime}
                onChange={(e) => update("endTime", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="sched-notes" className="text-sm font-medium text-stone-700">
              Catatan <span className="text-stone-400 font-normal text-xs">(opsional)</span>
            </label>
            <textarea
              id="sched-notes"
              value={formData.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Catatan tambahan (opsional)"
              rows={2}
              className="flex w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-stone-800 shadow-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 w-full pt-2">
            {formData.date ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsResetDialogOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5 text-xs h-9"
                title={`Hapus semua jadwal kerja pada ${formData.date}`}
                disabled={saving || deleting || isResetting}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                <span>Reset Hari</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={saving || deleting || isResetting}
                  className="h-9"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deleting ? "Menghapus..." : "Hapus"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving || deleting || isResetting}
                className="h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={saving || deleting || isResetting}
                id="save-schedule-button"
                className="h-9"
              >
                {saving ? "Menyimpan..." : mode === "add" ? "Tambah Jadwal" : "Simpan Jadwal"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Confirmation Dialog for Reset Hari */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-stone-800">
                  Reset Jadwal Hari?
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500 mt-0.5">
                  Tindakan ini akan menghapus seluruh jadwal kerja pada tanggal yang dipilih.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-stone-600 space-y-2">
            <p>
              Seluruh jadwal kerja pada{" "}
              <strong className="text-stone-800">
                {formData.date ? `${getDayName(formData.date)}, ${formatDate(formData.date)}` : "tanggal ini"}
              </strong>{" "}
              akan dihapus permanen.
            </p>
            <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
              <span className="font-semibold">Catatan Keamanan:</span> Status{" "}
              <strong>Cuti</strong>, <strong>Izin</strong>, dan <strong>Libur</strong>{" "}
              yang telah diatur sebelumnya <em>tidak akan dihapus</em> dan tetap tersimpan aman.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={isResetting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmResetDay}
              disabled={isResetting}
              className="gap-1.5"
            >
              {isResetting ? (
                <span>Menghapus...</span>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Reset Hari</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
