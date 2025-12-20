export const up = async function(knex) {
  // Add dept_code column to users table
  const hasDeptCodeColumn = await knex.schema.hasColumn('users', 'dept_code');
  if (!hasDeptCodeColumn) {
    await knex.schema.table('users', function(table) {
      table.string('dept_code', 50);
    });
  }
};

export const down = async function(knex) {
  // Remove dept_code column
  const hasDeptCodeColumn = await knex.schema.hasColumn('users', 'dept_code');
  if (hasDeptCodeColumn) {
    await knex.schema.table('users', function(table) {
      table.dropColumn('dept_code');
    });
  }
};