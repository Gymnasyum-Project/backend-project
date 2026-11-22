# 🏋️ Gymnasyum Backend API — AI Customer Retention & Risk Prediction

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-000000?style=for-the-badge&logo=vercel&logoColor=white)

Backend RESTful API untuk **Gymnasyum**, sistem manajemen retensi anggota gym dan *private coaching* berbasis **Machine Learning Risk Prediction** dan **Retrieval-Augmented Generation (RAG)**. Sistem ini secara otomatis mendeteksi anggota yang berisiko berhenti (*At Risk* / *Need Attention*), menganalisis indikator perilaku berdasarkan SOP internal, serta menyusun draf pesan *follow-up* WhatsApp yang siap ditinjau dan dikirim oleh admin.

---

## 📋 Daftar Isi
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Struktur Proyek](#-struktur-proyek)
- [Prasyarat & Instalasi Lokal](#-prasyarat--instalasi-lokal)
- [Konfigurasi Environment Variables](#-konfigurasi-environment-variables)
- [Referensi API Endpoints](#-referensi-api-endpoints)
- [Mekanisme Otomasi & Cron Job](#-mekanisme-otomasi--cron-job)
- [Deployment (Vercel)](#-deployment-vercel)
- [Troubleshooting Umum](#-troubleshooting-umum)

---

## 🏗 Arsitektur Sistem

```text
┌──────────────────────┐       REST API (JSON)        ┌──────────────────────────────┐
│   Frontend Admin     │ ◄──────────────────────────► │   Backend Express (Vercel)   │
│   (React / Vite)     │                              │  • Auth & Customer CRUD      │
└──────────────────────┘                              │  • Prisma ORM & Cron Jobs    │
                                                      └──────┬───────────────┬───────┘
                                                             │               │
                        ┌────────────────────────────────────┘               │
                        ▼                                                    ▼
        ┌───────────────────────────────┐                    ┌───────────────────────────────┐
        │   PostgreSQL Database         │                    │   RAG & ML Microservices      │
        │   (Aiven / Supabase)          │                    │   (Modal Cloud + Groq LLM)    │
        │  • customers                  │                    │  • ML Risk Scoring            │
        │  • risk_predictions           │                    │  • ChromaDB + SOP Knowledge   │
        │  • ai_summaries               │                    │  • WhatsApp Draft Generator   │
        └───────────────────────────────┘                    └───────────────────────────────┘
```

---

## ✨ Fitur Utama

* **Customer & Package Management:** Manajemen profil anggota, riwayat kehadiran (*attendance*), sesi terlewat (*missed sessions*), *reschedule*, serta masa aktif paket latihan.
* **ML Risk Prediction Integration:** Mengklasifikasikan tingkat risiko retensi anggota (`Low Risk`, `Need Attention`, `At Risk`) beserta perhitungan `priority_score`.
* **AI Summary & RAG Follow-Up Draft:**
  * Menganalisis kondisi anggota berdasarkan metrik paket & SOP retention melalui layanan RAG (`Modal` + `Groq API`).
  * Mengekstrak bagian *WhatsApp Follow-Up Draft* secara otomatis dari respons Markdown LLM dan mengganti placeholder nama anggota.
  * Mendukung penyuntingan draf (`edited_draft`), persetujuan (`approved`), pembatalan (`discarded`), maupun pembuatan ulang (`regenerate`).
* **Automated Priority Batch Cron:** Pemrosesan terjadwal (*incremental queue*) yang memprioritaskan **5 anggota `At Risk`** dan **5 anggota `Need Attention`** dengan skor tertinggi per siklus cron untuk menjaga stabilitas kuota token API dan batas waktu *serverless*.

---

## 🛠 Tech Stack

* **Runtime & Framework:** Node.js, Express.js
* **Database & ORM:** PostgreSQL, Prisma ORM
* **AI & RAG Integration:** Modal Serverless Python (`rag-service`), Groq LLM (`openai/gpt-oss-20b`), ChromaDB
* **Authentication & Security:** JSON Web Token (JWT), bcrypt, CORS, Cron Secret Verification
* **Deployment:** Vercel Serverless Functions & Vercel Cron

---

## 📂 Struktur Proyek

```text
Backend-Gymnasyum/
├── prisma/
│   ├── schema.prisma            # Skema database & relasi tabel
│   └── migrations/              # Riwayat migrasi database
├── src/
│   ├── config/
│   │   └── prisma.js            # Inisialisasi Prisma Client
│   ├── controllers/             # Handler request & response HTTP
│   ├── integrations/
│   │   └── rag.client.js        # HTTP client komunikasi ke layanan RAG Modal
│   ├── middlewares/             # Autentikasi JWT, validasi, & error handler
│   ├── routes/                  # Definisi routing API & endpoint cron
│   ├── services/
│   │   ├── aiSummary.service.js # Generasi, ekstraksi draf WA, & caching AI summary
│   │   ├── aiBatch.service.js   # Antrean batch prioritas (At Risk & Need Attention)
│   │   └── ...                  # Service customer, prediksi, dan transaksi
│   ├── utils/
│   │   └── AppError.js          # Custom error class terstandarisasi
│   └── app.js                   # Konfigurasi Express app
├── vercel.json                  # Konfigurasi routing & jadwal Vercel Cron
├── .env.example                 # Template environment variables
└── package.json
```

---

## 🚀 Prasyarat & Instalasi Lokal

### Prasyarat
* **Node.js** versi `>= 18.x`
* **PostgreSQL** (lokal atau *cloud* seperti Aiven / Supabase)
* Endpoint layanan **RAG Service** yang sudah aktif di Modal

### Langkah Instalasi

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/waylifeaman/Backend-Gymnasyum.git
   cd Backend-Gymnasyum
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Salin dan sesuaikan file environment:**
   ```bash
   cp .env.example .env
   ```

4. **Generate Prisma Client & jalankan migrasi database:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

5. **Jalankan server development:**
   ```bash
   npm run dev
   ```
   Server akan berjalan secara default di `http://localhost:5000`.

---

## 🔐 Konfigurasi Environment Variables

Pastikan variabel berikut tersedia di file `.env` (lokal) maupun di **Vercel Project Settings → Environment Variables**:

| Variabel | Wajib | Deskripsi | Contoh Nilai |
| :--- | :---: | :--- | :--- |
| `PORT` | Tidak | Port server lokal | `5000` |
| `DATABASE_URL` | **Ya** | Connection string PostgreSQL untuk Prisma | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | **Ya** | Secret key untuk penandatanganan token autentikasi admin | `super-secret-jwt-key` |
| `RAG_URL` | **Ya** | URL endpoint web function dari layanan RAG di Modal | `https://workspace--gymnasyum-rag-fastapi-app.modal.run` |
| `RAG_API_KEY` | **Ya** | API Key untuk otorisasi request dari Express ke Modal | `rag-secret-key-123` |
| `CRON_SECRET` | **Ya** | Token keamanan untuk melindungi endpoint `/api/cron/*` | `cron-secret-token-456` |
| `FRONTEND_URL` | Tidak | Origin URL frontend untuk konfigurasi CORS | `https://frontend-project-3jco-pearl.vercel.app` |

> **Catatan Penting `RAG_URL`:** Pastikan URL tidak memiliki garis miring ganda (`/`) di bagian akhir jika `rag.client.js` sudah menambahkan path endpoint secara otomatis (misalnya `/generate`).

---

## 📡 Referensi API Endpoints

### 1. Authentication
| Method | Endpoint | Deskripsi | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/login` | Login admin dan mendapatkan JWT token | Publik |
| `GET` | `/api/auth/me` | Mengambil profil admin yang sedang login | Bearer JWT |

### 2. Customers & Predictions
| Method | Endpoint | Deskripsi | Auth |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/customers` | Daftar anggota beserta status risiko terbaru | Bearer JWT |
| `GET` | `/api/customers/:id` | Detail anggota, riwayat sesi, dan analisis risiko | Bearer JWT |
| `POST` | `/api/predictions/run` | Menjalankan prediksi risiko ML untuk anggota | Bearer JWT |

### 3. AI Summary & Follow-Up Draft
| Method | Endpoint | Deskripsi | Auth |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/customers/:id/ai-summary` | Generate (atau `regenerate=true`) analisis AI & draf WA | Bearer JWT |
| `PATCH` | `/api/ai-summaries/:id` | Memperbarui `edited_draft` atau mengubah `status` (`approved`/`discarded`) | Bearer JWT |
| `GET` | `/api/customers/:id/followup-draft` | Mengambil draf WhatsApp aktif (prioritas `edited_draft`) | Bearer JWT |

### 4. Automated Cron Jobs
| Method | Endpoint | Deskripsi | Auth |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/cron/batch-predict` | Menjalankan prediksi risiko batch otomatis | `CRON_SECRET` |
| `GET` | `/api/cron/batch-summary` | Generate AI summary untuk 5 `At Risk` & 5 `Need Attention` teratas | `CRON_SECRET` |

#### Contoh Request Manual Cron via cURL / Postman
```bash
curl -X GET "https://your-backend.vercel.app/api/cron/batch-summary?limit=10" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## ⚙️ Mekanisme Otomasi & Cron Job

Untuk menghindari *timeout* serverless (maksimal 300 detik di Vercel) dan batas *Tokens Per Minute* (TPM) pada Groq API, endpoint `/api/cron/batch-summary` menerapkan pola **antrean bertahap (*incremental queue*)**:

1. Query database menggunakan `ROW_NUMBER() OVER (PARTITION BY rp.label ORDER BY rp.priority_score DESC)` untuk menyeleksi **5 anggota `At Risk`** dan **5 anggota `Need Attention`** dengan skor prioritas tertinggi yang belum memiliki ringkasan AI aktif pada prediksi terbarunya.
2. Setiap permintaan ke layanan RAG diberi jeda **2 detik** (`delayMs = 2000`) untuk menjaga stabilitas kuota token API.
3. Anggota yang sudah memiliki draf aktif otomatis dilewati pada siklus cron berikutnya hingga seluruh anggota prioritas terproses.

---

## ☁️ Deployment (Vercel)

1. Hubungkan repository GitHub ini ke **Vercel**.
2. Masukkan seluruh variabel pada tabel [Konfigurasi Environment Variables](#-konfigurasi-environment-variables) ke pengaturan proyek Vercel (**Settings → Environment Variables**).
3. Pastikan `vercel.json` sudah dikonfigurasi untuk *serverless function* dan jadwal *cron*.
4. Setiap `git push` ke branch `main` akan otomatis memicu build dan deployment baru di Vercel.

---

## 🔧 Troubleshooting Umum

| Gejala / Error | Penyebab | Solusi |
| :--- | :--- | :--- |
| `404 modal-http: workspace ... is disabled` | Kuota kredit bulanan workspace Modal telah habis | Buat workspace/akun Modal baru, deploy ulang `modal_app.py`, lalu perbarui `RAG_URL` di Vercel. |
| `404 modal-http: invalid function call` | Format URL di `RAG_URL` tidak sesuai atau terdapat garis miring ganda | Periksa URL endpoint di Dashboard Modal dan sesuaikan nilai `RAG_URL` di Vercel lalu *Redeploy*. |
| `429 Rate limit reached (TPM)` | Batas token per menit Groq Free Tier terlampaui | Kurangi parameter `?limit=` saat pemanggilan batch atau pastikan mekanisme *retry* di `rag_service.py` aktif. |
| `followup_draft` bernilai `null` | Perubahan format heading Markdown dari model LLM | Fungsi `extractDraftWhatsapp` di `aiSummary.service.js` sudah menangani variasi heading `###` dan `**...**`. |
