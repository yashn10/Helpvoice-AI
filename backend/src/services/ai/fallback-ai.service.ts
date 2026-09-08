import { EmergencyAnalysis, EmergencyGuidance, EmergencySeverity } from './types';

interface KeywordRule {
  term: string;
  category: string;
  emergencyType: string;
  language: string;
  baseSeverity: EmergencySeverity;
  weight: number;
}

export class FallbackAIService {
  // Predefined keyword dictionary across English, Hindi, Marathi
  private static readonly RULES: KeywordRule[] = [
    // --- English ---
    { term: 'not breathing', category: 'Medical', emergencyType: 'Breathing Difficulty', language: 'English', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'difficulty breathing', category: 'Medical', emergencyType: 'Breathing Difficulty', language: 'English', baseSeverity: 'HIGH', weight: 0.88 },
    { term: 'breathing', category: 'Medical', emergencyType: 'Breathing Difficulty', language: 'English', baseSeverity: 'HIGH', weight: 0.80 },
    { term: 'unconscious', category: 'Medical', emergencyType: 'Unconscious Person', language: 'English', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'severe bleeding', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'English', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'heavy bleeding', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'English', baseSeverity: 'CRITICAL', weight: 0.92 },
    { term: 'bleeding', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'English', baseSeverity: 'HIGH', weight: 0.82 },
    { term: 'blood', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'English', baseSeverity: 'HIGH', weight: 0.78 },
    { term: 'chest pain', category: 'Cardiac', emergencyType: 'Chest Pain', language: 'English', baseSeverity: 'HIGH', weight: 0.90 },
    { term: 'fire trapped', category: 'Fire', emergencyType: 'Fire', language: 'English', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'fire', category: 'Fire', emergencyType: 'Fire', language: 'English', baseSeverity: 'HIGH', weight: 0.85 },
    { term: 'burn', category: 'Burn', emergencyType: 'Burn', language: 'English', baseSeverity: 'HIGH', weight: 0.82 },
    { term: 'severe burn', category: 'Burn', emergencyType: 'Burn', language: 'English', baseSeverity: 'HIGH', weight: 0.89 },
    { term: 'accident', category: 'Accident', emergencyType: 'Accident', language: 'English', baseSeverity: 'HIGH', weight: 0.85 },
    { term: 'serious injury', category: 'Trauma', emergencyType: 'Accident', language: 'English', baseSeverity: 'HIGH', weight: 0.88 },
    { term: 'minor injury', category: 'Trauma', emergencyType: 'Accident', language: 'English', baseSeverity: 'MEDIUM', weight: 0.75 },
    { term: 'moderate pain', category: 'Medical', emergencyType: 'Other', language: 'English', baseSeverity: 'MEDIUM', weight: 0.70 },
    { term: 'poison', category: 'Toxicology', emergencyType: 'Poisoning', language: 'English', baseSeverity: 'HIGH', weight: 0.88 },
    { term: 'stroke', category: 'Neurological', emergencyType: 'Stroke-like Symptoms', language: 'English', baseSeverity: 'CRITICAL', weight: 0.92 },
    { term: 'fracture', category: 'Trauma', emergencyType: 'Fracture', language: 'English', baseSeverity: 'HIGH', weight: 0.84 },
    { term: 'pregnancy', category: 'Maternal', emergencyType: 'Pregnancy Emergency', language: 'English', baseSeverity: 'HIGH', weight: 0.85 },
    { term: 'child emergency', category: 'Pediatric', emergencyType: 'Child Emergency', language: 'English', baseSeverity: 'CRITICAL', weight: 0.90 },

    // --- Hindi ---
    { term: 'सांस नहीं', category: 'Medical', emergencyType: 'Breathing Difficulty', language: 'Hindi', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'सांस', category: 'Medical', emergencyType: 'Breathing Difficulty', language: 'Hindi', baseSeverity: 'HIGH', weight: 0.82 },
    { term: 'बेहोश', category: 'Medical', emergencyType: 'Unconscious Person', language: 'Hindi', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'भारी खून', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'Hindi', baseSeverity: 'CRITICAL', weight: 0.92 },
    { term: 'खून', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'Hindi', baseSeverity: 'HIGH', weight: 0.85 },
    { term: 'रक्त', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'Hindi', baseSeverity: 'HIGH', weight: 0.82 },
    { term: 'सीने में दर्द', category: 'Cardiac', emergencyType: 'Chest Pain', language: 'Hindi', baseSeverity: 'HIGH', weight: 0.90 },
    { term: 'एक्सीडेंट', category: 'Accident', emergencyType: 'Accident', language: 'Hindi', baseSeverity: 'HIGH', weight: 0.88 },
    { term: 'आग', category: 'Fire', emergencyType: 'Fire', language: 'Hindi', baseSeverity: 'HIGH', weight: 0.85 },
    { term: 'जलना', category: 'Burn', emergencyType: 'Burn', language: 'Hindi', baseSeverity: 'HIGH', weight: 0.82 },
    { term: 'जहर', category: 'Toxicology', emergencyType: 'Poisoning', language: 'Hindi', baseSeverity: 'HIGH', weight: 0.88 },

    // --- Marathi ---
    { term: 'श्वास नाही', category: 'Medical', emergencyType: 'Breathing Difficulty', language: 'Marathi', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'श्वास', category: 'Medical', emergencyType: 'Breathing Difficulty', language: 'Marathi', baseSeverity: 'HIGH', weight: 0.82 },
    { term: 'बेशुद्ध', category: 'Medical', emergencyType: 'Unconscious Person', language: 'Marathi', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'खूप रक्त', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'Marathi', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'जास्त रक्त', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'Marathi', baseSeverity: 'CRITICAL', weight: 0.95 },
    { term: 'रक्त', category: 'Trauma', emergencyType: 'Severe Bleeding', language: 'Marathi', baseSeverity: 'HIGH', weight: 0.80 },
    { term: 'छातीत दुखणे', category: 'Cardiac', emergencyType: 'Chest Pain', language: 'Marathi', baseSeverity: 'HIGH', weight: 0.90 },
    { term: 'अपघात', category: 'Accident', emergencyType: 'Accident', language: 'Marathi', baseSeverity: 'HIGH', weight: 0.88 },
    { term: 'आग', category: 'Fire', emergencyType: 'Fire', language: 'Marathi', baseSeverity: 'HIGH', weight: 0.85 },
    { term: 'भाजणे', category: 'Burn', emergencyType: 'Burn', language: 'Marathi', baseSeverity: 'HIGH', weight: 0.82 },
    { term: 'विष', category: 'Toxicology', emergencyType: 'Poisoning', language: 'Marathi', baseSeverity: 'HIGH', weight: 0.88 },
  ];

  // Specific high-priority critical triggers
  private static readonly CRITICAL_TRIGGERS: string[] = [
    'not breathing',
    'unconscious',
    'severe bleeding',
    'heavy bleeding',
    'fire trapped',
    'बेहोश',
    'सांस नहीं',
    'खूप रक्त',
    'जास्त रक्त',
    'बेशुद्ध',
    'श्वास नाही',
  ];

  // Safe Predefined Emergency Guidance for all 13 standard categories
  private static readonly PREDEFINED_GUIDANCE: Record<string, EmergencyGuidance> = {
    'Accident': {
      emergencyType: 'Accident',
      category: 'Accident',
      immediateSteps: [
        'Ensure the scene is safe for yourself and others before approaching.',
        'Call emergency services immediately with your current location.',
        'Do not move injured persons unless in immediate danger from fire or traffic.',
        'Keep the victim calm, warm, and conscious.'
      ],
      doNotDo: [
        'Do not remove a motorcycle rider helmet unless airway is obstructed.',
        'Do not give food or drink to an injured person.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Severe Bleeding': {
      emergencyType: 'Severe Bleeding',
      category: 'Trauma',
      immediateSteps: [
        'Apply direct, firm pressure over the wound using a clean cloth or sterile bandage.',
        'Maintain continuous pressure without lifting the cloth.',
        'If possible, elevate the injured area above heart level.',
        'Have the patient lie down and keep warm to treat for shock.'
      ],
      doNotDo: [
        'Do not remove objects deeply embedded in the wound.',
        'Do not remove soaked dressings; place new dressings on top.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Chest Pain': {
      emergencyType: 'Chest Pain',
      category: 'Cardiac',
      immediateSteps: [
        'Call emergency services immediately without delay.',
        'Have the person rest in a comfortable seated position (W-position or leaning back).',
        'Loosen tight clothing around neck and waist.',
        'If prescribed and alert, assist them with taking their nitroglycerin.'
      ],
      doNotDo: [
        'Do not allow the person to walk, exert themselves, or drive.',
        'Do not ignore crushing pressure, tightness, or pain spreading to arm or jaw.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Breathing Difficulty': {
      emergencyType: 'Breathing Difficulty',
      category: 'Medical',
      immediateSteps: [
        'Sit the person upright in a comfortable position.',
        'Loosen restrictive clothing and ensure adequate ventilation.',
        'Assist with prescribed inhaler if available (e.g. for asthma).',
        'Keep the person calm and take slow, deep breaths together.'
      ],
      doNotDo: [
        'Do not have the person lie flat.',
        'Do not crowd around the patient.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Unconscious Person': {
      emergencyType: 'Unconscious Person',
      category: 'Medical',
      immediateSteps: [
        'Call emergency services immediately.',
        'Check for response by gently tapping shoulders and asking loudly.',
        'Check airway and breathing. If breathing normally, place in recovery position on side.',
        'If not breathing or only gasping, initiate CPR chest compressions immediately.'
      ],
      doNotDo: [
        'Do not place a pillow under their head.',
        'Do not give anything to drink or eat.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Fire': {
      emergencyType: 'Fire',
      category: 'Fire',
      immediateSteps: [
        'Evacuate immediately away from flames and smoke.',
        'Stay low to the ground where the air is cooler and clearer.',
        'Alert others and call emergency fire services once safely outside.',
        'If clothes catch fire: STOP, DROP, and ROLL.'
      ],
      doNotDo: [
        'Do not use elevators during a fire.',
        'Do not re-enter a burning building for belongings.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Burn': {
      emergencyType: 'Burn',
      category: 'Burn',
      immediateSteps: [
        'Cool the burn immediately under gentle, cool running water for at least 10–20 minutes.',
        'Carefully remove loose clothing and jewelry near the burn before swelling starts.',
        'Cover loosely with a clean, sterile, non-stick dressing or clean cling film.',
        'Keep the person warm.'
      ],
      doNotDo: [
        'Do not use ice, ice water, butter, oils, or toothpaste on burns.',
        'Do not break blisters or peel stuck clothing.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Poisoning': {
      emergencyType: 'Poisoning',
      category: 'Toxicology',
      immediateSteps: [
        'Call emergency services or national poison control center immediately.',
        'Try to identify the substance, container, amount, and time of exposure.',
        'If inhaled, move to fresh air immediately.',
        'If on skin or eyes, flush with clean water for 15 minutes.'
      ],
      doNotDo: [
        'Do not induce vomiting unless explicitly instructed by medical professionals.',
        'Do not give activated charcoal, milk, or home remedies without professional advice.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Stroke-like Symptoms': {
      emergencyType: 'Stroke-like Symptoms',
      category: 'Neurological',
      immediateSteps: [
        'Think FAST: Face drooping? Arm weakness? Slurred speech? Time to call emergency services.',
        'Note the exact time symptoms started.',
        'Keep the person calm, resting, and slightly propped up.',
        'Monitor consciousness and breathing continuously.'
      ],
      doNotDo: [
        'Do not give aspirin or other medication without medical instruction.',
        'Do not give food, water, or medication by mouth.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Fracture': {
      emergencyType: 'Fracture',
      category: 'Trauma',
      immediateSteps: [
        'Immobilize and support the injured limb in the position found.',
        'Apply a cold compress wrapped in a towel to reduce swelling.',
        'If bone breaks through the skin, cover gently with a sterile dressing.',
        'Seek immediate medical care.'
      ],
      doNotDo: [
        'Do not attempt to realign or push protruding bones back in.',
        'Do not allow the patient to walk on an injured leg or ankle.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Pregnancy Emergency': {
      emergencyType: 'Pregnancy Emergency',
      category: 'Maternal',
      immediateSteps: [
        'Call emergency services immediately for severe abdominal pain, bleeding, or labor signs.',
        'Have the mother rest on her left side to maximize blood flow to baby.',
        'Keep her calm, comfortable, and warm.',
        'Prepare clean towels and notify the receiving hospital.'
      ],
      doNotDo: [
        'Do not encourage pushing until trained medical responders arrive.',
        'Do not administer unprescribed medications.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Child Emergency': {
      emergencyType: 'Child Emergency',
      category: 'Pediatric',
      immediateSteps: [
        'Call emergency services immediately.',
        'Keep the child calm and supported in your arms or a comfortable position.',
        'Check responsiveness and clear breathing pathways.',
        'Provide reassurance and monitor temperature, breathing rate, and alertness.'
      ],
      doNotDo: [
        'Do not shake or abruptly move the child.',
        'Do not administer adult medications.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
    'Other': {
      emergencyType: 'Other Emergency',
      category: 'General',
      immediateSteps: [
        'Contact emergency services if you suspect an urgent health or safety hazard.',
        'Assess the immediate surroundings for danger.',
        'Stay with the affected individual until medical responders arrive.'
      ],
      doNotDo: [
        'Do not delay calling emergency numbers when in doubt.'
      ],
      callEmergencyNow: true,
      source: 'predefined',
    },
  };

  /**
   * Deterministic multilingual analysis of emergency text.
   * Completely offline, synchronous, zero-dependency.
   */
  public analyzeEmergency(text: string): EmergencyAnalysis {
    const raw = (text || '').trim();
    const lower = raw.toLowerCase();

    // 1. Detect language (Hindi, Marathi, or English)
    const detectedLanguage = this.detectLanguage(raw);

    // 2. Extract matching keywords and matched rules
    const matchedKeywords: string[] = [];
    const matchedRules: KeywordRule[] = [];

    for (const rule of FallbackAIService.RULES) {
      if (lower.includes(rule.term.toLowerCase())) {
        matchedKeywords.push(rule.term);
        matchedRules.push(rule);
      }
    }

    // 3. Determine severity
    let severity: EmergencySeverity = 'LOW';
    let isCritical = false;

    // Check critical triggers first
    for (const trigger of FallbackAIService.CRITICAL_TRIGGERS) {
      if (lower.includes(trigger.toLowerCase())) {
        isCritical = true;
        severity = 'CRITICAL';
        if (!matchedKeywords.includes(trigger)) {
          matchedKeywords.push(trigger);
        }
        break;
      }
    }

    if (!isCritical) {
      if (matchedRules.some(r => r.baseSeverity === 'HIGH')) {
        severity = 'HIGH';
      } else if (matchedRules.some(r => r.baseSeverity === 'MEDIUM')) {
        severity = 'MEDIUM';
      } else if (matchedKeywords.length > 0) {
        severity = 'MEDIUM';
      } else {
        severity = 'LOW';
      }
    }

    // 4. Determine category and emergencyType
    let category = 'Medical';
    let emergencyType = 'General Emergency';

    if (matchedRules.length > 0) {
      // Pick highest weight rule
      const bestRule = [...matchedRules].sort((a, b) => b.weight - a.weight)[0];
      category = bestRule.category;
      emergencyType = bestRule.emergencyType;
    } else if (raw.length > 0) {
      category = 'Unspecified';
      emergencyType = 'Possible Emergency';
    }

    // 5. Compute deterministic confidence
    let confidence = 0.50;
    if (matchedKeywords.length >= 2) {
      confidence = 0.88;
    } else if (matchedKeywords.length === 1) {
      confidence = 0.82;
    } else if (raw.length > 10) {
      confidence = 0.55;
    } else {
      confidence = 0.40;
    }

    // 6. Build recommended actions and safe summary
    const guidance = this.getPredefinedGuidance(emergencyType);
    const recommendedActions = [
      'Contact emergency services (112)',
      ...guidance.immediateSteps.slice(0, 2),
    ];

    let summary = `Detected ${emergencyType.toLowerCase()} situation`;
    if (matchedKeywords.length > 0) {
      summary = `Possible ${emergencyType.toLowerCase()} reported with keywords: ${matchedKeywords.slice(0, 3).join(', ')}`;
    }

    return {
      language: detectedLanguage,
      emergencyType,
      category,
      severity,
      confidence,
      summary,
      keywords: matchedKeywords.length > 0 ? matchedKeywords : ['emergency'],
      locationRequired: true,
      recommendedActions,
      source: 'local-fallback',
    };
  }

  /**
   * Retrieves predefined safe emergency guidance by type.
   */
  public getPredefinedGuidance(emergencyType: string): EmergencyGuidance {
    const directMatch = FallbackAIService.PREDEFINED_GUIDANCE[emergencyType];
    if (directMatch) return directMatch;

    // Fuzzy matching against keys
    const lowerType = emergencyType.toLowerCase();
    for (const [key, guidance] of Object.entries(FallbackAIService.PREDEFINED_GUIDANCE)) {
      if (lowerType.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerType)) {
        return guidance;
      }
    }

    return FallbackAIService.PREDEFINED_GUIDANCE['Other'];
  }

  /**
   * Detects whether text is predominantly Marathi, Hindi, or English.
   */
  private detectLanguage(text: string): string {
    // Marathi unique markers or characters
    const marathiWords = ['अपघात', 'रक्त', 'खूप', 'छातीत', 'दुखणे', 'श्वास', 'बेशुद्ध', 'भाजणे', 'विष', 'आहे', 'नाही', 'कसा', 'मदत'];
    const hindiWords = ['एक्सीडेंट', 'खून', 'सीने', 'दर्द', 'सांस', 'बेहोश', 'जलना', 'जहर', 'है', 'नहीं', 'मदद'];

    const hasDevanagari = /[\u0900-\u097F]/.test(text);

    if (hasDevanagari) {
      for (const w of marathiWords) {
        if (text.includes(w)) return 'Marathi';
      }
      for (const w of hindiWords) {
        if (text.includes(w)) return 'Hindi';
      }
      return 'Hindi'; // Devanagari default
    }

    return 'English';
  }
}

export const fallbackAIService = new FallbackAIService();
