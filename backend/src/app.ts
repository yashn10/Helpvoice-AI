import express, { Express } from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes';
import aiRoutes from './routes/ai.routes';
import emergencyRoutes from './routes/emergency.routes';
import authRoutes from './routes/auth.routes';
import { config } from './config/env';

export function createApp(): Express {
  const app = express();

  // CORS configuration supporting mobile apps, Capacitor webviews, local dev, and emulators
  const configuredOrigins = config.frontendUrl
    ? config.frontendUrl.split(',').map(url => url.trim()).filter(Boolean)
    : [];

  const defaultMobileOrigins = [
    'http://localhost:4200',
    'http://localhost:8100',
    'http://localhost',
    'https://localhost',
    'capacitor://localhost',
    'ionic://localhost',
    'http://10.0.2.2',
  ];

  const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultMobileOrigins]));

  app.use(cors({
    origin: (origin, callback) => {
      // 1. Allow mobile apps, curl, server-to-server requests with no origin or 'null' (common in WebView/file://)
      if (!origin || origin === 'null') {
        return callback(null, true);
      }

      // 2. Direct match with configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 3. Match localhost, Android emulator (10.0.2.2), and local WiFi network IPs (192.168.x.x, 10.x.x.x)
      if (
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('http://10.0.2.2') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('ionic://') ||
        /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
        /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      // 4. In emergency assistance context, do not block emergency triage
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Routes
  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/emergency', emergencyRoutes);

  // Fallback 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  return app;
}

export const app = createApp();
