import express from 'express';
import {
  assign,
  getAssignments,
  getEmployeeProjectsList,
  unassign,
  markProjectViewed
} from '../controllers/assignmentController.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, authorizeRole('admin', 'manager'), assign);
router.get('/project/:project_id', authenticate, getAssignments);
router.get('/employee/:employee_id', authenticate, getEmployeeProjectsList);
router.post('/:project_id/viewed', authenticate, markProjectViewed);
router.delete('/:id', authenticate, authorizeRole('admin', 'manager'), unassign);

export default router;