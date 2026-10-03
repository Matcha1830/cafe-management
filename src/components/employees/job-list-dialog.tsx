"use client";

import React, { useState } from "react";
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
import { useCafe } from "@/lib/store/cafe-context";
import type { Employee, EmployeeJob } from "@/types";
import { Plus, Pencil, Trash2, Check, X, ClipboardList, AlertCircle } from "lucide-react";

interface JobListDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

export function JobListDialog({ open, onClose, employee }: JobListDialogProps) {
  const { employees, addJob, updateJob, deleteJob, getPositionName } = useCafe();
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newJobText, setNewJobText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const currentEmployee = employees.find((e) => e.id === employee.id) || employee;
  const jobsList: EmployeeJob[] = currentEmployee.jobs || [];

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newJobText.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMessage("");
    try {
      const res = await addJob(employee.id, trimmed);
      if (!res.success) {
        setErrorMessage(res.error || "Gagal menambahkan pekerjaan.");
        return;
      }
      setNewJobText("");
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan saat menambahkan pekerjaan.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (job: EmployeeJob) => {
    setEditingJobId(job.id);
    setEditText(job.title);
    setErrorMessage("");
  };

  const handleSaveEdit = async (jobId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMessage("");
    try {
      const res = await updateJob(jobId, trimmed);
      if (!res.success) {
        setErrorMessage(res.error || "Gagal mengubah pekerjaan.");
        return;
      }
      setEditingJobId(null);
    } catch (err) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan saat mengubah pekerjaan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pekerjaan ini?")) return;

    setLoading(true);
    setErrorMessage("");
    try {
      const res = await deleteJob(jobId);
      if (!res.success) {
        setErrorMessage(res.error || "Gagal menghapus pekerjaan.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan saat menghapus pekerjaan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between pr-4">
            <div>
              <DialogTitle className="text-base sm:text-lg">
                Deskripsi Pekerjaan — {currentEmployee.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 mt-0.5">
                {getPositionName(currentEmployee.position)} • {currentEmployee.employeeCode}
              </DialogDescription>
            </div>
            {!isAdding && (
              <Button
                size="sm"
                variant="brand"
                className="gap-1.5 text-xs shrink-0"
                onClick={() => {
                  setIsAdding(true);
                  setErrorMessage("");
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Pekerjaan</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* New Job Form */}
        {isAdding && (
          <form
            onSubmit={handleAddJob}
            className="p-3 bg-coffee-50 border border-coffee-200 rounded-xl space-y-2 mt-2"
          >
            <label className="text-xs font-semibold text-coffee-900 block">
              Nama Pekerjaan / Tanggung Jawab Baru
            </label>
            <div className="flex gap-2">
              <Input
                value={newJobText}
                onChange={(e) => {
                  setNewJobText(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="cth: Membersihkan area cafe, Cek stok kopi..."
                className="h-9 text-sm bg-white"
                autoFocus
                disabled={loading}
              />
              <Button type="submit" variant="brand" size="sm" className="h-9 px-3" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3"
                disabled={loading}
                onClick={() => {
                  setIsAdding(false);
                  setNewJobText("");
                  setErrorMessage("");
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        )}

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 max-h-[50vh] pr-1">
          {jobsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <ClipboardList className="h-10 w-10 text-stone-300" />
              <div>
                <p className="text-sm font-medium text-stone-700">
                  Belum ada deskripsi pekerjaan.
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Tambahkan daftar pekerjaan untuk karyawan ini.
                </p>
              </div>
              {!isAdding && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs mt-2"
                  onClick={() => {
                    setIsAdding(true);
                    setErrorMessage("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Tambah Pekerjaan</span>
                </Button>
              )}
            </div>
          ) : (
            jobsList.map((job, idx) => {
              const isEditing = editingJobId === job.id;

              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-white hover:bg-stone-50/70 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        disabled={loading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(job.id);
                          if (e.key === "Escape") setEditingJobId(null);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="brand"
                        className="h-8 px-2.5"
                        disabled={loading}
                        onClick={() => handleSaveEdit(job.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5"
                        disabled={loading}
                        onClick={() => setEditingJobId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coffee-100 text-[11px] font-bold text-coffee-800 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-medium text-stone-800 leading-snug break-words">
                          {job.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 text-stone-500 hover:text-stone-800"
                          onClick={() => handleStartEdit(job)}
                          title="Edit pekerjaan"
                          disabled={loading}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteJob(job.id)}
                          title="Hapus pekerjaan"
                          disabled={loading}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-[var(--border)]">
          <Button variant="outline" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
