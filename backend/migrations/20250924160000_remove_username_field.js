export const up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'username');
  if (hasColumn) {
    await knex.schema.table('users', function(table) {
      table.dropColumn('username');
    });
  }
};

export const down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'username');
  if (!hasColumn) {
    await knex.schema.table('users', function(table) {
      table.string('username', 50).notNullable().unique();
    });
  }
};