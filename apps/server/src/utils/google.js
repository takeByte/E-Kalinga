import { googleOAuth } from '../config/env.js';

// Google OAuth 2.0 endpoints (Authorization Code flow, server-side).
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Consent-screen URL the browser is redirected to. */
export function buildGoogleAuthUrl({ state }) {
  const params = new URLSearchParams({
    client_id: googleOAuth.clientId,
    redirect_uri: googleOAuth.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Exchange the one-time `code` for Google tokens. */
export async function exchangeCodeForTokens(code) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: googleOAuth.clientId,
      client_secret: googleOAuth.clientSecret,
      redirect_uri: googleOAuth.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/** Fetch the verified profile (sub, email, email_verified, name, picture). */
export async function fetchGoogleProfile(accessToken) {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo request failed (${res.status})`);
  }
  return res.json();
}
