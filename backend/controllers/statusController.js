import Joi from 'joi';
import db from '../db.js';
import {
  submitDailyStatus,
  getEmployeeStatuses,
  getStatusByEmployeeAndDate,
  getEmployeeDailyUpdates,
  getTeamDailyUpdates,
  getProjectDailyUpdates,
  updateActionPlanStatus as updateDailyStatusActionPlanStatus // Rename to avoid conflict
} from '../models/DailyStatus.js';
import { findUserById } from '../models/User.js';
import { getProjectById, isEmployeeAssignedToProject } from '../models/Project.js';
import { getProjectAssignments, isEmployeeAssignedToProject as isEmployeeAssignedToProjectAssignment } from '../models/ProjectAssignment.js';
import logger from '../utils/logger.js';

const statusSchema = Joi.object({
  project_id: Joi.number().integer().required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  status_text: Joi.string().min(1).max(2000).required(),
  mark_as_completed: Joi.boolean().default(false),
  action_plan_status: Joi.string().valid('started', 'in_progress', 'testing', 'completed', 'under_approval', 'on_hold').default('started')
});

// Add schema for action plan status update
const actionPlanStatusSchema = Joi.object({
  action_plan_status: Joi.string().valid('started', 'in_progress', 'testing', 'completed', 'under_approval', 'on_hold').required()
});

// Add a new function to delete a daily status
export const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;

    // Check if the status exists and belongs to the user (for employees)
    const status = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .where('daily_statuses.id', statusId)
      .where('daily_statuses.is_deleted', false)
      .first(
        'daily_statuses.*',
        'projects.created_by'
      );

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Check permissions - only employees can delete their own action plans
    if (req.user.role !== 'employee' || status.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Soft delete the status
    await db('daily_statuses')
      .where('id', statusId)
      .update({
        is_deleted: true,
        updated_at: db.fn.now()
      });

    res.json({
      message: 'Action plan deleted successfully'
    });
  } catch (error) {
    logger.error('Delete action plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a new function to update action plan status
export const updateActionPlanStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { error, value } = actionPlanStatusSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { action_plan_status } = value;

    // Check if the status exists and belongs to the user (for employees)
    const status = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .where('daily_statuses.id', statusId)
      .where('daily_statuses.is_deleted', false)
      .first(
        'daily_statuses.*',
        'projects.created_by'
      );

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Check permissions - only employees can update their own action plans
    if (req.user.role !== 'employee' || status.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Directly update the action plan status without approval workflow
    await db('daily_statuses')
      .where('id', statusId)
      .update({
        action_plan_status: action_plan_status,
        updated_at: db.fn.now()
      });

    res.json({
      message: 'Action plan status updated successfully',
      action_plan_status: action_plan_status
    });
  } catch (error) {
    logger.error('Update action plan status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submit = async (req, res) => {
  try {
    // Both employees and managers can submit action plans
    if (!['employee', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only employees and managers can submit action plans' });
    }

    const { error, value } = statusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { project_id, date, status_text, mark_as_completed, action_plan_status } = value;

    // Check if project exists
    const project = await getProjectById(project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is assigned to this project
    const isAssigned = await isEmployeeAssignedToProject(project_id, req.user.id);

    // Also check if manager created this project
    const isProjectCreator = req.user.role === 'manager' && project.created_by === req.user.id;

    if (!isAssigned && !isProjectCreator) {
      return res.status(403).json({ error: 'You are not assigned to this project' });
    }

    // Allow multiple action plan submissions per day - no need to check for existing status

    // Create action plan - set review status based on mark_as_completed
    // Provide default values for hours_worked and progress_percentage for database compatibility
    const statusData = {
      employee_id: req.user.id,
      project_id,
      date,
      status_text,
      hours_worked: 0, // Default value for database compatibility
      progress_percentage: 0, // Default value for database compatibility
      mark_as_completed: mark_as_completed || false, // Default to false if not provided
      action_plan_status: action_plan_status || 'started', // Default to 'started' if not provided
      review_status: (mark_as_completed && !isProjectCreator) ? 'pending' : 'approved',
      reviewed_by: (mark_as_completed && !isProjectCreator) ? null : req.user.id,
      reviewed_at: (mark_as_completed && !isProjectCreator) ? null : new Date()
    };

    const statusId = await submitDailyStatus(statusData);

    // Do NOT update project status when marking as completed
    // The project status will be updated separately through the request-completion endpoint

    const message = (mark_as_completed && !isProjectCreator)
      ? 'Action plan submitted and completion request sent to your manager!'
      : 'Action plan submitted successfully';

    res.status(201).json({
      message,
      statusId,
      mark_as_completed,
      action_plan_status: statusData.action_plan_status
    });
  } catch (error) {
    logger.error('Submit action plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeStatusHistory = async (req, res) => {
  try {
    let { employee_id, project_id } = req.params;

    // If employee_id is not provided, use the current user's ID (for employee accessing their own history)
    if (!employee_id && req.user.role === 'employee') {
      employee_id = req.user.id;
      project_id = req.params.project_id;
    }

    // Validate parameters
    if (!employee_id || !project_id) {
      return res.status(400).json({ error: 'Employee ID and Project ID are required' });
    }

    // Check permissions
    if (req.user.role === 'employee' && parseInt(employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // For managers, check if they have access to this project
    if (req.user.role === 'manager') {
      // Check if manager created this project or is assigned to it
      const project = await getProjectById(parseInt(project_id));
      const isAssigned = await isEmployeeAssignedToProject(parseInt(project_id), req.user.id);
      const isProjectCreator = project && project.created_by === req.user.id;

      if (!isAssigned && !isProjectCreator) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Check if employee is assigned to this project
    const isAssigned = await isEmployeeAssignedToProject(parseInt(project_id), parseInt(employee_id));

    if (!isAssigned) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const statuses = await getEmployeeStatuses(parseInt(employee_id), parseInt(project_id));
    res.json(statuses);
  } catch (error) {
    logger.error('Get employee status history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllTeamUpdates = async (req, res) => {
  try {
    // Only managers can get all team updates
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get all statuses for projects where the current manager assigned employees
    // This ensures managers only see action plans from users they've assigned
    const allStatuses = await db('daily_statuses')
      .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .join('project_assignments', function () {
        this.on('projects.id', '=', 'project_assignments.project_id')
          .andOn('daily_statuses.employee_id', '=', 'project_assignments.employee_id')
          .andOn('project_assignments.is_active', '=', db.raw('true'));
      })
      .where('project_assignments.assigned_by', req.user.id) // Only show action plans from employees assigned by this manager
      .where('daily_statuses.is_deleted', false)
      .where('projects.is_deleted', false)
      .select(
        'daily_statuses.id',
        'daily_statuses.date',
        'daily_statuses.status_text',
        'daily_statuses.submitted_at',
        'daily_statuses.review_status',
        'daily_statuses.review_comments',
        'daily_statuses.mark_as_completed',
        'daily_statuses.action_plan_status',
        'employees.name as employee_name',
        'employees.id as employee_id',
        'projects.name as project_name',
        'projects.id as project_id'
      )
      .orderBy('daily_statuses.submitted_at', 'desc');

    res.json(allStatuses);
  } catch (error) {
    logger.error('Get all team updates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRecentStatusesForManager = async (req, res) => {
  try {
    // Only managers can get recent statuses
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get recent statuses for projects where the current manager assigned employees
    const recentStatuses = await db('daily_statuses')
      .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .join('project_assignments', function () {
        this.on('projects.id', '=', 'project_assignments.project_id')
          .andOn('daily_statuses.employee_id', '=', 'project_assignments.employee_id')
          .andOn('project_assignments.is_active', '=', db.raw('true'));
      })
      .where('project_assignments.assigned_by', req.user.id) // Only show action plans from employees assigned by this manager
      .where('daily_statuses.is_deleted', false)
      .where('projects.is_deleted', false)
      .orderBy('daily_statuses.submitted_at', 'desc')
      .limit(10) // Limit to 10 most recent
      .select(
        'daily_statuses.id',
        'daily_statuses.date',
        'daily_statuses.status_text',
        'daily_statuses.submitted_at',
        'daily_statuses.mark_as_completed',
        'daily_statuses.review_status',
        'daily_statuses.review_comments',
        'daily_statuses.action_plan_status',
        'employees.name as employee_name',
        'projects.name as project_name',
        'projects.id as project_id'
      );

    res.json(recentStatuses);
  } catch (error) {
    logger.error('Get recent statuses for manager error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeUpdates = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Check permissions
    if (req.user.role === 'employee' && parseInt(employeeId) !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates = await getEmployeeDailyUpdates(parseInt(employeeId));
    res.json(updates);
  } catch (error) {
    logger.error('Get employee updates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTeamUpdates = async (req, res) => {
  try {
    // Only managers can get team updates
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get recent statuses for projects where the current manager assigned employees
    const recentStatuses = await db('daily_statuses')
      .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .join('project_assignments', function () {
        this.on('projects.id', '=', 'project_assignments.project_id')
          .andOn('daily_statuses.employee_id', '=', 'project_assignments.employee_id')
          .andOn('project_assignments.is_active', '=', db.raw('true'));
      })
      .where('project_assignments.assigned_by', req.user.id) // Only show action plans from employees assigned by this manager
      .where('daily_statuses.is_deleted', false)
      .where('projects.is_deleted', false)
      .orderBy('daily_statuses.submitted_at', 'desc')
      .limit(10) // Limit to 10 most recent
      .select(
        'daily_statuses.id',
        'daily_statuses.date',
        'daily_statuses.status_text',
        'daily_statuses.submitted_at',
        'daily_statuses.mark_as_completed',
        'daily_statuses.review_status',
        'daily_statuses.review_comments',
        'daily_statuses.action_plan_status',
        'employees.name as employee_name',
        'projects.name as project_name',
        'projects.id as project_id'
      );

    res.json(recentStatuses);
  } catch (error) {
    logger.error('Get team updates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjectUpdates = async (req, res) => {
  try {
    const { id: projectId } = req.params; // Changed from { projectId } to { id: projectId }

    // Check permissions
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (req.user.role === 'employee') {
      const isAssigned = await isEmployeeAssignedToProject(projectId, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    } else if (req.user.role === 'manager') {
      // Check if manager created this project or is assigned to it
      const isAssigned = await isEmployeeAssignedToProject(projectId, req.user.id);
      const isProjectCreator = project && project.created_by === req.user.id;

      if (!isAssigned && !isProjectCreator) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const updates = await getProjectDailyUpdates(parseInt(projectId));
    res.json(updates);
  } catch (error) {
    logger.error('Get project updates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveCompletion = async (req, res) => {
  try {
    const { statusId } = req.params;

    // Find the specific status
    const status = await db('daily_statuses')
      .where('id', statusId)
      .where('mark_as_completed', true)
      .where('review_status', 'pending')
      .first();

    if (!status) {
      return res.status(400).json({ error: 'No pending completion request found with this ID' });
    }

    // Check if user has permission to approve this status
    // The approver should be the manager who assigned the employee to the project
    const project = await getProjectById(status.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if the current user is a manager who assigned this employee to the project
    const assignment = await db('project_assignments')
      .where('project_id', status.project_id)
      .where('employee_id', status.employee_id)
      .where('assigned_by', req.user.id)
      .where('is_active', true)
      .first();

    const isProjectCreator = project.created_by === req.user.id;

    if (req.user.role !== 'manager' || (!assignment && !isProjectCreator)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update ONLY the daily status to approved, do NOT change project status
    await db('daily_statuses')
      .where('id', statusId)
      .update({
        review_status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: new Date()
      });

    res.json({
      message: 'Action plan completion approved successfully',
      statusId,
      // Return the actual status text that was submitted by the employee
      status_text: status.status_text,
      action_plan_status: status.action_plan_status
    });
  } catch (error) {
    logger.error('Approve completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectCompletion = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Find the specific status
    const status = await db('daily_statuses')
      .where('id', statusId)
      .where('mark_as_completed', true)
      .where('review_status', 'pending')
      .first();

    if (!status) {
      return res.status(400).json({ error: 'No pending completion request found with this ID' });
    }

    // Check if user has permission to reject this status
    // The approver should be the manager who assigned the employee to the project
    const project = await getProjectById(status.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if the current user is a manager who assigned this employee to the project
    const assignment = await db('project_assignments')
      .where('project_id', status.project_id)
      .where('employee_id', status.employee_id)
      .where('assigned_by', req.user.id)
      .where('is_active', true)
      .first();

    const isProjectCreator = project.created_by === req.user.id;

    if (req.user.role !== 'manager' || (!assignment && !isProjectCreator)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update only the specific daily status to rejected
    // Do NOT change the project status when rejecting an action plan
    await db('daily_statuses')
      .where('id', statusId)
      .update({
        review_status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        // Store the rejection reason in review_comments
        review_comments: reason.trim()
      });

    res.json({
      message: 'Action plan rejected successfully'
    });
  } catch (error) {
    logger.error('Reject completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// New function to get count of pending action plans
export const getPendingActionPlansCount = async (req, res) => {
  try {
    // Only managers can get pending action plans count
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get count of pending action plans that are either:
    // 1. Marked as completed and pending review
    // 2. Have action plan status updates pending approval
    // These should go to managers who assigned the employees to projects, not just project creators
    const countResult = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .leftJoin('project_assignments', function () {
        this.on('projects.id', '=', 'project_assignments.project_id')
          .andOn('daily_statuses.employee_id', '=', 'project_assignments.employee_id')
          .andOn('project_assignments.is_active', '=', db.raw('true'));
      })
      .where(function () {
        this.where('project_assignments.assigned_by', req.user.id)
          .orWhere('projects.created_by', req.user.id);
      })
      .where('daily_statuses.review_status', 'pending')
      .where('daily_statuses.is_deleted', false)
      .where(function () {
        this.where('daily_statuses.mark_as_completed', true)
          .orWhere('daily_statuses.action_plan_status', 'under_approval');
      })
      .count('* as count')
      .first();

    res.json({
      count: parseInt(countResult.count) || 0
    });
  } catch (error) {
    logger.error('Get pending action plans count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a new function to approve status updates
export const approveStatusUpdate = async (req, res) => {
  try {
    const { statusId } = req.params;

    // Find the specific status with pending review and under_approval status
    const status = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .where('daily_statuses.id', statusId)
      .where('daily_statuses.action_plan_status', 'under_approval')
      .where('daily_statuses.review_status', 'pending')
      .where('daily_statuses.is_deleted', false)
      .first(
        'daily_statuses.*',
        'projects.created_by'
      );

    if (!status) {
      return res.status(400).json({ error: 'No pending status update found with this ID' });
    }

    // Check if user has permission to approve this status
    // The approver should be the manager who assigned the employee to the project
    const assignment = await db('project_assignments')
      .where('project_id', status.project_id)
      .where('employee_id', status.employee_id)
      .where('assigned_by', req.user.id)
      .where('is_active', true)
      .first();

    const isProjectCreator = status.created_by === req.user.id;

    if (req.user.role !== 'manager' || (!assignment && !isProjectCreator)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Extract the requested status from review_comments
    let requestedStatus = 'started';
    if (status.review_comments && status.review_comments.startsWith('Requested status: ')) {
      requestedStatus = status.review_comments.replace('Requested status: ', '');
    }

    // Validate that the requested status is a valid action plan status
    const validStatuses = ['started', 'in_progress', 'completed', 'under_approval', 'on_hold'];
    if (!validStatuses.includes(requestedStatus)) {
      requestedStatus = 'started'; // Default to started if invalid
    }

    // Update the daily status to approved with the requested status
    await db('daily_statuses')
      .where('id', statusId)
      .update({
        action_plan_status: requestedStatus,
        review_status: 'approved',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        // Clear the review_comments since we've processed the request
        review_comments: null,
        updated_at: db.fn.now()
      });

    res.json({
      message: 'Status update approved successfully',
      statusId,
      action_plan_status: requestedStatus
    });
  } catch (error) {
    logger.error('Approve status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a new function to reject status updates
export const rejectStatusUpdate = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Find the specific status with pending review and under_approval status
    const status = await db('daily_statuses')
      .join('projects', 'daily_statuses.project_id', 'projects.id')
      .where('daily_statuses.id', statusId)
      .where('daily_statuses.action_plan_status', 'under_approval')
      .where('daily_statuses.review_status', 'pending')
      .where('daily_statuses.is_deleted', false)
      .first(
        'daily_statuses.*',
        'projects.created_by'
      );

    if (!status) {
      return res.status(400).json({ error: 'No pending status update found with this ID' });
    }

    // Check if user has permission to reject this status
    // The approver should be the manager who assigned the employee to the project
    const assignment = await db('project_assignments')
      .where('project_id', status.project_id)
      .where('employee_id', status.employee_id)
      .where('assigned_by', req.user.id)
      .where('is_active', true)
      .first();

    const isProjectCreator = status.created_by === req.user.id;

    if (req.user.role !== 'manager' || (!assignment && !isProjectCreator)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get the previous status from the status logs
    const statusLog = await db('status_logs')
      .where('status_id', statusId)
      .orderBy('updated_at', 'desc')
      .first();

    const previousStatus = statusLog ? statusLog.previous_status : 'started';

    // Update the daily status to rejected and revert to previous status
    await db('daily_statuses')
      .where('id', statusId)
      .update({
        action_plan_status: previousStatus,
        review_status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        // Store the rejection reason
        review_comments: `Status update rejected: ${reason}`,
        updated_at: db.fn.now()
      });

    res.json({
      message: 'Status update rejected successfully',
      statusId,
      action_plan_status: previousStatus
    });
  } catch (error) {
    logger.error('Reject status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark action plan as read
export const markActionPlanRead = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.id;

    // Check if status exists
    const status = await db('daily_statuses').where('id', statusId).first();
    if (!status) {
      return res.status(404).json({ error: 'Action plan not found' });
    }

    // Insert or update the read record
    await db('action_plan_reads')
      .insert({
        user_id: userId,
        action_plan_id: statusId,
        last_read_at: db.fn.now()
      })
      .onConflict(['user_id', 'action_plan_id'])
      .merge();

    res.json({ message: 'Action plan marked as read' });
  } catch (error) {
    logger.error('Mark action plan read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
