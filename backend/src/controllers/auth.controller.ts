import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export async function registerHandler(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Name, email, and password are required' });
      return;
    }

    const result = await authService.register(name, email, password);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Account created successfully',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Registration failed',
    });
  }
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const result = await authService.login(email, password);
    res.json({
      success: true,
      data: result,
      message: 'Logged in successfully',
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: err.message || 'Invalid credentials',
    });
  }
}

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const profile = await authService.getUserProfile(req.user.id);
    if (!profile) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        emergencyContacts: profile.emergencyContacts || [],
        settings: profile.settings || {},
        createdAt: profile.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to retrieve profile',
    });
  }
}

export async function updateSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const updatedSettings = await authService.updateUserSettings(req.user.id, req.body);
    res.json({
      success: true,
      data: updatedSettings,
      message: 'User settings updated successfully',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to update settings',
    });
  }
}

export async function getContactsHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const contacts = await authService.getEmergencyContacts(req.user.id);
    res.json({
      success: true,
      data: contacts,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to retrieve contacts',
    });
  }
}

export async function addContactHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, phone, relation, isPrimary } = req.body;
    if (!name || !phone) {
      res.status(400).json({ success: false, error: 'Contact name and phone are required' });
      return;
    }

    const updatedContacts = await authService.addEmergencyContact(req.user.id, {
      name,
      phone,
      relation,
      isPrimary,
    });

    res.status(201).json({
      success: true,
      data: updatedContacts,
      message: 'Emergency contact added successfully',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to add emergency contact',
    });
  }
}

export async function deleteContactHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { contactId } = req.params;
    if (!contactId) {
      res.status(400).json({ success: false, error: 'Contact ID is required' });
      return;
    }

    const updatedContacts = await authService.deleteEmergencyContact(req.user.id, contactId);
    res.json({
      success: true,
      data: updatedContacts,
      message: 'Emergency contact removed',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to delete contact',
    });
  }
}
