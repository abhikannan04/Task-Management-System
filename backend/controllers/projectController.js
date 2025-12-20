import Joi from 'joi';
import {
  createProject,
  getAllProjects,
  getProjectById,
  getProjectWithAssignments,
  updateProject,
  deleteProject,
  isEmployeeAssignedToProject,
  checkAndUpdateProjectStatus
} from '../models/Project.js';
import { findUserById } from '../models/User.js';
import { getProjectAssignments } from '../models/ProjectAssignment.js';
import db from '../db.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const projectSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000).optional().allow(''),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
  status: Joi.string().valid('planning', 'active', 'pending_approval', 'completed').default('planning'),
  budget: Joi.number().optional(),
  completion_comments: Joi.string().max(1000).optional().allow(''),
  rejection_reason: Joi.string().max(1000).optional().allow(''),
  // Department fields first
  dept_code: Joi.string().max(50).optional(),
  department: Joi.string().max(255).optional(),
  // OSTA/FSTA fields
  osta_no: Joi.number().integer().optional(),
  osta_name: Joi.string().max(255).optional().allow(''),
  fsta_name: Joi.string().max(255).optional().allow('')
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
  status: Joi.string().valid('active', 'completed').optional(),
  budget: Joi.number().optional(),
  completion_comments: Joi.string().max(1000).optional().allow(''),
  rejection_reason: Joi.string().max(1000).optional().allow(''),
  // Department fields first
  dept_code: Joi.string().max(50).optional(),
  department: Joi.string().max(255).optional(),
  // OSTA/FSTA fields
  osta_no: Joi.number().integer().optional(),
  osta_name: Joi.string().max(255).optional().allow(''),
  fsta_name: Joi.string().max(255).optional().allow('')
});

// Add a new function to handle PRD file upload
const handlePrdFileUpload = (req, res, next) => {
  // Use the existing upload middleware for single file upload
  upload.single('prd_file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

export const create = async (req, res) => {
  try {
    // Only admin and manager can create projects
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { error, value } = projectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Set created_by to the current user
    value.created_by = req.user.id;

    // Set department code and name from user if not provided
    if (!value.dept_code && req.user.dept_code) {
      value.dept_code = req.user.dept_code;
    }

    if (!value.department && req.user.department) {
      value.department = req.user.department;
    }

    // Set default values if neither provided nor available from user
    if (!value.dept_code) {
      value.dept_code = '00';
    }

    if (!value.department) {
      value.department = 'Systems';
    }

    // Handle PRD file upload if provided
    let prdFileData = null;
    if (req.file) {
      prdFileData = {
        filename: `${uuidv4()}_${req.file.originalname}`,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        content: req.file.buffer.toString('base64'), // Store file content as base64
        url: null // Will be set after project creation
      };
      value.prd_file = prdFileData;
    }

    const projectId = await createProject(value);

    // Update PRD URL with the actual project ID
    if (req.file) {
      prdFileData.url = `http://localhost:${process.env.PORT || 3002}/api/uploads/prd/${projectId}`;
      await updateProject(projectId, { prd_file: prdFileData });
    }

    res.status(201).json({ message: 'Project created successfully', projectId });
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAll = async (req, res) => {
  try {
    const projects = await getAllProjects(req.user.id, req.user.role);
    res.json(projects);
  } catch (error) {
    logger.error('Get all projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that id is a valid integer
    const projectId = parseInt(id);
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Get project with assignment count
    const project = await getProjectWithAssignments(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      // Check if employee is assigned to this project
      const isAssigned = await isEmployeeAssignedToProject(projectId, req.user.id);

      if (!isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    } else if (req.user.role === 'manager') {
      // Check if manager created this project OR is assigned to this project
      const isAssigned = await isEmployeeAssignedToProject(projectId, req.user.id);
      if (project.created_by !== req.user.id && !isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Get project assignments (team members) for all users
    const projectAssignments = await getProjectAssignments(projectId);
    project.team_members = projectAssignments;

    // Get employee contributions if manager or admin
    if (req.user.role !== 'employee') {
      const employeeContributions = await db('daily_statuses')
        .join('users', 'daily_statuses.employee_id', 'users.id')
        .where('daily_statuses.project_id', projectId)
        .where('daily_statuses.is_deleted', false)
        .groupBy('users.id', 'users.name')
        .select(
          'users.id as employee_id',
          'users.name as employee_name',
          db.raw('COUNT(daily_statuses.id) as status_count'),
          db.raw('SUM(daily_statuses.hours_worked) as total_hours'),
          db.raw('AVG(daily_statuses.progress_percentage) as avg_progress')
        );

      // Add contribution score calculation (hours * 0.7 + progress * 0.3)
      const employeeContributionsWithScore = employeeContributions.map(emp => {
        const totalHours = parseFloat(emp.total_hours) || 0;
        const avgProgress = parseFloat(emp.avg_progress) || 0;
        const contributionScore = Math.round(totalHours * 0.7 + avgProgress * 0.3);
        return {
          ...emp,
          contribution_score: contributionScore
        };
      });

      // Sort by contribution score in descending order
      employeeContributionsWithScore.sort((a, b) => b.contribution_score - a.contribution_score);

      project.employee_contributions = employeeContributionsWithScore;
    }

    res.json(project);
  } catch (error) {
    logger.error('Get project by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await getProjectById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only admin and manager can update projects
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // If a manager is not the creator of the project, they cannot update it
    // But they can update projects they are assigned to
    if (req.user.role === 'manager' && project.created_by !== req.user.id) {
      // Check if manager is assigned to this project
      const isAssigned = await isEmployeeAssignedToProject(id, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const { error, value } = updateProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Handle PRD file removal
    if (req.body.remove_prd_file === 'true') {
      value.prd_file = null;
    }
    // Handle PRD file upload if provided
    else if (req.file) {
      const prdFileData = {
        filename: `${uuidv4()}_${req.file.originalname}`,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        content: req.file.buffer.toString('base64'), // Store file content as base64
        url: `http://localhost:${process.env.PORT || 3002}/api/uploads/prd/${id}`
      };
      value.prd_file = prdFileData;
    }

    await updateProject(id, value);

    // Check if project status needs to be updated based on end date
    await checkAndUpdateProjectStatus(id, req.user.id);

    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await getProjectById(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only admin and manager can delete projects
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // If a manager is not the creator of the project, they cannot delete it
    // But they can delete projects they are assigned to
    if (req.user.role === 'manager' && project.created_by !== req.user.id) {
      // Check if manager is assigned to this project
      const isAssigned = await isEmployeeAssignedToProject(id, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Prevent deletion of completed projects
    if (project.status === 'completed') {
      return res.status(400).json({ error: 'Cannot delete completed projects' });
    }

    await deleteProject(id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const getManagerNotifications = async (req, res) => {
  try {
    // Only managers and admins can get notifications
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // For managers, get recent team updates only from employees they've assigned
    // For admins, get all recent team updates
    let recentStatusesQuery = db('daily_statuses')
      .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .where('daily_statuses.is_deleted', false)
      .orderBy('daily_statuses.submitted_at', 'desc')
      .select(
        'daily_statuses.id',
        'daily_statuses.date',
        'daily_statuses.status_text',
        'daily_statuses.hours_worked',
        'daily_statuses.progress_percentage',
        'daily_statuses.submitted_at',
        'daily_statuses.review_status',
        'employees.name as employee_name',
        'projects.name as project_name',
        'projects.id as project_id'
      );

    if (req.user.role === 'manager') {
      // For managers, only show updates from employees they've assigned
      recentStatusesQuery = recentStatusesQuery
        .join('project_assignments', function () {
          this.on('projects.id', '=', 'project_assignments.project_id')
            .andOn('daily_statuses.employee_id', '=', 'project_assignments.employee_id')
            .andOn('project_assignments.is_active', '=', db.raw('true'));
        })
        .where('project_assignments.assigned_by', req.user.id);
    } else {
      // For admins, show all updates (existing logic)
      recentStatusesQuery = recentStatusesQuery
        .where(function () {
          this.where('projects.created_by', req.user.id)
            .orWhereIn('projects.id', function () {
              this.select('project_id')
                .from('project_assignments')
                .where('employee_id', req.user.id)
                .andWhere('is_active', true);
            });
        });
    }

    const recentStatuses = await recentStatusesQuery;

    res.json({
      data: {
        recentStatuses
      }
    });
  } catch (error) {
    logger.error('Get manager notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingCompletions = async (req, res) => {
  try {
    // Only managers and admins can get pending completions
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get projects that are pending approval
    // Show projects created by this manager/admin OR where they assigned someone
    const pendingProjects = await db('projects')
      .leftJoin('project_assignments', function () {
        this.on('projects.id', '=', 'project_assignments.project_id')
          .andOn('project_assignments.is_active', '=', db.raw('true'));
      })
      .where('projects.status', 'pending_approval')
      .where('projects.is_deleted', false)
      .where(function () {
        this.where('projects.created_by', req.user.id)
          .orWhere('project_assignments.assigned_by', req.user.id);
      })
      .distinct('projects.id') // Deduplicate since leftJoin might yield multiples
      .select(
        'projects.id',
        'projects.name',
        'projects.description',
        'projects.start_date',
        'projects.end_date',
        'projects.status',
        'projects.created_at'
      );

    // For each pending project, get the employee who submitted the latest status
    const projectsWithEmployeeInfo = await Promise.all(pendingProjects.map(async (project) => {
      // Get the most recent status for this project
      const latestStatus = await db('daily_statuses')
        .join('users', 'daily_statuses.employee_id', 'users.id')
        .where('daily_statuses.project_id', project.id)
        .orderBy('daily_statuses.submitted_at', 'desc')
        .limit(1)
        .select(
          'users.name as completed_by_name',
          'users.id as completed_by_id'
        )
        .first();

      return {
        ...project,
        completed_by_name: latestStatus ? latestStatus.completed_by_name : null,
        completed_by_id: latestStatus ? latestStatus.completed_by_id : null
      };
    }));

    res.json({
      data: projectsWithEmployeeInfo
    });
  } catch (error) {
    logger.error('Get pending completions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingCompletionsCount = async (req, res) => {
  try {
    // Only managers and admins can get pending completions count
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get count of projects that are pending approval
    // Count projects created by this manager/admin OR where they assigned someone
    const pendingCount = await db('projects')
      .leftJoin('project_assignments', function () {
        this.on('projects.id', '=', 'project_assignments.project_id')
          .andOn('project_assignments.is_active', '=', db.raw('true'));
      })
      .where('projects.status', 'pending_approval')
      .where('projects.is_deleted', false)
      .where(function () {
        this.where('projects.created_by', req.user.id)
          .orWhere('project_assignments.assigned_by', req.user.id);
      })
      .countDistinct('projects.id as count')
      .first();

    res.json({
      count: parseInt(pendingCount.count) || 0
    });
  } catch (error) {
    logger.error('Get pending completions count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDelayedProjects = async (req, res) => {
  try {
    // Only managers and admins can update delayed projects
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update projects that are past their end date but are not completed to delayed status
    const updatedProjects = await db('projects')
      .whereNot('status', 'completed')
      .where('end_date', '<', new Date().toISOString().split('T')[0]) // Compare only date part
      .where('is_deleted', false)
      .where(function () {
        this.where('created_by', req.user.id)
          .orWhereIn('id', function () {
            this.select('project_id')
              .from('project_assignments')
              .where('employee_id', req.user.id)
              .andWhere('is_active', true);
          });
      })
      .update({ status: 'delayed', updated_at: db.fn.now() });

    res.json({
      message: `${updatedProjects} projects marked as delayed`,
      updated_count: updatedProjects
    });
  } catch (error) {
    logger.error('Update delayed projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDelayedProjects = async (req, res) => {
  try {
    // Only managers and admins can get delayed projects
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get projects that have delayed status
    const delayedProjects = await db('projects')
      .where('projects.status', 'delayed')
      .where(function () {
        this.where('projects.created_by', req.user.id)
          .orWhereIn('projects.id', function () {
            this.select('project_id')
              .from('project_assignments')
              .where('employee_id', req.user.id)
              .andWhere('is_active', true);
          });
      })
      .where('projects.is_deleted', false)
      .select(
        'projects.id',
        'projects.name',
        'projects.description',
        'projects.start_date',
        'projects.end_date',
        'projects.status',
        'projects.created_at'
      );

    res.json({
      data: delayedProjects
    });
  } catch (error) {
    logger.error('Get delayed projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeePendingApprovals = async (req, res) => {
  try {
    // Only employees can get their pending approval projects
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get projects assigned to this employee that are pending approval
    // This should only include projects that are pending completion approval, not action plans
    const pendingProjects = await db('projects')
      .join('project_assignments', 'projects.id', 'project_assignments.project_id')
      .where('project_assignments.employee_id', req.user.id)
      .where('project_assignments.is_active', true)
      .where('projects.status', 'pending_approval') // Only projects pending completion approval
      .where('projects.is_deleted', false)
      .select(
        'projects.id',
        'projects.name',
        'projects.description',
        'projects.start_date',
        'projects.end_date',
        'projects.status',
        'projects.rejection_reason',
        'projects.created_at'
      )
      .distinct('projects.id'); // Ensure we don't get duplicates

    res.json({
      data: pendingProjects
    });
  } catch (error) {
    logger.error('Get employee pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to enrich action plans with unread counts
const enrichWithUnreadCounts = async (actionPlans, userId) => {
  if (!actionPlans || actionPlans.length === 0) {
    return [];
  }

  const actionPlanIds = actionPlans.map(ap => ap.id);

  // Get last read timestamps for these action plans
  const reads = await db('action_plan_reads')
    .whereIn('action_plan_id', actionPlanIds)
    .where('user_id', userId)
    .select('action_plan_id', 'last_read_at');

  const readMap = {};
  reads.forEach(r => {
    readMap[r.action_plan_id] = r.last_read_at;
  });

  // Calculate unread counts for each action plan
  const enrichedActionPlans = await Promise.all(actionPlans.map(async (ap) => {
    const lastReadAt = readMap[ap.id] || new Date(0); // Default to epoch if never read

    // Count unread activities
    const unreadActivities = await db('action_plan_activities')
      .where('daily_status_id', ap.id)
      .where('created_at', '>', lastReadAt)
      .count('* as count')
      .first();

    // Count unread discussions
    const unreadDiscussions = await db('action_plan_discussions')
      .where('daily_status_id', ap.id)
      .where('created_at', '>', lastReadAt)
      .count('* as count')
      .first();

    const unreadCount = (parseInt(unreadActivities.count) || 0) + (parseInt(unreadDiscussions.count) || 0);

    return {
      ...ap,
      unread_count: unreadCount
    };
  }));

  return enrichedActionPlans;
};

// Update the getEmployeeApprovedActionPlans function to include action_plan_status
export const getEmployeeApprovedActionPlans = async (req, res) => {
  try {
    // Only employees can get their approved action plans
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get approved action plans for this employee
    const approvedActionPlans = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .join('project_assignments', 'projects.id', 'project_assignments.project_id')
      .where('daily_statuses.employee_id', req.user.id)
      .where('daily_statuses.mark_as_completed', true)
      .where('daily_statuses.review_status', 'approved')
      .where('daily_statuses.is_deleted', false)
      .where('projects.is_deleted', false)
      .where('project_assignments.is_active', true)
      .distinct('daily_statuses.id') // Ensure we don't get duplicates
      .select(
        'daily_statuses.id',
        'daily_statuses.status_text',
        'daily_statuses.submitted_at',
        'daily_statuses.reviewed_at',
        'daily_statuses.review_comments', // Add review_comments (might be useful for approved with comments)
        'daily_statuses.action_plan_status', // Add action_plan_status
        'projects.id as project_id',
        'projects.name as project_name'
      )
      .orderBy('daily_statuses.submitted_at', 'desc');

    const actionPlansWithUnread = await enrichWithUnreadCounts(approvedActionPlans, req.user.id);

    res.json({
      data: actionPlansWithUnread
    });
  } catch (error) {
    logger.error('Get employee approved action plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update the getEmployeePendingActionPlans function to include action_plan_status
export const getEmployeePendingActionPlans = async (req, res) => {
  try {
    // Only employees can get their pending action plans
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get pending action plans for this employee (action plans that are pending approval)
    const pendingActionPlans = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .join('project_assignments', 'projects.id', 'project_assignments.project_id')
      .where('daily_statuses.employee_id', req.user.id)
      .where('daily_statuses.mark_as_completed', true)
      .where('daily_statuses.review_status', 'pending')
      .where('daily_statuses.is_deleted', false)
      .where('projects.is_deleted', false)
      .where('project_assignments.is_active', true)
      .distinct('daily_statuses.id') // Ensure we don't get duplicates
      .select(
        'daily_statuses.id',
        'daily_statuses.status_text',
        'daily_statuses.submitted_at',
        'daily_statuses.review_comments', // Add review_comments (might be useful for pending with comments)
        'daily_statuses.action_plan_status', // Add action_plan_status
        'projects.id as project_id',
        'projects.name as project_name'
      )
      .orderBy('daily_statuses.submitted_at', 'desc');

    const actionPlansWithUnread = await enrichWithUnreadCounts(pendingActionPlans, req.user.id);

    res.json({
      data: actionPlansWithUnread
    });
  } catch (error) {
    logger.error('Get employee pending action plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update the getEmployeeRejectedActionPlans function to include action_plan_status
export const getEmployeeRejectedActionPlans = async (req, res) => {
  try {
    // Only employees can get their rejected action plans
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get rejected action plans for this employee
    const rejectedActionPlans = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .join('project_assignments', 'projects.id', 'project_assignments.project_id')
      .where('daily_statuses.employee_id', req.user.id)
      .where('daily_statuses.mark_as_completed', true)
      .where('daily_statuses.review_status', 'rejected')
      .where('daily_statuses.is_deleted', false)
      .where('projects.is_deleted', false)
      .where('project_assignments.is_active', true)
      .distinct('daily_statuses.id') // Ensure we don't get duplicates
      .select(
        'daily_statuses.id',
        'daily_statuses.status_text',
        'daily_statuses.submitted_at',
        'daily_statuses.reviewed_at',
        'daily_statuses.review_comments', // Add review_comments to show rejection reason
        'daily_statuses.action_plan_status', // Add action_plan_status
        'projects.id as project_id',
        'projects.name as project_name'
      )
      .orderBy('daily_statuses.submitted_at', 'desc');

    const actionPlansWithUnread = await enrichWithUnreadCounts(rejectedActionPlans, req.user.id);

    res.json({
      data: actionPlansWithUnread
    });
  } catch (error) {
    logger.error('Get employee rejected action plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get total action plans count for employees
export const getEmployeeTotalActionPlans = async (req, res) => {
  try {
    // Only employees can get their total action plans
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get total action plans for this employee (all submitted action plans)
    const totalActionPlans = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .join('project_assignments', 'projects.id', 'project_assignments.project_id')
      .where('daily_statuses.employee_id', req.user.id)
      .where('daily_statuses.mark_as_completed', true)
      .where('daily_statuses.is_deleted', false)
      .where('projects.is_deleted', false)
      .where('project_assignments.is_active', true)
      .count('* as count')
      .first();

    res.json({
      count: parseInt(totalActionPlans.count) || 0
    });
  } catch (error) {
    logger.error('Get employee total action plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeDelayedProjects = async (req, res) => {
  try {
    // Only employees can get their delayed projects
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get projects assigned to this employee that are delayed
    const delayedProjects = await db('projects')
      .join('project_assignments', 'projects.id', 'project_assignments.project_id')
      .where('project_assignments.employee_id', req.user.id)
      .where('project_assignments.is_active', true)
      .where('projects.status', 'delayed')
      .where('projects.is_deleted', false)
      .select(
        'projects.id',
        'projects.name',
        'projects.description',
        'projects.start_date',
        'projects.end_date',
        'projects.status',
        'projects.created_at'
      );

    res.json({
      data: delayedProjects
    });
  } catch (error) {
    logger.error('Get employee delayed projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// In-memory storage for OSTA and FSTA data (in a real application, this would be in a database)

// Get all unique OSTA names from the database
export const getOstaData = async (req, res) => {
  try {
    // Get unique OSTA names from projects table, excluding null, empty, or whitespace-only values
    // Also exclude common placeholder/test values
    // Filter out deleted projects
    let query = db('projects')
      .whereNotNull('osta_name')
      .andWhere('osta_name', '!=', '')
      .andWhereRaw("TRIM(osta_name) != ''") // Additional check for whitespace-only strings
      .andWhereNot('osta_name', 'Check') // Exclude placeholder values
      .andWhereNot('osta_name', 'Test') // Exclude test values
      .andWhereNot('osta_name', 'N/A') // Exclude N/A values
      .andWhereNot('osta_name', 'None') // Exclude None values
      .andWhere('is_deleted', false) // Exclude deleted projects
      .distinct('osta_name')
      .orderBy('osta_name'); // Order alphabetically

    // If user is a manager, filter by their department
    if (req.user.role === 'manager' && req.user.department) {
      query = query.andWhere('department', req.user.department);
    }

    const uniqueOstaNames = await query.pluck('osta_name');

    // Convert to the expected format with proper unique IDs
    const ostaData = uniqueOstaNames.map((name, index) => ({
      id: index + 1,
      name: name.trim() // Trim whitespace
    })).filter(item => item.name.length > 0); // Remove any empty names

    res.json(ostaData);
  } catch (error) {
    logger.error('Get OSTA data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all unique FSTA names from the database
export const getFstaData = async (req, res) => {
  try {
    // Get unique FSTA names from projects table, excluding null, empty, or whitespace-only values
    // Also exclude common placeholder/test values
    // Filter out deleted projects
    let query = db('projects')
      .whereNotNull('fsta_name')
      .andWhere('fsta_name', '!=', '')
      .andWhereRaw("TRIM(fsta_name) != ''") // Additional check for whitespace-only strings
      .andWhereNot('fsta_name', 'Check') // Exclude placeholder values
      .andWhereNot('fsta_name', 'Test') // Exclude test values
      .andWhereNot('fsta_name', 'N/A') // Exclude N/A values
      .andWhereNot('fsta_name', 'None') // Exclude None values
      .andWhere('is_deleted', false) // Exclude deleted projects
      .distinct('fsta_name')
      .orderBy('fsta_name'); // Order alphabetically

    // If user is a manager, filter by their department
    if (req.user.role === 'manager' && req.user.department) {
      query = query.andWhere('department', req.user.department);
    }

    const uniqueFstaNames = await query.pluck('fsta_name');

    // Convert to the expected format with proper unique IDs
    const fstaData = uniqueFstaNames.map((name, index) => ({
      id: index + 1,
      name: name.trim() // Trim whitespace
    })).filter(item => item.name.length > 0); // Remove any empty names

    res.json(fstaData);
  } catch (error) {
    logger.error('Get FSTA data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new OSTA
export const addOsta = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'OSTA name is required' });
    }

    // In a real implementation, you might want to store OSTA data in a separate table
    // For now, we'll just return the new OSTA without saving it permanently
    // since OSTA names are stored directly in the projects table
    const newOsta = {
      id: Date.now(), // Simple ID generation
      name: name.trim()
    };

    res.status(201).json(newOsta);
  } catch (error) {
    logger.error('Add OSTA error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new FSTA
export const addFsta = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'FSTA name is required' });
    }

    // In a real implementation, you might want to store FSTA data in a separate table
    // For now, we'll just return the new FSTA without saving it permanently
    // since FSTA names are stored directly in the projects table
    const newFsta = {
      id: Date.now(), // Simple ID generation
      name: name.trim()
    };

    res.status(201).json(newFsta);
  } catch (error) {
    logger.error('Add FSTA error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// New function to request project completion without submitting daily status
export const requestProjectCompletion = async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Only employees can request project completion
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Only employees can request project completion' });
    }

    // Check if project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if employee is assigned to this project
    const isAssigned = await isEmployeeAssignedToProject(projectId, req.user.id);
    if (!isAssigned) {
      return res.status(403).json({ error: 'You are not assigned to this project' });
    }

    // Check if project is in a valid state for completion request
    if (project.status !== 'active') {
      return res.status(400).json({ error: 'Project must be in active state to request completion' });
    }

    // Update project status to pending_approval
    await db('projects')
      .where('id', projectId)
      .update({
        status: 'pending_approval',
        updated_at: db.fn.now()
      });

    res.json({
      message: 'Project completion request sent to your manager for approval!',
      projectId
    });
  } catch (error) {
    logger.error('Request project completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// New function to approve project completion
export const approveProjectCompletion = async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Only managers can approve project completion
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can approve project completion' });
    }

    // Check if project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if manager created this project OR assigned someone to it
    const assignment = await db('project_assignments')
      .where('project_id', projectId)
      .where('assigned_by', req.user.id)
      .where('is_active', true)
      .first();

    if (project.created_by !== req.user.id && !assignment) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if project is in pending approval state
    if (project.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Project is not awaiting completion approval' });
    }

    // Update project status to completed
    await db('projects')
      .where('id', projectId)
      .update({
        status: 'completed',
        updated_at: db.fn.now()
      });

    res.json({
      message: 'Project completion approved successfully!',
      projectId
    });
  } catch (error) {
    logger.error('Approve project completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// New function to reject project completion
export const rejectProjectCompletion = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { reason } = req.body;

    // Only managers can reject project completion
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can reject project completion' });
    }

    // Check if project exists
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if manager created this project OR assigned someone to it
    const assignment = await db('project_assignments')
      .where('project_id', projectId)
      .where('assigned_by', req.user.id)
      .where('is_active', true)
      .first();

    if (project.created_by !== req.user.id && !assignment) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if project is in pending approval state
    if (project.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Project is not awaiting completion approval' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Update project status back to active and set rejection reason
    await db('projects')
      .where('id', projectId)
      .update({
        status: 'active',
        rejection_reason: reason.trim(),
        updated_at: db.fn.now()
      });

    res.json({
      message: 'Project completion rejected successfully!',
      projectId
    });
  } catch (error) {
    logger.error('Reject project completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartments = async (req, res) => {
  try {
    // Only admin can access departments
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Fetch distinct departments from projects table
    const departments = await db('projects')
      .distinct('department')
      .where('is_deleted', false)
      .orderBy('department');

    res.json({
      data: departments.map(dept => ({
        name: dept.department
      }))
    });
  } catch (error) {
    logger.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new functions to get action plans by action_plan_status
export const getEmployeeActionPlansByStatus = async (req, res) => {
  try {
    // Only employees can get their action plans
    if (req.user.role !== 'employee') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { status } = req.params;

    // Validate status parameter
    const validStatuses = ['started', 'in_progress', 'completed', 'under_approval', 'on_hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid action plan status' });
    }

    // Get action plans for this employee with the specified status
    const actionPlans = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .join('project_assignments', 'projects.id', 'project_assignments.project_id')
      .where('daily_statuses.employee_id', req.user.id)
      .where('daily_statuses.action_plan_status', status)
      .where('daily_statuses.is_deleted', false)
      .where('projects.is_deleted', false)
      .where('project_assignments.is_active', true)
      .distinct('daily_statuses.id') // Ensure we don't get duplicates
      .select(
        'daily_statuses.id',
        'daily_statuses.status_text',
        'daily_statuses.submitted_at',
        'daily_statuses.reviewed_at',
        'daily_statuses.review_comments', // Add review_comments to show rejection reason if applicable
        'daily_statuses.action_plan_status',
        'daily_statuses.review_status',
        'projects.id as project_id',
        'projects.name as project_name'
      )
      .orderBy('daily_statuses.submitted_at', 'desc');

    const actionPlansWithUnread = await enrichWithUnreadCounts(actionPlans, req.user.id);

    res.json({
      data: actionPlansWithUnread
    });
  } catch (error) {
    logger.error('Get employee action plans by status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get filtered project statistics for admin dashboard
export const getFilteredProjectStats = async (req, res) => {
  try {
    // Only admin can access filtered stats
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { department } = req.query;

    // Build the base query
    let query = db('projects')
      .where('projects.is_deleted', false);

    // Apply department filter (using department name)
    if (department && department !== 'all') {
      query = query.where('projects.department', department);
    }

    // Get all filtered projects
    const projects = await query.select('*');

    // Update delayed projects status before calculating stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate statistics with delayed projects check
    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => {
        if (p.status === 'active') {
          const endDate = new Date(p.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate >= today;
        }
        return false;
      }).length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      pendingApprovalProjects: projects.filter(p => p.status === 'pending_approval').length,
      delayedProjects: projects.filter(p => {
        if (p.status === 'delayed') return true;
        if (p.status !== 'completed' && p.status !== 'pending_approval') {
          const endDate = new Date(p.end_date);
          endDate.setHours(0, 0, 0, 0);
          return endDate < today;
        }
        return false;
      }).length,
      planningProjects: projects.filter(p => p.status === 'planning').length
    };

    res.json(stats);
  } catch (error) {
    logger.error('Get filtered project stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



// Get team action plans for a project (all members)
export const getTeamActionPlans = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const project = await getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions - allow if user is assigned or is admin/manager
    if (req.user.role === 'employee') {
      const isAssigned = await isEmployeeAssignedToProject(id, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Get all action plans for this project, including from managers
    const actionPlans = await db('daily_statuses')
      .join('users', 'daily_statuses.employee_id', 'users.id')
      .where('daily_statuses.project_id', id)
      .where('daily_statuses.is_deleted', false)
      .select(
        'daily_statuses.id',
        'daily_statuses.status_text',
        'daily_statuses.submitted_at',
        'daily_statuses.action_plan_status',
        'users.name as employee_name',
        'users.emp_code as employee_code',
        'users.id as employee_id',
        'users.role as employee_role'
      )
      .orderBy('daily_statuses.submitted_at', 'desc');

    res.json(actionPlans);
  } catch (error) {
    logger.error('Get team action plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a comment to a project
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if project exists
    const project = await getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions - allow if user is assigned or is admin/manager
    if (req.user.role === 'employee') {
      const isAssigned = await isEmployeeAssignedToProject(id, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const [commentId] = await db('project_comments')
      .insert({
        project_id: id,
        user_id: req.user.id,
        content: content.trim()
      })
      .returning('id');

    // Fetch the created comment with user details
    const newComment = await db('project_comments')
      .join('users', 'project_comments.user_id', 'users.id')
      .where('project_comments.id', typeof commentId === 'object' ? commentId.id : commentId)
      .select(
        'project_comments.*',
        'users.name as user_name',
        'users.role as user_role'
      )
      .first();

    res.status(201).json(newComment);
  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get comments for a project
export const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const project = await getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      const isAssigned = await isEmployeeAssignedToProject(id, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const comments = await db('project_comments')
      .join('users', 'project_comments.user_id', 'users.id')
      .where('project_comments.project_id', id)
      .select(
        'project_comments.*',
        'users.name as user_name',
        'users.role as user_role'
      )
      .orderBy('project_comments.created_at', 'desc');

    res.json(comments);
  } catch (error) {
    logger.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
