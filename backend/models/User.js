import db from '../db.js';

export const createUser = async (userData) => {
  const [id] = await db('users').insert(userData).returning('id');
  return id;
};

export const findUserByEmpCode = async (empCode) => {
  return await db('users').where({ emp_code: empCode, is_active: true }).first();
};

export const findUserById = async (id) => {
  return await db('users').where({ id, is_active: true }).first();
};

export const getAllUsers = async () => {
  return await db('users').where({ is_active: true }).select('id', 'emp_code', 'role', 'name', 'department', 'dept_code');
};

export const getTotalEmployeeCount = async () => {
  const result = await db('users')
    .where({ role: 'employee', is_active: true })
    .count('id as count')
    .first();
  return result ? parseInt(result.count) : 0;
};

export const getUniqueDepartments = async () => {
  const departments = await db('users')
    .distinct('department')
    .whereNotNull('department')
    .where('is_active', true)
    .whereIn('role', ['manager', 'admin'])
    .orderBy('department');
  
  return departments.map(dept => dept.department);
};

export const updateUserById = async (id, userData) => {
  await db('users')
    .where({ id, is_active: true })
    .update({ ...userData, updated_at: db.fn.now() });
  
  // Return the updated user object
  return await findUserById(id);
};

// Delete user and all related data
export const deleteUserByEmpCode = async (empCode) => {
  // First, find the user to get their ID
  const user = await findUserByEmpCode(empCode);
  if (!user) {
    return null;
  }
  
  const userId = user.id;
  
  // Delete related data in proper order to respect foreign key constraints
  // Delete status logs first (they have foreign key to daily_statuses)
  await db('status_logs').whereExists(function() {
    this.select('*').from('daily_statuses').whereRaw('status_logs.status_id = daily_statuses.id').where('daily_statuses.employee_id', userId);
  }).del();
  
  // Delete daily statuses
  await db('daily_statuses').where('employee_id', userId).del();
  
  // Delete project assignments
  await db('project_assignments').where('employee_id', userId).del();
  
  // Delete report logs
  await db('reports_logs').where('user_id', userId).del();
  
  // Finally, delete the user (soft delete by setting is_active to false)
  await db('users').where('id', userId).update({ is_active: false, updated_at: db.fn.now() });
  
  return user;
};