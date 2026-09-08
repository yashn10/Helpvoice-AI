import express, { Express } from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes';
import aiRoutes from './routes/ai.routes';
import emergencyRoutes from './routes/emergency.routes';
import { config } from './config/env';

export function createApp(): Express {
  const app = express();

  // CORS configuration supporting frontend, local dev, and Capacitor mobile webviews
  const allowedOrigins = [
    config.frontendUrl,
    'http://localhost:4200',
    'http://localhost:8100',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in emergency context to avoid blocking assistance
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Routes
  app.use('/api', healthRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/emergency', emergencyRoutes);

  // Fallback 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  return app;
}

export const app = createApp();
