/**
 * GET /api/google/callback
 *
 * Handles OAuth2 callback from Google after user grants Sheets consent.
 * Exchanges the authorization code for tokens, encrypts them, and saves
 * to CafeGoogleIntegration.
 *
 * Security:
 * - cafeId from `state` is cross-validated against the authenticated session.
 * - A cafe member can only save tokens for their own cafe.
 * - Tokens are AES-256 encrypted before DB storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOAuth2Client } from "@/lib/google-sheets/client";
import { encryptToken } from "@/lib/google-sheets/token-crypto";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateCafeId = searchParams.get("state");
  const error = searchParams.get("error");

  // 1. Handle user denial
  if (error) {
    return NextResponse.redirect(
      `${BASE_URL}/jadwal?sheets_error=access_denied`
    );
  }

  if (!code || !stateCafeId) {
    return NextResponse.redirect(
      `${BASE_URL}/jadwal?sheets_error=invalid_callback`
    );
  }

  // 2. Verify the user is authenticated
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(`${BASE_URL}/login`);
  }

  // 3. Resolve the session user's cafe and cross-validate against state
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: { cafe: true },
        take: 1,
      },
    },
  });

  const sessionCafeId = user?.memberships?.[0]?.cafeId;
  if (!sessionCafeId || sessionCafeId !== stateCafeId) {
    // Cross-cafe forgery attempt or mismatched session
    return NextResponse.redirect(
      `${BASE_URL}/jadwal?sheets_error=unauthorized`
    );
  }

  // 4. Exchange authorization code for tokens
  const oauth2Client = createOAuth2Client();
  let tokenResponse;
  try {
    tokenResponse = await oauth2Client.getToken(code);
  } catch {
    return NextResponse.redirect(
      `${BASE_URL}/jadwal?sheets_error=token_exchange_failed`
    );
  }

  const tokens = tokenResponse.tokens;
  if (!tokens.access_token) {
    return NextResponse.redirect(
      `${BASE_URL}/jadwal?sheets_error=no_access_token`
    );
  }

  // 5. Get the Google account email for this token
  oauth2Client.setCredentials(tokens);
  const oauth2 = new (await import("googleapis")).google.auth.OAuth2();
  oauth2.setCredentials(tokens);

  let googleEmail = session.user.email; // fallback
  try {
    const { google } = await import("googleapis");
    const oauth2Info = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2Info.userinfo.get();
    googleEmail = userInfo.data.email ?? session.user.email;
  } catch {
    // Non-fatal — we can fall back to session email
  }

  // 6. Encrypt tokens and upsert CafeGoogleIntegration
  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token
    ? encryptToken(tokens.refresh_token)
    : undefined;

  await prisma.cafeGoogleIntegration.upsert({
    where: { cafeId: sessionCafeId },
    create: {
      cafeId: sessionCafeId,
      googleAccountEmail: googleEmail ?? "",
      encryptedAccessToken,
      encryptedRefreshToken: encryptedRefreshToken ?? null,
      tokenExpiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
    },
    update: {
      googleAccountEmail: googleEmail ?? "",
      encryptedAccessToken,
      ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
      tokenExpiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
    },
  });

  // 7. Redirect back to Jadwal page with success signal
  return NextResponse.redirect(`${BASE_URL}/jadwal?sheets_connected=1`);
}
