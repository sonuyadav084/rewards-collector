import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { FileStorageService } from './services/fileStorageService';
import { logger } from './utils/logger';

async function bootstrap() {
  logger.info(`Starting Coupon Verification System [Environment: ${env.NODE_ENV}]...`);

  // Ensure persistent upload storage exists
  FileStorageService.ensureUploadDirectory();

  // Connect to MongoDB
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} (http://localhost:${env.PORT})`);
  });

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force close after 10 seconds if hanging
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal initialization error:', err);
  process.exit(1);
});

