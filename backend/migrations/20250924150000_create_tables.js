export const up = async function(knex) {
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) {
    await knex.schema.createTable('users', function(table) {
      table.increments('id').primary();
      table.string('email', 100).notNullable().unique();
      table.string('password', 255).notNullable();
      table.enu('role', ['admin', 'manager', 'employee']).notNullable();
      table.string('name', 100).notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  const hasProjects = await knex.schema.hasTable('projects');
  if (!hasProjects) {
    await knex.schema.createTable('projects', function(table) {
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.text('description');
      table.integer('created_by').unsigned().notNullable();
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.enu('status', ['planning ' ,'active', 'completed', 'ongoing_completion', 'pending_approval', 'delayed']).defaultTo('active');
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.foreign('created_by').references('users.id');
    });
  }

  const hasProjectAssignments = await knex.schema.hasTable('project_assignments');
  if (!hasProjectAssignments) {
    await knex.schema.createTable('project_assignments', function(table) {
      table.increments('id').primary();
      table.integer('project_id').unsigned().notNullable();
      table.integer('employee_id').unsigned().notNullable();
      table.integer('assigned_by').unsigned().notNullable();
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
      table.boolean('is_active').defaultTo(true);
      
      table.foreign('project_id').references('projects.id');
      table.foreign('employee_id').references('users.id');
      table.foreign('assigned_by').references('users.id');
      
      table.unique(['project_id', 'employee_id']);
    });
  }

  const hasDailyStatuses = await knex.schema.hasTable('daily_statuses');
  if (!hasDailyStatuses) {
    await knex.schema.createTable('daily_statuses', function(table) {
      table.increments('id').primary();
      table.integer('employee_id').unsigned().notNullable();
      table.integer('project_id').unsigned().notNullable();
      table.date('date').notNullable();
      table.text('status_text').notNullable();
      table.decimal('hours_worked', 4, 2).notNullable();
      table.integer('progress_percentage').notNullable();
      table.jsonb('attachments').defaultTo('[]');
      table.timestamp('submitted_at').defaultTo(knex.fn.now());
      table.integer('reviewed_by').unsigned();
      table.enu('review_status', ['pending', 'approved', 'rejected']).defaultTo('pending');
      table.text('review_comments');
      table.timestamp('reviewed_at');
      table.boolean('is_deleted').defaultTo(false);
      
      table.foreign('employee_id').references('users.id');
      table.foreign('project_id').references('projects.id');
      table.foreign('reviewed_by').references('users.id');
      
      table.unique(['employee_id', 'project_id', 'date']);
    });
  }

  const hasReportsLogs = await knex.schema.hasTable('reports_logs');
  if (!hasReportsLogs) {
    await knex.schema.createTable('reports_logs', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.string('report_type', 50).notNullable();
      table.jsonb('filters').defaultTo('{}');
      table.string('export_format', 10);
      table.timestamp('generated_at').defaultTo(knex.fn.now());
      table.string('file_path');
      
      table.foreign('user_id').references('users.id');
    });
  }
};

export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('reports_logs')
    .dropTableIfExists('daily_statuses')
    .dropTableIfExists('project_assignments')
    .dropTableIfExists('projects')
    .dropTableIfExists('users');
};