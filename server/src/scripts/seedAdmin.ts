import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { AdminUser } from '../models/AdminUser';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../utils/logger';

dotenv.config();

async function seedFirstAdmin() {
  await connectDatabase();

  const name = process.env.ADMIN_NAME || process.env.ADMIN_SEED_NAME || 'The Nation Pride';
  const email = (process.env.ADMIN_EMAIL || process.env.ADMIN_SEED_EMAIL || 'thenationpride@admin').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD || 'Admin@123456';

  if (!password || password.length < 8) {
    logger.error('CRITICAL: ADMIN_SEED_PASSWORD environment variable must be specified with at least 8 characters.');
    logger.info('Usage example:');
    logger.info('  ADMIN_SEED_EMAIL=admin@company.com ADMIN_SEED_PASSWORD=SuperStrongPassword123! npm run seed:admin');
    await disconnectDatabase();
    process.exit(1);
  }

  const existingAdmin = await AdminUser.findOne({ email });

  if (existingAdmin) {
    logger.warn(`Admin with email "${email}" already exists in database. No action taken.`);
    await disconnectDatabase();
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const newAdmin = await AdminUser.create({
    name,
    email,
    passwordHash,
    role: 'superadmin',
    isActive: true,
  });

  logger.info(`Successfully created initial superadmin account:`);
  logger.info(`  - ID: ${newAdmin._id}`);
  logger.info(`  - Email: ${newAdmin.email}`);
  logger.info(`  - Role: ${newAdmin.role}`);

  await disconnectDatabase();
  process.exit(0);
}

seedFirstAdmin().catch((err) => {
  logger.error('Failed to seed admin account:', err);
  process.exit(1);
});

