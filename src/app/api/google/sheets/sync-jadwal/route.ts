/**
 * POST /api/google/sheets/sync-jadwal
 *
 * Triggers a Jadwal → Google Sheets sync for the current cafe.
 *
 * Body: { weekStart: "YYYY-MM-DD" }
 *
 * Security:
 * - cafeId is ALWAYS resolved from the server-side Auth.js session.
 * - weekStart from body is validated to be a real date string.
 * - No cafeId accepted from the request body.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncJadwalToSheets, getWeekMonday } from "@/lib/google-sheets/jadwal-sync";

export async function POST(request: NextRequest) {
  // 1. Verify authentication
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate body
  let body: { weekStart?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body tidak valid." },
      { status: 400 }
    );
  }

  const rawWeekStart = body.weekStart;
  if (!rawWeekStart || !/^\d{4}-\d{2}-\d{2}$/.test(rawWeekStart)) {
    return NextResponse.json(
      { success: false, error: "Parameter weekStart tidak valid." },
      { status: 400 }
    );
  }

  // Normalize to the Monday of the given week
  const weekStart = getWeekMonday(rawWeekStart);

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

  // 4. Run the sync
  try {
    const result = await syncJadwalToSheets(cafeId, weekStart);

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

    console.error("[sync-jadwal] Sync error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyinkronkan jadwal ke Google Sheets.",
        message,
      },
      { status: 500 }
    );
  }
}
