import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { IUser, IEmergencyContact, IUserSettings, localUserStore, UserModel } from '../models/user.model';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    emergencyContacts: IEmergencyContact[];
    settings?: IUserSettings;
  };
}

export class AuthService {
  private saltRounds = 10;

  private generateToken(user: { id: string; email: string; name: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      config.security.jwtSecret,
      { expiresIn: '30d' }
    );
  }

  public async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanName || !cleanEmail || !password) {
      throw new Error('Name, email, and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check existing user in local store
    const existingLocal = localUserStore.findByEmail(cleanEmail);
    if (existingLocal) {
      throw new Error('An account with this email already exists');
    }

    // Check existing in MongoDB if connected
    if (UserModel) {
      try {
        const existingMongo = await UserModel.findOne({ email: cleanEmail }).exec();
        if (existingMongo) {
          throw new Error('An account with this email already exists');
        }
      } catch {
        // Continue with local store
      }
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Save to local store
    const defaultContacts: IEmergencyContact[] = [];
    const newUser = localUserStore.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      emergencyContacts: defaultContacts,
    });

    // Save to MongoDB in background if connected
    if (UserModel) {
      try {
        await UserModel.create({
          _id: newUser.id,
          name: cleanName,
          email: cleanEmail,
          passwordHash,
          emergencyContacts: defaultContacts,
        });
      } catch {
        // Mongo fallback
      }
    }

    const token = this.generateToken(newUser);

    return {
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        emergencyContacts: newUser.emergencyContacts,
        settings: newUser.settings || {},
      },
    };
  }

  public async login(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !password) {
      throw new Error('Email and password are required');
    }

    let user = localUserStore.findByEmail(cleanEmail);

    if (!user && UserModel) {
      try {
        const mongoUser = await UserModel.findOne({ email: cleanEmail }).exec();
        if (mongoUser) {
          user = {
            id: mongoUser._id.toString(),
            name: mongoUser.name,
            email: mongoUser.email,
            passwordHash: mongoUser.passwordHash,
            emergencyContacts: mongoUser.emergencyContacts || [],
            settings: mongoUser.settings || {},
            createdAt: mongoUser.createdAt.toISOString(),
            updatedAt: mongoUser.updatedAt.toISOString(),
          };
          localUserStore.create(user);
        }
      } catch {
        // Fallback
      }
    }

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emergencyContacts: user.emergencyContacts,
        settings: user.settings || {},
      },
    };
  }

  public async getUserProfile(userId: string): Promise<IUser | null> {
    const user = localUserStore.findById(userId);
    return user || null;
  }

  public async addEmergencyContact(
    userId: string,
    contactData: { name: string; phone: string; relation?: string; isPrimary?: boolean }
  ): Promise<IEmergencyContact[]> {
    const user = localUserStore.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newContact: IEmergencyContact = {
      id: 'cnt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: contactData.name.trim(),
      phone: contactData.phone.trim(),
      relation: contactData.relation?.trim() || 'Emergency Contact',
      isPrimary: Boolean(contactData.isPrimary),
      createdAt: new Date().toISOString(),
    };

    const contacts = user.emergencyContacts || [];
    if (newContact.isPrimary) {
      contacts.forEach((c) => (c.isPrimary = false));
    }
    contacts.push(newContact);

    localUserStore.update(userId, { emergencyContacts: contacts });

    if (UserModel) {
      try {
        await UserModel.findByIdAndUpdate(userId, { emergencyContacts: contacts }).exec();
      } catch {
        // Fallback
      }
    }

    return contacts;
  }

  public async deleteEmergencyContact(userId: string, contactId: string): Promise<IEmergencyContact[]> {
    const user = localUserStore.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const contacts = (user.emergencyContacts || []).filter((c) => c.id !== contactId);
    localUserStore.update(userId, { emergencyContacts: contacts });

    if (UserModel) {
      try {
        await UserModel.findByIdAndUpdate(userId, { emergencyContacts: contacts }).exec();
      } catch {
        // Fallback
      }
    }

    return contacts;
  }

  public async getEmergencyContacts(userId: string): Promise<IEmergencyContact[]> {
    const user = localUserStore.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.emergencyContacts || [];
  }

  public async updateUserSettings(userId: string, settings: IUserSettings): Promise<IUserSettings> {
    const user = localUserStore.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const mergedSettings = {
      ...(user.settings || {}),
      ...settings,
    };

    localUserStore.update(userId, { settings: mergedSettings });

    if (UserModel) {
      try {
        await UserModel.findByIdAndUpdate(userId, { settings: mergedSettings }).exec();
      } catch {
        // Fallback
      }
    }

    return mergedSettings;
  }
}

export const authService = new AuthService();
