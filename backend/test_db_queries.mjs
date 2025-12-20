import db from './db.js';

async function testDbQueries() {
  try {
    console.log('Testing database queries for OSTA/FSTA data...\n');
    
    // Test OSTA query
    console.log('1. Testing OSTA query:');
    const uniqueOstaNames = await db('projects')
      .whereNotNull('osta_name')
      .andWhere('osta_name', '!=', '')
      .andWhereRaw("TRIM(osta_name) != ''")
      .andWhereNot('osta_name', 'Check')
      .andWhereNot('osta_name', 'Test')
      .andWhereNot('osta_name', 'N/A')
      .andWhereNot('osta_name', 'None')
      .distinct('osta_name')
      .orderBy('osta_name')
      .pluck('osta_name');
    
    console.log('Unique OSTA names found:', uniqueOstaNames);
    
    // Test FSTA query
    console.log('\n2. Testing FSTA query:');
    const uniqueFstaNames = await db('projects')
      .whereNotNull('fsta_name')
      .andWhere('fsta_name', '!=', '')
      .andWhereRaw("TRIM(fsta_name) != ''")
      .andWhereNot('fsta_name', 'Check')
      .andWhereNot('fsta_name', 'Test')
      .andWhereNot('fsta_name', 'N/A')
      .andWhereNot('fsta_name', 'None')
      .distinct('fsta_name')
      .orderBy('fsta_name')
      .pluck('fsta_name');
    
    console.log('Unique FSTA names found:', uniqueFstaNames);
    
    // Test data transformation
    console.log('\n3. Testing data transformation:');
    const ostaData = uniqueOstaNames.map((name, index) => ({
      id: index + 1,
      name: name.trim()
    })).filter(item => item.name.length > 0);
    
    console.log('Transformed OSTA data:', ostaData);
    
    const fstaData = uniqueFstaNames.map((name, index) => ({
      id: index + 1,
      name: name.trim()
    })).filter(item => item.name.length > 0);
    
    console.log('Transformed FSTA data:', fstaData);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during database query tests:', error);
  } finally {
    await db.destroy();
  }
}

testDbQueries();