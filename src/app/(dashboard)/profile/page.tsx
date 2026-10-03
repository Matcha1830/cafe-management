import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = {
  title: "Profil Saya",
};

export default function ProfilePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Profil Saya</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Kelola informasi profil dan akun Anda.
        </p>
      </div>

      <ProfileForm />
    </div>
  );
}
