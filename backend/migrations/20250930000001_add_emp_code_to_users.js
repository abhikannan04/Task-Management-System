export const up = async function(knex) {
  // Add emp_code column to users table
  const hasEmpCodeColumn = await knex.schema.hasColumn('users', 'emp_code');
  if (!hasEmpCodeColumn) {
    await knex.schema.table('users', function(table) {
      table.string('emp_code', 50).unique();
    });
  }
  
  // Make email nullable since we'll be using emp_code
  await knex.schema.table('users', function(table) {
    table.string('email', 100).nullable().alter();
  });
};

export const down = async function(knex) {
  // Remove emp_code column
  const hasEmpCodeColumn = await knex.schema.hasColumn('users', 'emp_code');
  if (hasEmpCodeColumn) {
    await knex.schema.table('users', function(table) {
      table.dropColumn('emp_code');
    });
  }
  
  // Make email not nullable again
  await knex.schema.table('users', function(table) {
    table.string('email', 100).notNullable().alter();
  });
};