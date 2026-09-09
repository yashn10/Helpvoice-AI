import fs from 'fs';
import path from 'path';
import mongoose, { Schema, Document } from 'mongoose';

export interface IEmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface IUserSettings {
  theme?: 'dark' | 'light' | 'auto';
  language?: 'en' | 'hi' | 'mr' | 'gu' | 'bn' | 'ta' | 'te' | 'kn';
  voiceSpeed?: number;
  audioPromptsEnabled?: boolean;
  hapticEnabled?: boolean;
  defaultEmergencyNumber?: string;
  autoDialCountdown?: number;
  sosSirenEnabled?: boolean;
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emergencyContacts: IEmergencyContact[];
  settings?: IUserSettings;
  createdAt: string;
  updatedAt: string;
}

export interface IUserDoc extends Document {
  name: string;
  email: string;
  passwordHash: string;
  emergencyContacts: IEmergencyContact[];
  settings?: IUserSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const EmergencyContactSchema = new Schema<IEmergencyContact>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relation: { type: String, default: 'Contact' },
  isPrimary: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const UserSchema = new Schema<IUserDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    emergencyContacts: [EmergencyContactSchema],
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    bufferCommands: false,
    autoIndex: false,
    autoCreate: false,
  }
);

let UserModel: mongoose.Model<IUserDoc> | null = null;
try {
  UserModel = mongoose.model<IUserDoc>('User', UserSchema);
} catch {
  // Already compiled or mongoose disconnected
}

// Local JSON File Fallback Store
class LocalUserStore {
  private dataDir = path.resolve(process.cwd(), 'data');
  private filePath = path.join(this.dataDir, 'users.json');

  constructor() {
    this.ensureFile();
  }

  private ensureFile() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf8');
      }
    } catch (err) {
      console.warn('Could not initialize local user store directory:', err);
    }
  }

  public getAll(): IUser[] {
    try {
      this.ensureFile();
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw) as IUser[];
    } catch {
      return [];
    }
  }

  public saveAll(users: IUser[]): void {
    try {
      this.ensureFile();
      fs.writeFileSync(this.filePath, JSON.stringify(users, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write users to local store:', err);
    }
  }

  public findByEmail(email: string): IUser | null {
    const users = this.getAll();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  public findById(id: string): IUser | null {
    const users = this.getAll();
    return users.find((u) => u.id === id) || null;
  }

  public create(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): IUser {
    const users = this.getAll();
    const newUser: IUser = {
      ...userData,
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(newUser);
    this.saveAll(users);
    return newUser;
  }

  public update(id: string, updates: Partial<IUser>): IUser | null {
    const users = this.getAll();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveAll(users);
    return users[index];
  }
}

export const localUserStore = new LocalUserStore();
export { UserModel };
