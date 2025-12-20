import express from 'express';
import {
  submit,
  getEmployeeStatusHistory,
  getRecentStatusesForManager,
  getEmployeeUpdates,
  getTeamUpdates,
  getProjectUpdates,
  getAllTeamUpdates,
  approveCompletion,
  rejectCompletion,
  getPendingActionPlansCount,
  updateActionPlanStatus,
  approveStatusUpdate,
  rejectStatusUpdate,
  deleteStatus,
  markActionPlanRead
} from '../controllers/statusController.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, authorizeRole('employee', 'manager'), submit);
router.get('/recent', authenticate, authorizeRole('manager', 'admin'), getRecentStatusesForManager);
router.get('/team-updates', authenticate, authorizeRole('manager', 'admin'), getTeamUpdates);
router.get('/all-team-updates', authenticate, authorizeRole('manager', 'admin'), getAllTeamUpdates);
router.get('/employee/:employeeId/updates', authenticate, getEmployeeUpdates);
router.get('/project/:projectId/updates', authenticate, getProjectUpdates);
router.get('/employee/:employee_id/:project_id', authenticate, getEmployeeStatusHistory);
router.get('/project/:project_id', authenticate, authorizeRole('employee'), getEmployeeStatusHistory);

router.post('/approve/:statusId', authenticate, authorizeRole('manager'), approveCompletion);
router.post('/reject/:statusId', authenticate, authorizeRole('manager'), rejectCompletion);

// New routes for status update approval/rejection
router.post('/approve-status-update/:statusId', authenticate, authorizeRole('manager'), approveStatusUpdate);
router.post('/reject-status-update/:statusId', authenticate, authorizeRole('manager'), rejectStatusUpdate);

// New route for getting pending action plans count
router.get('/pending-action-plans/count', authenticate, authorizeRole('manager', 'admin'), getPendingActionPlansCount);

// New route for updating action plan status
router.put('/action-plan/:statusId', authenticate, authorizeRole('employee'), updateActionPlanStatus);

// New route for deleting action plans
router.delete('/action-plan/:statusId', authenticate, authorizeRole('employee'), deleteStatus);

// New route for marking action plan as read
router.post('/action-plan/:statusId/read', authenticate, markActionPlanRead);

export default router;