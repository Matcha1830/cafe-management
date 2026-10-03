"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type EmployeePerformanceItem } from "@/lib/calculations/dashboard";
import { Award, Info, TrendingUp } from "lucide-react";

interface PerformanceCardProps {
  data: EmployeePerformanceItem[];
  periodLabel?: string;
}

export function PerformanceCard({
  data,
  periodLabel = "Bulan Ini",
}: PerformanceCardProps) {
  const [showFormula, setShowFormula] = useState(false);

  return (
    <Card className="h-full flex flex-col justify-between relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-base font-bold text-stone-800">
                Performa Karyawan
              </CardTitle>
              <button
                type="button"
                onClick={() => setShowFormula((prev) => !prev)}
                onMouseEnter={() => setShowFormula(true)}
                onMouseLeave={() => setShowFormula(false)}
                className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                title="Klik atau arahkan mouse untuk melihat formula skor performa"
                aria-label="Informasi Formula Performa"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
            <CardDescription className="text-xs">
              Top 5 Kinerja — {periodLabel}
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
            <Award className="h-3 w-3 text-amber-600" />
            Top 5
          </span>
        </div>
      </CardHeader>

      {/* Floating Formula Explanation Tooltip */}
      {showFormula && (
        <div className="absolute top-12 left-4 right-4 z-20 p-3 rounded-lg bg-stone-900 text-stone-100 shadow-xl border border-stone-800 text-xs animate-in fade-in zoom-in-95 duration-150">
          <p className="font-semibold text-amber-300 mb-1">
            Formula Perhitungan Transparan:
          </p>
          <ul className="space-y-1 list-disc list-inside text-[11px] text-stone-300">
            <li>40% Tingkat Kehadiran Shift Kerja</li>
            <li>40% Penyelesaian Checklist Job</li>
            <li>20% Disiplin Jam Masuk (Keterlambatan)</li>
          </ul>
          <p className="text-[10px] text-stone-400 mt-1 italic">
            *Cuti, Izin, & Libur tidak dihitung sebagai absensi.
          </p>
        </div>
      )}

      <CardContent className="pb-4 pt-1 flex-1">
        {data.length === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center text-center text-[var(--muted-foreground)]">
            <TrendingUp className="h-8 w-8 mb-1.5 opacity-30" />
            <p className="text-xs font-medium">Belum ada riwayat kinerja</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.map((item, index) => {
              const isFirst = index === 0;
              const barColor =
                item.score >= 85
                  ? "bg-emerald-500"
                  : item.score >= 70
                  ? "bg-amber-500"
                  : "bg-rose-500";

              const badgeColor =
                item.score >= 85
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : item.score >= 70
                  ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-rose-700 bg-rose-50 border-rose-200";

              return (
                <div key={item.employeeId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isFirst
                            ? "bg-amber-100 text-amber-800 font-extrabold ring-1 ring-amber-400"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <p className="font-semibold text-stone-800 truncate">
                        {item.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}
                      >
                        {item.score}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${item.score}%` }}
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
