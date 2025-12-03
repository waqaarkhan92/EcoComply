-- Migration: 20250128000000_create_update_updated_at_function.sql
-- Description: Create update_updated_at_column function for automatic timestamp updates
-- Author: Build System
-- Date: 2025-01-28
-- Order: Must run before any tables that use this function in triggers

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

