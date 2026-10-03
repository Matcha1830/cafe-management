"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth/session";
import type { ManagerProfile } from "@/types";

const DEFAULT_MANAGER: ManagerProfile = {
  nama: "Ahmad Ridwan",
  email: "manager@kopi-nusantara.com",
  fotoProfilPath: null,
  role: "MANAGER",
};

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function getManagerProfile(): Promise<ManagerProfile> {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return DEFAULT_MANAGER;
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        memberships: true,
      },
    });

    if (!user) {
      return DEFAULT_MANAGER;
    }

    return {
      id: user.id,
      nama: user.nama || sessionUser.nama || DEFAULT_MANAGER.nama,
      email: user.email || sessionUser.email || DEFAULT_MANAGER.email,
      fotoProfilPath: user.foto,
      role: user.memberships[0]?.role || "MANAGER",
    };
  } catch (error) {
    console.error("Gagal mengambil profil manager:", error);
    return DEFAULT_MANAGER;
  }
}

export async function updateManagerProfile(
  formData: FormData
): Promise<{ success: boolean; data?: ManagerProfile; error?: string }> {
  try {
    const sessionUser = await requireCurrentUser();

    const namaRaw = formData.get("nama");
    const emailRaw = formData.get("email");
    const removePhotoRaw = formData.get("removePhoto");
    const photoFile = formData.get("photo") as File | null;

    // Get current user to preserve values if omitted
    const current = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        memberships: true,
      },
    });

    const nama =
      typeof namaRaw === "string" && namaRaw.trim()
        ? namaRaw.trim()
        : current?.nama || sessionUser.nama || DEFAULT_MANAGER.nama;

    const email =
      typeof emailRaw === "string" && emailRaw.trim()
        ? emailRaw.trim()
        : current?.email ?? sessionUser.email;

    const removePhoto = removePhotoRaw === "true";

    let newPhotoPath: string | null | undefined = undefined;
    let oldPhotoToDelete: string | null = null;

    if (removePhoto) {
      newPhotoPath = null;
      if (current?.foto?.startsWith("/uploads/profile/")) {
        oldPhotoToDelete = current.foto;
      }
    } else if (photoFile && photoFile instanceof File && photoFile.size > 0) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(photoFile.type)) {
        return {
          success: false,
          error: "Format file tidak didukung. Gunakan format PNG, JPG, atau WebP.",
        };
      }

      // Validate file size
      if (photoFile.size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: "Ukuran file terlalu besar. Maksimal ukuran foto adalah 2 MB.",
        };
      }

      // Map extension
      let ext = "png";
      if (photoFile.type === "image/jpeg") ext = "jpg";
      else if (photoFile.type === "image/webp") ext = "webp";

      const uploadDir = path.join(process.cwd(), "public", "uploads", "profile");
      await fs.mkdir(uploadDir, { recursive: true });

      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const fileName = `manager-${uniqueSuffix}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const arrayBuffer = await photoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      newPhotoPath = `/uploads/profile/${fileName}`;

      if (current?.foto && current.foto.startsWith("/uploads/profile/")) {
        oldPhotoToDelete = current.foto;
      }
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        nama,
        email,
        ...(newPhotoPath !== undefined ? { foto: newPhotoPath } : {}),
      },
      include: {
        memberships: true,
      },
    });

    // Clean up old file after successful database update
    if (oldPhotoToDelete) {
      try {
        const oldFilePath = path.join(process.cwd(), "public", oldPhotoToDelete);
        await fs.unlink(oldFilePath).catch(() => {});
      } catch {
        // Ignore deletion error
      }
    }

    return {
      success: true,
      data: {
        id: updated.id,
        nama: updated.nama,
        email: updated.email,
        fotoProfilPath: updated.foto,
        role: updated.memberships[0]?.role || "MANAGER",
      },
    };
  } catch (error) {
    console.error("Gagal menyimpan profil manager:", error);
    return {
      success: false,
      error: "Terjadi kesalahan server saat menyimpan profil manager.",
    };
  }
}
