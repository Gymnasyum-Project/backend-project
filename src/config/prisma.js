// src/config/prisma.js
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv/config");

// Buat connection pool (SSL wajib untuk Aiven)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3, // batasi koneksi per instance serverless
});
const adapter = new PrismaPg(pool);

// Pakai ulang PrismaClient supaya tidak membuat koneksi baru terus-menerus
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

module.exports = prisma;
