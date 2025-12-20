/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // Add delayed status to the project_status enum
  await knex.schema.raw('ALTER TYPE project_status RENAME TO project_status_old');
  await knex.schema.raw("CREATE TYPE project_status AS ENUM ('planning', 'active', 'pending_approval', 'delayed', 'completed')");
  await knex.schema.raw('ALTER TABLE projects ALTER COLUMN status DROP DEFAULT');
  await knex.schema.raw(`
    ALTER TABLE projects
    ALTER COLUMN status TYPE project_status
    USING CASE 
      WHEN status = 'planning' THEN 'planning'::text
      WHEN status = 'active' THEN 'active'::text
      WHEN status = 'pending_approval' THEN 'pending_approval'::text
      WHEN status = 'completed' THEN 'completed'::text
      ELSE 'planning'::text
    END::project_status
  `);
  await knex.schema.raw("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'planning'");
  await knex.schema.raw('DROP TYPE project_status_old');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Revert to the previous status set
  await knex.schema.raw('ALTER TYPE project_status RENAME TO project_status_with_delayed');
  await knex.schema.raw("CREATE TYPE project_status AS ENUM ('planning', 'active', 'pending_approval', 'completed')");
  await knex.schema.raw('ALTER TABLE projects ALTER COLUMN status DROP DEFAULT');
  await knex.schema.raw(`
    ALTER TABLE projects
    ALTER COLUMN status TYPE project_status
    USING CASE 
      WHEN status = 'planning' THEN 'planning'::text
      WHEN status = 'active' THEN 'active'::text
      WHEN status = 'pending_approval' THEN 'pending_approval'::text
      WHEN status = 'delayed' THEN 'active'::text
      WHEN status = 'completed' THEN 'completed'::text
      ELSE 'planning'::text
    END::project_status
  `);
  await knex.schema.raw("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'planning'");
  await knex.schema.raw('DROP TYPE project_status_with_delayed');
};