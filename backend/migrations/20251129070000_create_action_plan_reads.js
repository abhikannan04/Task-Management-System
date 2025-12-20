
export const up = function (knex) {
    return knex.schema.createTable('action_plan_reads', function (table) {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.integer('action_plan_id').unsigned().notNullable().references('id').inTable('daily_statuses').onDelete('CASCADE');
        table.timestamp('last_read_at').defaultTo(knex.fn.now());
        table.unique(['user_id', 'action_plan_id']);
    });
};

export const down = function (knex) {
    return knex.schema.dropTable('action_plan_reads');
};
