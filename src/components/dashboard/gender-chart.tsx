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
import { type GenderDistributionItem } from "@/lib/calculations/dashboard";
import { Users2 } from "lucide-react";

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
  if (!percent || percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight="700"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

interface GenderChartProps {
  data: GenderDistributionItem[];
}

export function GenderChart({ data }: GenderChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-stone-800">
              Distribusi Gender
            </CardTitle>
            <CardDescription className="text-xs">
              Rasio gender karyawan aktif
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {total} Karyawan
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {total === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center text-[var(--muted-foreground)]">
            <Users2 className="h-8 w-8 mb-1.5 opacity-30" />
            <p className="text-xs font-medium">Belum ada data gender</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                dataKey="value"
                strokeWidth={2}
                stroke="white"
                labelLine={false}
                label={CustomLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
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
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: "11px", color: "#57534e", fontWeight: 500 }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
