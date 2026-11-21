// prisma/seed.js
//
// Data dummy: 500 customer + paket, kehadiran, reminder, prediksi risiko, ringkasan AI.
//
// Lokal  : npx prisma db seed
// Aiven  : set DATABASE_URL ke URI Aiven, DB_CA_PATH ke file ca.pem, dan SEED_CONFIRM=yes
//          (seed ini MENGHAPUS semua data lama di database tujuan).
//
// KEEP_USERS=yes : akun di tabel users TIDAK dihapus (hanya admin@gymnasyum.id yang
//                  ditambahkan kalau belum ada). Data lain tetap diganti.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// Koneksi + pengaman
// ---------------------------------------------------------------------------
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset.");
  process.exit(1);
}
const dbUrl = new URL(process.env.DATABASE_URL);
const isLocal = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
  dbUrl.hostname,
);
if (!isLocal && process.env.SEED_CONFIRM !== "yes") {
  console.error(
    `Seed ini MENGHAPUS semua data di database "${dbUrl.hostname}".\n` +
      `Kalau memang itu yang diinginkan, jalankan lagi dengan SEED_CONFIRM=yes.`,
  );
  process.exit(1);
}

// Aiven memakai sertifikat sendiri: berikan ca.pem lewat DB_CA_PATH.
// "sslmode" dibuang dari URL karena pg membiarkannya menimpa opsi ssl di bawah.
let connectionString = process.env.DATABASE_URL;
const poolConfig = {};
if (process.env.DB_CA_PATH) {
  dbUrl.searchParams.delete("sslmode");
  connectionString = dbUrl.toString();
  poolConfig.ssl = { ca: fs.readFileSync(process.env.DB_CA_PATH, "utf8") };
}

// Inisialisasi Prisma v7 dengan Driver Adapter
const pool = new Pool({ connectionString, ...poolConfig });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Konfigurasi data
// ---------------------------------------------------------------------------
const TOTAL_CUSTOMERS = 500;
const SEGMENTS = ["ibu_ibu", "lansia", "menengah_atas", "lainnya"];
const SERVICES = ["gym", "private_coaching"];
const COACHES = [
  "Coach Rina",
  "Coach Budi",
  "Coach Dewi",
  "Coach Andi",
  "Coach Maya",
];

const FIRST_NAMES = [
  "Sari",
  "Hendra",
  "Rina",
  "Agus",
  "Melati",
  "Laras",
  "Doni",
  "Fitri",
  "Rudi",
  "Nadia",
  "Irwan",
  "Citra",
  "Budi",
  "Yuni",
  "Eko",
  "Wati",
  "Hadi",
  "Dewi",
  "Joko",
  "Ani",
  "Bambang",
  "Siti",
  "Tono",
  "Ratna",
  "Dedi",
  "Indah",
  "Slamet",
  "Yanti",
  "Rizky",
  "Lina",
  "Dimas",
  "Putri",
  "Fajar",
  "Ayu",
  "Bayu",
  "Nisa",
  "Arif",
  "Maya",
  "Wahyu",
  "Dian",
  "Bagus",
  "Tari",
  "Andi",
  "Mega",
  "Reza",
  "Intan",
  "Ilham",
  "Vina",
  "Galih",
  "Wulan",
];

const LAST_NAMES = [
  "Dewi",
  "Wijaya",
  "Susanti",
  "Santoso",
  "Putri",
  "Wulandari",
  "Prasetyo",
  "Handayani",
  "Hartono",
  "Permata",
  "Kusuma",
  "Lestari",
  "Setiawan",
  "Astuti",
  "Prabowo",
  "Suryani",
  "Nugroho",
  "Kurniawati",
  "Susilo",
  "Rahayu",
  "Hermawan",
  "Aminah",
  "Sari",
  "Kurniawan",
  "Permatasari",
  "Riyadi",
  "Oktaviani",
  "Pratama",
  "Marlina",
  "Saputra",
  "Utami",
  "Hidayat",
  "Anggraini",
  "Firmansyah",
  "Puspitasari",
  "Ramadhan",
  "Safitri",
  "Gunawan",
  "Maharani",
  "Wibowo",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---------------------------------------------------------------------------
async function main() {
  console.time("Total waktu seed");
  console.log("Menghapus data lama...");
  await prisma.followup_logs.deleteMany();
  await prisma.ai_summaries.deleteMany();
  await prisma.risk_predictions.deleteMany();
  await prisma.model_versions.deleteMany();
  await prisma.reminders.deleteMany();
  await prisma.reschedules.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.customer_packages.deleteMany();
  await prisma.packages.deleteMany();
  await prisma.customers.deleteMany();
  if (process.env.KEEP_USERS === "yes") {
    console.log("KEEP_USERS=yes: akun users dipertahankan.");
  } else {
    await prisma.users.deleteMany();
  }

  console.log("Menyiapkan user admin...");
  const passwordHash = await bcrypt.hash("admin123", 10);
  const adminData = {
    name: "Admin Gymnasyum",
    no_tlp: "082235543178",
    email: "admin@gymnasyum.id",
    password_hash: passwordHash,
    role: "admin",
  };
  // dipakai kalau sudah ada (KEEP_USERS), dibuat kalau belum
  const adminUser =
    (await prisma.users.findFirst({ where: { email: adminData.email } })) ??
    (await prisma.users.create({ data: adminData }));

  console.log("Membuat master paket...");
  const packageList = await Promise.all([
    prisma.packages.create({
      data: {
        name: "Paket Gym 10 Sesi",
        service_type: "gym",
        total_sessions: 10,
        duration_days: 60,
        price: 800000,
      },
    }),
    prisma.packages.create({
      data: {
        name: "Paket Private Coaching 8 Sesi",
        service_type: "private_coaching",
        total_sessions: 8,
        duration_days: 45,
        price: 1500000,
      },
    }),
  ]);

  console.log("Membuat model_versions...");
  await prisma.model_versions.create({
    data: {
      version: "v1.0-baseline",
      algorithm: "Logistic Regression",
      metrics: { accuracy: 0.68, f1_macro: 0.66, recall_macro: 0.65 },
      trained_at: daysAgo(14),
      is_active: false,
    },
  });

  const activeModel = await prisma.model_versions.create({
    data: {
      version: "v1.1-random-forest",
      algorithm: "Random Forest",
      metrics: { accuracy: 0.84, f1_macro: 0.83, recall_macro: 0.84 },
      trained_at: daysAgo(3),
      is_active: true,
    },
  });

  console.log(`Menyiapkan ${TOTAL_CUSTOMERS} data customer...`);

  // Proporsi risiko: 40% low, 35% medium, 25% high
  const lowCount = Math.floor(TOTAL_CUSTOMERS * 0.4);
  const medCount = Math.floor(TOTAL_CUSTOMERS * 0.35);
  const highCount = TOTAL_CUSTOMERS - lowCount - medCount;

  const riskProfiles = [
    ...Array(lowCount).fill("low"),
    ...Array(medCount).fill("medium"),
    ...Array(highCount).fill("high"),
  ].sort(() => Math.random() - 0.5);

  const labelByProfile = {
    low: "Active",
    medium: "Need Attention",
    high: "At Risk",
  };

  const probabilitiesByLabel = {
    Active: { Active: 0.75, "Need Attention": 0.18, "At Risk": 0.07 },
    "Need Attention": { Active: 0.2, "Need Attention": 0.55, "At Risk": 0.25 },
    "At Risk": { Active: 0.05, "Need Attention": 0.2, "At Risk": 0.75 },
  };

  // 1. Insert customer sekaligus & ambil ID-nya
  const customersPayload = Array.from({ length: TOTAL_CUSTOMERS }, (_, i) => {
    const fullName = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
    const slug = fullName.toLowerCase().replace(/\s+/g, ".");
    return {
      full_name: fullName,
      phone: `08${randomInt(10, 99)}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
      email: `${slug}.${i + 1}@email.com`,
      birth_date: daysAgo(randomInt(8000, 20000)),
      segment: randomFrom(SEGMENTS),
      service_type: randomFrom(SERVICES),
      join_date: daysAgo(randomInt(60, 700)),
      notes: null,
    };
  });

  const createdCustomers = await prisma.customers.createManyAndReturn({
    data: customersPayload,
  });

  // 2. Rencanakan paket, kehadiran, dan reminder tiap customer di memori dulu.
  //    Semua angka diturunkan dari data yang sama, supaya konsisten:
  //    sisa sesi = total sesi - jumlah hadir, kehadiran tidak mendahului tanggal mulai
  //    paket, dan fitur prediksi dihitung dari kehadiran/reminder yang dibuat.
  const customerPackagesPayload = [];
  const plans = [];

  for (let i = 0; i < createdCustomers.length; i++) {
    const customer = createdCustomers[i];
    const profile = riskProfiles[i];
    const pkgItem = randomFrom(packageList);

    // paket aktif: dimulai 10-40 hari lalu, masih tersisa minimal 5 hari
    const daysSinceStart = randomInt(
      10,
      Math.min(40, pkgItem.duration_days - 5),
    );
    const startDate = daysAgo(daysSinceStart);
    const endDate = new Date(
      startDate.getTime() + pkgItem.duration_days * DAY_MS,
    );

    const totalJadwal = randomInt(6, 10);
    let attendedCount, missedCount;
    if (profile === "low") {
      attendedCount = Math.floor(totalJadwal * 0.8);
      missedCount = randomInt(0, 1);
    } else if (profile === "medium") {
      attendedCount = Math.floor(totalJadwal * 0.45);
      missedCount = randomInt(2, 3);
    } else {
      attendedCount = Math.floor(totalJadwal * 0.15);
      missedCount = randomInt(3, 6);
    }
    attendedCount = Math.min(attendedCount, pkgItem.total_sessions);

    const remainingSessions = Math.max(
      0,
      pkgItem.total_sessions - attendedCount,
    );

    // kehadiran hanya setelah paket dimulai & maksimal 29 hari ke belakang
    const maxBack = Math.min(29, daysSinceStart);
    let lastAttendedDay = null;
    const sessions = [];
    for (let j = 0; j < totalJadwal; j++) {
      const daysBack = randomInt(0, maxBack);
      let status;
      if (j < attendedCount) {
        status = "attended";
        if (lastAttendedDay === null || daysBack < lastAttendedDay) {
          lastAttendedDay = daysBack;
        }
      } else if (j < attendedCount + missedCount) {
        status = "missed";
      } else {
        // belum ada baris di tabel reschedules -> tampil sebagai "menunggu kedatangan"
        status = "rescheduled";
      }
      sessions.push({ daysBack, status });
    }

    const reminders = [];
    const reminderCount = randomInt(2, 4);
    for (let k = 0; k < reminderCount; k++) {
      const responded =
        profile === "low"
          ? Math.random() < 0.8
          : profile === "medium"
            ? Math.random() < 0.4
            : Math.random() < 0.15;
      reminders.push({ daysBack: randomInt(1, 28), responded });
    }

    customerPackagesPayload.push({
      customer_id: customer.id,
      package_id: pkgItem.id,
      start_date: startDate,
      end_date: endDate,
      total_sessions: pkgItem.total_sessions,
      remaining_sessions: remainingSessions,
      status: "active",
    });

    plans.push({
      customer,
      profile,
      pkgItem,
      daysSinceStart,
      attendedCount,
      missedCount,
      remainingSessions,
      lastAttendedDay,
      sessions,
      reminders,
    });
  }

  console.log("Menyimpan customer_packages...");
  const createdPackages = await prisma.customer_packages.createManyAndReturn({
    data: customerPackagesPayload,
  });

  // 3. Susun attendance, reminders, dan risk_predictions
  const attendancePayload = [];
  const remindersPayload = [];
  const predictionsPayload = [];
  const summaryTemplates = [];

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const customerPackage = createdPackages[i];

    for (const s of p.sessions) {
      const scheduledAt = daysAgo(s.daysBack);
      attendancePayload.push({
        customer_id: p.customer.id,
        customer_package_id: customerPackage.id,
        scheduled_at: scheduledAt,
        status: s.status,
        checkin_at: s.status === "attended" ? scheduledAt : null,
        coach_name: randomFrom(COACHES),
      });
    }

    for (const r of p.reminders) {
      const sentAt = daysAgo(r.daysBack);
      remindersPayload.push({
        customer_id: p.customer.id,
        channel: "whatsapp",
        sent_at: sentAt,
        response_status: r.responded ? "replied" : "no_response",
        responded_at: r.responded
          ? new Date(sentAt.getTime() + randomInt(1, 20) * 60 * 60 * 1000)
          : null,
      });
    }

    // --- fitur prediksi: kontrak final tim (13 fitur, jendela 7 hari) ---
    const in7 = (x) => x.daysBack <= 6;
    const attended7 = p.sessions.filter(
      (s) => in7(s) && s.status === "attended",
    ).length;
    const missed7 = p.sessions.filter(
      (s) => in7(s) && s.status === "missed",
    ).length;
    const rescheduled7 = p.sessions.filter(
      (s) => in7(s) && s.status === "rescheduled",
    ).length;
    const reminders7 = p.reminders.filter(in7);
    const responded7 = reminders7.filter((r) => r.responded).length;

    const label = labelByProfile[p.profile];
    predictionsPayload.push({
      customer_id: p.customer.id,
      model_version_id: activeModel.id,
      label,
      probabilities: probabilitiesByLabel[label],
      features: {
        package_total_sessions: p.pkgItem.total_sessions,
        package_duration_days: p.pkgItem.duration_days,
        days_since_package_purchase: p.daysSinceStart,
        total_sessions_attended: p.attendedCount,
        has_ever_visited: p.attendedCount > 0 ? 1 : 0,
        attendance_frequency_7d: attended7,
        missed_session_count_7d: missed7,
        reschedule_frequency_7d: rescheduled7,
        remaining_package_sessions: p.remainingSessions,
        days_until_package_expiry: p.pkgItem.duration_days - p.daysSinceStart,
        // belum pernah hadir: hari sejak paket dibeli (sama dengan feature.service.js)
        days_since_last_visit: p.lastAttendedDay ?? p.daysSinceStart,
        reminder_count_7d: reminders7.length,
        reminder_response_count_7d: responded7,
      },
      top_factors: ["days_since_last_visit", "missed_session_count_7d"],
      priority_score:
        label === "At Risk"
          ? randomInt(70, 100)
          : label === "Need Attention"
            ? randomInt(30, 69)
            : randomInt(0, 29),
    });

    summaryTemplates.push({
      customer_id: p.customer.id,
      full_name: p.customer.full_name,
      label,
      attendedCount: p.attendedCount,
      missedCount: p.missedCount,
    });
  }

  // Helper batch insert agar aman dari batas parameter PostgreSQL (65535 params)
  const insertInChunks = async (model, data, chunkSize = 2000) => {
    for (let i = 0; i < data.length; i += chunkSize) {
      await model.createMany({ data: data.slice(i, i + chunkSize) });
    }
  };

  console.log(`Menyimpan ${attendancePayload.length} data attendance...`);
  await insertInChunks(prisma.attendance, attendancePayload);

  console.log(`Menyimpan ${remindersPayload.length} data reminders...`);
  await insertInChunks(prisma.reminders, remindersPayload);

  console.log(
    `Menyimpan ${predictionsPayload.length} data risk_predictions...`,
  );
  const createdPredictions = await prisma.risk_predictions.createManyAndReturn({
    data: predictionsPayload,
  });

  // 4. Siapkan dan simpan ai_summaries
  const summariesPayload = createdPredictions.map((pred, idx) => {
    const info = summaryTemplates[idx];
    return {
      customer_id: info.customer_id,
      prediction_id: pred.id,
      created_by: adminUser.id,
      llm_model: "manual-seed",
      summary: `Customer ${info.full_name} berada pada kategori risiko ${info.label}. Kehadiran terakhir: ${info.attendedCount}x hadir, ${info.missedCount}x absen.`,
      followup_draft: `Halo Kak ${info.full_name}, kami lihat sudah agak lama tidak latihan nih. Yuk balik lagi ke gym, ada jadwal kosong minggu ini!`,
      prompt_version: "v1-seed",
      status: "draft",
    };
  });

  console.log(`Menyimpan ${summariesPayload.length} data ai_summaries...`);
  await insertInChunks(prisma.ai_summaries, summariesPayload);

  console.timeEnd("Total waktu seed");
  console.log(`Seed ${TOTAL_CUSTOMERS} customer selesai!`);
  console.log(`- 1 admin (email: admin@gymnasyum.id, password: admin123)`);
  console.log(`- ${createdCustomers.length} customer`);
  console.log(`- ${attendancePayload.length} attendance`);
  console.log(`- ${remindersPayload.length} reminders`);
  console.log(`- ${createdPredictions.length} risk_predictions & ai_summaries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
