import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number to Indonesian Rupiah currency string
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to Indonesian locale string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format date to short Indonesian format: "Sen, 23 Agu"
 */
export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Get Indonesian day name from date
 */
export function getDayName(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    weekday: "long",
  });
}

/**
 * Calculate working hours from schedule
 */
export function calculateWorkingHours(
  startTime: string,
  endTime: string,
  breakMinutes: number,
  isOvernight: boolean
): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);

  if (isOvernight || totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  totalMinutes -= breakMinutes;
  return Math.max(0, totalMinutes / 60);
}

/**
 * Get week dates starting from Monday
 */
export function getWeekDates(referenceDate: Date): Date[] {
  const day = referenceDate.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diff);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

/**
 * Format date to YYYY-MM-DD using local date parts.
 * Using toISOString() would shift date by -7h in Asia/Jakarta (UTC+7),
 * so we use local getFullYear/getMonth/getDate instead.
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get initials from full name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Convert time string "HH:MM" to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Format payroll period "YYYY-MM" to Indonesian readable "Agustus 2026"
 */
export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export interface EmployeeAttendancePeriod {
  startDateStr: string; // "YYYY-MM-DD"
  endDateStr: string;   // "YYYY-MM-DD"
  label: string;        // "4 Agustus – 3 September 2026"
  joinDateLabel: string;// "4 Agustus 2026"
  isCurrent: boolean;   // true if offset === 0
}

/**
 * Calculate dynamic attendance period based on employee's join date (tanggalMasuk).
 * Each period starts on the day of the join date and ends on day - 1 of the following month.
 * offset: 0 = current active period, -1 = previous period, +1 = next period.
 */
export function getEmployeeAttendancePeriod(
  joinDateStr: string,
  offset: number = 0,
  referenceDate: Date = new Date()
): EmployeeAttendancePeriod {
  const [jYear, jMonth, jDay] = (joinDateStr || "2026-08-01").split("-").map(Number);
  const joinDay = jDay || 1;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed
  const refDay = referenceDate.getDate();

  // Determine the base 0-indexed month for current active period
  let baseMonthIndex = refMonth;
  if (refDay < joinDay) {
    baseMonthIndex = refMonth - 1;
  }

  // Apply period offset
  const targetMonthIndex = baseMonthIndex + offset;

  // Calculate start date
  const startObj = new Date(refYear, targetMonthIndex, joinDay);
  const startY = startObj.getFullYear();
  const startM = String(startObj.getMonth() + 1).padStart(2, "0");
  const startD = String(startObj.getDate()).padStart(2, "0");
  const startDateStr = `${startY}-${startM}-${startD}`;

  // Calculate end date: 1 month after start date, minus 1 day
  const endObj = new Date(startY, startObj.getMonth() + 1, joinDay - 1);
  const endY = endObj.getFullYear();
  const endM = String(endObj.getMonth() + 1).padStart(2, "0");
  const endD = String(endObj.getDate()).padStart(2, "0");
  const endDateStr = `${endY}-${endM}-${endD}`;

  // Format label: "4 Agustus – 3 September 2026"
  const startMonthName = startObj.toLocaleDateString("id-ID", { month: "long" });
  const endMonthName = endObj.toLocaleDateString("id-ID", { month: "long" });
  const startYearNum = startObj.getFullYear();
  const endYearNum = endObj.getFullYear();

  let label = "";
  if (startMonthName === endMonthName && startYearNum === endYearNum) {
    label = `${startObj.getDate()} – ${endObj.getDate()} ${endMonthName} ${endYearNum}`;
  } else if (startYearNum === endYearNum) {
    label = `${startObj.getDate()} ${startMonthName} – ${endObj.getDate()} ${endMonthName} ${endYearNum}`;
  } else {
    label = `${startObj.getDate()} ${startMonthName} ${startYearNum} – ${endObj.getDate()} ${endMonthName} ${endYearNum}`;
  }

  const joinDateObj = new Date(jYear, jMonth - 1, joinDay);
  const joinDateLabel = joinDateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    startDateStr,
    endDateStr,
    label,
    joinDateLabel,
    isCurrent: offset === 0,
  };
}
