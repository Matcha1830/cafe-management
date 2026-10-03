"use client";

import React, { useState, useEffect, useRef } from "react";
import { Coffee, Upload, Trash2, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCafe } from "@/lib/store/cafe-context";

export function CafeProfileForm() {
  const { cafeProfile, updateCafeProfile } = useCafe();

  const [namaKafe, setNamaKafe] = useState(cafeProfile?.namaKafe || "Kopi Nusantara");
  const [telepon, setTelepon] = useState(cafeProfile?.telepon || "(021) 7890-1234");
  const [alamat, setAlamat] = useState(
    cafeProfile?.alamat || "Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan"
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(cafeProfile?.logoPath || null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when cafeProfile changes from database
  useEffect(() => {
    if (cafeProfile) {
      setNamaKafe(cafeProfile.namaKafe || "Kopi Nusantara");
      setTelepon(cafeProfile.telepon || "");
      setAlamat(cafeProfile.alamat || "");
      if (!selectedFile) {
        setPreviewUrl(cafeProfile.logoPath || null);
        setRemoveLogo(false);
      }
    }
  }, [cafeProfile, selectedFile]);

  // Handle local file selection with preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFeedback({
        type: "error",
        message: "Format file tidak didukung. Gunakan file PNG, JPG, atau WebP.",
      });
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "Ukuran gambar terlalu besar. Maksimal ukuran gambar adalah 2 MB.",
      });
      return;
    }

    setFeedback(null);
    setSelectedFile(file);
    setRemoveLogo(false);

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveLogo = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveLogo(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChooseImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKafe.trim()) {
      setFeedback({
        type: "error",
        message: "Nama Kafe tidak boleh kosong.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("namaKafe", namaKafe.trim());
      formData.append("telepon", telepon.trim());
      formData.append("alamat", alamat.trim());

      if (removeLogo) {
        formData.append("removeLogo", "true");
      } else if (selectedFile) {
        formData.append("logo", selectedFile);
      }

      const res = await updateCafeProfile(formData);

      if (res.success) {
        setSelectedFile(null);
        setRemoveLogo(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setFeedback({
          type: "success",
          message: "Profil kafe dan branding berhasil disimpan.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan profil kafe.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menyimpan perubahan.",
      });
    } finally {
      setSaving(false);
    }
  };

  const currentDisplayLogo = !removeLogo && previewUrl ? previewUrl : null;

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Coffee className="h-5 w-5 text-brand-600" />
            <div>
              <CardTitle>Profil Kafe</CardTitle>
              <CardDescription>
                Informasi identitas kafe yang ditampilkan di sidebar, slip gaji, dan laporan
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

          {/* Logo Upload Section */}
          <div className="space-y-1.5 border-b border-[var(--border)] pb-4">
            <label className="text-xs font-semibold text-stone-800 block">
              Logo / Icon Kafe
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
              {/* Logo Preview Container */}
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl bg-coffee-700 shadow-sm flex items-center justify-center overflow-hidden border border-stone-200 shrink-0">
                  {currentDisplayLogo ? (
                    <img
                      src={currentDisplayLogo}
                      alt="Logo Kafe"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Coffee className="h-7 w-7 text-amber-100" />
                  )}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  <p className="font-medium text-stone-800">
                    {currentDisplayLogo ? "Logo Kustom Aktif / Pratinjau" : "Ikon Bawaan (Default)"}
                  </p>
                  <p className="text-[11px]">Tampil pada sudut kiri atas sidebar</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:ml-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  id="cafe-logo-file-input"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleChooseImageClick}
                  className="gap-1.5 text-xs h-9"
                  id="choose-logo-btn"
                >
                  <Upload className="h-3.5 w-3.5 text-stone-600" />
                  <span>Pilih Gambar</span>
                </Button>

                {currentDisplayLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                    title="Kembalikan ke ikon bawaan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Logo</span>
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] pt-0.5">
              Format yang didukung: PNG, JPG, WebP. Maksimal ukuran file 2 MB.
            </p>
          </div>

          {/* Text Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="cafe-name-input" className="text-xs font-medium text-stone-700 block">
                Nama Kafe <span className="text-red-500">*</span>
              </label>
              <Input
                id="cafe-name-input"
                value={namaKafe}
                onChange={(e) => setNamaKafe(e.target.value)}
                placeholder="Contoh: Kopi Nusantara / Vecta Coffee"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="cafe-phone-input" className="text-xs font-medium text-stone-700 block">
                Nomor Telepon
              </label>
              <Input
                id="cafe-phone-input"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="Contoh: (021) 7890-1234"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="cafe-address-input" className="text-xs font-medium text-stone-700 block">
                Alamat
              </label>
              <Input
                id="cafe-address-input"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Jl. Senopati No. 45, Jakarta Selatan"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="brand"
              size="sm"
              disabled={saving}
              className="gap-2 h-9"
              id="save-cafe-profile-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
