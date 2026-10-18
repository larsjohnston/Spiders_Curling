import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "team_unlock";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function token(): string {
  const pin = process.env.TEAM_PIN;
  const secret = process.env.COOKIE_SECRET;
  if (!pin || !secret) throw new Error("TEAM_PIN and COOKIE_SECRET must be set");
  // Includes the PIN so changing it logs everyone out.
  return createHmac("sha256", secret).update(`unlock:${pin}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function isUnlocked(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && safeEqual(value, token());
}

export async function requireUnlocked(): Promise<void> {
  if (!(await isUnlocked())) throw new Error("Enter the team PIN first");
}

/** Returns false (after a short delay to slow guessing) when the PIN is wrong. */
export async function unlock(pin: string): Promise<boolean> {
  const expected = process.env.TEAM_PIN ?? "";
  if (!expected || !safeEqual(pin.trim(), expected)) {
    await new Promise((r) => setTimeout(r, 1000));
    return false;
  }
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return true;
}

export async function lock(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
