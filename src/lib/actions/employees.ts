"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentCafe, requireCurrentCafe } from "@/lib/auth/session";
import type { Employee, EmployeeJob, EmployeeStatus, EmploymentType, Gender, PositionType } from "@/types";

function mapKaryawanToEmployee(k: {
  id: string;
  kodeKaryawan: string;
  nama: string;
  telepon: string;
  email: string;
  alamat: string;
  jabatanKode: string;
  tipeKerja: string;
  status: string;
  jenisKelamin?: string;
  tanggalMasuk: Date;
  gajiPokok: number;
  tarifJam: number;
  jamKerjaHarian?: number;
  createdAt: Date;
  updatedAt: Date;
  pekerjaanHarian?: { id: string; judul: string }[];
}): Employee {
  const joinDateStr = k.tanggalMasuk
    ? k.tanggalMasuk.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const workHours = k.jamKerjaHarian ?? 8;
  const genderVal: Gender = k.jenisKelamin === "PEREMPUAN" ? "PEREMPUAN" : "LAKI_LAKI";

  return {
    id: k.id,
    employeeCode: k.kodeKaryawan,
    name: k.nama,
    phone: k.telepon,
    email: k.email,
    address: k.alamat,
    position: k.jabatanKode as PositionType,
    employmentType: k.tipeKerja as EmploymentType,
    gender: genderVal,
    jenisKelamin: genderVal,
    status: k.status as EmployeeStatus,
    joinDate: joinDateStr,
    baseSalary: k.gajiPokok,
    hourlyRate: k.tarifJam,
    dailyWorkingHours: workHours,
    jamKerjaHarian: workHours,
    jobs: k.pekerjaanHarian?.map((p) => ({ id: p.id, title: p.judul })) || null,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  };
}

export async function getEmployees(cafeId?: string): Promise<Employee[]> {
  try {
    const cafe = cafeId ? { id: cafeId } : await getCurrentCafe();
    if (!cafe) {
      return [];
    }

    const list = await prisma.karyawan.findMany({
      where: { cafeId: cafe.id },
      include: {
        jabatan: true,
        pekerjaanHarian: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return list.map(mapKaryawanToEmployee);
  } catch (error) {
    console.error("Gagal mengambil data karyawan:", error);
    return [];
  }
}

async function generateNextEmployeeCode(cafeId: string): Promise<string> {
  const allEmployees = await prisma.karyawan.findMany({
    where: { cafeId },
    select: { kodeKaryawan: true },
  });

  let maxNum = 0;
  for (const emp of allEmployees) {
    const match = emp.kodeKaryawan.match(/^KRY-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `KRY-${String(nextNum).padStart(3, "0")}`;
}

export async function createEmployee(data: {
  employeeCode?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  position: string;
  employmentType?: string;
  gender?: string;
  jenisKelamin?: string;
  status?: string;
  joinDate: string;
  baseSalary: number;
  hourlyRate: number;
  dailyWorkingHours?: number;
  jamKerjaHarian?: number;
  jobs?: EmployeeJob[] | null;
  cafeId?: string;
}): Promise<{ success: boolean; data?: Employee; error?: string }> {
  try {
    const cafe = data.cafeId ? { id: data.cafeId } : await requireCurrentCafe();

    const trimmedName = data.name?.trim();
    if (!trimmedName) {
      return { success: false, error: "Nama lengkap karyawan wajib diisi." };
    }

    if (!data.position) {
      return { success: false, error: "Jabatan wajib dipilih." };
    }

    // Verify jabatan exists within this cafe
    const jabatan = await prisma.jabatan.findFirst({
      where: {
        cafeId: cafe.id,
        OR: [{ kode: data.position }, { nama: data.position }],
      },
    });

    if (!jabatan) {
      return {
        success: false,
        error: `Jabatan '${data.position}' tidak valid atau belum terdaftar pada kafe ini.`,
      };
    }

    let code = data.employeeCode?.trim();
    if (!code) {
      code = await generateNextEmployeeCode(cafe.id);
    } else {
      const existing = await prisma.karyawan.findFirst({
        where: {
          cafeId: cafe.id,
          kodeKaryawan: code,
        },
      });
      if (existing) {
        return {
          success: false,
          error: `ID Karyawan '${code}' sudah digunakan pada kafe ini.`,
        };
      }
    }

    const baseSalary = Number(data.baseSalary);
    if (isNaN(baseSalary) || baseSalary < 0) {
      return { success: false, error: "Gaji pokok harus berupa angka >= 0." };
    }

    const hourlyRate = Number(data.hourlyRate);
    if (isNaN(hourlyRate) || hourlyRate < 0) {
      return { success: false, error: "Upah per jam harus berupa angka >= 0." };
    }

    const dailyWorkingHours = Math.max(
      1,
      Math.round(Number(data.dailyWorkingHours ?? data.jamKerjaHarian ?? 8))
    );

    const parsedDate = new Date(data.joinDate);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Tanggal bergabung tidak valid." };
    }

    const genderVal = (data.gender || data.jenisKelamin) === "PEREMPUAN" ? "PEREMPUAN" : "LAKI_LAKI";

    const created = await prisma.karyawan.create({
      data: {
        cafeId: cafe.id,
        kodeKaryawan: code,
        nama: trimmedName,
        telepon: data.phone?.trim() || "-",
        email: data.email?.trim() || "",
        alamat: data.address?.trim() || "",
        jabatanKode: jabatan.kode,
        tipeKerja: data.employmentType || "FULL_TIME",
        jenisKelamin: genderVal,
        status: data.status || "ACTIVE",
        tanggalMasuk: parsedDate,
        gajiPokok: Math.round(baseSalary),
        tarifJam: Math.round(hourlyRate),
        jamKerjaHarian: dailyWorkingHours,
        pekerjaanHarian: data.jobs && data.jobs.length > 0
          ? {
              create: data.jobs.map((j) => ({
                judul: j.title.trim(),
              })),
            }
          : undefined,
      },
      include: {
        jabatan: true,
        pekerjaanHarian: true,
      },
    });

    return {
      success: true,
      data: mapKaryawanToEmployee(created),
    };
  } catch (error) {
    console.error("Gagal membuat karyawan:", error);
    return {
      success: false,
      error: "Gagal menyimpan data karyawan ke database.",
    };
  }
}

export async function updateEmployee(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    position?: string;
    employmentType?: string;
    gender?: string;
    jenisKelamin?: string;
    status?: string;
    joinDate?: string;
    baseSalary?: number;
    hourlyRate?: number;
    dailyWorkingHours?: number;
    jamKerjaHarian?: number;
  }
): Promise<{ success: boolean; data?: Employee; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const existing = await prisma.karyawan.findFirst({
      where: { id, cafeId: cafe.id },
    });

    if (!existing) {
      return { success: false, error: "Data karyawan tidak ditemukan pada kafe ini." };
    }

    let jabatanKode = existing.jabatanKode;
    if (data.position && data.position !== existing.jabatanKode) {
      const jabatan = await prisma.jabatan.findFirst({
        where: {
          cafeId: cafe.id,
          OR: [{ kode: data.position }, { nama: data.position }],
        },
      });
      if (!jabatan) {
        return {
          success: false,
          error: `Jabatan '${data.position}' tidak valid pada kafe ini.`,
        };
      }
      jabatanKode = jabatan.kode;
    }

    let parsedDate = existing.tanggalMasuk;
    if (data.joinDate) {
      const d = new Date(data.joinDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const updated = await prisma.karyawan.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { nama: data.name.trim() } : {}),
        ...(data.phone !== undefined ? { telepon: data.phone.trim() } : {}),
        ...(data.email !== undefined ? { email: data.email.trim() } : {}),
        ...(data.address !== undefined ? { alamat: data.address.trim() } : {}),
        ...(data.position !== undefined || jabatanKode !== existing.jabatanKode
          ? { jabatanKode }
          : {}),
        ...(data.employmentType !== undefined ? { tipeKerja: data.employmentType } : {}),
        ...(data.gender !== undefined || data.jenisKelamin !== undefined
          ? {
              jenisKelamin:
                (data.gender || data.jenisKelamin) === "PEREMPUAN"
                  ? "PEREMPUAN"
                  : "LAKI_LAKI",
            }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        tanggalMasuk: parsedDate,
        ...(data.baseSalary !== undefined ? { gajiPokok: Math.round(Number(data.baseSalary)) } : {}),
        ...(data.hourlyRate !== undefined ? { tarifJam: Math.round(Number(data.hourlyRate)) } : {}),
        ...(data.dailyWorkingHours !== undefined || data.jamKerjaHarian !== undefined
          ? {
              jamKerjaHarian: Math.max(
                1,
                Math.round(Number(data.dailyWorkingHours ?? data.jamKerjaHarian))
              ),
            }
          : {}),
      },
      include: {
        jabatan: true,
        pekerjaanHarian: true,
      },
    });

    return {
      success: true,
      data: mapKaryawanToEmployee(updated),
    };
  } catch (error) {
    console.error("Gagal memperbarui data karyawan:", error);
    return {
      success: false,
      error: "Gagal memperbarui data karyawan di database.",
    };
  }
}

export async function deleteEmployee(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const existing = await prisma.karyawan.findFirst({
      where: { id, cafeId: cafe.id },
      select: { id: true, nama: true },
    });

    if (!existing) {
      return { success: false, error: "Karyawan tidak ditemukan pada kafe ini." };
    }

    // Atomic cascade delete of all operational data belonging to this employee
    await prisma.$transaction(async (tx) => {
      // 1. Find all payroll and daily job record IDs belonging to this employee
      const payrolls = await tx.penggajian.findMany({
        where: { karyawanId: id },
        select: { id: true },
      });
      const payrollIds = payrolls.map((p) => p.id);

      const jobs = await tx.pekerjaanHarian.findMany({
        where: { karyawanId: id },
        select: { id: true },
      });
      const jobIds = jobs.map((j) => j.id);

      // 2. Delete DetailPekerjaanPenggajian records linked to this employee's payroll or jobs
      if (payrollIds.length > 0 || jobIds.length > 0) {
        await tx.detailPekerjaanPenggajian.deleteMany({
          where: {
            OR: [
              ...(payrollIds.length > 0 ? [{ penggajianId: { in: payrollIds } }] : []),
              ...(jobIds.length > 0 ? [{ pekerjaanId: { in: jobIds } }] : []),
            ],
          },
        });
      }

      // 3. Delete Penggajian records
      await tx.penggajian.deleteMany({
        where: { karyawanId: id },
      });

      // 4. Delete Kehadiran records (attendance)
      await tx.kehadiran.deleteMany({
        where: { karyawanId: id },
      });

      // 5. Delete Jadwal records (schedules)
      await tx.jadwal.deleteMany({
        where: { karyawanId: id },
      });

      // 6. Delete PekerjaanHarian records (daily job definitions)
      await tx.pekerjaanHarian.deleteMany({
        where: { karyawanId: id },
      });

      // 7. Finally delete the Karyawan record
      await tx.karyawan.delete({
        where: { id },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus karyawan secara permanen:", error);
    return {
      success: false,
      error: "Gagal menghapus karyawan. Silakan coba kembali.",
    };
  }
}

export async function updateEmployeeJobs(
  employeeId: string,
  jobs: EmployeeJob[] | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const cafe = await requireCurrentCafe();

    const existing = await prisma.karyawan.findFirst({
      where: { id: employeeId, cafeId: cafe.id },
    });

    if (!existing) {
      return { success: false, error: "Karyawan tidak ditemukan pada kafe ini." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.pekerjaanHarian.deleteMany({
        where: { karyawanId: employeeId },
      });

      if (jobs && jobs.length > 0) {
        await tx.pekerjaanHarian.createMany({
          data: jobs
            .filter((j) => j.title.trim().length > 0)
            .map((j) => ({
              karyawanId: employeeId,
              judul: j.title.trim(),
            })),
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Gagal memperbarui pekerjaan karyawan:", error);
    return {
      success: false,
      error: "Gagal memperbarui daftar pekerjaan karyawan.",
    };
  }
}
