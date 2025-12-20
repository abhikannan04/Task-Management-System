const db = require('./db.js');

async function checkStatusColumn() {
  try {
    const result = await db.raw(`
      SELECT column_name, column_default, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'status'
    `);
    console.log('Status column info:', result.rows);
  } catch (error) {
    console.error('Error querying status column:', error);
  } finally {
    await db.destroy();
  }
}

checkStatusColumn();
