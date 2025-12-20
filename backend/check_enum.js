const knex = require('knex')(require('./knexfile').development);

knex.raw("SELECT unnest(enum_range(NULL::project_status)) AS enum_value;")
  .then((result) => {
    console.log('Current project_status enum values:', result.rows.map(row => row.enum_value));
  })
  .catch((error) => {
    console.error('Error querying enum:', error);
    // If enum doesn't exist, try to describe the column
    knex.raw("SELECT data_type FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'status';")
      .then((colResult) => {
        console.log('Status column type:', colResult.rows[0] ? colResult.rows[0].data_type : 'Unknown');
      })
      .catch((colError) => console.error('Error querying column:', colError));
  })
  .finally(() => {
    knex.destroy();
  });
