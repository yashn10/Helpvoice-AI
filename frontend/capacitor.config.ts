import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.helpvoice.ai',
  appName: 'Helpvoice AI',
  webDir: 'dist/frontend/browser',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
