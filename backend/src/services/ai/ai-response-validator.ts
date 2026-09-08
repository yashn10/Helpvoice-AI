import { EmergencyAnalysis, EmergencySeverity } from './types';

const ALLOWED_SEVERITIES: EmergencySeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: EmergencyAnalysis;
}

export class AIResponseValidator {
  /**
   * Validates if the object adheres strictly to EmergencyAnalysis schema.
   */
  public static validate(data: unknown): ValidationResult {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Response is not a valid JSON object' };
    }

    const candidate = data as Partial<EmergencyAnalysis>;

    // 1. Language validation
    if (!candidate.language || typeof candidate.language !== 'string' || candidate.language.trim().length === 0) {
      return { isValid: false, error: 'Missing or empty language property' };
    }

    // 2. Emergency Type validation
    if (!candidate.emergencyType || typeof candidate.emergencyType !== 'string' || candidate.emergencyType.trim().length === 0) {
      return { isValid: false, error: 'Missing or empty emergencyType property' };
    }

    // 3. Category validation
    if (!candidate.category || typeof candidate.category !== 'string' || candidate.category.trim().length === 0) {
      return { isValid: false, error: 'Missing or empty category property' };
    }

    // 4. Severity validation
    if (!candidate.severity || !ALLOWED_SEVERITIES.includes(candidate.severity as EmergencySeverity)) {
      return { isValid: false, error: `Invalid severity: must be one of ${ALLOWED_SEVERITIES.join(', ')}` };
    }

    // 5. Confidence validation (0.0 to 1.0)
    if (typeof candidate.confidence !== 'number' || candidate.confidence < 0 || candidate.confidence > 1 || Number.isNaN(candidate.confidence)) {
      return { isValid: false, error: 'Confidence must be a valid number between 0 and 1' };
    }

    // 6. Summary validation
    if (!candidate.summary || typeof candidate.summary !== 'string' || candidate.summary.trim().length === 0) {
      return { isValid: false, error: 'Missing or empty summary property' };
    }

    // 7. Keywords array validation
    if (!Array.isArray(candidate.keywords)) {
      return { isValid: false, error: 'Keywords must be an array of strings' };
    }

    // 8. Recommended Actions array validation
    if (!Array.isArray(candidate.recommendedActions)) {
      return { isValid: false, error: 'Recommended actions must be an array of strings' };
    }

    const sanitized: EmergencyAnalysis = {
      language: candidate.language.trim(),
      emergencyType: candidate.emergencyType.trim(),
      category: candidate.category.trim(),
      severity: candidate.severity as EmergencySeverity,
      confidence: Math.round(candidate.confidence * 100) / 100,
      summary: candidate.summary.trim(),
      keywords: candidate.keywords.map(k => String(k).trim()).filter(Boolean),
      locationRequired: Boolean(candidate.locationRequired),
      recommendedActions: candidate.recommendedActions.map(a => String(a).trim()).filter(Boolean),
      source: candidate.source || 'groq',
    };

    return { isValid: true, sanitized };
  }

  /**
   * Applies safety rules if confidence < AI_CONFIDENCE_THRESHOLD (0.60 default).
   * For uncertain situations, safety takes priority:
   * Label: "Possible emergency detected"
   * Strongly offer: "CALL EMERGENCY SERVICES"
   */
  public static enforceConfidenceThreshold(
    analysis: EmergencyAnalysis,
    threshold: number
  ): EmergencyAnalysis {
    if (analysis.confidence < threshold) {
      const emergencyActions = [
        'CALL EMERGENCY SERVICES IMMEDIATELY',
        ...analysis.recommendedActions.filter(a => !a.toUpperCase().includes('CALL EMERGENCY'))
      ];

      return {
        ...analysis,
        emergencyType: 'Possible emergency detected',
        summary: `Uncertain situation detected (${analysis.emergencyType}). Precautionary emergency calling recommended.`,
        recommendedActions: emergencyActions,
        locationRequired: true,
      };
    }

    return analysis;
  }
}
