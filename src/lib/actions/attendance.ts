"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentCafe } from "@/lib/auth/session";
import type { AttendanceEntry } from "@/types";

// ============================================================
// DATE HELPERS — konsisten dengan schedules.ts
// Menggunakan UTC midnight agar tanggal tidak bergeser di Asia/Jakarta
// ============================================================

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function formatDateOnly(date: Date): string {
  // Menggunakan UTC date parts agar tidak bergeser
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ============================================================
// MAPPER — Kehadiran DB → AttendanceEntry (UI type)
// ============================================================

function mapKehadiranToAttendanceEntry(k: {
  id: string;
  karyawanId: string;
  tanggal: Date;
  jadwalMulai: string;
  jadwalSelesai: string;
  aktualMulai: string | null;
  aktualSelesai: string | null;
}): AttendanceEntry {
  return {
    id: k.id,
    employeeId: k.karyawanId,
    date: formatDateOnly(k.tanggal),
    scheduledStart: k.jadwalMulai,
    scheduledEnd: k.jadwalSelesai,
    actualStart: k.aktualMulai ?? null,
    actualEnd: k.aktualSelesai ?? null,
  };
}

// ============================================================
// GET — Ambil kehadiran per karyawan untuk periode tertentu
// period: "YYYY-MM" (opsional, jika tidak diisi ambil semua)
// ============================================================

export async function getAttendanceByEmployee(
  employeeId: string,
  period?: string // "YYYY-MM"
): Promise<AttendanceEntry[]> {
  try {
    const cafe = await requireCurrentCafe();

    // Verify employee belongs to current cafe
    const emp = await prisma.karyawan.findFirst({
      where: { id: employeeId, cafeId: cafe.id },
    });

    if (!emp) {
      return [];
    }

    const whereClause: {
      karyawanId: string;
      tanggal?: {
        gte: Date;
        lte: Date;
      };
    } = { karyawanId: employeeId };

    if (period) {
      const [year, month] = period.split("-").map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      whereClause.tanggal = {
        gte: startDate,
        lte: endDate,
      };
    }

    const list = await prisma.kehadiran.findMany({
      where: whereClause,
      orderBy: { tanggal: "asc" },
    });

    return list.map(mapKehadiranToAttendanceEntry);
  } catch (error) {
    console.error("Gagal mengambil data kehadiran:", error);
    return [];
  }
}

// ============================================================
// GET ALL — Ambil semua kehadiran semua karyawan untuk periode
// Digunakan untuk preload ke context
// ============================================================

export async function getAllAttendanceByPeriod(
  period?: string
): Promise<Record<string, AttendanceEntry[]>> {
  try {
    const cafe = await requireCurrentCafe();

    const whereClause: {
      karyawan?: { cafeId: string };
      tanggal?: {
        gte: Date;
        lte: Date;
      };
    } = {
      karyawan: { cafeId: cafe.id },
    };

    if (period) {
      const [year, month] = period.split("-").map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      whereClause.tanggal = {
        gte: startDate,
        lte: endDate,
      };
    }

    const list = await prisma.kehadiran.findMany({
      where: whereClause,
      orderBy: [{ karyawanId: "asc" }, { tanggal: "asc" }],
    });

    // Group by employeeId
    const result: Record<string, AttendanceEntry[]> = {};
    for (const k of list) {
      if (!result[k.karyawanId]) {
        result[k.karyawanId] = [];
      }
      result[k.karyawanId].push(mapKehadiranToAttendanceEntry(k));
    }

    return result;
  } catch (error) {
    console.error("Gagal mengambil semua data kehadiran:", error);
    return {};
  }
}

// ============================================================
// UPSERT — Simpan satu entri kehadiran (create jika baru, update jika sudah ada)
// Mengikuti @@unique([karyawanId, tanggal])
// ============================================================

export async function upsertAttendance(data: {
  employeeId: string;
  date: string; // "YYYY-MM-DD"
  jadwalMulai?: string; // snapshot dari jadwal
  jadwalSelesai?: string; // snapshot dari jadwal
  scheduledStart?: string; // alias dari types
  scheduledEnd?: string; // alias dari types
  jadwalId?: string | null; // opsional: referensi jadwal
  aktualMulai?: string | null;
  aktualSelesai?: string | null;
}): Promise<{ success: boolean; data?: AttendanceEntry; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    if (!data.employeeId || !data.date) {
      return { success: false, error: "Karyawan dan tanggal wajib diisi." };
    }

    const parsedDate = parseDateOnly(data.date);
    const start = data.jadwalMulai || data.scheduledStart || "08:00";
    const end = data.jadwalSelesai || data.scheduledEnd || "16:00";

    // Verifikasi karyawan ada dan milik cafe aktif
    const karyawan = await prisma.karyawan.findFirst({
      where: { id: data.employeeId, cafeId: cafe.id },
    });
    if (!karyawan) {
      return { success: false, error: "Data karyawan tidak ditemukan." };
    }

    const result = await prisma.kehadiran.upsert({
      where: {
        karyawanId_tanggal: {
          karyawanId: data.employeeId,
          tanggal: parsedDate,
        },
      },
      update: {
        jadwalMulai: start,
        jadwalSelesai: end,
        ...(data.jadwalId !== undefined ? { jadwalId: data.jadwalId } : {}),
        aktualMulai: data.aktualMulai ?? null,
        aktualSelesai: data.aktualSelesai ?? null,
      },
      create: {
        karyawanId: data.employeeId,
        tanggal: parsedDate,
        jadwalMulai: start,
        jadwalSelesai: end,
        ...(data.jadwalId ? { jadwalId: data.jadwalId } : {}),
        aktualMulai: data.aktualMulai ?? null,
        aktualSelesai: data.aktualSelesai ?? null,
      },
    });

    return {
      success: true,
      data: mapKehadiranToAttendanceEntry(result),
    };
  } catch (error) {
    console.error("Gagal menyimpan kehadiran:", error);
    return {
      success: false,
      error: "Gagal menyimpan data kehadiran ke database.",
    };
  }
}

// ============================================================
// UPSERT BATCH — Simpan banyak entri kehadiran sekaligus
// Digunakan saat user klik "Simpan Perubahan" di Edit Slip Gaji
// ============================================================

export async function upsertAttendanceBatch(
  entries: Array<{
    employeeId: string;
    date: string;
    jadwalMulai: string;
    jadwalSelesai: string;
    jadwalId?: string;
    aktualMulai?: string | null;
    aktualSelesai?: string | null;
  }>
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      const res = await upsertAttendance(entry);
      if (res.success) {
        count++;
      } else {
        errors.push(`${entry.date}: ${res.error}`);
      }
    }

    if (errors.length > 0 && count === 0) {
      return {
        success: false,
        count: 0,
        error: errors.join("; "),
      };
    }

    return { success: true, count };
  } catch (error) {
    console.error("Gagal batch upsert kehadiran:", error);
    return {
      success: false,
      count: 0,
      error: "Gagal menyimpan data kehadiran secara batch.",
    };
  }
}
