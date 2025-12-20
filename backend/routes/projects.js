import express from 'express';
import {
  create,
  getAll,
  getById,
  update,
  remove,
  getManagerNotifications,
  getPendingCompletions,
  getDelayedProjects,
  updateDelayedProjects,
  getEmployeePendingApprovals,
  getEmployeeDelayedProjects,
  getPendingCompletionsCount,
  getOstaData,
  getFstaData,
  addOsta,
  addFsta,
  requestProjectCompletion,
  approveProjectCompletion,
  rejectProjectCompletion,
  getEmployeeApprovedActionPlans,
  getEmployeePendingActionPlans,
  getEmployeeRejectedActionPlans,
  getEmployeeTotalActionPlans,
  getEmployeeActionPlansByStatus,
  getTeamActionPlans,
  addComment,
  getComments,
  getDepartments,
  getFilteredProjectStats
} from '../controllers/projectController.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Add middleware to handle PRD file uploads for create and update operations
router.post('/', authenticate, authorizeRole('admin', 'manager'), upload.single('prd_file'), handleUploadError, create);
router.put('/:id', authenticate, authorizeRole('admin', 'manager', 'employee'), upload.single('prd_file'), handleUploadError, update);

// OSTA and FSTA routes (defined BEFORE :id route to avoid conflicts)
router.get('/osta', authenticate, getOstaData);
router.get('/fsta', authenticate, getFstaData);
router.post('/osta', authenticate, authorizeRole('admin', 'manager'), addOsta);
router.post('/fsta', authenticate, authorizeRole('admin', 'manager'), addFsta);

// Department route - only accessible by admin
router.get('/departments', authenticate, authorizeRole('admin'), getDepartments);

// Filtered stats route - only accessible by admin
router.get('/stats/filtered', authenticate, authorizeRole('admin'), getFilteredProjectStats);

router.get('/', authenticate, getAll);
router.get('/notifications', authenticate, authorizeRole('manager', 'admin'), getManagerNotifications);
router.get('/pending-completions', authenticate, authorizeRole('manager', 'admin'), getPendingCompletions);
router.get('/pending-completions/count', authenticate, authorizeRole('manager', 'admin'), getPendingCompletionsCount);
router.get('/delayed', authenticate, authorizeRole('manager', 'admin'), getDelayedProjects);
router.get('/employee/pending-approvals', authenticate, authorizeRole('employee'), getEmployeePendingApprovals);
router.get('/employee/delayed', authenticate, authorizeRole('employee'), getEmployeeDelayedProjects);
router.get('/employee/approved-action-plans', authenticate, authorizeRole('employee'), getEmployeeApprovedActionPlans);
router.get('/employee/pending-action-plans', authenticate, authorizeRole('employee'), getEmployeePendingActionPlans);
router.get('/employee/rejected-action-plans', authenticate, authorizeRole('employee'), getEmployeeRejectedActionPlans);
router.get('/employee/action-plans/:status', authenticate, authorizeRole('employee'), getEmployeeActionPlansByStatus);
router.get('/employee/total-action-plans', authenticate, authorizeRole('employee'), getEmployeeTotalActionPlans);
router.post('/update-delayed', authenticate, authorizeRole('manager', 'admin'), updateDelayedProjects);
router.post('/:id/request-completion', authenticate, authorizeRole('employee'), requestProjectCompletion);
router.post('/:id/approve-completion', authenticate, authorizeRole('manager'), approveProjectCompletion);
router.post('/:id/reject-completion', authenticate, authorizeRole('manager'), rejectProjectCompletion);
router.get('/:id/team-action-plans', authenticate, getTeamActionPlans);
router.post('/:id/comments', authenticate, addComment);
router.get('/:id/comments', authenticate, getComments);
router.get('/:id', authenticate, getById);
router.delete('/:id', authenticate, authorizeRole('admin', 'manager'), remove);

export default router;