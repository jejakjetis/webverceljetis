import "server-only";

/**
 * IP klien dari header yang diisi platform (tidak bisa dipalsukan klien di platform itu).
 * - Vercel: x-forwarded-for ditimpa oleh edge Vercel; header cf-* TIDAK dipercaya.
 * - Cloudflare: cf-connecting-ip diisi oleh edge Cloudflare.
 */
export function clientIp(h: Headers): string {
  if (process.env.VERCEL) {
    return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  }
  return h.get("cf-connecting-ip") ?? "unknown";
}
