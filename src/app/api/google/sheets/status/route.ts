/**
 * GET /api/google/sheets/status
 *
 * Returns the current Google Sheets integration status for the authenticated cafe.
 * Used by the "Sinkron Sheets" button to determine UI state.
 *
 * Response: { connected: boolean, spreadsheetId?: string, googleAccountEmail?: string }
 *
 * Security: cafeId resolved from server-side Auth.js session only.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          cafe: {
            include: { googleIntegration: true },
          },
        },
        take: 1,
      },
    },
  });

  const cafe = user?.memberships?.[0]?.cafe;
  if (!cafe) {
    return NextResponse.json({ connected: false }, { status: 403 });
  }

  const integration = cafe.googleIntegration;

  if (!integration) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    spreadsheetId: integration.jadwalSpreadsheetId ?? null,
    googleAccountEmail: integration.googleAccountEmail,
    spreadsheetUrl: integration.jadwalSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${integration.jadwalSpreadsheetId}/edit`
      : null,
    slipGajiSpreadsheetId: integration.slipGajiSpreadsheetId ?? null,
    slipGajiSpreadsheetUrl: integration.slipGajiSpreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${integration.slipGajiSpreadsheetId}/edit`
      : null,
  });
}
