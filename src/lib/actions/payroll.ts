"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentCafe } from "@/lib/auth/session";
import type { Payroll, PayrollStatus, PositionType } from "@/types";
import {
  calculateLateMinutes,
  calculateDailyLatePenalty,
  calculateMonthlyAttendanceLateStats,
  calculateJobPenalty,
} from "@/lib/calculations/payroll";
import { getScheduleDurationHours } from "@/components/schedules/schedule-block";

// ============================================================
// MAPPER — DB Penggajian -> Payroll UI Interface
// ============================================================

function mapPenggajianToPayroll(p: {
  id: string;
  karyawanId: string;
  periode: string;
  namaKaryawan: string;
  jabatanKaryawan: string;
  jamRegular: number;
  jamLembur: number;
  gajiPokok: number;
  upahLembur: number;
  tunjangan: number;
  potonganStandar: number;
  totalMenitTerlambat: number;
  dendaKeterlambatan: number;
  dendaBerulang: number;
  dendaPekerjaan: number;
  jumlahPekerjaanSelesai: number;
  jumlahPekerjaanTotal: number;
  gajiKotor: number;
  gajiDiterima: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Payroll {
  return {
    id: p.id,
    employeeId: p.karyawanId,
    employeeName: p.namaKaryawan,
    employeePosition: p.jabatanKaryawan as PositionType,
    period: p.periode,
    regularHours: p.jamRegular,
    overtimeHours: p.jamLembur,
    baseSalary: p.gajiPokok,
    overtimePay: p.upahLembur,
    allowance: p.tunjangan,
    deduction: p.potonganStandar,
    grossSalary: p.gajiKotor,
    netSalary: p.gajiDiterima,
    status: (p.status || "DRAFT") as PayrollStatus,
    totalLateMinutes: p.totalMenitTerlambat,
    latePenalty: p.dendaKeterlambatan,
    repeatedLatePenalty: p.dendaBerulang,
    jobPenalty: p.dendaPekerjaan,
    completedJobsCount: p.jumlahPekerjaanSelesai,
    totalJobsCount: p.jumlahPekerjaanTotal,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ============================================================
// GET PAYROLLS — Ambil seluruh daftar penggajian dari PostgreSQL
// ============================================================

export async function getPayrolls(period?: string): Promise<Payroll[]> {
  try {
    const cafe = await requireCurrentCafe();

    const whereClause: {
      karyawan?: { cafeId: string };
      periode?: string;
    } = {
      karyawan: { cafeId: cafe.id },
    };

    if (period) {
      whereClause.periode = period;
    }

    const list = await prisma.penggajian.findMany({
      where: whereClause,
      include: {
        detailPekerjaanSelesai: true,
      },
      orderBy: [{ periode: "desc" }, { namaKaryawan: "asc" }],
    });

    return list.map(mapPenggajianToPayroll);
  } catch (error) {
    console.error("Gagal mengambil data penggajian:", error);
    return [];
  }
}

// ============================================================
// GET PAYROLL BY EMPLOYEE & PERIOD
// ============================================================

export async function getPayrollByEmployeeAndPeriod(
  employeeId: string,
  period: string
): Promise<{
  payroll: Payroll | null;
  jobDetails: Record<string, boolean>;
}> {
  try {
    const cafe = await requireCurrentCafe();

    const record = await prisma.penggajian.findUnique({
      where: {
        karyawanId_periode: {
          karyawanId: employeeId,
          periode: period,
        },
      },
      include: {
        karyawan: true,
        detailPekerjaanSelesai: true,
      },
    });

    if (!record || record.karyawan.cafeId !== cafe.id) {
      return { payroll: null, jobDetails: {} };
    }

    const jobDetails: Record<string, boolean> = {};
    for (const d of record.detailPekerjaanSelesai) {
      jobDetails[d.pekerjaanId] = d.selesai;
    }

    return {
      payroll: mapPenggajianToPayroll(record),
      jobDetails,
    };
  } catch (error) {
    console.error("Gagal mengambil payroll karyawan:", error);
    return { payroll: null, jobDetails: {} };
  }
}

// ============================================================
// SAVE / UPSERT PAYROLL SNAPSHOT
// Menyimpan snapshot lengkap payroll dan status checklist pekerjaan
// ============================================================

export interface SavePayrollInput {
  employeeId: string;
  period: string; // "YYYY-MM" atau "YYYY-MM-DD"
  employeeName: string;
  employeePosition: string;
  regularHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimePay: number;
  allowance: number;
  deduction: number;
  totalLateMinutes: number;
  latePenalty: number;
  repeatedLatePenalty: number;
  jobPenalty: number;
  completedJobsCount: number;
  totalJobsCount: number;
  grossSalary: number;
  netSalary: number;
  status?: string; // DRAFT | CALCULATED | APPROVED | PAID
  jobCompletions?: Record<string, boolean>; // jobId -> completed
}

export async function savePayroll(
  data: SavePayrollInput
): Promise<{ success: boolean; data?: Payroll; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    if (!data.employeeId || !data.period) {
      return { success: false, error: "Karyawan dan periode wajib diisi." };
    }

    // Pastikan karyawan milik cafe ini
    const emp = await prisma.karyawan.findFirst({
      where: { id: data.employeeId, cafeId: cafe.id },
    });

    if (!emp) {
      return { success: false, error: "Data karyawan tidak ditemukan." };
    }

    // Periksa apakah sudah ada payroll sebelumnya
    const existing = await prisma.penggajian.findUnique({
      where: {
        karyawanId_periode: {
          karyawanId: data.employeeId,
          periode: data.period,
        },
      },
      include: {
        detailPekerjaanSelesai: true,
      },
    });

    // Jika sudah PAID atau APPROVED dan status baru tidak secara eksplisit diubah, lindungi historical
    if (existing && (existing.status === "PAID" || existing.status === "APPROVED") && !data.status) {
      return {
        success: false,
        error: `Payroll periode ini sudah ${existing.status} dan tidak dapat diubah secara otomatis.`,
      };
    }

    const payrollStatus = data.status || (existing?.status ?? "CALCULATED");

    // Upsert Penggajian
    const result = await prisma.penggajian.upsert({
      where: {
        karyawanId_periode: {
          karyawanId: data.employeeId,
          periode: data.period,
        },
      },
      update: {
        namaKaryawan: data.employeeName,
        jabatanKaryawan: data.employeePosition,
        jamRegular: Math.round(data.regularHours),
        jamLembur: Math.round(data.overtimeHours),
        gajiPokok: Math.round(data.baseSalary),
        upahLembur: Math.round(data.overtimePay),
        tunjangan: Math.round(data.allowance),
        potonganStandar: Math.round(data.deduction),
        totalMenitTerlambat: Math.round(data.totalLateMinutes),
        dendaKeterlambatan: Math.round(data.latePenalty),
        dendaBerulang: Math.round(data.repeatedLatePenalty),
        dendaPekerjaan: Math.round(data.jobPenalty),
        jumlahPekerjaanSelesai: Math.round(data.completedJobsCount),
        jumlahPekerjaanTotal: Math.round(data.totalJobsCount),
        gajiKotor: Math.round(data.grossSalary),
        gajiDiterima: Math.round(data.netSalary),
        status: payrollStatus,
      },
      create: {
        karyawanId: data.employeeId,
        periode: data.period,
        namaKaryawan: data.employeeName,
        jabatanKaryawan: data.employeePosition,
        jamRegular: Math.round(data.regularHours),
        jamLembur: Math.round(data.overtimeHours),
        gajiPokok: Math.round(data.baseSalary),
        upahLembur: Math.round(data.overtimePay),
        tunjangan: Math.round(data.allowance),
        potonganStandar: Math.round(data.deduction),
        totalMenitTerlambat: Math.round(data.totalLateMinutes),
        dendaKeterlambatan: Math.round(data.latePenalty),
        dendaBerulang: Math.round(data.repeatedLatePenalty),
        dendaPekerjaan: Math.round(data.jobPenalty),
        jumlahPekerjaanSelesai: Math.round(data.completedJobsCount),
        jumlahPekerjaanTotal: Math.round(data.totalJobsCount),
        gajiKotor: Math.round(data.grossSalary),
        gajiDiterima: Math.round(data.netSalary),
        status: payrollStatus,
      },
    });

    // Simpan DetailPekerjaanPenggajian jika disediakan
    if (data.jobCompletions && Object.keys(data.jobCompletions).length > 0) {
      for (const [jobId, isCompleted] of Object.entries(data.jobCompletions)) {
        // Pastikan pekerjaanHarian ada di cafe ini
        const jobExist = await prisma.pekerjaanHarian.findFirst({
          where: { id: jobId, karyawan: { cafeId: cafe.id } },
        });

        if (jobExist) {
          await prisma.detailPekerjaanPenggajian.upsert({
            where: {
              penggajianId_pekerjaanId: {
                penggajianId: result.id,
                pekerjaanId: jobId,
              },
            },
            update: {
              selesai: Boolean(isCompleted),
            },
            create: {
              penggajianId: result.id,
              pekerjaanId: jobId,
              selesai: Boolean(isCompleted),
            },
          });
        }
      }
    }

    return {
      success: true,
      data: mapPenggajianToPayroll(result),
    };
  } catch (error) {
    console.error("Gagal menyimpan data penggajian ke PostgreSQL:", error);
    return {
      success: false,
      error: "Gagal menyimpan data penggajian ke database.",
    };
  }
}

// ============================================================
// UPDATE PAYROLL STATUS (e.g. DRAFT -> APPROVED / PAID)
// ============================================================

export async function updatePayrollStatus(
  id: string,
  status: string
): Promise<{ success: boolean; data?: Payroll; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const existing = await prisma.penggajian.findUnique({
      where: { id },
      include: { karyawan: true },
    });

    if (!existing || existing.karyawan.cafeId !== cafe.id) {
      return { success: false, error: "Data penggajian tidak ditemukan." };
    }

    const updated = await prisma.penggajian.update({
      where: { id },
      data: { status },
    });

    return {
      success: true,
      data: mapPenggajianToPayroll(updated),
    };
  } catch (error) {
    console.error("Gagal memperbarui status penggajian:", error);
    return {
      success: false,
      error: "Gagal memperbarui status penggajian.",
    };
  }
}
