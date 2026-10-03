/**
 * GET /api/google/authorize
 *
 * Initiates Google OAuth2 consent for Sheets + Drive.file scopes.
 * Redirects the user's browser to the Google consent screen.
 *
 * Security:
 * - cafeId is resolved from the server-side Auth.js session (never from query params).
 * - State parameter encodes cafeId for round-trip verification in the callback.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOAuth2Client, GOOGLE_SHEETS_SCOPES } from "@/lib/google-sheets/client";

export async function GET() {
  // 1. Verify user is authenticated
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  // 2. Resolve cafe from session (never trusting client-supplied cafeId)
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
      { error: "Cafe tidak ditemukan untuk akun ini." },
      { status: 403 }
    );
  }

  // 3. Build OAuth2 consent URL
  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Force refresh token issuance even for existing grants
    scope: GOOGLE_SHEETS_SCOPES,
    state: cafeId, // We verify this in the callback against the session
  });

  return NextResponse.redirect(authUrl);
}
