/**
 * Angular Development Environment
 * 
 * SECURITY WARNING:
 * NEVER store secrets, private API keys, or database credentials here.
 * GROQ_API_KEY and MONGODB_URI belong strictly on the backend.
 */

export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'hi', 'mr'],
  demoMode: true,
  publicMapConfiguration: {
    provider: 'osm',
    tileServerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    defaultZoom: 14,
    defaultCenter: {
      lat: 18.5204,
      lng: 73.8567,
    },
  },
  emergency: {
    defaultEmergencyNumber: '112',
  },
  ai: {
    speechRecognitionFallbackToManual: true,
  },
};
