"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentCafe } from "@/lib/auth/session";
import type { Schedule, ScheduleStatus, PositionType } from "@/types";

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

function mapJadwalToSchedule(j: {
  id: string;
  karyawanId: string;
  tanggal: Date;
  jamMulai: string | null;
  jamSelesai: string | null;
  isOvernightShift: boolean;
  status: string;
  catatan: string | null;
  createdAt: Date;
  updatedAt: Date;
  karyawan: {
    nama: string;
    jabatanKode: string;
  };
}): Schedule {
  return {
    id: j.id,
    employeeId: j.karyawanId,
    employeeName: j.karyawan.nama,
    employeePosition: j.karyawan.jabatanKode as PositionType,
    date: formatDateOnly(j.tanggal),
    startTime: j.jamMulai ?? null,
    endTime: j.jamSelesai ?? null,
    breakMinutes: 0,
    isOvernight: j.isOvernightShift,
    status: (j.status || "KERJA") as ScheduleStatus,
    notes: j.catatan || "",
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

export async function getSchedules(
  startDate?: string,
  endDate?: string
): Promise<Schedule[]> {
  try {
    const cafe = await requireCurrentCafe();

    const whereClause: {
      karyawan?: { cafeId: string };
      tanggal?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      karyawan: { cafeId: cafe.id },
    };

    if (startDate && endDate) {
      whereClause.tanggal = {
        gte: parseDateOnly(startDate),
        lte: parseDateOnly(endDate),
      };
    } else if (startDate) {
      whereClause.tanggal = {
        gte: parseDateOnly(startDate),
      };
    }

    const list = await prisma.jadwal.findMany({
      where: whereClause,
      include: {
        karyawan: true,
      },
      orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }],
    });

    return list.map(mapJadwalToSchedule);
  } catch (error) {
    console.error("Gagal mengambil data jadwal:", error);
    return [];
  }
}

export async function createSchedule(data: {
  employeeId: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  isOvernight?: boolean;
  status?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: Schedule; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    if (!data.employeeId) {
      return { success: false, error: "Karyawan wajib dipilih." };
    }

    if (!data.date) {
      return { success: false, error: "Tanggal wajib diisi." };
    }

    const normalizedStatus = data.status || "KERJA";
    const isWork =
      normalizedStatus === "KERJA" ||
      normalizedStatus === "BEKERJA" ||
      normalizedStatus === "TERJADWAL";

    let finalStartTime: string | null = null;
    let finalEndTime: string | null = null;
    let isOvernight = false;

    if (isWork) {
      if (!data.startTime || !data.endTime) {
        return {
          success: false,
          error: "Jam mulai dan jam selesai wajib diisi untuk jadwal Kerja.",
        };
      }
      finalStartTime = data.startTime;
      finalEndTime = data.endTime;

      if (data.isOvernight !== undefined) {
        isOvernight = Boolean(data.isOvernight);
      } else {
        const [sh, sm] = finalStartTime.split(":").map(Number);
        const [eh, em] = finalEndTime.split(":").map(Number);
        const startMin = (sh || 0) * 60 + (sm || 0);
        const endMin = (eh || 0) * 60 + (em || 0);
        if (endMin <= startMin) {
          isOvernight = true;
        }
      }
    }

    const employee = await prisma.karyawan.findFirst({
      where: { id: data.employeeId, cafeId: cafe.id },
    });

    if (!employee) {
      return { success: false, error: "Data karyawan tidak ditemukan." };
    }

    const parsedDate = parseDateOnly(data.date);

    // Business rule: Satu karyawan hanya SATU jadwal/status per tanggal (unique constraint)
    const existing = await prisma.jadwal.findUnique({
      where: {
        karyawanId_tanggal: {
          karyawanId: data.employeeId,
          tanggal: parsedDate,
        },
      },
    });

    if (existing) {
      if (
        existing.status === "CUTI" ||
        existing.status === "IZIN" ||
        existing.status === "LIBUR"
      ) {
        return {
          success: false,
          error: `Karyawan ${employee.nama} berstatus ${existing.status} pada tanggal ${data.date}. Hapus atau ubah status Libur/Izin terlebih dahulu.`,
        };
      }
      return {
        success: false,
        error: `Karyawan ${employee.nama} sudah memiliki jadwal kerja pada tanggal ${data.date}. Satu karyawan hanya boleh memiliki satu status jadwal per hari.`,
      };
    }

    const created = await prisma.jadwal.create({
      data: {
        karyawanId: data.employeeId,
        tanggal: parsedDate,
        jamMulai: finalStartTime,
        jamSelesai: finalEndTime,
        isOvernightShift: isOvernight,
        status: normalizedStatus,
        catatan: data.notes || null,
      },
      include: {
        karyawan: true,
      },
    });

    return {
      success: true,
      data: mapJadwalToSchedule(created),
    };
  } catch (error) {
    console.error("Gagal membuat jadwal:", error);
    return {
      success: false,
      error: "Gagal menyimpan jadwal ke database.",
    };
  }
}

export async function updateSchedule(
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
): Promise<{ success: boolean; data?: Schedule; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const existing = await prisma.jadwal.findUnique({
      where: { id },
      include: { karyawan: true },
    });

    if (!existing || existing.karyawan.cafeId !== cafe.id) {
      return { success: false, error: "Jadwal tidak ditemukan." };
    }

    const targetEmployeeId = data.employeeId || existing.karyawanId;
    if (data.employeeId && data.employeeId !== existing.karyawanId) {
      const targetEmp = await prisma.karyawan.findFirst({
        where: { id: data.employeeId, cafeId: cafe.id },
      });
      if (!targetEmp) {
        return { success: false, error: "Data karyawan target tidak ditemukan." };
      }
    }

    const targetDate = data.date ? parseDateOnly(data.date) : existing.tanggal;
    const newStatus = data.status !== undefined ? data.status : existing.status;
    const isWork =
      newStatus === "KERJA" ||
      newStatus === "BEKERJA" ||
      newStatus === "TERJADWAL";

    // If changing employee or date, check for uniqueness conflict
    if (
      (data.employeeId && data.employeeId !== existing.karyawanId) ||
      (data.date && data.date !== formatDateOnly(existing.tanggal))
    ) {
      const conflict = await prisma.jadwal.findUnique({
        where: {
          karyawanId_tanggal: {
            karyawanId: targetEmployeeId,
            tanggal: targetDate,
          },
        },
      });

      if (conflict && conflict.id !== id) {
        return {
          success: false,
          error: "Karyawan sudah memiliki jadwal pada tanggal tersebut.",
        };
      }
    }

    let newStartTime: string | null = null;
    let newEndTime: string | null = null;
    let isOvernight = false;

    if (isWork) {
      newStartTime =
        data.startTime !== undefined ? data.startTime : existing.jamMulai;
      newEndTime =
        data.endTime !== undefined ? data.endTime : existing.jamSelesai;

      if (!newStartTime || !newEndTime) {
        return {
          success: false,
          error: "Jam mulai dan jam selesai wajib diisi untuk jadwal Kerja.",
        };
      }

      if (data.isOvernight !== undefined) {
        isOvernight = data.isOvernight;
      } else {
        const [sh, sm] = newStartTime.split(":").map(Number);
        const [eh, em] = newEndTime.split(":").map(Number);
        const startMin = (sh || 0) * 60 + (sm || 0);
        const endMin = (eh || 0) * 60 + (em || 0);
        isOvernight = endMin <= startMin;
      }
    } else {
      // Non-work statuses (CUTI, IZIN, LIBUR)
      newStartTime = null;
      newEndTime = null;
      isOvernight = false;
    }

    const updated = await prisma.jadwal.update({
      where: { id },
      data: {
        karyawanId: targetEmployeeId,
        tanggal: targetDate,
        jamMulai: newStartTime,
        jamSelesai: newEndTime,
        isOvernightShift: isOvernight,
        status: newStatus,
        ...(data.notes !== undefined ? { catatan: data.notes } : {}),
      },
      include: {
        karyawan: true,
      },
    });

    return {
      success: true,
      data: mapJadwalToSchedule(updated),
    };
  } catch (error) {
    console.error("Gagal memperbarui jadwal:", error);
    return {
      success: false,
      error: "Gagal memperbarui jadwal di database.",
    };
  }
}

export async function deleteSchedule(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const existing = await prisma.jadwal.findUnique({
      where: { id },
      include: {
        karyawan: true,
        kehadiran: { take: 1 },
      },
    });

    if (!existing || existing.karyawan.cafeId !== cafe.id) {
      return { success: false, error: "Jadwal tidak ditemukan." };
    }

    if (existing.kehadiran.length > 0) {
      return {
        success: false,
        error:
          "Jadwal ini sudah memiliki catatan kehadiran terkait dan tidak dapat dihapus secara langsung demi menjaga histori presensi.",
      };
    }

    await prisma.jadwal.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus jadwal:", error);
    return {
      success: false,
      error: "Gagal menghapus jadwal dari database.",
    };
  }
}

/**
 * Delete ALL KERJA schedules for a specific date in the current cafe.
 * CUTI, IZIN, and LIBUR schedules are preserved.
 * Linked attendance records are unlinked before deletion to ensure clean database removal.
 */
export async function deleteSchedulesByDate(
  date: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();
    const parsedDate = parseDateOnly(date);

    // Find all non-leave schedules for this date belonging to current cafe
    const kerjaSchedules = await prisma.jadwal.findMany({
      where: {
        tanggal: parsedDate,
        status: { notIn: ["CUTI", "IZIN", "LIBUR"] },
        karyawan: { cafeId: cafe.id },
      },
      select: { id: true },
    });

    const targetIds = kerjaSchedules.map((s) => s.id);

    if (targetIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // 1. Unlink linked kehadiran records so foreign key constraint doesn't block deletion
    await prisma.kehadiran.updateMany({
      where: { jadwalId: { in: targetIds } },
      data: { jadwalId: null },
    });

    // 2. Delete the KERJA schedules
    await prisma.jadwal.deleteMany({
      where: { id: { in: targetIds } },
    });

    return { success: true, deletedCount: targetIds.length };
  } catch (error) {
    console.error("Gagal mereset jadwal hari:", error);
    return {
      success: false,
      deletedCount: 0,
      error: "Gagal menghapus jadwal dari database.",
    };
  }
}

