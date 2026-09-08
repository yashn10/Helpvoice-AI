import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';

const router = Router();

router.get('/status', AIController.getStatus);

export default router;
