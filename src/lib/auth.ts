import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { type UserRole, USER_ROLES } from "@/lib/types";
import { prisma } from "@/lib/db";
import { hasPermission, type Permission } from "@/lib/permissions";

const COOKIE_NAME = "obgyn_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function sessionTimeoutMs() {
  const minutes = Number(process.env.SESSION_TIMEOUT_MINUTES ?? 30);
  return minutes * 60 * 1000;
}

export async function createSession(user: SessionUser) {
  const expiresAt = new Date(Date.now() + sessionTimeoutMs());
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function parseUserRole(role: string): UserRole | null {
  const normalized = role.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;

    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user?.active) return null;

    const role = parseUserRole(user.role);
    if (!role) return null;

    const session: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    };

    if (
      payload.email !== user.email ||
      payload.name !== user.name ||
      payload.role !== user.role
    ) {
      await createSession(session);
    }

    return session;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const session = await requireSession();
  if (!hasPermission(session.role, permission)) {
    redirect("/dashboard?error=access-denied");
  }
  return session;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.active) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return user;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

function parseRegistryNumeric(registryNumber: string): number | null {
  const match = registryNumber.trim().match(/^GYN-?(\d+)$/i);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

export async function generateRegistryNumber(): Promise<string> {
  const patients = await prisma.patient.findMany({
    select: { registryNumber: true },
  });

  let max = 0;
  for (const { registryNumber } of patients) {
    const num = parseRegistryNumeric(registryNumber);
    if (num != null && num > max) max = num;
  }

  return `GYN-${String(max + 1).padStart(4, "0")}`;
}
