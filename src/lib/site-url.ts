/**
 * Normalisasi URL situs: trim, tambah https:// bila tanpa skema, buang garis miring akhir.
 * Di Vercel, bila SITE_URL kosong, pakai domain produksi Vercel (VERCEL_PROJECT_PRODUCTION_URL).
 */
export function resolveSiteUrl(source: Record<string, string | undefined>): string | undefined {
  let v = source.SITE_URL?.trim();
  if (!v && source.VERCEL) v = source.VERCEL_PROJECT_PRODUCTION_URL?.trim() || source.VERCEL_URL?.trim();
  if (!v) return undefined;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  return v.replace(/\/+$/, "");
}
