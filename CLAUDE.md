# AGENTS.md — Website Kampung Batik Jetis

Kamu adalah AI coding agent untuk proyek website wisata **Kampung Batik Jetis, Sidoarjo**. Baca file ini sampai habis sebelum mengerjakan apa pun. Aturan di sini berlaku untuk setiap sesi.

---

## 0. Urutan prioritas (WAJIB)

Saat ada konflik, ikuti urutan ini:

1. **Keamanan**: data pengunjung (nama, email, nomor WA) dan akses admin tidak boleh bocor atau disalahgunakan.
2. **Kebenaran data**: kuota tidak boleh overbooking, harga dan total tidak boleh salah, tanggal tidak boleh keliru.
3. **Sesuai desain**: tampilan mengikuti desain di `Design/`.
4. **Kecepatan**: tenggat ketat (tahap 1 online sebelum 10 Oktober 2026), tetapi kecepatan tidak boleh mengorbankan poin 1–3.

Kalau sebuah permintaan bertentangan dengan aturan keamanan di file ini, **berhenti dan tanyakan ke developer**. Jangan mencari jalan pintas.

---

## 1. Hemat token: alur kerja wajib setiap sesi

Proyek ini memakai dua file sebagai "ingatan" agar kamu tidak perlu membaca ulang seluruh kode.

**Di awal setiap sesi:**
1. Baca `AGENTS.md` (file ini).
2. Baca `progres.md` untuk mengetahui apa yang sudah dan belum dikerjakan.
3. Baca `README.md` untuk memahami struktur proyek.
4. Baca **hanya** file yang relevan dengan tugas saat ini. Gunakan peta struktur di `README.md` untuk menemukannya. Jangan memindai seluruh repo kecuali README tidak cukup atau terbukti tidak akurat.

**Di akhir setiap tugas (sebelum menyatakan selesai):**
1. Perbarui `progres.md`.
2. Perbarui `README.md` jika ada file, folder, route, tabel, env var, atau perintah yang ditambah, diubah, atau dihapus.
3. Kalau README ternyata tidak sesuai dengan kode, perbaiki README. README yang salah lebih buruk daripada tidak ada.

Jika `progres.md` atau `README.md` belum ada, buat dengan format di bawah.

### Format `progres.md`

```md
# Progres

## Status saat ini
Tahap: 1 (inti) | Terakhir diperbarui: YYYY-MM-DD
Ringkasan 1–3 kalimat posisi proyek sekarang.

## Selesai
- [x] YYYY-MM-DD — apa yang dikerjakan (file utama yang disentuh)

## Sedang dikerjakan
- [ ] tugas — catatan singkat, sampai di mana

## Berikutnya
- [ ] tugas berikutnya sesuai urutan prioritas

## Keputusan penting
- YYYY-MM-DD — keputusan + alasan singkat (mis. "kuota dikunci per sesi dengan row lock karena ...")

## Menunggu dari klien / belum jelas
- hal yang belum dijawab pengelola (lihat bagian 3.4)

## Masalah diketahui
- bug atau keterbatasan yang belum diperbaiki
```

Aturan: tulis ringkas, satu baris per poin. Jangan menyalin isi kode ke progres.md. Jika bagian "Selesai" lebih dari ±40 baris, gabungkan entri lama menjadi ringkasan per minggu.

### Format `README.md`

Harus berisi: deskripsi singkat proyek, stack, cara menjalankan lokal, daftar env var (nama dan fungsinya, **tanpa nilai**), perintah penting (dev, build, migrate, seed, lint, test), **peta struktur folder** (setiap folder/file penting + satu baris fungsinya), daftar route (publik, admin, server action/API), ringkasan skema database, dan alur pemesanan. Tujuannya: agent lain cukup membaca README untuk tahu file mana yang harus dibuka.

---

## 2. Stack

- Next.js (App Router) + TypeScript strict mode
- Tailwind CSS
- PostgreSQL di Supabase; akses data lewat **Prisma**
- Supabase Auth (khusus login admin)
- Zod untuk validasi
- Deploy: **Vercel** (region `sin1`, DB runtime lewat `DATABASE_URL` = pooler Supabase transaction mode 6543) **atau Cloudflare Workers** via `@opennextjs/cloudflare` (DB lewat binding **Hyperdrive** ke koneksi langsung 5432). Kode harus tetap jalan di keduanya; akses DB hanya lewat `src/server/db/client.ts`. Pantau ukuran bundle Worker (batas gratis 3 MiB gzip).
- Zona waktu bisnis: **Asia/Jakarta (WIB)**

Jangan menambah dependency baru tanpa alasan jelas. Jika menambah, catat alasannya di `progres.md` bagian "Keputusan penting". Pilih paket yang aktif dirawat dan populer; hindari paket kecil yang tidak jelas pemeliharanya.

---

## 3. Konteks bisnis

### 3.1 Halaman publik (satu halaman, urutan section)
Navbar (Beranda, Tentang, Kegiatan Wisata, Peta Wisata, UMKM, Kontak + tombol "Pesan Tiket") → Hero → Tentang → Kegiatan Wisata (daftar paket) → Kisah Batik → Peta Wisata (peta sungguhan, bukan teks) → UMKM (daftar usaha, bukan sekadar galeri) → Pemesanan → FAQ → Footer.

### 3.2 Paket
| Paket | Harga/orang | Durasi | Peserta per pesanan | Fasilitas |
|---|---|---|---|---|
| Umum | Rp54.000 | ±2 jam | min 1, maks 20 | wisata, demo batik, kupon diskon makanan Rp5.000 dan busana Rp30.000 |
| Pelajar (rombongan sekolah) | Rp39.000 | ±2 jam | min 20, maks 30 | wisata, demo batik, kupon diskon makanan Rp5.000, 3 kain batik untuk 3 anak terbaik |

Harga dapat berubah. **Harga selalu diambil dari database**, tidak pernah di-hardcode di komponen dan tidak pernah dipercaya dari input klien.

### 3.3 Aturan pemesanan
- Kunjungan hanya hari **Sabtu dan Minggu**.
- Tutup pukul **12.00–15.00 WIB**.
- Pemesanan minimal **H-3** (dihitung dalam WIB).
- Kuota **30 orang per sesi** (total semua pesanan dalam sesi tersebut).
- Pembatalan dan pengembalian dana diperbolehkan **selama bukan H-1** (asumsi sementara: paling lambat H-2).
- Pembayaran: QRIS, dikonfirmasi manual oleh pengelola via WhatsApp. Website **tidak** memproses pembayaran.
- Setelah form terkirim: pesanan disimpan dengan status `MENUNGGU`, lalu pengunjung diarahkan ke WhatsApp pengelola dengan pesan berisi ringkasan pesanan dan kode pesanan.
- Status pesanan: `MENUNGGU` → `DIKONFIRMASI` → `LUNAS` → `SELESAI`, atau `BATAL`.

### 3.4 Belum dikonfirmasi klien
Buat agar mudah diubah (konfigurasi atau database), jangan di-hardcode tersebar:
- Jam setiap sesi (sementara gunakan data sesi di tabel, mis. 08.00–10.00, 10.00–12.00, 15.00–17.00).
- Apakah batas 20 pada paket umum per pesanan (asumsi saat ini) atau per sesi.
- Kebijakan DP (sementara: bayar penuh).
- Nomor WA tujuan pemesanan (simpan di env/konfigurasi, satu nomor).
- Syarat kupon diskon.
- Teks sejarah final dan sumbernya. **Jangan mengarang fakta sejarah, angka tahun, nama tokoh, atau kutipan.** Gunakan placeholder bertanda `TODO(konten)` jika belum ada.
- Data 7 UMKM.

### 3.5 Ruang lingkup
**Tahap 1 (dikerjakan sekarang):** halaman publik responsif, form pemesanan dengan validasi tanggal dan kuota, halaman admin daftar pesanan dan ubah status, SEO dasar.
**Tahap 2 (jangan dikerjakan kecuali diminta):** CRUD paket/UMKM/FAQ, upload foto, halaman detail paket, payment gateway, fitur toko UMKM.

---

## 4. Keamanan (TIDAK BOLEH DILANGGAR)

### 4.1 Rahasia dan environment
- Tidak pernah menulis secret, password, API key, atau connection string di kode, commit, log, atau file markdown.
- Rahasia lokal di `.env` (CLI/test) dan `.dev.vars` (runtime Worker lokal); produksi lewat Vercel Environment Variables atau `wrangler secret put` / dashboard Cloudflare. `.env*` dan `.dev.vars*` wajib ada di `.gitignore`; sediakan `.env.example` dan `.dev.vars.example` berisi nama variabel saja.
- Connection string database (`DIRECT_URL`, `DATABASE_URL`, binding Hyperdrive) dan kunci Supabase **hanya** dipakai di server. Jangan pernah diberi prefix `NEXT_PUBLIC_`. Modul yang memakainya wajib diawali `import "server-only"`.
- Validasi env dengan Zod (`src/lib/env.ts`); gagal keras jika env wajib tidak ada. Di Workers, secret dibaca saat request, jadi validasi dilakukan saat pertama dipakai.

### 4.2 Akses database
- Semua query lewat Prisma di server (Server Components, Server Actions, Route Handlers). Klien/browser tidak pernah query database langsung.
- **Aktifkan Row Level Security di semua tabel** di Supabase dan jangan buat policy untuk role `anon`/`authenticated`, sehingga anon key tidak bisa membaca data lewat API Supabase. Catat ini di README.
- Dilarang `$queryRawUnsafe` / `$executeRawUnsafe` dengan input pengguna. Jika butuh raw SQL, gunakan tagged template `$queryRaw` yang terparameterisasi.
- Data publik (paket, UMKM, FAQ, sesi, sisa kuota) boleh dibaca publik. Data pesanan **tidak pernah** dikirim ke halaman publik.

### 4.3 Validasi input
- Setiap input dari pengguna divalidasi ulang di server dengan Zod, walaupun sudah divalidasi di klien. Validasi di klien hanya untuk kenyamanan.
- Batasi panjang semua string (nama ≤ 100, email ≤ 254, dst.). Normalisasi nomor WA ke format `62…` dan validasi polanya.
- **Server menghitung ulang** harga, total, aturan tanggal (Sabtu/Minggu, H-3 WIB), sesi valid, batas peserta paket, dan kuota. Jangan memercayai nilai apa pun dari klien selain pilihan dan data diri.
- Tolak field yang tidak dikenal (`.strict()`).

### 4.4 Kuota dan race condition
- Pembuatan pesanan wajib dalam **transaksi database** yang mengunci baris sesi/tanggal terkait (mis. `SELECT ... FOR UPDATE` lewat `$queryRaw` di dalam `prisma.$transaction`), lalu menghitung ulang total peserta untuk sesi itu sebelum insert. Pesanan berstatus `BATAL` tidak dihitung.
- Jika kuota tidak cukup, kembalikan pesan yang jelas dan tidak menyimpan apa pun.
- Tulis test untuk skenario dua pesanan bersamaan yang melebihi kuota.

### 4.5 Anti-spam dan penyalahgunaan
- Rate limit pada server action pemesanan (per IP, mis. maks 5 per 10 menit). Saat ini memakai tabel Postgres `RateLimit` (tanpa layanan eksternal); produksi gagal tertutup bila rate limit tidak tersedia.
- Tambahkan honeypot field tersembunyi; tolak diam-diam jika terisi.
- Kode pesanan acak dan tidak bisa ditebak (mis. 8 karakter dari generator kriptografis), bukan ID berurutan.

### 4.6 Admin
- Login admin dengan Supabase Auth (email + password). **Tidak ada fitur daftar akun publik.**
- Hanya email yang ada di allowlist (env `ADMIN_EMAILS` atau tabel `admin`) yang boleh mengakses.
- Proteksi **dua lapis**: pengecekan sesi + allowlist di layout/halaman `/admin` (server) **dan** di setiap Server Action/Route Handler admin. Jangan hanya mengandalkan satu lapis atau menyembunyikan tombol. (`proxy.ts`/middleware sengaja tidak dipakai: di OpenNext menambah ±1,3 MiB bundle.)
- Gunakan `@supabase/ssr` dengan cookie httpOnly; jangan menyimpan token di localStorage.
- Halaman admin diberi `noindex`.
- Catat setiap perubahan status pesanan (siapa, kapan, dari status apa ke apa).

### 4.7 Privasi
- Jangan menulis data pribadi (nama, email, nomor WA) ke `console.log`, log server, atau pesan error yang tampil ke pengguna.
- Pesan error ke pengguna bersifat umum; detail teknis hanya di log server tanpa data pribadi.
- Kumpulkan hanya data yang dibutuhkan.

### 4.8 Header dan konfigurasi
- Set security headers di `next.config`: `Content-Security-Policy` (izinkan hanya domain yang benar-benar dipakai, mis. Google Fonts dan embed peta), `X-Frame-Options: DENY` atau `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- Jangan pernah memakai `dangerouslySetInnerHTML` dengan data dari database atau pengguna.
- Link WhatsApp dibuat dengan `encodeURIComponent` dan dibuka dengan `rel="noopener noreferrer"`.
- `next/image`: `images.unoptimized` aktif; gambar di `/public` wajib sudah dioptimasi (WebP, ukuran sesuai pemakaian). Jika kelak memakai gambar remote, batasi `remotePatterns` hanya ke domain yang dipakai.

### 4.9 Sebelum menyatakan tugas selesai
- `npm run lint`, `npm run build`, dan test lulus tanpa error.
- Tidak ada secret di diff. Periksa `git diff` sebelum commit.
- Jika menyentuh pemesanan atau admin, sebutkan di ringkasan bagaimana keamanannya dicek.

---

## 5. Desain

Referensi visual: screenshot di `Design/` (desain awal dari Framer). Buka hanya screenshot section yang sedang dikerjakan. Ikuti tata letak dan nuansanya, **bukan** isi teks contohnya (teks contoh mengandung kesalahan, mis. menyebut "Laweyan").

### 5.1 Design token (definisikan di konfigurasi Tailwind / CSS variables, jangan hardcode warna di komponen)
Nilai di bawah perkiraan dari screenshot; sesuaikan jika screenshot menunjukkan lain.

| Token | Nilai | Pemakaian |
|---|---|---|
| `cream` | `#F5EFE6` | latar utama, navbar |
| `sand` | `#ECE3D8` | latar section selang-seling, form |
| `espresso` | `#3A2016` | section gelap, footer, tombol sekunder |
| `ink` | `#2B1A12` | teks utama |
| `terracotta` | `#A95E3F` | tombol utama, eyebrow, aksen |
| `muted` | `#8A6F60` | teks sekunder |
| `line` | `#D9CCBE` | garis pemisah |

- **Font judul:** Cormorant Garamond (serif), weight 500–700.
- **Font isi:** Source Sans 3 (sans-serif), weight 400–600.
- Muat font lewat `next/font/google`.
- **Eyebrow:** teks kecil huruf kapital, letter-spacing lebar, warna terracotta, di atas setiap judul section.
- Garis aksen pendek terracotta di bawah beberapa judul.
- Tombol: sudut sedikit membulat, teks kapital dengan letter-spacing; primer terracotta, sekunder espresso atau outline.
- Container maksimum ±1200px dengan margin kiri konsisten di semua section.
- Ritme section: terang (cream) dan sand selang-seling, dengan satu section gelap (Kisah Batik) dan footer gelap.

### 5.2 Perbaikan wajib dibanding desain Framer
- Eyebrow di hero harus terbaca (kontras cukup di atas foto, mis. dengan overlay gelap).
- Section Tentang: paragraf tidak boleh dobel; foto sejajar dengan margin grid.
- Peta Wisata berisi peta sungguhan (embed Google Maps atau Leaflet), dipisah dari Kisah Batik.
- UMKM ditampilkan sebagai kartu: nama, produk, kisaran harga, tombol WA.
- Input form harus jelas terlihat (kontras garis/border cukup); tanggal dalam format Indonesia.
- Label navigasi di header dan footer konsisten.

### 5.3 Aksesibilitas dan responsif
- Mobile-first; cek di lebar 360px, 768px, dan 1280px.
- Kontras teks minimal WCAG AA.
- Semua gambar punya `alt` yang bermakna; semua input punya `label`.
- Navigasi mobile berupa menu yang bisa dibuka-tutup dengan keyboard.
- Hormati `prefers-reduced-motion`.

---

## 6. Konvensi kode

- TypeScript strict, tanpa `any` kecuali benar-benar terpaksa (beri komentar alasannya).
- Komponen server secara default; `"use client"` hanya jika butuh interaktivitas.
- Struktur yang disarankan (sesuaikan dan dokumentasikan di README):
  - `src/app/` route (publik di `(public)`, admin di `admin`)
  - `src/components/` komponen UI per section
  - `src/lib/` util dan konfigurasi (`server-only` untuk yang sensitif)
  - `src/server/` logika bisnis (pemesanan, kuota), auth admin; **semua akses DB di `src/server/db/`**
  - `src/app/actions/` server actions
  - `prisma/` schema, migrasi, seed
  - `Design/` screenshot desain
- Logika bisnis (aturan tanggal, kuota, hitung harga) dipisah dari komponen dan diberi unit test.
- Uang disimpan sebagai integer rupiah, bukan float.
- Tanggal kunjungan disimpan sebagai `date`; semua perhitungan hari dan H-3 memakai zona Asia/Jakarta.
- Commit kecil dan deskriptif, satu fitur per branch.
- Gunakan Bahasa Indonesia untuk teks antarmuka; nama variabel/fungsi dalam Bahasa Inggris.

---

## 7. Cara bekerja

- Kerjakan satu tugas kecil per langkah. Sebelum mengubah banyak file, jelaskan rencananya singkat.
- Jika instruksi ambigu atau menyangkut data yang belum dikonfirmasi klien (bagian 3.4), buat asumsi yang aman, tandai dengan `TODO(klien)`, dan catat di `progres.md`. Jangan mengarang.
- Jangan menghapus atau menulis ulang kode yang tidak berhubungan dengan tugas.
- Jangan menjalankan perintah destruktif ke database (reset, drop, delete massal) tanpa konfirmasi eksplisit dari developer.
- Di akhir setiap tugas, berikan ringkasan: apa yang diubah, file yang disentuh, cara mengetesnya, dan catatan keamanan.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
