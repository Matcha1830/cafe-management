// ============================================================
// Payroll & Attendance Penalty Constants
// ============================================================

/**
 * Toleransi keterlambatan dalam menit (0–10 menit = tidak terlambat & denda Rp0)
 */
export const LATE_GRACE_MINUTES = 10;

/**
 * Denda untuk keterlambatan 11–28 menit
 */
export const LATE_SMALL_PENALTY = 5000;

/**
 * Denda dasar untuk keterlambatan mulai 29 menit (29–58 menit)
 */
export const LATE_LARGE_BASE_PENALTY = 10000;

/**
 * Denda tambahan per blok 30 menit berikutnya (misal 59–88 = +10.000, 89–118 = +20.000)
 */
export const LATE_ADDITIONAL_30MIN_PENALTY = 10000;

/**
 * Ambang batas kejadian keterlambatan >= 29 menit untuk penalti berulang
 */
export const REPEATED_LATE_THRESHOLD = 3;

/**
 * Besaran penalti untuk setiap 3 kali kejadian keterlambatan >= 29 menit dalam sebulan
 */
export const REPEATED_LATE_PENALTY = 50000;

/**
 * Denda per pekerjaan (list job) yang tidak diselesaikan (unchecked)
 */
export const JOB_PENALTY_RATE = 5000;
