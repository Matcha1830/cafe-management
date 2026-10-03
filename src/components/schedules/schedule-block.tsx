"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { type Schedule, POSITION_LABELS, type PositionType } from "@/types";
import { EMPLOYEE_NORMAL_HOURS } from "@/lib/mock-data/employees";
import { useCafe } from "@/lib/store/cafe-context";
import { AlertTriangle, Moon, Clock } from "lucide-react";

export const POSITION_COLORS: Record<
  string,
  { bg: string; border: string; text: string; solidBg: string; lightBg: string }
> = {
  KAPTEN: {
    bg: "bg-orange-100/90",
    border: "border-orange-300",
    text: "text-orange-950",
    solidBg: "bg-orange-600",
    lightBg: "bg-orange-50",
  },
  KARYAWAN: {
    bg: "bg-sky-100/90",
    border: "border-sky-300",
    text: "text-sky-950",
    solidBg: "bg-sky-600",
    lightBg: "bg-sky-50",
  },
  BARISTA: {
    bg: "bg-amber-100/90",
    border: "border-amber-300",
    text: "text-amber-950",
    solidBg: "bg-amber-600",
    lightBg: "bg-amber-50",
  },
  KASIR: {
    bg: "bg-blue-100/90",
    border: "border-blue-300",
    text: "text-blue-950",
    solidBg: "bg-blue-600",
    lightBg: "bg-blue-50",
  },
  KITCHEN: {
    bg: "bg-purple-100/90",
    border: "border-purple-300",
    text: "text-purple-950",
    solidBg: "bg-purple-600",
    lightBg: "bg-purple-50",
  },
  WAITER: {
    bg: "bg-emerald-100/90",
    border: "border-emerald-300",
    text: "text-emerald-950",
    solidBg: "bg-emerald-600",
    lightBg: "bg-emerald-50",
  },
  SUPERVISOR: {
    bg: "bg-orange-100/90",
    border: "border-orange-300",
    text: "text-orange-950",
    solidBg: "bg-orange-600",
    lightBg: "bg-orange-50",
  },
  CLEANING: {
    bg: "bg-cyan-100/90",
    border: "border-cyan-300",
    text: "text-cyan-950",
    solidBg: "bg-cyan-600",
    lightBg: "bg-cyan-50",
  },
  MANAGER: {
    bg: "bg-rose-100/90",
    border: "border-rose-300",
    text: "text-rose-950",
    solidBg: "bg-rose-600",
    lightBg: "bg-rose-50",
  },
};

/**
 * Calculates duration in hours for a schedule (handles overnight)
 */
export function getScheduleDurationHours(
  startTime?: string | null,
  endTime?: string | null,
  breakMinutes = 0
): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let diff = (eh || 0) * 60 + (em || 0) - ((sh || 0) * 60 + (sm || 0));
  if (diff <= 0) diff += 24 * 60;
  diff -= breakMinutes;
  return Math.max(0, diff / 60);
}

interface ScheduleBlockProps {
  schedule: Schedule;
  onClick: (schedule: Schedule) => void;
  compact?: boolean;
  totalDailyHours?: number;
}

export function ScheduleBlock({
  schedule,
  onClick,
  compact = false,
  totalDailyHours,
}: ScheduleBlockProps) {
  const { employees } = useCafe();
  const colors = POSITION_COLORS[schedule.employeePosition] || POSITION_COLORS.BARISTA;

  const status = schedule.status || "KERJA";
  const isCuti = status === "CUTI";
  const isIzin = status === "IZIN";
  const isLibur = status === "LIBUR";
  const isNonWork = isCuti || isIzin || isLibur;

  // For non-work statuses (CUTI, IZIN, LIBUR)
  if (isNonWork) {
    const nonWorkConfig = isCuti
      ? {
          bg: "bg-purple-50/90 hover:bg-purple-100/90",
          border: "border-purple-300",
          badgeBg: "bg-purple-100 text-purple-800 border-purple-300",
          label: "CUTI",
        }
      : isIzin
      ? {
          bg: "bg-amber-50/90 hover:bg-amber-100/90",
          border: "border-amber-300",
          badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
          label: "IZIN",
        }
      : {
          bg: "bg-stone-50/90 hover:bg-stone-100/90",
          border: "border-stone-300",
          badgeBg: "bg-stone-200 text-stone-700 border-stone-300",
          label: "LIBUR",
        };

    return (
      <button
        onClick={() => onClick(schedule)}
        className={cn(
          "w-full text-left rounded-lg border px-2.5 py-2 transition-all duration-150 relative overflow-hidden group shadow-2xs",
          "hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
          nonWorkConfig.bg,
          nonWorkConfig.border,
          compact ? "py-1.5" : "py-2"
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <p className="font-bold leading-tight text-xs truncate text-stone-900">
            {schedule.employeeName}
          </p>
          <span
            className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.5 rounded border tracking-wider",
              nonWorkConfig.badgeBg
            )}
          >
            {nonWorkConfig.label}
          </span>
        </div>

        {!compact && (
          <p className="text-[10px] opacity-75 mt-0.5 truncate font-medium text-stone-600">
            {POSITION_LABELS[schedule.employeePosition]}
          </p>
        )}

        {schedule.notes && (
          <p className="text-[10px] text-stone-500 italic truncate mt-1">
            {schedule.notes}
          </p>
        )}
      </button>
    );
  }

  // Standard KERJA / work shift block
  const duration = getScheduleDurationHours(
    schedule.startTime,
    schedule.endTime,
    schedule.breakMinutes
  );
  const emp = employees.find((e) => e.id === schedule.employeeId);
  const normalHours =
    emp?.dailyWorkingHours ||
    emp?.jamKerjaHarian ||
    EMPLOYEE_NORMAL_HOURS[schedule.employeeId] ||
    8;
  const evaluatedHours = totalDailyHours ?? duration;
  const isUnder = evaluatedHours < normalHours;
  const isOver = evaluatedHours > normalHours;
  const diffHours = Math.abs(evaluatedHours - normalHours);

  return (
    <button
      onClick={() => onClick(schedule)}
      className={cn(
        "w-full text-left rounded-lg border px-2.5 py-2 transition-all duration-150 relative overflow-hidden group",
        "hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
        colors.bg,
        isUnder ? "border-amber-400/90 ring-1 ring-amber-300/60" : colors.border,
        compact ? "py-1.5" : "py-2"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <p className={cn("font-bold leading-tight text-xs truncate", colors.text)}>
          {schedule.employeeName}
        </p>
        {schedule.isOvernight && (
          <span
            className="flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 font-medium"
            title="Shift Malam / Overnight"
          >
            <Moon className="h-2.5 w-2.5" />
            <span>Malam</span>
          </span>
        )}
      </div>

      {!compact && (
        <p className={cn("text-[10px] opacity-75 mt-0.5 truncate font-medium", colors.text)}>
          {POSITION_LABELS[schedule.employeePosition]}
        </p>
      )}

      <div className="flex items-center justify-between gap-1 mt-1 text-[11px] font-medium">
        <span className={cn(colors.text)}>
          {schedule.startTime} – {schedule.endTime}
        </span>
        <span className="text-[10px] text-stone-500 font-semibold bg-white/70 px-1 py-0.2 rounded">
          {duration.toFixed(duration % 1 === 0 ? 0 : 1)}j
        </span>
      </div>

      {/* Visual warning for under hours or overtime */}
      {isUnder && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded">
          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
          <span className="truncate">Kurang {diffHours} jam</span>
        </div>
      )}

      {isOver && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-200/70 px-1.5 py-0.5 rounded">
          <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
          <span className="truncate">Lembur +{diffHours}j</span>
        </div>
      )}
    </button>
  );
}
