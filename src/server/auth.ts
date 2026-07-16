/**
 * Autentikasi stateless berbasis token bertanda tangan (HMAC-SHA256).
 * Tidak menyimpan sesi di memori server, sehingga aman di lingkungan
 * serverless (mis. Vercel) yang instansinya ephemeral.
 *
 * Admin di-seed dari environment; guru diverifikasi dari store.
 */
import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { findParentByUsername, findTeacherByUsername, verifyPassword } from './store.js';

export type Role = 'admin' | 'teacher' | 'parent';

export interface SessionUser {
  role: Role;
  id: string;
  name: string;
  subject?: string; // guru
  studentId?: string; // orang tua: id anaknya
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET =
  process.env.SESSION_SECRET || process.env.APPS_SCRIPT_SECRET || 'dev-insecure-session-secret';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[auth] ADMIN_PASSWORD belum di-set — memakai default "admin123". Segera ganti.');
}
if (!process.env.SESSION_SECRET) {
  console.warn(
    '[auth] SESSION_SECRET belum di-set — token memakai secret cadangan/kurang aman. ' +
      'Set SESSION_SECRET di .env / Environment Variables Vercel.',
  );
}

interface TokenPayload extends SessionUser {
  exp: number;
}

function sign(payloadB64: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
}

export function signToken(user: SessionUser): string {
  const payload: TokenPayload = { ...user, exp: Date.now() + TOKEN_TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyToken(token: string): SessionUser | null {
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as TokenPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return {
      role: payload.role,
      id: payload.id,
      name: payload.name,
      subject: payload.subject,
      studentId: payload.studentId,
    };
  } catch {
    return null;
  }
}

export function login(username: string, password: string): { token: string; user: SessionUser } | null {
  let user: SessionUser | null = null;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    user = { role: 'admin', id: 'admin', name: 'Administrator' };
  } else {
    const teacher = findTeacherByUsername(username);
    if (teacher && verifyPassword(password, teacher.passwordHash)) {
      user = { role: 'teacher', id: teacher.id, name: teacher.name, subject: teacher.subject };
    } else {
      const parent = findParentByUsername(username);
      if (parent && verifyPassword(password, parent.passwordHash)) {
        user = { role: 'parent', id: parent.id, name: parent.name, studentId: parent.studentId };
      }
    }
  }

  if (!user) return null;
  return { token: signToken(user), user };
}

export interface AuthedRequest extends Request {
  user?: SessionUser;
}

export function requireAuth(role?: Role | Role[]) {
  const allowed = role ? (Array.isArray(role) ? role : [role]) : null;
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return res.status(401).json({ error: 'Tidak terautentikasi' });
    }
    if (allowed && !allowed.includes(user.role)) {
      return res.status(403).json({ error: 'Tidak diizinkan' });
    }
    req.user = user;
    next();
  };
}
