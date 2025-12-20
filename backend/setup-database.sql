-- Database setup script for PostgreSQL
-- Run these commands in your PostgreSQL console or using psql

-- 1. Create the database
CREATE DATABASE psm_db;

-- 2. Connect to the database
\c psm_db

-- 3. Set a password for the postgres user (if not already set)
ALTER USER postgres PASSWORD 'your_actual_password_here';

-- 4. Verify the setup
SELECT current_database();
SELECT current_user;

-- Note: After running this script, update your backend/.env file with the same password