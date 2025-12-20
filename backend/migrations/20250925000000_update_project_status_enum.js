export const up = function(knex) {
  return knex.raw(`
    -- First, drop the existing constraint
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
    
    -- Remove default value
    ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;
    
    -- Convert existing data to text temporarily
    ALTER TABLE projects ALTER COLUMN status TYPE TEXT;
    
    -- Drop the existing enum type if it exists
    DROP TYPE IF EXISTS project_status;
    
    -- Create the new enum type
    CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'on-hold', 'Ongoing_completion', 'pending_approval', 'delayed');
    
    -- Update existing data: keep 'active' as is, update others as needed
    UPDATE projects SET status = 'planning' WHERE status NOT IN ('active', 'completed', 'on-hold', 'Ongoing_completion', 'pending_approval', 'delayed');
    
    -- Convert the column back to enum type
    ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::project_status;
    
    -- Set default value
    ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'planning';
  `);
};

export const down = function(knex) {
  return knex.raw(`
    -- First, drop the existing constraint
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
    
    -- Remove default value
    ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;
    
    -- Then, update the enum type
    DROP TYPE IF EXISTS project_status;
    CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');
    
    -- Finally, alter the column to use the new enum type
    ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::text::project_status;
    
    -- Set default value
    ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active';
    
    -- Update any rows with new statuses to 'active'
    UPDATE projects SET status = 'active' WHERE status IN ('planning', 'active', 'on-hold', 'Ongoing_completion', 'pending_approval', 'delayed');
  `);
};
