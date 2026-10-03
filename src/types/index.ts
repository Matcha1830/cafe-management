// ============================================================
// Core Types — Cafe Employee Management System
// ============================================================

// ----- Enums ------------------------------------------------

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";

export type Gender = "LAKI_LAKI" | "PEREMPUAN";

export type PositionType =
  | "KAPTEN"
  | "KARYAWAN"
  | "BARISTA"
  | "KASIR"
  | "KITCHEN"
  | "WAITER"
  | "SUPERVISOR"
  | "CLEANING"
  | "MANAGER"
  | (string & {});

export type ScheduleStatus =
  | "KERJA"
  | "CUTI"
  | "IZIN"
  | "LIBUR"
  | "BEKERJA"
  | "TERJADWAL"
  | "TERLAMBAT";

export type PayrollStatus = "DRAFT" | "CALCULATED" | "APPROVED" | "PAID";

// ----- Position Item (Dynamic CRUD) ------------------------

export interface PositionItem {
  id: string;
  name: string;
  code: string;
  color?: string;
}

// ----- Employee Job (List Job) ------------------------------

export interface EmployeeJob {
  id: string;
  title: string;
}

// ----- Attendance -------------------------------------------

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  date: string; // ISO date string "YYYY-MM-DD"
  scheduledStart: string; // "HH:MM"
  scheduledEnd: string; // "HH:MM"
  actualStart: string | null; // "HH:MM"
  actualEnd: string | null; // "HH:MM"
  jadwalId?: string | null;
}

export interface PayrollJobCompletion {
  jobId: string;
  completed: boolean;
}

// ----- Employee ---------------------------------------------

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  position: PositionType;
  employmentType: EmploymentType;
  gender?: Gender;
  jenisKelamin?: Gender;
  status: EmployeeStatus;
  joinDate: string; // ISO date string
  baseSalary: number;
  hourlyRate: number;
  dailyWorkingHours?: number; // Jam kerja standar per hari (default 8)
  jamKerjaHarian?: number;
  jobDescription?: string;
  jobs?: EmployeeJob[] | null;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// ----- Schedule ---------------------------------------------

export interface Schedule {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: PositionType;
  date: string; // ISO date string "YYYY-MM-DD"
  startTime?: string | null; // "HH:MM"
  endTime?: string | null; // "HH:MM"
  breakMinutes: number;
  isOvernight: boolean;
  status: ScheduleStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ----- Payroll ----------------------------------------------

export interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: PositionType;
  period: string; // "YYYY-MM" e.g. "2026-08"
  regularHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimePay: number;
  allowance: number;
  deduction: number;
  grossSalary: number;
  netSalary: number;
  status: PayrollStatus;
  totalLateMinutes?: number;
  latePenalty?: number;
  repeatedLatePenalty?: number;
  jobPenalty?: number;
  completedJobsCount?: number;
  totalJobsCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ----- Position Label Mapping -------------------------------

export const POSITION_LABELS: Record<string, string> = {
  KAPTEN: "Kapten",
  KARYAWAN: "Karyawan",
  BARISTA: "Barista",
  KASIR: "Kasir",
  KITCHEN: "Dapur",
  WAITER: "Pelayan",
  SUPERVISOR: "Supervisor",
  CLEANING: "Kebersihan",
  MANAGER: "Manajer",
};

export const POSITION_COLORS: Record<string, string> = {
  KAPTEN: "#ea580c",
  KARYAWAN: "#0284c7",
  BARISTA: "#92400e",
  KASIR: "#1d4ed8",
  KITCHEN: "#7c3aed",
  WAITER: "#047857",
  SUPERVISOR: "#b45309",
  CLEANING: "#0e7490",
  MANAGER: "#be123c",
};

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  ON_LEAVE: "Cuti",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Penuh Waktu",
  PART_TIME: "Paruh Waktu",
  CONTRACT: "Kontrak",
};

export const GENDER_LABELS: Record<Gender, string> = {
  LAKI_LAKI: "Laki-laki",
  PEREMPUAN: "Perempuan",
};

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  KERJA: "Kerja",
  CUTI: "Cuti",
  IZIN: "Izin",
  LIBUR: "Libur",
  BEKERJA: "Bekerja",
  TERJADWAL: "Terjadwal",
  TERLAMBAT: "Terlambat",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: "Draft",
  CALCULATED: "Dihitung",
  APPROVED: "Disetujui",
  PAID: "Dibayar",
};

// ----- Dashboard Stats --------------------------------------

export interface DashboardStats {
  totalEmployees: number;
  activeToday: number;
  currentlyWorking: number;
  totalWorkHours: number;
  estimatedPayroll: number;
  overtimeHours: number;
}

// ----- Cafe Profile (Settings / Branding) --------------------

export interface CafeProfile {
  id?: string;
  namaKafe: string;
  logoPath?: string | null;
  telepon?: string | null;
  alamat?: string | null;
  standarJamKerja?: number;
  multiplierLembur?: number;
  dendaPekerjaanPerJob?: number;
}

// ----- Manager Profile (Account / Profile Page) --------------

export interface ManagerProfile {
  id?: string;
  nama: string;
  email?: string | null;
  fotoProfilPath?: string | null;
  role?: string;
}

