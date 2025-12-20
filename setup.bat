@echo off
REM PSM Setup Script for Windows

echo Setting up Project Status Management System...

echo 1. Database Setup Instructions:
echo    - Make sure PostgreSQL is installed and running
echo    - Set a password for your PostgreSQL user (usually 'postgres')
echo    - Run the following SQL commands in your PostgreSQL console:
echo      CREATE DATABASE psm_db;
echo      ALTER USER postgres PASSWORD 'your_actual_password_here';
echo    - Update backend/.env with your actual database credentials

echo 2. Installing backend dependencies...
cd backend
npm install

echo 3. Installing frontend dependencies...
cd ../frontend
npm install

echo 4. Returning to root directory...
cd ..

echo Setup complete!
echo.
echo To run the application:
echo 1. Update backend/.env with your database credentials
echo    - Make sure to set DB_USER and DB_PASSWORD correctly
echo    - DB_PASSWORD must not be empty (PostgreSQL 10+ requirement)
echo 2. Run migrations: npm run migrate
echo 3. Seed data: npm run seed
echo 4. Start the application: npm run dev