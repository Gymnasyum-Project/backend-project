// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";
import bcrypt from "bcrypt";

// Inisialisasi Prisma v7 dengan Driver Adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TOTAL_CUSTOMERS = 2000;
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
  await prisma.users.deleteMany();

  console.log("Membuat user admin...");
  const passwordHash = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.users.create({
    data: {
      name: "Admin Gymnasyum",
      no_tlp: "082235543178",
      email: "admin@gymnasyum.id",
      password_hash: passwordHash,
      role: "admin",
    },
  });

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

  // 1. Insert 2000 customers sekaligus & ambil ID-nya
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

  // 2. Siapkan customer_packages & metadata per customer
  const customerPackagesPayload = [];
  const metaPerCustomer = [];

  for (let i = 0; i < createdCustomers.length; i++) {
    const customer = createdCustomers[i];
    const profile = riskProfiles[i];
    const pkg = randomFrom(packageList);

    let usedSessions;
    if (profile === "low") {
      usedSessions = randomInt(0, 3);
    } else if (profile === "medium") {
      usedSessions = randomInt(4, 7);
    } else {
      usedSessions = randomInt(7, pkg.total_sessions);
    }
    const remainingSessions = Math.max(0, pkg.total_sessions - usedSessions);

    customerPackagesPayload.push({
      customer_id: customer.id,
      package_id: pkg.id,
      start_date: daysAgo(randomInt(30, 60)),
      end_date: daysAgo(-randomInt(10, 30)),
      total_sessions: pkg.total_sessions,
      remaining_sessions: remainingSessions,
      status: "active",
    });

    metaPerCustomer.push({
      customer,
      profile,
      remainingSessions,
    });
  }

  console.log("Menyimpan customer_packages...");
  const createdPackages = await prisma.customer_packages.createManyAndReturn({
    data: customerPackagesPayload,
  });

  // 3. Siapkan attendance, reminders, dan risk_predictions secara bulk
  const attendancePayload = [];
  const remindersPayload = [];
  const predictionsPayload = [];
  const summaryTemplates = [];

  for (let i = 0; i < metaPerCustomer.length; i++) {
    const { customer, profile, remainingSessions } = metaPerCustomer[i];
    const customerPackage = createdPackages[i];

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

    let lastAttendedDay = null;
    for (let j = 0; j < totalJadwal; j++) {
      const daysBack = randomInt(0, 29);
      let status;
      if (j < attendedCount) {
        status = "attended";
        if (lastAttendedDay === null || daysBack < lastAttendedDay) {
          lastAttendedDay = daysBack;
        }
      } else if (j < attendedCount + missedCount) {
        status = "missed";
      } else {
        status = "rescheduled";
      }

      const scheduledAt = daysAgo(daysBack);
      attendancePayload.push({
        customer_id: customer.id,
        customer_package_id: customerPackage.id,
        scheduled_at: scheduledAt,
        status,
        checkin_at: status === "attended" ? scheduledAt : null,
        coach_name: randomFrom(COACHES),
      });
    }

    const reminderCount = randomInt(2, 4);
    let reminderRespondedCount = 0;
    for (let k = 0; k < reminderCount; k++) {
      const responded =
        profile === "low"
          ? Math.random() < 0.8
          : profile === "medium"
            ? Math.random() < 0.4
            : Math.random() < 0.15;
      if (responded) reminderRespondedCount++;

      remindersPayload.push({
        customer_id: customer.id,
        channel: "whatsapp",
        sent_at: daysAgo(randomInt(1, 28)),
        response_status: responded ? "replied" : "no_response",
        responded_at: responded ? daysAgo(randomInt(0, 1)) : null,
      });
    }

    const label = labelByProfile[profile];
    predictionsPayload.push({
      customer_id: customer.id,
      model_version_id: activeModel.id,
      label,
      probabilities: probabilitiesByLabel[label],
      features: {
        attendance_frequency_30d: attendedCount,
        missed_session_count_30d: missedCount,
        reschedule_frequency_30d: totalJadwal - attendedCount - missedCount,
        remaining_package_sessions: remainingSessions,
        days_until_package_expiry: randomInt(1, 30),
        days_since_last_visit: lastAttendedDay ?? 999,
        reminder_count_30d: reminderCount,
        reminder_response_count_30d: reminderRespondedCount,
      },
      top_factors: ["days_since_last_visit", "missed_session_count_30d"],
      priority_score:
        label === "At Risk"
          ? randomInt(70, 100)
          : label === "Need Attention"
            ? randomInt(30, 69)
            : randomInt(0, 29),
    });

    summaryTemplates.push({
      customer_id: customer.id,
      full_name: customer.full_name,
      label,
      attendedCount,
      missedCount,
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
      summary: `Customer ${info.full_name} berada pada kategori risiko ${info.label}. Kehadiran 30 hari terakhir: ${info.attendedCount}x hadir, ${info.missedCount}x absen.`,
      followup_draft: `Halo Kak ${info.full_name}, kami lihat sudah agak lama tidak latihan nih. Yuk balik lagi ke gym, ada jadwal kosong minggu ini!`,
      prompt_version: "v1-seed",
      status: "pending_review",
    };
  });

  console.log(`Menyimpan ${summariesPayload.length} data ai_summaries...`);
  await insertInChunks(prisma.ai_summaries, summariesPayload);

  console.timeEnd("Total waktu seed");
  console.log("Seed 2.000 customer selesai!");
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
