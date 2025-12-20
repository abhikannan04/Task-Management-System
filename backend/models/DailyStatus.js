import db from '../db.js';

export const submitDailyStatus = async (statusData) => {
  const [id] = await db('daily_statuses').insert(statusData).returning('id');
  return id;
};

export const getPendingStatuses = async (managerId) => {
  return await db('daily_statuses')
    .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
    .join('projects', 'daily_statuses.project_id', 'projects.id')
    .join('project_assignments', 'projects.id', 'project_assignments.project_id')
    .where('daily_statuses.review_status', 'pending')
    .where('project_assignments.assigned_by', managerId)
    .where('project_assignments.is_active', true)
    .where('daily_statuses.is_deleted', false)
    .select(
      'daily_statuses.id',
      'daily_statuses.date',
      'daily_statuses.status_text',
      'employees.name as employee_name',
      'employees.id as employee_id',
      'projects.name as project_name',
      'projects.id as project_id'
    )
    .orderBy('daily_statuses.submitted_at', 'desc');
};

export const getStatusById = async (id) => {
  return await db('daily_statuses').where({ id, is_deleted: false }).first();
};

export const updateStatusReview = async (id, reviewData) => {
  return await db('daily_statuses').where({ id }).update(reviewData);
};

export const getEmployeeStatuses = async (employeeId, projectId) => {
  return await db('daily_statuses')
    .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
    .join('projects', 'daily_statuses.project_id', 'projects.id') // Add join with projects table
    .where('daily_statuses.project_id', projectId)
    .where('daily_statuses.employee_id', employeeId) // Add this condition to filter by employee
    .where('daily_statuses.is_deleted', false)
    .where('projects.is_deleted', false) // Add filter for deleted projects
    .select(
      'daily_statuses.id',
      'daily_statuses.date',
      'daily_statuses.status_text',
      'daily_statuses.review_status',
      'daily_statuses.review_comments', // Add review_comments to the selection
      'daily_statuses.submitted_at',
      'daily_statuses.reviewed_at', // Add reviewed_at to the selection
      'daily_statuses.mark_as_completed',
      'daily_statuses.action_plan_status', // Add action_plan_status to the selection
      'employees.name as employee_name',
      'employees.id as employee_id'
    )
    .orderBy('daily_statuses.submitted_at', 'desc');
};

export const getStatusByEmployeeAndDate = async (employeeId, date) => {
  return await db('daily_statuses')
    .where('employee_id', employeeId)
    .where('date', date)
    .where('is_deleted', false)
    .first();
};

export const getEmployeeDailyUpdates = async (employeeId) => {
  return await db('daily_statuses')
    .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
    .join('projects', 'daily_statuses.project_id', 'projects.id')
    .where('daily_statuses.employee_id', employeeId)
    .where('daily_statuses.is_deleted', false)
    .where('projects.is_deleted', false) // Add filter for deleted projects
    .select(
      'daily_statuses.id',
      'daily_statuses.date',
      'daily_statuses.status_text',
      'daily_statuses.review_status',
      'daily_statuses.review_comments', // Add review_comments to the selection
      'daily_statuses.submitted_at',
      'employees.name as employee_name',
      'employees.id as employee_id',
      'projects.name as project_name',
      'projects.id as project_id'
    )
    .orderBy('daily_statuses.submitted_at', 'desc');
};

export const getTeamDailyUpdates = async (managerId) => {
  return await db('daily_statuses')
    .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
    .join('projects', 'daily_statuses.project_id', 'projects.id')
    .join('project_assignments', function() {
      this.on('projects.id', '=', 'project_assignments.project_id')
        .andOn('daily_statuses.employee_id', '=', 'project_assignments.employee_id')
        .andOn('project_assignments.is_active', '=', db.raw('true'));
    })
    .where('project_assignments.assigned_by', managerId) // Only show action plans from employees assigned by this manager
    .where('daily_statuses.is_deleted', false)
    .where('projects.is_deleted', false) // Add filter for deleted projects
    .select(
      'daily_statuses.id',
      'daily_statuses.date',
      'daily_statuses.status_text',
      'daily_statuses.review_status',
      'daily_statuses.review_comments', // Add review_comments to the selection
      'daily_statuses.submitted_at',
      'daily_statuses.mark_as_completed',
      'daily_statuses.action_plan_status', // Add action_plan_status to the selection
      'employees.name as employee_name',
      'employees.id as employee_id',
      'projects.name as project_name',
      'projects.id as project_id'
    )
    .orderBy('daily_statuses.submitted_at', 'desc')
    .limit(50); // Limit to recent 50 updates
};

export const getProjectDailyUpdates = async (projectId) => {
  return await db('daily_statuses')
    .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
    .join('projects', 'daily_statuses.project_id', 'projects.id')
    .where('daily_statuses.project_id', projectId)
    .where('daily_statuses.is_deleted', false)
    .where('projects.is_deleted', false) // Add filter for deleted projects
    .select(
      'daily_statuses.id',
      'daily_statuses.date',
      'daily_statuses.status_text',
      'daily_statuses.review_status',
      'daily_statuses.review_comments', // Add review_comments to the selection
      'daily_statuses.submitted_at',
      'daily_statuses.mark_as_completed',
      'daily_statuses.action_plan_status', // Add action_plan_status to the selection
      'employees.name as employee_name',
      'employees.id as employee_id',
      'employees.emp_code as employee_code',
      'projects.name as project_name',
      'projects.id as project_id'
    )
    .orderBy('daily_statuses.submitted_at', 'desc');
};

// Add a new function to update action plan status
export const updateActionPlanStatus = async (id, actionPlanStatus) => {
  return await db('daily_statuses')
    .where({ id })
    .update({ 
      action_plan_status: actionPlanStatus,
      updated_at: db.fn.now()
    });
};

// Add a new function to get action plans by status
export const getActionPlansByStatus = async (employeeId, status) => {
  return await db('daily_statuses')
    .join('projects', 'daily_statuses.project_id', 'projects.id')
    .join('project_assignments', function() {
      this.on('daily_statuses.project_id', '=', 'project_assignments.project_id')
        .andOn('project_assignments.is_active', '=', db.raw('true'));
    })
    .where('daily_statuses.employee_id', employeeId)
    .where('daily_statuses.action_plan_status', status)
    .where('daily_statuses.is_deleted', false)
    .where('projects.is_deleted', false)
    .select(
      'daily_statuses.id',
      'daily_statuses.status_text',
      'daily_statuses.action_plan_status',
      'daily_statuses.submitted_at',
      'daily_statuses.review_status',
      'projects.id as project_id',
      'projects.name as project_name'
    )
    .orderBy('daily_statuses.submitted_at', 'desc');
};

// Add a new function to get all action plans for a project (for CSV export)
export const getAllActionPlansForProject = async (projectId) => {
  // This query gets all action plans for a project
  return await db('daily_statuses')
    .join('users as employees', 'daily_statuses.employee_id', 'employees.id')
    .join('projects', 'daily_statuses.project_id', 'projects.id')
    .where('daily_statuses.project_id', projectId)
    .where('daily_statuses.is_deleted', false)
    .where('projects.is_deleted', false) // Add filter for deleted projects
    .where('daily_statuses.review_status', 'approved') // Only include approved action plans
    .select(
      'daily_statuses.id',
      'daily_statuses.date',
      'daily_statuses.status_text',
      'daily_statuses.review_status',
      'daily_statuses.submitted_at',
      'daily_statuses.mark_as_completed',
      'daily_statuses.action_plan_status',
      'employees.name as employee_name',
      'employees.id as employee_id',
      'employees.emp_code as employee_code',
      'projects.name as project_name',
      'projects.id as project_id'
    )
    .orderBy('daily_statuses.submitted_at', 'asc');
};

// Add a new function to get the most recent status for each action plan
export const getMostRecentActionPlanStatuses = async (projectId) => {
  // This query gets the most recent status for each employee's action plan in a project
  return await db('daily_statuses as ds1')
    .join('users as employees', 'ds1.employee_id', 'employees.id')
    .join('projects', 'ds1.project_id', 'projects.id')
    .where('ds1.project_id', projectId)
    .where('ds1.is_deleted', false)
    .where('projects.is_deleted', false) // Add filter for deleted projects
    .where('ds1.review_status', 'approved') // Only include approved action plans
    .select(
      'ds1.id',
      'ds1.date',
      'ds1.status_text',
      'ds1.review_status',
      'ds1.submitted_at',
      'ds1.mark_as_completed',
      'ds1.action_plan_status',
      'employees.name as employee_name',
      'employees.id as employee_id',
      'employees.emp_code as employee_code',
      'projects.name as project_name',
      'projects.id as project_id'
    )
    // This subquery ensures we get the most recent entry for each employee
    .whereNotExists(function() {
      this.select('*')
        .from('daily_statuses as ds2')
        .whereRaw('ds2.employee_id = ds1.employee_id')
        .whereRaw('ds2.project_id = ds1.project_id')
        .whereRaw('ds2.submitted_at > ds1.submitted_at')
        .where('ds2.is_deleted', false)
        .where('ds2.review_status', 'approved'); // Only compare with approved action plans
    })
    .orderBy('ds1.submitted_at', 'desc');
};

// Add a new function to get the most recent status for each action plan (including all statuses for internal use)
export const getAllMostRecentActionPlanStatuses = async (projectId) => {
  // This query gets the most recent status for each employee's action plan in a project
  return await db('daily_statuses as ds1')
    .join('users as employees', 'ds1.employee_id', 'employees.id')
    .join('projects', 'ds1.project_id', 'projects.id')
    .where('ds1.project_id', projectId)
    .where('ds1.is_deleted', false)
    .where('projects.is_deleted', false) // Add filter for deleted projects
    .whereNot('ds1.review_status', 'rejected') // Exclude rejected action plans
    .select(
      'ds1.id',
      'ds1.date',
      'ds1.status_text',
      'ds1.review_status',
      'ds1.submitted_at',
      'ds1.mark_as_completed',
      'ds1.action_plan_status',
      'employees.name as employee_name',
      'employees.id as employee_id',
      'employees.emp_code as employee_code',
      'projects.name as project_name',
      'projects.id as project_id'
    )
    // This subquery ensures we get the most recent entry for each employee
    .whereNotExists(function() {
      this.select('*')
        .from('daily_statuses as ds2')
        .whereRaw('ds2.employee_id = ds1.employee_id')
        .whereRaw('ds2.project_id = ds1.project_id')
        .whereRaw('ds2.submitted_at > ds1.submitted_at')
        .where('ds2.is_deleted', false)
        .whereNot('ds2.review_status', 'rejected');
    })
    .orderBy('ds1.submitted_at', 'desc');
};

// Add a new function to delete a daily status (soft delete)
export const deleteStatus = async (id, employeeId) => {
  return await db('daily_statuses')
    .where({ id, employee_id: employeeId }) // Ensure employee can only delete their own statuses
    .update({ 
      is_deleted: true,
      updated_at: db.fn.now()
    });
};
