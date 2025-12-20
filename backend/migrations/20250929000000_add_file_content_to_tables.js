/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // Add file_content column to projects table for PRD files
  await knex.schema.table('projects', function (table) {
    table.binary('prd_file_content').nullable();
  });
  
  // Modify attachments column in daily_statuses table to include file content
  // We'll keep the existing attachments column but add a new column for file contents
  await knex.schema.table('daily_statuses', function (table) {
    table.jsonb('attachments_with_content').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Remove file_content column from projects table
  await knex.schema.table('projects', function (table) {
    table.dropColumn('prd_file_content');
  });
  
  // Remove attachments_with_content column from daily_statuses table
  await knex.schema.table('daily_statuses', function (table) {
    table.dropColumn('attachments_with_content');
  });
};