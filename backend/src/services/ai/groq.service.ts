import { EmergencyAnalysis } from './types';
import { AIResponseValidator } from './ai-response-validator';
import { SafeLogger } from './safe-logger';
import { config } from '../../config/env';

export class GroqService {
  private readonly baseUrl: string = 'https://api.groq.com/openai/v1';

  /**
   * Calls a specific Groq model with emergency analysis prompt, strict timeout, and validation.
   */
  public async analyzeWithModel(
    modelName: string,
    text: string,
    modelIndex: number
  ): Promise<EmergencyAnalysis> {
    const apiKey = config.groqApiKey;
    if (!apiKey) {
      throw new Error('Groq API key not configured');
    }

    const timeoutMs = config.ai.requestTimeoutMs || 8000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = Date.now();

    const systemPrompt = `You are a specialized emergency dispatch triage AI.
Analyze the user's situation and return STRICT JSON adhering to this exact schema:
{
  "language": "string (e.g. English, Hindi, Marathi)",
  "emergencyType": "string (e.g. Severe Bleeding, Accident, Chest Pain, Fire, etc.)",
  "category": "string (e.g. Trauma, Cardiac, Fire, Medical, etc.)",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "confidence": number between 0.0 and 1.0,
  "summary": "concise description of the situation",
  "keywords": ["key", "words"],
  "locationRequired": true or false,
  "recommendedActions": ["action 1", "action 2"],
  "source": "groq"
}
Output only raw valid JSON without markdown fences. Prioritize safety and immediate emergency help.`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (response.status === 429) {
        SafeLogger.logSafeAI({
          provider: 'groq',
          modelIndex,
          modelName,
          result: 'rate_limited',
          durationMs,
          message: 'HTTP 429 Rate Limit Encountered',
        });
        throw new Error('RATE_LIMITED');
      }

      if (response.status >= 500) {
        SafeLogger.logSafeAI({
          provider: 'groq',
          modelIndex,
          modelName,
          result: 'error',
          durationMs,
          message: `HTTP ${response.status} Server Error`,
        });
        throw new Error(`SERVER_ERROR_${response.status}`);
      }

      if (!response.ok) {
        SafeLogger.logSafeAI({
          provider: 'groq',
          modelIndex,
          modelName,
          result: 'error',
          durationMs,
          message: `HTTP ${response.status}`,
        });
        throw new Error(`HTTP_${response.status}`);
      }

      const body = await response.json() as any;
      const content = body.choices?.[0]?.message?.content;

      if (!content) {
        SafeLogger.logSafeAI({
          provider: 'groq',
          modelIndex,
          modelName,
          result: 'validation_failed',
          durationMs,
          message: 'Empty response content',
        });
        throw new Error('EMPTY_RESPONSE');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        SafeLogger.logSafeAI({
          provider: 'groq',
          modelIndex,
          modelName,
          result: 'validation_failed',
          durationMs,
          message: 'Malformed JSON',
        });
        throw new Error('MALFORMED_JSON');
      }

      const validation = AIResponseValidator.validate(parsed);
      if (!validation.isValid || !validation.sanitized) {
        SafeLogger.logSafeAI({
          provider: 'groq',
          modelIndex,
          modelName,
          result: 'validation_failed',
          durationMs,
          message: validation.error || 'Invalid Schema',
        });
        throw new Error(`INVALID_SCHEMA: ${validation.error}`);
      }

      SafeLogger.logSafeAI({
        provider: 'groq',
        modelIndex,
        modelName,
        result: 'success',
        durationMs,
      });

      return validation.sanitized;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        SafeLogger.logSafeAI({
          provider: 'groq',
          modelIndex,
          modelName,
          result: 'timeout',
          durationMs,
          message: `Request exceeded timeout ${timeoutMs}ms`,
        });
        throw new Error('TIMEOUT');
      }

      throw err;
    }
  }

  /**
   * Transcribes voice audio using Groq STT model if configured.
   */
  public async transcribeAudio(
    audioBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    const apiKey = config.groqApiKey;
    const sttModel = config.groqModels.stt;

    if (!apiKey || !sttModel) {
      throw new Error('STT_NOT_CONFIGURED');
    }

    const timeoutMs = config.ai.requestTimeoutMs || 8000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      formData.append('file', blob, fileName);
      formData.append('model', sttModel);
      formData.append('temperature', '0');

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GROQ_STT_FAILED_${response.status}`);
      }

      const data = await response.json() as { text?: string };
      return data.text || '';
    } catch (err: any) {
      clearTimeout(timeoutId);
      SafeLogger.logSafeError('groq-stt', sttModel, err);
      throw err;
    }
  }
}

export const groqService = new GroqService();
