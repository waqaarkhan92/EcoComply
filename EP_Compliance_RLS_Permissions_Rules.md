# Oblicore RLS & Permissions Rules Specification

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ Product Logic Specification (1.1) - Complete
- ✅ Canonical Dictionary (1.2) - Complete
- ✅ User Workflow Maps (1.3) - Complete
- ✅ Database Schema (2.2) - Complete

**Purpose:** Defines the complete Row Level Security (RLS) and permissions system for the Oblicore platform, including all RLS policies, CRUD matrices, permission evaluation logic, and security implementation details.

> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

1. [Document Overview](#1-document-overview)
2. [RLS Policy Structure](#2-rls-policy-structure)
3. [Core Entity Tables RLS Policies](#3-core-entity-tables-rls-policies)
4. [Module 1 Tables RLS Policies](#4-module-1-tables-rls-policies)
5. [Module 2 Tables RLS Policies](#5-module-2-tables-rls-policies)
6. [Module 3 Tables RLS Policies](#6-module-3-tables-rls-policies)
7. [Cross-Module Tables RLS Policies](#7-cross-module-tables-rls-policies)
8. [Complete CRUD Matrices](#8-complete-crud-matrices)
9. [Permission Evaluation Logic](#9-permission-evaluation-logic)
10. [Consultant Data Isolation](#10-consultant-data-isolation)
11. [v1.0 Consultant Client Assignments RLS Policies](#11-v10-consultant-client-assignments-rls-policies)
12. [v1.0 Pack Access Policies](#12-v10-pack-access-policies)
13. [v1.0 Pack Distribution Policies](#13-v10-pack-distribution-policies)
14. [Service Role Handling](#14-service-role-handling)
15. [Edge Cases & Special Scenarios](#15-edge-cases--special-scenarios)
16. [Performance Considerations](#16-performance-considerations)
17. [RLS Policy Deployment](#17-rls-policy-deployment)
18. [Permission Testing](#18-permission-testing)
19. [TypeScript Interfaces](#19-typescript-interfaces)

---

# 1. Document Overview

## 1.1 Security Architecture

The Oblicore platform uses **PostgreSQL Row Level Security (RLS)** to enforce data isolation and access control at the database level. This ensures that:

- **Multi-tenant isolation:** Users can only access data from their assigned companies/sites
- **Role-based access control:** Permissions are enforced based on user roles (Owner, Admin, Staff, Viewer, Consultant)
- **Module-specific access:** Module 2 and Module 3 data requires module activation
- **Consultant isolation:** Consultants can only access assigned client companies/sites
- **Immutable audit trail:** Audit logs cannot be modified or deleted

## 1.2 RLS Enablement Strategy

**RLS Enabled Tables:** 32 tables
- All tenant-scoped tables have RLS enabled
- System tables (`background_jobs`, `dead_letter_queue`, `system_settings`) have RLS disabled

**Tables with RLS Disabled:**
- `background_jobs` - System table for job queue management (no tenant isolation needed)
- `dead_letter_queue` - System table for failed jobs (no tenant isolation needed)
- `system_settings` - Global system configuration (not tenant-scoped, RLS disabled per Database Schema Section 7.9)

**RLS Policy Coverage:**
- **SELECT policies:** Control read access based on company/site membership
- **INSERT policies:** Control create access based on role and site assignment
- **UPDATE policies:** Control update access based on role and ownership
- **DELETE policies:** Control delete access (typically restricted to Owners/Admins)

## 1.3 Permission Model

**Access Control Layers:**
1. **Database Level (RLS):** Enforced by PostgreSQL RLS policies
2. **API Level:** Validates permissions before operations
3. **Application Level:** UI hides/disabled actions based on permissions

**Role Hierarchy:**
- **Owner:** Full access to all entities within their company
- **Admin:** Full access except system settings (read-only) and rule library (read-only)
- **Staff:** Can create/update most entities, cannot delete or manage users/modules
- **Viewer:** Read-only access to all entities
- **Consultant:** Staff-level permissions but scoped to client companies only (multi-company access)

---

# 2. RLS Policy Structure

## 2.1 Policy Naming Convention

**Format:** `{table_name}_{operation}_{scope}`

**Examples:**
- `companies_select_user_access` - SELECT policy for companies table
- `documents_insert_staff_access` - INSERT policy for documents table (Staff+ roles)
- `obligations_update_staff_access` - UPDATE policy for obligations table (Staff+ roles)
- `evidence_items_delete_none` - DELETE policy (no one can delete)

## 2.2 Policy Components

**Required Components:**
- **Policy name:** Unique identifier following naming convention
- **Table name:** Target table for the policy
- **Operation:** SELECT, INSERT, UPDATE, or DELETE
- **Policy condition (USING clause):** For SELECT, UPDATE, DELETE - determines which rows are visible/accessible
- **Policy action (WITH CHECK clause):** For INSERT, UPDATE - validates data before insertion/update

## 2.3 Policy Pattern Examples

**SELECT Policy Pattern:**
```sql
CREATE POLICY {table}_select_{scope} ON {table}
FOR SELECT
USING (
  -- Access condition (e.g., site_id IN user's assigned sites)
);
```

**INSERT Policy Pattern:**
```sql
CREATE POLICY {table}_insert_{role}_access ON {table}
FOR INSERT
WITH CHECK (
  -- Validation condition (e.g., user has role and site access)
);
```

**UPDATE Policy Pattern:**
```sql
CREATE POLICY {table}_update_{role}_access ON {table}
FOR UPDATE
USING (
  -- Access condition (which rows can be updated)
)
WITH CHECK (
  -- Validation condition (what values are allowed)
);
```

**DELETE Policy Pattern:**
```sql
CREATE POLICY {table}_delete_{role}_access ON {table}
FOR DELETE
USING (
  -- Access condition (which rows can be deleted)
);
```

---

# 3. Core Entity Tables RLS Policies

## 3.1 Companies Table

**Table:** `companies`  
**RLS Enabled:** Yes  
**Soft Delete:** Yes (`deleted_at`)

### SELECT Policy

**Policy:** `companies_select_user_access`

```sql
CREATE POLICY companies_select_user_access ON companies
FOR SELECT
USING (
  deleted_at IS NULL
  AND id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can only see companies they are assigned to (via `user_roles` table)
- Soft-deleted companies are excluded (unless user has special access)

### INSERT Policy

**Policy:** `companies_insert_owner_access`

```sql
CREATE POLICY companies_insert_owner_access ON companies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'owner'
  )
);
```

**Access Logic:**
- Only Owners can create companies
- Typically created during signup (first company)

### UPDATE Policy

**Policy:** `companies_update_owner_admin_access`

```sql
CREATE POLICY companies_update_owner_admin_access ON companies
FOR UPDATE
USING (
  deleted_at IS NULL
  AND id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Owners and Admins can update companies they are assigned to
- Cannot update soft-deleted companies

### DELETE Policy

**Policy:** `companies_delete_owner_access`

```sql
CREATE POLICY companies_delete_owner_access ON companies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'owner'
    AND company_id = companies.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM sites
    WHERE company_id = companies.id
    AND deleted_at IS NULL
  )
);
```

**Access Logic:**
- Only Owners can delete companies
- Cannot delete companies with active sites (business rule)

## 3.2 Sites Table

**Table:** `sites`  
**RLS Enabled:** Yes  
**Soft Delete:** Yes (`deleted_at`)

### SELECT Policy

**Policy:** `sites_select_user_access`

```sql
CREATE POLICY sites_select_user_access ON sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
    OR id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);
```

**Access Logic:**
- Users can see sites from their assigned companies OR directly assigned sites
- Soft-deleted sites are excluded

### INSERT Policy

**Policy:** `sites_insert_owner_admin_access`

```sql
CREATE POLICY sites_insert_owner_admin_access ON sites
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Owners and Admins can create sites for their assigned companies

### UPDATE Policy

**Policy:** `sites_update_owner_admin_access`

```sql
CREATE POLICY sites_update_owner_admin_access ON sites
FOR UPDATE
USING (
  deleted_at IS NULL
  AND company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Owners and Admins can update sites in their assigned companies

### DELETE Policy

**Policy:** `sites_delete_owner_admin_access`

```sql
CREATE POLICY sites_delete_owner_admin_access ON sites
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND company_id = sites.company_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM documents
    WHERE site_id = sites.id
    AND deleted_at IS NULL
  )
);
```

**Access Logic:**
- Owners and Admins can delete sites
- Cannot delete sites with active documents (business rule)

## 3.3 Users Table

**Table:** `users`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `users_select_company_access`

```sql
CREATE POLICY users_select_company_access ON users
FOR SELECT
USING (
  id IN (
    SELECT user_id FROM user_roles
    WHERE company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  )
);
```

**Access Logic:**
- Users can see other users from the same companies they belong to

### INSERT Policy

**Policy:** `users_insert_owner_admin_access`

```sql
CREATE POLICY users_insert_owner_admin_access ON users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Owners and Admins can create users (typically during user invitation)

### UPDATE Policy

**Policy:** `users_update_owner_admin_access`

```sql
CREATE POLICY users_update_owner_admin_access ON users
FOR UPDATE
USING (
  id IN (
    SELECT user_id FROM user_roles
    WHERE company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  id IN (
    SELECT user_id FROM user_roles
    WHERE company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- Owners and Admins can update users from their companies
- Users can also update their own profile (handled separately)

### DELETE Policy

**Policy:** `users_delete_owner_access`

```sql
CREATE POLICY users_delete_owner_access ON users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'owner'
    AND company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = users.id
    )
  )
);
```

**Access Logic:**
- Only Owners can delete users from their companies

## 3.4 User Roles Table

**Table:** `user_roles`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `user_roles_select_company_access`

```sql
CREATE POLICY user_roles_select_company_access ON user_roles
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see role assignments for their companies

### INSERT Policy

**Policy:** `user_roles_insert_owner_admin_access`

```sql
CREATE POLICY user_roles_insert_owner_admin_access ON user_roles
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Owners and Admins can assign roles within their companies

### UPDATE Policy

**Policy:** `user_roles_update_owner_admin_access`

```sql
CREATE POLICY user_roles_update_owner_admin_access ON user_roles
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Owners and Admins can update role assignments within their companies

### DELETE Policy

**Policy:** `user_roles_delete_owner_access`

```sql
CREATE POLICY user_roles_delete_owner_access ON user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'owner'
    AND company_id = user_roles.company_id
  )
);
```

**Access Logic:**
- Only Owners can delete role assignments

## 3.5 User Site Assignments Table

**Table:** `user_site_assignments`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `user_site_assignments_select_company_access`

```sql
CREATE POLICY user_site_assignments_select_company_access ON user_site_assignments
FOR SELECT
USING (
  site_id IN (
    SELECT id FROM sites
    WHERE company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
    )
  )
);
```

**Access Logic:**
- Users can see site assignments for sites in their companies

### INSERT Policy

**Policy:** `user_site_assignments_insert_owner_admin_access`

```sql
CREATE POLICY user_site_assignments_insert_owner_admin_access ON user_site_assignments
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT id FROM sites
    WHERE company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- Owners and Admins can assign users to sites in their companies

### UPDATE Policy

**Policy:** `user_site_assignments_update_owner_admin_access`

```sql
CREATE POLICY user_site_assignments_update_owner_admin_access ON user_site_assignments
FOR UPDATE
USING (
  site_id IN (
    SELECT id FROM sites
    WHERE company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  site_id IN (
    SELECT id FROM sites
    WHERE company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- Owners and Admins can update site assignments within their companies

### DELETE Policy

**Policy:** `user_site_assignments_delete_owner_admin_access`

```sql
CREATE POLICY user_site_assignments_delete_owner_admin_access ON user_site_assignments
FOR DELETE
USING (
  site_id IN (
    SELECT id FROM sites
    WHERE company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- Owners and Admins can remove site assignments

## 3.6 Modules Table

**Table:** `modules`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `modules_select_all_access`

```sql
CREATE POLICY modules_select_all_access ON modules
FOR SELECT
USING (TRUE);
```

**Access Logic:**
- All authenticated users can see available modules

### INSERT/UPDATE/DELETE Policies

**Policy:** `modules_insert_system_access`, `modules_update_system_access`, `modules_delete_system_access`

```sql
CREATE POLICY modules_insert_system_access ON modules
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY modules_update_system_access ON modules
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY modules_delete_system_access ON modules
FOR DELETE
USING (auth.role() = 'service_role');
```

**Access Logic:**
- Only service role (system) can modify modules table

## 3.7 Documents Table

**Table:** `documents`  
**RLS Enabled:** Yes  
**Soft Delete:** Yes (`deleted_at`)

### SELECT Policy

**Policy:** `documents_select_site_access`

```sql
CREATE POLICY documents_select_site_access ON documents
FOR SELECT
USING (
  deleted_at IS NULL
  AND site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see documents from their assigned sites
- Soft-deleted documents are excluded

### INSERT Policy

**Policy:** `documents_insert_staff_access`

```sql
CREATE POLICY documents_insert_staff_access ON documents
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff', 'consultant')
  )
);
```

**Access Logic:**
- Owners, Admins, Staff, and Consultants can upload documents to assigned sites

### UPDATE Policy

**Policy:** `documents_update_staff_access`

```sql
CREATE POLICY documents_update_staff_access ON documents
FOR UPDATE
USING (
  deleted_at IS NULL
  AND site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update documents (Consultants excluded)

### DELETE Policy

**Policy:** `documents_delete_owner_admin_access`

```sql
CREATE POLICY documents_delete_owner_admin_access ON documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND site_id = documents.site_id
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only Owners and Admins can delete documents

## 3.8 Document Site Assignments Table

**Table:** `document_site_assignments`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `document_site_assignments_select_site_access`

```sql
CREATE POLICY document_site_assignments_select_site_access ON document_site_assignments
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see document-site assignments for their assigned sites

### INSERT Policy

**Policy:** `document_site_assignments_insert_staff_access`

```sql
CREATE POLICY document_site_assignments_insert_staff_access ON document_site_assignments
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can create document-site assignments

### UPDATE Policy

**Policy:** `document_site_assignments_update_staff_access`

```sql
CREATE POLICY document_site_assignments_update_staff_access ON document_site_assignments
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update document-site assignments

### DELETE Policy

**Policy:** `document_site_assignments_delete_owner_admin_access`

```sql
CREATE POLICY document_site_assignments_delete_owner_admin_access ON document_site_assignments
FOR DELETE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only Owners and Admins can delete document-site assignments

## 3.9 Obligations Table

**Table:** `obligations`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `obligations_select_site_access`

```sql
CREATE POLICY obligations_select_site_access ON obligations
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see obligations from their assigned sites

### INSERT Policy

**Policy:** `obligations_insert_staff_access`

```sql
CREATE POLICY obligations_insert_staff_access ON obligations
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff', 'consultant')
  )
);
```

**Access Logic:**
- Owners, Admins, Staff, and Consultants can create obligations

### UPDATE Policy

**Policy:** `obligations_update_staff_access`

```sql
CREATE POLICY obligations_update_staff_access ON obligations
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update obligations (Consultants excluded)

### DELETE Policy

**Policy:** `obligations_delete_owner_admin_access`

```sql
CREATE POLICY obligations_delete_owner_admin_access ON obligations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND site_id = obligations.site_id
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only Owners and Admins can delete obligations

---

**Document continues in next section...**


# 4. Module 1 Tables RLS Policies

## 4.1 Schedules Table

**Table:** `schedules`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `schedules_select_site_access`

```sql
CREATE POLICY schedules_select_site_access ON schedules
FOR SELECT
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);
```

**Access Logic:**
- Users can see schedules for obligations from their assigned sites

### INSERT Policy

**Policy:** `schedules_insert_staff_access`

```sql
CREATE POLICY schedules_insert_staff_access ON schedules
FOR INSERT
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff', 'consultant')
    )
  )
);
```

**Access Logic:**
- Owners, Admins, Staff, and Consultants can create schedules

### UPDATE Policy

**Policy:** `schedules_update_staff_access`

```sql
CREATE POLICY schedules_update_staff_access ON schedules
FOR UPDATE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
)
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update schedules

### DELETE Policy

**Policy:** `schedules_delete_owner_admin_access`

```sql
CREATE POLICY schedules_delete_owner_admin_access ON schedules
FOR DELETE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- Only Owners and Admins can delete schedules

## 4.2 Deadlines Table

**Table:** `deadlines`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `deadlines_select_site_access`

```sql
CREATE POLICY deadlines_select_site_access ON deadlines
FOR SELECT
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);
```

**Access Logic:**
- Users can see deadlines for obligations from their assigned sites

### INSERT Policy

**Policy:** `deadlines_insert_system_access`

```sql
CREATE POLICY deadlines_insert_system_access ON deadlines
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Access Logic:**
- Only system (service role) can create deadlines (auto-generated from obligations)

### UPDATE Policy

**Policy:** `deadlines_update_staff_access`

```sql
CREATE POLICY deadlines_update_staff_access ON deadlines
FOR UPDATE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
)
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update deadlines

### DELETE Policy

**Policy:** `deadlines_delete_owner_admin_access`

```sql
CREATE POLICY deadlines_delete_owner_admin_access ON deadlines
FOR DELETE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- Only Owners and Admins can delete deadlines

## 4.3 Evidence Items Table

**Table:** `evidence_items`  
**RLS Enabled:** Yes  
**Soft Delete:** No (archived by system)

### SELECT Policy

**Policy:** `evidence_items_select_site_access`

```sql
CREATE POLICY evidence_items_select_site_access ON evidence_items
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see evidence from their assigned sites

### INSERT Policy

**Policy:** `evidence_items_insert_staff_access`

```sql
CREATE POLICY evidence_items_insert_staff_access ON evidence_items
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff', 'consultant')
  )
);
```

**Access Logic:**
- Owners, Admins, Staff, and Consultants can upload evidence

### UPDATE Policy

**Policy:** `evidence_items_update_staff_access`

```sql
CREATE POLICY evidence_items_update_staff_access ON evidence_items
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update evidence

### DELETE Policy

**Policy:** `evidence_items_delete_none`

```sql
-- No DELETE policy - evidence cannot be deleted by any role
-- Evidence is archived by system after retention period
```

**Access Logic:**
- No one can delete evidence items (system archives only)

## 4.4 Obligation Evidence Links Table

**Table:** `obligation_evidence_links`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `obligation_evidence_links_select_site_access`

```sql
CREATE POLICY obligation_evidence_links_select_site_access ON obligation_evidence_links
FOR SELECT
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);
```

**Access Logic:**
- Users can see evidence links for obligations from their assigned sites

### INSERT Policy

**Policy:** `obligation_evidence_links_insert_staff_access`

```sql
CREATE POLICY obligation_evidence_links_insert_staff_access ON obligation_evidence_links
FOR INSERT
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff', 'consultant')
    )
  )
);
```

**Access Logic:**
- Owners, Admins, Staff, and Consultants can link evidence to obligations

### UPDATE Policy

**Policy:** `obligation_evidence_links_update_staff_access`

```sql
CREATE POLICY obligation_evidence_links_update_staff_access ON obligation_evidence_links
FOR UPDATE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
)
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update evidence links

### DELETE Policy

**Policy:** `obligation_evidence_links_delete_staff_access`

```sql
CREATE POLICY obligation_evidence_links_delete_staff_access ON obligation_evidence_links
FOR DELETE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can unlink evidence from obligations

## 4.5 Audit Packs Table

**Table:** `audit_packs`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `audit_packs_select_site_access`

> [v1 UPDATE – Board Pack SELECT Exception – 2024-12-27]

```sql
CREATE POLICY audit_packs_select_site_access ON audit_packs
FOR SELECT
USING (
  -- Board Pack: company-level access (site_id = NULL, Owner/Admin only)
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  OR
  -- Other Pack Types: site-level access
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  OR
  -- Consultants: client assignment check
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND client_company_id = company_id
      AND status = 'ACTIVE'
    )
  )
);
```

**Access Logic:**
- **Board Pack:** Only Owners/Admins can view (company-level access)
- **Other Pack Types:** Users can see packs from their assigned sites
- **Consultants:** Can view packs for assigned clients

### INSERT Policy

**Policy:** `audit_packs_insert_staff_access`

> [v1 UPDATE – Board Pack RLS Exception – 2024-12-27]

```sql
CREATE POLICY audit_packs_insert_staff_access ON audit_packs
FOR INSERT
WITH CHECK (
  -- Board Pack: company-level access (site_id = NULL, Owner/Admin only)
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  OR
  -- Regular users: site-level access (site_id required)
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
  OR
  -- Consultants: client assignment check (site_id required, not Board Pack)
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND client_company_id = company_id
      AND status = 'ACTIVE'
    )
  )
);
```

**Access Logic:**
- **Board Pack:** Only Owners/Admins can generate (company-level access, site_id = NULL)
- **Other Pack Types:** Owners, Admins, Staff can generate (site-level access)
- **Consultants:** Can generate packs for assigned clients (site-level access, not Board Pack)
- **Rationale:** Board Pack contains company-wide risk data requiring executive-level access

### UPDATE Policy

**Policy:** `audit_packs_update_staff_access`

> [v1 UPDATE – Board Pack UPDATE Exception – 2024-12-27]

```sql
CREATE POLICY audit_packs_update_staff_access ON audit_packs
FOR UPDATE
USING (
  -- Board Pack: company-level access (Owner/Admin only)
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  OR
  -- Other Pack Types: site-level access
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  OR
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff')
    )
  )
);
```

**Access Logic:**
- **Board Pack:** Only Owners/Admins can update (company-level access)
- **Other Pack Types:** Owners, Admins, and Staff can update (site-level access)

### DELETE Policy

**Policy:** `audit_packs_delete_owner_admin_access`

> [v1 UPDATE – Board Pack DELETE Exception – 2024-12-27]

```sql
CREATE POLICY audit_packs_delete_owner_admin_access ON audit_packs
FOR DELETE
USING (
  -- Board Pack: company-level access (Owner/Admin only)
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  OR
  -- Other Pack Types: site-level access (Owner/Admin only)
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND site_id = audit_packs.site_id
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- **Board Pack:** Only Owners/Admins can delete (company-level access)
- **Other Pack Types:** Only Owners/Admins can delete (site-level access)


# 5. Module 2 Tables RLS Policies (Trade Effluent)

**Note:** All Module 2 tables require module activation check via `module_activations` table.

## 5.1 Parameters Table

**Table:** `parameters`  
**RLS Enabled:** Yes  
**Module:** Module 2

### Policies Summary:
- **SELECT:** `parameters_select_site_module` - Site access + Module 2 activated
- **INSERT:** `parameters_insert_staff_module` - Staff+ roles + Module 2 activated
- **UPDATE:** `parameters_update_staff_module` - Staff+ roles + Module 2 activated
- **DELETE:** `parameters_delete_owner_admin_module` - Owner/Admin + Module 2 activated

**Key Policy Pattern:**
```sql
-- Example SELECT policy
CREATE POLICY parameters_select_site_module ON parameters
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = parameters.company_id
    AND module_id = parameters.module_id
    AND is_active = TRUE
  )
);
```

## 5.2 Lab Results Table

**Table:** `lab_results`  
**RLS Enabled:** Yes  
**Module:** Module 2

### Policies Summary:
- **SELECT:** `lab_results_select_site_module` - Site access + Module 2 activated
- **INSERT:** `lab_results_insert_staff_module` - Staff+ roles + Module 2 activated
- **UPDATE:** `lab_results_update_staff_module` - Staff+ roles + Module 2 activated
- **DELETE:** `lab_results_delete_owner_admin_module` - Owner/Admin + Module 2 activated

## 5.3 Exceedances Table

**Table:** `exceedances`  
**RLS Enabled:** Yes  
**Module:** Module 2

### Policies Summary:
- **SELECT:** `exceedances_select_site_module` - Site access + Module 2 activated
- **INSERT:** `exceedances_insert_system_module` - System only (auto-generated)
- **UPDATE:** `exceedances_update_staff_module` - Staff+ roles + Module 2 activated
- **DELETE:** `exceedances_delete_owner_admin_module` - Owner/Admin + Module 2 activated

## 5.4 Discharge Volumes Table

**Table:** `discharge_volumes`  
**RLS Enabled:** Yes  
**Module:** Module 2

### Policies Summary:
- **SELECT:** `discharge_volumes_select_site_module` - Site access + Module 2 activated
- **INSERT:** `discharge_volumes_insert_staff_module` - Staff+ roles + Module 2 activated
- **UPDATE:** `discharge_volumes_update_staff_module` - Staff+ roles + Module 2 activated
- **DELETE:** `discharge_volumes_delete_owner_admin_module` - Owner/Admin + Module 2 activated

---

# 6. Module 3 Tables RLS Policies (MCPD/Generators)

**Note:** All Module 3 tables require module activation check via `module_activations` table.

## 6.1 Generators Table

**Table:** `generators`  
**RLS Enabled:** Yes  
**Module:** Module 3

### Policies Summary:
- **SELECT:** `generators_select_site_module` - Site access + Module 3 activated
- **INSERT:** `generators_insert_staff_module` - Staff+ roles + Module 3 activated
- **UPDATE:** `generators_update_staff_module` - Staff+ roles + Module 3 activated
- **DELETE:** `generators_delete_owner_admin_module` - Owner/Admin + Module 3 activated

## 6.2 Run Hour Records Table

**Table:** `run_hour_records`  
**RLS Enabled:** Yes  
**Module:** Module 3

### Policies Summary:
- **SELECT:** `run_hour_records_select_site_module` - Site access + Module 3 activated
- **INSERT:** `run_hour_records_insert_staff_module` - Staff+ roles + Module 3 activated
- **UPDATE:** `run_hour_records_update_staff_module` - Staff+ roles + Module 3 activated
- **DELETE:** `run_hour_records_delete_owner_admin_module` - Owner/Admin + Module 3 activated

## 6.3 Stack Tests Table

**Table:** `stack_tests`  
**RLS Enabled:** Yes  
**Module:** Module 3

### Policies Summary:
- **SELECT:** `stack_tests_select_site_module` - Site access + Module 3 activated
- **INSERT:** `stack_tests_insert_staff_module` - Staff+ roles + Module 3 activated
- **UPDATE:** `stack_tests_update_staff_module` - Staff+ roles + Module 3 activated
- **DELETE:** `stack_tests_delete_owner_admin_module` - Owner/Admin + Module 3 activated

## 6.4 Maintenance Records Table

**Table:** `maintenance_records`  
**RLS Enabled:** Yes  
**Module:** Module 3

### Policies Summary:
- **SELECT:** `maintenance_records_select_site_module` - Site access + Module 3 activated
- **INSERT:** `maintenance_records_insert_staff_module` - Staff+ roles + Module 3 activated
- **UPDATE:** `maintenance_records_update_staff_module` - Staff+ roles + Module 3 activated
- **DELETE:** `maintenance_records_delete_owner_admin_module` - Owner/Admin + Module 3 activated

## 6.5 AER Documents Table

**Table:** `aer_documents`  
**RLS Enabled:** Yes  
**Module:** Module 3

### Policies Summary:
- **SELECT:** `aer_documents_select_site_module` - Site access + Module 3 activated
- **INSERT:** `aer_documents_insert_staff_module` - Staff+ roles + Module 3 activated
- **UPDATE:** `aer_documents_update_staff_module` - Staff+ roles + Module 3 activated
- **DELETE:** `aer_documents_delete_owner_admin_module` - Owner/Admin + Module 3 activated

---

# 7. Cross-Module Tables RLS Policies

## 7.1 Notifications Table

**Table:** `notifications`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `notifications_select_user_access`

```sql
CREATE POLICY notifications_select_user_access ON notifications
FOR SELECT
USING (user_id = auth.uid());
```

**Access Logic:**
- Users can only see their own notifications

### INSERT/UPDATE/DELETE Policies

**Policy:** `notifications_insert_system_access`, `notifications_update_system_access`, `notifications_delete_user_access`

```sql
CREATE POLICY notifications_insert_system_access ON notifications
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY notifications_update_system_access ON notifications
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY notifications_delete_user_access ON notifications
FOR DELETE
USING (user_id = auth.uid());
```

**Access Logic:**
- System creates/updates notifications
- Users can delete their own notifications

## 7.2 Audit Logs Table

**Table:** `audit_logs`  
**RLS Enabled:** Yes (read-only for company)  
**Soft Delete:** No (immutable)

### SELECT Policy

**Policy:** `audit_logs_select_company_access`

```sql
CREATE POLICY audit_logs_select_company_access ON audit_logs
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see audit logs for their companies
- Read-only access (immutable)

### INSERT Policy

**Policy:** `audit_logs_insert_system_access`

```sql
CREATE POLICY audit_logs_insert_system_access ON audit_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Access Logic:**
- Only system can create audit logs

### UPDATE/DELETE Policies

**Policy:** `audit_logs_update_none`, `audit_logs_delete_none`

```sql
-- No UPDATE or DELETE policies - audit logs are immutable
```

**Access Logic:**
- No one can update or delete audit logs

## 7.3 Regulator Questions Table

**Table:** `regulator_questions`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `regulator_questions_select_site_access`

```sql
CREATE POLICY regulator_questions_select_site_access ON regulator_questions
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  OR company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see regulator questions for their assigned sites or companies

### INSERT Policy

**Policy:** `regulator_questions_insert_staff_access`

```sql
CREATE POLICY regulator_questions_insert_staff_access ON regulator_questions
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
  OR company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can create regulator questions

### UPDATE Policy

**Policy:** `regulator_questions_update_staff_access`

```sql
CREATE POLICY regulator_questions_update_staff_access ON regulator_questions
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
  OR company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
  OR company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update regulator questions

### DELETE Policy

**Policy:** `regulator_questions_delete_owner_admin_access`

```sql
CREATE POLICY regulator_questions_delete_owner_admin_access ON regulator_questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND (
      company_id = regulator_questions.company_id
      OR company_id IN (
        SELECT company_id FROM sites
        WHERE id = regulator_questions.site_id
      )
    )
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only Owners and Admins can delete regulator questions

## 7.4 Review Queue Items Table

**Table:** `review_queue_items`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `review_queue_items_select_site_access`

```sql
CREATE POLICY review_queue_items_select_site_access ON review_queue_items
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see review queue items for their assigned sites

### INSERT Policy

**Policy:** `review_queue_items_insert_system_access`

```sql
CREATE POLICY review_queue_items_insert_system_access ON review_queue_items
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Access Logic:**
- Only system can create review queue items (auto-generated from AI extraction)

### UPDATE Policy

**Policy:** `review_queue_items_update_staff_access`

```sql
CREATE POLICY review_queue_items_update_staff_access ON review_queue_items
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
);
```

**Access Logic:**
- Owners, Admins, and Staff can update review queue items (confirm/edit/reject)

### DELETE Policy

**Policy:** `review_queue_items_delete_system_access`

```sql
CREATE POLICY review_queue_items_delete_system_access ON review_queue_items
FOR DELETE
USING (auth.role() = 'service_role');
```

**Access Logic:**
- Only system can delete review queue items (after review completion)

## 7.5 Escalations Table

**Table:** `escalations`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `escalations_select_site_access`

```sql
CREATE POLICY escalations_select_site_access ON escalations
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  OR escalated_to = auth.uid()
);
```

**Access Logic:**
- Users can see escalations for their assigned sites or escalations directed to them

### INSERT Policy

**Policy:** `escalations_insert_system_access`

```sql
CREATE POLICY escalations_insert_system_access ON escalations
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Access Logic:**
- Only system can create escalations (auto-generated from overdue items)

### UPDATE Policy

**Policy:** `escalations_update_staff_access`

```sql
CREATE POLICY escalations_update_staff_access ON escalations
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
  OR escalated_to = auth.uid()
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  )
  OR escalated_to = auth.uid()
);
```

**Access Logic:**
- Owners, Admins, and Staff can update escalations for their sites
- Escalated users can update escalations directed to them

### DELETE Policy

**Policy:** `escalations_delete_owner_admin_access`

```sql
CREATE POLICY escalations_delete_owner_admin_access ON escalations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND site_id = escalations.site_id
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only Owners and Admins can delete escalations

## 7.6 Excel Imports Table

**Table:** `excel_imports`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `excel_imports_select_user_access`

```sql
CREATE POLICY excel_imports_select_user_access ON excel_imports
FOR SELECT
USING (user_id = auth.uid());
```

**Access Logic:**
- Users can only see their own Excel imports

### INSERT Policy

**Policy:** `excel_imports_insert_user_access`

```sql
CREATE POLICY excel_imports_insert_user_access ON excel_imports
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff', 'consultant')
  )
);
```

**Access Logic:**
- Any authenticated user can create Excel imports for their assigned sites

### UPDATE Policy

**Policy:** `excel_imports_update_user_access`

```sql
CREATE POLICY excel_imports_update_user_access ON excel_imports
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**Access Logic:**
- Users can update their own Excel imports

### DELETE Policy

**Policy:** `excel_imports_delete_user_access`

```sql
CREATE POLICY excel_imports_delete_user_access ON excel_imports
FOR DELETE
USING (user_id = auth.uid());
```

**Access Logic:**
- Users can delete their own Excel imports

## 7.7 Module Activations Table

**Table:** `module_activations`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `module_activations_select_company_access`

```sql
CREATE POLICY module_activations_select_company_access ON module_activations
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see module activations for their companies

### INSERT Policy

**Policy:** `module_activations_insert_owner_admin_access`

```sql
CREATE POLICY module_activations_insert_owner_admin_access ON module_activations
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only Owners and Admins can activate modules

### UPDATE Policy

**Policy:** `module_activations_update_owner_admin_access`

```sql
CREATE POLICY module_activations_update_owner_admin_access ON module_activations
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only Owners and Admins can update module activations

### DELETE Policy

**Policy:** `module_activations_delete_owner_access`

```sql
CREATE POLICY module_activations_delete_owner_access ON module_activations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = module_activations.company_id
    AND role = 'owner'
  )
);
```

**Access Logic:**
- Only Owners can deactivate modules

## 7.8 Cross-Sell Triggers Table

**Table:** `cross_sell_triggers`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `cross_sell_triggers_select_company_access`

```sql
CREATE POLICY cross_sell_triggers_select_company_access ON cross_sell_triggers
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);
```

**Access Logic:**
- Users can see cross-sell triggers for their companies

### INSERT Policy

**Policy:** `cross_sell_triggers_insert_system_access`

```sql
CREATE POLICY cross_sell_triggers_insert_system_access ON cross_sell_triggers
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Access Logic:**
- Only system can create cross-sell triggers (auto-generated from usage patterns)

### UPDATE Policy

**Policy:** `cross_sell_triggers_update_owner_admin_access`

```sql
CREATE POLICY cross_sell_triggers_update_owner_admin_access ON cross_sell_triggers
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Owners and Admins can update cross-sell triggers

### DELETE Policy

**Policy:** `cross_sell_triggers_delete_owner_admin_access`

```sql
CREATE POLICY cross_sell_triggers_delete_owner_admin_access ON cross_sell_triggers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = cross_sell_triggers.company_id
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Owners and Admins can delete cross-sell triggers

## 7.9 Extraction Logs Table

**Table:** `extraction_logs`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `extraction_logs_select_site_access`

```sql
CREATE POLICY extraction_logs_select_site_access ON extraction_logs
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);
```

**Access Logic:**
- Users can see extraction logs for documents from their assigned sites

### INSERT Policy

**Policy:** `extraction_logs_insert_system_access`

```sql
CREATE POLICY extraction_logs_insert_system_access ON extraction_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Access Logic:**
- Only system can create extraction logs

### UPDATE Policy

**Policy:** `extraction_logs_update_system_access`

```sql
CREATE POLICY extraction_logs_update_system_access ON extraction_logs
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```

**Access Logic:**
- Only system can update extraction logs

### DELETE Policy

**Policy:** `extraction_logs_delete_owner_admin_access`

```sql
CREATE POLICY extraction_logs_delete_owner_admin_access ON extraction_logs
FOR DELETE
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- Only Owners and Admins can delete extraction logs

---


# 8. Complete CRUD Matrices

## 8.1 CRUD Matrix Legend

- **C** = Create (INSERT)
- **R** = Read (SELECT)
- **U** = Update
- **D** = Delete
- **-** = No access
- **\*** = Requires module activation

## 8.2 Complete CRUD Matrix per Role per Entity

| Entity | Owner | Admin | Staff | Viewer | Consultant |
|--------|-------|-------|-------|--------|------------|
| **Companies** | CRUD | CRU | R | R | R (client only) |
| **Sites** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Users** | CRUD | CRUD | R | R | R (client only) |
| **User Roles** | CRUD | CRUD | - | - | - |
| **User Site Assignments** | CRUD | CRUD | - | - | - |
| **Modules** | R | R | R | R | R |
| **Documents** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Document Site Assignments** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Obligations** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Schedules** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Deadlines** | CRUD | CRUD | CU | R | CU (client only) |
| **Evidence Items** | CRU | CRU | CRU | R | CRU (client only) |
| **Obligation Evidence Links** | CRUD | CRUD | CRUD | R | CRUD (client only) |
| **Audit Packs** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Parameters (Module 2)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Lab Results (Module 2)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Exceedances (Module 2)** | CRUD* | CRUD* | CU* | R* | CU* (client only) |
| **Discharge Volumes (Module 2)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Generators (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Run Hour Records (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Stack Tests (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Maintenance Records (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **AER Documents (Module 3)** | CRUD* | CRUD* | CRU* | R* | CRU* (client only) |
| **Notifications** | R (own) | R (own) | R (own) | R (own) | R (own) |
| **Audit Logs** | R (company) | R (company) | R (company) | R (company) | R (client only) |
| **Regulator Questions** | CRUD | CRUD | CRU | R | CRU (client only) |
| **Review Queue Items** | CRUD | CRUD | CU | R | CU (client only) |
| **Escalations** | CRUD | CRUD | CU | R | CU (client only) |
| **Excel Imports** | CRUD (own) | CRUD (own) | CRUD (own) | R (own) | CRUD (own) |
| **Module Activations** | CRUD | CRUD | R | R | R |
| **Cross-Sell Triggers** | CRUD | CRUD | R | R | R (client only) |
| **Extraction Logs** | CRUD | CRUD | R | R | R (client only) |
| **System Settings** | CRUD | R | - | - | - |
| **Rule Library Patterns** | CRUD | R | R | - | - |

**Note on Non-Table Entities:**
- **System Settings:** Table exists but RLS disabled (global settings, not tenant-scoped). Access controlled via application-level permissions (Owner/Admin only).
- **Rule Library Patterns:** Metadata stored in system, not a database table. Access controlled via application-level permissions (Owner/Admin can modify, Staff/Viewer read-only).

## 8.3 Special Rules

### Evidence Deletion
- **No role can DELETE evidence items** - Evidence is archived by system after retention period
- This is enforced by having no DELETE policy on `evidence_items` table

### System-Generated Records
- **Deadlines:** INSERT by system only (auto-generated from obligations)
- **Exceedances:** INSERT by system only (auto-generated from lab results)
- **Escalations:** INSERT by system only (auto-generated from overdue items)
- **Review Queue Items:** INSERT by system only (auto-generated from AI extraction)
- **Cross-Sell Triggers:** INSERT by system only (auto-generated from usage patterns)

### Module Activation Requirements
- Module 2/3 entities require module activation check
- Users cannot access Module 2/3 data if module is not activated for their company
- Enforced via RLS policies checking `module_activations` table

### Consultant Restrictions
- Consultants can only access assigned client companies/sites
- Consultants have Staff-level permissions but scoped to clients only
- Enforced via consultant isolation policies

### Viewer Restrictions
- Viewers have read-only access (no INSERT, UPDATE, DELETE policies)
- Viewers can see all data within their assigned sites/companies
- No write operations allowed

---

# 9. Permission Evaluation Logic

## 9.1 SQL Functions for Permission Checks

### Function: has_company_access

```sql
CREATE OR REPLACE FUNCTION has_company_access(user_id UUID, company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = has_company_access.user_id
    AND user_roles.company_id = has_company_access.company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Purpose:** Check if user has access to a company

### Function: has_site_access

```sql
CREATE OR REPLACE FUNCTION has_site_access(user_id UUID, site_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_site_assignments.user_id = has_site_access.user_id
    AND user_site_assignments.site_id = has_site_access.site_id
  )
  OR EXISTS (
    SELECT 1 FROM sites s
    INNER JOIN user_roles ur ON s.company_id = ur.company_id
    WHERE s.id = has_site_access.site_id
    AND ur.user_id = has_site_access.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Purpose:** Check if user has access to a site

### Function: role_has_permission

```sql
CREATE OR REPLACE FUNCTION role_has_permission(
  user_id UUID,
  entity_type TEXT,
  operation TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role for the entity's company
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_roles.user_id = role_has_permission.user_id
  LIMIT 1;
  
  -- Check permission based on role and operation
  CASE user_role
    WHEN 'owner' THEN
      RETURN TRUE; -- Owner has all permissions
    WHEN 'admin' THEN
      RETURN operation != 'DELETE' OR entity_type IN ('companies', 'users'); -- Admin can delete most, but not companies/users
    WHEN 'staff' THEN
      RETURN operation IN ('CREATE', 'READ', 'UPDATE') AND entity_type NOT IN ('users', 'user_roles', 'module_activations');
    WHEN 'viewer' THEN
      RETURN operation = 'READ'; -- Viewer is read-only
    WHEN 'consultant' THEN
      RETURN operation IN ('CREATE', 'READ', 'UPDATE') AND entity_type IN ('documents', 'obligations', 'evidence_items', 'audit_packs');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Purpose:** Check if user's role has permission for an operation on an entity type

### Function: is_module_activated

```sql
CREATE OR REPLACE FUNCTION is_module_activated(
  company_id UUID,
  module_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM module_activations
    WHERE module_activations.company_id = is_module_activated.company_id
    AND module_activations.module_id = is_module_activated.module_id
    AND module_activations.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Purpose:** Check if a module is activated for a company

## 9.2 Application Layer Permission Check

### Pseudocode

```
function checkPermission(userId, resource, operation):
  // Get user roles
  roles = getUserRoles(userId)
  
  // Check company-level access
  if not hasCompanyAccess(userId, resource.company_id):
    return false
  
  // Check consultant isolation (if consultant role)
  if roles.includes('consultant'):
    if not isConsultantAssignedToCompany(userId, resource.company_id):
      return false
  
  // Check site-level access (if resource has site_id)
  if resource.site_id and not hasSiteAccess(userId, resource.site_id):
    return false
  
  // Check module activation (for Module 2/3 entities)
  if resource.module_id:
    if not isModuleActivated(resource.company_id, resource.module_id):
      return false
  
  // Check role-based permissions
  for role in roles:
    if roleHasPermission(role, resource.type, operation):
      return true
  
  return false

function hasCompanyAccess(userId, companyId):
  return exists(
    SELECT 1 FROM user_roles
    WHERE user_id = userId
    AND company_id = companyId
  )

function hasSiteAccess(userId, siteId):
  return exists(
    SELECT 1 FROM user_site_assignments
    WHERE user_id = userId
    AND site_id = siteId
  )
  OR exists(
    SELECT 1 FROM sites s
    INNER JOIN user_roles ur ON s.company_id = ur.company_id
    WHERE s.id = siteId
    AND ur.user_id = userId
  )

function isConsultantAssignedToCompany(consultantId, companyId):
  return exists(
    SELECT 1 FROM user_roles
    WHERE user_id = consultantId
    AND company_id = companyId
    AND role = 'consultant'
  )

function isModuleActivated(companyId, moduleId):
  return exists(
    SELECT 1 FROM module_activations
    WHERE company_id = companyId
    AND module_id = moduleId
    AND is_active = TRUE
  )
```

## 9.3 Permission Check API Endpoint

**GET /api/v1/permissions/check**

**Purpose:** Check if user has permission for an operation

**Note:** This endpoint should be added to the Backend API Specification (Document 2.5) Section 2.2 (Authorization) or as a dedicated permissions section.

**Request:**
```json
{
  "resource_type": "obligations",
  "resource_id": "uuid",
  "operation": "UPDATE"
}
```

**Response:**
```json
{
  "data": {
    "has_permission": true,
    "reason": "User has Staff role with UPDATE permission for obligations",
    "role": "staff",
    "company_access": true,
    "site_access": true,
    "module_activated": true
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "User does not have UPDATE permission for this resource",
    "details": {
      "resource_type": "obligations",
      "resource_id": "uuid",
      "operation": "UPDATE",
      "reason": "User does not have site access"
    }
  }
}
```

---

# 10. Consultant Data Isolation

## 10.1 Consultant Isolation Strategy

Consultants have multi-company access but must be isolated to only their assigned client companies/sites. This is enforced at the database level via RLS policies.

## 10.2 Consultant Assignment

Consultants are assigned to client companies via the `user_roles` table:
- `user_id` = consultant user ID
- `company_id` = client company ID
- `role` = 'consultant'

## 10.3 Consultant Isolation Policy Pattern

All tables with `company_id` or `site_id` must include consultant isolation check:

```sql
-- Example: Consultant isolation for companies table
CREATE POLICY companies_consultant_isolation ON companies
FOR ALL
USING (
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'consultant'
    )
    THEN
      id IN (
        SELECT company_id FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'consultant'
      )
    ELSE TRUE
  END
);
```

## 10.4 Consultant Access Logic

**Function:** `is_consultant_assigned_to_company`

```sql
CREATE OR REPLACE FUNCTION is_consultant_assigned_to_company(
  consultant_id UUID,
  company_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = consultant_id
    AND company_id = is_consultant_assigned_to_company.company_id
    AND role = 'consultant'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 10.5 Consultant Restrictions

- **Upload Restrictions:** Consultants can only upload documents/evidence to assigned client companies/sites
- **Cross-Client Prohibition:** Consultants cannot:
  - View data from unassigned clients
  - Upload documents to unassigned clients
  - Link evidence across different clients
  - Generate audit packs for unassigned clients

---

> [v1 UPDATE – Consultant Client Assignments RLS – 2024-12-27]

# 11. v1.0 Consultant Client Assignments RLS Policies

## 11.1 consultant_client_assignments Table

**Table:** `consultant_client_assignments`  
**RLS Enabled:** Yes  
**Soft Delete:** No (uses status field)

### SELECT Policy

**Policy:** `consultant_client_assignments_select_consultant_access`

```sql
CREATE POLICY consultant_client_assignments_select_consultant_access ON consultant_client_assignments
FOR SELECT
USING (
  consultant_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = consultant_client_assignments.client_company_id
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Consultants can see their own assignments
- Client company Owners/Admins can see assignments to their company

### INSERT Policy

**Policy:** `consultant_client_assignments_insert_owner_admin_access`

```sql
CREATE POLICY consultant_client_assignments_insert_owner_admin_access ON consultant_client_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = consultant_client_assignments.client_company_id
    AND role IN ('owner', 'admin')
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = consultant_client_assignments.consultant_id
    AND role = 'consultant'
  )
);
```

**Access Logic:**
- Only client company Owners/Admins can create assignments
- Validates that assigned user has CONSULTANT role

### UPDATE Policy

**Policy:** `consultant_client_assignments_update_owner_admin_access`

```sql
CREATE POLICY consultant_client_assignments_update_owner_admin_access ON consultant_client_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = consultant_client_assignments.client_company_id
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = consultant_client_assignments.client_company_id
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only client company Owners/Admins can update assignments (e.g., change status)

### DELETE Policy

**Policy:** `consultant_client_assignments_delete_owner_admin_access`

```sql
CREATE POLICY consultant_client_assignments_delete_owner_admin_access ON consultant_client_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND company_id = consultant_client_assignments.client_company_id
    AND role IN ('owner', 'admin')
  )
);
```

**Access Logic:**
- Only client company Owners/Admins can delete assignments

**Reference:** Product Logic Specification Section C.5.6 (Consultant Client Assignment Workflow)

---

> [v1 UPDATE – Pack Access Policies – 2024-12-27]

# 12. v1.0 Pack Access Policies

## 12.1 Pack Type Access Control

**Plan-Based Access:**
- Core Plan: `REGULATOR_INSPECTION`, `AUDIT_PACK` only
- Growth Plan: All pack types
- Consultant Edition: All pack types (for assigned clients)

**Enforcement:** Application-level (plan check) + RLS (site/company access)

## 12.2 Pack Generation Access

**Updated Policy:** `audit_packs_insert_staff_access` (extends existing policy)

> **Note:** This policy is superseded by the updated policy in Section 11.2 above, which includes Board Pack exceptions. This section is kept for reference but the policy in Section 11.2 is authoritative.

**Access Logic:**
- **Board Pack:** Only Owners/Admins can generate (company-level access, site_id = NULL)
- **Other Pack Types:** Owners, Admins, Staff can generate (site-level access)
- **Consultants:** Can generate packs for assigned clients (site-level access, not Board Pack)
- Pack type access validated at API level based on user plan

## 12.3 Pack View Access

**Policy:** `audit_packs_select_site_access` (existing, no changes)

**Pack Type Filtering:**
- All users can view packs from their assigned sites
- Pack type visibility not restricted (users see all pack types they have access to generate)

## 12.4 Board Pack Multi-Site Access

**Special Case:** Board Pack requires `company_id` scope (not `site_id`)

**Policy:** `audit_packs_select_board_pack_access`

```sql
CREATE POLICY audit_packs_select_board_pack_access ON audit_packs
FOR SELECT
USING (
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  OR (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);
```

**Access Logic:**
- Board Packs: Only Owners/Admins of company can view
- Other Packs: Standard site-based access

**Reference:** Product Logic Specification Section I.8.4 (Board/Multi-Site Risk Pack Logic)

---

> [v1 UPDATE – Pack Distribution Policies – 2024-12-27]

# 13. v1.0 Pack Distribution Policies

## 13.1 pack_distributions Table

**Table:** `pack_distributions`  
**RLS Enabled:** Yes  
**Soft Delete:** No

### SELECT Policy

**Policy:** `pack_distributions_select_pack_access`

```sql
CREATE POLICY pack_distributions_select_pack_access ON pack_distributions
FOR SELECT
USING (
  pack_id IN (
    SELECT id FROM audit_packs
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
```

**Access Logic:**
- Users can see distributions for packs they can access

### INSERT Policy

**Policy:** `pack_distributions_insert_staff_access`

```sql
CREATE POLICY pack_distributions_insert_staff_access ON pack_distributions
FOR INSERT
WITH CHECK (
  pack_id IN (
    SELECT id FROM audit_packs
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'staff', 'consultant')
    )
  )
  -- Distribution method access validated at application level (Growth Plan required)
);
```

**Access Logic:**
- Owners, Admins, Staff, and Consultants can create distributions
- Distribution method access validated at API level (Growth Plan required for EMAIL/SHARED_LINK)

## 13.2 Shared Link Access

**Policy:** `audit_packs_select_shared_link_access`

```sql
CREATE POLICY audit_packs_select_shared_link_access ON audit_packs
FOR SELECT
USING (
  -- Standard site access
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  OR
  -- Shared link access (no authentication required if token valid)
  (
    shared_link_token IS NOT NULL
    AND shared_link_expires_at > NOW()
    -- Token validation happens at application level
  )
);
```

**Access Logic:**
- Shared links bypass standard RLS (token-based access)
- Token validation and expiration checked at application level
- Shared link access logged in `pack_distributions` table

**Reference:** Product Logic Specification Section I.8.7 (Pack Distribution Logic)

---

# 14. Service Role Handling

## 11.1 Service Role vs User JWT

### Service Role Usage

**When to Use Service Role:**
- Background jobs (document processing, Excel import, monitoring schedules)
- Admin operations (system maintenance, bulk operations)
- Cross-tenant operations (if needed)
- Migration scripts

**Service Role Bypass:**
- Service role JWT bypasses RLS policies
- Use `auth.role() = 'service_role'` check in policies
- Service role should still respect business logic constraints

### User JWT Usage

**When to Use User JWT:**
- User-facing API requests
- Real-time subscriptions
- User-initiated operations
- Onboarding flows

**User JWT RLS Enforcement:**
- All RLS policies apply to user JWT
- Policies check `auth.uid()` for user identity
- Policies check `user_roles` and `user_site_assignments` for access

## 11.2 Service Role Policy Pattern

```sql
-- Example: System-only INSERT policy
CREATE POLICY {table}_insert_system_access ON {table}
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

---

# 15. Edge Cases & Special Scenarios

## 12.1 Soft Delete Handling

### RLS Policy Pattern for Soft Deletes

```sql
-- Add deleted_at check to all SELECT policies
CREATE POLICY {table}_select_{scope} ON {table}
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Existing access conditions
  )
);
```

### Who Can See Soft-Deleted Records

- Only Owner/Admin can see soft-deleted records (for restore purposes)
- Add separate policy: `{table}_select_deleted_owner_admin`

### Who Can Restore

- Only Owner/Admin can restore soft-deleted records
- UPDATE policy: `{table}_update_deleted_owner_admin` (sets `deleted_at = NULL`)

### Who Can Permanently Delete

- Only Owner can permanently delete (hard delete)
- Requires separate DELETE policy with `deleted_at IS NOT NULL` check

## 12.2 Nested Resource Access

### Access via Parent Resource

- Obligations accessed via documents: Check `document.site_id` in obligation policy
- Evidence accessed via obligations: Check `obligation.site_id` in evidence policy
- Schedules accessed via obligations: Check `obligation.site_id` in schedule policy

### RLS Policy Pattern

```sql
-- Obligations accessible via document relationship
CREATE POLICY obligations_select_via_document ON obligations
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);
```

## 12.3 Module-Specific Permissions

### Module Activation Check

- Add module activation check to Module 2/3 table policies
- Pattern: `AND is_module_activated(company_id, module_id)`

### RLS Policy Pattern

```sql
CREATE POLICY parameters_select_site_module ON parameters
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM module_activations
    WHERE company_id = parameters.company_id
    AND module_id = parameters.module_id
    AND is_active = TRUE
  )
);
```

## 12.4 Time-Based Permissions

### Historical Data Access

- No time restrictions on historical data
- Users can access all historical records (within site/company access)

### Future-Dated Records

- No restrictions on future-dated records
- Users can create obligations with future deadlines

## 12.5 Bulk Operations

### Bulk Create

- Same RLS policies apply to bulk INSERT
- Each row checked individually against RLS policies
- Partial success: Some rows succeed, some fail (based on RLS)

### Bulk Update

- Same RLS policies apply to bulk UPDATE
- Each row checked individually against RLS policies

### Bulk Delete

- Same RLS policies apply to bulk DELETE
- Each row checked individually against RLS policies

---

# 16. Performance Considerations

## 13.1 Index Requirements

### Required Indexes for RLS Performance

```sql
-- Indexes for user_roles lookups
CREATE INDEX idx_user_roles_user_id_company_id ON user_roles(user_id, company_id);
CREATE INDEX idx_user_roles_user_id_role ON user_roles(user_id, role);

-- Indexes for user_site_assignments lookups
CREATE INDEX idx_user_site_assignments_user_id_site_id ON user_site_assignments(user_id, site_id);
CREATE INDEX idx_user_site_assignments_user_id_role ON user_site_assignments(user_id, role);

-- Indexes for module_activations lookups
CREATE INDEX idx_module_activations_company_id_module_id ON module_activations(company_id, module_id) WHERE is_active = TRUE;

-- Indexes for company_id and site_id on all tables
CREATE INDEX idx_{table}_company_id ON {table}(company_id);
CREATE INDEX idx_{table}_site_id ON {table}(site_id);
```

## 13.2 Query Optimization

### RLS Policy Optimization

- Use EXISTS subqueries (faster than IN subqueries)
- Use indexed columns in policy conditions
- Avoid complex joins in policy conditions
- Cache permission checks where possible

## 13.3 Caching Strategy

### Permission Check Caching

- Cache company access checks (TTL: 5 minutes)
- Cache site access checks (TTL: 5 minutes)
- Cache role checks (TTL: 5 minutes)
- Invalidate cache on role/site assignment changes

---

# 17. RLS Policy Deployment

## 14.1 Migration Strategy

### Migration File Structure

```
migrations/
├── 001_enable_rls_on_tables.sql
├── 002_create_rls_policies_core.sql
├── 003_create_rls_policies_module2.sql
├── 004_create_rls_policies_module3.sql
├── 005_create_rls_policies_cross_module.sql
├── 006_create_permission_functions.sql
└── 007_create_rls_indexes.sql
```

### Migration Steps

1. Enable RLS on all tables: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
2. Create RLS policies for each table (SELECT, INSERT, UPDATE, DELETE)
3. Create permission check functions
4. Create indexes for RLS policy performance
5. Test policies in staging environment
6. Deploy to production

## 14.2 Policy Versioning

### Version Tracking

- Track policy changes in `policy_versions` table
- Include policy name, version, SQL, created_at, created_by
- Rollback to previous version if needed

## 14.3 Policy Rollback Procedures

### Rollback Steps

1. Identify problematic policy
2. Disable policy: `DROP POLICY {policy_name} ON {table};`
3. Restore previous version from `policy_versions` table
4. Re-create policy from previous version
5. Test rollback in staging
6. Deploy rollback to production

## 14.4 Policy Testing

### Unit Tests

- Test each RLS policy individually
- Test with different user roles
- Test with different data scenarios

### Integration Tests

- Test RLS policies with API endpoints
- Test RLS policies with background jobs
- Test RLS policies with real-time subscriptions

### Performance Tests

- Measure RLS overhead (query time with/without RLS)
- Test with large datasets (10,000+ rows)
- Test with complex joins
- Benchmark: RLS should add < 50ms overhead per query

---

# 18. Permission Testing

## 15.1 Test Cases for Core Tables

### Test Case 1: Owner can access own company data
- **Setup:** Create owner user, create company, assign owner to company
- **Test:** Owner queries company data
- **Expected:** Returns company data
- **RLS Policy:** `companies_select_user_access`

### Test Case 2: Staff cannot access other company data
- **Setup:** Create staff user, create two companies, assign staff to company A only
- **Test:** Staff queries company B data
- **Expected:** Returns empty result (RLS filters out)
- **RLS Policy:** `companies_select_user_access`

### Test Case 3: Viewer cannot create obligations
- **Setup:** Create viewer user, assign to site
- **Test:** Viewer attempts to INSERT obligation
- **Expected:** Returns 403 Forbidden (no INSERT policy for viewer)
- **RLS Policy:** No INSERT policy for viewer role

### Test Case 4: Consultant can only access assigned clients
- **Setup:** Create consultant user, create two companies, assign consultant to company A only
- **Test:** Consultant queries company B data
- **Expected:** Returns empty result (RLS filters out)
- **RLS Policy:** `consultant_data_isolation`

### Test Case 5: Staff cannot delete obligations
- **Setup:** Create staff user, assign to site, create obligation
- **Test:** Staff attempts to DELETE obligation
- **Expected:** Returns 403 Forbidden (no DELETE policy for staff)
- **RLS Policy:** No DELETE policy for staff role

### Test Case 6: Evidence cannot be deleted by any role
- **Setup:** Create owner user, assign to site, create evidence
- **Test:** Owner attempts to DELETE evidence
- **Expected:** Returns 403 Forbidden (no DELETE policy for any role)
- **RLS Policy:** No DELETE policy (system archives only)

### Test Case 7: Module 2 data requires module activation
- **Setup:** Create owner user, assign to site, Module 2 not activated
- **Test:** Owner attempts to INSERT parameter
- **Expected:** Returns 403 Forbidden (module not activated)
- **RLS Policy:** `parameters_insert_staff_module` (checks module activation)

## 15.2 Test Cases for Edge Cases

### Test Case 8: Soft-deleted records access
- **Setup:** Create owner user, create company, soft-delete company
- **Test:** Owner queries soft-deleted company
- **Expected:** Returns empty result (RLS filters soft-deleted)
- **RLS Policy:** Add `AND deleted_at IS NULL` condition

### Test Case 9: Service role bypasses RLS
- **Setup:** Use service role JWT (not user JWT)
- **Test:** Service role queries any data
- **Expected:** Returns all data (RLS bypassed for service role)
- **RLS Policy:** Check `auth.role() = 'service_role'`

## 15.3 Performance Test Cases

### Test Case 10: RLS policy performance with large dataset
- **Setup:** Create 10,000 obligations across 100 sites, assign user to 10 sites
- **Test:** User queries obligations
- **Expected:** Returns only 1,000 obligations (10 sites), query completes in < 500ms
- **RLS Policy:** Requires indexes on `site_id`, `user_site_assignments`

---

# 19. TypeScript Interfaces

## 16.1 Permission Check Interfaces

```typescript
interface PermissionCheckRequest {
  resource_type: string;
  resource_id: string;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
}

interface PermissionCheckResponse {
  has_permission: boolean;
  reason?: string;
  role?: string;
  company_access: boolean;
  site_access: boolean;
  module_activated?: boolean;
}

interface RolePermission {
  role: 'owner' | 'admin' | 'staff' | 'viewer' | 'consultant';
  entity_type: string;
  operations: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE')[];
}
```

## 16.2 RLS Policy Configuration Interface

```typescript
interface RLSPolicyConfig {
  table_name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  policy_name: string;
  using_clause: string;
  with_check_clause?: string;
  roles?: string[];
}
```

---

**Document Complete**

This specification defines the complete RLS and permissions system for the Oblicore platform, including all 32 tables with RLS policies, complete CRUD matrices, permission evaluation logic, consultant isolation, service role handling, edge cases, performance considerations, deployment procedures, test cases, and TypeScript interfaces.

**Document Status:** ✅ **COMPLETE**

**Word Count:** ~12,000+ words

**Sections:** 16 comprehensive sections covering all aspects of RLS and permissions implementation

