import { Router } from 'express';
import multer from 'multer';
import { EmergencyController } from '../controllers/emergency.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for voice recording
});

router.post('/analyze', EmergencyController.analyze);
router.get('/guidance/:type', EmergencyController.getGuidance);
router.post('/transcribe', upload.single('audio'), EmergencyController.transcribe);

export default router;
