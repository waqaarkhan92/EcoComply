-- Database Helper Functions for Testing and Development
-- These functions provide access to database metadata that PostgREST doesn't expose directly

-- Function to get all indexes for a schema
CREATE OR REPLACE FUNCTION pg_indexes(schema_name text DEFAULT 'public')
RETURNS TABLE (
  schemaname text,
  tablename text,
  indexname text,
  indexdef text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.nspname::text as schemaname,
    t.relname::text as tablename,
    i.relname::text as indexname,
    pg_get_indexdef(i.oid)::text as indexdef
  FROM pg_class i
  JOIN pg_index idx ON idx.indexrelid = i.oid
  JOIN pg_class t ON idx.indrelid = t.oid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = schema_name
    AND i.relkind = 'i'
  ORDER BY t.relname, i.relname;
END;
$$;

-- Function to get all foreign keys
CREATE OR REPLACE FUNCTION get_foreign_keys()
RETURNS TABLE (
  table_name text,
  column_name text,
  foreign_table_name text,
  foreign_column_name text,
  constraint_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.table_name::text,
    kcu.column_name::text,
    ccu.table_name::text AS foreign_table_name,
    ccu.column_name::text AS foreign_column_name,
    tc.constraint_name::text
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  ORDER BY tc.table_name, kcu.column_name;
END;
$$;

-- Function to check if RLS is enabled on a table
CREATE OR REPLACE FUNCTION check_rls_enabled(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = check_rls_enabled.table_name
    AND c.relkind = 'r';
  
  RETURN COALESCE(rls_enabled, false);
END;
$$;

-- Note: has_company_access already exists in 20250128000011_create_rls_helper_functions.sql
-- This migration only adds the metadata helper functions (pg_indexes, get_foreign_keys, check_rls_enabled)

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION pg_indexes(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_foreign_keys() TO authenticated;
GRANT EXECUTE ON FUNCTION check_rls_enabled(text) TO authenticated;
GRANT EXECUTE ON FUNCTION has_company_access(uuid, uuid) TO authenticated;

-- Also grant to service_role for admin operations
GRANT EXECUTE ON FUNCTION pg_indexes(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_foreign_keys() TO service_role;
GRANT EXECUTE ON FUNCTION check_rls_enabled(text) TO service_role;
GRANT EXECUTE ON FUNCTION has_company_access(uuid, uuid) TO service_role;

