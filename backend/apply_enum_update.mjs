import knex from 'knex';
import knexConfig from './knexfile.js';

const config = knexConfig;
const db = knex(config);

const up = async () => {
  return db.raw(`
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
    
    -- Update existing data: keep 'active' as is, update others if needed
    -- No updates needed for existing values since we're keeping 'active'
    
    -- Convert the column back to enum type
    ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::project_status;
    
    -- Set default value
    ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active';
  `);
};

try {
  await up();
  console.log('Enum update applied successfully');
} catch (error) {
  console.error('Error applying enum update:', error.message);
} finally {
  await db.destroy();
}
