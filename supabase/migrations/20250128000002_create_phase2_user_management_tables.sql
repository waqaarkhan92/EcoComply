-- Migration: 20250128000002_create_phase2_user_management_tables.sql
-- Description: Create Phase 2 user management tables (user_roles, user_site_assignments)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 2 - Depends on users and sites

-- 5. user_roles table (depends on users)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT', 'VIEWER')),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE UNIQUE INDEX uq_user_roles_user_role ON user_roles(user_id, role);

-- 6. user_site_assignments table (depends on users and sites)
CREATE TABLE user_site_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_site_assignments_user_id ON user_site_assignments(user_id);
CREATE INDEX idx_user_site_assignments_site_id ON user_site_assignments(site_id);
CREATE UNIQUE INDEX uq_user_site_assignments ON user_site_assignments(user_id, site_id);

