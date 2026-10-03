"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ClipboardList,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCafe } from "@/lib/store/cafe-context";
import {
  type Employee,
  type EmployeeStatus,
  STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  GENDER_LABELS,
} from "@/types";
import { formatDate, formatRupiah, getInitials } from "@/lib/utils";
import { EmployeeForm } from "./employee-form";
import { EmployeeDetail } from "./employee-detail";
import { JobListDialog } from "./job-list-dialog";
import { DeleteEmployeeDialog } from "./delete-employee-dialog";

const STATUS_BADGE_MAP: Record<EmployeeStatus, string> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  ON_LEAVE: "warning",
};

export function EmployeeTable() {
  const { employees, positions, getPositionName } = useCafe();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [jobListEmployee, setJobListEmployee] = useState<Employee | null>(null);
  const [deleteTargetEmployee, setDeleteTargetEmployee] = useState<Employee | null>(null);

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || emp.status === statusFilter;
      const matchPosition =
        positionFilter === "all" ||
        emp.position === positionFilter ||
        getPositionName(emp.position).toLowerCase() === positionFilter.toLowerCase();
      return matchSearch && matchStatus && matchPosition;
    });
  }, [employees, search, statusFilter, positionFilter, getPositionName]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2 flex-wrap sm:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              id="employee-search"
              placeholder="Cari karyawan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" id="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="ON_LEAVE">Cuti</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
            </SelectContent>
          </Select>

          {/* Position filter */}
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-40 hidden sm:flex" id="position-filter">
              <SelectValue placeholder="Jabatan" />
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

        <Button
          id="add-employee-button"
          variant="brand"
          className="shrink-0 gap-2"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Karyawan</span>
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-[var(--muted-foreground)]">
        Menampilkan{" "}
        <span className="font-medium text-stone-700">{filtered.length}</span>{" "}
        dari <span className="font-medium text-stone-700">{employees.length}</span>{" "}
        karyawan
      </p>

      {/* Table — Desktop */}
      <div className="hidden md:block rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-[var(--shadow-card)]">
        <table className="data-table">
          <thead>
            <tr>
              <th>Karyawan</th>
              <th>Gender</th>
              <th>ID</th>
              <th>Jabatan</th>
              <th>Tipe</th>
              <th>Status</th>
              <th>Bergabung</th>
              <th>Gaji Pokok</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-[var(--muted-foreground)]">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Karyawan tidak ditemukan</p>
                    <p className="text-xs">Coba ubah kata kunci atau filter</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((emp) => {
                const jobCount = emp.jobs ? emp.jobs.length : 0;
                return (
                  <tr key={emp.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-coffee-100 text-coffee-800 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <p className="font-medium text-stone-800 text-sm">
                            {emp.name}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {emp.email || emp.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-stone-600 whitespace-nowrap">
                      {GENDER_LABELS[emp.gender || emp.jenisKelamin || "LAKI_LAKI"] || "Laki-laki"}
                    </td>
                    <td className="text-sm text-stone-600 font-mono">
                      {emp.employeeCode}
                    </td>
                    <td>
                      <Badge variant="brand" className="text-xs font-normal">
                        {getPositionName(emp.position)}
                      </Badge>
                    </td>
                    <td className="text-sm text-stone-600">
                      {EMPLOYMENT_TYPE_LABELS[emp.employmentType] || emp.employmentType}
                    </td>
                    <td>
                      <Badge
                        variant={STATUS_BADGE_MAP[emp.status] as Parameters<typeof Badge>[0]["variant"]}
                        className="text-xs"
                      >
                        {STATUS_LABELS[emp.status] || emp.status}
                      </Badge>
                    </td>
                    <td className="text-sm text-stone-600 whitespace-nowrap">
                      {formatDate(emp.joinDate)}
                    </td>
                    <td className="text-sm text-stone-700 font-medium whitespace-nowrap">
                      {formatRupiah(emp.baseSalary)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-stone-600 hover:text-coffee-800 hover:bg-coffee-50"
                          onClick={() => setJobListEmployee(emp)}
                          title="Lihat / kelola list deskripsi pekerjaan"
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-coffee-700" />
                          <span className="hidden lg:inline">Deskripsi Pekerjaan</span>
                          {jobCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-coffee-100 text-coffee-800 text-[10px] font-bold rounded-full">
                              {jobCount}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-stone-500 hover:text-stone-800"
                          onClick={() => setDetailEmployee(emp)}
                          title="Lihat detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-stone-500 hover:text-stone-800"
                          onClick={() => setEditEmployee(emp)}
                          title="Edit data karyawan"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-stone-500 hover:text-stone-800"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setJobListEmployee(emp)}>
                              <ClipboardList className="h-4 w-4 mr-2 text-coffee-700" />
                              Deskripsi Pekerjaan ({jobCount})
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDetailEmployee(emp)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Lihat Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditEmployee(emp)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Data
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              onClick={() => setDeleteTargetEmployee(emp)}
                            >
                              <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — Mobile */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Search className="h-10 w-10 text-[var(--muted-foreground)] opacity-30" />
            <p className="text-sm text-stone-600">Karyawan tidak ditemukan</p>
          </div>
        ) : (
          filtered.map((emp) => {
            const jobCount = emp.jobs ? emp.jobs.length : 0;
            return (
              <div
                key={emp.id}
                className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-coffee-100 text-coffee-800 flex items-center justify-center text-sm font-bold shrink-0">
                      {getInitials(emp.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-stone-800">{emp.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {emp.employeeCode}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={STATUS_BADGE_MAP[emp.status] as Parameters<typeof Badge>[0]["variant"]}
                    className="text-xs"
                  >
                    {STATUS_LABELS[emp.status] || emp.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="brand" className="text-xs">
                    {getPositionName(emp.position)}
                  </Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {GENDER_LABELS[emp.gender || emp.jenisKelamin || "LAKI_LAKI"] || "Laki-laki"} • {EMPLOYMENT_TYPE_LABELS[emp.employmentType] || emp.employmentType}
                  </span>
                  <span className="text-xs font-semibold text-stone-700 ml-auto">
                    {formatRupiah(emp.baseSalary)}
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs text-coffee-800"
                    onClick={() => setJobListEmployee(emp)}
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    List Job ({jobCount})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => setDetailEmployee(emp)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Detail
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => setEditEmployee(emp)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                    onClick={() => setDeleteTargetEmployee(emp)}
                    title="Hapus Karyawan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <EmployeeForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="add"
      />
      {editEmployee && (
        <EmployeeForm
          open={!!editEmployee}
          onClose={() => setEditEmployee(null)}
          mode="edit"
          employee={editEmployee}
        />
      )}
      {detailEmployee && (
        <EmployeeDetail
          open={!!detailEmployee}
          onClose={() => setDetailEmployee(null)}
          employee={detailEmployee}
          onEdit={(emp) => {
            setDetailEmployee(null);
            setEditEmployee(emp);
          }}
        />
      )}
      {jobListEmployee && (
        <JobListDialog
          open={!!jobListEmployee}
          onClose={() => setJobListEmployee(null)}
          employee={jobListEmployee}
        />
      )}
      <DeleteEmployeeDialog
        open={!!deleteTargetEmployee}
        onClose={() => setDeleteTargetEmployee(null)}
        employee={deleteTargetEmployee}
      />
    </>
  );
}

