# Deploy ke Cloudflare Workers

Panduan deploy manual Website Kampung Batik Jetis (Next.js 16 + OpenNext Cloudflare + Supabase via Hyperdrive). Ikuti berurutan. **Jangan menulis nilai secret di file mana pun di repo.**

## 0. Prasyarat

- Akun Cloudflare (domain sebaiknya dikelola di Cloudflare DNS).
- Project Supabase region **Singapura (ap-southeast-1)**.
- Node.js sesuai `package.json`, repo sudah `npm install`.
- `npx wrangler login` (sekali, membuka browser).

### Paket Workers: gratis atau Paid

| | Gratis | Paid ($5/bulan) |
|---|---|---|
| Batas ukuran Worker (gzip) | 3 MiB | 10 MiB |
| Ukuran saat ini | ±2,5 MiB (lihat `progres.md`) | |
| CPU per request | 10 ms | 30 s (default) |

Ukuran sekarang muat di paket gratis, tetapi sisa ruangnya sempit (±0,5 MiB) dan batas CPU 10 ms bisa terlampaui pada render halaman dengan Prisma. **TODO(klien): putuskan paket.** Rekomendasi: mulai dari Paid bila anggaran ada; jika gratis, pantau error `Exceeded CPU` di Observability setelah deploy.

## 1. Database Supabase

1. Ambil **connection string langsung** (Project Settings → Database → Connection string → *Direct connection*, port **5432**). Jangan pakai pooler (6543) untuk Hyperdrive.
2. Isi `.env` lokal (lihat `.env.example`): `DIRECT_URL` dan `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` (nilai sama).
3. Terapkan migrasi dan seed:
   ```bash
   npm run db:deploy
   npm run db:seed
   ```
4. Supabase Dashboard → **Advisors → Security Advisor**: harus bersih (RLS aktif di semua tabel termasuk `_prisma_migrations`, hak `anon`/`authenticated` dicabut oleh migrasi 0002/0003).
5. Supabase → Authentication:
   - **Matikan pendaftaran publik** (Sign In / Providers → Allow new users to sign up: OFF).
   - Buat akun admin manual (Users → Add user) untuk setiap email di `ADMIN_EMAILS`.
   - Disarankan: JWT expiry 8 jam (tanpa middleware, sesi admin tidak diperpanjang otomatis di halaman; admin login ulang setelah token kedaluwarsa).
6. Uji konkurensi terhadap DB sungguhan: `npm test` (test integrasi berjalan bila `.env` terisi).

## 2. Hyperdrive

```bash
npx wrangler hyperdrive create kampung-batik-jetis-db --connection-string="<DIRECT CONNECTION STRING>"
```

Salin `id` yang dihasilkan ke `wrangler.jsonc` → `hyperdrive[0].id` (ganti placeholder `000…`). Jalankan `npm run cf-typegen` bila mengubah `wrangler.jsonc`.

## 3. Turnstile (anti-spam form)

1. Cloudflare Dashboard → Turnstile → Add widget. Hostname: domain produksi (dan `*.workers.dev` bila ingin menguji di sana). Mode: Managed.
2. Catat **site key** dan **secret key** (dipakai di langkah 4). Test key (`1x000…AA`) **hanya** untuk lokal.

## 4. Secret dan variabel runtime

Isi lewat `wrangler secret put <NAMA>` (atau Dashboard → Workers → Settings → Variables and Secrets):

| Nama | Isi |
|---|---|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_ANON_KEY` | anon/publishable key Supabase |
| `ADMIN_EMAILS` | email admin, dipisah koma |
| `BOOKING_WHATSAPP_NUMBER` | nomor WA pengelola, format `62…` |
| `SITE_URL` | URL produksi, mis. `https://domain-anda` |
| `TURNSTILE_SITE_KEY` | site key produksi |
| `TURNSTILE_SECRET_KEY` | secret key produksi |

Tidak ada `DATABASE_URL` di produksi: database lewat binding `HYPERDRIVE`.

## 5. Rate limit

Rate limit pemesanan (5 per 10 menit per IP) dan login admin (10 per 10 menit per IP) memakai tabel Postgres `RateLimit` — tidak perlu binding tambahan. Opsional, tambahan lapisan di depan: Dashboard → Security → WAF → Rate limiting rules untuk `POST /` (server action) bila terjadi serangan volume besar.

Tabel `RateLimit` bertambah seiring waktu; bersihkan berkala (mis. bulanan) lewat SQL Editor:
```sql
DELETE FROM "RateLimit" WHERE "windowStart" < now() - interval '1 day';
```

## 6. Build dan deploy

```bash
npm run lint && npm run typecheck && npm test
npm run deploy        # opennextjs-cloudflare build && deploy
```

Periksa ukuran pada output (`Total Upload … / gzip …`) terhadap batas paket.

## 7. Domain

Dashboard → Workers → `kampung-batik-jetis` → Settings → Domains & Routes → **Add Custom Domain**. Setelah aktif, pastikan `SITE_URL` sama dengan domain ini dan hostname Turnstile mencakupnya.

## Alternatif: tanpa terminal (dashboard saja)

1. **DB:** Supabase → SQL Editor → tempel & jalankan `prisma/manual/01-setup.sql` (sekali, DB kosong), lalu `prisma/manual/02-seed.sql`. Jangan dicampur dengan `npm run db:deploy` (riwayat migrasi Prisma tidak tercatat lewat cara ini).
2. **Hyperdrive:** Cloudflare Dashboard → Storage & Databases → Hyperdrive → Create (direct connection 5432). Salin id ke `wrangler.jsonc` lewat editor web GitHub.
3. **Build:** Workers & Pages → Create → Import a repository (GitHub) → build command `npx opennextjs-cloudflare build`, deploy command `npx opennextjs-cloudflare deploy`.
4. **Secret:** Worker → Settings → Variables and Secrets (tipe *Secret*), daftar sama dengan langkah 4.
5. Langkah 3, 7, 8 sama (Turnstile, domain, checklist).

## 8. Checklist pasca-deploy

- [ ] `curl -I https://domain/` menampilkan `content-security-policy`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy`, `permissions-policy`, `strict-transport-security`.
- [ ] `curl -I https://domain/admin` → `307` ke `/admin/login`, dengan `x-robots-tag: noindex, nofollow`.
- [ ] `https://domain/robots.txt` dan `/sitemap.xml` memakai domain produksi.
- [ ] Halaman utama tampil; daftar paket dan harga dari DB benar; peta muncul.
- [ ] Uji pemesanan nyata: pilih tanggal → sisa kuota tampil → kirim → muncul kode pesanan → tombol WhatsApp membuka chat ke nomor pengelola dengan ringkasan yang benar.
- [ ] Pesanan muncul di `/admin` dengan status Menunggu; ubah status → riwayat tercatat.
- [ ] Login dengan email di luar allowlist ditolak.
- [ ] Batalkan pesanan uji (status Batal) agar kuota kembali.
- [ ] Workers → Observability: tidak ada error / `Exceeded CPU`.
- [ ] Catat semua akun (domain, Cloudflare, Supabase) untuk serah terima ke Pokdarwis.
