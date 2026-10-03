"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Sparkles,
  CalendarOff,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POSITION_LABELS, type PositionType } from "@/types";
import { cn, formatDateShort, getDayName, getWeekDates, formatDateISO } from "@/lib/utils";
import { ScheduleBlock, getScheduleDurationHours } from "./schedule-block";
import { InteractiveTimeline } from "./interactive-timeline";
import { LeaveForm } from "./leave-form";
import { useCafe } from "@/lib/store/cafe-context";

// ============================================================
// WEEK HELPERS
// ============================================================

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

function buildWeekDays(weekOffset: number): { date: string; day: string }[] {
  const today = new Date();
  const ref = new Date(today);
  ref.setDate(today.getDate() + weekOffset * 7);
  const days = getWeekDates(ref);
  return days.map((d, i) => ({
    date: formatDateISO(d),
    day: DAY_NAMES[i],
  }));
}

function formatWeekLabel(days: { date: string }[]): string {
  if (days.length === 0) return "";
  const first = new Date(days[0].date + "T00:00:00");
  const last = new Date(days[6].date + "T00:00:00");

  const firstDay = first.getDate();
  const lastDay = last.getDate();
  const lastYear = last.getFullYear();

  const firstMonth = first.toLocaleDateString("id-ID", { month: "long" });
  const lastMonth = last.toLocaleDateString("id-ID", { month: "long" });

  if (firstMonth === lastMonth) {
    return `${firstDay} – ${lastDay} ${lastMonth} ${lastYear}`;
  }
  return `${firstDay} ${firstMonth} – ${lastDay} ${lastMonth} ${lastYear}`;
}

// ============================================================
// SHEETS INTEGRATION TYPES
// ============================================================

interface SheetsStatus {
  connected: boolean;
  spreadsheetId?: string | null;
  googleAccountEmail?: string;
  spreadsheetUrl?: string | null;
}

type SyncState =
  | "idle"
  | "checking"
  | "syncing"
  | "success"
  | "error"
  | "redirecting";

interface ToastMessage {
  type: "success" | "error" | "info";
  text: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function ScheduleCalendar() {
  const { schedules, positions, getPositionName } = useCafe();
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [activeDateForTimeline, setActiveDateForTimeline] = useState<string | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const [weekOffset, setWeekOffset] = useState<number>(0);

  // ---- Google Sheets state ----
  const [sheetsStatus, setSheetsStatus] = useState<SheetsStatus | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const daysOfWeek = useMemo(() => buildWeekDays(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => formatWeekLabel(daysOfWeek), [daysOfWeek]);
  const todayISO = useMemo(() => formatDateISO(new Date()), []);
  const weekMonday = daysOfWeek[0]?.date ?? todayISO;

  const filteredSchedules = schedules.filter((s) => {
    if (selectedPosition === "all") return true;
    return (
      s.employeePosition === selectedPosition ||
      getPositionName(s.employeePosition).toLowerCase() === selectedPosition.toLowerCase()
    );
  });

  const handleOpenTimeline = (date?: string) => {
    setActiveDateForTimeline(date ?? weekMonday);
  };

  const handlePrevWeek = () => setWeekOffset((prev) => prev - 1);
  const handleNextWeek = () => setWeekOffset((prev) => prev + 1);

  // ---- Show toast for a few seconds ----
  const showToast = useCallback((msg: ToastMessage) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ---- Fetch integration status on mount + when returning from OAuth ----
  const fetchSheetsStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google/sheets/status");
      if (res.ok) {
        const data = await res.json();
        setSheetsStatus(data);
      }
    } catch {
      // Non-fatal — status will remain null (treated as not connected)
    }
  }, []);

  useEffect(() => {
    fetchSheetsStatus();
  }, [fetchSheetsStatus]);

  // ---- Handle URL params from OAuth callback ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    if (params.get("sheets_connected") === "1") {
      fetchSheetsStatus();
      showToast({
        type: "success",
        text: "Google Sheets berhasil terhubung! Sekarang Anda bisa menyinkronkan jadwal.",
      });
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("sheets_connected");
      window.history.replaceState({}, "", url.toString());
    }

    const sheetsError = params.get("sheets_error");
    if (sheetsError) {
      const errorMessages: Record<string, string> = {
        access_denied: "Akses Google Sheets ditolak. Silakan coba lagi.",
        invalid_callback: "Callback tidak valid. Silakan coba lagi.",
        unauthorized: "Tidak diizinkan. Silakan login ulang.",
        token_exchange_failed: "Gagal menukar kode otorisasi. Silakan coba lagi.",
        no_access_token: "Tidak menerima token akses dari Google. Silakan coba lagi.",
      };
      showToast({
        type: "error",
        text: errorMessages[sheetsError] ?? "Terjadi kesalahan saat menghubungkan Google Sheets.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("sheets_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchSheetsStatus, showToast]);

  // ---- Handle Sinkron Sheets click ----
  const handleSinkronSheets = async () => {
    setSyncState("checking");

    // Re-fetch status in case it changed
    let status = sheetsStatus;
    try {
      const res = await fetch("/api/google/sheets/status");
      if (res.ok) {
        status = await res.json();
        setSheetsStatus(status);
      }
    } catch {
      // Use cached status
    }

    if (!status?.connected) {
      // Redirect to Google OAuth consent
      setSyncState("redirecting");
      showToast({
        type: "info",
        text: "Mengarahkan ke halaman otorisasi Google...",
      });
      setTimeout(() => {
        window.location.href = "/api/google/authorize";
      }, 500);
      return;
    }

    // Connected — perform sync
    setSyncState("syncing");

    try {
      const res = await fetch("/api/google/sheets/sync-jadwal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: weekMonday }),
      });

      const data = await res.json();

      if (data.success) {
        setSyncState("success");
        setSheetsStatus((prev) => ({
          ...prev,
          connected: true,
          spreadsheetId: data.spreadsheetId,
          spreadsheetUrl: data.spreadsheetUrl,
        }));
        showToast({
          type: "success",
          text: data.message ?? "Jadwal berhasil disinkronkan ke Google Sheets!",
        });
        // Reset to idle after a brief success state
        setTimeout(() => setSyncState("idle"), 3000);
      } else if (data.error === "SHEETS_NOT_CONNECTED") {
        setSyncState("redirecting");
        showToast({
          type: "info",
          text: "Mengarahkan ke halaman otorisasi Google...",
        });
        setTimeout(() => {
          window.location.href = "/api/google/authorize";
        }, 800);
      } else {
        setSyncState("error");
        showToast({
          type: "error",
          text: data.error ?? "Gagal menyinkronkan jadwal.",
        });
        setTimeout(() => setSyncState("idle"), 3000);
      }
    } catch {
      setSyncState("error");
      showToast({
        type: "error",
        text: "Gagal menghubungi server. Periksa koneksi internet Anda.",
      });
      setTimeout(() => setSyncState("idle"), 3000);
    }
  };

  // ---- Button label & icon ----
  const getSyncButtonContent = () => {
    switch (syncState) {
      case "checking":
      case "syncing":
        return (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span className="hidden sm:inline">
              {syncState === "syncing" ? "Menyinkronkan..." : "Memeriksa..."}
            </span>
            <span className="sm:hidden">Proses...</span>
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
            <span className="hidden sm:inline">Tersinkron!</span>
            <span className="sm:hidden">Sync!</span>
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="hidden sm:inline">Gagal Sinkron</span>
            <span className="sm:hidden">Gagal</span>
          </>
        );
      case "redirecting":
        return (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span className="hidden sm:inline">Mengarahkan...</span>
            <span className="sm:hidden">Proses...</span>
          </>
        );
      default:
        return (
          <>
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span className="sm:hidden truncate">Sinkron</span>
            <span className="hidden sm:inline">
              {sheetsStatus?.connected ? "Sinkron Sheets" : "Hubungkan Sheets"}
            </span>
          </>
        );
    }
  };

  const isSyncing =
    syncState === "syncing" ||
    syncState === "checking" ||
    syncState === "redirecting";

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-sm border transition-all",
            toast.type === "success" &&
              "bg-green-50 border-green-200 text-green-800",
            toast.type === "error" &&
              "bg-red-50 border-red-200 text-red-800",
            toast.type === "info" &&
              "bg-blue-50 border-blue-200 text-blue-800"
          )}
        >
          {toast.type === "success" && (
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
          )}
          {toast.type === "error" && (
            <AlertCircle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
          )}
          {toast.type === "info" && (
            <Loader2 className="h-4 w-4 mt-0.5 text-blue-500 shrink-0 animate-spin" />
          )}
          <span className="flex-1">{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-[var(--border)] bg-white p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 text-stone-600"
              onClick={handlePrevWeek}
              title="Minggu Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs font-bold text-stone-800">
              {weekLabel}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 text-stone-600"
              onClick={handleNextWeek}
              title="Minggu Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {weekOffset === 0 && (
            <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
              Minggu Ini
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          <Select value={selectedPosition} onValueChange={setSelectedPosition}>
            <SelectTrigger className="w-full sm:w-40 h-9 bg-white text-xs sm:text-sm" id="schedule-pos-filter">
              <SelectValue placeholder="Jabatan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jabatan</SelectItem>
              {positions.length > 0
                ? positions.map((p) => (
                    <SelectItem key={p.id} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))
                : (Object.keys(POSITION_LABELS) as PositionType[]).map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {POSITION_LABELS[pos]}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>

          {/* Sinkron Sheets Button */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className={cn(
                "h-9 gap-1.5 shadow-sm bg-white border-stone-300 w-full sm:w-auto px-2 sm:px-3 text-xs sm:text-sm transition-colors",
                syncState === "success"
                  ? "text-green-700 border-green-300 hover:bg-green-50"
                  : syncState === "error"
                  ? "text-red-600 border-red-300 hover:bg-red-50"
                  : "text-stone-700 hover:bg-stone-50"
              )}
              onClick={handleSinkronSheets}
              disabled={isSyncing}
              id="sinkron-sheets-btn"
              title={
                sheetsStatus?.connected
                  ? `Sinkronkan jadwal minggu ini ke Google Sheets${sheetsStatus.googleAccountEmail ? ` (${sheetsStatus.googleAccountEmail})` : ""}`
                  : "Hubungkan akun Google untuk mengaktifkan sinkronisasi Sheets"
              }
            >
              {getSyncButtonContent()}
            </Button>

            {/* Open Sheets icon button — only shown when spreadsheet exists */}
            {sheetsStatus?.spreadsheetUrl && (
              <a
                href={sheetsStatus.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka Google Sheets"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white shadow-sm text-stone-500 hover:text-green-700 hover:border-green-300 hover:bg-green-50 transition-colors shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <Button
            variant="outline"
            className="h-9 gap-1.5 shadow-sm bg-white hover:bg-stone-50 text-stone-700 border-stone-300 w-full sm:w-auto px-2 sm:px-3 text-xs sm:text-sm"
            onClick={() => setIsLeaveModalOpen(true)}
            id="leave-schedule-btn"
          >
            <CalendarOff className="h-4 w-4 text-purple-600 shrink-0" />
            <span>Libur / Izin</span>
          </Button>

          <Button
            variant="brand"
            className="h-9 gap-1.5 shadow-sm w-full sm:w-auto px-2 sm:px-3 text-xs sm:text-sm"
            onClick={() => handleOpenTimeline()}
            id="add-schedule-btn"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="sm:hidden truncate">Atur Jadwal</span>
            <span className="hidden sm:inline">Atur / Tambah Jadwal</span>
          </Button>
        </div>
      </div>

      {/* Info helper banner */}
      <div className="bg-brand-50/70 border border-brand-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-brand-900">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600 shrink-0" />
          <span>
            Klik <strong>Atur / Tambah Jadwal</strong> atau klik pada hari tertentu di bawah untuk membuka <strong>Interactive Schedule Timeline</strong>.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenTimeline()}
          className="h-7 text-xs bg-white text-brand-700 hover:bg-brand-50 border-brand-300 font-semibold"
        >
          Buka Timeline
        </Button>
      </div>

      {/* Weekly Grid View — Unified Schedule Grid */}
      <div className="rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          {daysOfWeek.map((dayObj) => {
            const daySchedules = filteredSchedules.filter((s) => s.date === dayObj.date);
            const isToday = dayObj.date === todayISO;

            const totalHours = daySchedules.reduce(
              (sum, s) => sum + getScheduleDurationHours(s.startTime, s.endTime, s.breakMinutes || 0),
              0
            );

            return (
              <div
                key={dayObj.date}
                className={cn(
                  "bg-white flex flex-col min-h-[340px] transition-colors",
                  isToday && "bg-brand-50/20"
                )}
              >
              {/* Day Header */}
              <div
                onClick={() => handleOpenTimeline(dayObj.date)}
                className={`p-3 border-b flex items-center justify-between cursor-pointer group ${
                  isToday
                    ? "bg-gradient-to-r from-brand-50 to-brand-100/50 border-brand-200"
                    : "bg-[var(--muted)] border-[var(--border)] hover:bg-stone-100"
                }`}
                title="Buka Interactive Timeline untuk hari ini"
              >
                <div>
                  <p className={`text-xs font-bold ${isToday ? "text-brand-800" : "text-stone-800"}`}>
                    {dayObj.day}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {formatDateShort(dayObj.date)}
                  </p>
                </div>
                <div className="h-7 w-7 rounded-lg bg-white/80 border border-stone-200 flex items-center justify-center text-stone-500 group-hover:text-brand-600 group-hover:border-brand-300 shadow-2xs transition-colors">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Day Schedule List */}
              <div className="p-2.5 flex-1 space-y-2 overflow-y-auto max-h-[380px]">
                {daySchedules.length === 0 ? (
                  <div
                    onClick={() => handleOpenTimeline(dayObj.date)}
                    className="flex flex-col items-center justify-center h-44 text-center text-[var(--muted-foreground)] cursor-pointer hover:bg-stone-50/80 rounded-xl p-2 transition-colors border border-dashed border-stone-200"
                  >
                    <p className="text-xs font-medium">Tidak ada shift</p>
                    <span className="mt-2 text-[11px] text-brand-600 font-bold bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                      + Atur Timeline
                    </span>
                  </div>
                ) : (
                  daySchedules.map((schedule) => (
                    <ScheduleBlock
                      key={schedule.id}
                      schedule={schedule}
                      onClick={() => handleOpenTimeline(dayObj.date)}
                    />
                  ))
                )}
              </div>

              {/* Day Footer */}
              <div
                onClick={() => handleOpenTimeline(dayObj.date)}
                className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)] flex items-center justify-between cursor-pointer hover:bg-stone-100/70 transition-colors"
                title="Buka Timeline"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-stone-700">
                    {daySchedules.length} Shift
                  </span>
                  <span className="text-[10px] text-stone-400">•</span>
                  <span className="text-[10px] text-[var(--muted-foreground)] font-medium">
                    {totalHours.toFixed(0)} jam
                  </span>
                </div>
                <div className="p-1 text-stone-400 hover:text-brand-600 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </div>
              </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Interactive Daily Schedule Timeline Modal */}
      {/* ============================================================ */}
      <Dialog
        open={Boolean(activeDateForTimeline)}
        onOpenChange={(open) => !open && setActiveDateForTimeline(null)}
      >
        <DialogContent className="w-[98vw] max-w-[98vw] sm:max-w-[96vw] lg:max-w-7xl max-h-[96vh] p-1 sm:p-4 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>
              Jadwal — {activeDateForTimeline ? getDayName(activeDateForTimeline) : ""}
            </DialogTitle>
          </DialogHeader>

          {activeDateForTimeline && (
            <InteractiveTimeline
              initialDate={activeDateForTimeline}
              weekDays={daysOfWeek}
              onClose={() => setActiveDateForTimeline(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dedicated Libur / Izin Modal */}
      {isLeaveModalOpen && (
        <LeaveForm
          open={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          mode="add"
          defaultDate={todayISO}
        />
      )}
    </div>
  );
}
