import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EmergencyService, EmergencyAnalysis, EmergencyGuidance, HealthStatus } from './services/emergency.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit, OnDestroy {
  private emergencyService = inject(EmergencyService);
  private speechSub?: Subscription;

  // Signals for state management
  public emergencyText = signal<string>('');
  public isListening = signal<boolean>(false);
  public isAnalyzing = signal<boolean>(false);
  public analysisResult = signal<EmergencyAnalysis | null>(null);
  public fallbackNotice = signal<string | null>(null);
  public guidanceData = signal<EmergencyGuidance | null>(null);
  public currentLanguage = signal<'en' | 'hi' | 'mr'>('en');
  public healthStatus = signal<HealthStatus | null>(null);
  public speechSupported = signal<boolean>(true);

  // Predefined emergency test presets
  public presets = [
    { label: 'Severe Bleeding (मराठी)', text: 'खूप रक्त येत आहे, अपघात झाला आहे', lang: 'mr' },
    { label: 'Unconscious (हिन्दी)', text: 'मरीज बेहोश है और सांस नहीं ले रहा', lang: 'hi' },
    { label: 'Chest Pain (English)', text: 'Severe crushing chest pain radiating to left arm', lang: 'en' },
    { label: 'Fire Emergency', text: 'Fire outbreak in building, people trapped inside', lang: 'en' },
  ];

  ngOnInit(): void {
    this.speechSupported.set(this.emergencyService.isSpeechSupported());
    this.checkSystemHealth();

    this.speechSub = this.emergencyService.speechSubject.subscribe((transcript) => {
      this.emergencyText.set(transcript);
    });
  }

  ngOnDestroy(): void {
    this.speechSub?.unsubscribe();
  }

  public checkSystemHealth(): void {
    this.emergencyService.checkHealth().subscribe((status) => {
      this.healthStatus.set(status);
    });
  }

  public toggleVoice(): void {
    if (!this.speechSupported()) {
      this.fallbackNotice.set('Voice recognition unavailable. You can type your emergency instead.');
      return;
    }

    if (this.isListening()) {
      this.emergencyService.stopListening();
      this.isListening.set(false);
      if (this.emergencyText().trim().length > 0) {
        this.submitEmergency();
      }
    } else {
      const langCode = this.currentLanguage() === 'hi' ? 'hi-IN' : this.currentLanguage() === 'mr' ? 'mr-IN' : 'en-US';
      const started = this.emergencyService.startListening(langCode);
      if (started) {
        this.isListening.set(true);
        this.fallbackNotice.set(null);
      } else {
        this.speechSupported.set(false);
        this.fallbackNotice.set('Voice recognition unavailable. You can type your emergency instead.');
      }
    }
  }

  public selectPreset(preset: { text: string; lang: string }): void {
    this.currentLanguage.set(preset.lang as any);
    this.emergencyText.set(preset.text);
    this.submitEmergency();
  }

  public submitEmergency(): void {
    const text = this.emergencyText().trim();
    if (!text) return;

    this.isAnalyzing.set(true);
    this.fallbackNotice.set(null);

    this.emergencyService.analyzeEmergency(text).subscribe({
      next: (res) => {
        this.isAnalyzing.set(false);
        this.analysisResult.set(res.data);
        if (res.notice) {
          this.fallbackNotice.set(res.notice);
        }

        // Fetch corresponding guidance
        this.fetchGuidance(res.data.emergencyType);
      },
      error: () => {
        this.isAnalyzing.set(false);
        this.fallbackNotice.set("We're using emergency fallback assistance.");
      },
    });
  }

  public fetchGuidance(type: string): void {
    this.emergencyService.getGuidance(type).subscribe({
      next: (res) => {
        if (res.success) {
          this.guidanceData.set(res.data);
        }
      },
    });
  }

  public callEmergency(): void {
    this.emergencyService.callEmergency(environment.emergency.defaultEmergencyNumber);
  }

  public setLanguage(lang: 'en' | 'hi' | 'mr'): void {
    this.currentLanguage.set(lang);
  }
}
