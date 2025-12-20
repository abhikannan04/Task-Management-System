import knex from 'knex';
import knexConfig from './knexfile.js';

const config = knexConfig;
const db = knex(config);

try {
  const result = await db.raw("SELECT unnest(enum_range(NULL::project_status)) AS enum_value;");
  console.log('Current project_status enum values:', result.rows.map(row => row.enum_value));
} catch (error) {
  console.error('Error querying enum:', error.message);
  try {
    const colResult = await db.raw("SELECT data_type FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'status';");
    console.log('Status column type:', colResult.rows[0] ? colResult.rows[0].data_type : 'Unknown');
  } catch (colError) {
    console.error('Error querying column:', colError.message);
  }
} finally {
  await db.destroy();
}
