/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // Add updated_at column to daily_statuses table
  const hasUpdatedAtColumn = await knex.schema.hasColumn('daily_statuses', 'updated_at');
  if (!hasUpdatedAtColumn) {
    await knex.schema.table('daily_statuses', function(table) {
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Remove updated_at column from daily_statuses table
  const hasUpdatedAtColumn = await knex.schema.hasColumn('daily_statuses', 'updated_at');
  if (hasUpdatedAtColumn) {
    await knex.schema.table('daily_statuses', function(table) {
      table.dropColumn('updated_at');
    });
  }
};