"use client";

import React, { useState, useEffect } from "react";
import { Shield, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCafe } from "@/lib/store/cafe-context";
import { formatRupiah } from "@/lib/utils";

export function WorkHoursSettingsForm() {
  const { cafeProfile, updateWorkHoursSettings } = useCafe();

  const [standarJamKerja, setStandarJamKerja] = useState<number>(
    cafeProfile?.standarJamKerja ?? 8
  );
  const [multiplierLembur, setMultiplierLembur] = useState<number>(
    cafeProfile?.multiplierLembur ?? 1.5
  );
  const [dendaPekerjaanPerJob, setDendaPekerjaanPerJob] = useState<number>(
    cafeProfile?.dendaPekerjaanPerJob ?? 5000
  );

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sync state when cafeProfile loads or changes
  useEffect(() => {
    if (cafeProfile) {
      setStandarJamKerja(cafeProfile.standarJamKerja ?? 8);
      setMultiplierLembur(cafeProfile.multiplierLembur ?? 1.5);
      setDendaPekerjaanPerJob(cafeProfile.dendaPekerjaanPerJob ?? 5000);
    }
  }, [cafeProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await updateWorkHoursSettings({
        standarJamKerja: Number(standarJamKerja),
        multiplierLembur: Number(multiplierLembur),
        dendaPekerjaanPerJob: Math.max(0, Math.round(Number(dendaPekerjaanPerJob) || 0)),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: "Aturan jam kerja & denda list job berhasil disimpan.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan pengaturan.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menyimpan pengaturan.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Aturan Jam Kerja & Lembur</CardTitle>
              <CardDescription>
                Parameter perhitungan jam kerja, upah lembur, dan denda pekerjaan
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {feedback && (
            <div
              className={`flex items-center gap-2.5 p-3 rounded-lg text-xs font-medium border ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Standar Jam Kerja / Hari */}
            <div className="space-y-1">
              <label
                htmlFor="standar-jam-kerja-input"
                className="text-xs font-medium text-stone-700 block"
              >
                Standar Jam Kerja / Hari
              </label>
              <Input
                id="standar-jam-kerja-input"
                type="number"
                min="1"
                max="24"
                value={standarJamKerja}
                onChange={(e) => setStandarJamKerja(Number(e.target.value))}
                required
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Durasi shift normal sebelum dihitung lembur (default 8 jam).
              </p>
            </div>

            {/* Multiplier Upah Lembur */}
            <div className="space-y-1">
              <label
                htmlFor="multiplier-lembur-input"
                className="text-xs font-medium text-stone-700 block"
              >
                Multiplier Upah Lembur
              </label>
              <Input
                id="multiplier-lembur-input"
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={multiplierLembur}
                onChange={(e) => setMultiplierLembur(Number(e.target.value))}
                required
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Pengali tarif per jam untuk jam lembur (default 1.5x).
              </p>
            </div>

            {/* Denda List Job — Directly below Standar Jam Kerja */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="denda-job-input"
                  className="text-xs font-medium text-stone-700 block"
                >
                  Denda List Job
                </label>
                <span className="text-xs font-semibold text-stone-800">
                  {formatRupiah(dendaPekerjaanPerJob || 0)} / pekerjaan
                </span>
              </div>
              <Input
                id="denda-job-input"
                type="number"
                min="0"
                step="100"
                value={dendaPekerjaanPerJob}
                onChange={(e) =>
                  setDendaPekerjaanPerJob(Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                placeholder="Contoh: 5000"
                required
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Nominal denda untuk setiap pekerjaan yang tidak selesai.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="brand"
              size="sm"
              disabled={saving}
              className="gap-2 h-9"
              id="save-work-hours-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
