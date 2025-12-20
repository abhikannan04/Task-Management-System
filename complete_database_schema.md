# Complete Database Schema Documentation

## Overview
This document provides a comprehensive overview of the database schema for the Project Status Management System. It includes all tables, columns, data types, constraints, and relationships as of the latest migration.

## Tables

### 1. users
Stores information about all system users (admins, managers, employees).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY, auto-increment | Unique identifier for each user |
| email | character varying(100) | NULLABLE, UNIQUE | Email address (can be null since emp_code is used) |
| password | character varying(255) | NOT NULL | Hashed password for authentication |
| role | text | NOT NULL, ENUM ['admin', 'manager', 'employee'] | User role in the system |
| name | character varying(100) | NOT NULL | Full name of the user |
| is_active | boolean | DEFAULT true | Whether the user account is active |
| created_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the user record was created |
| updated_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the user record was last updated |
| emp_code | character varying(50) | UNIQUE | Employee code (unique identifier for employees) |
| dept_code | character varying(50) | NULLABLE | Department code |

### 2. projects
Stores information about projects in the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY, auto-increment | Unique identifier for each project |
| name | character varying(255) | NOT NULL | Name of the project |
| description | text | NULLABLE | Detailed description of the project |
| created_by | integer | NOT NULL, FOREIGN KEY to users(id) | ID of the user who created the project |
| start_date | date | NULLABLE | Project start date |
| end_date | date | NULLABLE | Project end date |
| status | project_status | NULLABLE, ENUM ['planning', 'active', 'completed', 'ongoing_completion', 'pending_approval', 'delayed'] | Current status of the project |
| is_deleted | boolean | DEFAULT false | Soft delete flag |
| created_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the project record was created |
| updated_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the project record was last updated |
| progress_percentage | integer | DEFAULT 0 | Overall progress percentage of the project |
| total_hours_logged | integer | DEFAULT 0 | Total hours logged against the project |
| total_milestones | integer | DEFAULT 0 | Total number of milestones for the project |
| completed_milestones | integer | DEFAULT 0 | Number of completed milestones |
| completion_comments | text | NULLABLE | Comments on project completion |
| rejection_reason | text | NULLABLE | Reason for project rejection (if applicable) |
| prd_file | jsonb | NULLABLE | PRD (Product Requirements Document) file metadata |
| prd_file_content | bytea | NULLABLE | Binary content of the PRD file |
| osta_no | integer | NULLABLE | OSTA number |
| osta_name | character varying(255) | NULLABLE | OSTA name |
| dept_code | character varying(50) | DEFAULT '12' | Department code |
| department | character varying(255) | DEFAULT 'Systems' | Department name |
| fsta_name | character varying(255) | NULLABLE | FSTA name |

### 3. project_assignments
Tracks which employees are assigned to which projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY, auto-increment | Unique identifier for each assignment |
| project_id | integer | NOT NULL, FOREIGN KEY to projects(id) | ID of the project |
| employee_id | integer | NOT NULL, FOREIGN KEY to users(id) | ID of the employee assigned to the project |
| assigned_by | integer | NOT NULL, FOREIGN KEY to users(id) | ID of the user who made the assignment |
| assigned_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the assignment was made |
| is_active | boolean | DEFAULT true | Whether the assignment is currently active |

### 4. daily_statuses
Stores daily status updates submitted by employees for their assigned projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY, auto-increment | Unique identifier for each status update |
| employee_id | integer | NOT NULL, FOREIGN KEY to users(id) | ID of the employee submitting the status |
| project_id | integer | NOT NULL, FOREIGN KEY to projects(id) | ID of the project the status is for |
| date | date | NOT NULL | Date of the status update |
| status_text | text | NOT NULL | Description of work done |
| hours_worked | numeric(4,2) | NOT NULL | Number of hours worked (up to 99.99 hours) |
| progress_percentage | integer | NOT NULL | Progress percentage for the day |
| attachments | jsonb | DEFAULT '[]' | File attachments metadata |
| submitted_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the status was submitted |
| reviewed_by | integer | NULLABLE, FOREIGN KEY to users(id) | ID of the reviewer (manager) |
| review_status | text | DEFAULT 'pending', ENUM ['pending', 'approved', 'rejected'] | Status of the review |
| review_comments | text | NULLABLE | Comments from the reviewer |
| reviewed_at | timestamp with time zone | NULLABLE | When the status was reviewed |
| is_deleted | boolean | DEFAULT false | Soft delete flag |
| attachments_with_content | jsonb | NULLABLE | Attachments with embedded file content |
| mark_as_completed | boolean | DEFAULT false | Flag indicating if this status marks the project as completed |
| action_plan_status | text | DEFAULT 'started', ENUM ['started', 'in_progress', 'completed', 'under_approval', 'on_hold'] | Status of any action plan associated with this status |
| updated_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the status was last updated |

### 5. reports_logs
Tracks generated reports for audit purposes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY, auto-increment | Unique identifier for each report log |
| user_id | integer | NOT NULL, FOREIGN KEY to users(id) | ID of the user who generated the report |
| report_type | character varying(50) | NOT NULL | Type of report generated |
| filters | jsonb | DEFAULT '{}' | Filters used to generate the report |
| export_format | character varying(10) | NULLABLE | Format in which the report was exported |
| generated_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the report was generated |
| file_path | character varying | NULLABLE | Path to the generated report file |

### 6. status_logs
Tracks changes to daily status action plan statuses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | integer | PRIMARY KEY, auto-increment | Unique identifier for each log entry |
| status_id | integer | NOT NULL, FOREIGN KEY to daily_statuses(id) | ID of the status that was changed |
| previous_status | text | NOT NULL | Previous action plan status |
| new_status | text | NOT NULL | New action plan status |
| updated_by | integer | NOT NULL, FOREIGN KEY to users(id) | ID of the user who made the change |
| updated_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the change occurred |
| created_at | timestamp with time zone | DEFAULT CURRENT_TIMESTAMP | When the log entry was created |

## Relationships

1. **users** ←→ **projects** (1:M)
   - One user (creator) can create many projects
   - Each project is created by one user

2. **users** ←→ **project_assignments** (1:M)
   - One user can be assigned to many projects
   - Each project assignment refers to one employee user

3. **users** ←→ **project_assignments** (1:M)
   - One user can make many project assignments
   - Each project assignment is made by one user

4. **projects** ←→ **project_assignments** (1:M)
   - One project can have many assignments
   - Each assignment is for one project

5. **users** ←→ **daily_statuses** (1:M)
   - One employee can submit many daily statuses
   - Each daily status is submitted by one employee

6. **projects** ←→ **daily_statuses** (1:M)
   - One project can have many daily statuses
   - Each daily status is for one project

7. **users** ←→ **daily_statuses** (1:M)
   - One user (reviewer/manager) can review many daily statuses
   - Each daily status can be reviewed by one user

8. **users** ←→ **reports_logs** (1:M)
   - One user can generate many reports
   - Each report log is generated by one user

9. **daily_statuses** ←→ **status_logs** (1:M)
   - One daily status can have many status logs
   - Each status log refers to one daily status

10. **users** ←→ **status_logs** (1:M)
    - One user can make many status changes
    - Each status log is made by one user

## Enumerated Types

### project_status
Possible values: 'planning', 'active', 'completed', 'ongoing_completion', 'pending_approval', 'delayed'

### review_status
Possible values: 'pending', 'approved', 'rejected'

### action_plan_status
Possible values: 'started', 'in_progress', 'completed', 'under_approval', 'on_hold'

## Indexes

1. **users**
   - Primary Key: id
   - Unique: email
   - Unique: emp_code

2. **projects**
   - Primary Key: id
   - Foreign Key: created_by references users(id)

3. **project_assignments**
   - Primary Key: id
   - Foreign Keys: 
     - project_id references projects(id)
     - employee_id references users(id)
     - assigned_by references users(id)
   - Unique: (project_id, employee_id)

4. **daily_statuses**
   - Primary Key: id
   - Foreign Keys:
     - employee_id references users(id)
     - project_id references projects(id)
     - reviewed_by references users(id)

5. **reports_logs**
   - Primary Key: id
   - Foreign Key: user_id references users(id)

6. **status_logs**
   - Primary Key: id
   - Foreign Keys:
     - status_id references daily_statuses(id)
     - updated_by references users(id)

## Triggers

1. **update_daily_status_timestamp**
   - Automatically updates the [updated_at](file:///d:/BANAS_PROJECTS/PSM_PROJECT/backend/migrations/20251006100000_add_updated_at_to_daily_statuses.js#L18-L18) field in [daily_statuses](file:///d:/BANAS_PROJECTS/PSM_PROJECT/backend/migrations/20250924150000_create_tables.js#L58-L77) table whenever a row is updated.

2. **status_change_trigger**
   - Automatically logs changes to the [action_plan_status](file:///d:/BANAS_PROJECTS/PSM_PROJECT/backend/migrations/20251004000000_add_action_plan_status.js#L14-L16) column in [daily_statuses](file:///d:/BANAS_PROJECTS/PSM_PROJECT/backend/migrations/20250924150000_create_tables.js#L58-L77) table to the [status_logs](file:///d:/BANAS_PROJECTS/PSM_PROJECT/backend/migrations/20251006000000_add_status_logs_table.js#L15-L29) table.