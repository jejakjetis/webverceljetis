-- Setup database lewat Supabase SQL Editor (tanpa terminal). Jalankan SEKALI di database kosong.
-- Isi = gabungan prisma/migrations 0001-0003. Jangan dipakai bila sudah menjalankan 'npm run db:deploy'.
BEGIN;

-- ===== 0001_init =====
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('MENUNGGU', 'DIKONFIRMASI', 'LUNAS', 'SELESAI', 'BATAL');

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "pricePerPerson" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "minParticipants" INTEGER NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "facilities" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSlot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "packageId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    "participantCount" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "customerName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "whatsapp" VARCHAR(16) NOT NULL,
    "institution" VARCHAR(150),
    "notes" VARCHAR(500),
    "status" "BookingStatus" NOT NULL DEFAULT 'MENUNGGU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "changedByEmail" VARCHAR(254) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Umkm" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "products" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "priceMin" INTEGER,
    "priceMax" INTEGER,
    "whatsapp" VARCHAR(16),
    "imageUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Umkm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" VARCHAR(300) NOT NULL,
    "answer" VARCHAR(2000) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Package_slug_key" ON "Package"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Session_startTime_endTime_key" ON "Session"("startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSlot_sessionId_visitDate_key" ON "SessionSlot"("sessionId", "visitDate");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");

-- CreateIndex
CREATE INDEX "Booking_sessionId_visitDate_status_idx" ON "Booking"("sessionId", "visitDate", "status");

-- CreateIndex
CREATE INDEX "Booking_visitDate_idx" ON "Booking"("visitDate");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingStatusLog_bookingId_createdAt_idx" ON "BookingStatusLog"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Umkm_slug_key" ON "Umkm"("slug");

-- AddForeignKey
ALTER TABLE "SessionSlot" ADD CONSTRAINT "SessionSlot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusLog" ADD CONSTRAINT "BookingStatusLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Integritas data tambahan
ALTER TABLE "Package" ADD CONSTRAINT "Package_price_check" CHECK ("pricePerPerson" >= 0);
ALTER TABLE "Package" ADD CONSTRAINT "Package_participants_check" CHECK ("minParticipants" >= 1 AND "maxParticipants" >= "minParticipants");
ALTER TABLE "Session" ADD CONSTRAINT "Session_quota_check" CHECK ("quota" >= 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_participants_check" CHECK ("participantCount" >= 1);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_price_check" CHECK ("unitPrice" >= 0 AND "totalPrice" = "unitPrice" * "participantCount");

-- Keamanan: RLS aktif di semua tabel, TANPA policy untuk anon/authenticated.
-- Akses data hanya lewat Prisma di server (role postgres melewati RLS).
ALTER TABLE "Package" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingStatusLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Umkm" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Faq" ENABLE ROW LEVEL SECURITY;

-- ===== 0002_closures_and_privileges =====
-- Penutupan sesi per tanggal
ALTER TABLE "SessionSlot" ADD COLUMN "isClosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "closedReason" VARCHAR(200);

-- Penutupan tanggal penuh
CREATE TABLE "ClosedDate" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosedDate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClosedDate_date_key" ON "ClosedDate"("date");
ALTER TABLE "ClosedDate" ENABLE ROW LEVEL SECURITY;

-- RLS untuk tabel riwayat migrasi Prisma
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Cabut semua hak role API Supabase di schema public (akses hanya lewat Prisma/server).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
-- Tabel baru yang dibuat role migrasi (postgres) juga tidak otomatis diberi hak.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- ===== 0003_rate_limit =====
CREATE TABLE "RateLimit" (
    "key" VARCHAR(100) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","windowStart")
);
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "RateLimit" FROM anon, authenticated;

COMMIT;
