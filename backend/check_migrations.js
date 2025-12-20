const knex = require('knex')(require('./knexfile').development);

knex.migrate.status()
  .then((result) => {
    console.log('Migration status:', JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error('Error checking migration status:', error);
  })
  .finally(() => {
    knex.destroy();
  });
