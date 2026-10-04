# Website Kampung Batik Jetis, Sidoarjo

Website wisata satu halaman dengan pemesanan tiket kunjungan (Sabtu/Minggu, kuota per sesi) dan panel admin untuk mengelola status pesanan. Pembayaran QRIS dikonfirmasi manual via WhatsApp (`PAYMENT_MODE` manual; Midtrans ditunda).

## Stack
Next.js 16 (App Router) + TypeScript strict · Tailwind CSS v4 · PostgreSQL (Supabase) via Prisma 7 (`@prisma/adapter-pg`, compiler `small`) · Supabase Auth (`@supabase/ssr`, khusus admin) · Zod 4 · Vitest · Deploy **Vercel** (region `sin1`, DB lewat pooler Supabase transaction mode 6543, `DATABASE_URL`) **atau Cloudflare Workers** via `@opennextjs/cloudflare` (DB lewat binding **Hyperdrive** ke koneksi langsung 5432) · Turnstile · Zona waktu bisnis Asia/Jakarta (WIB).

> Next.js 16 berbeda dari versi lama; baca `node_modules/next/dist/docs/` sebelum menulis kode. Aturan proyek: `CLAUDE.md`. Deploy: `DEPLOY-VERCEL.md` (Vercel) atau `DEPLOY.md` (Cloudflare).

## Menjalankan lokal
```bash
npm install                      # juga menjalankan prisma generate
cp .env.example .env             # DIRECT_URL + string Hyperdrive lokal (CLI, seed, test integrasi)
cp .dev.vars.example .dev.vars   # env runtime Worker lokal
npm run db:deploy && npm run db:seed
npm run dev                      # next dev
npm run preview                  # build OpenNext + jalankan di workerd lokal
```
- Tanpa `.env` (string Hyperdrive lokal kosong), `next dev` tetap jalan dengan **data fixture** (`src/server/db/fixtures.ts`) agar UI bisa dikerjakan; pemesanan tidak bisa dikirim.
- Turnstile lokal memakai test key Cloudflare: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA` (selalu lolos).

## Environment variables (nilai tidak pernah di-commit)
**`.env` (lokal saja):**
| Nama | Fungsi |
|---|---|
| `DIRECT_URL` | Koneksi langsung Supabase (5432) untuk migrate, seed, test integrasi. |
| `DATABASE_URL` | Runtime Vercel/Node: pooler transaction mode (6543). Di Vercel diisi di Project Settings. Bila diisi lokal, `next dev` memakai DB ini. |
| `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` | Simulasi binding Hyperdrive saat dev/preview (nilai sama dengan `DIRECT_URL`). |

**Runtime (Vercel: Project Settings → Environment Variables; Cloudflare: `.dev.vars` lokal / `wrangler secret put`):**
| Nama | Fungsi |
|---|---|
| `SUPABASE_URL` | URL proyek Supabase (Auth admin). |
| `SUPABASE_ANON_KEY` | Anon key Supabase (dipakai di server saja). |
| `ADMIN_EMAILS` | Allowlist email admin, dipisah koma. |
| `BOOKING_WHATSAPP_NUMBER` | Nomor WA pengelola, format `62…`. |
| `SITE_URL` | URL kanonis situs (metadata, sitemap, robots). |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile form pemesanan. |

**Binding Cloudflare (`wrangler.jsonc`):** `HYPERDRIVE` (database), `ASSETS`, `WORKER_SELF_REFERENCE`. Di Vercel `DATABASE_URL` wajib (divalidasi saat start oleh `src/instrumentation.ts`).

Env runtime divalidasi Zod di `src/lib/env.ts` (`getServerEnv()`, lazy saat pertama dipakai; gagal keras dengan menyebut nama variabel saja). Di luar produksi, `src/lib/public-config.ts` dan `src/lib/seo.ts` punya fallback agar UI bisa dikembangkan tanpa env; di produksi melempar error.

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dev |
| `npm run build` | `prisma generate` + build Next |
| `npm run preview` | Build OpenNext + preview workerd lokal (port default 8787) |
| `npm run deploy` | Build + deploy ke Cloudflare (manual, lihat `DEPLOY.md`) |
| `npm run cf-typegen` | Generate tipe binding ke `cloudflare-env.d.ts` |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Vitest (unit + integrasi; integrasi skip bila `.env` kosong) |
| `npm run db:generate` / `db:migrate` / `db:deploy` / `db:seed` | Prisma |

## Peta struktur
```
CLAUDE.md                     aturan proyek untuk AI agent (wajib dibaca)
progres.md                    status pekerjaan + ukuran bundle
DEPLOY.md                     langkah deploy Cloudflare
DEPLOY-VERCEL.md              langkah deploy Vercel
vercel.json                   region fungsi Vercel sin1
src/instrumentation.ts        validasi env saat server start (produksi)
prisma/manual/                SQL siap tempel untuk Supabase SQL Editor (setup + seed, tanpa terminal)
Design/                       screenshot desain Framer (acuan tata letak, BUKAN isi teks)
wrangler.jsonc                Worker: binding Hyperdrive, assets
open-next.config.ts           konfigurasi OpenNext Cloudflare
cloudflare-env.d.ts           tipe binding (hasil cf-typegen)
next.config.ts                security headers + CSP, Prisma external, tracing pg-cloudflare, images unoptimized
prisma.config.ts              Prisma 7: schema, migrasi, seed, DIRECT_URL
prisma/schema.prisma          skema database
prisma/migrations/            0001 (tabel, CHECK, RLS), 0002 (penutupan, RLS _prisma_migrations, REVOKE), 0003 (RateLimit)
prisma/seed.ts                seed paket & sesi (idempoten)
public/images/                motif kawung SVG (placeholder foto)
public/og.png                 gambar Open Graph statis 1200×630

src/app/layout.tsx            font (Cormorant Garamond, Source Sans 3), metadata + Open Graph
src/app/globals.css           design token (@theme), fokus, prefers-reduced-motion
src/app/(public)/layout.tsx   Navbar + Footer halaman publik
src/app/(public)/page.tsx     halaman satu-halaman (semua section)
src/app/(public)/pesanan/terkirim/  halaman sukses (baca sessionStorage, tanpa DB)
src/app/admin/login/          login admin
src/app/admin/(panel)/        layout terproteksi + daftar pesanan, filter, ubah status
src/app/not-found.tsx, error.tsx    404 dan error
src/app/robots.ts, sitemap.ts       SEO
src/app/actions/booking.ts    submitBooking (rate limit, honeypot, Turnstile, Zod, createBooking, URL WA)
src/app/actions/availability.ts     sisa kuota per sesi untuk satu tanggal (publik, angka saja)
src/app/actions/admin.ts      login, logout, updateBookingStatus (cek admin di setiap action)
src/components/ui/            Container, Eyebrow, SectionHeading, Button, PhotoPlaceholder
src/components/sections/      Navbar, Hero, About, Packages, Story, MapSection, Umkm, Booking, Faq, Footer
src/components/booking/       BookingForm (klien), Turnstile widget
src/lib/env.ts                validasi env runtime (server-only)
src/lib/site.ts               konfigurasi publik: nama, alamat, koordinat peta, menu navigasi
src/lib/public-config.ts      site key Turnstile & nomor WA untuk UI (server-only)
src/lib/seo.ts                SITE_URL
src/server/booking/           aturan murni + test: rules.ts, dates.ts, input.ts, code.ts, whatsapp.ts, status.ts, config.ts
src/server/auth/              authorize.ts (murni), supabase.ts (klien SSR), admin.ts (requireAdminPage/Action)
src/server/db/                SEMUA akses DB: client.ts (Hyperdrive per request), bookings.ts, public.ts,
                              admin.ts, rate-limit.ts, fixtures.ts (TODO klien), types.ts
                              client.ts memilih: binding HYPERDRIVE (Cloudflare) atau DATABASE_URL (Vercel)
src/server/security/          turnstile.ts, rate-limit.ts, client-ip.ts (IP per platform)
test/integration/             konkurensi kuota terhadap DB sungguhan
test/admin/                   otorisasi admin (tanpa sesi, di luar allowlist)
```

## Route
| Route | Keterangan |
|---|---|
| `/` | Halaman publik (dinamis: tanggal & sisa kuota). `?paket=<slug>` memilih paket di form. |
| `/pesanan/terkirim?kode=XXXX` | Halaman sukses, `noindex`. |
| `/admin/login` | Login admin. |
| `/admin` | Daftar pesanan (filter status, tanggal, kode; 50/halaman), ubah status. Tanpa sesi → 307 ke login. |
| `/robots.txt`, `/sitemap.xml` | SEO. |
| Server actions | `submitBooking`, `getSessionAvailability`, `login`, `logout`, `updateBookingStatus`. |

Semua route publik dirender dinamis (`connection()`), karena env runtime Workers tidak tersedia saat build.

## Skema database
| Model | Isi |
|---|---|
| `Package` | Paket: slug, nama, `pricePerPerson` (int rupiah), durasi, min/max peserta per pesanan, fasilitas, aktif, urutan. |
| `Session` | Template sesi: label, `startTime`/`endTime` ("HH:mm" WIB), `quota` (default 30), aktif. |
| `SessionSlot` | Satu baris per (sesi, tanggal); dikunci `FOR UPDATE` saat membuat pesanan; `isClosed` untuk menutup sesi. |
| `ClosedDate` | Tanggal tutup penuh. |
| `Booking` | Pesanan: `code` acak 8 karakter, paket, sesi, `visitDate` (DATE), peserta, `unitPrice` snapshot, `totalPrice` (CHECK = harga × peserta), data diri, `status`. |
| `BookingStatusLog` | Audit perubahan status: dari, ke, email admin, waktu. |
| `Umkm`, `Faq` | Konten publik. |
| `RateLimit` | Penghitung rate limit fixed-window (key = hash IP). |

Status: `MENUNGGU` → `DIKONFIRMASI` → `LUNAS` → `SELESAI`, atau `BATAL` (dari tiga status pertama). Transisi lain ditolak (`src/server/booking/status.ts`).

**Menutup tanggal/sesi (tahap 1, lewat Supabase Table Editor):**
- Tutup satu hari penuh: tambah baris `ClosedDate` (`id` teks unik apa saja, `date`, `reason`).
- Tutup satu sesi di tanggal tertentu: cari/tambah baris `SessionSlot` (`sessionId`, `visitDate`), set `isClosed = true`.
- Nonaktifkan sesi untuk semua tanggal: `Session.isActive = false`.

**Keamanan DB:** RLS aktif di semua tabel (termasuk `_prisma_migrations`) tanpa policy, dan semua hak `anon`/`authenticated` di schema `public` dicabut (termasuk default privileges). Semua akses lewat Prisma di server (`src/server/db/`).

## Alur pemesanan
1. Form: paket, tanggal (daftar Sabtu/Minggu H-3 s.d. +60 hari WIB, tanpa tanggal tutup, format Indonesia), sesi (sisa kuota dimuat per tanggal), peserta, data diri, Turnstile, honeypot `website`. Ringkasan total hanya tampilan.
2. `submitBooking`: rate limit per IP (Vercel `x-real-ip`/`x-forwarded-for`, Cloudflare `cf-connecting-ip`; 5/10 menit) → honeypot → verifikasi Turnstile di server → Zod `.strict()`.
3. `createBooking`: **semua validasi sebelum menulis apa pun** (paket aktif, tanggal, `ClosedDate`, sesi aktif & di luar jam tutup 12–15, slot tidak `isClosed`, batas peserta); harga dari DB.
4. Transaksi: `INSERT SessionSlot … ON CONFLICT DO NOTHING` → `SELECT … FOR UPDATE` → jumlahkan peserta non-`BATAL` → tolak bila > kuota → insert `Booking` (`MENUNGGU`, kode CSPRNG).
5. Klien menyimpan ringkasan di `sessionStorage` dan membuka `/pesanan/terkirim` (kode, ringkasan, tombol WA `wa.me` ter-encode).
6. Admin mengubah status; perubahan atomik (`updateMany` dengan status awal) + `BookingStatusLog`.

## Keamanan admin
Dua lapis: `requireAdminPage()` di layout & halaman `/admin` dan `requireAdminAction()` di setiap server action admin (sesi Supabase `getUser()` + allowlist `ADMIN_EMAILS`). Login: email di luar allowlist ditolak sebelum memanggil Supabase; rate limit 10/10 menit. Cookie httpOnly via `@supabase/ssr`. `proxy.ts`/middleware tidak dipakai (menambah ±1,3 MiB bundle di OpenNext). Diuji di `test/admin/`.

## Security headers
Diset di `next.config.ts` untuk semua route: CSP (self + Turnstile + iframe OpenStreetMap, `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS. `/admin/**`: `X-Robots-Tag: noindex` + `Cache-Control: no-store`.
