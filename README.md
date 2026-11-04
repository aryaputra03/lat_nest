# Task Manager API

REST API manajemen tugas dengan autentikasi JWT (access token + refresh token), dibangun dengan NestJS sebagai latihan transisi dari Express.

## Fitur
- Register, login, refresh token (rotation), logout
- CRUD tugas dengan filter, pencarian, pagination, dan sorting
- Setiap user hanya bisa mengakses tugasnya sendiri (404, bukan 403)
- Dokumentasi Swagger, Helmet, dan rate limiting

## Tech Stack
NestJS · TypeScript · PostgreSQL (Supabase) · TypeORM · Passport JWT · argon2 · Swagger · Jest

## Prasyarat
- Node.js 20 atau lebih baru
- npm
- Project Supabase (untuk database PostgreSQL)

## Menjalankan
\`\`\`bash
git clone <url-repo>
cd task-manager-api
npm install
cp .env.example .env     # isi nilai env
npm run migration:run
npm run start:dev
\`\`\`
Swagger: http://localhost:3000/api/docs

## Environment Variables
Lihat `.env.example` dan `docs/ARCHITECTURE.md`.

## Ringkasan Endpoint
| Method | Endpoint | Keterangan | Publik? |
|---|---|---|---|
| POST | `/auth/register` | Daftar (3x/menit) | Ya |
| POST | `/auth/login` | Login (5x/menit) | Ya |
| POST | `/auth/refresh` | Perbarui token (rotation) | Perlu refresh token |
| POST | `/auth/logout` | Logout | Perlu access token |
| GET | `/tasks` | Daftar tugas (filter, search, pagination, sort) | Perlu access token |
| POST | `/tasks` | Buat tugas | Perlu access token |
| GET | `/tasks/:id` | Detail tugas | Perlu access token |
| PATCH | `/tasks/:id` | Ubah sebagian field tugas | Perlu access token |
| DELETE | `/tasks/:id` | Hapus tugas (hard delete) | Perlu access token |

Detail lengkap: `docs/API_SPEC.md`.

## Contoh Alur Pemakaian

**1. Register**
\`\`\`bash
curl -X POST http://localhost:3000/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@mail.com","password":"password123"}'
\`\`\`

**2. Login**
\`\`\`bash
curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@mail.com","password":"password123"}'
\`\`\`
Response: `{ "data": { "accessToken": "...", "refreshToken": "..." } }`

**3. Buat task (pakai accessToken)**
\`\`\`bash
curl -X POST http://localhost:3000/tasks \\
  -H "Authorization: Bearer <accessToken>" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Belajar NestJS","priority":"HIGH"}'
\`\`\`

**4. Refresh token (pakai refreshToken, bukan accessToken)**
\`\`\`bash
curl -X POST http://localhost:3000/auth/refresh \\
  -H "Authorization: Bearer <refreshToken>"
\`\`\`

## Testing
\`\`\`bash
npm run test       # unit test
npm run test:e2e   # e2e test (menyentuh database Supabase asli — lihat docs/TESTING.md)
npm run test:cov   # coverage
\`\`\`

## Dokumentasi
Arsitektur, skema database, alur auth, dan keputusan desain ada di folder `docs/`:
- `docs/ARCHITECTURE.md` — layering, struktur folder, env variables
- `docs/DATABASE.md` — skema tabel, migration, koneksi Supabase
- `docs/API_SPEC.md` — endpoint, DTO, format respons
- `docs/AUTH_FLOW.md` — alur token, rotation, checklist keamanan
- `docs/DECISIONS.md` — keputusan desain dan alasannya
- `docs/TESTING.md` — strategi testing

## Keamanan
- Password dan refresh token di-hash dengan argon2, tidak pernah disimpan/dikembalikan dalam bentuk asli
- Dua secret JWT berbeda untuk access dan refresh token
- Refresh token rotation + deteksi reuse (token lama dipakai ulang → semua sesi dipaksa logout)
- Rate limiting khusus di endpoint auth yang rawan brute force
- Task milik user lain dijawab 404 (bukan 403) untuk tidak membocorkan keberadaan data
- Helmet untuk HTTP security headers

## Di Luar Ruang Lingkup
Verifikasi email, reset password, role/admin, multi-device login, kategori/tag/subtask, soft delete, file upload, WebSocket, frontend. Lihat `docs/PROJECT_OVERVIEW.md` untuk daftar lengkap.

## Lisensi
MIT