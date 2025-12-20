-- Complete Database Schema for Project Status Management System
-- Generated based on migration files and current table structures

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS status_logs CASCADE;
DROP TABLE IF EXISTS reports_logs CASCADE;
DROP TABLE IF EXISTS daily_statuses CASCADE;
DROP TABLE IF EXISTS project_assignments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    emp_code VARCHAR(50) UNIQUE,
    dept_code VARCHAR(50)
);

-- Create projects table
CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'ongoing_completion', 'pending_approval', 'delayed');

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    status project_status,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    progress_percentage INTEGER DEFAULT 0,
    total_hours_logged INTEGER DEFAULT 0,
    total_milestones INTEGER DEFAULT 0,
    completed_milestones INTEGER DEFAULT 0,
    completion_comments TEXT,
    rejection_reason TEXT,
    prd_file JSONB,
    prd_file_content BYTEA,
    osta_no INTEGER,
    osta_name VARCHAR(255),
    dept_code VARCHAR(50) DEFAULT '12',
    department VARCHAR(255) DEFAULT 'Systems',
    fsta_name VARCHAR(255),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create project_assignments table
CREATE TABLE project_assignments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    assigned_by INTEGER NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE (project_id, employee_id)
);

-- Create daily_statuses table
CREATE TABLE daily_statuses (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status_text TEXT NOT NULL,
    hours_worked NUMERIC(4,2) NOT NULL,
    progress_percentage INTEGER NOT NULL,
    attachments JSONB DEFAULT '[]',
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER,
    review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    review_comments TEXT,
    reviewed_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    attachments_with_content JSONB,
    mark_as_completed BOOLEAN DEFAULT FALSE,
    action_plan_status TEXT DEFAULT 'started' CHECK (action_plan_status IN ('started', 'in_progress', 'completed', 'under_approval', 'on_hold')),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Create reports_logs table
CREATE TABLE reports_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    filters JSONB DEFAULT '{}',
    export_format VARCHAR(10),
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create status_logs table (for tracking action plan status changes)
CREATE TABLE status_logs (
    id SERIAL PRIMARY KEY,
    status_id INTEGER NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    updated_by INTEGER NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (status_id) REFERENCES daily_statuses(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_emp_code ON users(emp_code);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_employee_id ON project_assignments(employee_id);
CREATE INDEX idx_project_assignments_assigned_by ON project_assignments(assigned_by);
CREATE INDEX idx_daily_statuses_employee_id ON daily_statuses(employee_id);
CREATE INDEX idx_daily_statuses_project_id ON daily_statuses(project_id);
CREATE INDEX idx_daily_statuses_date ON daily_statuses(date);
CREATE INDEX idx_daily_statuses_review_status ON daily_statuses(review_status);
CREATE INDEX idx_daily_statuses_submitted_at ON daily_statuses(submitted_at);
CREATE INDEX idx_reports_logs_user_id ON reports_logs(user_id);
CREATE INDEX idx_status_logs_status_id ON status_logs(status_id);
CREATE INDEX idx_status_logs_updated_by ON status_logs(updated_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for daily_statuses updated_at
CREATE TRIGGER update_daily_status_timestamp 
    BEFORE UPDATE ON daily_statuses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to log action plan status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log changes to action_plan_status
    IF OLD.action_plan_status IS DISTINCT FROM NEW.action_plan_status THEN
        INSERT INTO status_logs (status_id, previous_status, new_status, updated_by, updated_at)
        VALUES (NEW.id, OLD.action_plan_status, NEW.action_plan_status, COALESCE(NEW.reviewed_by, NEW.employee_id), NOW());
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to log action plan status changes
CREATE TRIGGER status_change_trigger
    AFTER UPDATE OF action_plan_status ON daily_statuses
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();

-- Insert sample data for testing
INSERT INTO users (email, password, role, name, emp_code) VALUES 
('admin@example.com', '$2b$10$example_hash', 'admin', 'System Administrator', 'EMP001'),
('manager@example.com', '$2b$10$example_hash', 'manager', 'Project Manager', 'EMP002'),
('employee1@example.com', '$2b$10$example_hash', 'employee', 'Employee One', 'EMP003'),
('employee2@example.com', '$2b$10$example_hash', 'employee', 'Employee Two', 'EMP004');

INSERT INTO projects (name, description, created_by, start_date, end_date, status) VALUES 
('Project Alpha', 'First project for client', 2, '2025-10-01', '2025-12-31', 'active'),
('Project Beta', 'Second project for client', 2, '2025-11-01', '2026-02-28', 'planning');

INSERT INTO project_assignments (project_id, employee_id, assigned_by) VALUES 
(1, 3, 2),
(1, 4, 2),
(2, 3, 2);

INSERT INTO daily_statuses (employee_id, project_id, date, status_text, hours_worked, progress_percentage) VALUES 
(3, 1, '2025-10-15', 'Completed initial design work', 8.00, 10),
(4, 1, '2025-10-15', 'Set up development environment', 8.00, 5);