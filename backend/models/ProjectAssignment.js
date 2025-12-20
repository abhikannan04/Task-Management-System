import db from '../db.js';

export const assignEmployeeToProject = async (assignmentData) => {
  const [id] = await db('project_assignments').insert(assignmentData).returning('id');
  return id;
};

export const getProjectAssignments = async (projectId) => {
  const assignments = await db('project_assignments')
    .join('users', 'project_assignments.employee_id', 'users.id')
    .leftJoin('users as assigners', 'project_assignments.assigned_by', 'assigners.id')
    .where('project_assignments.project_id', projectId)
    .where('project_assignments.is_active', true)
    .select(
      'project_assignments.id',
      'users.id as employee_id',
      'users.name as employee_name',
      'users.emp_code as employee_code',
      'users.role as employee_role',
      'project_assignments.assigned_at',
      'assigners.name as assigned_by_name'
    );

  // Fetch latest status for each employee
  const employeeIds = assignments.map(a => a.employee_id);

  if (employeeIds.length === 0) return assignments;

  const latestStatuses = await db('daily_statuses')
    .whereIn('employee_id', employeeIds)
    .where('project_id', projectId)
    .where('is_deleted', false)
    .orderBy('submitted_at', 'desc')
    .select('employee_id', 'submitted_at', 'action_plan_status', 'status_text');

  // Map statuses to assignments
  const statusMap = {};
  latestStatuses.forEach(status => {
    if (!statusMap[status.employee_id]) {
      statusMap[status.employee_id] = status;
    }
  });

  return assignments.map(assignment => ({
    ...assignment,
    last_active: statusMap[assignment.employee_id]?.submitted_at || null,
    latest_status: statusMap[assignment.employee_id]?.action_plan_status || null,
    latest_status_text: statusMap[assignment.employee_id]?.status_text || null
  }));
};

export const getEmployeeProjects = async (employeeId) => {
  const projects = await db('project_assignments')
    .join('projects', 'project_assignments.project_id', 'projects.id')
    .where('project_assignments.employee_id', employeeId)
    .where('project_assignments.is_active', true)
    .where('projects.is_deleted', false)
    .select(
      'projects.*',
      'project_assignments.last_viewed_at'
    );

  // For each project, count unread items
  const projectsWithUnread = await Promise.all(projects.map(async (project) => {
    const lastViewed = project.last_viewed_at || new Date(0); // Default to epoch if null

    // Count new activities
    const newActivities = await db('action_plan_activities')
      .join('daily_statuses', 'action_plan_activities.daily_status_id', 'daily_statuses.id')
      .where('daily_statuses.project_id', project.id)
      .where('action_plan_activities.created_at', '>', lastViewed)
      .count('* as count')
      .first();

    // Count new discussions
    const newDiscussions = await db('action_plan_discussions')
      .join('daily_statuses', 'action_plan_discussions.daily_status_id', 'daily_statuses.id')
      .where('daily_statuses.project_id', project.id)
      .where('action_plan_discussions.created_at', '>', lastViewed)
      .count('* as count')
      .first();

    return {
      ...project,
      unread_count: (parseInt(newActivities.count) || 0) + (parseInt(newDiscussions.count) || 0)
    };
  }));

  return projectsWithUnread;
};

export const unassignEmployee = async (assignmentId) => {
  return await db('project_assignments').where({ id: assignmentId }).update({ is_active: false });
};

export const isEmployeeAssignedToProject = async (projectId, employeeId) => {
  const assignment = await db('project_assignments')
    .where({ project_id: projectId, employee_id: employeeId, is_active: true })
    .first();
  return !!assignment;
};

export const markProjectAsViewed = async (projectId, employeeId) => {
  const existing = await db('project_assignments')
    .where({ project_id: projectId, employee_id: employeeId })
    .first();

  if (existing) {
    await db('project_assignments')
      .where({ id: existing.id })
      .update({ last_viewed_at: db.fn.now() });
  } else {
    // If no assignment exists (e.g., creator viewing for first time), create one
    // We assume if they can view it, they should be "assigned" or at least tracked
    // Default to active so they show up in lists properly
    await db('project_assignments').insert({
      project_id: projectId,
      employee_id: employeeId,
      assigned_by: employeeId, // Self-assigned
      is_active: true,
      last_viewed_at: db.fn.now(),
      assigned_at: db.fn.now()
    });
  }
};