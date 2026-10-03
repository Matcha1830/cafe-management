"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentCafe } from "@/lib/auth/session";
import type { EmployeeJob } from "@/types";

export async function getEmployeeJobs(
  employeeId: string
): Promise<EmployeeJob[]> {
  try {
    const cafe = await requireCurrentCafe();

    // Verify employee belongs to this cafe
    const employee = await prisma.karyawan.findFirst({
      where: { id: employeeId, cafeId: cafe.id },
    });

    if (!employee) {
      return [];
    }

    const list = await prisma.pekerjaanHarian.findMany({
      where: { karyawanId: employeeId },
      orderBy: { createdAt: "asc" },
    });

    return list.map((j) => ({
      id: j.id,
      title: j.judul,
    }));
  } catch (error) {
    console.error("Gagal mengambil daftar pekerjaan karyawan:", error);
    return [];
  }
}

export async function createJob(
  employeeId: string,
  title: string
): Promise<{ success: boolean; data?: EmployeeJob; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const trimmedTitle = title?.trim();
    if (!trimmedTitle) {
      return { success: false, error: "Nama pekerjaan tidak boleh kosong." };
    }

    const employee = await prisma.karyawan.findFirst({
      where: { id: employeeId, cafeId: cafe.id },
    });

    if (!employee) {
      return { success: false, error: "Data karyawan tidak ditemukan pada kafe ini." };
    }

    const created = await prisma.pekerjaanHarian.create({
      data: {
        karyawanId: employeeId,
        judul: trimmedTitle,
      },
    });

    return {
      success: true,
      data: {
        id: created.id,
        title: created.judul,
      },
    };
  } catch (error) {
    console.error("Gagal menambahkan pekerjaan karyawan:", error);
    return {
      success: false,
      error: "Gagal menyimpan pekerjaan ke database.",
    };
  }
}

export async function updateJob(
  id: string,
  title: string
): Promise<{ success: boolean; data?: EmployeeJob; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const trimmedTitle = title?.trim();
    if (!trimmedTitle) {
      return { success: false, error: "Nama pekerjaan tidak boleh kosong." };
    }

    const existing = await prisma.pekerjaanHarian.findFirst({
      where: {
        id,
        karyawan: { cafeId: cafe.id },
      },
    });

    if (!existing) {
      return { success: false, error: "Pekerjaan tidak ditemukan pada kafe ini." };
    }

    const updated = await prisma.pekerjaanHarian.update({
      where: { id },
      data: {
        judul: trimmedTitle,
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        title: updated.judul,
      },
    };
  } catch (error) {
    console.error("Gagal mengubah pekerjaan karyawan:", error);
    return {
      success: false,
      error: "Gagal memperbarui pekerjaan di database.",
    };
  }
}

export async function deleteJob(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const existing = await prisma.pekerjaanHarian.findFirst({
      where: {
        id,
        karyawan: { cafeId: cafe.id },
      },
    });

    if (!existing) {
      return { success: false, error: "Pekerjaan tidak ditemukan pada kafe ini." };
    }

    // Check if referenced by DetailPekerjaanPenggajian
    const inUseCount = await prisma.detailPekerjaanPenggajian.count({
      where: { pekerjaanId: id },
    });

    if (inUseCount > 0) {
      return {
        success: false,
        error:
          "Pekerjaan ini sudah tercatat dalam riwayat penggajian dan tidak dapat dihapus demi menjaga integritas data slip gaji.",
      };
    }

    await prisma.pekerjaanHarian.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus pekerjaan karyawan:", error);
    return {
      success: false,
      error: "Gagal menghapus pekerjaan dari database.",
    };
  }
}
