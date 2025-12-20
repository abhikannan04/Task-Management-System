import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psm_db',
  },
  migrations: {
    directory: join(__dirname, 'migrations'),
    tableName: 'migrations',
  },
  seeds: {
    directory: join(__dirname, 'seeds'),
  },
  pool: {
    min: 2,
    max: 30
  }
};
