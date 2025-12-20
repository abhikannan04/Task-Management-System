export const up = async function(knex) {
  // Make email nullable since we'll be using emp_code
  await knex.schema.table('users', function(table) {
    table.string('email', 100).nullable().alter();
  });
};

export const down = async function(knex) {
  // Make email not nullable again
  await knex.schema.table('users', function(table) {
    table.string('email', 100).notNullable().alter();
  });
};