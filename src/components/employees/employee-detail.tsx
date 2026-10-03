"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type Employee,
  STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  GENDER_LABELS,
} from "@/types";
import {
  formatDate,
  formatRupiah,
  getInitials,
} from "@/lib/utils";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  Pencil,
  ClipboardList,
  Plus,
  Clock,
  User,
} from "lucide-react";
import { useCafe } from "@/lib/store/cafe-context";
import { JobListDialog } from "./job-list-dialog";

const STATUS_BADGE_MAP: Record<string, string> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  ON_LEAVE: "warning",
};

interface EmployeeDetailProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onOpenJobs?: (employee: Employee) => void;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]">
        <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />
      </div>
      <div>
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="text-sm font-medium text-stone-800">{value}</p>
      </div>
    </div>
  );
}

export function EmployeeDetail({
  open,
  onClose,
  employee,
  onEdit,
}: EmployeeDetailProps) {
  const { employees, getPositionName } = useCafe();
  const [jobListOpen, setJobListOpen] = useState(false);

  const currentEmployee = employees.find((e) => e.id === employee.id) || employee;
  const jobs = currentEmployee.jobs || [];

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Karyawan</DialogTitle>
          </DialogHeader>

          {/* Profile Header */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-coffee-50 border border-coffee-100">
            <div className="h-16 w-16 rounded-2xl bg-coffee-700 text-amber-100 flex items-center justify-center text-xl font-bold shrink-0">
              {getInitials(currentEmployee.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-stone-800 text-base leading-tight truncate">
                {currentEmployee.name}
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-mono">
                {currentEmployee.employeeCode}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="brand" className="text-xs">
                  {getPositionName(currentEmployee.position)}
                </Badge>
                <Badge
                  variant={STATUS_BADGE_MAP[currentEmployee.status] as Parameters<typeof Badge>[0]["variant"]}
                  className="text-xs"
                >
                  {STATUS_LABELS[currentEmployee.status] || currentEmployee.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Info Sections */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Informasi Pribadi
              </h4>
              <div className="divide-y divide-[var(--border-subtle)]">
                <InfoRow
                  icon={User}
                  label="Jenis Kelamin"
                  value={
                    currentEmployee.gender && GENDER_LABELS[currentEmployee.gender]
                      ? GENDER_LABELS[currentEmployee.gender]
                      : currentEmployee.jenisKelamin && GENDER_LABELS[currentEmployee.jenisKelamin]
                      ? GENDER_LABELS[currentEmployee.jenisKelamin]
                      : "Laki-laki"
                  }
                />
                <InfoRow icon={Mail} label="Email" value={currentEmployee.email || "—"} />
                <InfoRow icon={Phone} label="Telepon" value={currentEmployee.phone} />
                <InfoRow icon={MapPin} label="Alamat" value={currentEmployee.address || "—"} />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Informasi Pekerjaan
              </h4>
              <div className="divide-y divide-[var(--border-subtle)]">
                <InfoRow
                  icon={Briefcase}
                  label="Jabatan"
                  value={getPositionName(currentEmployee.position)}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Tipe Karyawan"
                  value={EMPLOYMENT_TYPE_LABELS[currentEmployee.employmentType] || currentEmployee.employmentType}
                />
                <InfoRow
                  icon={Clock}
                  label="Jam Kerja Standar"
                  value={`${currentEmployee.dailyWorkingHours || currentEmployee.jamKerjaHarian || 8} Jam / Hari`}
                />
                <InfoRow
                  icon={Calendar}
                  label="Tanggal Bergabung"
                  value={formatDate(currentEmployee.joinDate)}
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Informasi Gaji
              </h4>
              <div className="divide-y divide-[var(--border-subtle)]">
                <InfoRow
                  icon={DollarSign}
                  label="Gaji Pokok"
                  value={formatRupiah(currentEmployee.baseSalary)}
                />
                <InfoRow
                  icon={DollarSign}
                  label="Upah Per Jam"
                  value={formatRupiah(currentEmployee.hourlyRate)}
                />
              </div>
            </div>

            {/* List Job / Deskripsi Pekerjaan Section */}
            <div className="rounded-xl border border-[var(--border)] p-4 bg-stone-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-coffee-700" />
                  List Pekerjaan ({jobs.length})
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setJobListOpen(true)}
                >
                  <Pencil className="h-3 w-3" />
                  <span>Kelola Job</span>
                </Button>
              </div>

              {jobs.length === 0 ? (
                <div className="py-3 text-center">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Belum ada deskripsi pekerjaan.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-brand-700 mt-1 gap-1"
                    onClick={() => setJobListOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Tambah Pekerjaan
                  </Button>
                </div>
              ) : (
                <ol className="space-y-1.5 text-xs text-stone-700 list-decimal list-inside">
                  {jobs.map((j) => (
                    <li key={j.id} className="leading-snug">
                      <span className="font-medium text-stone-800">{j.title}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
            <Button
              variant="outline"
              onClick={() => setJobListOpen(true)}
              className="flex-1 gap-1.5 text-xs"
            >
              <ClipboardList className="h-4 w-4" />
              Deskripsi Pekerjaan
            </Button>
            <Button
              variant="brand"
              onClick={() => onEdit(currentEmployee)}
              className="flex-1 gap-1.5 text-xs"
              id="edit-from-detail-button"
            >
              <Pencil className="h-4 w-4" />
              Edit Karyawan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Job List Dialog */}
      {jobListOpen && (
        <JobListDialog
          open={jobListOpen}
          onClose={() => setJobListOpen(false)}
          employee={currentEmployee}
        />
      )}
    </>
  );
}
