import db from './db.js';

async function fixSequence() {
  try {
    // Get the current max ID from users table
    const result = await db.raw("SELECT MAX(id) as max_id FROM users");
    const maxId = result.rows[0].max_id || 0;
    
    console.log(`Current max ID in users table: ${maxId}`);
    
    // Reset the auto-increment sequence
    await db.raw(`SELECT setval(pg_get_serial_sequence('users', 'id'), ${maxId})`);
    
    console.log('Auto-increment sequence for users table has been fixed');
  } catch (error) {
    console.error('Error fixing sequence:', error);
  } finally {
    await db.destroy();
  }
}

fixSequence();