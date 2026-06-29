import { randomBytes } from "crypto";

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function inviteExpiry(days = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export function buildInviteUrl(token: string, baseUrl?: string): string {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}
