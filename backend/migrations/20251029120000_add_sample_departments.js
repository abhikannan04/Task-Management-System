export const up = async function(knex) {
  // Add sample department data to existing users
  // This is a one-time data migration
  
  // Update admin user
  await knex('users')
    .where({ emp_code: 'EMP001' })
    .update({ department: 'Administration' });
  
  // Update manager Sarah - Systems department
  await knex('users')
    .where({ emp_code: 'EMP002' })
    .update({ department: 'Systems' });
  
  // Update manager Mike - HR department
  await knex('users')
    .where({ emp_code: 'EMP003' })
    .update({ department: 'HR' });
  
  // Update employee Alice - Systems department
  await knex('users')
    .where({ emp_code: 'EMP004' })
    .update({ department: 'Systems' });
  
  // Update employee Bob - Systems department
  await knex('users')
    .where({ emp_code: 'EMP005' })
    .update({ department: 'Systems' });
  
  // Update employee Carol - HR department
  await knex('users')
    .where({ emp_code: 'EMP006' })
    .update({ department: 'HR' });
};

export const down = async function(knex) {
  // Remove department data
  await knex('users')
    .whereIn('emp_code', ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005', 'EMP006'])
    .update({ department: null });
};
