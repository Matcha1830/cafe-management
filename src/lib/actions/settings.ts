"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getCurrentCafe, requireCurrentCafe } from "@/lib/auth/session";
import type { CafeProfile } from "@/types";

const DEFAULT_PROFILE: CafeProfile = {
  namaKafe: "Kopi Nusantara",
  logoPath: null,
  telepon: "(021) 7890-1234",
  alamat: "Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan",
  standarJamKerja: 8,
  multiplierLembur: 1.5,
  dendaPekerjaanPerJob: 5000,
};

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function getCafeProfile(): Promise<CafeProfile> {
  try {
    const cafeSession = await getCurrentCafe();
    if (!cafeSession) {
      return DEFAULT_PROFILE;
    }

    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeSession.id },
    });

    if (!cafe) {
      return DEFAULT_PROFILE;
    }

    return {
      id: cafe.id,
      namaKafe: cafe.nama || DEFAULT_PROFILE.namaKafe,
      logoPath: cafe.logo,
      telepon: cafe.telepon,
      alamat: cafe.alamat,
      standarJamKerja: cafe.standarJamKerja ?? 8,
      multiplierLembur: cafe.multiplierLembur ?? 1.5,
      dendaPekerjaanPerJob: cafe.dendaPekerjaanPerJob ?? 5000,
    };
  } catch (error) {
    console.error("Gagal mengambil profil kafe:", error);
    return DEFAULT_PROFILE;
  }
}

export async function updateCafeProfile(
  formData: FormData
): Promise<{ success: boolean; data?: CafeProfile; error?: string }> {
  try {
    const cafeSession = await requireCurrentCafe();

    const namaKafeRaw = formData.get("namaKafe");
    const teleponRaw = formData.get("telepon");
    const alamatRaw = formData.get("alamat");
    const removeLogoRaw = formData.get("removeLogo");
    const logoFile = formData.get("logo") as File | null;

    // Optional work hours settings if passed in same form
    const standarJamKerjaRaw = formData.get("standarJamKerja");
    const multiplierLemburRaw = formData.get("multiplierLembur");
    const dendaPekerjaanPerJobRaw = formData.get("dendaPekerjaanPerJob");

    // Get current record to know old logoPath and preserve values if omitted
    const current = await prisma.cafe.findUnique({
      where: { id: cafeSession.id },
    });

    const namaKafe =
      typeof namaKafeRaw === "string" && namaKafeRaw.trim()
        ? namaKafeRaw.trim()
        : current?.nama || DEFAULT_PROFILE.namaKafe;

    const telepon =
      typeof teleponRaw === "string"
        ? teleponRaw.trim() || null
        : current?.telepon ?? DEFAULT_PROFILE.telepon;

    const alamat =
      typeof alamatRaw === "string"
        ? alamatRaw.trim() || null
        : current?.alamat ?? DEFAULT_PROFILE.alamat;

    const standarJamKerja =
      standarJamKerjaRaw !== null
        ? Math.max(1, parseInt(String(standarJamKerjaRaw), 10) || 8)
        : current?.standarJamKerja ?? 8;

    const multiplierLembur =
      multiplierLemburRaw !== null
        ? Math.max(1, parseFloat(String(multiplierLemburRaw)) || 1.5)
        : current?.multiplierLembur ?? 1.5;

    const dendaPekerjaanPerJob =
      dendaPekerjaanPerJobRaw !== null
        ? Math.max(0, parseInt(String(dendaPekerjaanPerJobRaw), 10) || 0)
        : current?.dendaPekerjaanPerJob ?? 5000;

    const removeLogo = removeLogoRaw === "true";

    let newLogoPath: string | null | undefined = undefined;

    if (removeLogo) {
      newLogoPath = null;
      if (current?.logo?.startsWith("/uploads/cafe/")) {
        try {
          const oldFilePath = path.join(process.cwd(), "public", current.logo);
          await fs.unlink(oldFilePath).catch(() => {});
        } catch {
          // Ignore deletion error
        }
      }
    } else if (logoFile && logoFile instanceof File && logoFile.size > 0) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(logoFile.type)) {
        return {
          success: false,
          error: "Format file tidak didukung. Gunakan format PNG, JPG, atau WebP.",
        };
      }

      // Validate file size
      if (logoFile.size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: "Ukuran file terlalu besar. Maksimal ukuran gambar adalah 2 MB.",
        };
      }

      // Map extension
      let ext = "png";
      if (logoFile.type === "image/jpeg") ext = "jpg";
      else if (logoFile.type === "image/webp") ext = "webp";

      const uploadDir = path.join(process.cwd(), "public", "uploads", "cafe");
      await fs.mkdir(uploadDir, { recursive: true });

      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const fileName = `logo-${uniqueSuffix}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const arrayBuffer = await logoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      newLogoPath = `/uploads/cafe/${fileName}`;

      // Clean up previous custom logo if existed
      if (current?.logo && current.logo.startsWith("/uploads/cafe/")) {
        try {
          const oldFilePath = path.join(process.cwd(), "public", current.logo);
          await fs.unlink(oldFilePath).catch(() => {});
        } catch {
          // Ignore deletion error
        }
      }
    }

    const updated = await prisma.cafe.update({
      where: { id: cafeSession.id },
      data: {
        nama: namaKafe,
        telepon,
        alamat,
        standarJamKerja,
        multiplierLembur,
        dendaPekerjaanPerJob,
        ...(newLogoPath !== undefined ? { logo: newLogoPath } : {}),
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        namaKafe: updated.nama,
        logoPath: updated.logo,
        telepon: updated.telepon,
        alamat: updated.alamat,
        standarJamKerja: updated.standarJamKerja,
        multiplierLembur: updated.multiplierLembur,
        dendaPekerjaanPerJob: updated.dendaPekerjaanPerJob,
      },
    };
  } catch (error) {
    console.error("Gagal menyimpan profil kafe:", error);
    return {
      success: false,
      error: "Terjadi kesalahan server saat menyimpan profil kafe.",
    };
  }
}

export async function updateWorkHoursSettings(data: {
  standarJamKerja?: number;
  multiplierLembur?: number;
  dendaPekerjaanPerJob?: number;
}): Promise<{ success: boolean; data?: CafeProfile; error?: string }> {
  try {
    const cafeSession = await requireCurrentCafe();

    const standarJamKerja =
      data.standarJamKerja !== undefined
        ? Math.max(1, Math.round(data.standarJamKerja))
        : undefined;

    const multiplierLembur =
      data.multiplierLembur !== undefined
        ? Math.max(1, data.multiplierLembur)
        : undefined;

    const dendaPekerjaanPerJob =
      data.dendaPekerjaanPerJob !== undefined
        ? Math.max(0, Math.round(data.dendaPekerjaanPerJob))
        : undefined;

    const updated = await prisma.cafe.update({
      where: { id: cafeSession.id },
      data: {
        ...(standarJamKerja !== undefined ? { standarJamKerja } : {}),
        ...(multiplierLembur !== undefined ? { multiplierLembur } : {}),
        ...(dendaPekerjaanPerJob !== undefined ? { dendaPekerjaanPerJob } : {}),
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        namaKafe: updated.nama,
        logoPath: updated.logo,
        telepon: updated.telepon,
        alamat: updated.alamat,
        standarJamKerja: updated.standarJamKerja,
        multiplierLembur: updated.multiplierLembur,
        dendaPekerjaanPerJob: updated.dendaPekerjaanPerJob,
      },
    };
  } catch (error) {
    console.error("Gagal menyimpan aturan jam kerja & denda:", error);
    return {
      success: false,
      error: "Terjadi kesalahan server saat menyimpan aturan jam kerja & denda.",
    };
  }
}
