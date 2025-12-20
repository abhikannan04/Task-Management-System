import knex from 'knex';
import knexfile from './knexfile.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.error('Please check your .env file');
  process.exit(1);
}

if (!process.env.DB_PASSWORD) {
  console.error('DB_PASSWORD cannot be empty. PostgreSQL 10+ requires a non-empty password for SCRAM authentication.');
  process.exit(1);
}

const db = knex(knexfile);

export default db;
