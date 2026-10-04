// Konfigurasi publik situs (bukan rahasia). Nilai bertanda TODO(klien) belum dikonfirmasi.
export const SITE = {
  name: "Kampung Batik Jetis",
  tagline: "Wisata edukasi batik tulis di Sidoarjo",
  // TODO(klien): alamat lengkap resmi.
  addressLines: ["Kampung Batik Jetis, Kel. Lemahputro", "Kec. Sidoarjo, Kabupaten Sidoarjo, Jawa Timur"],
  // Titik "Kampoeng Batik Jetis" dari tautan Google Maps klien (2026-10-04).
  map: {
    lat: -7.4566926,
    lng: 112.714282,
    zoom: 17,
    googleMapsUrl: "https://maps.app.goo.gl/8uwvqb7THNcbNNPcA",
  },
} as const;

export const NAV_ITEMS = [
  { href: "/#beranda", label: "Beranda" },
  { href: "/#tentang", label: "Tentang" },
  { href: "/#kegiatan", label: "Kegiatan Wisata" },
  { href: "/#peta", label: "Peta Wisata" },
  { href: "/#umkm", label: "UMKM" },
  { href: "/#kontak", label: "Kontak" },
] as const;

/** URL embed OpenStreetMap (tanpa JS tambahan, tanpa API key). */
export function osmEmbedUrl(lat: number, lng: number): string {
  const d = 0.004;
  const bbox = [lng - d, lat - d * 0.6, lng + d, lat + d * 0.6].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
}
