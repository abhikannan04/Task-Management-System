/**
 * Migration to add OSTA and FSTA fields to projects table
 * Timestamp: 20251001100001 (October 1, 2025, 10:00:01)
 */
export async function up(knex) {
  // Check if columns exist before adding them
  const columns = await knex('information_schema.columns')
    .where('table_name', 'projects')
    .pluck('column_name');
  
  return knex.schema.table('projects', function(table) {
    if (!columns.includes('osta_no')) {
      table.integer('osta_no').unsigned();
    }
    if (!columns.includes('osta_name')) {
      table.string('osta_name', 255);
    }
    if (!columns.includes('dept_code')) {
      table.string('dept_code', 50).defaultTo('12');
    }
    if (!columns.includes('department')) {
      table.string('department', 255).defaultTo('Systems');
    }
    if (!columns.includes('fsta_name')) {
      table.string('fsta_name', 255);
    }
  });
}

export async function down(knex) {
  // Check if columns exist before dropping them
  const columns = await knex('information_schema.columns')
    .where('table_name', 'projects')
    .pluck('column_name');
  
  return knex.schema.table('projects', function(table) {
    if (columns.includes('osta_no')) {
      table.dropColumn('osta_no');
    }
    if (columns.includes('osta_name')) {
      table.dropColumn('osta_name');
    }
    if (columns.includes('dept_code')) {
      table.dropColumn('dept_code');
    }
    if (columns.includes('department')) {
      table.dropColumn('department');
    }
    if (columns.includes('fsta_name')) {
      table.dropColumn('fsta_name');
    }
  });
}