/**
 * Migration to make project start_date and end_date nullable
 * Timestamp: 20251001000000 (October 1, 2025)
 */
export function up(knex) {
  return knex.schema.alterTable('projects', function(table) {
    table.date('start_date').nullable().alter();
    table.date('end_date').nullable().alter();
  });
}

export function down(knex) {
  return knex.schema.alterTable('projects', function(table) {
    table.date('start_date').notNullable().alter();
    table.date('end_date').notNullable().alter();
  });
}