import db from './db.js';

const seed = async () => {
  try {
    await db.seed.run();
    console.log('Seeding completed successfully');
    await db.destroy();
  } catch (error) {
    console.error('Seeding failed:', error);
    await db.destroy();
    process.exit(1);
  }
};

seed();