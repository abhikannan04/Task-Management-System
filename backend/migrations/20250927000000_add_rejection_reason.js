export const up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('projects', 'rejection_reason');
  if (!hasColumn) {
    await knex.schema.table('projects', function(table) {
      table.text('rejection_reason').nullable().comment('Reason provided by manager when rejecting project completion');
    });
  }
};

export const down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('projects', 'rejection_reason');
  if (hasColumn) {
    await knex.schema.table('projects', function(table) {
      table.dropColumn('rejection_reason');
    });
  }
};
