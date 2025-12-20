export const up = async function(knex) {
  // Add department column to users table
  const hasDepartmentColumn = await knex.schema.hasColumn('users', 'department');
  if (!hasDepartmentColumn) {
    await knex.schema.table('users', function(table) {
      table.string('department', 100);
    });
  }
};

export const down = async function(knex) {
  // Remove department column
  const hasDepartmentColumn = await knex.schema.hasColumn('users', 'department');
  if (hasDepartmentColumn) {
    await knex.schema.table('users', function(table) {
      table.dropColumn('department');
    });
  }
};