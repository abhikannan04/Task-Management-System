# Project Status Management (PSM) System

A comprehensive project management system with role-based access control, daily status reporting, and approval workflows.

## Features

- Role-based system (Admin, Manager, Employee)
- Authentication with JWT
- Project creation and management
- Employee assignment to projects
- Daily status submission with progress tracking
- Manager approval/rejection workflow
- Reporting and export functionality
- Email notifications
- PostgreSQL database integration

## Tech Stack

### Frontend
- React.js (latest)
- Tailwind CSS v3.4.7
- React Router
- react-hook-form + yup (validation)
- react-toastify (notifications)
- Recharts (data visualization)
- react-dropzone (file uploads)
- Axios (API calls)

### Backend
- Node.js (latest LTS)
- Express.js
- PostgreSQL with Knex.js
- JWT authentication
- bcrypt (password hashing)
- Nodemailer (email notifications)
- multer (file uploads)
- Joi (validation)
- helmet, cors, winston, express-rate-limit

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

1. **Database Setup**
   - Install PostgreSQL
   - Create a database named `psm_db`
   - Set a password for your PostgreSQL user (usually 'postgres')
   - Update the database credentials in `backend/.env`

2. **Environment Configuration**
   ```bash
   # Copy and update the .env file
   cp backend/.env.example backend/.env
   ```
   Then edit `backend/.env` with your actual database credentials:
   - DB_USER: Your PostgreSQL username (default is usually 'postgres')
   - DB_PASSWORD: Your PostgreSQL password (this must be set, not empty)
   
   **Important**: PostgreSQL 10+ uses SCRAM authentication by default, which requires a non-empty password.

3. **Install Dependencies**
   ```bash
   # On Unix/Linux/Mac:
   ./setup.sh
   
   # On Windows:
   setup.bat
   ```

4. **Run Migrations**
   ```bash
   npm run migrate
   ```

5. **Seed Initial Data**
   ```bash
   npm run seed
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

## Default Credentials

- **Admin**: admin@psm.com / admin123
- **Manager**: manager1@psm.com / admin123
- **Employee**: employee1@psm.com / admin123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Admin only)
- `POST /api/auth/forgot-password` - Password reset request
- `GET /api/auth/profile` - Get user profile

### Projects
- `POST /api/projects` - Create project (Admin/Manager)
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project (Admin/Manager)
- `DELETE /api/projects/:id` - Delete project (Admin/Manager)

### Assignments
- `POST /api/assignments` - Assign employee to project (Admin/Manager)
- `GET /api/assignments/project/:project_id` - Get project assignments
- `GET /api/assignments/employee/:employee_id` - Get employee projects
- `DELETE /api/assignments/:id` - Unassign employee (Admin/Manager)

### Status
- `POST /api/status` - Submit daily status (Employee)
- `GET /api/status/pending` - Get pending statuses (Manager/Admin)
- `PUT /api/status/:id/review` - Review status (Manager/Admin)
- `GET /api/status/employee/:employee_id/:project_id` - Get employee status history

### Reports
- `POST /api/reports/generate` - Generate report
- `GET /api/reports/logs` - Get report generation logs

## Project Structure

```
.
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── migrations/
│   ├── models/
│   ├── routes/
│   ├── seeds/
│   ├── utils/
│   ├── db.js
│   ├── server.js
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── contexts/
    │   ├── pages/
    │   ├── services/
    │   ├── utils/
    │   ├── App.jsx
    │   └── main.jsx
    └── ...
```

## Development

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

## Production

```bash
npm start
```

This will start both the backend and frontend servers concurrently.

## Troubleshooting

### PostgreSQL Connection Issues

If you encounter the error "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string":

1. Make sure your PostgreSQL user has a password set:
   ```sql
   ALTER USER postgres PASSWORD 'your_password';
   ```

2. Ensure the password in `backend/.env` matches exactly

3. If using PostgreSQL 10+, the password cannot be empty due to SCRAM authentication

### Database Creation

To create the database and set the password:

1. Connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```

2. Create the database:
   ```sql
   CREATE DATABASE psm_db;
   ```

3. Set a password for the postgres user:
   ```sql
   ALTER USER postgres PASSWORD 'your_actual_password';
   ```

4. Exit:
   ```sql
   \q
   ```