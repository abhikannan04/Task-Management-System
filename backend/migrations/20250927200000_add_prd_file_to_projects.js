/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // Add prd_file column to projects table to store PRD file information
  await knex.schema.table('projects', function (table) {
    table.jsonb('prd_file').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Remove prd_file column from projects table
  await knex.schema.table('projects', function (table) {
    table.dropColumn('prd_file');
  });
};