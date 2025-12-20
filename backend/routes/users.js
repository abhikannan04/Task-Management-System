import express from 'express';
import { getUsers, getUserById, getTotalEmployees } from '../controllers/usersController.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin and manager only)
router.get('/', authenticate, authorizeRole('admin', 'manager'), getUsers);

// Get total employees count
router.get('/total', authenticate, authorizeRole('admin'), getTotalEmployees);

// Get user by ID
router.get('/:id', authenticate, getUserById);

export default router;