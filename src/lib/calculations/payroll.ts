// ============================================================
// Centralized Payroll & Late Calculation Utilities
// ============================================================

import {
  LATE_GRACE_MINUTES,
  LATE_SMALL_PENALTY,
  LATE_LARGE_BASE_PENALTY,
  LATE_ADDITIONAL_30MIN_PENALTY,
  REPEATED_LATE_THRESHOLD,
  REPEATED_LATE_PENALTY,
  JOB_PENALTY_RATE,
} from "@/lib/constants/payroll";
import type { AttendanceEntry } from "@/types";

/**
 * Mengubah string waktu "HH:MM" menjadi menit dari tengah malam (00:00)
 */
export function timeStringToMinutes(time: string): number {
  if (!time) return 0;
  const parts = time.split(":").map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

/**
 * Menghitung menit keterlambatan dari jadwal masuk dan jam masuk aktual.
 *
 * Aturan:
 * - 0–10 menit: Tidak dianggap terlambat (return 0).
 * - > 10 menit (menit ke-11 ke atas): Dihitung total selisih sebenarnya dari jadwal masuk.
 *   Contoh: Jadwal 08:00, Masuk 08:14 -> Terlambat = 14 menit (bukan 4 menit).
 */
export function calculateLateMinutes(
  scheduledStart: string,
  actualStart: string | null | undefined
): number {
  if (!actualStart || !scheduledStart) return 0;

  const schedMin = timeStringToMinutes(scheduledStart);
  const actualMin = timeStringToMinutes(actualStart);

  const diff = actualMin - schedMin;

  // Jika masuk lebih awal atau tepat waktu atau masih dalam batas toleransi (0-10 menit)
  if (diff <= LATE_GRACE_MINUTES) {
    return 0;
  }

  return diff;
}

/**
 * Menghitung denda harian berdasarkan durasi keterlambatan (dalam menit).
 *
 * Aturan:
 * - 0–10 menit: Rp0
 * - 11–28 menit: Rp5.000
 * - 29–58 menit: Rp10.000
 * - 59–88 menit: Rp20.000 (+Rp10.000 setiap 30 menit berikutnya)
 */
export function calculateDailyLatePenalty(lateMinutes: number): number {
  if (lateMinutes <= LATE_GRACE_MINUTES) {
    return 0;
  }

  if (lateMinutes <= 28) {
    return LATE_SMALL_PENALTY;
  }

  // Mulai 29 menit: Denda dasar Rp10.000 + Rp10.000 per blok 30 menit berikutnya
  const extraBlocks = Math.floor((lateMinutes - 29) / 30);
  return LATE_LARGE_BASE_PENALTY + extraBlocks * LATE_ADDITIONAL_30MIN_PENALTY;
}

export interface MonthlyLateStats {
  totalLateMinutes: number;
  dailyPenaltySum: number;
  count29Plus: number;
  repeatedPenalty: number;
  totalLatePenalty: number;
}

/**
 * Menghitung total keterlambatan, denda harian, penalti berulang, dan total penalti bulanan.
 *
 * Penalti Berulang:
 * - Dihitung dari banyaknya kejadian keterlambatan >= 29 menit.
 * - Setiap kelipatan 3 kejadian (3, 6, 9, ...), dikenakan tambahan Rp50.000.
 */
export function calculateMonthlyAttendanceLateStats(
  attendances: AttendanceEntry[]
): MonthlyLateStats {
  let totalLateMinutes = 0;
  let dailyPenaltySum = 0;
  let count29Plus = 0;

  for (const item of attendances) {
    const late = calculateLateMinutes(item.scheduledStart, item.actualStart);
    if (late > 0) {
      totalLateMinutes += late;
      dailyPenaltySum += calculateDailyLatePenalty(late);
      if (late >= 29) {
        count29Plus += 1;
      }
    }
  }

  const repeatedPenalty =
    Math.floor(count29Plus / REPEATED_LATE_THRESHOLD) * REPEATED_LATE_PENALTY;

  const totalLatePenalty = dailyPenaltySum + repeatedPenalty;

  return {
    totalLateMinutes,
    dailyPenaltySum,
    count29Plus,
    repeatedPenalty,
    totalLatePenalty,
  };
}

export interface JobPenaltyStats {
  totalJobs: number;
  completedCount: number;
  incompleteCount: number;
  penalty: number;
}

/**
 * Menghitung denda list job yang tidak diselesaikan (unchecked).
 * Denda = nominal per pekerjaan yang tidak selesai (default Rp5.000 atau sesuai setting Cafe).
 */
export function calculateJobPenalty(
  totalJobs: number,
  completedCount: number,
  jobPenaltyRate: number = JOB_PENALTY_RATE
): JobPenaltyStats {
  if (totalJobs <= 0) {
    return {
      totalJobs: 0,
      completedCount: 0,
      incompleteCount: 0,
      penalty: 0,
    };
  }

  const validCompleted = Math.min(Math.max(0, completedCount), totalJobs);
  const incompleteCount = totalJobs - validCompleted;
  const penalty = incompleteCount * jobPenaltyRate;

  return {
    totalJobs,
    completedCount: validCompleted,
    incompleteCount,
    penalty,
  };
}

/**
 * Format readable durasi menit keterlambatan: "2j 35m", "14m", atau "0m"
 */
export function formatLateMinutesReadable(minutes: number): string {
  if (!minutes || minutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  if (hours > 0) {
    if (remMinutes > 0) {
      return `${hours}j ${remMinutes}m`;
    }
    return `${hours}j`;
  }

  return `${remMinutes}m`;
}
