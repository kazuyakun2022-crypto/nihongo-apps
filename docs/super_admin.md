# 🛡️ Dokumentasi Lengkap Arsitektur & Implementasi Super Admin — NihonGo

Dokumen ini mendefinisikan rancangan, kebijakan keamanan, spesifikasi API, skema database, serta alur penggunaan peran **Super Admin** di platform NihonGo.

---

## 1. Latar Belakang & Tujuan

Sebelumnya, platform NihonGo memiliki lima peran pengguna (`Role`):
1. `guest`: Pengguna tanpa akun yang mencoba fitur awal.
2. `student`: Pengguna terdaftar gratis.
3. `premium`: Pengguna berlangganan dengan akses bab N3–N1 dan percakapan AI tanpa batas.
4. `teacher`: Pengajar yang dapat membuat bab materi dan skenario percakapan.
5. `admin`: Pengelola konten dan moderasi akun biasa.

### Mengapa Super Admin Diperlukan?
Pada skala produksi, peran `admin` biasa memiliki batasan keamanan penting:
- **Pemisahan Kewenangan (Separation of Privilege)**: Admin biasa tidak boleh dapat mengubah role sesama Admin, mempromosikan akun biasa menjadi Admin, atau menonaktifkan akun tingkat pimpinan.
- **Konfigurasi AI Global**: Penyesuaian instruksi dasar (`system_prompt`), rasio kecepatan suara AI (`speech_rate`), serta aturan furigana per level JLPT (N5–N1) berdampak ke seluruh siswa dan model biaya AI API, sehingga hanya boleh diatur oleh Super Admin.
- **Override Status Langganan**: Super Admin membutuhkan kemampuan memberikan status akses Premium secara manual untuk keperluan kerja sama institusi, beasiswa, pengujian, atau kompensasi pengguna.
- **Audit Trail & Forensik**: Seluruh aktivitas administratif (perubahan role, suspend akun, pembaruan prompt AI) harus tercatat ke dalam `AuditLog` dan hanya dapat dipantau secara menyeluruh oleh Super Admin.

---

## 2. Matriks Hak Akses (Role & Permission Matrix)

Tabel berikut menunjukkan hierarki dan hak akses setiap peran dalam platform:

| Fitur / Kemampuan | Guest | Student | Premium | Teacher | Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Belajar N5 & N4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Belajar N3, N2, N1 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Fitur Tanya Sensei AI | Terbatas | 5x / hari | Tanpa Batas | Tanpa Batas | Tanpa Batas | Tanpa Batas |
| Buat Draf Bab & Skenario | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Publikasi/Setujui Materi Bab | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cari & Lihat Daftar Pengguna | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Suspend Pengguna Siswa/Tamu | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ubah Role Siswa (Student ↔ Premium) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Angkat / Turunkan Role Admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Suspend / Blokir Akun Admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Kelola AI Level Prompts & Furigana | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Beri / Cabut Langganan Premium Manual | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Akses Seluruh Catatan Audit Log | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Melihat Metrik & Statistik Sistem | ❌ | ❌ | ❌ | ❌ | ✅ (Ringkas) | ✅ (Penuh) |

---

## 3. Aturan Keamanan & Hierarki (Security Invariants)

1. **Prinsip Imunitas Diri (Self-Protection Invariant)**:
   - Seorang Admin atau Super Admin **tidak dapat** mengubah rolenya sendiri.
   - Seorang Admin atau Super Admin **tidak dapat** men-suspend akunnya sendiri.
2. **Prinsip Pembatasan Tingkat Atas (No Upward Modification)**:
   - Pengguna dengan role `admin` **dilarang**:
     - Mengubah akun `admin` lain atau akun `super_admin`.
     - Menaikkan user manapun menjadi `admin` atau `super_admin`.
     - Men-suspend sesama `admin` atau `super_admin`.
3. **Pewarisan Hak Akses Otomatis (Hierarchical Inheritance)**:
   - Setiap rute backend yang memanggil middleware `requireRole("admin")` secara otomatis mengizinkan `super_admin` untuk lewat, sehingga tidak perlu penulisan ganda berulang pada kode controller.

---

## 4. Perubahan Skema Database

### Penambahan Enum Role
Di file `apps/api/prisma/schema.prisma`:
```prisma
enum Role {
  guest
  student
  premium
  teacher
  admin
  super_admin
}
```

### Model Pendukung yang Terintegrasi
1. **`User`**: Memiliki relasi ke `AuditLog`, `Subscription`, `AiLevelPrompt`, dan `Chapter`.
2. **`AuditLog`**:
   - `actorId` (UUID): ID admin/super admin yang melakukan aksi.
   - `targetUserId` (UUID nullable): ID pengguna sasaran jika relevan.
   - `action` (VarChar 50): Kode aksi, misal `change_role`, `suspend`, `grant_subscription`, `update_ai_prompt`.
   - `details` (JSON): Metadata perubahan (misal: `{ from: "student", to: "teacher" }`).
   - `createdAt` (Timestamptz): Waktu eksekusi.
3. **`AiLevelPrompt`**:
   - `levelId` (1..6): Relasi ke tingkat JLPT.
   - `systemPrompt`: Instruksi AI untuk level tersebut.
   - `maxSentenceWords`: Batas jumlah kata per kalimat maskot.
   - `furiganaRule`: `full` | `hard_only` | `none`.
   - `speechRate`: Kecepatan artikulasi suara TTS (misal 0.7x hingga 1.0x).
   - `updatedById`: ID Super Admin yang terakhir mengubah konfigurasi.
4. **`Subscription`**:
   - Pencatatan status langganan aktif, kedaluwarsa, atau manual grant oleh Super Admin.

---

## 5. Spesifikasi REST API Admin & Super Admin

Semua endpoint di bawah ini membutuhkan header `Authorization: Bearer <accessToken>`.

### 5.1. Manajemen Pengguna (`/api/admin/users`)
- **`GET /api/admin/users`**
  - **Akses**: `admin`, `super_admin`
  - **Query Params**: `q` (string), `role` (enum), `status` (enum), `page` (int), `pageSize` (int)
  - **Respon**: `{ items: UserListItem[], total: number }`

- **`PATCH /api/admin/users/:userId/role`**
  - **Akses**: `admin` (terbatas pada non-admin target), `super_admin` (penuh)
  - **Body**: `{ "role": "teacher" | "premium" | "admin" | ... }`
  - **Respon**: `204 No Content`
  - **Audit Log**: Dicatat otomatis dengan action `change_role`.

- **`POST /api/admin/users/:userId/suspend`**
  - **Akses**: `admin` (hanya target siswa/tamu/guru), `super_admin` (semua kecuali sesama super_admin)
  - **Body**: `{ "reason": "Pelanggaran pedoman komunitas" }`
  - **Respon**: `204 No Content`
  - **Audit Log**: Dicatat dengan action `suspend`.

### 5.2. Konfigurasi AI Global (`/api/admin/ai-prompts`)
- **`GET /api/admin/ai-prompts`**
  - **Akses**: `super_admin`, `admin` (read-only)
  - **Respon**: Daftar prompt per level dari Level 1 (Pemula) hingga Level 6 (N1).
- **`PUT /api/admin/ai-prompts/:levelId`**
  - **Akses**: `super_admin` eksklusif
  - **Body**:
    ```json
    {
      "systemPrompt": "Pakai kosakata dan pola tata bahasa N5 saja...",
      "maxSentenceWords": 10,
      "furiganaRule": "full",
      "speechRate": 0.8
    }
    ```
  - **Audit Log**: Dicatat dengan action `update_ai_prompt`.

### 5.3. Audit Log Keamanan (`/api/admin/audit-logs`)
- **`GET /api/admin/audit-logs`**
  - **Akses**: `super_admin` eksklusif
  - **Query Params**: `page`, `pageSize`, `action`
  - **Respon**:
    ```json
    {
      "items": [
        {
          "id": 1,
          "action": "change_role",
          "actor": { "id": "...", "displayName": "Super Admin", "email": "..." },
          "target": { "id": "...", "displayName": "Budi Sensei", "email": "..." },
          "details": { "from": "student", "to": "teacher" },
          "createdAt": "2026-10-25T12:00:00Z"
        }
      ],
      "total": 1
    }
    ```

### 5.4. Pemberian Akses Premium Manual (`/api/admin/subscriptions/grant`)
- **`POST /api/admin/subscriptions/grant`**
  - **Akses**: `super_admin` eksklusif
  - **Body**:
    ```json
    {
      "userId": "uuid-pengguna",
      "durationDays": 30,
      "reason": "Beasiswa Studi Jepang"
    }
    ```
  - **Respon**: `200 OK`
  - **Audit Log**: Dicatat dengan action `grant_subscription`.

### 5.5. Ringkasan Metrik Sistem (`/api/admin/stats`)
- **`GET /api/admin/stats`**
  - **Akses**: `admin`, `super_admin`
  - **Respon**:
    ```json
    {
      "totalUsers": 124,
      "activeUsers": 98,
      "roleBreakdown": { "student": 80, "premium": 15, "teacher": 5, "admin": 3, "super_admin": 1 },
      "totalConversations": 412,
      "totalReviewsDue": 89
    }
    ```

---

## 6. Antarmuka Pengguna (Frontend Portal)

Frontend Portal Admin dibuat di rute `/admin` dengan desain modern, responsif, dan terintegrasi:
1. **Navigasi Tab Interaktif**:
   - 📊 **Ringkasan (Overview)**: Kartu statistik metrik sistem real-time.
   - 👥 **Kelola Pengguna (Users)**: Pencarian nama/email, penyaringan role/status, modal ubah role, dan tindakan blokir/suspend.
   - 🤖 **Konfigurasi AI (AI Prompts)**: Editor instruksi AI per level JLPT, pengaturan slider kecepatan bicara, dan aturan furigana.
   - 📜 **Log Audit (Audit Trail)**: Catatan riwayat aksi keamanan dan forensik sistem.
2. **Proteksi Tampilan (UI Guards)**:
   - Komponen memeriksa `user.role === "admin" || user.role === "super_admin"`. Jika bukan, pengguna diarahkan kembali ke `/beranda`.
   - Tombol-tombol berisiko tinggi (mengangkat Admin, mengatur AI, audit log) secara otomatis dinonaktifkan atau disembunyikan jika yang login hanyalah `admin` biasa.

---

## 7. Data Awal & Kredensial Pengujian

Setelah database di-seed (`npm run db:seed`), sistem menyediakan dua akun pengelola:

| Role | Email | Password Standar | Catatan |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@nihongo.local` | `SuperAdmin12345` | Akses sistem tak terbatas |
| **Admin** | `admin@nihongo.local` | `Admin12345` | Pengelolaan siswa & konten |
