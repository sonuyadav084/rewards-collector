import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { ensurePersistentDatabase, shutdownPersistentMongo } from './config/persistentMongo';
import { AdminUser } from './models/AdminUser';
import { RegisteredCoupon } from './models/RegisteredCoupon';
import { CouponTemplate } from './models/CouponTemplate';
import { FileStorageService } from './services/fileStorageService';
import { logger } from './utils/logger';

async function startDevServer() {
  logger.info('Initializing Standalone Local Development Environment with PERSISTENT Storage...');

  // Ensure persistent upload folder exists
  FileStorageService.ensureUploadDirectory();

  // Launch or connect to persistent isolated MongoDB on port 27018
  const mongoUri = await ensurePersistentDatabase(27018, 'coupon_verification_db');
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  logger.info(`Connected to persistent MongoDB: ${mongoUri}`);

  // Pre-seed or sync default test admin
  const adminName = process.env.ADMIN_NAME || 'The Nation Pride';
  const adminEmail = (process.env.ADMIN_EMAIL || 'thenationpride@admin').toLowerCase().trim();
  const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  let existingAdmin = await AdminUser.findOne({ email: adminEmail });
  if (!existingAdmin) {
    // If an admin already exists under an older email/username, update that admin
    const anyAdmin = await AdminUser.findOne();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    if (anyAdmin) {
      anyAdmin.name = adminName;
      anyAdmin.email = adminEmail;
      anyAdmin.passwordHash = passwordHash;
      await anyAdmin.save();
      logger.info(`Updated existing admin account to '${adminEmail}' (${adminName}) with default password.`);
    } else {
      await AdminUser.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'superadmin',
        isActive: true,
      });
      logger.info('------------------------------------------------------------');
      logger.info('DEFAULT ADMIN CREDENTIALS CREATED FOR INSTANT TESTING:');
      logger.info(`  Name:     ${adminName}`);
      logger.info(`  Email:    ${adminEmail}`);
      logger.info(`  Password: ${defaultPassword}`);
      logger.info('------------------------------------------------------------');
    }
  } else {
    if (existingAdmin.name !== adminName) {
      existingAdmin.name = adminName;
      await existingAdmin.save();
      logger.info(`Updated admin name to '${adminName}' in database.`);
    } else {
      logger.info(`Admin user '${adminEmail}' (${adminName}) verified in persistent database.`);
    }
  }

  // Pre-seed sample coupons ONLY if database has 0 coupons
  const couponCount = await RegisteredCoupon.countDocuments();
  if (couponCount === 0) {
    const sampleCodes = [
      'NP000001',
      'NP000002',
      'NP000003',
      'NP000004',
      'NP000005',
      'NP000006',
      'NP000007',
      'NP000008',
      'NP000009',
      'NP000010',
    ];
    await RegisteredCoupon.insertMany(
      sampleCodes.map((code) => ({
        couponNumber: code,
        normalizedCouponNumber: code.toUpperCase().trim(),
        isSubmitted: false,
        importBatchId: 'INITIAL-TEST-SEED',
      }))
    );
    logger.info(`Pre-seeded ${sampleCodes.length} valid coupons into catalog for immediate testing.`);
  } else {
    logger.info(`Catalog already contains ${couponCount} coupons. Preserving all records.`);
  }

  // Pre-seed default official card template if none exist
  const templateCount = await CouponTemplate.countDocuments();
  if (templateCount === 0) {
    await CouponTemplate.create({
      name: 'The Nation Pride - Scratch Card',
      description: 'Official Nation Pride Scratch & Win card with QR code and NP serial number',
      codePrefix: 'NP',
      codePattern: '^NP\\d{6}$',
      sampleCode: 'NP000001',
      requiredKeywords: ['NATION PRIDE', 'SCRATCH'],
      minKeywordMatches: 2,
      qrCodeMatch: 'thenationpride.store',
      isActive: true,
    });
    logger.info('Created default official card template: The Nation Pride - Scratch Card');
  } else {
    // Ensure all existing templates require at least 2 keywords for strict verification
    await CouponTemplate.updateMany(
      { minKeywordMatches: { $lt: 2 } },
      { $set: { minKeywordMatches: 2 } }
    );
    logger.info(`Found ${templateCount} existing coupon card templates in database (enforced minKeywordMatches >= 2).`);
  }

  const app = createApp();
  const server = http.createServer(app);

  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down dev server...`);
    server.close(async () => {
      await mongoose.disconnect();
      await shutdownPersistentMongo(27018);
      process.exit(0);
    });
  };

  process.once('SIGINT', () => handleShutdown('SIGINT'));
  process.once('SIGTERM', () => handleShutdown('SIGTERM'));

  server.listen(env.PORT, () => {
    logger.info('============================================================');
    logger.info(`BACKEND REST API IS LIVE on http://localhost:${env.PORT}`);
    logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
    logger.info('============================================================');
  });
}

startDevServer().catch((err) => {
  logger.error('Failed to start development server:', err);
  process.exit(1);
});

