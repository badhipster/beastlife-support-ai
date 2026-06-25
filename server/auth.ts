// App authentication via Google Sign-In. Reuses the Google OAuth client but
// with login-only scopes (no Gmail access) and the same registered callback,
// disambiguated from the Gmail-connect flow by the OAuth `state` param.
import { google } from 'googleapis';
import crypto from 'node:crypto';
import type { Request } from 'express';
import { upsertUser, setUserSession, getUserBySession, clearUserSession, SessionUser } from './db/repo';

export const SESSION_COOKIE = 'bl_session';

const LOGIN_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export function isAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  const base = process.env.APP_URL || 'http://localhost:3000';
  return `${base}/api/auth/google/callback`;
}

function client() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri());
}

export function getLoginUrl(): string {
  return client().generateAuthUrl({ scope: LOGIN_SCOPES, state: 'login', prompt: 'select_account' });
}

// Exchange the code, read the Google profile, upsert the user, and start a session.
export async function handleLogin(code: string): Promise<{ token: string; user: SessionUser }> {
  const c = client();
  const { tokens } = await c.getToken(code);
  c.setCredentials(tokens);
  const info = await google.oauth2({ version: 'v2', auth: c }).userinfo.get();
  const sub = info.data.id || '';
  const email = info.data.email || '';
  const user = await upsertUser({
    googleSub: sub,
    email,
    name: info.data.name || email,
    picture: info.data.picture || '',
  });
  const token = crypto.randomBytes(24).toString('hex');
  await setUserSession(user.id, token);
  return { token, user };
}

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export async function getUserFromReq(req: Request): Promise<SessionUser | null> {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  return getUserBySession(token);
}

export async function logout(req: Request): Promise<void> {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) await clearUserSession(token);
}
