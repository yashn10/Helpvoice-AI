export type EmergencySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AISource = 'groq' | 'local-fallback' | 'demo';

export interface EmergencyAnalysis {
  language: string;
  emergencyType: string;
  category: string;
  severity: EmergencySeverity;
  confidence: number;
  summary: string;
  keywords: string[];
  locationRequired: boolean;
  recommendedActions: string[];
  source?: AISource;
}

export interface EmergencyGuidance {
  emergencyType: string;
  category: string;
  immediateSteps: string[];
  doNotDo: string[];
  callEmergencyNow: boolean;
  source: 'groq' | 'predefined' | 'local-fallback';
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ModelAttemptLog {
  modelIndex: number;
  modelName: string;
  provider: 'groq' | 'local-fallback';
  status: 'success' | 'rate_limited' | 'timeout' | 'error' | 'validation_failed';
  message?: string;
  durationMs: number;
}
