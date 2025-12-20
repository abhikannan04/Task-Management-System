import db from './db.js';

const migrate = async () => {
  try {
    await db.migrate.latest();
    console.log('Migrations completed successfully');
    await db.destroy();
  } catch (error) {
    console.error('Migration failed:', error);
    await db.destroy();
    process.exit(1);
  }
};

migrate();