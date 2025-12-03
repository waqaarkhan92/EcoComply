-- Migration: 20250201000012_add_fuel_usage_log_id_to_aer_documents.sql
-- Description: Add fuel_usage_log_id field to aer_documents table
-- Author: Build System
-- Date: 2025-02-01
-- Order: After fuel_usage_logs table creation

-- Add fuel_usage_log_id to aer_documents
ALTER TABLE aer_documents
ADD COLUMN fuel_usage_log_id UUID REFERENCES fuel_usage_logs(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX idx_aer_documents_fuel_usage_log_id ON aer_documents(fuel_usage_log_id);

