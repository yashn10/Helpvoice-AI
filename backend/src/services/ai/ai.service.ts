import { EmergencyAnalysis } from './types';
import { AIModelManager } from './ai-model-manager';
import { aiCircuitBreaker } from './ai-circuit-breaker';
import { groqService } from './groq.service';
import { fallbackAIService } from './fallback-ai.service';
import { AIResponseValidator } from './ai-response-validator';
import { SafeLogger } from './safe-logger';
import { config } from '../../config/env';

export interface EmergencyAnalysisResponse {
  success: boolean;
  data: EmergencyAnalysis;
  notice?: string;
  source: 'groq' | 'local-fallback' | 'demo';
}

export interface STTResponse {
  success: boolean;
  text?: string;
  source: 'groq-stt' | 'device-fallback' | 'manual-entry';
  notice?: string;
}

export class AIService {
  /**
   * 12-step fallback algorithm to analyze an emergency report.
   * Guaranteed to never throw unhandled errors to the caller or expose raw API errors.
   */
  public async analyzeEmergency(text: string): Promise<EmergencyAnalysisResponse> {
    const rawInput = (text || '').trim();

    // 1. Validate input
    if (!rawInput) {
      const fallbackResult = fallbackAIService.analyzeEmergency('General emergency assistance requested');
      return {
        success: true,
        data: fallbackResult,
        notice: "We're using emergency fallback assistance.",
        source: 'local-fallback',
      };
    }

    const fallbackEnabled = config.ai.fallbackEnabled;
    const isGroqConfigured = config.isGroqConfigured;
    const canUseCircuitBreaker = aiCircuitBreaker.canExecute();

    let groqFailed = false;

    // Try Groq cascade if configured, fallback enabled, and circuit breaker allows
    if (fallbackEnabled && isGroqConfigured && canUseCircuitBreaker) {
      const models = AIModelManager.getConfiguredModels();
      const maxRetries = config.ai.maxRetriesPerModel || 1;

      for (const modelConfig of models) {
        let attempts = 0;

        while (attempts < maxRetries) {
          attempts += 1;
          try {
            const result = await groqService.analyzeWithModel(
              modelConfig.name,
              rawInput,
              modelConfig.index
            );

            // Validate response
            const validation = AIResponseValidator.validate(result);
            if (validation.isValid && validation.sanitized) {
              // Circuit breaker success
              aiCircuitBreaker.recordSuccess();

              // Enforce confidence threshold
              const safeAnalysis = AIResponseValidator.enforceConfidenceThreshold(
                validation.sanitized,
                config.ai.confidenceThreshold
              );

              return {
                success: true,
                data: safeAnalysis,
                source: 'groq',
              };
            }

            // Validation failed, try next attempt or model
            SafeLogger.logSafeAI({
              provider: 'groq',
              modelIndex: modelConfig.index,
              modelName: modelConfig.name,
              result: 'validation_failed',
              fallback: 'next_model',
              message: validation.error,
            });
          } catch (error) {
            SafeLogger.logSafeError('groq', modelConfig.name, error);
            groqFailed = true;
          }
        }
      }

      // If all models failed, record failure to circuit breaker
      aiCircuitBreaker.recordFailure();
    } else if (!canUseCircuitBreaker) {
      SafeLogger.logSafeAI({
        provider: 'groq',
        result: 'error',
        fallback: 'local',
        message: 'Circuit breaker is OPEN. Skipping Groq calls and directly utilizing local fallback.',
      });
      groqFailed = true;
    }

    // Fallback: Local Deterministic AI (offline, instant, zero external dependency)
    SafeLogger.logSafeAI({
      provider: 'local-fallback',
      result: 'fallback',
      fallback: 'local',
      message: 'Processing with local multilingual emergency classifier.',
    });

    const localResult = fallbackAIService.analyzeEmergency(rawInput);
    const validatedLocal = AIResponseValidator.enforceConfidenceThreshold(
      localResult,
      config.ai.confidenceThreshold
    );

    return {
      success: true,
      data: validatedLocal,
      notice: groqFailed || !isGroqConfigured
        ? "We're using emergency fallback assistance."
        : undefined,
      source: 'local-fallback',
    };
  }

  /**
   * Speech-to-text with multi-layered fallback
   */
  public async transcribe(
    audioBuffer?: Buffer,
    fileName?: string,
    mimeType?: string
  ): Promise<STTResponse> {
    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        success: false,
        source: 'manual-entry',
        notice: 'Voice recognition unavailable. You can type your emergency instead.',
      };
    }

    const sttModel = AIModelManager.getSTTModel();
    if (config.isGroqConfigured && sttModel) {
      try {
        const text = await groqService.transcribeAudio(
          audioBuffer,
          fileName || 'audio.wav',
          mimeType || 'audio/wav'
        );

        if (text && text.trim().length > 0) {
          return {
            success: true,
            text: text.trim(),
            source: 'groq-stt',
          };
        }
      } catch {
        SafeLogger.logSafeAI({
          provider: 'stt',
          result: 'fallback',
          fallback: 'local',
          message: 'Groq STT failed; falling back to device STT or manual entry.',
        });
      }
    }

    // Fallback instruction
    return {
      success: false,
      source: 'manual-entry',
      notice: 'Voice recognition unavailable. You can type your emergency instead.',
    };
  }
}

export const aiService = new AIService();
