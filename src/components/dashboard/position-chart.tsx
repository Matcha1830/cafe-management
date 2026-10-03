"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type PositionDistributionItem } from "@/lib/calculations/dashboard";
import { Briefcase } from "lucide-react";

// Cafe-friendly palette — assigned by index, cycles if there are more positions than colors
const POSITION_COLORS = [
  "#92400E", // coffee brown
  "#D97706", // amber
  "#2563EB", // blue
  "#059669", // emerald
  "#7C3AED", // purple
  "#0891B2", // teal
  "#E11D48", // rose
];

interface CustomLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function CustomLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: CustomLabelProps) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.08) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight="700"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

interface PositionChartProps {
  data: PositionDistributionItem[];
}

export function PositionChart({ data }: PositionChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-stone-800">
              Distribusi Jabatan
            </CardTitle>
            <CardDescription className="text-xs">
              Komposisi karyawan per jabatan
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {total} Karyawan
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {data.length === 0 || total === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center text-[var(--muted-foreground)]">
            <Briefcase className="h-8 w-8 mb-1.5 opacity-30" />
            <p className="text-xs font-medium">Belum ada data karyawan</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={72}
                innerRadius={38}
                dataKey="value"
                strokeWidth={2}
                stroke="white"
              >
                {data.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={POSITION_COLORS[index % POSITION_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${value ?? 0} orang (${total > 0 ? Math.round(((Number(value) || 0) / total) * 100) : 0}%)`,
                  String(name ?? ""),
                ]}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "var(--shadow-md)",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={7}
                formatter={(value, _entry, index) => (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#57534e",
                      fontWeight: 500,
                    }}
                  >
                    {value}
                  </span>
                )}
                // Legend dot color is driven by the Cell fill via Recharts internals
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
