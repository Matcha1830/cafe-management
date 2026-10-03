"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  Employee,
  PositionItem,
  AttendanceEntry,
  EmployeeJob,
  Schedule,
  Payroll,
  CafeProfile,
  ManagerProfile,
} from "@/types";
import { POSITION_LABELS } from "@/types";
import { initialJobCompletions } from "@/lib/mock-data/attendance";
import {
  getPositions,
  createPosition as createPositionAction,
  updatePosition as updatePositionAction,
  deletePosition as deletePositionAction,
} from "@/lib/actions/positions";
import {
  getEmployees,
  createEmployee as createEmployeeAction,
  updateEmployee as updateEmployeeAction,
  deleteEmployee as deleteEmployeeAction,
  updateEmployeeJobs as updateEmployeeJobsAction,
} from "@/lib/actions/employees";
import {
  createJob as createJobAction,
  updateJob as updateJobAction,
  deleteJob as deleteJobAction,
} from "@/lib/actions/jobs";
import {
  getSchedules,
  createSchedule as createScheduleAction,
  updateSchedule as updateScheduleAction,
  deleteSchedule as deleteScheduleAction,
  deleteSchedulesByDate as deleteSchedulesByDateAction,
} from "@/lib/actions/schedules";
import {
  getAllAttendanceByPeriod,
  upsertAttendanceBatch,
} from "@/lib/actions/attendance";

import {
  getPayrolls,
  savePayroll as savePayrollAction,
  updatePayrollStatus as updatePayrollStatusAction,
  type SavePayrollInput,
} from "@/lib/actions/payroll";

import {
  getCafeProfile,
  updateCafeProfile as updateCafeProfileAction,
  updateWorkHoursSettings as updateWorkHoursSettingsAction,
} from "@/lib/actions/settings";

import {
  getManagerProfile,
  updateManagerProfile as updateManagerProfileAction,
} from "@/lib/actions/profile";

// Helper: get current period "YYYY-MM"
function getCurrentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

interface CafeContextType {
  positions: PositionItem[];
  employees: Employee[];
  schedules: Schedule[];
  payrolls: Payroll[];
  cafeProfile: CafeProfile;
  managerProfile: ManagerProfile;
  loading: boolean;
  refreshData: () => Promise<void>;
  updateCafeProfile: (
    formData: FormData
  ) => Promise<{ success: boolean; data?: CafeProfile; error?: string }>;
  updateWorkHoursSettings: (data: {
    standarJamKerja?: number;
    multiplierLembur?: number;
    dendaPekerjaanPerJob?: number;
  }) => Promise<{ success: boolean; data?: CafeProfile; error?: string }>;
  refreshCafeProfile: () => Promise<void>;
  updateManagerProfile: (
    formData: FormData
  ) => Promise<{ success: boolean; data?: ManagerProfile; error?: string }>;
  refreshManagerProfile: () => Promise<void>;

  addPosition: (name: string) => Promise<{ success: boolean; data?: PositionItem; error?: string }>;
  updatePosition: (id: string, name: string) => Promise<{ success: boolean; data?: PositionItem; error?: string }>;
  deletePosition: (id: string) => Promise<{ success: boolean; inUseCount: number; message?: string }>;
  getPositionName: (codeOrId: string) => string;

  addEmployee: (emp: Partial<Employee>) => Promise<{ success: boolean; data?: Employee; error?: string }>;
  updateEmployee: (id: string, emp: Partial<Employee>) => Promise<{ success: boolean; data?: Employee; error?: string }>;
  deleteEmployee: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateEmployeeJobs: (employeeId: string, jobs: EmployeeJob[] | null) => Promise<{ success: boolean; error?: string }>;

  addJob: (employeeId: string, title: string) => Promise<{ success: boolean; data?: EmployeeJob; error?: string }>;
  updateJob: (id: string, title: string) => Promise<{ success: boolean; data?: EmployeeJob; error?: string }>;
  deleteJob: (id: string) => Promise<{ success: boolean; error?: string }>;

  addSchedule: (data: {
    employeeId: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    isOvernight?: boolean;
    status?: string;
    notes?: string;
  }) => Promise<{ success: boolean; data?: Schedule; error?: string }>;
  updateSchedule: (
    id: string,
    data: {
      startTime?: string | null;
      endTime?: string | null;
      isOvernight?: boolean;
      status?: string;
      notes?: string;
      date?: string;
      employeeId?: string;
    }
  ) => Promise<{ success: boolean; data?: Schedule; error?: string }>;
  deleteSchedule: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteSchedulesByDate: (
    date: string
  ) => Promise<{ success: boolean; deletedCount: number; error?: string }>;

  // Attendance — backed by PostgreSQL
  attendances: Record<string, AttendanceEntry[]>;
  attendancePeriod: string; // "YYYY-MM" period currently loaded
  setAttendancePeriod: (period: string) => void;
  refreshAttendances: (period?: string) => Promise<void>;
  saveAttendances: (
    employeeId: string,
    entries: AttendanceEntry[]
  ) => Promise<{ success: boolean; error?: string }>;
  saveSingleAttendance: (
    entry: AttendanceEntry
  ) => Promise<{ success: boolean; data?: AttendanceEntry; error?: string }>;

  // Payroll — backed by PostgreSQL
  savePayrollSnapshot: (
    data: SavePayrollInput
  ) => Promise<{ success: boolean; data?: Payroll; error?: string }>;
  setPayrollStatus: (
    id: string,
    status: string
  ) => Promise<{ success: boolean; data?: Payroll; error?: string }>;

  // Job Completions — in-memory + synced with DB snapshot
  jobCompletions: Record<string, Record<string, boolean>>;
  updateJobCompletions: (employeeId: string, completions: Record<string, boolean>) => void;
}

const CafeContext = createContext<CafeContextType | null>(null);

export function CafeProvider({ children }: { children: React.ReactNode }) {
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [cafeProfile, setCafeProfile] = useState<CafeProfile>({
    namaKafe: "Kopi Nusantara",
    logoPath: null,
    telepon: "(021) 7890-1234",
    alamat: "Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan",
  });
  const [managerProfile, setManagerProfile] = useState<ManagerProfile>({
    nama: "Ahmad Ridwan",
    email: "manager@kopi-nusantara.com",
    fotoProfilPath: null,
    role: "MANAGER",
  });
  const [loading, setLoading] = useState(true);

  // Attendance: period-aware, backed by PostgreSQL
  const [attendancePeriod, setAttendancePeriodState] = useState<string>(getCurrentPeriod());
  const [attendances, setAttendances] = useState<Record<string, AttendanceEntry[]>>({});

  // Job Completions: still in-memory (mock) — tidak diubah pada task ini
  const [jobCompletions, setJobCompletions] =
    useState<Record<string, Record<string, boolean>>>(initialJobCompletions);

  // ============================================================
  // REFRESH ATTENDANCE — fetch seluruh data kehadiran dari PostgreSQL
  // ============================================================
  const refreshAttendances = useCallback(async (period?: string) => {
    try {
      const data = await getAllAttendanceByPeriod(period);
      setAttendances(data);
    } catch (err) {
      console.error("Gagal memuat data kehadiran:", err);
    }
  }, []);

  // ============================================================
  // SET ATTENDANCE PERIOD
  // ============================================================
  const setAttendancePeriod = useCallback((period: string) => {
    setAttendancePeriodState(period);
  }, []);

  const refreshCafeProfile = useCallback(async () => {
    try {
      const prof = await getCafeProfile();
      setCafeProfile(prof);
    } catch (err) {
      console.error("Gagal memuat profil kafe:", err);
    }
  }, []);

  const refreshManagerProfile = useCallback(async () => {
    try {
      const mgr = await getManagerProfile();
      setManagerProfile(mgr);
    } catch (err) {
      console.error("Gagal memuat profil manager:", err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [posList, empList, schedList, attList, payList, prof, mgrProf] = await Promise.all([
        getPositions(),
        getEmployees(),
        getSchedules(),
        getAllAttendanceByPeriod(),
        getPayrolls(),
        getCafeProfile(),
        getManagerProfile(),
      ]);
      setPositions(posList);
      setEmployees(empList);
      setSchedules(schedList);
      setAttendances(attList);
      setPayrolls(payList);
      setCafeProfile(prof);
      setManagerProfile(mgrProf);
    } catch (err) {
      console.error("Gagal menyinkronkan data dengan database:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [posList, empList, schedList, attList, payList, prof, mgrProf] = await Promise.all([
          getPositions(),
          getEmployees(),
          getSchedules(),
          getAllAttendanceByPeriod(),
          getPayrolls(),
          getCafeProfile(),
          getManagerProfile(),
        ]);
        if (isMounted) {
          setPositions(posList);
          setEmployees(empList);
          setSchedules(schedList);
          setAttendances(attList);
          setPayrolls(payList);
          setCafeProfile(prof);
          setManagerProfile(mgrProf);
        }
      } catch (err) {
        console.error("Gagal memuat data awal dari database:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Position Actions
  const addPosition = async (
    name: string
  ): Promise<{ success: boolean; data?: PositionItem; error?: string }> => {
    const res = await createPositionAction({ name });
    if (res.success && res.data) {
      await refreshData();
    }
    return res;
  };

  const updatePosition = async (
    id: string,
    name: string
  ): Promise<{ success: boolean; data?: PositionItem; error?: string }> => {
    const res = await updatePositionAction(id, { name });
    if (res.success) {
      await refreshData();
    }
    return res;
  };

  const deletePosition = async (
    id: string
  ): Promise<{ success: boolean; inUseCount: number; message?: string }> => {
    const res = await deletePositionAction(id);
    if (res.success) {
      await refreshData();
    }
    return res;
  };

  const getPositionName = useCallback(
    (codeOrId: string): string => {
      if (!codeOrId) return "-";
      const found = positions.find(
        (p) =>
          p.code.toUpperCase() === codeOrId.toUpperCase() ||
          p.id === codeOrId ||
          p.name.toLowerCase() === codeOrId.toLowerCase()
      );
      if (found) return found.name;
      return POSITION_LABELS[codeOrId] || codeOrId;
    },
    [positions]
  );

  // Employee Actions
  const addEmployee = async (
    empData: Partial<Employee>
  ): Promise<{ success: boolean; data?: Employee; error?: string }> => {
    const res = await createEmployeeAction({
      employeeCode: empData.employeeCode,
      name: empData.name || "",
      phone: empData.phone || "-",
      email: empData.email || "",
      address: empData.address || "",
      position: empData.position || "KARYAWAN",
      employmentType: empData.employmentType || "FULL_TIME",
      gender: empData.gender || empData.jenisKelamin || "LAKI_LAKI",
      status: empData.status || "ACTIVE",
      joinDate: empData.joinDate || new Date().toISOString().split("T")[0],
      baseSalary: Number(empData.baseSalary) || 0,
      hourlyRate: Number(empData.hourlyRate) || 0,
      dailyWorkingHours: empData.dailyWorkingHours !== undefined ? Number(empData.dailyWorkingHours) : undefined,
      jobs: empData.jobs || null,
    });

    if (res.success) {
      await refreshData();
    }
    return res;
  };

  const updateEmployee = async (
    id: string,
    empData: Partial<Employee>
  ): Promise<{ success: boolean; data?: Employee; error?: string }> => {
    const res = await updateEmployeeAction(id, {
      name: empData.name,
      phone: empData.phone,
      email: empData.email,
      address: empData.address,
      position: empData.position,
      employmentType: empData.employmentType,
      gender: empData.gender || empData.jenisKelamin,
      status: empData.status,
      joinDate: empData.joinDate,
      baseSalary: empData.baseSalary !== undefined ? Number(empData.baseSalary) : undefined,
      hourlyRate: empData.hourlyRate !== undefined ? Number(empData.hourlyRate) : undefined,
      dailyWorkingHours: empData.dailyWorkingHours !== undefined ? Number(empData.dailyWorkingHours) : undefined,
    });

    if (res.success) {
      await refreshData();
    }
    return res;
  };

  const deleteEmployee = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await deleteEmployeeAction(id);
    if (res.success) {
      await refreshData();
    }
    return res;
  };

  const updateEmployeeJobs = async (
    employeeId: string,
    jobs: EmployeeJob[] | null
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await updateEmployeeJobsAction(employeeId, jobs);
    if (res.success) {
      await refreshData();
    }
    return res;
  };

  // Job Actions
  const addJob = async (
    employeeId: string,
    title: string
  ): Promise<{ success: boolean; data?: EmployeeJob; error?: string }> => {
    const res = await createJobAction(employeeId, title);
    if (res.success && res.data) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId
            ? {
              ...e,
              jobs: [...(e.jobs || []), res.data!],
            }
            : e
        )
      );
      await refreshData();
    }
    return res;
  };

  const updateJob = async (
    id: string,
    title: string
  ): Promise<{ success: boolean; data?: EmployeeJob; error?: string }> => {
    const res = await updateJobAction(id, title);
    if (res.success && res.data) {
      setEmployees((prev) =>
        prev.map((e) => ({
          ...e,
          jobs: e.jobs?.map((j) => (j.id === id ? res.data! : j)) || null,
        }))
      );
      await refreshData();
    }
    return res;
  };

  const deleteJob = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await deleteJobAction(id);
    if (res.success) {
      setEmployees((prev) =>
        prev.map((e) => ({
          ...e,
          jobs: e.jobs?.filter((j) => j.id !== id) || null,
        }))
      );
      await refreshData();
    }
    return res;
  };

  // Schedule Actions
  const addSchedule = async (data: {
    employeeId: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    isOvernight?: boolean;
    status?: string;
    notes?: string;
  }): Promise<{ success: boolean; data?: Schedule; error?: string }> => {
    const res = await createScheduleAction(data);
    if (res.success && res.data) {
      setSchedules((prev) => [...prev, res.data!]);
      await refreshData();
    }
    return res;
  };

  const updateSchedule = async (
    id: string,
    data: {
      startTime?: string | null;
      endTime?: string | null;
      isOvernight?: boolean;
      status?: string;
      notes?: string;
      date?: string;
      employeeId?: string;
    }
  ): Promise<{ success: boolean; data?: Schedule; error?: string }> => {
    const res = await updateScheduleAction(id, data);
    if (res.success && res.data) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? res.data! : s))
      );
      await refreshData();
    }
    return res;
  };

  const deleteSchedule = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await deleteScheduleAction(id);
    if (res.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      await refreshData();
    }
    return res;
  };

  const deleteSchedulesByDate = async (
    date: string
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> => {
    const res = await deleteSchedulesByDateAction(date);
    if (res.success) {
      setSchedules((prev) =>
        prev.filter(
          (s) =>
            s.date !== date ||
            s.status === "CUTI" ||
            s.status === "IZIN" ||
            s.status === "LIBUR"
        )
      );
      await refreshData();
    }
    return res;
  };

  // ============================================================
  // SAVE ATTENDANCES — Simpan entries kehadiran ke PostgreSQL
  // Dipanggil dari EditPayrollModal saat "Simpan Perubahan"
  // ============================================================
  const saveAttendances = async (
    employeeId: string,
    entries: AttendanceEntry[]
  ): Promise<{ success: boolean; error?: string }> => {
    // Map AttendanceEntry ke format upsert
    const batchData = entries.map((entry) => ({
      employeeId: entry.employeeId,
      date: entry.date,
      jadwalMulai: entry.scheduledStart,
      jadwalSelesai: entry.scheduledEnd,
      jadwalId: entry.jadwalId ?? undefined,
      aktualMulai: entry.actualStart ?? null,
      aktualSelesai: entry.actualEnd ?? null,
    }));

    const res = await upsertAttendanceBatch(batchData);

    if (res.success) {
      // Optimistic update — langsung update state lokal sebelum refresh
      setAttendances((prev) => ({
        ...prev,
        [employeeId]: entries,
      }));
      // Refresh dari DB untuk memastikan konsistensi seluruh riwayat kehadiran
      await refreshAttendances();
    }

    return {
      success: res.success,
      error: res.error,
    };
  };

  // Simpan 1 entri kehadiran langsung (misal dari dialog Kehadiran)
  const saveSingleAttendance = async (
    entry: AttendanceEntry
  ): Promise<{ success: boolean; data?: AttendanceEntry; error?: string }> => {
    const { upsertAttendance } = await import("@/lib/actions/attendance");
    const res = await upsertAttendance({
      employeeId: entry.employeeId,
      date: entry.date,
      jadwalMulai: entry.scheduledStart,
      jadwalSelesai: entry.scheduledEnd,
      jadwalId: entry.jadwalId ?? undefined,
      aktualMulai: entry.actualStart ?? null,
      aktualSelesai: entry.actualEnd ?? null,
    });

    if (res.success && res.data) {
      await refreshAttendances();
    }

    return res;
  };

  // Payroll Actions — backed by PostgreSQL
  const savePayrollSnapshot = async (
    data: SavePayrollInput
  ): Promise<{ success: boolean; data?: Payroll; error?: string }> => {
    const res = await savePayrollAction(data);
    if (res.success && res.data) {
      // Update local payrolls list
      setPayrolls((prev) => {
        const idx = prev.findIndex(
          (p) => p.employeeId === res.data!.employeeId && p.period === res.data!.period
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = res.data!;
          return next;
        }
        return [res.data!, ...prev];
      });

      // Update jobCompletions local state if provided
      if (data.jobCompletions) {
        setJobCompletions((prev) => ({
          ...prev,
          [data.employeeId]: data.jobCompletions!,
        }));
      }

      await refreshData();
    }
    return res;
  };

  const setPayrollStatus = async (
    id: string,
    status: string
  ): Promise<{ success: boolean; data?: Payroll; error?: string }> => {
    const res = await updatePayrollStatusAction(id, status);
    if (res.success && res.data) {
      setPayrolls((prev) =>
        prev.map((p) => (p.id === id ? res.data! : p))
      );
      await refreshData();
    }
    return res;
  };

  // Job Completion Actions (in-memory + synced with DB snapshot)
  const updateJobCompletions = (
    employeeId: string,
    completions: Record<string, boolean>
  ) => {
    setJobCompletions((prev) => ({
      ...prev,
      [employeeId]: completions,
    }));
  };

  // Cafe Profile Action
  const updateCafeProfile = async (
    formData: FormData
  ): Promise<{ success: boolean; data?: CafeProfile; error?: string }> => {
    const res = await updateCafeProfileAction(formData);
    if (res.success && res.data) {
      setCafeProfile(res.data);
    }
    return res;
  };

  // Work Hours & Job Penalty Settings Action
  const updateWorkHoursSettings = async (data: {
    standarJamKerja?: number;
    multiplierLembur?: number;
    dendaPekerjaanPerJob?: number;
  }): Promise<{ success: boolean; data?: CafeProfile; error?: string }> => {
    const res = await updateWorkHoursSettingsAction(data);
    if (res.success && res.data) {
      setCafeProfile(res.data);
    }
    return res;
  };

  // Manager Profile Action
  const updateManagerProfile = async (
    formData: FormData
  ): Promise<{ success: boolean; data?: ManagerProfile; error?: string }> => {
    const res = await updateManagerProfileAction(formData);
    if (res.success && res.data) {
      setManagerProfile(res.data);
    }
    return res;
  };

  return (
    <CafeContext.Provider
      value={{
        positions,
        employees,
        schedules,
        payrolls,
        cafeProfile,
        managerProfile,
        loading,
        refreshData,
        updateCafeProfile,
        updateWorkHoursSettings,
        refreshCafeProfile,
        updateManagerProfile,
        refreshManagerProfile,
        addPosition,
        updatePosition,
        deletePosition,
        getPositionName,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        updateEmployeeJobs,
        addJob,
        updateJob,
        deleteJob,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        deleteSchedulesByDate,
        attendances,
        attendancePeriod,
        setAttendancePeriod,
        refreshAttendances,
        saveAttendances,
        saveSingleAttendance,
        savePayrollSnapshot,
        setPayrollStatus,
        jobCompletions,
        updateJobCompletions,
      }}
    >
      {children}
    </CafeContext.Provider>
  );
}

export function useCafe() {
  const context = useContext(CafeContext);
  if (!context) {
    throw new Error("useCafe must be used within a CafeProvider");
  }
  return context;
}
