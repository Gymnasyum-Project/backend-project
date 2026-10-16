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

const SEGMENTS = ["ibu_ibu", "lansia", "menengah_atas", "lainnya"];
const SERVICES = ["gym", "private_coaching"];
const COACHES = ["Coach Rina", "Coach Budi", "Coach Dewi"];

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
  // Disimpan ke variabel karena id-nya dipakai lagi nanti di risk_predictions
  const activeModel = await prisma.model_versions.create({
    data: {
      version: "v1.1-random-forest",
      algorithm: "Random Forest",
      metrics: { accuracy: 0.84, f1_macro: 0.83, recall_macro: 0.84 },
      trained_at: daysAgo(3),
      is_active: true,
    },
  });

  console.log("Membuat customer + riwayat (30 customer)...");

  const NAMES = [
    "Sari Dewi",
    "Hendra Wijaya",
    "Rina Susanti",
    "Agus Santoso",
    "Melati Putri",
    "Laras Wulandari",
    "Doni Prasetyo",
    "Fitri Handayani",
    "Rudi Hartono",
    "Nadia Permata",
    "Irwan Kusuma",
    "Citra Lestari",
    "Budi Setiawan",
    "Yuni Astuti",
    "Eko Prabowo",
    "Wati Suryani",
    "Hadi Nugroho",
    "Dewi Kurniawati",
    "Joko Susilo",
    "Ani Rahayu",
    "Bambang Hermawan",
    "Siti Aminah",
    "Tono Wijaya",
    "Ratna Sari",
    "Dedi Kurniawan",
    "Indah Permatasari",
    "Slamet Riyadi",
    "Yanti Oktaviani",
    "Rizky Pratama",
    "Lina Marlina",
  ];

  const riskProfiles = [
    ...Array(12).fill("low"),
    ...Array(11).fill("medium"),
    ...Array(7).fill("high"),
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

  for (let i = 0; i < NAMES.length; i++) {
    const profile = riskProfiles[i];

    const customer = await prisma.customers.create({
      data: {
        full_name: NAMES[i],
        phone: `08${randomInt(10, 99)}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
        email: `${NAMES[i].toLowerCase().replace(/\s/g, ".")}@email.com`,
        gender: i % 2 === 0 ? "female" : "male",
        birth_date: daysAgo(randomInt(8000, 20000)),
        segment: randomFrom(SEGMENTS),
        service_type: randomFrom(SERVICES),
        join_date: daysAgo(randomInt(60, 700)),
        notes: null,
      },
    });

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

    const customerPackage = await prisma.customer_packages.create({
      data: {
        customer_id: customer.id,
        package_id: pkg.id,
        start_date: daysAgo(randomInt(30, 60)),
        end_date: daysAgo(-randomInt(10, 30)),
        total_sessions: pkg.total_sessions,
        remaining_sessions: remainingSessions,
        status: "active",
      },
    });

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
        if (lastAttendedDay === null || daysBack < lastAttendedDay)
          lastAttendedDay = daysBack;
      } else if (j < attendedCount + missedCount) {
        status = "missed";
      } else {
        status = "rescheduled";
      }

      const scheduledAt = daysAgo(daysBack);
      await prisma.attendance.create({
        data: {
          customer_id: customer.id,
          customer_package_id: customerPackage.id,
          scheduled_at: scheduledAt,
          status,
          checkin_at: status === "attended" ? scheduledAt : null,
          coach_name: randomFrom(COACHES),
        },
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

      await prisma.reminders.create({
        data: {
          customer_id: customer.id,
          channel: "whatsapp",
          sent_at: daysAgo(randomInt(1, 28)),
          response_status: responded ? "replied" : "no_response",
          responded_at: responded ? daysAgo(randomInt(0, 1)) : null,
        },
      });
    }

    // 1. Buat risk_predictions dulu, karena ai_summaries wajib terhubung ke sini
    const label = labelByProfile[profile];
    const riskPrediction = await prisma.risk_predictions.create({
      data: {
        customers: { connect: { id: customer.id } },
        model_versions: { connect: { id: activeModel.id } },
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
      },
    });

    // 2. Baru ai_summaries, terhubung ke customer + risk_prediction di atas
    await prisma.ai_summaries.create({
      data: {
        customers: { connect: { id: customer.id } },
        risk_predictions: { connect: { id: riskPrediction.id } },
        users: { connect: { id: adminUser.id } },
        llm_model: "manual-seed",
        summary: `Customer ${NAMES[i]} berada pada kategori risiko ${label}. Kehadiran 30 hari terakhir: ${attendedCount}x hadir, ${missedCount}x absen.`,
        followup_draft: `Halo Kak ${NAMES[i]}, kami lihat sudah agak lama tidak latihan nih. Yuk balik lagi ke gym, ada jadwal kosong minggu ini!`,
        prompt_version: "v1-seed",
        status: "pending_review",
      },
    });
  }

  console.log("Seed selesai!");
  console.log(`- 1 admin (email: admin@gymnasyum.id, password: admin123)`);
  console.log(
    `- ${NAMES.length} customer dengan riwayat attendance, reminder, risk_prediction & ai_summary`,
  );
  console.log(`- 2 master paket`);
  console.log(`- 2 model_versions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });