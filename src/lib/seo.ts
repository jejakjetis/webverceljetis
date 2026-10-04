import "server-only";
import { resolveSiteUrl } from "./site-url";

/** URL kanonis situs dari env runtime SITE_URL (tanpa garis miring akhir). */
export function siteUrl(): string {
  const v = resolveSiteUrl(process.env);
  if (v) return v;
  if (process.env.NODE_ENV === "production") throw new Error("SITE_URL belum diisi");
  return "http://localhost:3000";
}
