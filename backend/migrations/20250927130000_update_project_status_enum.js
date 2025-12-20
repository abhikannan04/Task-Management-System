/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // Drop default constraint if exists
  await knex.schema.raw('ALTER TABLE projects ALTER COLUMN status DROP DEFAULT');
  
  // Rename current enum to old
  await knex.schema.raw('ALTER TYPE project_status RENAME TO project_status_old_backup');
  
  // Create new enum with required statuses
  await knex.schema.raw("CREATE TYPE project_status AS ENUM ('planning', 'active', 'ongoing_completion', 'pending_approval', 'completed')");
  
  // Alter column to use new type
  await knex.schema.raw(`
    ALTER TABLE projects
    ALTER COLUMN status TYPE project_status
    USING COALESCE(NULLIF(status::text, ''), 'planning')::project_status
  `);
  
  // Set new default
  await knex.schema.raw("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'planning'");
  
  // Drop old type
  await knex.schema.raw('DROP TYPE IF EXISTS project_status_old_backup');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Drop default
  await knex.schema.raw('ALTER TABLE projects ALTER COLUMN status DROP DEFAULT');
  
  // Rename current to expanded
  await knex.schema.raw('ALTER TYPE project_status RENAME TO project_status_expanded');
  
  // Recreate simplified enum
  await knex.schema.raw("CREATE TYPE project_status AS ENUM ('active', 'completed')");
  
  // Alter column back
  await knex.schema.raw(`
    ALTER TABLE projects
    ALTER COLUMN status TYPE project_status
    USING status::text::project_status
  `);
  
  // Set default back to 'active'
  await knex.schema.raw("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active'");
  
  // Drop expanded
  await knex.schema.raw('DROP TYPE project_status_expanded');
};
