import { Request, Response } from 'express';
import { aiService } from '../services/ai/ai.service';
import { fallbackAIService } from '../services/ai/fallback-ai.service';
import { SafeLogger } from '../services/ai/safe-logger';

export class EmergencyController {
  public static async analyze(req: Request, res: Response): Promise<void> {
    try {
      const text = req.body?.text || req.body?.message || '';
      const result = await aiService.analyzeEmergency(text);
      res.status(200).json(result);
    } catch (error) {
      SafeLogger.logSafeError('emergency-controller', 'analyze', error);
      // Even in total disaster, return fallback response rather than 500
      const emergencyFallback = fallbackAIService.analyzeEmergency('Urgent emergency assistance requested');
      res.status(200).json({
        success: true,
        data: emergencyFallback,
        notice: "We're using emergency fallback assistance.",
        source: 'local-fallback',
      });
    }
  }

  public static getGuidance(req: Request, res: Response): void {
    const emergencyType = req.params.type || 'Other';
    const guidance = fallbackAIService.getPredefinedGuidance(emergencyType);
    res.status(200).json({
      success: true,
      data: guidance,
    });
  }

  public static async transcribe(req: Request, res: Response): Promise<void> {
    try {
      const file = (req as any).file;
      const buffer = file?.buffer;
      const fileName = file?.originalname || 'emergency_voice.wav';
      const mimeType = file?.mimetype || 'audio/wav';

      const result = await aiService.transcribe(buffer, fileName, mimeType);
      res.status(200).json(result);
    } catch (error) {
      SafeLogger.logSafeError('emergency-controller', 'transcribe', error);
      res.status(200).json({
        success: false,
        source: 'manual-entry',
        notice: 'Voice recognition unavailable. You can type your emergency instead.',
      });
    }
  }
}
