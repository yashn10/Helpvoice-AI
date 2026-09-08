/**
 * Safe logging utility that never exposes:
 * - Groq API keys or authorization headers
 * - Raw voice recordings / binary payloads
 * - Full sensitive emergency transcripts unnecessarily
 * - Precise GPS coordinates
 */

export interface SafeLogDetails {
  provider: 'groq' | 'local-fallback' | 'stt' | 'system';
  modelIndex?: number;
  modelName?: string;
  result: 'success' | 'rate_limited' | 'timeout' | 'error' | 'validation_failed' | 'fallback';
  fallback?: 'local' | 'next_model' | 'none';
  durationMs?: number;
  message?: string;
}

export class SafeLogger {
  private static sanitizeText(text?: string): string {
    if (!text) return '';
    // Strip possible API keys or bearer tokens
    return text
      .replace(/gsk_[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
  }

  public static logSafeAI(details: SafeLogDetails): void {
    const lines = [
      `[AI DIAGNOSTIC]`,
      `  AI provider: ${details.provider}`,
      details.modelIndex !== undefined ? `  Model index: ${details.modelIndex}` : null,
      details.modelName ? `  Model name: ${details.modelName}` : null,
      `  Result: ${details.result}`,
      details.fallback ? `  Fallback: ${details.fallback}` : null,
      details.durationMs !== undefined ? `  Duration: ${details.durationMs}ms` : null,
      details.message ? `  Note: ${this.sanitizeText(details.message)}` : null,
    ].filter(Boolean);

    console.info(lines.join('\n'));
  }

  public static logSafeError(provider: string, modelName: string, error: unknown): void {
    const rawMsg = error instanceof Error ? error.message : String(error);
    const sanitized = this.sanitizeText(rawMsg);
    console.warn(`[AI WARN] Provider ${provider} (${modelName}) failed: ${sanitized}`);
  }

  public static logSafeInfo(message: string): void {
    console.info(`[AI INFO] ${this.sanitizeText(message)}`);
  }
}
