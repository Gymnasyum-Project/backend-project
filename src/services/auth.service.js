const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const env = require('../config/env');
const AppError = require('../utils/AppError');

exports.login = async (email, password) => {
  const user = await prisma.users.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
};

exports.getProfile = async (userId) => {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, created_at: true },
  });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User tidak ditemukan');
  return user;
};