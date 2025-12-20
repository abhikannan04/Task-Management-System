export const up = async function(knex) {
  await knex.schema.table('projects', async function(table) {
    const hasTotalHours = await knex.schema.hasColumn('projects', 'total_hours_logged');
    if (!hasTotalHours) table.integer('total_hours_logged').defaultTo(0);

    const hasTotalMilestones = await knex.schema.hasColumn('projects', 'total_milestones');
    if (!hasTotalMilestones) table.integer('total_milestones').defaultTo(0);

    const hasCompletedMilestones = await knex.schema.hasColumn('projects', 'completed_milestones');
    if (!hasCompletedMilestones) table.integer('completed_milestones').defaultTo(0);
  });
};

export const down = async function(knex) {
  await knex.schema.table('projects', async function(table) {
    const hasTotalHours = await knex.schema.hasColumn('projects', 'total_hours_logged');
    if (hasTotalHours) table.dropColumn('total_hours_logged');

    const hasTotalMilestones = await knex.schema.hasColumn('projects', 'total_milestones');
    if (hasTotalMilestones) table.dropColumn('total_milestones');

    const hasCompletedMilestones = await knex.schema.hasColumn('projects', 'completed_milestones');
    if (hasCompletedMilestones) table.dropColumn('completed_milestones');
  });
};