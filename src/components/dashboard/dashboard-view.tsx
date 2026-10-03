"use client";

import React, { useMemo } from "react";
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Coffee,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PositionChart } from "@/components/dashboard/position-chart";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { GenderChart } from "@/components/dashboard/gender-chart";
import { PerformanceCard } from "@/components/dashboard/performance-card";
import { AttendanceMonitoringChart } from "@/components/dashboard/attendance-monitoring-chart";
import { WorkOvertimeChart } from "@/components/dashboard/work-overtime-chart";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { useCafe } from "@/lib/store/cafe-context";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  calculateDashboardSummaryStats,
  calculatePositionDistribution,
  calculateWeeklyWorkforceData,
  calculateGenderDistribution,
  calculateEmployeePerformance,
  calculateAttendanceMonitoring,
  getTodayISO,
  getCurrentMonthPeriod,
  getWeekDates,
} from "@/lib/calculations/dashboard";

export function DashboardView() {
  const {
    employees,
    positions,
    schedules,
    attendances,
    payrolls,
    jobCompletions,
    loading,
    refreshData,
  } = useCafe();

  const todayISO = useMemo(() => getTodayISO(), []);
  const currentPeriod = useMemo(() => getCurrentMonthPeriod(), []);
  const weekInfo = useMemo(() => getWeekDates(), []);

  // Compute live real-data statistics
  const summaryStats = useMemo(() => {
    return calculateDashboardSummaryStats({
      employees,
      schedules,
      attendances,
      payrolls,
      targetDate: todayISO,
      period: currentPeriod,
    });
  }, [employees, schedules, attendances, payrolls, todayISO, currentPeriod]);

  // Compute position distribution
  const positionData = useMemo(() => {
    return calculatePositionDistribution(employees, positions);
  }, [employees, positions]);

  // Compute weekly workforce & overtime data
  const weeklyData = useMemo(() => {
    return calculateWeeklyWorkforceData(schedules, employees);
  }, [schedules, employees]);

  // Compute gender distribution
  const genderData = useMemo(() => {
    return calculateGenderDistribution(employees);
  }, [employees]);

  // Compute employee performance (Top 5)
  const performanceData = useMemo(() => {
    return calculateEmployeePerformance({
      employees,
      schedules,
      attendances,
      jobCompletions,
      period: currentPeriod,
    });
  }, [employees, schedules, attendances, jobCompletions, currentPeriod]);

  // Compute attendance status breakdown
  const attendanceMonitoringData = useMemo(() => {
    return calculateAttendanceMonitoring({
      schedules,
      attendances,
      period: currentPeriod,
    });
  }, [schedules, attendances, currentPeriod]);

  const dateHeading = useMemo(() => {
    const today = new Date();
    const formatted = formatDate(todayISO);
    return `${formatted}`;
  }, [todayISO]);

  const weekRangeLabel = useMemo(() => {
    return `Minggu Ini — ${formatDate(weekInfo.startDate)} s/d ${formatDate(weekInfo.endDate)}`;
  }, [weekInfo]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {dateHeading} — Ringkasan operasional dan kinerja kafe
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-coffee-700 bg-coffee-50 px-2.5 py-1 rounded-full border border-coffee-200 shrink-0">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Menyinkronkan data...</span>
          </div>
        )}
      </div>

      {/* Top Summary Stats Grid (6 Cards) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Karyawan"
          value={summaryStats.totalEmployees}
          subtitle={`${summaryStats.activeEmployees} aktif${summaryStats.onLeaveEmployees > 0
              ? `, ${summaryStats.onLeaveEmployees} cuti`
              : summaryStats.inactiveEmployees > 0
                ? `, ${summaryStats.inactiveEmployees} nonaktif`
                : ""
            }`}
          trend="neutral"
          trendValue="Database Real"
          icon={Users}
          iconClassName="bg-stone-100 text-stone-700"
        />

        <StatCard
          title="Aktif Hari Ini"
          value={summaryStats.activeToday}
          subtitle={`dari ${summaryStats.totalEmployees} karyawan`}
          trend={summaryStats.activeToday > 0 ? "up" : "neutral"}
          trendValue={`${summaryStats.activeToday} terjadwal`}
          icon={UserCheck}
          iconClassName="bg-emerald-100 text-emerald-800"
        />

        <StatCard
          title="Sedang Bekerja"
          value={summaryStats.currentlyWorking}
          subtitle="Berdasarkan jadwal saat ini"
          trend="neutral"
          trendValue="Jadwal Aktif"
          icon={Coffee}
          iconClassName="bg-coffee-100 text-coffee-800"
        />

        <StatCard
          title="Jam Kerja"
          value={`${summaryStats.totalWorkHoursThisWeek}`}
          subtitle="jam minggu ini"
          trend="up"
          trendValue="Senin - Minggu"
          icon={Clock}
          iconClassName="bg-sky-100 text-sky-800"
        />

        <StatCard
          title="Lembur"
          value={`${summaryStats.overtimeHoursThisMonth} jam`}
          subtitle="total bulan ini"
          trend={summaryStats.overtimeHoursThisMonth > 0 ? "down" : "neutral"}
          trendValue={`${summaryStats.overtimeHoursThisMonth}j terdata`}
          icon={AlertCircle}
          iconClassName="bg-amber-100 text-amber-800"
        />

        <StatCard
          title="Estimasi Gaji"
          value={formatRupiah(summaryStats.estimatedPayroll)}
          subtitle={`Periode ${currentPeriod}`}
          trend="up"
          trendValue="Penggajian Real"
          icon={TrendingUp}
          iconClassName="bg-brand-100 text-brand-800"
        />
      </div>

      {/* Middle Charts Row — Resized Existing Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PositionChart data={positionData} />
        <WeeklyChart data={weeklyData} dateRangeLabel={weekRangeLabel} />
      </div>

      {/* Bottom Monitoring Charts Row (Gender, Performance, Attendance, Work vs Overtime) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GenderChart data={genderData} />
        <PerformanceCard data={performanceData} periodLabel={currentPeriod} />
        <AttendanceMonitoringChart
          data={attendanceMonitoringData}
          periodLabel={currentPeriod}
        />
        <WorkOvertimeChart data={weeklyData} dateRangeLabel="Minggu Ini" />
      </div>

      {/* Today's Schedule Table */}
      <TodaySchedule schedules={schedules} targetDate={todayISO} />
    </div>
  );
}
