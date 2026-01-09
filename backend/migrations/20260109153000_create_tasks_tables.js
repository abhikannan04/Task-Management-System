/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable('tasks', function (table) {
            table.increments('id').primary();
            table.integer('project_id').unsigned().notNullable().references('id').inTable('projects').onDelete('CASCADE');
            table.integer('parent_id').unsigned().references('id').inTable('tasks').onDelete('CASCADE');
            table.string('title').notNullable();
            table.text('description');
            table.date('start_date');
            table.date('end_date');
            table.integer('duration').defaultTo(0).comment('Duration in hours');
            table.integer('progress').defaultTo(0);
            table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
            table.enum('status', ['todo', 'in_progress', 'review', 'done']).defaultTo('todo');
            table.timestamps(true, true);
        })
        .createTable('task_dependencies', function (table) {
            table.increments('id').primary();
            table.integer('predecessor_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE');
            table.integer('successor_id').unsigned().notNullable().references('id').inTable('tasks').onDelete('CASCADE');
            table.enum('type', ['FS', 'SS', 'FF', 'SF']).defaultTo('FS').comment('FS: Finish-to-Start, etc.');
            table.integer('lag').defaultTo(0).comment('Lag time in hours');
            table.timestamps(true, true);

            // Prevent circular or duplicate dependencies
            table.unique(['predecessor_id', 'successor_id']);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('task_dependencies')
        .dropTableIfExists('tasks');
};
