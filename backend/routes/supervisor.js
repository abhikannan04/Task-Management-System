import express from 'express';
import { supervisorResetPassword, supervisorDeleteEmployee, supervisorCreateEmployee } from '../controllers/authController.js';

const router = express.Router();

// Supervisor password reset endpoint (no authentication required)
router.post('/reset', supervisorResetPassword);

// Supervisor employee deletion endpoint (no authentication required)
router.post('/delete', supervisorDeleteEmployee);

// Supervisor employee creation endpoint (no authentication required)
router.post('/create', supervisorCreateEmployee);

export default router;