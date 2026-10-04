"use server";

import { headers } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { bookingInputSchema } from "@/server/booking/input";
import { RULE_MESSAGES } from "@/server/booking/rules";
import { createBooking } from "@/server/db/bookings";
import { getDb } from "@/server/db/client";
import { type BookingSummary, buildWhatsappMessage, buildWhatsappUrl } from "@/server/booking/whatsapp";
import { clientIp } from "@/server/security/client-ip";
import { checkRateLimit } from "@/server/security/rate-limit";
import { verifyTurnstile } from "@/server/security/turnstile";

export type BookingActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; summary: BookingSummary; whatsappUrl: string };

const GENERIC_ERROR = "Pemesanan belum dapat diproses. Silakan coba lagi atau hubungi kami lewat WhatsApp.";

const FIELD_NAMES = [
  "packageId",
  "sessionId",
  "visitDate",
  "participantCount",
  "customerName",
  "email",
  "whatsapp",
  "institution",
  "notes",
] as const;

const FIELD_MESSAGES: Record<string, string> = {
  customerName: "Nama wajib diisi (2–100 karakter).",
  email: "Email tidak valid.",
  whatsapp: "Nomor WhatsApp tidak valid (contoh: 0812xxxxxxx).",
  visitDate: "Pilih tanggal kunjungan.",
  participantCount: "Jumlah peserta tidak valid.",
  packageId: "Pilih paket.",
  sessionId: "Pilih sesi.",
  institution: "Maksimal 150 karakter.",
  notes: "Maksimal 500 karakter.",
};

export async function submitBooking(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  try {
    const h = await headers();
    const ip = clientIp(h);
    const db = await getDb();

    if (!(await checkRateLimit(db, "booking", ip))) {
      return { status: "error", message: "Terlalu banyak percobaan. Silakan tunggu beberapa menit." };
    }

    // Honeypot: bot mengisi field tersembunyi. Ditolak dengan pesan umum (tanpa petunjuk).
    const honeypot = formData.get("website");
    if (typeof honeypot === "string" && honeypot.length > 0) {
      return { status: "error", message: GENERIC_ERROR };
    }

    const env = getServerEnv();
    const token = formData.get("cf-turnstile-response");
    if (typeof token !== "string" || !(await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip))) {
      return { status: "error", message: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi." };
    }

    const raw: Record<string, FormDataEntryValue> = {};
    for (const name of FIELD_NAMES) {
      const v = formData.get(name);
      if (v !== null) raw[name] = v;
    }
    const parsed = bookingInputSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = FIELD_MESSAGES[key] ?? "Tidak valid.";
      }
      return { status: "error", message: "Periksa kembali isian formulir.", fieldErrors };
    }

    const result = await createBooking(db, parsed.data, new Date());
    if (!result.ok) {
      const message =
        result.error === "PACKAGE_UNAVAILABLE" ? "Paket tidak tersedia." : RULE_MESSAGES[result.error];
      return { status: "error", message };
    }

    const whatsappUrl = buildWhatsappUrl(env.BOOKING_WHATSAPP_NUMBER, buildWhatsappMessage(result.summary));
    return { status: "success", summary: result.summary, whatsappUrl };
  } catch (e) {
    // Log tanpa data pribadi: hanya nama error.
    console.error("submitBooking gagal:", e instanceof Error ? e.name : "unknown");
    return { status: "error", message: GENERIC_ERROR };
  }
}
