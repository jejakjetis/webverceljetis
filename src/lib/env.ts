import "server-only";
import { z } from "zod";

// Di Workers, secret dibaca saat request (OpenNext mengisi process.env), jadi validasi lazy
// saat pertama dipakai (dan saat start di produksi via instrumentation bila dijalankan).
// Tidak saat build, agar build tidak butuh secret. Gagal keras jika env wajib kosong.
// Database: Cloudflare memakai binding HYPERDRIVE; Vercel memakai DATABASE_URL (pooler 6543).
const serverEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  ADMIN_EMAILS: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.email()).min(1)),
  BOOKING_WHATSAPP_NUMBER: z.string().regex(/^62\d{8,13}$/),
  SITE_URL: z.url(),
  TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  // Wajib di Vercel (dicek di bawah); tidak dipakai di Cloudflare.
  DATABASE_URL: z.url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    // Hanya nama variabel yang disebut, tidak pernah nilainya.
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Env tidak valid atau belum diisi: ${names}`);
  }
  if (source.VERCEL && !parsed.data.DATABASE_URL) {
    throw new Error("Env tidak valid atau belum diisi: DATABASE_URL");
  }
  return parsed.data;
}

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
