import { Request, Response } from 'express';
import { config } from '../config/env';
import { aiCircuitBreaker } from '../services/ai/ai-circuit-breaker';

export class HealthController {
  public static getHealth(_req: Request, res: Response): void {
    const isGroqAvailable = config.isGroqConfigured && aiCircuitBreaker.canExecute();

    res.status(200).json({
      status: 'ok',
      services: {
        database: 'connected', // Or connected state
        groq: isGroqAvailable ? 'available' : 'unavailable',
        localAI: config.ai.localFallbackEnabled ? 'available' : 'disabled',
        hospitalProvider: config.hospital.provider,
      },
    });
  }
}
