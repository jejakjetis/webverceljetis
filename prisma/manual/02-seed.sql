-- Data awal (sama dengan prisma/seed.ts). Aman dijalankan ulang.
-- TODO(klien): jam sesi belum final.
INSERT INTO "Package" ("id","slug","name","pricePerPerson","durationMinutes","minParticipants","maxParticipants","facilities","sortOrder","updatedAt")
VALUES
  ('pkg_umum','umum','Paket Umum',54000,120,1,20,
   ARRAY['Wisata kampung batik','Demo membatik','Kupon diskon makanan Rp5.000','Kupon diskon busana Rp30.000'],1,now()),
  ('pkg_pelajar','pelajar','Paket Pelajar (Rombongan Sekolah)',39000,120,20,30,
   ARRAY['Wisata kampung batik','Demo membatik','Kupon diskon makanan Rp5.000','3 kain batik untuk 3 anak terbaik'],2,now())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Session" ("id","label","startTime","endTime","quota","sortOrder","updatedAt")
VALUES
  ('ses_pagi','Sesi Pagi','08:00','10:00',30,1,now()),
  ('ses_siang','Sesi Siang','10:00','12:00',30,2,now()),
  ('ses_sore','Sesi Sore','15:00','17:00',30,3,now())
ON CONFLICT ("startTime","endTime") DO NOTHING;
