"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Schedule, POSITION_LABELS, GENDER_LABELS } from "@/types";
import { formatDateISO, formatDate } from "@/lib/utils";
import { useCafe } from "@/lib/store/cafe-context";
import { Calendar } from "lucide-react";

const POSITION_BADGE_VARIANT_MAP: Record<string, string> = {
  KAPTEN: "brand",
  KARYAWAN: "info",
  BARISTA: "barista",
  KASIR: "kasir",
  KITCHEN: "kitchen",
  WAITER: "waiter",
  SUPERVISOR: "supervisor",
  CLEANING: "cleaning",
  MANAGER: "manager",
};

const STATUS_BADGE_VARIANT_MAP: Record<string, string> = {
  KERJA: "brand",
  BEKERJA: "success",
  TERJADWAL: "info",
  LIBUR: "secondary",
  CUTI: "warning",
  IZIN: "warning",
  TERLAMBAT: "danger",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  KERJA: "Kerja",
  CUTI: "Cuti",
  IZIN: "Izin",
  LIBUR: "Libur",
  BEKERJA: "Bekerja",
  TERJADWAL: "Terjadwal",
  TERLAMBAT: "Terlambat",
};

interface TodayScheduleProps {
  schedules: Schedule[];
  targetDate?: string;
}

export function TodaySchedule({ schedules, targetDate }: TodayScheduleProps) {
  const { employees, getPositionName } = useCafe();
  const today = targetDate || formatDateISO(new Date());
  const todaySchedules = schedules.filter((s) => s.date === today);

  const formattedDateTitle = formatDate(today);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-stone-800">
            Jadwal Hari Ini
          </CardTitle>
          <span className="text-xs text-[var(--muted-foreground)]">
            {formattedDateTitle}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {todaySchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-10 w-10 text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium text-stone-600">
              Tidak ada jadwal hari ini ({formattedDateTitle})
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Gender</th>
                  <th>Jabatan</th>
                  <th>Waktu Shift</th>
                  <th>Durasi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySchedules.map((schedule) => {
                  const posVariant =
                    POSITION_BADGE_VARIANT_MAP[schedule.employeePosition] ??
                    "secondary";
                  const statusVariant =
                    STATUS_BADGE_VARIANT_MAP[schedule.status] ?? "secondary";
                  const isWork = schedule.startTime && schedule.endTime;

                  const duration = isWork
                    ? (() => {
                      const [sh, sm] = (schedule.startTime || "00:00").split(":").map(Number);
                      const [eh, em] = (schedule.endTime || "00:00").split(":").map(Number);
                      let total = (eh * 60 + em) - (sh * 60 + sm) - (schedule.breakMinutes || 0);
                      if (total < 0) total += 24 * 60;
                      return `${(total / 60).toFixed(1)} jam`;
                    })()
                    : "—";

                  const emp = employees.find((e) => e.id === schedule.employeeId);
                  const genderKey = emp?.gender || emp?.jenisKelamin || "LAKI_LAKI";
                  const genderLabel = GENDER_LABELS[genderKey] || "Laki-laki";

                  return (
                    <tr key={schedule.id}>
                      <td className="font-medium text-stone-900">
                        {schedule.employeeName}
                      </td>
                      <td className="text-sm text-stone-600 whitespace-nowrap">
                        {genderLabel}
                      </td>
                      <td>
                        <Badge
                          variant={posVariant as Parameters<typeof Badge>[0]["variant"]}
                          className="text-xs"
                        >
                          {getPositionName(schedule.employeePosition)}
                        </Badge>
                      </td>
                      <td className="text-sm text-stone-700 whitespace-nowrap">
                        {isWork ? `${schedule.startTime} — ${schedule.endTime}` : "—"}
                      </td>
                      <td className="text-sm text-stone-600">
                        {duration}
                      </td>
                      <td>
                        <Badge
                          variant={statusVariant as Parameters<typeof Badge>[0]["variant"]}
                          className="text-xs"
                        >
                          {STATUS_LABEL_MAP[schedule.status] || schedule.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
