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
import { Clock } from "lucide-react";

interface WorkOvertimeChartProps {
  data: WeeklyScheduleDayData[];
  dateRangeLabel?: string;
}

export function WorkOvertimeChart({
  data,
  dateRangeLabel = "Minggu Ini",
}: WorkOvertimeChartProps) {
  const hasData = data.some((d) => d.jamRegular > 0 || d.jamLembur > 0);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-stone-800">
              Jam Kerja vs Lembur
            </CardTitle>
            <CardDescription className="text-xs">
              Rasio jam reguler & lembur ({dateRangeLabel})
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7] inline-block" />
              <span className="text-[11px] text-stone-600 font-medium">Reguler</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ea580c] inline-block" />
              <span className="text-[11px] text-stone-600 font-medium">Lembur</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {!hasData ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center text-[var(--muted-foreground)]">
            <Clock className="h-8 w-8 mb-1.5 opacity-30" />
            <p className="text-xs font-medium">Belum ada data jam kerja</p>
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
                  if (name === "jamRegular") return [`${value ?? 0} jam`, "Jam Reguler"];
                  if (name === "jamLembur") return [`${value ?? 0} jam`, "Jam Lembur"];
                  return [value ?? 0, String(name ?? "")];
                }}
              />
              <Bar
                dataKey="jamRegular"
                stackId="a"
                fill="#0284c7"
                radius={[0, 0, 0, 0]}
                maxBarSize={28}
                name="jamRegular"
              />
              <Bar
                dataKey="jamLembur"
                stackId="a"
                fill="#ea580c"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                name="jamLembur"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
