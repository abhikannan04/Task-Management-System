import express from 'express';
import { generate, getLogs } from '../controllers/reportController.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', authenticate, generate);
router.get('/logs', authenticate, getLogs);

export default router;