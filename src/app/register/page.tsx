"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Coffee, Eye, EyeOff, User, Mail, Lock, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerAction } from "@/lib/actions/auth";

// Clean Google SVG Icon
function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Nama lengkap wajib diisi.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Email wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sesuai.");
      return;
    }

    setLoading(true);

    try {
      const res = await registerAction({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Gagal melakukan registrasi.");
        setLoading(false);
        return;
      }

      // Auto login after successful registration
      const loginRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("Terjadi kesalahan server saat mendaftar. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    try {
      setLoading(true);
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setErrorMessage("Gagal menghubungkan dengan akun Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Blurred background image layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 blur-[6px] pointer-events-none"
        style={{ backgroundImage: 'url("/images/auth/bg.webp")' }}
      />
      {/* Subtle translucent overlay for contrast & readability */}
      <div className="absolute inset-0 bg-stone-900/20 pointer-events-none" />

      {/* Container Card */}
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] relative z-10">
        {/* Left Column: Branding / Illustration (Desktop only) */}
        <div
          className="hidden lg:flex lg:col-span-5 p-8 flex-col justify-between text-white relative overflow-hidden bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/images/auth/bg-coklat.webp")' }}
        >
          {/* Subtle dark brown overlay between image and text to ensure high contrast & readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-coffee-950/80 via-coffee-900/70 to-coffee-950/85 pointer-events-none" />

          {/* Subtle background glow decoration */}
          <div className="absolute -top-16 -left-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100/10 border border-amber-200/20 backdrop-blur-sm text-amber-200 shadow-inner">
              <Coffee className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-100 tracking-wide">Caffe Manager</p>
            </div>
          </div>

          {/* Center Content / Value Proposition */}
          <div className="relative z-10 my-auto space-y-4 py-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/20 text-amber-200 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Gabung Manajemen Kafe</span>
            </div>
            <h1 className="text-2xl font-bold leading-snug text-white">
              Mulai Kelola Tim & Operasional Kafe Anda
            </h1>
            <p className="text-xs text-amber-100/80 leading-relaxed">
              Daftarkan akun manajer untuk mengatur jadwal barista, kasir, kehadiran, serta perhitungan gaji otomatis.
            </p>
          </div>

          {/* Bottom Footer Quote */}
          <div className="relative z-10 pt-4 border-t border-white/10">
            <p className="text-[11px] text-amber-200/60 leading-tight">
              &copy; {new Date().getFullYear()} Cafe Manager. Hak cipta dilindungi.
            </p>
          </div>
        </div>

        {/* Right Column: Register Form */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto space-y-5">
            {/* Mobile Header Branding */}
            <div className="flex lg:hidden items-center gap-2.5 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-700 text-amber-100 shadow-sm">
                <Coffee className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-800">Caffe Manager</p>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Buat Akun Baru</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Lengkapi formulir di bawah untuk mendaftarkan akun
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-center gap-2.5 p-3 rounded-lg text-xs font-medium bg-red-50 text-red-800 border border-red-200 animate-fade-in"
              >
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Nama Lengkap */}
              <div className="space-y-1">
                <label
                  htmlFor="register-name-input"
                  className="text-xs font-semibold text-stone-700 block"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="register-name-input"
                    type="text"
                    placeholder="Contoh: Arvin Haravanda"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-9 h-10 text-sm bg-stone-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="register-email-input"
                  className="text-xs font-semibold text-stone-700 block"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="register-email-input"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-9 h-10 text-sm bg-stone-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label
                  htmlFor="register-password-input"
                  className="text-xs font-semibold text-stone-700 block"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="register-password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-9 pr-10 h-10 text-sm bg-stone-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded cursor-pointer"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div className="space-y-1">
                <label
                  htmlFor="register-confirm-password-input"
                  className="text-xs font-semibold text-stone-700 block"
                >
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                  <Input
                    id="register-confirm-password-input"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password Anda"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-9 pr-10 h-10 text-sm bg-stone-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 rounded cursor-pointer"
                    aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <Button
                type="submit"
                variant="brand"
                disabled={loading}
                className="w-full h-10 text-sm font-semibold shadow-sm transition-all mt-3"
                id="register-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  <span>Daftar</span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-stone-400 text-[11px] font-medium tracking-wider">
                  atau
                </span>
              </div>
            </div>

            {/* Google Placeholder Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleClick}
              className="w-full h-10 text-xs font-medium border-stone-200 hover:bg-stone-50 text-stone-700 gap-2.5 shadow-none"
              id="google-register-button"
            >
              <GoogleIcon className="h-4 w-4 shrink-0" />
              <span>Daftar dengan Google</span>
            </Button>

            {/* Bottom Link to Login */}
            <div className="text-center pt-1">
              <p className="text-xs text-stone-600">
                Sudah memiliki akun?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center"
                >
                  Masuk
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
