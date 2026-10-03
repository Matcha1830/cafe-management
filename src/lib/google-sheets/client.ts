/**
 * client.ts — Server-only Google OAuth2 client factory
 *
 * Creates a configured googleapis OAuth2 client for a given Cafe's
 * stored integration. Handles token refresh automatically.
 *
 * NEVER import this file in client components.
 */

import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "./token-crypto";

export const GOOGLE_SHEETS_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID!,
    process.env.AUTH_GOOGLE_SECRET!,
    process.env.GOOGLE_SHEETS_REDIRECT_URI!
  );
}

/**
 * Creates an OAuth2 client pre-loaded with the Cafe's stored tokens.
 * Automatically refreshes the access token if expired and persists
 * the new token back to the DB.
 *
 * Throws if no integration exists for this cafe.
 */
export async function getOAuth2ClientForCafe(cafeId: string) {
  const integration = await prisma.cafeGoogleIntegration.findUnique({
    where: { cafeId },
  });

  if (!integration) {
    throw new Error("SHEETS_NOT_CONNECTED");
  }

  const client = createOAuth2Client();

  const accessToken = decryptToken(integration.encryptedAccessToken);
  const refreshToken = integration.encryptedRefreshToken
    ? decryptToken(integration.encryptedRefreshToken)
    : null;

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
    expiry_date: integration.tokenExpiresAt
      ? integration.tokenExpiresAt.getTime()
      : undefined,
  });

  // Listen for token refresh events and persist new tokens
  client.on("tokens", async (tokens) => {
    try {
      const updateData: {
        encryptedAccessToken?: string;
        encryptedRefreshToken?: string;
        tokenExpiresAt?: Date;
      } = {};

      if (tokens.access_token) {
        updateData.encryptedAccessToken = encryptToken(tokens.access_token);
      }
      if (tokens.refresh_token) {
        updateData.encryptedRefreshToken = encryptToken(tokens.refresh_token);
      }
      if (tokens.expiry_date) {
        updateData.tokenExpiresAt = new Date(tokens.expiry_date);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.cafeGoogleIntegration.update({
          where: { cafeId },
          data: updateData,
        });
      }
    } catch (err) {
      console.error("[google-sheets] Failed to persist refreshed tokens:", err);
    }
  });

  return client;
}
