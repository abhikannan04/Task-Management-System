/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.raw('ALTER TYPE project_status RENAME TO project_status_old');
  await knex.schema.raw("CREATE TYPE project_status AS ENUM ('active', 'completed')");
  await knex.schema.raw('ALTER TABLE projects ALTER COLUMN status DROP DEFAULT');
  await knex.schema.raw(`
    ALTER TABLE projects
    ALTER COLUMN status TYPE project_status
    USING status::text::project_status
  `);
  await knex.schema.raw("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active'");
  await knex.schema.raw('DROP TYPE project_status_old');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Revert to the previous broader set of statuses if needed
  await knex.schema.raw('ALTER TYPE project_status RENAME TO project_status_simplified');
  await knex.schema.raw("CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'archived', 'Ongoing_completion', 'pending_approval', 'delayed')");
  await knex.schema.raw(`
    ALTER TABLE projects
    ALTER COLUMN status TYPE project_status
    USING status::text::project_status
  `);
  await knex.schema.raw('DROP TYPE project_status_simplified');
};
