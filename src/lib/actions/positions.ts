"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentCafe, requireCurrentCafe } from "@/lib/auth/session";
import type { PositionItem } from "@/types";

export async function getPositions(cafeId?: string): Promise<PositionItem[]> {
  try {
    const cafe = cafeId ? { id: cafeId } : await getCurrentCafe();
    if (!cafe) {
      return [];
    }

    const list = await prisma.jabatan.findMany({
      where: { cafeId: cafe.id },
      orderBy: {
        nama: "asc",
      },
    });

    return list.map((j) => ({
      id: j.id,
      name: j.nama,
      code: j.kode,
      color: j.warna,
    }));
  } catch (error) {
    console.error("Gagal mengambil data jabatan:", error);
    return [];
  }
}

export async function createPosition(data: {
  name: string;
  code?: string;
  color?: string;
  cafeId?: string;
}): Promise<{ success: boolean; data?: PositionItem; error?: string }> {
  try {
    const cafe = data.cafeId ? { id: data.cafeId } : await requireCurrentCafe();

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Nama jabatan wajib diisi." };
    }

    let code = data.code?.trim().toUpperCase();
    if (!code) {
      code = trimmedName
        .toUpperCase()
        .replace(/\s+/g, "_")
        .replace(/[^A-Z0-9_]/g, "");
    }

    if (!code) {
      code = `POS_${Date.now()}`;
    }

    // Check if code already exists within this cafe
    const existing = await prisma.jabatan.findFirst({
      where: {
        cafeId: cafe.id,
        kode: code,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Kode jabatan '${code}' sudah digunakan pada kafe ini. Gunakan nama yang berbeda.`,
      };
    }

    const created = await prisma.jabatan.create({
      data: {
        cafeId: cafe.id,
        nama: trimmedName,
        kode: code,
        warna: data.color || "#64748b",
      },
    });

    return {
      success: true,
      data: {
        id: created.id,
        name: created.nama,
        code: created.kode,
        color: created.warna,
      },
    };
  } catch (error) {
    console.error("Gagal membuat jabatan:", error);
    return {
      success: false,
      error: "Gagal menyimpan jabatan ke database.",
    };
  }
}

export async function updatePosition(
  id: string,
  data: { name: string; color?: string }
): Promise<{ success: boolean; data?: PositionItem; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Nama jabatan tidak boleh kosong." };
    }

    // Verify position belongs to current cafe (prevent IDOR)
    const target = await prisma.jabatan.findFirst({
      where: { id, cafeId: cafe.id },
    });

    if (!target) {
      return { success: false, error: "Jabatan tidak ditemukan pada kafe ini." };
    }

    const updated = await prisma.jabatan.update({
      where: { id },
      data: {
        nama: trimmedName,
        ...(data.color ? { warna: data.color } : {}),
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.nama,
        code: updated.kode,
        color: updated.warna,
      },
    };
  } catch (error) {
    console.error("Gagal memperbarui jabatan:", error);
    return {
      success: false,
      error: "Gagal memperbarui data jabatan.",
    };
  }
}

export async function deletePosition(
  id: string
): Promise<{ success: boolean; inUseCount: number; message?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    // Verify position belongs to current cafe (prevent IDOR)
    const target = await prisma.jabatan.findFirst({
      where: { id, cafeId: cafe.id },
    });

    if (!target) {
      return { success: false, inUseCount: 0, message: "Jabatan tidak ditemukan pada kafe ini." };
    }

    // Check if any employee in this cafe is using this position code
    const inUseCount = await prisma.karyawan.count({
      where: {
        cafeId: cafe.id,
        jabatanKode: target.kode,
      },
    });

    if (inUseCount > 0) {
      return {
        success: false,
        inUseCount,
        message: `Jabatan '${target.nama}' sedang digunakan oleh ${inUseCount} karyawan. Tidak dapat dihapus.`,
      };
    }

    await prisma.jabatan.delete({
      where: { id },
    });

    return { success: true, inUseCount: 0 };
  } catch (error) {
    console.error("Gagal menghapus jabatan:", error);
    return {
      success: false,
      inUseCount: 0,
      message: "Gagal menghapus jabatan dari database.",
    };
  }
}
