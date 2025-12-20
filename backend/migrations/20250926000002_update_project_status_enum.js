export const up = function(knex) {
  return knex.raw(`
    -- First, drop the existing constraint if it exists
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
    
    -- Remove default value
    ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;
    
    -- Convert existing data to text temporarily
    ALTER TABLE projects ALTER COLUMN status TYPE TEXT;
    
    -- Drop the existing enum type if it exists
    DROP TYPE IF EXISTS project_status;
    
    -- Create the new enum type with all required statuses
    CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived', 'Ongoing_completion', 'pending_approval', 'delayed');
    
    -- Update existing data: convert 'planning' to 'active'
    UPDATE projects SET status = 'active' WHERE status = 'planning';
    
    -- Convert the column back to enum type
    ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::project_status;
    
    -- Set default value
    ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active';
  `);
};

export const down = function(knex) {
  return knex.raw(`
    -- First, drop the existing constraint
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
    
    -- Remove default value
    ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;
    
    -- Convert existing data to text temporarily
    ALTER TABLE projects ALTER COLUMN status TYPE TEXT;
    
    -- Drop the existing enum type
    DROP TYPE IF EXISTS project_status;
    
    -- Create the old enum type
    CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');
    
    -- Convert the column back to enum type
    ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::project_status;
    
    -- Set default value
    ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active';
    
    -- Update any rows with new statuses to 'active'
    UPDATE projects SET status = 'active' WHERE status IN ('Ongoing_completion', 'pending_approval', 'delayed');
  `);
};