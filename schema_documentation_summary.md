# Project Status Management System - Database Schema Summary

## Overview
This document provides a high-level summary of the database schema for the Project Status Management System. The system tracks projects, employees, assignments, and daily status updates.

## Core Entities

### 1. Users
The system has three types of users:
- **Admins**: System administrators with full access
- **Managers**: Project managers who create projects and review status updates
- **Employees**: Team members who work on projects and submit daily statuses

Each user is identified by either an email or an employee code ([emp_code](file:///d:/BANAS_PROJECTS/PSM_PROJECT/backend/migrations/20250930000001_add_emp_code_to_users.js#L7-L7)).

### 2. Projects
Projects represent the work being tracked in the system. Each project has:
- Basic information (name, description, dates)
- Status tracking (planning, active, completed, etc.)
- Progress metrics (percentage, hours, milestones)
- Organizational data (OSTA/FSTA numbers, department info)
- Document storage (PRD files)

### 3. Project Assignments
This table creates many-to-many relationships between employees and projects, allowing:
- Multiple employees to work on the same project
- Each employee to work on multiple projects
- Tracking of assignment history and active status

### 4. Daily Statuses
Employees submit daily status updates for their assigned projects. Each status includes:
- Work description and hours
- Progress percentage
- File attachments
- Review workflow (pending, approved, rejected)
- Action plan tracking

### 5. Reports and Logs
The system tracks:
- Generated reports for audit purposes
- Status change history for accountability

## Key Features

### Status Workflow
1. Employees submit daily statuses
2. Managers review and approve/reject statuses
3. All status changes are logged
4. Action plans can be tracked through different statuses

### Project Lifecycle
Projects progress through several statuses:
1. **Planning**: Initial phase
2. **Pending Approval**: Awaiting manager approval
3. **Active**: In progress
4. **Delayed**: Past due date but not completed
5. **Ongoing Completion**: In final stages
6. **Completed**: Finished

### Document Management
The system supports storing documents:
- PRD (Product Requirements Document) files attached to projects
- General attachments on daily status updates
- Both metadata and binary content storage

### Organizational Tracking
Projects include fields for:
- OSTA (Organizational STAndard) numbers and names
- FSTA (Functional STAndard) names
- Department codes and names

## Relationships Summary

```
users (1) ←→ (M) projects (created_by)
users (1) ←→ (M) project_assignments (employee_id)
users (1) ←→ (M) project_assignments (assigned_by)
projects (1) ←→ (M) project_assignments
users (1) ←→ (M) daily_statuses (employee_id)
projects (1) ←→ (M) daily_statuses
users (1) ←→ (M) daily_statuses (reviewed_by)
users (1) ←→ (M) reports_logs
daily_statuses (1) ←→ (M) status_change_logs
users (1) ←→ (M) status_change_logs (changed_by)
```

## Data Integrity Features

1. **Foreign Key Constraints**: All relationships are enforced at the database level
2. **Enumerated Types**: Controlled values for status fields
3. **Unique Constraints**: 
   - User emails and employee codes
   - Project-employee assignments
4. **Soft Deletes**: Records are marked as deleted rather than removed
5. **Audit Trail**: Status changes are automatically logged
6. **Timestamps**: All records track creation and modification times

## Files Generated

This schema documentation is available in multiple formats:
1. `complete_database_schema.md` - Detailed markdown documentation
2. `database_schema.sql` - SQL file with table definitions and sample data
3. `schema_documentation_summary.md` - This summary document

These files provide a complete picture of the database structure as of the latest migrations in the system.