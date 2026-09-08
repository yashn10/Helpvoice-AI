import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmergencyAnalysis {
  language: string;
  emergencyType: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  summary: string;
  keywords: string[];
  locationRequired: boolean;
  recommendedActions: string[];
  source?: 'groq' | 'local-fallback' | 'demo';
}

export interface EmergencyAnalysisResponse {
  success: boolean;
  data: EmergencyAnalysis;
  notice?: string;
  source: 'groq' | 'local-fallback' | 'demo';
}

export interface EmergencyGuidance {
  emergencyType: string;
  category: string;
  immediateSteps: string[];
  doNotDo: string[];
  callEmergencyNow: boolean;
  source: string;
}

export interface HealthStatus {
  status: string;
  services: {
    database: string;
    groq: string;
    localAI: string;
    hospitalProvider: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class EmergencyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;

  private recognition: any = null;
  public isListening = false;
  public speechSubject = new Subject<string>();

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.speechSubject.next(transcript);
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  public isSpeechSupported(): boolean {
    return !!this.recognition;
  }

  public startListening(lang: string = 'en-US'): boolean {
    if (!this.recognition) return false;

    try {
      this.recognition.lang = lang;
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.warn('Could not start recognition', e);
      this.isListening = false;
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public analyzeEmergency(text: string): Observable<EmergencyAnalysisResponse> {
    return this.http.post<EmergencyAnalysisResponse>(`${this.apiUrl}/emergency/analyze`, { text }).pipe(
      catchError(() => {
        // Safe offline frontend fallback if backend is unreachable
        return of({
          success: true,
          data: {
            language: 'English',
            emergencyType: 'Immediate Emergency',
            category: 'Trauma',
            severity: 'CRITICAL',
            confidence: 0.90,
            summary: 'Network unreachable. Direct emergency protocol engaged.',
            keywords: ['emergency', 'sos'],
            locationRequired: true,
            recommendedActions: [
              `CALL ${environment.emergency.defaultEmergencyNumber} IMMEDIATELY`,
              'Seek immediate assistance from nearby persons'
            ],
            source: 'local-fallback'
          },
          notice: "We're using emergency fallback assistance.",
          source: 'local-fallback'
        } as EmergencyAnalysisResponse);
      })
    );
  }

  public getGuidance(type: string): Observable<{ success: boolean; data: EmergencyGuidance }> {
    return this.http.get<{ success: boolean; data: EmergencyGuidance }>(`${this.apiUrl}/emergency/guidance/${encodeURIComponent(type)}`);
  }

  public checkHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.apiUrl}/health`).pipe(
      catchError(() => of({
        status: 'offline',
        services: {
          database: 'offline',
          groq: 'unavailable',
          localAI: 'available',
          hospitalProvider: 'demo'
        }
      }))
    );
  }

  public callEmergency(number: string = environment.emergency.defaultEmergencyNumber): void {
    window.location.href = `tel:${number}`;
  }
}
