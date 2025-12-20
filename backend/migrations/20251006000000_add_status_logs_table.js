/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // Create status_logs table to track action plan status changes
  const hasStatusLogsTable = await knex.schema.hasTable('status_logs');
  if (!hasStatusLogsTable) {
    await knex.schema.createTable('status_logs', function(table) {
      table.increments('id').primary();
      table.integer('status_id').unsigned().notNullable().references('id').inTable('daily_statuses').onDelete('CASCADE');
      table.string('previous_status').notNullable();
      table.string('new_status').notNullable();
      table.integer('updated_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
      // Remove the unique constraint to allow multiple logs per status_id
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Drop status_logs table
  const hasStatusLogsTable = await knex.schema.hasTable('status_logs');
  if (hasStatusLogsTable) {
    await knex.schema.dropTable('status_logs');
  }
};