const prisma = require('../config/prisma');

exports.listVersions = () =>
  prisma.model_versions.findMany({
    orderBy: { trained_at: 'desc' },
  });