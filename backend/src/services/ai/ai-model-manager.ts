export interface ConfiguredModel {
  tier: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | 'QUATERNARY';
  name: string;
  index: number;
}

export class AIModelManager {
  /**
   * Retrieves the configured Groq models in strict fallback priority order.
   * Model names are NEVER hard-coded.
   */
  public static getConfiguredModels(): ConfiguredModel[] {
    const rawSlots: Array<{ tier: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | 'QUATERNARY'; envVal: string | undefined }> = [
      { tier: 'PRIMARY', envVal: process.env.GROQ_PRIMARY_MODEL },
      { tier: 'SECONDARY', envVal: process.env.GROQ_SECONDARY_MODEL },
      { tier: 'TERTIARY', envVal: process.env.GROQ_TERTIARY_MODEL },
      { tier: 'QUATERNARY', envVal: process.env.GROQ_QUATERNARY_MODEL },
    ];

    const configured: ConfiguredModel[] = [];
    let idx = 1;

    for (const slot of rawSlots) {
      const trimmed = slot.envVal?.trim();
      if (trimmed && trimmed.length > 0) {
        configured.push({
          tier: slot.tier,
          name: trimmed,
          index: idx++,
        });
      }
    }

    return configured;
  }

  /**
   * Returns speech-to-text model name if configured.
   */
  public static getSTTModel(): string | undefined {
    const model = process.env.GROQ_STT_MODEL?.trim();
    return model && model.length > 0 ? model : undefined;
  }
}
