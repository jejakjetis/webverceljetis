"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ALL_STATUSES } from "@/server/booking/status";
import { requireAdminAction, UnauthorizedError } from "@/server/auth/admin";
import { authorizeAdmin } from "@/server/auth/authorize";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getServerEnv } from "@/lib/env";
import { changeBookingStatus } from "@/server/db/admin";
import { getDb } from "@/server/db/client";
import { clientIp } from "@/server/security/client-ip";
import { checkRateLimit } from "@/server/security/rate-limit";

export type LoginState = { error?: string };

const loginSchema = z
  .object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()), password: z.string().min(1).max(200) })
  .strict();

const GENERIC_LOGIN_ERROR = "Email atau kata sandi salah, atau akun tidak memiliki akses.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: GENERIC_LOGIN_ERROR };

  try {
    const h = await headers();
    const ip = clientIp(h);
    const db = await getDb();
    if (!(await checkRateLimit(db, "admin-login", ip, { limit: 10, windowMs: 10 * 60 * 1000 }))) {
      return { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
    }

    // Allowlist dicek sebelum dan sesudah login; email di luar allowlist tidak pernah mendapat sesi.
    const allowlist = getServerEnv().ADMIN_EMAILS;
    if (!allowlist.includes(parsed.data.email)) return { error: GENERIC_LOGIN_ERROR };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !authorizeAdmin(data.user, allowlist)) {
      await supabase.auth.signOut();
      return { error: GENERIC_LOGIN_ERROR };
    }
  } catch (e) {
    console.error("login admin gagal:", e instanceof Error ? e.name : "unknown");
    return { error: "Login belum dapat diproses. Coba lagi." };
  }
  redirect("/admin");
}

export async function logout(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // tetap arahkan ke login
  }
  redirect("/admin/login");
}

const statusEnum = z.enum(ALL_STATUSES as [string, ...string[]]);
const changeSchema = z
  .object({ bookingId: z.string().min(1).max(40), from: statusEnum, to: statusEnum })
  .strict();

export type ChangeStatusState = { ok?: boolean; error?: string };

export async function updateBookingStatus(_prev: ChangeStatusState, formData: FormData): Promise<ChangeStatusState> {
  let actor;
  try {
    actor = await requireAdminAction(); // lapis kedua: tidak hanya mengandalkan layout
  } catch (e) {
    if (e instanceof UnauthorizedError) return { error: "Sesi berakhir. Silakan login kembali." };
    throw e;
  }
  const parsed = changeSchema.safeParse({
    bookingId: formData.get("bookingId"),
    from: formData.get("from"),
    to: formData.get("to"),
  });
  if (!parsed.success) return { error: "Permintaan tidak valid." };

  try {
    const db = await getDb();
    const r = await changeBookingStatus(db, {
      bookingId: parsed.data.bookingId,
      expectedFrom: parsed.data.from as (typeof ALL_STATUSES)[number],
      to: parsed.data.to as (typeof ALL_STATUSES)[number],
      actorEmail: actor.email,
    });
    if (!r.ok) {
      const msg = {
        NOT_FOUND: "Pesanan tidak ditemukan.",
        INVALID_TRANSITION: "Perubahan status tersebut tidak diizinkan.",
        STALE: "Status sudah diubah oleh admin lain. Muat ulang halaman.",
      }[r.error];
      return { error: msg };
    }
  } catch (e) {
    console.error("updateBookingStatus gagal:", e instanceof Error ? e.name : "unknown");
    return { error: "Gagal menyimpan. Coba lagi." };
  }
  revalidatePath("/admin");
  return { ok: true };
}
