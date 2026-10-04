import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@/server/db/client";
import { createBooking } from "@/server/db/bookings";
import { parseDateOnly } from "@/server/booking/rules";

// Test terhadap Supabase sungguhan dengan string koneksi yang sama dengan simulasi Hyperdrive lokal
// (koneksi langsung 5432) dan konfigurasi klien yang sama dengan runtime (createPrismaClient).
// Dilewati bila env kosong.
// Hanya menghapus data yang dibuat test ini sendiri (paket/sesi bertanda __test__).
// Prioritas: pooler Vercel (DATABASE_URL, 6543) -> string Hyperdrive lokal / koneksi langsung (5432).
const url =
  process.env.DATABASE_URL ?? process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ?? process.env.DIRECT_URL;
const NOW = new Date("2026-10-01T03:00:00Z"); // Kamis 10:00 WIB
const VISIT = "2026-10-10"; // Sabtu, H-9

describe.skipIf(!url)("kuota di bawah konkurensi (DB sungguhan)", () => {
  // Beberapa klien terpisah = beberapa koneksi, meniru beberapa Worker paralel.
  const clients = Array.from(
    { length: 6 },
    () => createPrismaClient(url!, { perRequest: !process.env.DATABASE_URL }),
  );
  const db = clients[0];
  let packageId = "";
  let sessionId = "";

  beforeAll(async () => {
    const tag = `__test__${Date.now()}`;
    const pkg = await db.package.create({
      data: { slug: tag, name: "TEST", pricePerPerson: 10000, durationMinutes: 60, minParticipants: 1, maxParticipants: 30, isActive: false },
    });
    const ses = await db.session.create({
      data: { label: tag, startTime: "06:00", endTime: `07:${String(Date.now() % 60).padStart(2, "0")}`, quota: 30, isActive: true },
    });
    // Paket test non-aktif agar tidak tampil publik; aktifkan hanya untuk test ini.
    await db.package.update({ where: { id: pkg.id }, data: { isActive: true } });
    packageId = pkg.id;
    sessionId = ses.id;
  });

  afterAll(async () => {
    if (sessionId) {
      await db.booking.deleteMany({ where: { sessionId } });
      await db.sessionSlot.deleteMany({ where: { sessionId } });
      await db.session.delete({ where: { id: sessionId } });
    }
    if (packageId) await db.package.delete({ where: { id: packageId } });
    await Promise.all(clients.map((c) => c.$disconnect()));
  });

  const input = (n: number) => ({
    packageId, sessionId, visitDate: VISIT, participantCount: n,
    customerName: "Uji Konkurensi", email: "uji@example.com", whatsapp: "6281200000000",
    institution: undefined, notes: undefined,
  });

  it("6 pesanan @10 orang bersamaan, kuota 30 -> tepat 3 berhasil", async () => {
    const results = await Promise.all(clients.map((c) => createBooking(c, input(10), NOW)));
    const ok = results.filter((r) => r.ok).length;
    const rejected = results.filter((r) => !r.ok && r.error === "QUOTA_EXCEEDED").length;
    expect(ok).toBe(3);
    expect(rejected).toBe(3);
    const sum = await db.booking.aggregate({ _sum: { participantCount: true }, where: { sessionId, visitDate: parseDateOnly(VISIT)! } });
    expect(sum._sum.participantCount).toBe(30);
    expect(await db.sessionSlot.count({ where: { sessionId } })).toBe(1);
  });

  it("2 pesanan @20 bersamaan pada slot kosong baru -> hanya 1 berhasil", async () => {
    const visit2 = "2026-10-11";
    const results = await Promise.all(
      clients.slice(0, 2).map((c) => createBooking(c, { ...input(20), visitDate: visit2 }, NOW)),
    );
    expect(results.filter((r) => r.ok).length).toBe(1);
    const sum = await db.booking.aggregate({ _sum: { participantCount: true }, where: { sessionId, visitDate: parseDateOnly(visit2)! } });
    expect(sum._sum.participantCount).toBe(20);
  });

  it("validasi gagal tidak membuat SessionSlot sampah", async () => {
    const before = await db.sessionSlot.count({ where: { sessionId } });
    const r = await createBooking(db, { ...input(5), visitDate: "2026-10-14" }, NOW); // Rabu
    expect(r).toEqual({ ok: false, error: "NOT_WEEKEND" });
    const r2 = await createBooking(db, { ...input(31) , visitDate: "2026-10-17" }, NOW);
    expect(r2.ok).toBe(false);
    expect(await db.sessionSlot.count({ where: { sessionId } })).toBe(before);
  });

  it("pesanan BATAL tidak dihitung dan slot isClosed ditolak", async () => {
    await db.booking.updateMany({ where: { sessionId, visitDate: parseDateOnly(VISIT)! }, data: { status: "BATAL" } });
    expect((await createBooking(db, input(30), NOW)).ok).toBe(true);
    await db.sessionSlot.update({
      where: { sessionId_visitDate: { sessionId, visitDate: parseDateOnly("2026-10-11")! } },
      data: { isClosed: true },
    });
    expect(await createBooking(db, { ...input(1), visitDate: "2026-10-11" }, NOW)).toEqual({ ok: false, error: "SESSION_UNAVAILABLE" });
  });
});
