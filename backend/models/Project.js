import db from '../db.js';

export const createProject = async (projectData) => {
  // Handle prd_file properly by converting to JSON string if it's an object
  const projectDataToInsert = {
    ...projectData,
    progress_percentage: 0, // Initialize progress to 0
    status: 'planning' // Set initial status to planning
  };

  // If prd_file is an object, convert it to JSON string for storage
  if (projectDataToInsert.prd_file && typeof projectDataToInsert.prd_file === 'object') {
    projectDataToInsert.prd_file = JSON.stringify(projectDataToInsert.prd_file);
  }

  const [result] = await db('projects').insert(projectDataToInsert).returning('id');
  // Handle both PostgreSQL (returns object {id: X}) and other DBs (returns just the ID)
  return typeof result === 'object' ? result.id : result;
};

export const getAllProjects = async (userId, userRole) => {
  // First, update any delayed projects
  try {
    // Update projects that are past their end date but are not completed to delayed status
    // Use date comparison that accounts for timezone
    await db('projects')
      .whereNot('status', 'completed')
      .where('end_date', '<', new Date().toISOString().split('T')[0]) // Compare only date part
      .where('is_deleted', false)
      .where('created_by', userId) // Only update projects created by this user
      .update({ status: 'delayed', updated_at: db.fn.now() });
  } catch (error) {
    console.error('Error updating delayed projects:', error);
  }

  let query = db('projects')
    .leftJoin(
      db('project_assignments')
        .where('project_assignments.is_active', true)
        .groupBy('project_assignments.project_id')
        .select('project_assignments.project_id', db.raw('COUNT(*) as assignment_count'))
        .as('assignments'),
      'projects.id',
      'assignments.project_id'
    )
    .where('projects.is_deleted', false)
    .select(
      'projects.*',
      'assignments.assignment_count',
      db.raw(`(
        SELECT COUNT(*)
        FROM project_comments
        WHERE project_comments.project_id = projects.id
        AND project_comments.created_at > COALESCE((
          SELECT project_assignments.last_viewed_at
          FROM project_assignments
          WHERE project_assignments.project_id = projects.id
          AND project_assignments.employee_id = ?
          ORDER BY project_assignments.last_viewed_at DESC
          LIMIT 1
        ), '1970-01-01')
      ) as unread_comments_count`, [userId])
    );

  if (userRole === 'employee') {
    // Employees only see projects they're assigned to
    query = query
      .join('project_assignments', function () {
        this.on('projects.id', '=', 'project_assignments.project_id')
          .andOn('project_assignments.is_active', '=', db.raw('true'))
          .andOn('project_assignments.employee_id', '=', db.raw('?', [userId]));
      });
  } else if (userRole === 'manager') {
    // Managers see projects they created OR projects they're assigned to
    query = query
      .where(function () {
        this.where('projects.created_by', userId)
          .orWhereIn('projects.id', function () {
            this.select('project_id')
              .from('project_assignments')
              .where('employee_id', userId)
              .andWhere('is_active', true);
          });
      });
  } else if (userRole === 'admin') {
    // Admins see all
    // No additional filter
  }

  const projects = await query;

  // Ensure assignment_count is properly set for all projects
  return projects.map(project => ({
    ...project,
    assignment_count: project.assignment_count ? parseInt(project.assignment_count) : 0
  }));
};

export const getProjectById = async (id) => {
  const project = await db('projects').where({ id, is_deleted: false }).first();

  // Parse prd_file if it exists and is a string
  if (project && project.prd_file && typeof project.prd_file === 'string') {
    try {
      project.prd_file = JSON.parse(project.prd_file);
    } catch (error) {
      // If parsing fails, leave it as is
      console.error('Error parsing prd_file:', error);
    }
  }

  return project;
};

export const getProjectWithAssignments = async (id) => {
  // Validate that id is a valid integer
  const projectId = parseInt(id);
  if (isNaN(projectId) || projectId <= 0) {
    throw new Error('Invalid project ID');
  }

  // First, get the project with basic information
  const project = await db('projects')
    .leftJoin(
      db('project_assignments')
        .where('project_assignments.is_active', true)
        .groupBy('project_assignments.project_id')
        .select('project_assignments.project_id', db.raw('COUNT(*) as assignment_count'))
        .as('assignments'),
      'projects.id',
      'assignments.project_id'
    )
    .leftJoin('users', 'projects.created_by', 'users.id')
    .where('projects.id', projectId)
    .where('projects.is_deleted', false)
    .first()
    .select('projects.*', 'assignments.assignment_count', 'users.name as created_by_name');

  // If project exists, get the assigner information
  if (project) {
    // Get distinct assigners for this project
    const assigners = await db('project_assignments')
      .join('users', 'project_assignments.assigned_by', 'users.id')
      .where('project_assignments.project_id', projectId)
      .where('project_assignments.is_active', true)
      .groupBy('users.id', 'users.name')
      .select('users.name as assigned_by_name');

    // If we have assigners, add them to the project object
    if (assigners.length > 0) {
      // Join all assigner names with commas
      project.assigned_by_names = assigners.map(a => a.assigned_by_name).join(', ');
    }
  }

  // Parse prd_file if it exists and is a string
  if (project && project.prd_file && typeof project.prd_file === 'string') {
    try {
      project.prd_file = JSON.parse(project.prd_file);
    } catch (error) {
      // If parsing fails, leave it as is
      console.error('Error parsing prd_file:', error);
    }
  }

  return project;
};

export const updateProject = async (id, projectData) => {
  // Handle prd_file properly by converting to JSON string if it's an object
  const projectDataToUpdate = { ...projectData, updated_at: db.fn.now() };

  // If prd_file is an object, convert it to JSON string for storage
  if (projectDataToUpdate.prd_file && typeof projectDataToUpdate.prd_file === 'object') {
    projectDataToUpdate.prd_file = JSON.stringify(projectDataToUpdate.prd_file);
  }

  return await db('projects').where({ id }).update(projectDataToUpdate);
};

export const deleteProject = async (id) => {
  return await db('projects').where({ id }).update({ is_deleted: true, updated_at: db.fn.now() });
};

// Add a new function to check and update delayed projects
export const checkAndUpdateDelayedProjects = async (userId) => {
  try {
    // Update projects that are past their end date but are not completed to delayed status
    await db('projects')
      .whereNot('status', 'completed')
      .where('end_date', '<', new Date().toISOString().split('T')[0]) // Compare only date part
      .where('is_deleted', false)
      .where('created_by', userId)
      .update({ status: 'delayed', updated_at: db.fn.now() });
  } catch (error) {
    console.error('Error updating delayed projects:', error);
  }
};

// Add a new function to check if a project should no longer be delayed
export const checkAndUpdateProjectStatus = async (projectId, userId) => {
  try {
    const project = await getProjectById(projectId);
    if (!project) return;

    // If project is delayed but end_date is in the future, update status to active
    if (project.status === 'delayed' && project.end_date) {
      const endDate = new Date(project.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare only date part

      if (endDate >= today) {
        // When a delayed project's end date is extended, it should go back to active status
        await updateProject(projectId, { status: 'active' });
      }
    }
    // If project is active but end_date is in the past and not completed, update status to delayed
    else if (['active', 'planning', 'pending_approval'].includes(project.status) && project.end_date && project.status !== 'completed') {
      const endDate = new Date(project.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare only date part

      if (endDate < today) {
        await updateProject(projectId, { status: 'delayed' });
      }
    }
  } catch (error) {
    console.error('Error checking project status:', error);
  }
};

export const isEmployeeAssignedToProject = async (projectId, employeeId) => {
  const assignment = await db('project_assignments')
    .where({ project_id: projectId, employee_id: employeeId, is_active: true })
    .first();
  return !!assignment;
};
