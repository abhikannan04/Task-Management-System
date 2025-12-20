export const up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('projects', 'progress_percentage');
  if (!hasColumn) {
    await knex.schema.table('projects', function(table) {
      table.integer('progress_percentage').defaultTo(0);
    });
  }
};

export const down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('projects', 'progress_percentage');
  if (hasColumn) {
    await knex.schema.table('projects', function(table) {
      table.dropColumn('progress_percentage');
    });
  }
};