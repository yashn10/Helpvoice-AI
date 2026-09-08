import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend root or parent if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  mongodbUri: string;
  groqApiKey?: string;
  groqModels: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
    quaternary?: string;
    stt?: string;
  };
  ai: {
    requestTimeoutMs: number;
    maxRetriesPerModel: number;
    fallbackEnabled: boolean;
    localFallbackEnabled: boolean;
    confidenceThreshold: number;
  };
  emergency: {
    defaultNumber: string;
  };
  hospital: {
    provider: string;
    osmOverpassUrl?: string;
    searchRadiusKm: number;
  };
  map: {
    provider: string;
    apiKey?: string;
  };
  demo: {
    enabled: boolean;
    locationLat?: number;
    locationLng?: number;
  };
  security: {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
  isGroqConfigured: boolean;
}

function parseBoolean(val: string | undefined, defaultValue: boolean): boolean {
  if (val === undefined || val === null || val === '') return defaultValue;
  return val.toLowerCase() === 'true' || val === '1';
}

function parseNumber(val: string | undefined, defaultValue: number): number {
  if (!val) return defaultValue;
  const num = Number(val);
  return Number.isNaN(num) ? defaultValue : num;
}

export function validateAndLoadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseNumber(process.env.PORT, 3000);
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/helpvoice-ai';
  const defaultEmergencyNumber = process.env.DEFAULT_EMERGENCY_NUMBER || '112';

  // AI Configuration
  const requestTimeoutMs = parseNumber(process.env.AI_REQUEST_TIMEOUT_MS, 8000);
  const maxRetriesPerModel = parseNumber(process.env.AI_MAX_RETRIES_PER_MODEL, 1);
  const fallbackEnabled = parseBoolean(process.env.AI_FALLBACK_ENABLED, true);
  const localFallbackEnabled = parseBoolean(process.env.AI_LOCAL_FALLBACK_ENABLED, true);
  const confidenceThreshold = parseNumber(process.env.AI_CONFIDENCE_THRESHOLD, 0.60);

  // Groq API Key check
  const rawGroqKey = process.env.GROQ_API_KEY?.trim();
  const isGroqConfigured = Boolean(rawGroqKey && rawGroqKey.length > 0);

  if (!isGroqConfigured) {
    console.warn('Groq AI unavailable.');
    console.info('Local fallback AI enabled.');
  }

  return {
    nodeEnv,
    port,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
    mongodbUri,
    groqApiKey: isGroqConfigured ? rawGroqKey : undefined,
    groqModels: {
      primary: process.env.GROQ_PRIMARY_MODEL?.trim(),
      secondary: process.env.GROQ_SECONDARY_MODEL?.trim(),
      tertiary: process.env.GROQ_TERTIARY_MODEL?.trim(),
      quaternary: process.env.GROQ_QUATERNARY_MODEL?.trim(),
      stt: process.env.GROQ_STT_MODEL?.trim(),
    },
    ai: {
      requestTimeoutMs,
      maxRetriesPerModel,
      fallbackEnabled,
      localFallbackEnabled,
      confidenceThreshold,
    },
    emergency: {
      defaultNumber: defaultEmergencyNumber,
    },
    hospital: {
      provider: process.env.HOSPITAL_PROVIDER || 'demo',
      osmOverpassUrl: process.env.OSM_OVERPASS_URL,
      searchRadiusKm: parseNumber(process.env.HOSPITAL_SEARCH_RADIUS_KM, 15),
    },
    map: {
      provider: process.env.MAP_PROVIDER || 'osm',
      apiKey: process.env.MAP_API_KEY,
    },
    demo: {
      enabled: parseBoolean(process.env.ENABLE_DEMO_MODE, true),
      locationLat: process.env.DEMO_LOCATION_LAT ? parseNumber(process.env.DEMO_LOCATION_LAT, 18.5204) : undefined,
      locationLng: process.env.DEMO_LOCATION_LNG ? parseNumber(process.env.DEMO_LOCATION_LNG, 73.8567) : undefined,
    },
    security: {
      rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 900000),
      rateLimitMaxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    },
    isGroqConfigured,
  };
}

export const config = validateAndLoadConfig();
