/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    return knex.schema
        .createTable('action_plan_activities', function (table) {
            table.increments('id').primary();
            table.integer('daily_status_id').unsigned().notNullable()
                .references('id').inTable('daily_statuses').onDelete('CASCADE');
            table.text('description').notNullable();
            table.integer('progress_percentage').defaultTo(0);
            table.timestamps(true, true);
        })
        .createTable('action_plan_discussions', function (table) {
            table.increments('id').primary();
            table.integer('daily_status_id').unsigned().notNullable()
                .references('id').inTable('daily_statuses').onDelete('CASCADE');
            table.integer('user_id').unsigned().notNullable()
                .references('id').inTable('users').onDelete('CASCADE');
            table.text('message').notNullable();
            table.timestamps(true, true);
        });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    return knex.schema
        .dropTableIfExists('action_plan_discussions')
        .dropTableIfExists('action_plan_activities');
}
