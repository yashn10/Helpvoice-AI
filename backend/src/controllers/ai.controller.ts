import { Request, Response } from 'express';
import { config } from '../config/env';
import { AIModelManager } from '../services/ai/ai-model-manager';

export class AIController {
  public static getStatus(_req: Request, res: Response): void {
    const configuredModels = AIModelManager.getConfiguredModels();

    // Never return secrets or api keys
    res.status(200).json({
      groqEnabled: config.isGroqConfigured,
      configuredModels: configuredModels.length,
      localFallbackEnabled: config.ai.localFallbackEnabled,
    });
  }
}
