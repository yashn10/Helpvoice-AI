import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { EmergencyService, EmergencyAnalysis, EmergencyGuidance, HealthStatus } from './services/emergency.service';
import { AuthService, EmergencyContact, UserProfile } from './services/auth.service';
import { VoiceDialerService, VoiceCallMatch } from './services/voice-dialer.service';
import { SettingsService, AppLanguage, AppTheme } from './services/settings.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit, OnDestroy {
  public emergencyService = inject(EmergencyService);
  public authService = inject(AuthService);
  public voiceDialer = inject(VoiceDialerService);
  public settingsService = inject(SettingsService);
  private subs: Subscription = new Subscription();

  // Signals for emergency state
  public emergencyText = signal<string>('');
  public isListening = signal<boolean>(false);
  public isAnalyzing = signal<boolean>(false);
  public analysisResult = signal<EmergencyAnalysis | null>(null);
  public fallbackNotice = signal<string | null>(null);
  public guidanceData = signal<EmergencyGuidance | null>(null);
  public healthStatus = signal<HealthStatus | null>(null);
  public speechSupported = signal<boolean>(true);
  public showExitDialog = signal<boolean>(false);
  public showVoiceGuide = signal<boolean>(false);
  public showSettingsModal = signal<boolean>(false);
  public voiceAutoTriggered = signal<boolean>(false);
  public activeCallNotice = signal<string | null>(null);

  // Splash Screen State
  public showSplashScreen = signal<boolean>(true);
  public splashFading = signal<boolean>(false);
  public splashProgress = signal<number>(15);
  public splashStepText = signal<string>('Initializing Emergency AI Core...');

  // Authentication & Contact Modals
  public showAuthModal = signal<boolean>(false);
  public authMode = signal<'login' | 'register'>('login');
  public authName = signal<string>('');
  public authEmail = signal<string>('');
  public authPassword = signal<string>('');
  public authError = signal<string | null>(null);
  public authLoading = signal<boolean>(false);

  // Add Contact Modal
  public showAddContactModal = signal<boolean>(false);
  public contactName = signal<string>('');
  public contactPhone = signal<string>('');
  public contactRelation = signal<string>('Family');
  public contactIsPrimary = signal<boolean>(false);
  public contactError = signal<string | null>(null);

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

    // Check if launched with hands-free trigger
    const isVoiceAuto = window.location.href.includes('auto_listen=true') || window.location.href.includes('emergency');
    if (isVoiceAuto) {
      this.showSplashScreen.set(false);
      this.checkVoiceAutoTrigger(window.location.href);
    } else {
      this.startSplashSequence();
    }

    // Transcript updates
    this.subs.add(
      this.emergencyService.speechSubject.subscribe((transcript) => {
        this.emergencyText.set(transcript);
      })
    );

    // Live Mic State updates (ensures mic animation turns off immediately when stopped)
    this.subs.add(
      this.emergencyService.listeningStateSubject.subscribe((listening) => {
        const wasListening = this.isListening();
        this.isListening.set(listening);

        // Auto-submit when speech recognition finishes after hands-free voice trigger
        if (wasListening && !listening && this.emergencyText().trim().length > 0) {
          this.submitEmergency();
        }
      })
    );

    // Check if launched with auto_listen=true from URL
    this.checkVoiceAutoTrigger(window.location.href);

    // Capacitor App URL Open & Deep Links ("helpvoice://emergency?auto_listen=true")
    try {
      CapApp.addListener('appUrlOpen', (data) => {
        if (data.url) {
          this.checkVoiceAutoTrigger(data.url);
        }
      });

      // Hardware Back Button listener
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (this.showExitDialog()) {
          this.showExitDialog.set(false);
        } else if (!canGoBack) {
          this.showExitDialog.set(true);
        } else {
          window.history.back();
        }
      });
    } catch {
      // Running in standard web browser
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    try {
      CapApp.removeAllListeners();
    } catch {
      // Ignore
    }
  }

  public checkVoiceAutoTrigger(url: string): void {
    if (url.includes('auto_listen=true') || url.includes('emergency')) {
      this.voiceAutoTriggered.set(true);

      // Trigger heavy haptic vibration feedback for hands-free awareness
      try {
        Haptics.impact({ style: ImpactStyle.Heavy });
      } catch {
        // Haptics not available
      }

      // Voice prompt: announce to the user that Helpvoice is actively listening
      this.speakAudioPrompt('Emergency dispatch listening. Describe your situation now.');

      // Start microphone listening after brief audio prompt
      setTimeout(() => {
        if (this.speechSupported() && !this.isListening()) {
          const langCode = this.settingsService.getSpeechLocale();
          this.emergencyService.startListening(langCode);
        }
      }, 800);
    }
  }

  public startSplashSequence(): void {
    // Stage 1: Initial core
    setTimeout(() => {
      this.splashProgress.set(40);
      this.splashStepText.set('Loading Multilingual Dispatch & Settings...');
    }, 450);

    // Stage 2: Network & 112 verification
    setTimeout(() => {
      this.splashProgress.set(80);
      this.splashStepText.set('Connecting Emergency Helplines & SOS...');
    }, 1000);

    // Stage 3: Ready
    setTimeout(() => {
      this.splashProgress.set(100);
      this.splashStepText.set('Emergency System Active & Ready');
    }, 1500);

    // Stage 4: Fade out
    setTimeout(() => {
      this.splashFading.set(true);
    }, 1900);

    // Stage 5: Hide splash
    setTimeout(() => {
      this.showSplashScreen.set(false);
    }, 2300);
  }

  public skipSplash(): void {
    this.splashFading.set(true);
    setTimeout(() => {
      this.showSplashScreen.set(false);
    }, 250);
  }

  private speakAudioPrompt(text: string): void {
    if (!this.settingsService.audioPromptsEnabled()) return;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.settingsService.voiceSpeed();
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('TTS error:', e);
      }
    }
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
      const langCode = this.settingsService.getSpeechLocale();
      const started = this.emergencyService.startListening(langCode);
      if (started) {
        this.isListening.set(true);
        this.fallbackNotice.set(null);
      } else {
        this.speechSupported.set(false);
        this.isListening.set(false);
        this.fallbackNotice.set('Voice recognition unavailable. You can type your emergency instead.');
      }
    }
  }

  public selectPreset(preset: { text: string; lang: string }): void {
    this.settingsService.setLanguage(preset.lang as any);
    this.emergencyText.set(preset.text);
    this.submitEmergency();
  }

  public submitEmergency(): void {
    const text = this.emergencyText().trim();
    if (!text) return;

    // Stop listening if active
    if (this.isListening()) {
      this.emergencyService.stopListening();
      this.isListening.set(false);
    }

    // 1. Evaluate Spoken Transcript for Voice Calling Intent (e.g. "Call Papa", "Call Police", "Call 100", "Fire brigade")
    const callMatch = this.voiceDialer.evaluateVoiceCallIntent(text);
    if (callMatch.matched && callMatch.phoneNumber) {
      this.activeCallNotice.set(`📞 Voice Command Detected: Calling ${callMatch.targetName} (${callMatch.phoneNumber})`);
      this.speakAudioPrompt(callMatch.spokenPrompt || `Calling ${callMatch.targetName}`);

      try {
        Haptics.impact({ style: ImpactStyle.Heavy });
      } catch {}

      // Dial the phone number immediately
      setTimeout(() => {
        this.callNumber(callMatch.phoneNumber!, callMatch.targetName);
      }, 700);

      // If user simply said a short call phrase like "Call Papa", we don't need further medical triage
      if (text.split(' ').length <= 4) {
        return;
      }
    }

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

        // Announce severity via Audio TTS if hands-free was triggered
        if (this.voiceAutoTriggered()) {
          this.speakAudioPrompt(`${res.data.severity} severity emergency detected: ${res.data.emergencyType}.`);
        }

        // Automatically scroll smoothly to the triage results
        setTimeout(() => {
          this.scrollToAnalysis();
        }, 120);
      },
      error: () => {
        this.isAnalyzing.set(false);
        this.fallbackNotice.set("We're using emergency fallback assistance.");
      },
    });
  }

  public scrollToAnalysis(): void {
    const el = document.getElementById('analysis-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    const num = this.settingsService.defaultEmergencyNumber() || environment.emergency.defaultEmergencyNumber;
    this.callNumber(num, `Emergency Services (${num})`);
  }

  public callNumber(phone: string, name?: string): void {
    if (name) {
      this.activeCallNotice.set(`📞 Dialing ${name} (${phone})...`);
      setTimeout(() => {
        this.activeCallNotice.set(null);
      }, 5000);
    }
    this.emergencyService.callEmergency(phone);
  }

  // Settings Actions
  public openSettings(): void {
    this.showSettingsModal.set(true);
  }

  public closeSettings(): void {
    this.showSettingsModal.set(false);
  }

  public setTheme(theme: AppTheme): void {
    this.settingsService.setTheme(theme);
  }

  public setLanguage(lang: AppLanguage): void {
    this.settingsService.setLanguage(lang);
  }

  public setVoiceSpeed(speed: number): void {
    this.settingsService.setVoiceSpeed(speed);
  }

  public toggleAudioPrompts(): void {
    this.settingsService.toggleAudioPrompts();
  }

  public toggleHaptic(): void {
    this.settingsService.toggleHaptic();
  }

  public setDefaultEmergencyNumber(num: string): void {
    this.settingsService.setDefaultEmergencyNumber(num);
  }

  public resetSettings(): void {
    this.settingsService.resetToDefaults();
  }

  public toggleVoiceGuide(): void {
    this.showVoiceGuide.set(!this.showVoiceGuide());
  }

  public triggerTestVoiceSos(): void {
    this.checkVoiceAutoTrigger('helpvoice://emergency?auto_listen=true');
  }

  // Auth Modal Handlers
  public openLoginModal(): void {
    this.authMode.set('login');
    this.authError.set(null);
    this.showAuthModal.set(true);
  }

  public openRegisterModal(): void {
    this.authMode.set('register');
    this.authError.set(null);
    this.showAuthModal.set(true);
  }

  public closeAuthModal(): void {
    this.showAuthModal.set(false);
    this.authError.set(null);
  }

  public handleAuthSubmit(): void {
    const email = this.authEmail().trim();
    const password = this.authPassword().trim();
    const name = this.authName().trim();

    if (!email || !password) {
      this.authError.set('Please enter both email and password.');
      return;
    }

    this.authLoading.set(true);
    this.authError.set(null);

    if (this.authMode() === 'register') {
      if (!name) {
        this.authError.set('Please enter your full name.');
        this.authLoading.set(false);
        return;
      }
      this.authService.register(name, email, password).subscribe((res) => {
        this.authLoading.set(false);
        if (res.success) {
          this.showAuthModal.set(false);
          this.authName.set('');
          this.authEmail.set('');
          this.authPassword.set('');
        } else {
          this.authError.set(res.error || 'Registration failed.');
        }
      });
    } else {
      this.authService.login(email, password).subscribe((res) => {
        this.authLoading.set(false);
        if (res.success) {
          this.showAuthModal.set(false);
          this.authEmail.set('');
          this.authPassword.set('');
        } else {
          this.authError.set(res.error || 'Invalid email or password.');
        }
      });
    }
  }

  public handleLogout(): void {
    this.authService.logout();
  }

  // Custom Emergency Contacts Handlers
  public openAddContactModal(): void {
    this.contactName.set('');
    this.contactPhone.set('');
    this.contactRelation.set('Family');
    this.contactIsPrimary.set(false);
    this.contactError.set(null);
    this.showAddContactModal.set(true);
  }

  public closeAddContactModal(): void {
    this.showAddContactModal.set(false);
    this.contactError.set(null);
  }

  public handleAddContactSubmit(): void {
    const name = this.contactName().trim();
    const phone = this.contactPhone().trim();
    const relation = this.contactRelation().trim();
    const isPrimary = this.contactIsPrimary();

    if (!name || !phone) {
      this.contactError.set('Please provide both contact name and phone number.');
      return;
    }

    this.authService.addContact({ name, phone, relation, isPrimary }).subscribe(() => {
      this.showAddContactModal.set(false);
      this.contactName.set('');
      this.contactPhone.set('');
    });
  }

  public handleDeleteContact(contactId: string): void {
    this.authService.deleteContact(contactId).subscribe();
  }

  // Exit dialog handlers
  public promptExit(): void {
    this.showExitDialog.set(true);
  }

  public cancelExit(): void {
    this.showExitDialog.set(false);
  }

  public confirmExit(): void {
    this.showExitDialog.set(false);
    try {
      CapApp.exitApp();
    } catch {
      window.close();
    }
  }
}
