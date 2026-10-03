"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Moon,
  GripVertical,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  X,
  Pencil,
  CalendarOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDateShort, formatDate } from "@/lib/utils";
import {
  type Schedule,
  type Employee,
  POSITION_LABELS,
} from "@/types";
import { EMPLOYEE_NORMAL_HOURS } from "@/lib/mock-data/employees";
import { POSITION_COLORS, getScheduleDurationHours } from "./schedule-block";
import { ScheduleForm } from "./schedule-form";
import { LeaveForm } from "./leave-form";
import { useCafe } from "@/lib/store/cafe-context";

// ============================================================
// CONSTANTS & CONFIG
// ============================================================

// Total hours: 00:00 to 24:00 + next day overnight continuation 01:00, 02:00, 03:00 (Total 28 hour slots)
const TOTAL_HOURS = 28;
const HOUR_WIDTH = 64; // px per hour
const SNAP_MINUTES = 60; // 1 hour interval snap (00:00, 01:00, 02:00, dst.)
const ROW_HEIGHT = 60; // px

// Short labels for day pills (indexed Mon–Sun)
const DAY_SHORTS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

// Helper to convert time "HH:MM" (with support for overnight > 24) to minutes
function timeStringToMinutes(timeStr: string, isOvernightEnd = false): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  let total = (h || 0) * 60 + (m || 0);
  if (isOvernightEnd && total < 12 * 60) {
    total += 24 * 60; // Next day
  }
  return total;
}

// Convert minutes to "HH:MM" (with 1-hour snap)
function minutesToTimeString(minutes: number): { timeStr: string; isOvernight: boolean } {
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  const normalized = Math.max(0, Math.min(snapped, TOTAL_HOURS * 60));
  const isOvernight = normalized >= 24 * 60;
  const actualMinutes = normalized % (24 * 60);
  const h = Math.floor(actualMinutes / 60);
  return {
    timeStr: `${String(h).padStart(2, "0")}:00`,
    isOvernight,
  };
}

// Convert minute value on timeline to pixel left
function minutesToPx(minutes: number): number {
  return (minutes / 60) * HOUR_WIDTH;
}

// Convert pixel left to minutes (snapped to 60 min)
function pxToMinutes(px: number): number {
  const rawMinutes = (px / HOUR_WIDTH) * 60;
  const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  return Math.max(0, Math.min(snapped, TOTAL_HOURS * 60));
}

// Format duration cleanly e.g. "8 jam"
function formatDurationText(hours: number): string {
  const formatted = hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1);
  return `${formatted} jam`;
}

// ============================================================
// PROPS INTERFACE
// ============================================================

interface WeekDay {
  date: string;
  day: string;
}

interface InteractiveTimelineProps {
  initialDate?: string;
  /** 7-day array for the currently displayed week (Mon–Sun), provided by ScheduleCalendar */
  weekDays?: WeekDay[];
  schedules?: Schedule[];
  onSchedulesChange?: (newSchedules: Schedule[]) => void;
  onClose?: () => void;
}

export function InteractiveTimeline({
  initialDate,
  weekDays,
  schedules: propSchedules,
  onSchedulesChange,
  onClose,
}: InteractiveTimelineProps) {
  // Build a daysList from weekDays prop (from ScheduleCalendar), or fall back to current week
  // This ensures the day pill navigation always reflects the currently displayed week.
  const daysList = React.useMemo(() => {
    if (weekDays && weekDays.length === 7) {
      return weekDays.map((d, i) => ({
        date: d.date,
        day: d.day,
        short: DAY_SHORTS[i] ?? d.day.substring(0, 3),
      }));
    }
    // Fallback: compute current week dynamically
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return { date: `${y}-${m}-${day}`, day: dayNames[i], short: DAY_SHORTS[i] };
    });
  }, [weekDays]);

  // Resolve default selected date: use initialDate if provided and valid, else Monday of week
  const resolvedInitialDate = initialDate ?? daysList[0]?.date ?? new Date().toISOString().split("T")[0];
  const {
    employees,
    schedules: contextSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    deleteSchedulesByDate,
    getPositionName,
  } = useCafe();

  const schedules = propSchedules || contextSchedules;

  // Active selected date
  const [selectedDate, setSelectedDate] = useState<string>(resolvedInitialDate);

  // Employee ordering state (IDs in order)
  const defaultOrder = useMemo(() => employees.map((e) => e.id), [employees]);
  const [employeeOrder, setEmployeeOrder] = useState<string[]>(defaultOrder);

  useEffect(() => {
    if (employees.length > 0) {
      setEmployeeOrder((prev) => {
        if (prev.length === 0) return employees.map((e) => e.id);
        const existingIds = new Set(prev);
        const newIds = employees.map((e) => e.id).filter((id) => !existingIds.has(id));
        const validPrev = prev.filter((id) => employees.some((e) => e.id === id));
        return validPrev.length > 0 ? [...validPrev, ...newIds] : employees.map((e) => e.id);
      });
    }
  }, [employees]);

  // Dragging row state for reordering
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [dragOverEmployeeId, setDragOverEmployeeId] = useState<string | null>(null);
  const touchDragRef = useRef<{
    sourceId: string | null;
    targetId: string | null;
    timer: ReturnType<typeof setTimeout> | null;
    active: boolean;
    startX: number;
    startY: number;
  }>({
    sourceId: null,
    targetId: null,
    timer: null,
    active: false,
    startX: 0,
    startY: 0,
  });

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (touchDragRef.current.timer) {
        clearTimeout(touchDragRef.current.timer);
      }
    };
  }, []);

  // Selected schedule block for detail popover
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Ref to track whether a meaningful drag occurred on a schedule block.
  // Prevents onClick from opening the popover when mousedown→mousemove→mouseup (drag) happened.
  const hasDraggedRef = useRef<boolean>(false);

  // Timeline interaction states:
  // 1. Creating new block via drag on track
  const [creatingShift, setCreatingShift] = useState<{
    employeeId: string;
    startMin: number;
    currentMin: number;
  } | null>(null);

  // 2. Moving existing block
  const [movingShift, setMovingShift] = useState<{
    scheduleId: string;
    employeeId: string;
    initialStartMin: number;
    initialEndMin: number;
    dragStartClientX: number;
    currentOffsetMin: number;
  } | null>(null);

  // 3. Resizing existing block
  const [resizingShift, setResizingShift] = useState<{
    scheduleId: string;
    edge: "start" | "end";
    initialMin: number;
    otherEdgeMin: number;
    currentMin: number;
  } | null>(null);

  // Modal states for adding/editing schedule/status
  const [editingScheduleTarget, setEditingScheduleTarget] = useState<Schedule | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDefaultEmployeeId, setAddDefaultEmployeeId] = useState<string>("");

  const [editingLeaveTarget, setEditingLeaveTarget] = useState<Schedule | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveDefaultEmployeeId, setLeaveDefaultEmployeeId] = useState<string>("");

  // Reset Jadwal Hari confirmation dialog state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Reference for timeline horizontal scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);

  // Scroll to 07:00 on initial mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 7 * HOUR_WIDTH - 20;
    }
  }, []);

  // Sync date changes if initialDate or weekDays change
  useEffect(() => {
    if (resolvedInitialDate) setSelectedDate(resolvedInitialDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedInitialDate]);

  // Current day schedules
  const daySchedules = useMemo(
    () => schedules.filter((s) => s.date === selectedDate),
    [schedules, selectedDate]
  );

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isToday = selectedDate === todayStr;
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimePosPx = isToday
    ? minutesToPx(currentHour * 60 + currentMinute)
    : null;

  // Ordered list of employees
  const orderedEmployees = useMemo(() => {
    const map = new Map(employees.map((e) => [e.id, e]));
    const ordered = employeeOrder
      .map((id) => map.get(id))
      .filter((e): e is Employee => Boolean(e));

    if (ordered.length < employees.length) {
      const orderedSet = new Set(ordered.map((e) => e.id));
      employees.forEach((e) => {
        if (!orderedSet.has(e.id)) ordered.push(e);
      });
    }
    return ordered;
  }, [employeeOrder, employees]);

  // Calculate total daily scheduled hours per employee
  const employeeHoursSummary = useMemo(() => {
    const summary: Record<
      string,
      {
        totalHours: number;
        normalHours: number;
        shiftCount: number;
        status: "normal" | "under" | "over" | "off" | "cuti" | "izin" | "libur";
        diffHours: number;
        leaveStatus?: string;
      }
    > = {};

    orderedEmployees.forEach((emp) => {
      const empShifts = daySchedules.filter((s) => s.employeeId === emp.id);
      const leaveShift = empShifts.find(
        (s) => s.status === "CUTI" || s.status === "IZIN" || s.status === "LIBUR"
      );
      const normalHours =
        emp.dailyWorkingHours ||
        emp.jamKerjaHarian ||
        EMPLOYEE_NORMAL_HOURS[emp.id] ||
        8;

      let total = 0;
      empShifts.forEach((shift) => {
        const isWork =
          shift.status === "KERJA" ||
          shift.status === "BEKERJA" ||
          shift.status === "TERJADWAL" ||
          !shift.status;
        if (isWork) {
          total += getScheduleDurationHours(
            shift.startTime,
            shift.endTime,
            shift.breakMinutes || 0
          );
        }
      });

      let status: "normal" | "under" | "over" | "off" | "cuti" | "izin" | "libur" =
        "normal";
      const diff = Math.abs(total - normalHours);

      if (leaveShift) {
        status =
          leaveShift.status === "CUTI"
            ? "cuti"
            : leaveShift.status === "IZIN"
              ? "izin"
              : "libur";
      } else if (empShifts.length === 0) {
        status = "off";
      } else if (total < normalHours) {
        status = "under";
      } else if (total > normalHours) {
        status = "over";
      } else {
        status = "normal";
      }

      summary[emp.id] = {
        totalHours: total,
        normalHours,
        shiftCount: empShifts.length,
        status,
        diffHours: diff,
        leaveStatus: leaveShift?.status,
      };
    });

    return summary;
  }, [orderedEmployees, daySchedules]);

  // Daily statistics
  const dayStats = useMemo(() => {
    const activeEmployeesCount = Object.values(employeeHoursSummary).filter(
      (e) => e.shiftCount > 0
    ).length;
    const totalWorkingHours = Object.values(employeeHoursSummary).reduce(
      (sum, e) => sum + e.totalHours,
      0
    );
    const overtimeHours = Object.values(employeeHoursSummary).reduce(
      (sum, e) => (e.status === "over" ? sum + e.diffHours : sum),
      0
    );
    const underHoursCount = Object.values(employeeHoursSummary).filter(
      (e) => e.status === "under"
    ).length;

    return {
      totalShifts: daySchedules.length,
      activeEmployeesCount,
      totalWorkingHours,
      overtimeHours,
      underHoursCount,
    };
  }, [daySchedules, employeeHoursSummary]);

  // Current day object
  const currentDayObj = useMemo(
    () => daysList.find((d) => d.date === selectedDate) || daysList[0],
    [selectedDate, daysList]
  );

  // Navigate next/prev day within the displayed week
  const handlePrevDay = () => {
    const currentIndex = daysList.findIndex((d) => d.date === selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(daysList[currentIndex - 1].date);
      setActiveSchedule(null);
      setPopoverPosition(null);
    }
  };

  const handleNextDay = () => {
    const currentIndex = daysList.findIndex((d) => d.date === selectedDate);
    if (currentIndex < daysList.length - 1) {
      setSelectedDate(daysList[currentIndex + 1].date);
      setActiveSchedule(null);
      setPopoverPosition(null);
    }
  };

  // Reset Jadwal Hari handler: deletes only KERJA schedules for selected date, preserving CUTI/IZIN/LIBUR
  const handleConfirmResetDay = async () => {
    setIsResetting(true);
    try {
      const res = await deleteSchedulesByDate(selectedDate);
      if (res.success) {
        if (onSchedulesChange) {
          onSchedulesChange(
            schedules.filter(
              (s) =>
                s.date !== selectedDate ||
                s.status === "CUTI" ||
                s.status === "IZIN" ||
                s.status === "LIBUR"
            )
          );
        }
        setActiveSchedule(null);
        setPopoverPosition(null);
        setIsResetDialogOpen(false);
      }
    } catch (err) {
      console.error("Gagal reset jadwal hari:", err);
    } finally {
      setIsResetting(false);
    }
  };

  // Reorder helper
  const handleReorder = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const newOrder = [...employeeOrder];
    const sourceIdx = newOrder.indexOf(sourceId);
    const targetIdx = newOrder.indexOf(targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;

    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, sourceId);
    setEmployeeOrder(newOrder);
  };

  // Delete a schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    await deleteSchedule(scheduleId);
    if (onSchedulesChange) {
      onSchedulesChange(schedules.filter((s) => s.id !== scheduleId));
    }
    setActiveSchedule(null);
    setPopoverPosition(null);
  };

  // Add quick shift for an employee (e.g. 08:00 - 16:00)
  const handleAddQuickShift = async (empId: string) => {
    // Check if employee already has a shift today
    const existing = daySchedules.find((s) => s.employeeId === empId);
    if (existing) {
      setActiveSchedule(existing);
      return;
    }

    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    const targetHours = emp.dailyWorkingHours || emp.jamKerjaHarian || EMPLOYEE_NORMAL_HOURS[empId] || 8;
    const startHour = 8;
    const endHour = startHour + targetHours;

    const res = await addSchedule({
      employeeId: emp.id,
      date: selectedDate,
      startTime: `${String(startHour).padStart(2, "0")}:00`,
      endTime: `${String(endHour).padStart(2, "0")}:00`,
      isOvernight: endHour >= 24,
      status: "KERJA",
      notes: "Shift Baru",
    });

    if (res.success && res.data && onSchedulesChange) {
      onSchedulesChange([...schedules, res.data]);
    }
  };

  // ============================================================
  // GLOBAL MOUSE / TOUCH EVENT HANDLERS FOR TIMELINE
  // ============================================================

  // Helper to compute minutes from mouse/touch event relative to timeline track
  const getMinutesFromEvent = useCallback(
    (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): number | null => {
      if (!timelineGridRef.current) return null;
      const rect = timelineGridRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const relativeX = clientX - rect.left;
      return pxToMinutes(relativeX);
    },
    []
  );

  // Track drag on document
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      // 1. Creating new shift by dragging on track
      if (creatingShift) {
        const currentMin = getMinutesFromEvent(e);
        if (currentMin !== null) {
          setCreatingShift((prev) => (prev ? { ...prev, currentMin } : null));
        }
      }

      // 2. Moving existing shift block
      if (movingShift) {
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const deltaPx = clientX - movingShift.dragStartClientX;
        // Mark as dragged once movement exceeds 5px threshold
        if (Math.abs(deltaPx) > 5) {
          hasDraggedRef.current = true;
        }
        const deltaMin = Math.round(((deltaPx / HOUR_WIDTH) * 60) / SNAP_MINUTES) * SNAP_MINUTES;
        setMovingShift((prev) => (prev ? { ...prev, currentOffsetMin: deltaMin } : null));
      }

      // 3. Resizing existing shift block
      if (resizingShift) {
        const currentMin = getMinutesFromEvent(e);
        if (currentMin !== null) {
          hasDraggedRef.current = true;
          setResizingShift((prev) => (prev ? { ...prev, currentMin } : null));
        }
      }
    };

    const handlePointerUp = () => {
      // 1. Finish creating shift
      if (creatingShift) {
        const { employeeId, startMin, currentMin } = creatingShift;
        const minStart = Math.min(startMin, currentMin);
        const maxEnd = Math.max(startMin, currentMin);
        const durationMin = maxEnd - minStart;

        // Require at least 60 minutes (1 full hour) drag to create shift
        if (durationMin >= 60) {
          const existing = daySchedules.find((s) => s.employeeId === employeeId);
          if (existing) {
            setActiveSchedule(existing);
          } else {
            const emp = employees.find((e) => e.id === employeeId);
            if (emp) {
              const startObj = minutesToTimeString(minStart);
              const endObj = minutesToTimeString(maxEnd);

              addSchedule({
                employeeId: emp.id,
                date: selectedDate,
                startTime: startObj.timeStr,
                endTime: endObj.timeStr,
                isOvernight: maxEnd >= 24 * 60,
                status: "KERJA",
                notes: "Shift Baru",
              }).then((res) => {
                if (res.success && res.data && onSchedulesChange) {
                  onSchedulesChange([...schedules, res.data]);
                }
              });
            }
          }
        }
        setCreatingShift(null);
      }

      // 2. Finish moving shift
      if (movingShift) {
        const { scheduleId, initialStartMin, initialEndMin, currentOffsetMin } = movingShift;
        const duration = initialEndMin - initialStartMin;
        let newStartMin = Math.max(0, initialStartMin + currentOffsetMin);
        let newEndMin = newStartMin + duration;

        if (newEndMin > TOTAL_HOURS * 60) {
          newEndMin = TOTAL_HOURS * 60;
          newStartMin = Math.max(0, newEndMin - duration);
        }

        const startObj = minutesToTimeString(newStartMin);
        const endObj = minutesToTimeString(newEndMin);

        updateSchedule(scheduleId, {
          startTime: startObj.timeStr,
          endTime: endObj.timeStr,
          isOvernight: newEndMin >= 24 * 60,
        }).then((res) => {
          if (res.success && res.data && onSchedulesChange) {
            onSchedulesChange(
              schedules.map((s) => (s.id === scheduleId ? res.data! : s))
            );
          }
        });

        setMovingShift(null);
      }

      // 3. Finish resizing shift
      if (resizingShift) {
        const { scheduleId, edge, otherEdgeMin, currentMin } = resizingShift;
        let newStartMin: number;
        let newEndMin: number;

        if (edge === "start") {
          newStartMin = Math.min(currentMin, otherEdgeMin - 60);
          newEndMin = otherEdgeMin;
        } else {
          newStartMin = otherEdgeMin;
          newEndMin = Math.max(currentMin, otherEdgeMin + 60);
        }

        const startObj = minutesToTimeString(newStartMin);
        const endObj = minutesToTimeString(newEndMin);

        updateSchedule(scheduleId, {
          startTime: startObj.timeStr,
          endTime: endObj.timeStr,
          isOvernight: newEndMin >= 24 * 60,
        }).then((res) => {
          if (res.success && res.data && onSchedulesChange) {
            onSchedulesChange(
              schedules.map((s) => (s.id === scheduleId ? res.data! : s))
            );
          }
        });

        setResizingShift(null);
      }
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [creatingShift, movingShift, resizingShift, getMinutesFromEvent, selectedDate, schedules, onSchedulesChange]);

  // Close active popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#schedule-detail-card") && !target.closest(".schedule-block-item")) {
        setActiveSchedule(null);
        setPopoverPosition(null);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden select-none w-full">
      {/* ============================================================ */}
      {/* 1. HEADER & DAY NAVIGATION */}
      {/* ============================================================ */}
      <div className="p-2.5 sm:p-3.5 border-b border-[var(--border)] bg-gradient-to-b from-[var(--color-cream-50)] to-white flex flex-col gap-2.5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Day navigation title */}
          <div className="flex items-center justify-between md:justify-start gap-2">
            <div className="flex items-center rounded-xl border border-[var(--border)] bg-white p-0.5 shadow-sm">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handlePrevDay}
                disabled={daysList.findIndex((d) => d.date === selectedDate) === 0}
                className="h-7 w-7 text-stone-700 hover:bg-[var(--muted)]"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-2 sm:px-3 text-center">
                <span className="text-xs sm:text-sm font-bold text-stone-900 block leading-tight">
                  Jadwal — {currentDayObj.day}
                </span>
                <span className="text-[9px] sm:text-[10px] text-[var(--muted-foreground)]">
                  {formatDateShort(selectedDate)}, {new Date(selectedDate + "T00:00:00").getFullYear()}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleNextDay}
                disabled={
                  daysList.findIndex((d) => d.date === selectedDate) === daysList.length - 1
                }
                className="h-7 w-7 text-stone-700 hover:bg-[var(--muted)]"
                title="Hari Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick day switcher pills */}
            <div className="hidden lg:flex items-center gap-1 bg-[var(--muted)] p-1 rounded-xl border border-[var(--border-subtle)]">
              {daysList.map((d) => {
                const isActive = d.date === selectedDate;
                const count = schedules.filter((s) => s.date === d.date).length;
                return (
                  <button
                    key={d.date}
                    onClick={() => {
                      setSelectedDate(d.date);
                      setActiveSchedule(null);
                      setPopoverPosition(null);
                    }}
                    className={cn(
                      "px-2.5 py-0.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                      isActive
                        ? "bg-white text-brand-700 shadow-sm border border-[var(--border)]"
                        : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                    )}
                  >
                    <span>{d.short}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1 rounded-full",
                        isActive
                          ? "bg-brand-100 text-brand-800"
                          : "bg-stone-200/70 text-stone-600"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick stats & action buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
            {/* Live Stats Badges */}
            <div className="flex items-center gap-1 text-[11px] sm:text-xs">
              <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-stone-700 font-medium flex items-center gap-1">
                <span className="font-bold text-stone-900">{dayStats.activeEmployeesCount}</span>/{orderedEmployees.length} Bekerja
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-stone-700 font-medium flex items-center gap-1">
                <span className="font-bold text-stone-900">{dayStats.totalWorkingHours.toFixed(0)}</span> Jam
              </span>
              {dayStats.overtimeHours > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1">
                  +{dayStats.overtimeHours.toFixed(0)}j Lembur
                </span>
              )}
              {dayStats.underHoursCount > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="hidden xs:inline">{dayStats.underHoursCount} Kurang</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLeaveDefaultEmployeeId("");
                  setIsLeaveModalOpen(true);
                }}
                className="h-7 px-2 gap-1 text-xs bg-white hover:bg-stone-50 text-stone-700 border-stone-300"
                id="timeline-leave-btn"
              >
                <CalendarOff className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Libur / Izin</span>
              </Button>

              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  setAddDefaultEmployeeId("");
                  setIsAddModalOpen(true);
                }}
                className="h-7 px-2 gap-1 text-xs"
                id="timeline-add-sched-btn"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Tambah</span>
                <span className="hidden sm:inline">Tambah Jadwal Kerja</span>
              </Button>

              {onClose && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  className="h-7 w-7 text-stone-500 hover:text-stone-900 rounded-lg shrink-0"
                  title="Tutup Timeline"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tip / instructions bar */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[var(--muted-foreground)] bg-stone-50/80 px-2.5 sm:px-3 py-1 rounded-lg border border-[var(--border-subtle)] gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-brand-600 shrink-0" />
            <span className="line-clamp-1 sm:line-clamp-none">
              <strong>Tarik (drag)</strong> untuk buat shift • <strong>Klik</strong> untuk edit • Tombol <strong>Libur/Izin</strong> untuk status
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 sm:px-2 py-0.5 rounded border border-brand-200 shrink-0">
            Snap: 1 Jam
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN INTERACTIVE TIMELINE CONTAINER WITH VERTICAL SCROLL */}
      {/* ============================================================ */}
      <div className="w-full relative">
        <div
          ref={scrollContainerRef}
          className="w-full h-[460px] max-h-[60vh] sm:max-h-[55vh] relative border-b border-[var(--border)]"
          style={{ overflowY: "auto", overflowX: "auto" }}
        >
          <div
            className="flex min-h-full w-max"
          >
            {/* ------------------------------------------------------------ */}
            {/* A. STICKY EMPLOYEE COLUMN (LEFT) */}
            {/* ------------------------------------------------------------ */}
            <div className="sticky left-0 z-30 w-16 min-w-[4rem] sm:w-56 sm:min-w-[14rem] shrink-0 bg-white border-r border-[var(--border)] shadow-[4px_0_12px_rgba(0,0,0,0.06)] flex flex-col">
              {/* Employee column header (Top-Left Intersection Corner) */}
              <div className="h-10 w-full border-b border-[var(--border)] bg-[#f7f3ec] flex items-center justify-center sm:justify-between px-1.5 sm:px-3 sticky top-0 z-40 shadow-2xs">
                <span className="text-[11px] font-bold text-stone-800 tracking-wide uppercase shrink-0">
                  <span className="sm:hidden">Tim</span>
                  <span className="hidden sm:inline">Karyawan ({orderedEmployees.length})</span>
                </span>
                <span className="hidden sm:inline text-[10px] font-medium text-[var(--muted-foreground)] shrink-0">
                  Status / Target
                </span>
              </div>

              {/* Employee Rows (All 10 Rows) */}
              <div className="divide-y divide-[var(--border-subtle)] bg-white">
                {orderedEmployees.map((emp) => {
                  const summary = employeeHoursSummary[emp.id];
                  const isBeingDragged = draggedEmployeeId === emp.id;
                  const isDragOver = dragOverEmployeeId === emp.id;

                  return (
                    <div
                      key={emp.id}
                      data-employee-id={emp.id}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", emp.id);
                        setDraggedEmployeeId(emp.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverEmployeeId !== emp.id) {
                          setDragOverEmployeeId(emp.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverEmployeeId === emp.id) {
                          setDragOverEmployeeId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData("text/plain") || draggedEmployeeId;
                        if (sourceId) {
                          handleReorder(sourceId, emp.id);
                        }
                        setDraggedEmployeeId(null);
                        setDragOverEmployeeId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedEmployeeId(null);
                        setDragOverEmployeeId(null);
                      }}
                      className={cn(
                        "flex items-center justify-start sm:justify-between px-1.5 sm:px-3 transition-all duration-150 cursor-grab active:cursor-grabbing group select-none relative",
                        isBeingDragged
                          ? "bg-brand-50/90 shadow-md ring-2 ring-brand-500 z-30 opacity-70"
                          : "hover:bg-[var(--color-cream-50)] bg-white",
                        isDragOver && !isBeingDragged ? "border-t-2 border-t-brand-600 bg-brand-50/40" : ""
                      )}
                      title={`${emp.name} — ${POSITION_LABELS[emp.position]}`}
                    >
                      {/* Left: Drag grip & details (Full Identity Block Drag Activator) */}
                      <div
                        className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing select-none"
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          if (!touch) return;
                          const isDirectHandle = Boolean((e.target as HTMLElement).closest(".drag-handle-grip"));

                          if (touchDragRef.current.timer) {
                            clearTimeout(touchDragRef.current.timer);
                            touchDragRef.current.timer = null;
                          }

                          if (isDirectHandle) {
                            touchDragRef.current = {
                              sourceId: emp.id,
                              targetId: null,
                              timer: null,
                              active: true,
                              startX: touch.clientX,
                              startY: touch.clientY,
                            };
                            setDraggedEmployeeId(emp.id);
                          } else {
                            const timer = setTimeout(() => {
                              touchDragRef.current.active = true;
                              setDraggedEmployeeId(emp.id);
                            }, 350);

                            touchDragRef.current = {
                              sourceId: emp.id,
                              targetId: null,
                              timer,
                              active: false,
                              startX: touch.clientX,
                              startY: touch.clientY,
                            };
                          }
                        }}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          if (!touch || !touchDragRef.current.sourceId) return;

                          if (!touchDragRef.current.active) {
                            const dist = Math.hypot(
                              touch.clientX - touchDragRef.current.startX,
                              touch.clientY - touchDragRef.current.startY
                            );
                            if (dist > 8) {
                              if (touchDragRef.current.timer) {
                                clearTimeout(touchDragRef.current.timer);
                                touchDragRef.current.timer = null;
                              }
                              touchDragRef.current.sourceId = null;
                            }
                            return;
                          }

                          e.preventDefault();

                          const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
                          const rowEl = targetEl?.closest("[data-employee-id]") as HTMLElement | null;
                          if (rowEl) {
                            const targetEmpId = rowEl.getAttribute("data-employee-id");
                            if (targetEmpId && targetEmpId !== touchDragRef.current.targetId) {
                              touchDragRef.current.targetId = targetEmpId;
                              setDragOverEmployeeId(targetEmpId);
                            }
                          }
                        }}
                        onTouchEnd={() => {
                          if (touchDragRef.current.timer) {
                            clearTimeout(touchDragRef.current.timer);
                            touchDragRef.current.timer = null;
                          }

                          const { sourceId, targetId, active } = touchDragRef.current;
                          if (active && sourceId && targetId && sourceId !== targetId) {
                            handleReorder(sourceId, targetId);
                          }

                          touchDragRef.current = {
                            sourceId: null,
                            targetId: null,
                            timer: null,
                            active: false,
                            startX: 0,
                            startY: 0,
                          };
                          setDraggedEmployeeId(null);
                          setDragOverEmployeeId(null);
                        }}
                        onTouchCancel={() => {
                          if (touchDragRef.current.timer) {
                            clearTimeout(touchDragRef.current.timer);
                            touchDragRef.current.timer = null;
                          }
                          touchDragRef.current = {
                            sourceId: null,
                            targetId: null,
                            timer: null,
                            active: false,
                            startX: 0,
                            startY: 0,
                          };
                          setDraggedEmployeeId(null);
                          setDragOverEmployeeId(null);
                        }}
                      >
                        {/* Drag Handle Indicator */}
                        <div
                          className="drag-handle-grip text-stone-300 group-hover:text-stone-600 cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none select-none py-1 -my-1"
                          title="Tahan dan geser untuk ubah urutan karyawan"
                        >
                          <GripVertical className="h-3.5 w-3.5 pointer-events-none" />
                        </div>

                        {/* Avatar initials */}
                        <div
                          className="h-7 w-7 rounded-full bg-coffee-100 text-coffee-900 border border-coffee-200 flex items-center justify-center text-[10px] sm:text-[11px] font-bold shrink-0 shadow-2xs pointer-events-none"
                          title={`${emp.name} (${POSITION_LABELS[emp.position]})`}
                        >
                          {emp.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="hidden sm:block min-w-0 pointer-events-none">
                          <p className="text-xs font-bold text-stone-900 truncate leading-tight">
                            {emp.name}
                          </p>
                          <p className="text-[10px] text-[var(--muted-foreground)] truncate font-medium">
                            {POSITION_LABELS[emp.position]}
                          </p>
                        </div>
                      </div>

                      {/* Right: Hours / Leave status badge (Desktop only) */}
                      <div className="hidden sm:flex flex-col items-end shrink-0 pl-1">
                        {summary.leaveStatus === "CUTI" ? (
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded shadow-2xs">
                            Cuti
                          </span>
                        ) : summary.leaveStatus === "IZIN" ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">
                            Izin
                          </span>
                        ) : summary.leaveStatus === "LIBUR" ? (
                          <span className="text-[10px] font-bold text-stone-700 bg-stone-100 border border-stone-300 px-1.5 py-0.5 rounded shadow-2xs">
                            Libur
                          </span>
                        ) : summary.shiftCount === 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddDefaultEmployeeId(emp.id);
                              setIsAddModalOpen(true);
                            }}
                            className="text-[10px] font-medium text-stone-500 bg-stone-100 hover:bg-brand-50 hover:text-brand-700 border border-stone-200 hover:border-brand-300 px-1.5 py-0.5 rounded transition-colors"
                            title="Atur shift / cuti / izin untuk karyawan ini"
                          >
                            + Atur
                          </button>
                        ) : summary.status === "under" ? (
                          <span
                            className="flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs"
                            title={`Kurang ${summary.diffHours} jam dari target (${summary.normalHours} jam)`}
                          >
                            <AlertTriangle className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                            <span>{summary.totalHours}j / {summary.normalHours}j</span>
                          </span>
                        ) : summary.status === "over" ? (
                          <span
                            className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded shadow-2xs"
                            title={`Lembur ${summary.diffHours} jam (Total ${summary.totalHours} jam)`}
                          >
                            <Clock className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                            <span>{summary.totalHours}j / {summary.normalHours}j</span>
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-0.5 text-[10px] font-bold text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded"
                            title={`Jam kerja normal (${summary.normalHours} jam)`}
                          >
                            <CheckCircle2 className="h-2.5 w-2.5 text-stone-500 shrink-0" />
                            <span>{summary.totalHours}j / {summary.normalHours}j</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* B. TIMELINE GRID & SHIFT TRACKS (RIGHT) */}
            {/* ------------------------------------------------------------ */}
            <div
              style={{ width: `${TOTAL_HOURS * HOUR_WIDTH}px` }}
              className="shrink-0 flex flex-col"
            >
              {/* Timeline Time Header (Sticky Top) */}
              <div className="h-10 border-b border-[var(--border)] bg-[#f7f3ec] flex sticky top-0 z-20 shadow-2xs">
                {Array.from({ length: TOTAL_HOURS }).map((_, hourIndex) => {
                  const displayHour = hourIndex % 24;
                  const isNextDay = hourIndex >= 24;
                  const isCurrentHourSlot = isToday && currentHour === displayHour;

                  return (
                    <div
                      key={hourIndex}
                      style={{ width: `${HOUR_WIDTH}px` }}
                      className={cn(
                        "h-full border-r border-stone-300/80 flex flex-col items-center justify-center text-[10px] font-bold shrink-0 relative",
                        isCurrentHourSlot ? "bg-amber-100/70 text-amber-900" : "text-stone-700",
                        isNextDay ? "bg-indigo-50/60 text-indigo-900" : ""
                      )}
                    >
                      <span className="font-mono">
                        {String(displayHour).padStart(2, "0")}:00
                      </span>
                      {isNextDay && (
                        <span className="text-[8px] font-semibold text-indigo-600 leading-none">
                          +1H
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Timeline Track Rows */}
              <div ref={timelineGridRef} className="relative divide-y divide-[var(--border-subtle)] bg-white">
                {/* Red Current Time Indicator Line (If selectedDate is Today) */}
                {currentTimePosPx !== null && (
                  <div
                    style={{ left: `${currentTimePosPx}px` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-25 pointer-events-none shadow-sm"
                  >
                    <div className="h-2.5 w-2.5 -ml-1 rounded-full bg-red-600 border border-white shadow-xs" />
                  </div>
                )}

                {orderedEmployees.map((emp) => {
                  const empShifts = daySchedules.filter((s) => s.employeeId === emp.id);
                  const empSummary = employeeHoursSummary[emp.id];

                  return (
                    <div
                      key={emp.id}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      className="relative flex items-center hover:bg-stone-50/40 transition-colors group/row"
                      onMouseDown={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest(".schedule-block-item")) return;
                        if (target.closest(".leave-block-item")) return;
                        // Don't start creating shift if a popover is open;
                        // user is likely trying to interact with the popover overlay.
                        if (activeSchedule) return;

                        const startMin = getMinutesFromEvent(e);
                        if (startMin !== null) {
                          setCreatingShift({
                            employeeId: emp.id,
                            startMin,
                            // Start with currentMin = startMin so that a pure click
                            // (no drag) produces 0 duration and is ignored in handlePointerUp.
                            currentMin: startMin,
                          });
                        }
                      }}
                    >
                      {/* Vertical Background Hour Guidelines */}
                      {Array.from({ length: TOTAL_HOURS }).map((_, hourIndex) => (
                        <div
                          key={hourIndex}
                          style={{ width: `${HOUR_WIDTH}px` }}
                          className={cn(
                            "h-full border-r border-stone-100 shrink-0 pointer-events-none",
                            hourIndex >= 24 ? "bg-indigo-50/20" : ""
                          )}
                        />
                      ))}

                      {/* Shift Creation Live Preview Block */}
                      {creatingShift && creatingShift.employeeId === emp.id && (
                        (() => {
                          const minStart = Math.min(creatingShift.startMin, creatingShift.currentMin);
                          const maxEnd = Math.max(creatingShift.startMin, creatingShift.currentMin);
                          const left = minutesToPx(minStart);
                          const width = Math.max(minutesToPx(maxEnd - minStart), HOUR_WIDTH);
                          const startObj = minutesToTimeString(minStart);
                          const endObj = minutesToTimeString(maxEnd);
                          const durationH = (maxEnd - minStart) / 60;

                          return (
                            <div
                              style={{ left: `${left}px`, width: `${width}px` }}
                              className="absolute top-1.5 bottom-1.5 rounded-xl bg-brand-500/85 border-2 border-brand-600 text-white flex items-center justify-between px-3 shadow-lg z-20 pointer-events-none animate-pulse-soft"
                            >
                              <span className="text-[11px] font-bold">
                                {startObj.timeStr} – {endObj.timeStr}
                              </span>
                              <span className="text-[10px] font-extrabold bg-black/25 px-1.5 py-0.5 rounded">
                                {formatDurationText(durationH)}
                              </span>
                            </div>
                          );
                        })()
                      )}

                      {/* Render Schedule / Status Blocks for this Employee */}
                      {empShifts.map((schedule) => {
                        const isCuti = schedule.status === "CUTI";
                        const isIzin = schedule.status === "IZIN";
                        const isLibur = schedule.status === "LIBUR";
                        const isNonWork = isCuti || isIzin || isLibur;

                        // Non-work Status Block (CUTI / IZIN / LIBUR) - Full Day Block
                        if (isNonWork) {
                          const badgeConfig = isCuti
                            ? {
                              bg: "bg-purple-100/70 hover:bg-purple-100/85",
                              border: "border-purple-300",
                              text: "text-purple-950",
                              badge: "bg-purple-200 text-purple-900 border-purple-300",
                              label: "CUTI",
                            }
                            : isIzin
                              ? {
                                bg: "bg-amber-100/70 hover:bg-amber-100/85",
                                border: "border-amber-300",
                                text: "text-amber-950",
                                badge: "bg-amber-200 text-amber-900 border-amber-300",
                                label: "IZIN",
                              }
                              : {
                                bg: "bg-stone-200/65 hover:bg-stone-200/80",
                                border: "border-stone-300",
                                text: "text-stone-800",
                                badge: "bg-stone-300/80 text-stone-800 border-stone-400",
                                label: "LIBUR",
                              };

                          return (
                            <div
                              key={schedule.id}
                              style={{
                                left: "0px",
                                width: `${TOTAL_HOURS * HOUR_WIDTH}px`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const target = e.currentTarget as HTMLElement;
                                const rect = target.getBoundingClientRect();
                                // Position popover near the leave block, respecting viewport
                                let x = rect.left + 20;
                                let y = rect.bottom + 8;
                                const cardWidth = 300;
                                const cardHeight = 260;
                                if (x + cardWidth > window.innerWidth - 16) {
                                  x = window.innerWidth - cardWidth - 16;
                                }
                                if (y + cardHeight > window.innerHeight - 16) {
                                  const topCandidate = rect.top - cardHeight - 8;
                                  y = topCandidate > 16 ? topCandidate : Math.max(16, window.innerHeight - cardHeight - 16);
                                }

                                setActiveSchedule(schedule);
                                setPopoverPosition({
                                  x: Math.max(16, x),
                                  y: Math.max(16, y),
                                });
                              }}
                              className={cn(
                                "leave-block-item absolute top-1.5 bottom-1.5 rounded-xl border-2 px-4 py-1 flex items-center justify-between cursor-pointer transition-all shadow-2xs z-10 select-none",
                                badgeConfig.bg,
                                badgeConfig.border,
                                activeSchedule?.id === schedule.id
                                  ? "ring-2 ring-brand-700 shadow-md"
                                  : "hover:shadow-sm"
                              )}
                              title={`Status ${badgeConfig.label} seharian penuh. Klik untuk lihat/edit.`}
                            >
                              <div className="flex items-center gap-3 sticky left-4 z-10">
                                <span
                                  className={cn(
                                    "text-[10px] font-black px-2.5 py-0.5 rounded border tracking-widest uppercase shadow-2xs",
                                    badgeConfig.badge
                                  )}
                                >
                                  {badgeConfig.label}
                                </span>
                                <span className={cn("text-xs font-bold", badgeConfig.text)}>
                                  {emp.name} — Libur Penuh ({badgeConfig.label})
                                </span>
                                {schedule.notes && (
                                  <span className="text-[11px] text-stone-600 italic bg-white/70 px-2 py-0.5 rounded border border-stone-200/80 truncate max-w-sm">
                                    {schedule.notes}
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] text-stone-500 font-medium px-2 py-0.5 rounded bg-white/50 border border-stone-200/60 shrink-0">
                                Tidak Bekerja (0 jam)
                              </span>
                            </div>
                          );
                        }

                        // Standard Working Shift (KERJA)
                        const colors =
                          POSITION_COLORS[schedule.employeePosition] || POSITION_COLORS.BARISTA;

                        // Calculate position
                        const startMin = timeStringToMinutes(schedule.startTime || "08:00");
                        const endMin = timeStringToMinutes(
                          schedule.endTime || "16:00",
                          schedule.isOvernight ||
                          timeStringToMinutes(schedule.endTime || "16:00") <= startMin
                        );

                        // If moving this specific shift, add real-time offset
                        let displayStartMin = startMin;
                        let displayEndMin = endMin;
                        if (movingShift && movingShift.scheduleId === schedule.id) {
                          const duration = endMin - startMin;
                          displayStartMin = Math.max(0, startMin + movingShift.currentOffsetMin);
                          displayEndMin = displayStartMin + duration;
                        }

                        // If resizing this specific shift
                        if (resizingShift && resizingShift.scheduleId === schedule.id) {
                          if (resizingShift.edge === "start") {
                            displayStartMin = Math.min(resizingShift.currentMin, resizingShift.otherEdgeMin - 60);
                            displayEndMin = resizingShift.otherEdgeMin;
                          } else {
                            displayStartMin = resizingShift.otherEdgeMin;
                            displayEndMin = Math.max(resizingShift.currentMin, resizingShift.otherEdgeMin + 60);
                          }
                        }

                        const leftPx = minutesToPx(displayStartMin);
                        const durationMin = displayEndMin - displayStartMin;
                        const widthPx = Math.max(minutesToPx(durationMin), 56);
                        const durationHours = durationMin / 60;

                        const isUnder = empSummary.status === "under";
                        const isOver = empSummary.status === "over";
                        const isSelected = activeSchedule?.id === schedule.id;

                        const startObj = minutesToTimeString(displayStartMin);
                        const endObj = minutesToTimeString(displayEndMin);

                        return (
                          <div
                            key={schedule.id}
                            style={{
                              left: `${leftPx}px`,
                              width: `${widthPx}px`,
                            }}
                            className={cn(
                              "schedule-block-item absolute top-1.5 bottom-1.5 rounded-xl border-2 px-2.5 py-1 transition-shadow duration-100 flex items-center justify-between group/block cursor-grab active:cursor-grabbing select-none z-10",
                              colors.bg,
                              colors.border,
                              isUnder ? "border-amber-500 ring-2 ring-amber-300/70" : "",
                              isOver ? "border-emerald-500 ring-2 ring-emerald-300/70" : "",
                              isSelected ? "ring-2 ring-brand-700 shadow-xl brightness-95 z-15" : "hover:shadow-md hover:brightness-95",
                              movingShift?.scheduleId === schedule.id ? "opacity-90 shadow-2xl scale-[1.01] z-20" : ""
                            )}
                            onMouseDown={(e) => {
                              // Prevent moving if resize handle was clicked
                              const target = e.target as HTMLElement;
                              if (target.closest(".resize-handle")) return;

                              // Reset drag flag each time a new drag potentially starts
                              hasDraggedRef.current = false;

                              setMovingShift({
                                scheduleId: schedule.id,
                                employeeId: emp.id,
                                initialStartMin: startMin,
                                initialEndMin: endMin,
                                dragStartClientX: e.clientX,
                                currentOffsetMin: 0,
                              });
                            }}
                            onClick={(e) => {
                              e.stopPropagation();

                              // If the user dragged the block, don't open the popover
                              if (hasDraggedRef.current) {
                                hasDraggedRef.current = false;
                                return;
                              }

                              const target = e.currentTarget as HTMLElement;
                              const rect = target.getBoundingClientRect();

                              // Smart placement: if close to bottom of screen, open above
                              let x = rect.left;
                              let y = rect.bottom + 8;
                              const cardWidth = 300;
                              const cardHeight = 260;
                              if (x + cardWidth > window.innerWidth - 16) {
                                x = window.innerWidth - cardWidth - 16;
                              }
                              if (y + cardHeight > window.innerHeight - 16) {
                                const topCandidate = rect.top - cardHeight - 8;
                                y = topCandidate > 16 ? topCandidate : Math.max(16, window.innerHeight - cardHeight - 16);
                              }

                              setActiveSchedule(schedule);
                              setPopoverPosition({
                                x: Math.max(16, x),
                                y: Math.max(16, y),
                              });
                            }}
                          >
                            {/* LEFT RESIZE HANDLE ◀ */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setResizingShift({
                                  scheduleId: schedule.id,
                                  edge: "start",
                                  initialMin: startMin,
                                  otherEdgeMin: endMin,
                                  currentMin: startMin,
                                });
                              }}
                              className="resize-handle absolute left-0 top-0 bottom-0 w-3 hover:w-4 bg-black/10 hover:bg-brand-600 rounded-l-[10px] cursor-ew-resize flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-all z-20"
                              title="Tarik untuk ubah jam mulai"
                            >
                              <div className="w-0.5 h-4 bg-white rounded-full" />
                            </div>

                            {/* MIDDLE CONTENT */}
                            <div className="min-w-0 flex-1 pr-1 pointer-events-none">
                              <div className="flex items-center gap-1 leading-tight">
                                <span className={cn("text-[11px] font-bold truncate", colors.text)}>
                                  {startObj.timeStr} – {endObj.timeStr}
                                </span>
                                {schedule.isOvernight && (
                                  <Moon className="h-3 w-3 text-indigo-700 shrink-0" />
                                )}
                              </div>

                              {widthPx > 110 && (
                                <div className="flex items-center gap-1 mt-0.5 text-[10px] font-semibold">
                                  <span className={cn("opacity-80 truncate", colors.text)}>
                                    {emp.name}
                                  </span>
                                  <span className="text-[9px] bg-white/80 px-1 py-0.2 rounded font-bold text-stone-700">
                                    {formatDurationText(durationHours)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* RIGHT STATUS ICON */}
                            <div className="shrink-0 flex items-center gap-1 pointer-events-none">
                              {isUnder && (
                                <div
                                  className="flex items-center gap-0.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs"
                                  title={`Kurang ${empSummary.diffHours} jam dari target`}
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {widthPx > 140 && <span>Kurang {empSummary.diffHours}j</span>}
                                </div>
                              )}

                              {isOver && (
                                <div
                                  className="flex items-center gap-0.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs"
                                  title={`Lembur ${empSummary.diffHours} jam`}
                                >
                                  <Clock className="h-2.5 w-2.5" />
                                  {widthPx > 140 && <span>Lembur +{empSummary.diffHours}j</span>}
                                </div>
                              )}
                            </div>

                            {/* RIGHT RESIZE HANDLE ▶ */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setResizingShift({
                                  scheduleId: schedule.id,
                                  edge: "end",
                                  initialMin: endMin,
                                  otherEdgeMin: startMin,
                                  currentMin: endMin,
                                });
                              }}
                              className="resize-handle absolute right-0 top-0 bottom-0 w-3 hover:w-4 bg-black/10 hover:bg-brand-600 rounded-r-[10px] cursor-ew-resize flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-all z-20"
                              title="Tarik untuk ubah jam selesai"
                            >
                              <div className="w-0.5 h-4 bg-white rounded-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SCHEDULE DETAIL POPOVER CARD WITH PORTAL & VIEWPORT SAFETY */}
      {/* ============================================================ */}
      {activeSchedule && popoverPosition && typeof document !== "undefined" && createPortal(
        <div
          id="schedule-detail-card"
          style={{
            position: "fixed",
            left: `${popoverPosition.x}px`,
            top: `${popoverPosition.y}px`,
            zIndex: 9999,
          }}
          // Stop mousedown from propagating through the portal into the timeline
          // This prevents click-through onto the schedule track behind the popover
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="w-72 bg-white rounded-2xl border border-[var(--border)] shadow-2xl p-3.5 flex flex-col gap-2.5 animate-scale-in max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-2">
            <div>
              <p className="text-sm font-bold text-stone-900 leading-tight">
                {activeSchedule.employeeName}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                {POSITION_LABELS[activeSchedule.employeePosition]}
              </p>
            </div>
            <button
              onClick={() => {
                setActiveSchedule(null);
                setPopoverPosition(null);
              }}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100"
              title="Tutup Detail"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Details Body: Non-work vs Work Shift */}
          {activeSchedule.status === "CUTI" ||
            activeSchedule.status === "IZIN" ||
            activeSchedule.status === "LIBUR" ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between bg-[var(--muted)] p-2 rounded-xl border border-[var(--border-subtle)]">
                <span className="font-medium text-stone-600">Status Hari:</span>
                <span
                  className={cn(
                    "font-bold text-xs px-2 py-0.5 rounded border",
                    activeSchedule.status === "CUTI"
                      ? "bg-purple-100 text-purple-800 border-purple-200"
                      : activeSchedule.status === "IZIN"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-stone-200 text-stone-700 border-stone-300"
                  )}
                >
                  {activeSchedule.status}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-[10px] text-stone-500 block font-medium">Tanggal</span>
                <span className="font-semibold text-stone-800">{activeSchedule.date}</span>
              </div>
              {activeSchedule.notes && (
                <div className="p-2 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[10px] text-stone-500 block font-medium">Keterangan / Alasan</span>
                  <span className="text-xs text-stone-700 italic">{activeSchedule.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between bg-[var(--muted)] p-2 rounded-xl border border-[var(--border-subtle)]">
                <span className="font-medium text-stone-600">Waktu Kerja:</span>
                <span className="font-bold text-stone-900 text-sm">
                  {activeSchedule.startTime} – {activeSchedule.endTime}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] text-stone-500 block font-medium">Jam Normal</span>
                  <span className="font-bold text-stone-800 text-sm">
                    {employees.find((e) => e.id === activeSchedule.employeeId)?.dailyWorkingHours ||
                      employees.find((e) => e.id === activeSchedule.employeeId)?.jamKerjaHarian ||
                      EMPLOYEE_NORMAL_HOURS[activeSchedule.employeeId] ||
                      8}{" "}
                    jam
                  </span>
                </div>
                <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] text-stone-500 block font-medium">Durasi Shift</span>
                  <span className="font-bold text-stone-800 text-sm">
                    {formatDurationText(
                      getScheduleDurationHours(
                        activeSchedule.startTime,
                        activeSchedule.endTime,
                        activeSchedule.breakMinutes || 0
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* Total Daily Hours & Evaluation */}
              {(() => {
                const summary = employeeHoursSummary[activeSchedule.employeeId];
                if (!summary) return null;

                return (
                  <div className="pt-0.5">
                    {summary.status === "under" && (
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-semibold text-xs">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>⚠ Kurang {summary.diffHours} jam dari jam kerja normal</span>
                      </div>
                    )}

                    {summary.status === "over" && (
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold text-xs">
                        <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Lembur: {summary.diffHours} jam (Total {summary.totalHours} jam)</span>
                      </div>
                    )}

                    {summary.status === "normal" && (
                      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-xs">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>Sesuai jam kerja normal ({summary.normalHours} jam)</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Actions: Edit, Delete & Close */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteSchedule(activeSchedule.id)}
              className="h-8 gap-1 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus</span>
            </Button>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    activeSchedule.status === "CUTI" ||
                    activeSchedule.status === "IZIN" ||
                    activeSchedule.status === "LIBUR"
                  ) {
                    setEditingLeaveTarget(activeSchedule);
                  } else {
                    setEditingScheduleTarget(activeSchedule);
                  }
                  setActiveSchedule(null);
                  setPopoverPosition(null);
                }}
                className="h-8 gap-1 text-xs"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveSchedule(null);
                  setPopoverPosition(null);
                }}
                className="h-8 text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Schedule Form Modal for Adding / Editing KERJA */}
      {isAddModalOpen && (
        <ScheduleForm
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          mode="add"
          defaultDate={selectedDate}
          defaultEmployeeId={addDefaultEmployeeId}
        />
      )}

      {editingScheduleTarget && (
        <ScheduleForm
          open={Boolean(editingScheduleTarget)}
          onClose={() => setEditingScheduleTarget(null)}
          mode="edit"
          schedule={editingScheduleTarget}
        />
      )}

      {/* Leave Form Modal for Adding / Editing CUTI / IZIN / LIBUR */}
      {isLeaveModalOpen && (
        <LeaveForm
          open={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          mode="add"
          defaultDate={selectedDate}
          defaultEmployeeId={leaveDefaultEmployeeId}
        />
      )}

      {editingLeaveTarget && (
        <LeaveForm
          open={Boolean(editingLeaveTarget)}
          onClose={() => setEditingLeaveTarget(null)}
          mode="edit"
          schedule={editingLeaveTarget}
        />
      )}

      {/* Confirmation Dialog for Reset Jadwal Hari */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-stone-800">
                  Reset Jadwal {currentDayObj.day}?
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500 mt-0.5">
                  Tindakan ini akan menghapus jadwal kerja pada tanggal yang dipilih.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-stone-600 space-y-2">
            <p>
              Seluruh jadwal kerja pada{" "}
              <strong className="text-stone-800">
                {currentDayObj.day}, {formatDate(selectedDate)}
              </strong>{" "}
              akan dihapus permanen dari database.
            </p>
            <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
              <span className="font-semibold">Catatan Keamanan:</span> Status{" "}
              <strong>Cuti</strong>, <strong>Izin</strong>, dan <strong>Libur</strong>{" "}
              yang telah diatur sebelumnya <em>tidak akan dihapus</em> dan tetap tersimpan aman.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetDialogOpen(false)}
              disabled={isResetting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmResetDay}
              disabled={isResetting}
              className="gap-1.5"
            >
              {isResetting ? (
                <span>Menghapus...</span>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Reset Jadwal</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 4. FOOTER LEGEND */}
      {/* ============================================================ */}
      <div className="p-2 sm:p-2.5 border-t border-[var(--border)] bg-[var(--muted)] flex items-center justify-between flex-wrap gap-2 text-[10px] sm:text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mr-1">
            Status:
          </span>
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-semibold bg-emerald-100 border-emerald-300 text-emerald-900">
            Kerja
          </span>
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-semibold bg-purple-100 border-purple-300 text-purple-900">
            Cuti
          </span>
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-semibold bg-amber-100 border-amber-300 text-amber-900">
            Izin
          </span>
          <span className="px-1.5 sm:px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-semibold bg-stone-100 border-stone-300 text-stone-800">
            Libur
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-stone-600 text-[10px] sm:text-[11px] flex-wrap">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
            <span>Kurang Jam</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
            <span>Lembur</span>
          </span>
          <span className="flex items-center gap-1">
            <Moon className="h-3 w-3 text-indigo-600 shrink-0" />
            <span>Shift Malam</span>
          </span>
        </div>
      </div>
    </div>
  );
}

