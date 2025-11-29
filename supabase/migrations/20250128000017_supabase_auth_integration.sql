-- Migration: 20250128000017_supabase_auth_integration.sql
-- Description: Supabase Auth integration - sync triggers and functions
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.5 - After RLS policies

-- ============================================================================
-- AUTH SYNC FUNCTIONS
-- ============================================================================

-- Function: sync_email_verified
-- Purpose: Sync email_verified status from auth.users to users table
CREATE OR REPLACE FUNCTION sync_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the users record exists and column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'email_verified'
  ) THEN
    IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
      UPDATE users
      SET email_verified = (NEW.email_confirmed_at IS NOT NULL)
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Silently ignore errors (column might not exist yet)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: sync_last_login
-- Purpose: Update last_login_at when user logs in
CREATE OR REPLACE FUNCTION sync_last_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the users record exists and column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'last_login_at'
  ) THEN
    IF EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
      UPDATE users
      SET last_login_at = NEW.last_sign_in_at
      WHERE id = NEW.id
      AND (last_login_at IS NULL OR last_login_at < NEW.last_sign_in_at);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Silently ignore errors (column might not exist yet)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: handle_auth_user_deleted
-- Purpose: Soft delete users record when auth.users is deleted
CREATE OR REPLACE FUNCTION handle_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete users record (set deleted_at)
  UPDATE users
  SET deleted_at = NOW()
  WHERE id = OLD.id
  AND deleted_at IS NULL;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTH TRIGGERS
-- ============================================================================

-- Trigger: Sync email_verified when auth.users.email_confirmed_at changes
CREATE TRIGGER sync_email_verified_trigger
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
EXECUTE FUNCTION sync_email_verified();

-- Trigger: Sync last_login_at when auth.users.last_sign_in_at changes
CREATE TRIGGER sync_last_login_trigger
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
EXECUTE FUNCTION sync_last_login();

-- Trigger: Soft delete users when auth.users is deleted
CREATE TRIGGER handle_auth_user_deleted_trigger
AFTER DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_auth_user_deleted();

-- ============================================================================
-- NOTES
-- ============================================================================

-- IMPORTANT: User/Company creation happens in API (Phase 2), not via triggers
-- Reason: Signup form data (company name) is not available in auth.users table
-- 
-- Signup Flow (handled in API):
-- 1. User signs up via Supabase Auth (creates auth.users record)
-- 2. API receives signup request with company name
-- 3. API creates company record
-- 4. API creates users record with id = auth.users.id and company_id = new_company.id
-- 5. API creates user_roles record with role = 'OWNER'
-- 6. API creates module_activation for Module 1 (default module)
--
-- These triggers only handle:
-- - Syncing email_verified status
-- - Updating last_login_at
-- - Soft deleting users when auth.users is deleted

