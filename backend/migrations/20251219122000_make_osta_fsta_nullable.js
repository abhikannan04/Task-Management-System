/**
 * Migration to make OSTA and FSTA fields nullable in projects table
 * Timestamp: 20251219122000
 */
export async function up(knex) {
    return knex.schema.alterTable('projects', function (table) {
        table.integer('osta_no').nullable().alter();
        table.string('osta_name', 255).nullable().alter();
        table.string('fsta_name', 255).nullable().alter();
    });
}

export async function down(knex) {
    // We won't revert to notNullable because we don't know for sure if they were
    // intended to be strict, and it might fail if we introduced nulls.
    // This is a safe down migration (do nothing or assume they were nullable).
}
