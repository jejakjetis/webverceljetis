# Progres

## Status saat ini
Tahap: 1 (inti) | Terakhir diperbarui: 2026-10-04
Front end, form pemesanan, admin, security headers, SEO, dan konfigurasi Cloudflare Workers (OpenNext + Hyperdrive) selesai di sisi kode; lint/typecheck/test/build OpenNext lulus. Belum pernah terhubung ke Supabase sungguhan: migrasi, seed, dan test konkurensi menunggu `.env`. Konten (foto, sejarah, UMKM) masih placeholder.

## Selesai
- [x] 2026-10-03 — Setup Next.js 16, TS strict, Tailwind 4, ESLint, Vitest; skema Prisma + migrasi 0001 (CHECK, RLS) + seed
- [x] 2026-10-04 — Migrasi 0002 (ClosedDate, SessionSlot.isClosed, RLS _prisma_migrations, REVOKE) dan 0003 (RateLimit)
- [x] 2026-10-04 — Logika pemesanan + unit test (src/server/booking/), createBooking dengan validasi dulu lalu transaksi FOR UPDATE (src/server/db/bookings.ts)
- [x] 2026-10-04 — Server action submitBooking: rate limit Postgres, honeypot, Turnstile, Zod, URL WA
- [x] 2026-10-04 — Front end: design token + font, komponen dasar, 10 section, form pemesanan, halaman sukses, 404, error (src/components/, src/app/(public)/)
- [x] 2026-10-04 — Kembali ke Cloudflare: OpenNext + wrangler, Hyperdrive per request (src/server/db/client.ts), vercel.json dihapus
- [x] 2026-10-04 — Admin: Supabase Auth + allowlist, layout & action terproteksi, daftar pesanan + filter, ubah status + log, test tanpa sesi (src/app/admin/, src/server/auth/, test/admin/)
- [x] 2026-10-04 — Security headers + CSP (cek curl -I di preview), SEO (metadata, Open Graph, robots, sitemap), noindex admin
- [x] 2026-10-04 — DEPLOY.md (Cloudflare); CLAUDE.md, README.md diperbarui
- [x] 2026-10-04 — SQL siap tempel untuk deploy tanpa terminal (prisma/manual/)
- [x] 2026-10-04 — Deploy pertama ke Vercel berhasil (jejakjetis.vercel.app); SITE_URL kini toleran + fallback domain Vercel (src/lib/site-url.ts)
- [x] 2026-10-04 — Siap deploy ke Vercel juga: client DB dua target, IP per platform, vercel.json sin1, DEPLOY-VERCEL.md

## Sedang dikerjakan
- [ ] Migrasi 0001–0003 + seed + test konkurensi — MENUNGGU `.env` (DIRECT_URL, CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE)

## Berikutnya
- [ ] Jalankan migrasi/seed/test konkurensi; cek Security Advisor Supabase
- [ ] Uji form pemesanan end-to-end di preview dengan DB sungguhan
- [ ] Ganti placeholder: foto (WebP teroptimasi), teks sejarah, data UMKM, FAQ final, alamat & koordinat peta
- [ ] Checklist pasca-deploy Vercel (uji pesan nyata, admin, header, Security Advisor)
- [ ] (Ditunda) Midtrans — PAYMENT_MODE tetap "manual"

## Tugas non-kode
- [ ] Beli domain
- [ ] Buat project Supabase (region Singapura); matikan sign-up publik; buat akun admin
- [ ] Buat Hyperdrive (direct connection 5432) dan isi id di wrangler.jsonc
- [ ] Buat Turnstile site key produksi
- [ ] Isi secret di Cloudflare (`wrangler secret put`)
- [ ] Hubungkan domain ke Worker
- [ ] Catat semua akun (domain, Cloudflare, Supabase) untuk dipindahkan ke Pokdarwis

## Ukuran bundle Worker (gzip)
- 2026-10-04 — Halaman kosong + proxy.ts: 2.203 KiB
- 2026-10-04 — Dengan Prisma (fast) + proxy.ts: 4.401 KiB; compiler small + proxy.ts: 3.695 KiB
- 2026-10-04 — Tanpa proxy.ts (resvg/yoga ikut hilang): 2.351 KiB
- 2026-10-04 — Final tahap ini (admin, Supabase SSR, SEO, headers): **2.547 KiB** (batas gratis 3 MiB; Paid 10 MiB)

## Keputusan penting
- 2026-10-03 — Prisma 7.10 + `@prisma/adapter-pg`; client di `src/generated/prisma`.
- 2026-10-03 — Kuota dikunci lewat baris SessionSlot (sesi+tanggal), upsert lalu FOR UPDATE; Booking.unitPrice snapshot; CHECK total = harga × peserta.
- 2026-10-04 — Semua validasi sebelum menulis SessionSlot (tidak ada slot sampah).
- 2026-10-04 — Penutupan tanggal/sesi: ClosedDate + SessionSlot.isClosed, diubah via Table Editor.
- 2026-10-04 — Target deploy: Cloudflare Workers + OpenNext (sempat ke Vercel, klien memilih Cloudflare). Paket gratis vs Paid menunggu klien.
- 2026-10-04 — DB runtime: binding Hyperdrive ke direct connection (5432); klien Prisma per request (React cache), `maxUses: 1`. Migrasi/seed via DIRECT_URL.
- 2026-10-04 — Prisma `compilerBuild = "small"` untuk menghemat bundle (tetap Prisma). `runtime = "cloudflare"` ditolak (membundel semua wasm).
- 2026-10-04 — next.config: `serverExternalPackages` Prisma + `outputFileTracingIncludes` pg-cloudflare (tanpa ini build gagal).
- 2026-10-04 — **proxy.ts dihapus**: di OpenNext, Node middleware dibundel terpisah beserta server Next (+±1,3 MiB, termasuk resvg/yoga). Proteksi admin tetap dua lapis: layout/halaman + setiap action. Konsekuensi: sesi Supabase tidak di-refresh otomatis di halaman; admin login ulang setelah token habis (sarankan JWT expiry 8 jam).
- 2026-10-04 — Rate limit: tabel Postgres `RateLimit` (berjalan di Workers via Hyperdrive), bukan binding (periode binding hanya 10/60 dtk). Produksi gagal tertutup; in-memory hanya lokal. IP dari `cf-connecting-ip`, disimpan sebagai hash.
- 2026-10-04 — Semua route dinamis (`connection()`): env/secret Workers hanya ada saat request.
- 2026-10-04 — Koordinat peta dari klien: -7.4566926, 112.714282 (Kampoeng Batik Jetis); tombol membuka tautan Google Maps klien.
- 2026-10-04 — Peta: iframe OpenStreetMap (0 KB JS, tanpa API key) + tautan Google Maps.
- 2026-10-04 — Gambar: `images.unoptimized`, file statis teroptimasi di /public (tanpa biaya Cloudflare Images). Sementara placeholder SVG kawung buatan sendiri; foto Framer tidak dipakai (lisensi tidak jelas).
- 2026-10-04 — Tanggal kunjungan dipilih dari daftar (select) Sabtu/Minggu berformat Indonesia, bukan `<input type=date>` (format bergantung browser, tidak bisa membatasi hari).
- 2026-10-04 — Halaman sukses membaca ringkasan dari sessionStorage pemesan, tidak dari DB (data pesanan tidak bisa dibuka lewat kode).
- 2026-10-04 — Token warna ditambah varian kontras AA: terracotta-text #96502F, terracotta-light #D08E6A, muted #76594B, field #8A6F60.
- 2026-10-04 — Midtrans ditunda; PAYMENT_MODE tetap manual.
- 2026-10-04 — Satu kode untuk dua target: `getDb()` memakai binding HYPERDRIVE bila ada (Cloudflare, klien per request), selain itu `DATABASE_URL` pooler 6543 (Vercel, satu pool per instance, max 3). `DATABASE_URL` wajib bila `VERCEL` terset.
- 2026-10-04 — IP rate limit per platform (`src/server/security/client-ip.ts`): di Vercel header `cf-connecting-ip` diabaikan karena bisa dipalsukan klien.
- 2026-10-04 — Path desain: `Design/`.

## Menunggu dari klien / belum jelas
- Paket Cloudflare Workers: gratis (3 MiB, CPU 10 ms) atau Paid
- Jam setiap sesi (sementara 08–10, 10–12, 15–17)
- Batas 20 paket umum: per pesanan (asumsi) atau per sesi
- Kebijakan DP (sementara bayar penuh); nomor WA tujuan; syarat kupon
- Teks sejarah final + sumber; data 7 UMKM; FAQ final; foto; alamat lengkap

## Masalah diketahui
- Belum pernah terhubung ke DB sungguhan; test integrasi skip; `/` di preview 500 karena DB dummy.
- Embed peta OSM tampak kosong di screenshot headless (URL embed merespons 200); cek di browser nyata.
- CSP memakai `'unsafe-inline'` untuk script (skrip inline Next.js); nonce butuh middleware yang sengaja tidak dipakai.
- `RateLimit` perlu dibersihkan berkala (SQL di DEPLOY.md); belum ada cron.
- Folder proyek di ~/Documents sempat merusak node_modules/.next (file hilang, ENOTEMPTY); pertimbangkan pindah folder.
- `.dev.vars` lokal berisi nilai DUMMY untuk preview; ganti saat menguji dengan Supabase sungguhan.
