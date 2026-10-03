/**
 * POST /api/google/sheets/sync-slip-gaji
 *
 * Triggers a Slip Gaji → Google Sheets sync for the current cafe.
 *
 * Body: { period?: string } (optional, e.g. "2026-08")
 *
 * Security:
 * - cafeId is ALWAYS resolved from the server-side Auth.js session.
 * - No cafeId accepted from the request body.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncSlipGajiToSheets } from "@/lib/google-sheets/slip-gaji-sync";

export async function POST(request: NextRequest) {
  // 1. Verify authentication
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse optional body
  let period: string | undefined;
  try {
    const body = await request.json();
    if (body && typeof body.period === "string" && /^\d{4}-\d{2}$/.test(body.period)) {
      period = body.period;
    }
  } catch {
    // Body is optional; continue with undefined period if not provided or empty
  }

  // 3. Resolve cafe from session (never from body)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: { cafe: true },
        take: 1,
      },
    },
  });

  const cafeId = user?.memberships?.[0]?.cafeId;
  if (!cafeId) {
    return NextResponse.json(
      { success: false, error: "Cafe tidak ditemukan." },
      { status: 403 }
    );
  }

  // 4. Run the Slip Gaji sync
  try {
    const result = await syncSlipGajiToSheets(cafeId, period);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Terjadi kesalahan sinkronisasi.";

    if (message === "SHEETS_NOT_CONNECTED") {
      return NextResponse.json(
        {
          success: false,
          error: "SHEETS_NOT_CONNECTED",
          message:
            "Google Sheets belum terhubung. Silakan hubungkan akun Google terlebih dahulu.",
        },
        { status: 403 }
      );
    }

    console.error("[sync-slip-gaji] Sync error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyinkronkan Slip Gaji ke Google Sheets.",
        message,
      },
      { status: 500 }
    );
  }
}
