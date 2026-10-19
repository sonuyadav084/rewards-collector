import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes';
import submissionRoutes from './submission.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Health Check
router.get('/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: {
      connected: isHealthy,
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
    },
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// API Module Routing
router.use('/auth', authRoutes);
router.use('/submissions', submissionRoutes);
router.use('/admin', adminRoutes);

export default router;

