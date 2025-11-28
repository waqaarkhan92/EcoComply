-- Migration: 20250128000001_create_phase1_core_tables.sql
-- Description: Create Phase 1 core tables (companies, users, sites, modules)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1 - No dependencies

-- 1. companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    billing_email TEXT NOT NULL,
    billing_address JSONB,
    phone TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'core' 
        CHECK (subscription_tier IN ('core', 'growth', 'consultant')),
    stripe_customer_id TEXT UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_companies_stripe_customer_id ON companies(stripe_customer_id);
CREATE INDEX idx_companies_is_active ON companies(is_active);
CREATE INDEX idx_companies_created_at ON companies(created_at);

-- 2. users table (depends on companies)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'email',
    auth_provider_id TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    notification_preferences JSONB NOT NULL DEFAULT '{"email": true, "sms": false, "in_app": true}',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- 3. sites table (depends on companies)
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    postcode TEXT,
    country TEXT NOT NULL DEFAULT 'United Kingdom',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    site_reference TEXT,
    regulator TEXT CHECK (regulator IN ('EA', 'SEPA', 'NRW', 'NIEA')),
    water_company TEXT,
    adjust_for_business_days BOOLEAN NOT NULL DEFAULT false,
    grace_period_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sites_company_id ON sites(company_id);
CREATE INDEX idx_sites_is_active ON sites(is_active);
CREATE INDEX idx_sites_regulator ON sites(regulator);

-- 4. modules table (self-referencing, no external dependencies)
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code TEXT NOT NULL UNIQUE,
    module_name TEXT NOT NULL,
    module_description TEXT,
    requires_module_id UUID REFERENCES modules(id) ON DELETE RESTRICT,
    pricing_model TEXT NOT NULL CHECK (pricing_model IN ('per_site', 'per_company', 'per_document')),
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    document_types JSONB,
    cross_sell_keywords TEXT[] NOT NULL DEFAULT '{}',
    workflow_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modules_module_code ON modules(module_code);
CREATE INDEX idx_modules_is_active ON modules(is_active);
CREATE INDEX idx_modules_requires_module_id ON modules(requires_module_id);
CREATE INDEX idx_modules_is_default ON modules(is_default);

