/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // Add action_plan_status column to daily_statuses table
  const hasActionPlanStatusColumn = await knex.schema.hasColumn('daily_statuses', 'action_plan_status');
  if (!hasActionPlanStatusColumn) {
    await knex.schema.table('daily_statuses', function(table) {
      table.enu('action_plan_status', ['started', 'in_progress', 'completed', 'under_approval', 'on_hold'])
        .defaultTo('started');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Remove action_plan_status column from daily_statuses table
  const hasActionPlanStatusColumn = await knex.schema.hasColumn('daily_statuses', 'action_plan_status');
  if (hasActionPlanStatusColumn) {
    await knex.schema.table('daily_statuses', function(table) {
      table.dropColumn('action_plan_status');
    });
  }
};