/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // Create a function to automatically log status changes
  await knex.raw(`
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
    $$ LANGUAGE plpgsql;
  `);
  
  // Create trigger to automatically log status changes
  await knex.raw(`
    CREATE TRIGGER status_change_trigger
    AFTER UPDATE OF action_plan_status ON daily_statuses
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Drop the trigger
  await knex.raw('DROP TRIGGER IF EXISTS status_change_trigger ON daily_statuses;');
  
  // Drop the function
  await knex.raw('DROP FUNCTION IF EXISTS log_status_change();');
};