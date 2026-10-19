import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';
export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);

    if (env.MONGODB_URI.includes(':27018')) {
      const { ensurePersistentDatabase } = await import('./persistentMongo');
      await ensurePersistentDatabase(27018);
    }

    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true, // Build defined indexes on startup
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(`Successfully connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);

    // Verify index synchronization
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Waiting for reconnection...');
    });
  } catch (error) {
    logger.error('Failed to establish MongoDB connection:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection cleanly closed.');
    if (env.MONGODB_URI.includes(':27018')) {
      const { shutdownPersistentMongo } = await import('./persistentMongo');
      await shutdownPersistentMongo(27018);
    }
  } catch (error) {
    logger.error('Error during MongoDB disconnect:', error);
  }
}

