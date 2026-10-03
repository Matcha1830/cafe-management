import type { AttendanceEntry } from "@/types";

export const initialAttendances: Record<string, AttendanceEntry[]> = {
  // emp-001 (Agung) - Data bulan Agustus 2026 (Sesuai contoh di instruksi)
  "emp-001": [
    {
      id: "att-001-01",
      employeeId: "emp-001",
      date: "2026-08-03",
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      actualStart: "08:14", // Terlambat 14 menit -> Denda Rp5.000
      actualEnd: "16:05",
    },
    {
      id: "att-001-02",
      employeeId: "emp-001",
      date: "2026-08-04",
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      actualStart: "08:06", // 6 menit (dalam grace period 10 menit) -> Rp0
      actualEnd: "16:00",
    },
    {
      id: "att-001-03",
      employeeId: "emp-001",
      date: "2026-08-05",
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      actualStart: "08:10", // 10 menit (tepat di batas grace period) -> Rp0
      actualEnd: "16:10",
    },
    {
      id: "att-001-04",
      employeeId: "emp-001",
      date: "2026-08-07",
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      actualStart: "08:35", // Terlambat 35 menit (>=29m ke-1) -> Denda Rp10.000
      actualEnd: "16:00",
    },
    {
      id: "att-001-05",
      employeeId: "emp-001",
      date: "2026-08-10",
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      actualStart: "07:55", // Tepat waktu -> Rp0
      actualEnd: "16:00",
    },
    {
      id: "att-001-06",
      employeeId: "emp-001",
      date: "2026-08-12",
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      actualStart: "08:42", // Terlambat 42 menit (>=29m ke-2) -> Denda Rp10.000
      actualEnd: "16:00",
    },
    {
      id: "att-001-07",
      employeeId: "emp-001",
      date: "2026-08-17",
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      actualStart: "08:00",
      actualEnd: "16:00",
    },
    {
      id: "att-001-08",
      employeeId: "emp-001",
      date: "2026-08-19",
      scheduledStart: "14:00",
      scheduledEnd: "22:00",
      actualStart: "14:04",
      actualEnd: "22:00",
    },
    {
      id: "att-001-09",
      employeeId: "emp-001",
      date: "2026-08-20",
      scheduledStart: "08:00",
      scheduledEnd: "16:00",
      actualStart: "08:31", // Terlambat 31 menit (>=29m ke-3 -> Memicu Penalti Berulang Rp50.000) -> Denda Rp10.000
      actualEnd: "16:15",
    },
    {
      id: "att-001-10",
      employeeId: "emp-001",
      date: "2026-08-21",
      scheduledStart: "07:00",
      scheduledEnd: "15:00",
      actualStart: "07:00",
      actualEnd: "15:00",
    },
    {
      id: "att-001-11",
      employeeId: "emp-001",
      date: "2026-08-22",
      scheduledStart: "07:00",
      scheduledEnd: "15:00",
      actualStart: "07:00",
      actualEnd: "15:00",
    },
  ],

  // emp-002 (Siti)
  "emp-002": [
    {
      id: "att-002-01",
      employeeId: "emp-002",
      date: "2026-08-03",
      scheduledStart: "09:00",
      scheduledEnd: "17:00",
      actualStart: "09:05",
      actualEnd: "17:00",
    },
    {
      id: "att-002-02",
      employeeId: "emp-002",
      date: "2026-08-10",
      scheduledStart: "09:00",
      scheduledEnd: "17:00",
      actualStart: "09:12", // 12 min -> 5.000
      actualEnd: "17:00",
    },
    {
      id: "att-002-03",
      employeeId: "emp-002",
      date: "2026-08-17",
      scheduledStart: "09:00",
      scheduledEnd: "15:00",
      actualStart: "09:00",
      actualEnd: "15:00",
    },
    {
      id: "att-002-04",
      employeeId: "emp-002",
      date: "2026-08-19",
      scheduledStart: "09:00",
      scheduledEnd: "17:00",
      actualStart: "09:00",
      actualEnd: "17:00",
    },
    {
      id: "att-002-05",
      employeeId: "emp-002",
      date: "2026-08-23",
      scheduledStart: "09:00",
      scheduledEnd: "17:00",
      actualStart: "09:00",
      actualEnd: "17:00",
    },
  ],

  // emp-003 (Budi)
  "emp-003": [
    {
      id: "att-003-01",
      employeeId: "emp-003",
      date: "2026-08-03",
      scheduledStart: "07:00",
      scheduledEnd: "14:00",
      actualStart: "07:00",
      actualEnd: "14:00",
    },
    {
      id: "att-003-02",
      employeeId: "emp-003",
      date: "2026-08-17",
      scheduledStart: "07:00",
      scheduledEnd: "14:00",
      actualStart: "07:00",
      actualEnd: "14:00",
    },
    {
      id: "att-003-03",
      employeeId: "emp-003",
      date: "2026-08-19",
      scheduledStart: "10:00",
      scheduledEnd: "17:00",
      actualStart: "10:00",
      actualEnd: "17:00",
    },
    {
      id: "att-003-04",
      employeeId: "emp-003",
      date: "2026-08-22",
      scheduledStart: "09:00",
      scheduledEnd: "16:00",
      actualStart: "09:15", // 15 min -> 5.000
      actualEnd: "16:00",
    },
  ],
};

// Initial Job completions per employee for August 2026
// Record<employeeId, Record<jobId, boolean>>
export const initialJobCompletions: Record<string, Record<string, boolean>> = {
  "emp-001": {
    "job-101": true,  // Membersihkan WC (Checked)
    "job-102": true,  // Menjaga kasir (Checked)
    "job-103": true,  // Mengecek stok coffee (Checked)
    "job-104": true,  // Mengecek bahan makanan (Checked)
    "job-105": true,  // Membersihkan area cafe (Checked)
    "job-106": true,  // Membuat konten cafe (Checked)
    "job-107": false, // Closing cafe (Unchecked -> Denda Rp5.000)
  },
  "emp-002": {
    "job-201": true,
    "job-202": true,
    "job-203": true,
    "job-204": true,
  },
  "emp-003": {
    "job-301": true,
    "job-302": true,
    "job-303": true,
    "job-304": false,
  },
};
