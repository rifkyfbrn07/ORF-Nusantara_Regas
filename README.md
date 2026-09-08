# Distribusi Gas & ORF

**Operational Workforce & Shift Management**

Sistem manajemen tenaga kerja operasional, penjadwalan shift, ringkasan kehadiran berbasis jadwal, program kerja, notifikasi personal, dan monitoring manpower untuk Distribusi Gas & Onshore Receiving Facility (ORF) Muara Karang.

> Catatan: fitur check-in/check-out website belum menjadi sumber actual attendance penuh. Statistik kehadiran operasional menggunakan **Schedule Attendance Summary** berbasis jadwal kerja, bukan data hadir buatan/random.

## Fitur Utama

- **Autentikasi username + password** — username adalah credential login resmi; email hanya data profil opsional.
- **User Management** — username wajib dan unique, dapat diedit Admin, email opsional, reset password, foto profil, activate/deactivate, soft-delete, dan pencarian username/nama/employee ID.
- **Role** — `ADMIN` (1 akun utama, full access), `MANAGER`, dan `OPERATOR`. Admin tidak dapat membuat Admin kedua.
- **Jadwal Kerja** — jadwal tunggal, bulk add, Import Excel (`.xlsx`) dengan preview/validasi, template Excel, dan unique upsert `(userId, date)` tanpa menghapus jadwal existing.
- **Work Pattern** — Regular Operator: 3 Pagi → 3 Malam → 4 Off; Field/Pemantau: 4 Pagi → 2 Off. Pattern ditentukan berdasarkan posisi/job function/work pattern, bukan role.
- **Jadwal Operator** — kalender bulanan dan roster personal. Warna schedule: Pagi = blue, Malam = navy, OFF = red.
- **Program Kerja / Target** — Plan, Realisasi, Progress, Deadline, PIC, checklist, status, catatan alasan untuk `BELUM_TEREALISASI`, dan grafik tahunan berbasis database.
- **Notifikasi Personal** — recipient-specific notification dengan unread count, preview, detail, dan mark as read.
- **Search Global** — pencarian username, nama, employee ID, menu, dan program kerja sesuai permission.
- **Profil** — data user dinamis dari session/database, foto profil dari device, preview, validasi MIME/ukuran, dan fallback initials.
- **UI** — background FSRU pada login, floating login card, dashboard tetap clean, responsive, modal centered dengan internal scrolling, dan micro-interactions yang halus.

## Setup

```bash
npm install
cp .env.example .env
# isi DATABASE_URL, AUTH_SECRET, dan credential seed jika diperlukan
npx prisma migrate deploy
npx prisma generate
npm run seed:regas
npm run dev
```

## Akun Demo

Akun seed mengikuti environment/configuration yang digunakan saat seed. Login selalu menggunakan **username**, bukan email.

## Verifikasi

```bash
npx prisma validate
npx prisma generate
npm run lint
npx tsc --noEmit
npm run build
```

Jangan menggunakan `npx prisma migrate reset` pada production.
