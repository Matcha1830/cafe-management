import type { Metadata } from "next";
import { CafeProfileForm } from "@/components/settings/cafe-profile-form";
import { WorkHoursSettingsForm } from "@/components/settings/work-hours-settings-form";

export const metadata: Metadata = {
  title: "Pengaturan",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Pengaturan Sistem</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Konfigurasi informasi kafe, branding, dan aturan jam kerja &amp; denda
        </p>
      </div>

      <div className="space-y-4">
        {/* Info Kafe (Branding & Logo) */}
        <CafeProfileForm />

        {/* Aturan Jam Kerja, Lembur & Denda List Job */}
        <WorkHoursSettingsForm />
      </div>
    </div>
  );
}

