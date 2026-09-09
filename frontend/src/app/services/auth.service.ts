import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emergencyContacts: EmergencyContact[];
  settings?: any;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;
  private tokenKey = 'helpvoice_auth_token';
  private localContactsKey = 'helpvoice_local_contacts';

  // Signals for reactive state
  public currentUser = signal<UserProfile | null>(null);
  public isAuthenticated = signal<boolean>(false);
  public emergencyContacts = signal<EmergencyContact[]>([]);

  // Default emergency numbers directory
  public emergencyServices = [
    { code: '112', name: 'National SOS', desc: 'All-in-One Emergency', icon: '🚨', badgeClass: 'sos' },
    { code: '100', name: 'Police Helpline', desc: 'Crime & Security', icon: '👮', badgeClass: 'police' },
    { code: '101', name: 'Fire & Rescue', desc: 'Fire & Disaster', icon: '🚒', badgeClass: 'fire' },
    { code: '108', name: 'Ambulance', desc: 'Medical Trauma', icon: '🚑', badgeClass: 'ambulance' },
    { code: '1091', name: 'Women Helpline', desc: 'Safety & Support', icon: '🛡️', badgeClass: 'women' },
  ];

  private userKey = 'helpvoice_cached_user';

  constructor() {
    this.initAuth();
  }

  private initAuth(): void {
    const token = this.getToken();
    const cachedUser = this.getCachedUser();

    if (token && cachedUser) {
      this.currentUser.set(cachedUser);
      this.isAuthenticated.set(true);
      this.emergencyContacts.set(cachedUser.emergencyContacts || []);
      this.fetchProfile().subscribe();
    } else if (token) {
      this.fetchProfile().subscribe();
    } else {
      this.isAuthenticated.set(false);
      this.loadLocalContacts();
    }
  }

  public getCachedUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private setCachedUser(user: UserProfile): void {
    try {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } catch {}
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  private setToken(token: string): void {
    try {
      localStorage.setItem(this.tokenKey, token);
    } catch {}
  }

  private removeToken(): void {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    } catch {}
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  public register(name: string, email: string, password: string): Observable<{ success: boolean; data?: AuthResponse; error?: string }> {
    return this.http.post<{ success: boolean; data: AuthResponse; message?: string }>(`${this.baseUrl}/auth/register`, { name, email, password }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.setToken(res.data.token);
          this.setCachedUser(res.data.user);
          this.currentUser.set(res.data.user);
          this.isAuthenticated.set(true);
          this.emergencyContacts.set(res.data.user.emergencyContacts || []);
          this.saveLocalContacts(res.data.user.emergencyContacts || []);
        }
      }),
      catchError((err) => {
        const msg = err.error?.error || 'Registration failed';
        return of({ success: false, error: msg });
      })
    );
  }

  public login(email: string, password: string): Observable<{ success: boolean; data?: AuthResponse; error?: string }> {
    return this.http.post<{ success: boolean; data: AuthResponse; message?: string }>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.setToken(res.data.token);
          this.setCachedUser(res.data.user);
          this.currentUser.set(res.data.user);
          this.isAuthenticated.set(true);
          this.emergencyContacts.set(res.data.user.emergencyContacts || []);
          this.saveLocalContacts(res.data.user.emergencyContacts || []);
        }
      }),
      catchError((err) => {
        const msg = err.error?.error || 'Login failed';
        return of({ success: false, error: msg });
      })
    );
  }

  public logout(): void {
    this.removeToken();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.loadLocalContacts();
  }

  public fetchProfile(): Observable<UserProfile | null> {
    const token = this.getToken();
    if (!token) return of(null);

    return this.http
      .get<{ success: boolean; data: UserProfile }>(`${this.baseUrl}/auth/me`, { headers: this.getAuthHeaders() })
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this.currentUser.set(res.data);
            this.isAuthenticated.set(true);
            this.emergencyContacts.set(res.data.emergencyContacts || []);
            this.saveLocalContacts(res.data.emergencyContacts || []);
          }
        }),
        map((res) => (res && res.success ? res.data : null)),
        catchError(() => {
          this.loadLocalContacts();
          return of(null);
        })
      );
  }

  public addContact(contact: { name: string; phone: string; relation?: string; isPrimary?: boolean }): Observable<boolean> {
    if (this.isAuthenticated()) {
      return this.http
        .post<{ success: boolean; data: EmergencyContact[] }>(`${this.baseUrl}/auth/contacts`, contact, {
          headers: this.getAuthHeaders(),
        })
        .pipe(
          tap((res) => {
            if (res.success && res.data) {
              this.emergencyContacts.set(res.data);
              this.saveLocalContacts(res.data);
            }
          }),
          catchError(() => {
            this.addLocalContact(contact);
            return of(true);
          })
        ) as Observable<boolean>;
    } else {
      this.addLocalContact(contact);
      return of(true);
    }
  }

  public deleteContact(contactId: string): Observable<boolean> {
    if (this.isAuthenticated()) {
      return this.http
        .delete<{ success: boolean; data: EmergencyContact[] }>(`${this.baseUrl}/auth/contacts/${contactId}`, {
          headers: this.getAuthHeaders(),
        })
        .pipe(
          tap((res) => {
            if (res.success && res.data) {
              this.emergencyContacts.set(res.data);
              this.saveLocalContacts(res.data);
            }
          }),
          catchError(() => {
            this.deleteLocalContact(contactId);
            return of(true);
          })
        ) as Observable<boolean>;
    } else {
      this.deleteLocalContact(contactId);
      return of(true);
    }
  }

  // Local Storage Fallback for offline / unauthenticated users
  private loadLocalContacts(): void {
    try {
      const raw = localStorage.getItem(this.localContactsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.emergencyContacts.set(parsed);
          return;
        }
      }
    } catch {}

    // Only user-added contacts are kept (starts empty)
    this.emergencyContacts.set([]);
  }

  private saveLocalContacts(contacts: EmergencyContact[]): void {
    try {
      localStorage.setItem(this.localContactsKey, JSON.stringify(contacts));
    } catch {}
  }

  private addLocalContact(contact: { name: string; phone: string; relation?: string; isPrimary?: boolean }): void {
    const list = [...this.emergencyContacts()];
    const newContact: EmergencyContact = {
      id: 'local_' + Date.now(),
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      relation: contact.relation?.trim() || 'Contact',
      isPrimary: Boolean(contact.isPrimary),
      createdAt: new Date().toISOString(),
    };
    if (newContact.isPrimary) {
      list.forEach((c) => (c.isPrimary = false));
    }
    list.push(newContact);
    this.emergencyContacts.set(list);
    this.saveLocalContacts(list);
  }

  private deleteLocalContact(id: string): void {
    const list = this.emergencyContacts().filter((c) => c.id !== id);
    this.emergencyContacts.set(list);
    this.saveLocalContacts(list);
  }
}
