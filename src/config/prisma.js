// src/config/prisma.js
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv/config");

// Buat connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Inisialisasi PrismaClient dengan adapter
const prisma = new PrismaClient({ adapter });

module.exports = prisma;