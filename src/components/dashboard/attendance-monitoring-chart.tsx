"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type AttendanceMonitoringItem } from "@/lib/calculations/dashboard";
import { UserCheck } from "lucide-react";

interface AttendanceMonitoringChartProps {
  data: AttendanceMonitoringItem[];
  periodLabel?: string;
}

export function AttendanceMonitoringChart({
  data,
  periodLabel = "Bulan Ini",
}: AttendanceMonitoringChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-stone-800">
              Monitoring Kehadiran
            </CardTitle>
            <CardDescription className="text-xs">
              Status presensi & cuti — {periodLabel}
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {total} Entri
          </span>
        </div>
      </CardHeader>

      <CardContent className="pb-4 pt-1 flex-1">
        {total === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center text-[var(--muted-foreground)]">
            <UserCheck className="h-8 w-8 mb-1.5 opacity-30" />
            <p className="text-xs font-medium">Belum ada data presensi bulan ini</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;

              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-stone-700">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-600">
                      <span className="font-bold text-stone-800">
                        {item.count}
                      </span>
                      <span className="text-[10px] text-stone-400 w-7 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
