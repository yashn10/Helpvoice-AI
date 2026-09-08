import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  getMeHandler,
  updateSettingsHandler,
  getContactsHandler,
  addContactHandler,
  deleteContactHandler,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', registerHandler);
router.post('/login', loginHandler);

// Protected user, settings & contact routes
router.get('/me', requireAuth, getMeHandler);
router.put('/settings', requireAuth, updateSettingsHandler);
router.get('/contacts', requireAuth, getContactsHandler);
router.post('/contacts', requireAuth, addContactHandler);
router.delete('/contacts/:contactId', requireAuth, deleteContactHandler);

export default router;
