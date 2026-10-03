// ============================================================
// Centralized Dashboard Calculations Helper
// ============================================================

import type {
  Employee,
  Schedule,
  AttendanceEntry,
  Payroll,
  PositionItem,
} from "@/types";
import { POSITION_LABELS, POSITION_COLORS as DEFAULT_POS_COLORS } from "@/types";
import { getScheduleDurationHours } from "@/components/schedules/schedule-block";
import { calculateLateMinutes } from "@/lib/calculations/payroll";

// Palette colors for charts
export const GENDER_CHART_COLORS = {
  LAKI_LAKI: "#3b82f6", // Blue
  PEREMPUAN: "#ec4899", // Pink / Rose
};

export const ATTENDANCE_STATUS_COLORS = {
  onTime: "#10b981", // Emerald / Green
  late: "#ef4444", // Red
  cuti: "#a855f7", // Purple
  izin: "#f59e0b", // Amber
  libur: "#94a3b8", // Slate
};

/**
 * Get the Monday–Sunday date strings for the week of a given date (ISO "YYYY-MM-DD")
 */
export function getWeekDates(baseDate: Date = new Date()): {
  startDate: string;
  endDate: string;
  days: { name: string; date: string }[];
} {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diffToMonday = (day + 6) % 7; // Monday is 0

  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);

  const dayNames = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];
  const days: { name: string; date: string }[] = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const dt = String(current.getDate()).padStart(2, "0");
    days.push({
      name: dayNames[i],
      date: `${y}-${m}-${dt}`,
    });
  }

  return {
    startDate: days[0].date,
    endDate: days[6].date,
    days,
  };
}

/**
 * Format Date to YYYY-MM
 */
export function getCurrentMonthPeriod(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Format Date to ISO YYYY-MM-DD
 */
export function getTodayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ------------------------------------------------------------
// 1. STATS SUMMARY CARDS
// ------------------------------------------------------------

export interface DashboardSummaryStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  inactiveEmployees: number;
  activeToday: number;
  currentlyWorking: number;
  totalWorkHoursThisWeek: number;
  overtimeHoursThisMonth: number;
  estimatedPayroll: number;
}

export function calculateDashboardSummaryStats({
  employees,
  schedules,
  attendances,
  payrolls,
  targetDate = getTodayISO(),
  period = getCurrentMonthPeriod(),
}: {
  employees: Employee[];
  schedules: Schedule[];
  attendances: Record<string, AttendanceEntry[]>;
  payrolls: Payroll[];
  targetDate?: string;
  period?: string;
}): DashboardSummaryStats {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "ACTIVE").length;
  const onLeaveEmployees = employees.filter((e) => e.status === "ON_LEAVE").length;
  const inactiveEmployees = employees.filter((e) => e.status === "INACTIVE").length;

  // Active Today: scheduled KERJA today, excluding CUTI/IZIN/LIBUR
  const todaySchedules = schedules.filter(
    (s) =>
      s.date === targetDate &&
      s.status !== "CUTI" &&
      s.status !== "IZIN" &&
      s.status !== "LIBUR"
  );
  const activeToday = new Set(todaySchedules.map((s) => s.employeeId)).size;

  // Currently Working: active employees whose KERJA schedule contains current Asia/Jakarta time
  const nowJakarta = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const nowTotalMin = nowJakarta.getHours() * 60 + nowJakarta.getMinutes();

  const workingEmployeeIds = new Set<string>();
  for (const s of todaySchedules) {
    if (!s.startTime || !s.endTime) continue;
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    const startMin = (sh || 0) * 60 + (sm || 0);
    let endMin = (eh || 0) * 60 + (em || 0);
    // Handle overnight shift
    if (endMin <= startMin) endMin += 24 * 60;

    // Also handle overnight when current time is early morning (< 06:00)
    const normalizedNow =
      nowTotalMin < startMin && nowTotalMin < 6 * 60
        ? nowTotalMin + 24 * 60
        : nowTotalMin;

    if (normalizedNow >= startMin && normalizedNow < endMin) {
      workingEmployeeIds.add(s.employeeId);
    }
  }
  const currentlyWorking = workingEmployeeIds.size;

  // Work Hours This Week (Monday - Sunday)
  const { startDate: weekStart, endDate: weekEnd } = getWeekDates(
    new Date(targetDate)
  );
  const weekSchedules = schedules.filter(
    (s) =>
      s.date >= weekStart &&
      s.date <= weekEnd &&
      s.status !== "CUTI" &&
      s.status !== "IZIN" &&
      s.status !== "LIBUR"
  );

  let totalWorkHoursThisWeek = 0;
  for (const s of weekSchedules) {
    totalWorkHoursThisWeek += getScheduleDurationHours(
      s.startTime,
      s.endTime,
      s.breakMinutes || 0
    );
  }

  // Overtime Hours This Month
  const monthSchedules = schedules.filter(
    (s) =>
      s.date.startsWith(period) &&
      s.status !== "CUTI" &&
      s.status !== "IZIN" &&
      s.status !== "LIBUR"
  );

  const empMap = new Map(employees.map((e) => [e.id, e]));
  let overtimeHoursThisMonth = 0;

  for (const s of monthSchedules) {
    const duration = getScheduleDurationHours(
      s.startTime,
      s.endTime,
      s.breakMinutes || 0
    );
    const emp = empMap.get(s.employeeId);
    const dailyLimit =
      emp?.dailyWorkingHours || emp?.jamKerjaHarian || 8;
    if (duration > dailyLimit) {
      overtimeHoursThisMonth += duration - dailyLimit;
    }
  }

  // Estimated Payroll: real DB payrolls for current period if exist, otherwise active base salaries
  const periodPayrolls = payrolls.filter((p) => p.period === period);
  let estimatedPayroll = 0;

  if (periodPayrolls.length > 0) {
    estimatedPayroll = periodPayrolls.reduce(
      (sum, p) => sum + (p.netSalary || p.grossSalary || 0),
      0
    );
  } else {
    // Live estimation from active employees
    estimatedPayroll = employees
      .filter((e) => e.status === "ACTIVE")
      .reduce((sum, e) => sum + (Number(e.baseSalary) || 0), 0);
  }

  return {
    totalEmployees,
    activeEmployees,
    onLeaveEmployees,
    inactiveEmployees,
    activeToday,
    currentlyWorking,
    totalWorkHoursThisWeek: Math.round(totalWorkHoursThisWeek * 10) / 10,
    overtimeHoursThisMonth: Math.round(overtimeHoursThisMonth * 10) / 10,
    estimatedPayroll,
  };
}

// ------------------------------------------------------------
// 2. POSITION DISTRIBUTION CHART
// ------------------------------------------------------------

export interface PositionDistributionItem {
  name: string;
  code: string;
  value: number;
  color: string;
  percentage: number;
}

export function calculatePositionDistribution(
  employees: Employee[],
  positions: PositionItem[] = []
): PositionDistributionItem[] {
  if (employees.length === 0) return [];

  const counts: Record<string, number> = {};
  for (const emp of employees) {
    const code = emp.position || "KARYAWAN";
    counts[code] = (counts[code] || 0) + 1;
  }

  const result: PositionDistributionItem[] = [];
  const total = employees.length;

  for (const [code, count] of Object.entries(counts)) {
    const posObj = positions.find(
      (p) => p.code.toUpperCase() === code.toUpperCase()
    );
    const name = posObj ? posObj.name : POSITION_LABELS[code] || code;
    const color =
      posObj?.color ||
      DEFAULT_POS_COLORS[code] ||
      "#8b5433";

    result.push({
      name,
      code,
      value: count,
      color,
      percentage: Math.round((count / total) * 100),
    });
  }

  return result.sort((a, b) => b.value - a.value);
}

// ------------------------------------------------------------
// 3. WEEKLY WORKFORCE SCHEDULE CHART
// ------------------------------------------------------------

export interface WeeklyScheduleDayData {
  hari: string;
  date: string;
  karyawan: number;
  jamKerja: number;
  jamRegular: number;
  jamLembur: number;
}

export function calculateWeeklyWorkforceData(
  schedules: Schedule[],
  employees: Employee[],
  baseDate: Date = new Date()
): WeeklyScheduleDayData[] {
  const { days } = getWeekDates(baseDate);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  return days.map((day) => {
    const daySchedules = schedules.filter(
      (s) =>
        s.date === day.date &&
        s.status !== "CUTI" &&
        s.status !== "IZIN" &&
        s.status !== "LIBUR"
    );

    const uniqueEmps = new Set(daySchedules.map((s) => s.employeeId));
    let totalHours = 0;
    let totalRegular = 0;
    let totalOvertime = 0;

    for (const s of daySchedules) {
      const duration = getScheduleDurationHours(
        s.startTime,
        s.endTime,
        s.breakMinutes || 0
      );
      totalHours += duration;

      const emp = empMap.get(s.employeeId);
      const limit = emp?.dailyWorkingHours || emp?.jamKerjaHarian || 8;
      const regular = Math.min(duration, limit);
      const overtime = Math.max(0, duration - limit);

      totalRegular += regular;
      totalOvertime += overtime;
    }

    return {
      hari: day.name,
      date: day.date,
      karyawan: uniqueEmps.size,
      jamKerja: Math.round(totalHours * 10) / 10,
      jamRegular: Math.round(totalRegular * 10) / 10,
      jamLembur: Math.round(totalOvertime * 10) / 10,
    };
  });
}

// ------------------------------------------------------------
// 4. GENDER DISTRIBUTION CHART
// ------------------------------------------------------------

export interface GenderDistributionItem {
  name: string;
  genderKey: "LAKI_LAKI" | "PEREMPUAN";
  value: number;
  color: string;
  percentage: number;
}

export function calculateGenderDistribution(
  employees: Employee[]
): GenderDistributionItem[] {
  if (employees.length === 0) {
    return [
      {
        name: "Laki-laki",
        genderKey: "LAKI_LAKI",
        value: 0,
        color: GENDER_CHART_COLORS.LAKI_LAKI,
        percentage: 0,
      },
      {
        name: "Perempuan",
        genderKey: "PEREMPUAN",
        value: 0,
        color: GENDER_CHART_COLORS.PEREMPUAN,
        percentage: 0,
      },
    ];
  }

  let maleCount = 0;
  let femaleCount = 0;

  for (const emp of employees) {
    const g = emp.gender || emp.jenisKelamin;
    if (g === "PEREMPUAN") {
      femaleCount += 1;
    } else {
      maleCount += 1;
    }
  }

  const total = employees.length;
  const malePct = total > 0 ? Math.round((maleCount / total) * 100) : 0;
  const femalePct = total > 0 ? Math.round((femaleCount / total) * 100) : 0;

  return [
    {
      name: "Laki-laki",
      genderKey: "LAKI_LAKI",
      value: maleCount,
      color: GENDER_CHART_COLORS.LAKI_LAKI,
      percentage: malePct,
    },
    {
      name: "Perempuan",
      genderKey: "PEREMPUAN",
      value: femaleCount,
      color: GENDER_CHART_COLORS.PEREMPUAN,
      percentage: femalePct,
    },
  ];
}

// ------------------------------------------------------------
// 5. EMPLOYEE PERFORMANCE RANKING (TOP 5)
// ------------------------------------------------------------

export interface EmployeePerformanceItem {
  employeeId: string;
  name: string;
  position: string;
  score: number; // 0 - 100
  attendanceScore: number;
  jobScore: number;
  latenessScore: number;
  scheduledWorkDays: number;
  attendedDays: number;
  lateEventsCount: number;
}

/**
 * Transparent performance score calculation based ONLY on PostgreSQL data:
 * Formula:
 * - Attendance Score (40%): attended days / scheduled work days.
 *   (If no work scheduled, default 100%). CUTI/IZIN/LIBUR excluded.
 * - Job Completion Score (40%): completed jobs / total jobs.
 *   (If no jobs assigned, 100%).
 * - Lateness Discipline Score (20%): max(0, 100 - (totalLateMinutes * 2) - (lateEvents * 5)).
 */
export function calculateEmployeePerformance({
  employees,
  schedules,
  attendances,
  jobCompletions = {},
  period = getCurrentMonthPeriod(),
}: {
  employees: Employee[];
  schedules: Schedule[];
  attendances: Record<string, AttendanceEntry[]>;
  jobCompletions?: Record<string, Record<string, boolean>>;
  period?: string;
}): EmployeePerformanceItem[] {
  const result: EmployeePerformanceItem[] = [];

  for (const emp of employees) {
    if (emp.status === "INACTIVE") continue;

    // 1. Scheduled work days this period
    const empSchedules = schedules.filter(
      (s) =>
        s.employeeId === emp.id &&
        s.date.startsWith(period) &&
        s.status !== "CUTI" &&
        s.status !== "IZIN" &&
        s.status !== "LIBUR"
    );
    const scheduledWorkDays = empSchedules.length;

    // 2. Attendance records for this employee
    const empAttendances = (attendances[emp.id] || []).filter((a) =>
      a.date.startsWith(period)
    );
    const attendedDays = empAttendances.filter(
      (a) => a.actualStart !== null
    ).length;

    const attendanceScore =
      scheduledWorkDays > 0
        ? Math.min(100, Math.round((attendedDays / scheduledWorkDays) * 100))
        : 100;

    // 3. Job completion
    const jobs = emp.jobs || [];
    let jobScore = 100;
    if (jobs.length > 0) {
      const completions = jobCompletions[emp.id] || {};
      const completedCount = jobs.filter(
        (j) => completions[j.id] !== false
      ).length;
      jobScore = Math.round((completedCount / jobs.length) * 100);
    }

    // 4. Lateness score
    let totalLateMin = 0;
    let lateEvents = 0;
    for (const a of empAttendances) {
      const late = calculateLateMinutes(a.scheduledStart, a.actualStart);
      if (late > 0) {
        totalLateMin += late;
        lateEvents += 1;
      }
    }
    const latenessScore = Math.max(0, 100 - totalLateMin - lateEvents * 5);

    // Final combined score (40% attendance, 40% job completion, 20% lateness discipline)
    const finalScore = Math.round(
      0.4 * attendanceScore + 0.4 * jobScore + 0.2 * latenessScore
    );

    result.push({
      employeeId: emp.id,
      name: emp.name,
      position: emp.position,
      score: Math.min(100, Math.max(0, finalScore)),
      attendanceScore,
      jobScore,
      latenessScore,
      scheduledWorkDays,
      attendedDays,
      lateEventsCount: lateEvents,
    });
  }

  // Sort descending by score, take top 5
  return result.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ------------------------------------------------------------
// 6. ATTENDANCE MONITORING
// ------------------------------------------------------------

export interface AttendanceMonitoringItem {
  status: string;
  label: string;
  count: number;
  color: string;
}

export function calculateAttendanceMonitoring({
  schedules,
  attendances,
  period = getCurrentMonthPeriod(),
}: {
  schedules: Schedule[];
  attendances: Record<string, AttendanceEntry[]>;
  period?: string;
}): AttendanceMonitoringItem[] {
  let onTime = 0;
  let late = 0;
  let cuti = 0;
  let izin = 0;
  let libur = 0;

  // Schedules in period for CUTI, IZIN, LIBUR
  const periodSchedules = schedules.filter((s) => s.date.startsWith(period));
  for (const s of periodSchedules) {
    if (s.status === "CUTI") cuti += 1;
    else if (s.status === "IZIN") izin += 1;
    else if (s.status === "LIBUR") libur += 1;
  }

  // Attendance in period for onTime vs late
  const allAttendances = Object.values(attendances)
    .flat()
    .filter((a) => a.date.startsWith(period) && a.actualStart !== null);

  for (const a of allAttendances) {
    const lateMin = calculateLateMinutes(a.scheduledStart, a.actualStart);
    if (lateMin > 0) {
      late += 1;
    } else {
      onTime += 1;
    }
  }

  return [
    {
      status: "ON_TIME",
      label: "Tepat Waktu",
      count: onTime,
      color: ATTENDANCE_STATUS_COLORS.onTime,
    },
    {
      status: "LATE",
      label: "Terlambat",
      count: late,
      color: ATTENDANCE_STATUS_COLORS.late,
    },
    {
      status: "CUTI",
      label: "Cuti",
      count: cuti,
      color: ATTENDANCE_STATUS_COLORS.cuti,
    },
    {
      status: "IZIN",
      label: "Izin",
      count: izin,
      color: ATTENDANCE_STATUS_COLORS.izin,
    },
    {
      status: "LIBUR",
      label: "Libur",
      count: libur,
      color: ATTENDANCE_STATUS_COLORS.libur,
    },
  ];
}
