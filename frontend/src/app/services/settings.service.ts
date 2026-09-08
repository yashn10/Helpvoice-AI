import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type AppTheme = 'dark' | 'light' | 'auto';
export type AppLanguage = 'en' | 'hi' | 'mr' | 'gu' | 'bn' | 'ta' | 'te' | 'kn';

export interface LanguageOption {
  code: AppLanguage;
  name: string;
  nativeName: string;
  speechLocale: string;
  flag: string;
}

export interface AppSettings {
  theme: AppTheme;
  language: AppLanguage;
  voiceSpeed: number; // 0.8, 1.0, 1.2
  audioPromptsEnabled: boolean;
  hapticEnabled: boolean;
  defaultEmergencyNumber: string;
  autoDialCountdown: number; // 0 for instant, 3 for 3-second buffer
  sosSirenEnabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;
  private storageKey = 'helpvoice_app_settings';
  private tokenKey = 'helpvoice_auth_token';

  public supportedLanguages: LanguageOption[] = [
    { code: 'en', name: 'English', nativeName: 'English', speechLocale: 'en-US', flag: '🌐' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechLocale: 'hi-IN', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechLocale: 'mr-IN', flag: '🚩' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechLocale: 'gu-IN', flag: '🦁' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechLocale: 'bn-IN', flag: '🐅' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechLocale: 'ta-IN', flag: '🏛️' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechLocale: 'te-IN', flag: '🌾' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechLocale: 'kn-IN', flag: '🐘' },
  ];

  // Reactive settings signals
  public currentTheme = signal<AppTheme>('dark');
  public currentLanguage = signal<AppLanguage>('en');
  public voiceSpeed = signal<number>(1.0);
  public audioPromptsEnabled = signal<boolean>(true);
  public hapticEnabled = signal<boolean>(true);
  public defaultEmergencyNumber = signal<string>('112');
  public autoDialCountdown = signal<number>(0);
  public sosSirenEnabled = signal<boolean>(true);

  constructor() {
    this.loadSettings();

    // Effect to apply theme whenever currentTheme changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  public loadSettings(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed: AppSettings = JSON.parse(raw);
        if (parsed.theme) this.currentTheme.set(parsed.theme);
        if (parsed.language) this.currentLanguage.set(parsed.language);
        if (parsed.voiceSpeed) this.voiceSpeed.set(parsed.voiceSpeed);
        if (parsed.audioPromptsEnabled !== undefined) this.audioPromptsEnabled.set(parsed.audioPromptsEnabled);
        if (parsed.hapticEnabled !== undefined) this.hapticEnabled.set(parsed.hapticEnabled);
        if (parsed.defaultEmergencyNumber) this.defaultEmergencyNumber.set(parsed.defaultEmergencyNumber);
        if (parsed.autoDialCountdown !== undefined) this.autoDialCountdown.set(parsed.autoDialCountdown);
        if (parsed.sosSirenEnabled !== undefined) this.sosSirenEnabled.set(parsed.sosSirenEnabled);
      }
    } catch {
      // Use defaults
    }
    this.applyTheme(this.currentTheme());
  }

  public saveSettings(): void {
    const settings: AppSettings = {
      theme: this.currentTheme(),
      language: this.currentLanguage(),
      voiceSpeed: this.voiceSpeed(),
      audioPromptsEnabled: this.audioPromptsEnabled(),
      hapticEnabled: this.hapticEnabled(),
      defaultEmergencyNumber: this.defaultEmergencyNumber(),
      autoDialCountdown: this.autoDialCountdown(),
      sosSirenEnabled: this.sosSirenEnabled(),
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch {}

    // Sync to backend if authenticated
    try {
      const token = localStorage.getItem(this.tokenKey);
      if (token) {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        });
        this.http.put(`${this.baseUrl}/auth/settings`, settings, { headers }).subscribe({
          error: () => {},
        });
      }
    } catch {}
  }

  public applyRemoteSettings(remote: Partial<AppSettings>): void {
    if (!remote) return;
    if (remote.theme) this.currentTheme.set(remote.theme);
    if (remote.language) this.currentLanguage.set(remote.language);
    if (remote.voiceSpeed) this.voiceSpeed.set(remote.voiceSpeed);
    if (remote.audioPromptsEnabled !== undefined) this.audioPromptsEnabled.set(remote.audioPromptsEnabled);
    if (remote.hapticEnabled !== undefined) this.hapticEnabled.set(remote.hapticEnabled);
    if (remote.defaultEmergencyNumber) this.defaultEmergencyNumber.set(remote.defaultEmergencyNumber);
    if (remote.autoDialCountdown !== undefined) this.autoDialCountdown.set(remote.autoDialCountdown);
    if (remote.sosSirenEnabled !== undefined) this.sosSirenEnabled.set(remote.sosSirenEnabled);
    this.applyTheme(this.currentTheme());
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(remote));
    } catch {}
  }

  public setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    this.saveSettings();
  }

  public setLanguage(lang: AppLanguage): void {
    this.currentLanguage.set(lang);
    this.saveSettings();
  }

  public setVoiceSpeed(speed: number): void {
    this.voiceSpeed.set(speed);
    this.saveSettings();
  }

  public toggleAudioPrompts(): void {
    this.audioPromptsEnabled.set(!this.audioPromptsEnabled());
    this.saveSettings();
  }

  public toggleHaptic(): void {
    this.hapticEnabled.set(!this.hapticEnabled());
    this.saveSettings();
  }

  public setDefaultEmergencyNumber(num: string): void {
    this.defaultEmergencyNumber.set(num);
    this.saveSettings();
  }

  public setAutoDialCountdown(seconds: number): void {
    this.autoDialCountdown.set(seconds);
    this.saveSettings();
  }

  public toggleSosSiren(): void {
    this.sosSirenEnabled.set(!this.sosSirenEnabled());
    this.saveSettings();
  }

  public resetToDefaults(): void {
    this.currentTheme.set('dark');
    this.currentLanguage.set('en');
    this.voiceSpeed.set(1.0);
    this.audioPromptsEnabled.set(true);
    this.hapticEnabled.set(true);
    this.defaultEmergencyNumber.set('112');
    this.autoDialCountdown.set(0);
    this.sosSirenEnabled.set(true);
    this.saveSettings();
    this.applyTheme('dark');
  }

  public getSpeechLocale(): string {
    const lang = this.supportedLanguages.find((l) => l.code === this.currentLanguage());
    return lang ? lang.speechLocale : 'en-US';
  }

  private applyTheme(theme: AppTheme): void {
    let resolvedTheme = theme;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = prefersDark ? 'dark' : 'light';
    }

    const htmlEl = document.documentElement;
    htmlEl.setAttribute('data-theme', resolvedTheme);

    if (resolvedTheme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  }
}
