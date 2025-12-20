import db from './db.js';

async function checkTableStructure() {
  try {
    // Check if the action_plan_status column exists
    const actionPlanStatusColumn = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'daily_statuses' 
      AND column_name = 'action_plan_status'
    `);
    
    if (actionPlanStatusColumn.rows.length > 0) {
      console.log('Column action_plan_status exists:', actionPlanStatusColumn.rows[0]);
    } else {
      console.log('Column action_plan_status does not exist');
    }
    
    // Check if the attachments_with_content column exists
    const attachmentsColumn = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'daily_statuses' 
      AND column_name = 'attachments_with_content'
    `);
    
    if (attachmentsColumn.rows.length > 0) {
      console.log('Column attachments_with_content exists:', attachmentsColumn.rows[0]);
    } else {
      console.log('Column attachments_with_content does not exist');
    }
    
    // Get all columns for daily_statuses table
    const allColumns = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'daily_statuses'
      ORDER BY ordinal_position
    `);
    
    console.log('All columns in daily_statuses table:');
    allColumns.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
  } catch (error) {
    console.error('Error checking table structure:', error);
  } finally {
    await db.destroy();
  }
}

checkTableStructure();