export const seed = function(knex) {
  // Deletes ALL existing entries
  return knex('reports_logs').del()
    .then(() => knex('daily_statuses').del())
    .then(() => knex('project_assignments').del())
    .then(() => knex('projects').del())
    .then(() => knex('users').del())
    .then(() => {
      // Inserts seed entries
      return knex('users').insert([
        {
          id: 1,
          emp_code: 'EMP001',
          password: '$2b$10$8K1p/a0dURXAm7QiTRqNa.E3YPWs8UkrpC5/Rz9tMdiL5CRs13paW', // password: admin123
          role: 'admin',
          name: 'John Administrator',
          is_active: true,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 2,
          emp_code: 'EMP002',
          password: '$2b$10$8K1p/a0dURXAm7QiTRqNa.E3YPWs8UkrpC5/Rz9tMdiL5CRs13paW', // password: admin123
          role: 'manager',
          name: 'Sarah Manager',
          is_active: true,
          created_at: new Date('2024-01-02'),
          updated_at: new Date('2024-01-02')
        },
        {
          id: 3,
          emp_code: 'EMP003',
          password: '$2b$10$8K1p/a0dURXAm7QiTRqNa.E3YPWs8UkrpC5/Rz9tMdiL5CRs13paW', // password: admin123
          role: 'manager',
          name: 'Mike Manager',
          is_active: true,
          created_at: new Date('2024-01-03'),
          updated_at: new Date('2024-01-03')
        },
        {
          id: 4,
          emp_code: 'EMP004',
          password: '$2b$10$8K1p/a0dURXAm7QiTRqNa.E3YPWs8UkrpC5/Rz9tMdiL5CRs13paW', // password: admin123
          role: 'employee',
          name: 'Alice Employee',
          is_active: true,
          created_at: new Date('2024-01-04'),
          updated_at: new Date('2024-01-04')
        },
        {
          id: 5,
          emp_code: 'EMP005',
          password: '$2b$10$8K1p/a0dURXAm7QiTRqNa.E3YPWs8UkrpC5/Rz9tMdiL5CRs13paW', // password: admin123
          role: 'employee',
          name: 'Bob Employee',
          is_active: true,
          created_at: new Date('2024-01-05'),
          updated_at: new Date('2024-01-05')
        },
        {
          id: 6,
          emp_code: 'EMP006',
          password: '$2b$10$8K1p/a0dURXAm7QiTRqNa.E3YPWs8UkrpC5/Rz9tMdiL5CRs13paW', // password: admin123
          role: 'employee',
          name: 'Carol Employee',
          is_active: true,
          created_at: new Date('2024-01-06'),
          updated_at: new Date('2024-01-06')
        }
      ]);
    })
    .then(() => {
      // Reset the auto-increment sequence for users table
      return knex.raw("SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users))");
    })
    .then(() => {
      return knex('projects').insert([
        {
          id: 1,
          name: 'Website Redesign',
          description: 'Complete redesign of company website with modern UI/UX',
          created_by: 2,
          start_date: new Date('2024-01-15'),
          end_date: new Date('2024-06-30'),
          status: 'active',
          is_deleted: false,
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-10')
        },
        {
          id: 2,
          name: 'Mobile App Development',
          description: 'Development of cross-platform mobile application',
          created_by: 3,
          start_date: new Date('2024-02-01'),
          end_date: new Date('2024-08-31'),
          status: 'active',
          is_deleted: false,
          created_at: new Date('2024-01-20'),
          updated_at: new Date('2024-01-20')
        }
      ]);
    })
    .then(() => {
      // Reset the auto-increment sequence for projects table
      return knex.raw("SELECT setval(pg_get_serial_sequence('projects', 'id'), (SELECT MAX(id) FROM projects))");
    })
    .then(() => {
      return knex('project_assignments').insert([
        {
          id: 1,
          project_id: 1,
          employee_id: 4,
          assigned_by: 2,
          assigned_at: new Date('2024-01-12')
        },
        {
          id: 2,
          project_id: 1,
          employee_id: 5,
          assigned_by: 2,
          assigned_at: new Date('2024-01-12')
        },
        {
          id: 3,
          project_id: 2,
          employee_id: 5,
          assigned_by: 3,
          assigned_at: new Date('2024-01-22')
        },
        {
          id: 4,
          project_id: 2,
          employee_id: 6,
          assigned_by: 3,
          assigned_at: new Date('2024-01-22')
        }
      ]);
    })
    .then(() => {
      // Reset the auto-increment sequence for project_assignments table
      return knex.raw("SELECT setval(pg_get_serial_sequence('project_assignments', 'id'), (SELECT MAX(id) FROM project_assignments))");
    })
    .then(() => {
      return knex('daily_statuses').insert([
        {
          id: 1,
          employee_id: 4,
          project_id: 1,
          date: new Date('2024-01-15'),
          status_text: 'Completed initial design mockups for homepage',
          hours_worked: 8.0,
          progress_percentage: 20,
          attachments: [],
          submitted_at: new Date('2024-01-15'),
          review_status: 'approved',
          review_comments: 'Good work on the mockups',
          reviewed_by: 2,
          reviewed_at: new Date('2024-01-16')
        },
        {
          id: 2,
          employee_id: 5,
          project_id: 1,
          date: new Date('2024-01-15'),
          status_text: 'Set up development environment and started frontend framework',
          hours_worked: 7.5,
          progress_percentage: 15,
          attachments: [],
          submitted_at: new Date('2024-01-15'),
          review_status: 'approved',
          review_comments: 'Good progress',
          reviewed_by: 2,
          reviewed_at: new Date('2024-01-16')
        },
        {
          id: 3,
          employee_id: 5,
          project_id: 2,
          date: new Date('2024-01-23'),
          status_text: 'Created project structure and initial components',
          hours_worked: 8.0,
          progress_percentage: 10,
          attachments: [],
          submitted_at: new Date('2024-01-23'),
          review_status: 'approved'
        },
        {
          id: 4,
          employee_id: 6,
          project_id: 2,
          date: new Date('2024-01-23'),
          status_text: 'Designed database schema and API endpoints',
          hours_worked: 8.0,
          progress_percentage: 25,
          attachments: [],
          submitted_at: new Date('2024-01-23'),
          review_status: 'approved'
        },
        {
          id: 5,
          employee_id: 4,
          project_id: 1,
          date: new Date('2024-01-16'),
          status_text: 'Implemented responsive navigation and header',
          hours_worked: 8.0,
          progress_percentage: 35,
          attachments: [],
          submitted_at: new Date('2024-01-16'),
          review_status: 'approved'
        }
      ]);
    })
    .then(() => {
      // Reset the auto-increment sequence for daily_statuses table
      return knex.raw("SELECT setval(pg_get_serial_sequence('daily_statuses', 'id'), (SELECT MAX(id) FROM daily_statuses))");
    });
};