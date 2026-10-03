"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function registerAction(data: RegisterInput): Promise<AuthResult> {
  try {
    const name = (data.name || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    const password = data.password || "";
    const confirmPassword = data.confirmPassword || "";

    if (!name) {
      return { success: false, error: "Nama lengkap wajib diisi." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: "Format email tidak valid." };
    }

    if (password.length < 8) {
      return { success: false, error: "Password minimal terdiri dari 8 karakter." };
    }

    if (password !== confirmPassword) {
      return { success: false, error: "Konfirmasi password tidak cocok." };
    }

    // Check if email is already registered
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return {
        success: false,
        error: "Email sudah terdaftar. Silakan gunakan email lain atau masuk.",
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create User + Cafe ("Cafe Saya") + CafeMember (OWNER) in a single atomic transaction
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nama: name,
          email,
          passwordHash,
          isActive: true,
        },
      });

      const cafe = await tx.cafe.create({
        data: {
          nama: "Cafe Saya",
          telepon: "-",
          alamat: "",
        },
      });

      await tx.cafeMember.create({
        data: {
          userId: user.id,
          cafeId: cafe.id,
          role: "OWNER",
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Gagal melakukan registrasi akun:", error);
    return {
      success: false,
      error: "Terjadi kesalahan server saat mendaftarkan akun. Silakan coba lagi.",
    };
  }
}

export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    await signOut({ redirectTo: "/login" });
    return { success: true };
  } catch {
    return { success: true };
  }
}
