"use client";

import React, { useState, useEffect } from "react";
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
import { useCafe } from "@/lib/store/cafe-context";
import { type Employee, type PositionType } from "@/types";
import { Plus, Settings2, AlertCircle } from "lucide-react";
import { AddPositionDialog, ManagePositionDialog } from "./position-dialog";

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  employee?: Employee;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  position: string;
  employmentType: string;
  status: string;
  dailyWorkingHours: string;
  baseSalary: string;
  hourlyRate: string;
  joinDate: string;
}

const defaultForm: FormData = {
  name: "",
  email: "",
  phone: "",
  gender: "LAKI_LAKI",
  address: "",
  position: "",
  employmentType: "FULL_TIME",
  status: "ACTIVE",
  dailyWorkingHours: "8",
  baseSalary: "3500000",
  hourlyRate: "20000",
  joinDate: new Date().toISOString().split("T")[0],
};

export function EmployeeForm({ open, onClose, mode, employee }: EmployeeFormProps) {
  const { positions, addEmployee, updateEmployee } = useCafe();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [addPosOpen, setAddPosOpen] = useState(false);
  const [managePosOpen, setManagePosOpen] = useState(false);

  const [formData, setFormData] = useState<FormData>(() => {
    if (mode === "edit" && employee) {
      return {
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        gender: employee.gender || employee.jenisKelamin || "LAKI_LAKI",
        address: employee.address,
        position: employee.position,
        employmentType: employee.employmentType,
        status: employee.status,
        dailyWorkingHours: String(employee.dailyWorkingHours ?? employee.jamKerjaHarian ?? 8),
        baseSalary: String(employee.baseSalary),
        hourlyRate: String(employee.hourlyRate),
        joinDate: employee.joinDate,
      };
    }
    return defaultForm;
  });

  useEffect(() => {
    if (open) {
      setErrorMessage("");
      if (mode === "edit" && employee) {
        setFormData({
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          gender: employee.gender || employee.jenisKelamin || "LAKI_LAKI",
          address: employee.address,
          position: employee.position,
          employmentType: employee.employmentType,
          status: employee.status,
          dailyWorkingHours: String(employee.dailyWorkingHours ?? employee.jamKerjaHarian ?? 8),
          baseSalary: String(employee.baseSalary),
          hourlyRate: String(employee.hourlyRate),
          joinDate: employee.joinDate,
        });
      } else if (mode === "add") {
        setFormData({
          ...defaultForm,
          position: positions.length > 0 ? positions[0].code : "KARYAWAN",
          joinDate: new Date().toISOString().split("T")[0],
        });
      }
    }
  }, [open, mode, employee, positions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      if (mode === "add") {
        const selectedPos = formData.position || (positions.length > 0 ? positions[0].code : "KARYAWAN");
        const res = await addEmployee({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender as "LAKI_LAKI" | "PEREMPUAN",
          address: formData.address,
          position: selectedPos as PositionType,
          employmentType: formData.employmentType as Parameters<typeof addEmployee>[0]["employmentType"],
          status: formData.status as Parameters<typeof addEmployee>[0]["status"],
          dailyWorkingHours: Number(formData.dailyWorkingHours) || 8,
          baseSalary: Number(formData.baseSalary) || 0,
          hourlyRate: Number(formData.hourlyRate) || 0,
          joinDate: formData.joinDate,
          jobs: null,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Gagal menambahkan karyawan.");
          setSaving(false);
          return;
        }
      } else if (mode === "edit" && employee) {
        const res = await updateEmployee(employee.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          gender: (formData.gender || employee.gender || "LAKI_LAKI") as "LAKI_LAKI" | "PEREMPUAN",
          address: formData.address,
          position: (formData.position || employee.position) as PositionType,
          employmentType: formData.employmentType as Parameters<typeof updateEmployee>[1]["employmentType"],
          status: formData.status as Parameters<typeof updateEmployee>[1]["status"],
          dailyWorkingHours: Number(formData.dailyWorkingHours) || 8,
          baseSalary: Number(formData.baseSalary) || 0,
          hourlyRate: Number(formData.hourlyRate) || 0,
          joinDate: formData.joinDate,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Gagal memperbarui data karyawan.");
          setSaving(false);
          return;
        }
      }

      onClose();
    } catch (err) {
      setErrorMessage("Terjadi kesalahan sistem saat menyimpan karyawan.");
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "add" ? "Tambah Karyawan Baru" : "Edit Data Karyawan"}
            </DialogTitle>
            <DialogDescription>
              {mode === "add"
                ? "Lengkapi data karyawan baru di bawah ini."
                : `Edit data untuk ${employee?.name}`}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section: Informasi Pribadi */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider pb-1 border-b border-[var(--border)] w-full">
                Informasi Pribadi
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="emp-name" className="text-sm font-medium text-stone-700">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="emp-name"
                    value={formData.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="cth: Agung Prasetyo"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-phone" className="text-sm font-medium text-stone-700">
                    Nomor Telepon <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="emp-phone"
                    value={formData.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="cth: 0812-3456-7890"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-gender" className="text-sm font-medium text-stone-700">
                    Jenis Kelamin <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.gender}
                    onValueChange={(v) => update("gender", v)}
                  >
                    <SelectTrigger id="emp-gender">
                      <SelectValue placeholder="Pilih Jenis Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                      <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-email" className="text-sm font-medium text-stone-700">
                    Email
                  </label>
                  <Input
                    id="emp-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="cth: agung@kopi-nusantara.com"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="emp-address" className="text-sm font-medium text-stone-700">
                    Alamat
                  </label>
                  <Input
                    id="emp-address"
                    value={formData.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Alamat lengkap"
                  />
                </div>
              </div>
            </fieldset>

            {/* Section: Informasi Pekerjaan */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider pb-1 border-b border-[var(--border)] w-full">
                Informasi Pekerjaan
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="emp-position" className="text-sm font-medium text-stone-700">
                    Jabatan <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.position}
                    onValueChange={(v) => update("position", v)}
                    required
                  >
                    <SelectTrigger id="emp-position">
                      <SelectValue placeholder="Pilih Jabatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.code}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Actions: Tambah & Kelola Jabatan */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-stone-700"
                      onClick={() => setAddPosOpen(true)}
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Tambah Jabatan</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-[var(--muted-foreground)] hover:text-stone-800"
                      onClick={() => setManagePosOpen(true)}
                    >
                      <Settings2 className="h-3 w-3" />
                      <span>Kelola Jabatan</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-type" className="text-sm font-medium text-stone-700">
                    Tipe Karyawan
                  </label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(v) => update("employmentType", v)}
                  >
                    <SelectTrigger id="emp-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Penuh Waktu</SelectItem>
                      <SelectItem value="PART_TIME">Paruh Waktu</SelectItem>
                      <SelectItem value="CONTRACT">Kontrak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-status" className="text-sm font-medium text-stone-700">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => update("status", v)}
                  >
                    <SelectTrigger id="emp-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktif</SelectItem>
                      <SelectItem value="ON_LEAVE">Cuti</SelectItem>
                      <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-join" className="text-sm font-medium text-stone-700">
                    Tanggal Bergabung <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="emp-join"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => update("joinDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="emp-work-hours" className="text-sm font-medium text-stone-700">
                    Jam Kerja / Hari <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="emp-work-hours"
                      type="number"
                      min="1"
                      max="24"
                      value={formData.dailyWorkingHours}
                      onChange={(e) => update("dailyWorkingHours", e.target.value)}
                      placeholder="8"
                      required
                    />
                    <span className="text-xs text-[var(--muted-foreground)] shrink-0">jam/hari</span>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Section: Gaji */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider pb-1 border-b border-[var(--border)] w-full">
                Informasi Gaji
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="emp-salary" className="text-sm font-medium text-stone-700">
                    Gaji Pokok (Rp)
                  </label>
                  <Input
                    id="emp-salary"
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => update("baseSalary", e.target.value)}
                    placeholder="cth: 4500000"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="emp-hourly" className="text-sm font-medium text-stone-700">
                    Upah Per Jam (Rp)
                  </label>
                  <Input
                    id="emp-hourly"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => update("hourlyRate", e.target.value)}
                    placeholder="cth: 25000"
                    min="0"
                  />
                </div>
              </div>
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" variant="brand" disabled={saving} id="save-employee-button">
                {saving ? "Menyimpan..." : mode === "add" ? "Tambah Karyawan" : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Embedded Position Dialogs */}
      <AddPositionDialog
        open={addPosOpen}
        onClose={() => setAddPosOpen(false)}
        onSuccess={(newPos) => {
          update("position", newPos.code);
        }}
      />
      <ManagePositionDialog
        open={managePosOpen}
        onClose={() => setManagePosOpen(false)}
        onOpenAdd={() => setAddPosOpen(true)}
      />
    </>
  );
}
