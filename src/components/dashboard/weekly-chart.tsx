"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type WeeklyScheduleDayData } from "@/lib/calculations/dashboard";
import { Calendar } from "lucide-react";

interface WeeklyChartProps {
  data: WeeklyScheduleDayData[];
  dateRangeLabel?: string;
}

export function WeeklyChart({ data, dateRangeLabel = "Minggu Ini" }: WeeklyChartProps) {
  const hasData = data.some((d) => d.karyawan > 0 || d.jamKerja > 0);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-stone-800">
              Jadwal Mingguan
            </CardTitle>
            <CardDescription className="text-xs">
              {dateRangeLabel}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8b5433] inline-block" />
              <span className="text-[11px] text-stone-600 font-medium">Karyawan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e4b67a] inline-block" />
              <span className="text-[11px] text-stone-600 font-medium">Jam Kerja</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {!hasData ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center text-[var(--muted-foreground)]">
            <Calendar className="h-8 w-8 mb-1.5 opacity-30" />
            <p className="text-xs font-medium">Belum ada jadwal kerja minggu ini</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
              <XAxis
                dataKey="hari"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#78716c", fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#78716c" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "var(--shadow-md)",
                }}
                formatter={(value, name) => {
                  if (name === "karyawan") return [`${value ?? 0} orang`, "Karyawan Masuk"];
                  if (name === "jamKerja") return [`${value ?? 0} jam`, "Total Jam Kerja"];
                  return [value ?? 0, String(name ?? "")];
                }}
              />
              <Bar
                dataKey="karyawan"
                fill="#8b5433"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                name="karyawan"
              />
              <Bar
                dataKey="jamKerja"
                fill="#e4b67a"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                name="jamKerja"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
