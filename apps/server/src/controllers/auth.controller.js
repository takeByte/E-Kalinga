import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env, googleOAuth } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { User } from '../models/user.model.js';
import { buildGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleProfile } from '../utils/google.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signSession } from '../utils/tokens.js';

const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Enter a valid contact number.')
  .regex(/^[\d+][\d\s\-()]{6,}$/, 'Enter a valid contact number.');

const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.'),
  birthdate: z
    .string()
    .min(1, 'Birthdate is required.')
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), 'Enter a valid date.')
    .refine((v) => new Date(`${v}T00:00:00`).getTime() <= Date.now(), 'Birthdate cannot be in the future.'),
  sex: z.enum(['Female', 'Male', 'Other', 'Prefer not to say']),
  address: z.string().trim().min(1, 'Address is required.'),
  householdNumber: z.string().trim().min(1, 'Household number is required.'),
  contactNumber: phoneSchema,
  philHealthNumber: z.string().trim().optional().default(''),
  emergencyName: z.string().trim().min(1, 'Emergency contact name is required.'),
  emergencyNumber: phoneSchema,
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required to register.' }) }),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

function requireDB(res) {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, message: 'Database is not connected. Try again later.' });
    return false;
  }
  return true;
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.fullName,
    email: user.email,
    role: user.role,
  };
}

export const register = asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }
  const data = parsed.data;

  const existing = await User.findOne({ email: data.email }).lean();
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email is already registered.' });
  }

  // Public registration always creates a patient — role comes from the server, never the client.
  const user = await User.create({
    email: data.email,
    passwordHash: await hashPassword(data.password),
    role: 'patient',
    fullName: data.fullName,
    birthdate: new Date(`${data.birthdate}T00:00:00`),
    sex: data.sex,
    address: data.address,
    householdNumber: data.householdNumber,
    contactNumber: data.contactNumber,
    philHealthNumber: data.philHealthNumber ?? '',
    emergencyName: data.emergencyName,
    emergencyNumber: data.emergencyNumber,
  });

  res.status(201).json({ success: true, token: signSession(user), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    // Generic message on purpose — do not reveal whether the email exists.
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user || !user.active) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  res.json({ success: true, token: signSession(user), user: publicUser(user) });
});

/** GET /api/auth/me — resolve the signed-in user from a Bearer token. */
export const me = asyncHandler(async (req, res) => {
  if (!requireDB(res)) return;
  const user = await User.findById(req.user.id).lean();
  if (!user || !user.active) {
    return res.status(401).json({ success: false, message: 'Session is no longer valid. Log in again.' });
  }
  res.json({ success: true, user: publicUser(user) });
});

/** Redirect back to the SPA with either a session token or an error code. */
function redirectToApp(res, params) {
  const url = new URL('/auth/callback', env.CLIENT_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  res.redirect(url.toString());
}

/** GET /api/auth/google — kick off the consent flow. */
export function googleStart(req, res) {
  if (!googleOAuth.enabled) {
    return res.status(503).json({ success: false, message: 'Google sign-in is not configured.' });
  }
  // Signed, short-lived state guards the callback against CSRF.
  const state = jwt.sign({ purpose: 'google_oauth_state' }, env.JWT_SECRET, { expiresIn: '10m' });
  res.redirect(buildGoogleAuthUrl({ state }));
}

/** GET /api/auth/google/callback — Google redirects here with `code` + `state`. */
export const googleCallback = asyncHandler(async (req, res) => {
  if (!googleOAuth.enabled) return redirectToApp(res, { error: 'google_not_configured' });

  const { code, state, error } = req.query;
  if (error) return redirectToApp(res, { error: 'google_denied' });
  if (typeof code !== 'string' || typeof state !== 'string') {
    return redirectToApp(res, { error: 'google_invalid_request' });
  }

  try {
    jwt.verify(state, env.JWT_SECRET);
  } catch {
    return redirectToApp(res, { error: 'google_invalid_state' });
  }

  if (mongoose.connection.readyState !== 1) return redirectToApp(res, { error: 'db_unavailable' });

  let profile;
  try {
    const tokens = await exchangeCodeForTokens(code);
    profile = await fetchGoogleProfile(tokens.access_token);
  } catch (err) {
    console.error('Google OAuth failed:', err.message);
    return redirectToApp(res, { error: 'google_exchange_failed' });
  }

  const email = typeof profile.email === 'string' ? profile.email.toLowerCase() : '';
  const googleId = typeof profile.sub === 'string' ? profile.sub : '';
  if (!email || !googleId || profile.email_verified === false) {
    return redirectToApp(res, { error: 'google_email_unverified' });
  }

  let user = await User.findOne({ $or: [{ googleId }, { email }] });
  if (user) {
    if (!user.active) return redirectToApp(res, { error: 'account_disabled' });
    // Link Google to an existing local account the first time it's used.
    if (!user.googleId) {
      user.googleId = googleId;
      if (!user.fullName && profile.name) user.fullName = profile.name;
      await user.save();
    }
  } else {
    user = await User.create({
      email,
      fullName: profile.name || email.split('@')[0],
      googleId,
      provider: 'google',
      role: 'patient',
      profileComplete: false,
    });
  }

  return redirectToApp(res, { token: signSession(user) });
});
