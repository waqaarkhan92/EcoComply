-- Migration: 20250204000002_add_token_usage_tracking.sql
-- Description: Add token usage tracking to documents table for AI cost monitoring
-- Author: Build System
-- Date: 2025-02-04

-- Add token usage tracking columns to documents table
ALTER TABLE documents
ADD COLUMN extraction_tokens_input INTEGER,
ADD COLUMN extraction_tokens_output INTEGER,
ADD COLUMN extraction_tokens_total INTEGER,
ADD COLUMN extraction_model TEXT CHECK (extraction_model IN ('gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo')),
ADD COLUMN extraction_cost_usd DECIMAL(10, 6),
ADD COLUMN extraction_complexity TEXT CHECK (extraction_complexity IN ('simple', 'medium', 'complex'));

-- Add comments for documentation
COMMENT ON COLUMN documents.extraction_tokens_input IS 'Number of input tokens used for AI extraction';
COMMENT ON COLUMN documents.extraction_tokens_output IS 'Number of output tokens used for AI extraction';
COMMENT ON COLUMN documents.extraction_tokens_total IS 'Total tokens used (input + output)';
COMMENT ON COLUMN documents.extraction_model IS 'AI model used for extraction (gpt-4o, gpt-4o-mini, etc)';
COMMENT ON COLUMN documents.extraction_cost_usd IS 'Estimated cost in USD for extraction';
COMMENT ON COLUMN documents.extraction_complexity IS 'Document complexity rating (simple, medium, complex)';

-- Create index for cost analysis queries
CREATE INDEX idx_documents_extraction_cost ON documents(extraction_cost_usd) WHERE extraction_cost_usd IS NOT NULL;
CREATE INDEX idx_documents_extraction_model ON documents(extraction_model) WHERE extraction_model IS NOT NULL;

-- Create a view for token usage analytics
CREATE OR REPLACE VIEW document_token_usage_stats AS
SELECT
  extraction_model,
  extraction_complexity,
  COUNT(*) as document_count,
  SUM(extraction_tokens_input) as total_input_tokens,
  SUM(extraction_tokens_output) as total_output_tokens,
  SUM(extraction_tokens_total) as total_tokens,
  SUM(extraction_cost_usd) as total_cost_usd,
  AVG(extraction_tokens_total) as avg_tokens_per_document,
  AVG(extraction_cost_usd) as avg_cost_per_document,
  MIN(extraction_cost_usd) as min_cost,
  MAX(extraction_cost_usd) as max_cost
FROM documents
WHERE extraction_status = 'COMPLETED'
  AND extraction_tokens_total IS NOT NULL
GROUP BY extraction_model, extraction_complexity;

COMMENT ON VIEW document_token_usage_stats IS 'Analytics view for token usage and costs by model and complexity';
