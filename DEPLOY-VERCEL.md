# Deploy ke Vercel

Kode yang sama juga bisa dideploy ke Cloudflare (lihat `DEPLOY.md`). Di Vercel, database diakses lewat **pooler Supabase mode transaction (port 6543)** melalui env `DATABASE_URL`. Semua langkah bisa lewat dashboard (tanpa terminal).

## 1. Supabase

1. Buat project, region **Singapore**.
2. Siapkan tabel (pilih SATU cara, jangan dicampur):
   - **Tanpa terminal:** SQL Editor → jalankan `prisma/manual/01-setup.sql`, lalu `prisma/manual/02-seed.sql`.
   - **Dengan terminal:** isi `DIRECT_URL` (koneksi langsung 5432) di `.env`, lalu `npm run db:deploy && npm run db:seed`.
3. Advisors → **Security Advisor** harus bersih.
4. Authentication: matikan *Allow new users to sign up*; buat akun admin di Users → Add user. Disarankan JWT expiry 8 jam.
5. Catat:
   - **Project URL** dan **anon key** (Project Settings → API).
   - **Connection string pooler, mode Transaction, port 6543** (tombol *Connect* → Transaction pooler). Ini untuk `DATABASE_URL`.

## 2. Turnstile (Cloudflare, gratis)

Cloudflare Dashboard → Turnstile → Add widget → hostname: domain produksi dan `<project>.vercel.app`. Catat site key dan secret key.

## 3. Vercel

1. Push repo ke GitHub (tanpa `.env`, `.dev.vars`, `node_modules`, `.next`, `.open-next`).
2. Vercel → **Add New → Project** → import repo. Framework terdeteksi Next.js; build command default (`npm run build` = `prisma generate && next build`).
3. **Environment Variables** (Production; tambahkan juga ke Preview bila dipakai):

| Nama | Isi |
|---|---|
| `DATABASE_URL` | pooler Supabase **transaction mode, port 6543** |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon key |
| `ADMIN_EMAILS` | email admin, dipisah koma |
| `BOOKING_WHATSAPP_NUMBER` | nomor WA pengelola, format `62…` |
| `SITE_URL` | `https://domain-anda` (atau URL `.vercel.app` sementara) |
| `TURNSTILE_SITE_KEY` | site key produksi |
| `TURNSTILE_SECRET_KEY` | secret key produksi |

   `DIRECT_URL` **tidak** perlu di Vercel (hanya untuk migrasi dari laptop).
4. Deploy. Region fungsi sudah diset ke **Singapura (`sin1`)** lewat `vercel.json`.
5. Domain: Project → Settings → Domains → Add. Setelah aktif, samakan `SITE_URL` lalu **Redeploy** (env baru terbaca setelah redeploy).

## 4. Checklist pasca-deploy

- [ ] Server tidak error saat start (Vercel → Logs). Jika ada `Env tidak valid atau belum diisi: …`, lengkapi env lalu redeploy.
- [ ] Header keamanan: buka situs → F12 → Network → request pertama → Response Headers, atau cek di securityheaders.com (CSP, X-Frame-Options, HSTS, dll.).
- [ ] `/admin` mengarah ke `/admin/login`; header `X-Robots-Tag: noindex`.
- [ ] `/robots.txt` dan `/sitemap.xml` memakai domain produksi.
- [ ] Uji pemesanan nyata: pilih tanggal → sisa kuota → kirim → kode pesanan → WhatsApp terbuka dengan ringkasan benar.
- [ ] Pesanan tampil di `/admin`; ubah status → riwayat tercatat. Login email di luar allowlist ditolak.
- [ ] Batalkan pesanan uji (status Batal).

## Catatan

- Rate limit (5 pesanan/10 menit per IP, 10 login/10 menit) memakai tabel Postgres `RateLimit` — tidak perlu Upstash. IP diambil dari header Vercel (`x-real-ip`/`x-forwarded-for`). Bersihkan berkala: `DELETE FROM "RateLimit" WHERE "windowStart" < now() - interval '1 day';`
- Prisma memakai compiler `small` (untuk batas ukuran Cloudflare); di Vercel tetap berfungsi, hanya sedikit lebih lambat. Bila hanya memakai Vercel, boleh dihapus dari `prisma/schema.prisma`.
- Tidak perlu `vercel.json` cron (tidak ada pekerjaan terjadwal).
