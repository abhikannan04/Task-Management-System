/**
 * Migration to update PRD file URLs to use project IDs instead of project names
 * Timestamp: 20251001100000 (October 1, 2025, 10:00:00)
 */
export function up(knex) {
  return knex('projects')
    .whereNotNull('prd_file')
    .then(projects => {
      const updates = projects.map(project => {
        try {
          // Parse the prd_file JSON
          const prdFile = typeof project.prd_file === 'string' 
            ? JSON.parse(project.prd_file) 
            : project.prd_file;
          
          // Update the URL to use project ID instead of project name
          if (prdFile && prdFile.url) {
            prdFile.url = `http://localhost:${process.env.PORT || 3002}/api/uploads/prd/${project.id}`;
            
            // Update the project with the new PRD file data
            return knex('projects')
              .where('id', project.id)
              .update({
                prd_file: JSON.stringify(prdFile),
                updated_at: knex.fn.now()
              });
          }
        } catch (error) {
          console.error(`Error updating PRD URL for project ${project.id}:`, error);
          return Promise.resolve();
        }
      });
      
      return Promise.all(updates);
    });
}

export function down(knex) {
  // No rollback needed - old URLs would still work if we revert the route changes
  return Promise.resolve();
}