import db from './db.js';

async function checkOstaFstaFields() {
  try {
    // Check if the osta_name and fsta_name columns exist in projects table
    const columns = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND (column_name = 'osta_name' OR column_name = 'fsta_name')
    `);
    
    console.log('OSTA/FSTA related columns in projects table:');
    if (columns.rows.length > 0) {
      columns.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('No OSTA/FSTA columns found');
    }
    
    // Get sample data from projects table
    const sampleData = await db('projects')
      .whereNotNull('osta_name')
      .orWhereNotNull('fsta_name')
      .select('id', 'osta_name', 'fsta_name')
      .limit(5);
    
    console.log('\nSample projects with OSTA/FSTA data:');
    if (sampleData.length > 0) {
      sampleData.forEach(row => {
        console.log(`- ID: ${row.id}, OSTA: ${row.osta_name || 'null'}, FSTA: ${row.fsta_name || 'null'}`);
      });
    } else {
      console.log('No projects with OSTA/FSTA data found');
    }
    
    // Get unique OSTA names
    const uniqueOstaNames = await db('projects')
      .whereNotNull('osta_name')
      .andWhere('osta_name', '!=', '')
      .distinct('osta_name')
      .orderBy('osta_name')
      .pluck('osta_name');
    
    console.log('\nUnique OSTA names:');
    if (uniqueOstaNames.length > 0) {
      uniqueOstaNames.forEach(name => {
        console.log(`- ${name}`);
      });
    } else {
      console.log('No unique OSTA names found');
    }
    
    // Get unique FSTA names
    const uniqueFstaNames = await db('projects')
      .whereNotNull('fsta_name')
      .andWhere('fsta_name', '!=', '')
      .distinct('fsta_name')
      .orderBy('fsta_name')
      .pluck('fsta_name');
    
    console.log('\nUnique FSTA names:');
    if (uniqueFstaNames.length > 0) {
      uniqueFstaNames.forEach(name => {
        console.log(`- ${name}`);
      });
    } else {
      console.log('No unique FSTA names found');
    }
  } catch (error) {
    console.error('Error checking OSTA/FSTA fields:', error);
  } finally {
    await db.destroy();
  }
}

checkOstaFstaFields();