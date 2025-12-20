export const up = async function(knex) {
  const hasMarkAsCompleted = await knex.schema.hasColumn('daily_statuses', 'mark_as_completed');
  if (!hasMarkAsCompleted) {
    await knex.schema.table('daily_statuses', function(table) {
      table.boolean('mark_as_completed').defaultTo(false);
    });
  }
};

export const down = async function(knex) {
  const hasMarkAsCompleted = await knex.schema.hasColumn('daily_statuses', 'mark_as_completed');
  if (hasMarkAsCompleted) {
    await knex.schema.table('daily_statuses', function(table) {
      table.dropColumn('mark_as_completed');
    });
  }
};
