
export const up = function (knex) {
    return knex.schema.table('project_assignments', function (table) {
        table.timestamp('last_viewed_at').defaultTo(knex.fn.now());
    });
};

export const down = function (knex) {
    return knex.schema.table('project_assignments', function (table) {
        table.dropColumn('last_viewed_at');
    });
};
