export const up = async function(knex) {
  // Remove the unique constraint on project_assignments table
  // The constraint name is typically 'project_assignments_project_id_employee_id_unique'
  await knex.schema.alterTable('project_assignments', function(table) {
    table.dropUnique(['project_id', 'employee_id']);
  });
};

export const down = async function(knex) {
  // Add back the unique constraint
  await knex.schema.alterTable('project_assignments', function(table) {
    table.unique(['project_id', 'employee_id']);
  });
};
