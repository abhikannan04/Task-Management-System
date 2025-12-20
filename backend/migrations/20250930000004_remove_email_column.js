export const up = async function(knex) {
  // Check if email column exists and drop it
  const hasEmailColumn = await knex.schema.hasColumn('users', 'email');
  if (hasEmailColumn) {
    await knex.schema.table('users', function(table) {
      table.dropColumn('email');
    });
  }
};

export const down = async function(knex) {
  // Add email column back if needed
  const hasEmailColumn = await knex.schema.hasColumn('users', 'email');
  if (!hasEmailColumn) {
    await knex.schema.table('users', function(table) {
      table.string('email', 100).nullable().unique();
    });
  }
};