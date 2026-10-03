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
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Clock, DollarSign, Briefcase, AlertCircle } from "lucide-react";
import type { Employee } from "@/types";
import { useCafe } from "@/lib/store/cafe-context";

interface DeleteEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export function DeleteEmployeeDialog({
  open,
  onClose,
  employee,
}: DeleteEmployeeDialogProps) {
  const { deleteEmployee, getPositionName } = useCafe();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!employee) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);

      const res = await deleteEmployee(employee.id);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.error || "Gagal menghapus karyawan. Silakan coba kembali.");
      }
    } catch (err) {
      console.error("Gagal menghapus karyawan:", err);
      setErrorMessage("Gagal menghapus karyawan. Silakan coba kembali.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isDeleting) {
      setErrorMessage(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 sm:mx-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-stone-800 text-center sm:text-left">
            Hapus Karyawan?
          </DialogTitle>
          <DialogDescription className="text-sm text-stone-600 text-center sm:text-left">
            Anda akan menghapus:
          </DialogDescription>
        </DialogHeader>

        {/* Employee Identification Card */}
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3.5 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-stone-900 text-base">{employee.name}</p>
            <Badge variant="brand" className="text-xs shrink-0">
              {getPositionName(employee.position)}
            </Badge>
          </div>
          <p className="text-xs font-mono text-stone-600">{employee.employeeCode}</p>
        </div>

        {/* Warning & Operational Data List */}
        <div className="space-y-2 text-xs text-stone-600">
          <p className="font-medium text-stone-700">
            Seluruh data yang terkait dengan karyawan ini juga akan dihapus secara permanen, termasuk:
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2 rounded-md bg-stone-100/80 px-2.5 py-1.5 text-stone-700">
              <Calendar className="h-3.5 w-3.5 text-stone-500 shrink-0" />
              <span>Jadwal</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-stone-100/80 px-2.5 py-1.5 text-stone-700">
              <Clock className="h-3.5 w-3.5 text-stone-500 shrink-0" />
              <span>Kehadiran</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-stone-100/80 px-2.5 py-1.5 text-stone-700">
              <Briefcase className="h-3.5 w-3.5 text-stone-500 shrink-0" />
              <span>Pekerjaan</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-stone-100/80 px-2.5 py-1.5 text-stone-700">
              <DollarSign className="h-3.5 w-3.5 text-stone-500 shrink-0" />
              <span>Slip Gaji</span>
            </div>
          </div>
          <p className="pt-2 text-xs font-semibold text-red-600">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => {
              setErrorMessage(null);
              onClose();
            }}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
            className="gap-2"
          >
            {isDeleting ? "Menghapus..." : "Hapus Permanen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
