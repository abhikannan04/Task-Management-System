-- Database: psm_db

-- DROP DATABASE psm_db;

--CREATE SEQUENCE projects_id_seq;
--ALTER TABLE projects 
--ALTER COLUMN id SET DEFAULT nextval('projects_id_seq');
--SELECT setval('projects_id_seq', COALESCE(MAX(id), 1)) FROM projects;

--select table_name from information_schema.tables where table_schema = 'public';
-- ==============================================================
--  ADD SERIAL (auto-increment) TO THE "id" COLUMN OF EACH TABLE
--  (creates a sequence + sets default + syncs current max id)
-- ==============================================================

--DO $$
--DECLARE
    --tbl TEXT;
    --seq TEXT;
  --  max_id BIGINT;
--BEGIN
    --FOR tbl IN
       -- SELECT unnest(ARRAY[
         --   'migrations',
          --  'project_assignments',
            --'projects',
        --    'reports_logs',
          --  'daily_statuses',
        --    'users',
       --     'status_logs'
       -- ])
   -- LOOP
        ----------------------------------------------------------------
        -- 1. Create a dedicated sequence (if it does not exist)
        ----------------------------------------------------------------
        --seq := tbl || '_id_seq';
        --EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I OWNED BY %I.id', seq, tbl);

        ----------------------------------------------------------------
        -- 2. Set the default for the id column
        ----------------------------------------------------------------
        --EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT nextval(%L)', tbl, seq);

        ----------------------------------------------------------------
        -- 3. Sync the sequence with the current maximum id (if any)
        ----------------------------------------------------------------
        --EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', tbl) INTO max_id;
      --  PERFORM setval(seq, GREATEST(max_id, 1), max_id IS NOT NULL);
        
    --    RAISE NOTICE 'Applied SERIAL fix to table: %', tbl;
  --  END LOOP;
--END $$;