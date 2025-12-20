export const up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('projects', 'completion_comments');
  if (!hasColumn) {
    await knex.schema.table('projects', function(table) {
      table.text('completion_comments').nullable().comment('Comments provided by manager when approving project completion');
    });
  }
};

export const down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('projects', 'completion_comments');
  if (hasColumn) {
    await knex.schema.table('projects', function(table) {
      table.dropColumn('completion_comments');
    });
  }
};
