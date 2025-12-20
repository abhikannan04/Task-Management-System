/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    return knex.schema.table('action_plan_activities', function (table) {
        table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    return knex.schema.table('action_plan_activities', function (table) {
        table.dropColumn('created_by');
    });
}
