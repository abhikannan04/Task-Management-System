import express from 'express';
import { login, register, selfRegister, forgotPassword, getProfile, updateProfile, getDepartments } from '../controllers/authController.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', authenticate, authorizeRole('admin'), register);
router.post('/self-register', selfRegister);
router.post('/forgot-password', forgotPassword);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/departments', getDepartments);

export default router;