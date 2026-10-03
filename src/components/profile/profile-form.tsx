"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, Upload, Trash2, Save, Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useCafe } from "@/lib/store/cafe-context";
import { getInitials } from "@/lib/utils";

export function ProfileForm() {
  const { managerProfile, updateManagerProfile } = useCafe();

  const [nama, setNama] = useState(managerProfile?.nama || "Ahmad Ridwan");
  const [email, setEmail] = useState(managerProfile?.email || "manager@kopi-nusantara.com");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(managerProfile?.fotoProfilPath || null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when managerProfile changes from database
  useEffect(() => {
    if (managerProfile) {
      setNama(managerProfile.nama || "Ahmad Ridwan");
      setEmail(managerProfile.email || "");
      if (!selectedFile) {
        setPreviewUrl(managerProfile.fotoProfilPath || null);
        setRemovePhoto(false);
      }
    }
  }, [managerProfile, selectedFile]);

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
        message: "Ukuran foto terlalu besar. Maksimal ukuran foto adalah 2 MB.",
      });
      return;
    }

    setFeedback(null);
    setSelectedFile(file);
    setRemovePhoto(false);

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemovePhoto(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChoosePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setFeedback({
        type: "error",
        message: "Nama tidak boleh kosong.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("nama", nama.trim());
      formData.append("email", email.trim());

      if (removePhoto) {
        formData.append("removePhoto", "true");
      } else if (selectedFile) {
        formData.append("photo", selectedFile);
      }

      const res = await updateManagerProfile(formData);

      if (res.success) {
        setSelectedFile(null);
        setRemovePhoto(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setFeedback({
          type: "success",
          message: "Profil dan foto manajer berhasil disimpan.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan profil manajer.",
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

  const currentDisplayPhoto = !removePhoto && previewUrl ? previewUrl : null;

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <User className="h-5 w-5 text-brand-600" />
            <div>
              <CardTitle>Informasi Akun Manajer</CardTitle>
              <CardDescription>
                Informasi profil personal yang ditampilkan pada header sistem dan navigasi
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-0">
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

          {/* Photo Section */}
          <div className="space-y-2 border-b border-[var(--border)] pb-5">
            <label className="text-xs font-semibold text-stone-800 block">
              Foto Profil
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
              {/* Avatar Preview */}
              <div className="flex items-center gap-3.5">
                <Avatar className="h-16 w-16 border-2 border-stone-200 shadow-sm shrink-0">
                  {currentDisplayPhoto ? (
                    <AvatarImage
                      src={currentDisplayPhoto}
                      alt={nama}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="text-lg bg-coffee-700 text-amber-100 font-bold">
                    {getInitials(nama || "Ahmad Ridwan")}
                  </AvatarFallback>
                </Avatar>

                <div className="text-xs text-[var(--muted-foreground)]">
                  <p className="font-semibold text-stone-800 text-sm">
                    {nama || "Ahmad Ridwan"}
                  </p>
                  <p className="text-[11px]">
                    {currentDisplayPhoto ? "Foto Kustom Aktif / Pratinjau" : "Inisial Bawaan (Default)"}
                  </p>
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
                  id="profile-photo-file-input"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleChoosePhotoClick}
                  className="gap-1.5 text-xs h-9"
                  id="choose-profile-photo-btn"
                >
                  <Upload className="h-3.5 w-3.5 text-stone-600" />
                  <span>Pilih Foto</span>
                </Button>

                {currentDisplayPhoto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                    title="Kembalikan ke inisial nama"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Foto</span>
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] pt-0.5">
              Format yang didukung: PNG, JPG, WebP. Maksimal ukuran file 2 MB.
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="profile-name-input" className="text-xs font-medium text-stone-700 block">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <Input
                id="profile-name-input"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Ahmad Ridwan / Arvin Haravanda"
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="profile-email-input" className="text-xs font-medium text-stone-700 block">
                Email
              </label>
              <Input
                id="profile-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contoh: manager@kopi-nusantara.com"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-stone-700 block">
                Peran / Role
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--muted)] border border-[var(--border)]">
                <Shield className="h-4 w-4 text-brand-600" />
                <span className="text-xs font-semibold text-stone-800">Manajer Kafe (MANAGER)</span>
                <Badge variant="brand" className="text-[10px] ml-auto py-0 px-2 font-normal">
                  Akses Penuh
                </Badge>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] pt-0.5">
                Hak akses akun dikelola oleh sistem.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="brand"
              size="sm"
              disabled={saving}
              className="gap-2 h-9 px-4"
              id="save-profile-btn"
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
