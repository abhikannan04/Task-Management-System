export const up = async function(knex) {
  // This migration was intended to add a special admin user
  // Since this may have been run manually or is not needed, we'll just return
  return;
};

export const down = async function(knex) {
  // No down migration needed
  return;
};