import Joi from 'joi';
import {
  assignEmployeeToProject,
  getProjectAssignments,
  getEmployeeProjects,
  unassignEmployee,
  isEmployeeAssignedToProject,
  markProjectAsViewed
} from '../models/ProjectAssignment.js';
import { findUserById } from '../models/User.js';
import { getProjectById, updateProject } from '../models/Project.js';
import db from '../db.js';
import logger from '../utils/logger.js';

const assignmentSchema = Joi.object({
  employee_id: Joi.number().integer().required(),
  project_id: Joi.number().integer().required()
});

export const assign = async (req, res) => {
  try {
    // Only admin and manager can assign employees
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { error, value } = assignmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { employee_id, project_id } = value;

    // Check if project exists
    const project = await getProjectById(project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Prevent assignment if project is completed
    if (project.status === 'completed') {
      return res.status(400).json({ error: 'Cannot assign employees to a completed project' });
    }

    // Check if user exists and is either employee or manager
    const user = await findUserById(employee_id);
    if (!user || (user.role !== 'employee' && user.role !== 'manager')) {
      return res.status(404).json({ error: 'User not found or invalid role' });
    }

    // Check if user has permission to assign to this project
    if (req.user.role === 'manager') {
      // Check if manager created this project OR is assigned to this project
      const isAssigned = await isEmployeeAssignedToProject(project_id, req.user.id);
      const isProjectCreator = project.created_by === req.user.id;

      if (!isAssigned && !isProjectCreator) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    // Check if already assigned (active)
    const existingAssignment = await isEmployeeAssignedToProject(project_id, employee_id);

    if (existingAssignment) {
      return res.status(400).json({ error: 'User already assigned to this project' });
    }

    // Check for inactive assignment and reactivate if exists
    const inactiveAssignment = await db('project_assignments')
      .where({ project_id, employee_id, is_active: false })
      .first();

    let assignmentId;
    if (inactiveAssignment) {
      // Reactivate existing assignment
      assignmentId = inactiveAssignment.id;
      await db('project_assignments')
        .where({ id: inactiveAssignment.id })
        .update({
          is_active: true,
          assigned_by: req.user.id,
          assigned_at: db.fn.now()
        });
    } else {
      // Create new assignment
      const assignmentData = {
        project_id,
        employee_id,
        assigned_by: req.user.id,
        is_active: true
      };
      [assignmentId] = await db('project_assignments').insert(assignmentData).returning('id');
    }

    // If project is in planning status, set project status to 'active' when first assigned
    if (project.status === 'planning') {
      await updateProject(project_id, { status: 'active' });
    }

    res.status(201).json({ message: 'User assigned successfully', assignmentId });
  } catch (error) {
    logger.error('Assign user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAssignments = async (req, res) => {
  try {
    const { project_id } = req.params;

    // Check if project exists
    const project = await getProjectById(project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      // Check if employee is assigned to this project
      const isAssigned = await isEmployeeAssignedToProject(project_id, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    } else if (req.user.role === 'manager') {
      // Check if manager created this project OR is assigned to this project
      const isAssigned = await isEmployeeAssignedToProject(project_id, req.user.id);
      const isProjectCreator = project.created_by === req.user.id;

      if (!isAssigned && !isProjectCreator) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    const assignments = await getProjectAssignments(project_id);
    res.json(assignments);
  } catch (error) {
    logger.error('Get assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeProjectsList = async (req, res) => {
  try {
    const { employee_id } = req.params;

    // Check permissions
    // Allow managers to access their own assigned projects
    if (req.user.role === 'employee' && parseInt(employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Also allow managers to access their own assigned projects
    if (req.user.role === 'manager' && parseInt(employee_id) !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const projects = await getEmployeeProjects(employee_id);
    res.json(projects);
  } catch (error) {
    logger.error('Get employee projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unassign = async (req, res) => {
  try {
    // Only admin and manager can unassign employees
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.params;

    // Get assignment details
    const assignment = await db('project_assignments')
      .where('id', id)
      .first();

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Get project details
    const project = await getProjectById(assignment.project_id);

    // Prevent unassignment if project is completed
    if (project.status === 'completed') {
      return res.status(400).json({ error: 'Cannot unassign employees from a completed project' });
    }

    // Check permissions
    if (req.user.role === 'manager') {
      // Check if manager created this project OR is assigned to this project
      const isAssigned = await isEmployeeAssignedToProject(assignment.project_id, req.user.id);
      const isProjectCreator = project.created_by === req.user.id;

      if (!isAssigned && !isProjectCreator) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    await unassignEmployee(id);

    res.json({ message: 'User unassigned successfully' });
  } catch (error) {
    logger.error('Unassign employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markProjectViewed = async (req, res) => {
  try {
    const { project_id } = req.params;
    const employee_id = req.user.id;

    // Check if user is assigned to the project or is the creator
    const isAssigned = await isEmployeeAssignedToProject(project_id, employee_id);
    const project = await getProjectById(project_id);

    if (!isAssigned && (!project || project.created_by !== employee_id)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await markProjectAsViewed(project_id, employee_id);
    res.json({ message: 'Project marked as viewed' });
  } catch (error) {
    logger.error('Mark project viewed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
