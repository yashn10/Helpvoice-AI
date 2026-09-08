import { app } from './app';
import { config } from './config/env';

export function printStartupBanner(): void {
  console.log('\n==========================================');
  console.log('       HELPVOICE AI BACKEND STARTUP       ');
  console.log('==========================================');
  console.log('✓ MongoDB configuration loaded');

  if (config.isGroqConfigured) {
    console.log('✓ Groq AI enabled');
    console.log('✓ Multi-model fallback enabled');
    console.log('✓ Local fallback enabled');
    console.log(`✓ Hospital provider: ${config.hospital.provider}`);
  } else {
    console.log('⚠ Groq AI unavailable');
    console.log('✓ Local fallback AI enabled');
    console.log('✓ Application running in free fallback mode');
  }

  console.log('==========================================');
  console.log(`Server listening on port ${config.port} [${config.nodeEnv}]`);
  console.log(`Health check: http://localhost:${config.port}/api/health`);
  console.log(`AI Status:    http://localhost:${config.port}/api/ai/status\n`);
}

export function startServer() {
  const server = app.listen(config.port, () => {
    printStartupBanner();
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
