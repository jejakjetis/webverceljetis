import "server-only";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Dua target deploy, kode sama:
// - Cloudflare Workers: binding HYPERDRIVE -> koneksi langsung Supabase (5432). Klien per request,
//   maxUses: 1 (koneksi I/O tidak boleh dipakai lintas request di Workers).
// - Vercel / Node: DATABASE_URL -> pooler Supabase transaction mode (6543). Satu pool per instance.
//   adapter-pg tidak memakai prepared statement bernama, jadi aman untuk transaction mode;
//   transaksi FOR UPDATE tetap di satu koneksi selama BEGIN..COMMIT.

export function createPrismaClient(connectionString: string, opts: { perRequest?: boolean } = {}): PrismaClient {
  const adapter = opts.perRequest
    ? new PrismaPg({ connectionString, maxUses: 1 })
    : new PrismaPg({ connectionString, max: 3, idleTimeoutMillis: 10_000 });
  return new PrismaClient({ adapter });
}

async function hyperdriveConnectionString(): Promise<string | null> {
  if (process.env.VERCEL) return null;
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.HYPERDRIVE?.connectionString || null;
  } catch {
    return null; // bukan di Cloudflare (mis. Vercel, next dev tanpa binding)
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const getDb = cache(async (): Promise<PrismaClient> => {
  const hd = await hyperdriveConnectionString();
  if (hd) return createPrismaClient(hd, { perRequest: true });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database belum dikonfigurasi (HYPERDRIVE atau DATABASE_URL)");
  globalForPrisma.prisma ??= createPrismaClient(url);
  return globalForPrisma.prisma;
});

/** Apakah koneksi DB tersedia (dipakai untuk fixture saat pengembangan UI tanpa .env). */
export async function isDbConfigured(): Promise<boolean> {
  return Boolean(process.env.DATABASE_URL) || (await hyperdriveConnectionString()) !== null;
}
