# Oblicore - New Pack Types Impact Analysis

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Date:** 2024  
**Feature Addition:** 5 New Pack Types + Consultant Control Centre  
**Status:** Pre-v1.0 Impact Analysis (Finalized in v1.0)

> [v1 UPDATE – Status Update – 2024-12-27]

**Note:** This document represents the pre-v1.0 impact analysis. Final v1.0 decisions are documented in:
- Master Commercial Plan (Section 7: v1.0 Pricing Tiers)
- Product Logic Specification (Section I.8, C.5)
- Database Schema (Section 4.8-4.10)
- Backend API Specification (Section 16, 26)

---

## Executive Summary

Adding these 5 pack types and Consultant Control Centre will require updates to **12 out of 16 core documents**. This is a significant feature addition that touches pricing, data model, API, permissions, and business logic.

**Impact Level:** 🔴 **HIGH** - Requires comprehensive updates across multiple documents

---

## Documents Requiring Updates

### 🔴 CRITICAL UPDATES (Must Update)

#### 1. **Master Commercial Plan (MCP)** ⚠️ **CRITICAL**

**Why:** Pricing structure, value proposition, ICP positioning, ARPU calculations

**Required Changes:**
- Add new pricing tiers:
  - Base Plan: Module 1 + Regulator Pack (included)
  - Pro Plan: Base + Tender Pack + Board Pack + Insurer Pack
  - Consultant Edition: Separate pricing model
- Update ARPU calculations to reflect pack-based upsells
- Add pack types to value proposition
- Update ICP profiles to reflect pack benefits
- Add Consultant Control Centre as distribution channel

**Sections to Update:**
- Section 5: Solution Architecture (add pack types)
- Section 6: Pricing Structure (new tiers)
- Section 7: Revenue Model (ARPU calculations)
- Section 3: ICP Definition (pack benefits per ICP)

---

#### 2. **Product Logic Specification (PLS)** ⚠️ **CRITICAL**

**Why:** Business logic for pack generation, pack types, consultant features

**Required Changes:**
- Add Section B.9: Pack Generation Logic
  - Regulator/Inspection Pack logic
  - Tender/Client Assurance Pack logic
  - Board/Multi-site Risk Pack logic
  - Insurer/Broker Pack logic
  - Pack type selection logic
- Add Section C.5: Consultant Control Centre Logic
  - Consultant user model
  - Client assignment logic
  - Consultant-specific permissions
  - Multi-client pack generation
- Update Section B.8: Audit Pack Logic (extend to all pack types)
- Add pack type enum definitions
- Add pack generation triggers
- Add pack sharing/distribution logic

**New Sections Needed:**
- B.9.1: Regulator Pack Generation
- B.9.2: Tender Pack Generation
- B.9.3: Board Pack Generation
- B.9.4: Insurer Pack Generation
- B.9.5: Pack Type Selection Logic
- C.5: Consultant Control Centre (complete section)

---

#### 3. **Canonical Dictionary** ⚠️ **CRITICAL**

**Why:** New entities, enums, field definitions

**Required Changes:**
- Add pack_type enum:
  - `REGULATOR_INSPECTION`
  - `TENDER_CLIENT_ASSURANCE`
  - `BOARD_MULTI_SITE_RISK`
  - `INSURER_BROKER`
  - `AUDIT_PACK` (existing)
- Update audit_packs table definition:
  - Add `pack_type` field
  - Add pack-specific fields (recipient, purpose, etc.)
- Add Consultant entity definition
- Add consultant_client_assignments table
- Add consultant_pack_distributions table (if needed)
- Update user roles to include consultant-specific permissions

**Sections to Update:**
- Section B.10: AuditPack entity (extend to all pack types)
- Section C.1: New Consultant entity
- Section D: Enums (add pack_type enum)
- Section E: Tables (add consultant-related tables)

---

#### 4. **Database Schema (2.2)** ⚠️ **CRITICAL**

**Why:** New tables, fields, indexes, constraints

**Required Changes:**
- Update `audit_packs` table:
  ```sql
  ALTER TABLE audit_packs 
  ADD COLUMN pack_type TEXT NOT NULL DEFAULT 'AUDIT_PACK'
    CHECK (pack_type IN ('AUDIT_PACK', 'REGULATOR_INSPECTION', 'TENDER_CLIENT_ASSURANCE', 'BOARD_MULTI_SITE_RISK', 'INSURER_BROKER'));
  
  ADD COLUMN recipient_type TEXT CHECK (recipient_type IN ('REGULATOR', 'CLIENT', 'BOARD', 'INSURER', 'INTERNAL'));
  ADD COLUMN recipient_name TEXT;
  ADD COLUMN purpose TEXT;
  ADD COLUMN distribution_method TEXT CHECK (distribution_method IN ('DOWNLOAD', 'EMAIL', 'SHARED_LINK'));
  ```
- Add `consultant_client_assignments` table:
  ```sql
  CREATE TABLE consultant_client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES users(id),
    client_company_id UUID NOT NULL REFERENCES companies(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    UNIQUE(consultant_id, client_company_id)
  );
  ```
- Add `pack_distributions` table (if tracking needed):
  ```sql
  CREATE TABLE pack_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES audit_packs(id),
    distributed_to TEXT NOT NULL,
    distributed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    distribution_method TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE
  );
  ```
- Add indexes for pack type queries
- Update RLS policies for consultant access

**Sections to Update:**
- Section 4.8: audit_packs table (extend)
- New Section 4.9: consultant_client_assignments table
- New Section 4.10: pack_distributions table (if needed)
- Section 9: Indexes (add pack_type indexes)
- Section 10: RLS Policies (add consultant policies)

---

#### 5. **Backend API Specification (2.5)** ⚠️ **CRITICAL**

**Why:** New endpoints, request/response schemas

**Required Changes:**
- Update Section 16: Audit Pack Generator Endpoints
  - Add `pack_type` parameter to generation endpoint
  - Add pack-specific request fields
- Add new endpoints:
  - `POST /api/v1/packs/regulator` - Generate regulator pack
  - `POST /api/v1/packs/tender` - Generate tender pack
  - `POST /api/v1/packs/board` - Generate board pack
  - `POST /api/v1/packs/insurer` - Generate insurer pack
  - `GET /api/v1/packs` - List all pack types
  - `GET /api/v1/packs/{packId}/share` - Get shareable link
  - `POST /api/v1/packs/{packId}/distribute` - Distribute pack
- Add Consultant Control Centre endpoints:
  - `GET /api/v1/consultant/clients` - List consultant's clients
  - `POST /api/v1/consultant/clients/{clientId}/packs` - Generate pack for client
  - `GET /api/v1/consultant/dashboard` - Consultant dashboard
- Update request/response schemas for all pack types
- Add pack type filtering to list endpoints

**Sections to Update:**
- Section 16: Audit Pack Generator Endpoints (extend)
- New Section 16.6-16.9: Pack-specific endpoints
- New Section 16.10: Pack Distribution Endpoints
- New Section 26: Consultant Control Centre Endpoints

---

#### 6. **RLS & Permissions Rules (2.8)** ⚠️ **CRITICAL**

**Why:** Consultant permissions, pack access control

**Required Changes:**
- Add consultant-specific RLS policies:
  - `consultant_client_assignments_select_consultant_access`
  - `consultant_client_assignments_insert_consultant_access`
  - Consultant can only access assigned clients
  - Consultant can generate packs for assigned clients
- Add pack distribution policies:
  - Who can view shared packs
  - Who can distribute packs
  - Pack sharing link access
- Update existing policies to include pack_type filtering
- Add consultant role permissions matrix

**Sections to Update:**
- Section 4: Consultant Permissions (new section)
- Section 5: Pack Access Policies (new section)
- Section 6: Pack Distribution Policies (new section)
- Update all existing RLS policies to handle consultant role

---

### 🟡 HIGH PRIORITY UPDATES (Should Update)

#### 7. **Background Jobs Specification (2.3)** 🟡 **HIGH**

**Why:** Pack generation jobs, consultant notification jobs

**Required Changes:**
- Update Section 3.3: Audit Pack Generation Job
  - Extend to handle all pack types
  - Add pack type-specific generation logic
- Add new job types:
  - `PACK_DISTRIBUTION` - Distribute pack via email/link
  - `CONSULTANT_CLIENT_SYNC` - Sync consultant client assignments
- Update job input/output interfaces for pack types

**Sections to Update:**
- Section 3.3: Audit Pack Generation Job (extend)
- New Section 3.4: Pack Distribution Job
- New Section 6.2: Consultant Sync Jobs

---

#### 8. **Notification & Messaging Specification (2.4)** 🟡 **HIGH**

**Why:** Pack generation notifications, consultant notifications

**Required Changes:**
- Add pack generation notification templates:
  - Regulator pack ready
  - Tender pack ready
  - Board pack ready
  - Insurer pack ready
- Add consultant-specific notifications:
  - Client assigned
  - Client pack generated
  - Client activity alerts
- Add pack distribution notifications
- Update notification types enum

**Sections to Update:**
- Section 4: Notification Types (add pack notifications)
- Section 5: Notification Templates (add pack templates)
- New Section 5.6: Consultant Notification Templates

---

#### 9. **Frontend Routes & Component Map (2.6)** 🟡 **HIGH**

**Why:** New UI routes, components for packs and consultant features

**Required Changes:**
- Add pack generation routes:
  - `/packs/regulator/generate`
  - `/packs/tender/generate`
  - `/packs/board/generate`
  - `/packs/insurer/generate`
- Add pack management routes:
  - `/packs` - List all packs
  - `/packs/{packId}` - View pack
  - `/packs/{packId}/share` - Share pack
- Add Consultant Control Centre routes:
  - `/consultant/dashboard`
  - `/consultant/clients`
  - `/consultant/clients/{clientId}`
  - `/consultant/packs`
- Add pack type selection components
- Add consultant client management components

**Sections to Update:**
- Section 3: Pack Routes (new section)
- Section 4: Consultant Routes (new section)
- Section 5: Component Map (add pack components)

---

#### 10. **UI/UX Design System (2.9)** 🟡 **HIGH**

**Why:** Pack UI components, consultant interface design

**Required Changes:**
- Add pack generation UI components
- Add pack type selector component
- Add pack preview component
- Add pack sharing/distribution UI
- Add consultant dashboard design
- Add consultant client list design
- Add pack-specific color coding/branding

**Sections to Update:**
- Section 4: Components (add pack components)
- Section 5: Patterns (add pack patterns)
- New Section 6: Consultant Interface Design

---

### 🟢 MEDIUM PRIORITY UPDATES (Nice to Have)

#### 11. **Testing QA Strategy (2.11)** 🟢 **MEDIUM**

**Why:** Test cases for new pack types and consultant features

**Required Changes:**
- Add pack generation test cases (all 5 types)
- Add pack distribution test cases
- Add consultant access test cases
- Add consultant RLS test cases
- Add pack type selection tests
- Add E2E tests for pack workflows

**Sections to Update:**
- Section 4.1: API Integration Tests (add pack endpoints)
- Section 5.4: E2E Tests (add pack workflows)
- Section 8: RLS Permission Testing (add consultant tests)
- New Section 17: Pack Generation Testing

---

#### 12. **Technical Architecture & Stack (2.1)** 🟢 **MEDIUM**

**Why:** Pack generation infrastructure, consultant features

**Required Changes:**
- Add pack generation service architecture
- Add pack storage/distribution infrastructure
- Add consultant feature infrastructure
- Update storage buckets (if pack-specific buckets needed)

**Sections to Update:**
- Section 3: API Layer (add pack services)
- Section 10: Deployment Architecture (pack storage)

---

### ⚪ LOW PRIORITY (Minimal Changes)

#### 13. **Deployment & DevOps Strategy (2.12)** ⚪ **LOW**

**Why:** Minimal - just environment variables if needed

**Required Changes:**
- Add pack generation service environment variables (if any)
- Update storage bucket configuration for pack types

**Sections to Update:**
- Section 2.1: Environment Variables (if new vars needed)
- Section 3.2: Storage Buckets (add pack-specific buckets if needed)

---

#### 14. **User Workflow Maps (1.3)** ⚪ **LOW**

**Why:** New user workflows for pack generation

**Required Changes:**
- Add pack generation workflows
- Add consultant workflows
- Add pack distribution workflows

**Sections to Update:**
- New Section: Pack Generation Workflows
- New Section: Consultant Workflows

---

## Impact Summary by Document

| Document | Update Required | Priority | Complexity | Estimated Effort |
|----------|----------------|----------|------------|------------------|
| Master Commercial Plan | ✅ Yes | 🔴 Critical | Medium | 2-3 hours |
| Product Logic Specification | ✅ Yes | 🔴 Critical | High | 4-6 hours |
| Canonical Dictionary | ✅ Yes | 🔴 Critical | Medium | 2-3 hours |
| Database Schema | ✅ Yes | 🔴 Critical | High | 3-4 hours |
| Backend API Specification | ✅ Yes | 🔴 Critical | High | 4-5 hours |
| RLS & Permissions Rules | ✅ Yes | 🔴 Critical | High | 3-4 hours |
| Background Jobs Specification | ✅ Yes | 🟡 High | Medium | 2-3 hours |
| Notification & Messaging | ✅ Yes | 🟡 High | Medium | 2-3 hours |
| Frontend Routes & Component Map | ✅ Yes | 🟡 High | Medium | 2-3 hours |
| UI/UX Design System | ✅ Yes | 🟡 High | Medium | 2-3 hours |
| Testing QA Strategy | ✅ Yes | 🟢 Medium | Low | 1-2 hours |
| Technical Architecture | ✅ Yes | 🟢 Medium | Low | 1 hour |
| Deployment DevOps Strategy | ✅ Yes | ⚪ Low | Low | 30 mins |
| User Workflow Maps | ✅ Yes | ⚪ Low | Low | 1 hour |

**Total Documents Requiring Updates:** 14 out of 16

**Total Estimated Effort:** 28-40 hours

---

## Key Design Decisions Needed

### 1. Pack Storage Architecture

**Decision:** Single `audit_packs` table with `pack_type` field OR separate tables per pack type?

**Recommendation:** Single table with `pack_type` enum (simpler, easier queries, consistent structure)

**Impact:** Database Schema, Backend API, RLS Policies

---

### 2. Consultant Model

**Decision:** 
- Option A: Consultant is a User with `role = 'CONSULTANT'` + `consultant_client_assignments` table
- Option B: Separate `consultants` table

**Recommendation:** Option A (simpler, reuses existing user model, easier permissions)

**Impact:** Database Schema, RLS Policies, Backend API

---

### 3. Pack Distribution Model

**Decision:** 
- Option A: Generate pack → download only
- Option B: Generate pack → download + email + shareable link

**Recommendation:** Option B (more value, better UX, supports consultant distribution)

**Impact:** Backend API, Background Jobs, Notification & Messaging, Database Schema

---

### 4. Pricing Tiers

**Decision:** How to structure pricing with packs?

**Recommendation:**
- **Base Plan:** £149/month - Module 1 + Regulator Pack (included)
- **Pro Plan:** £249/month - Base + Tender Pack + Board Pack + Insurer Pack
- **Consultant Edition:** £299/month - Pro + Multi-client access + Client pack generation

**Impact:** Master Commercial Plan, Backend API (subscription logic)

---

### 5. Pack Content Differences

**Decision:** What's different between pack types?

**Recommendation:**
- **Regulator Pack:** All obligations + evidence + compliance status (inspection-ready)
- **Tender Pack:** Compliance summary + evidence samples + risk assessment
- **Board Pack:** Multi-site risk summary + compliance trends + key metrics
- **Insurer Pack:** Risk narrative + compliance controls + evidence overview
- **Audit Pack:** Full evidence compilation (existing)

**Impact:** Product Logic Specification, Backend API (generation logic)

---

## Implementation Order Recommendation

### Phase 1: Foundation (Critical Path)
1. Update Canonical Dictionary (add pack_type enum, consultant entities)
2. Update Database Schema (extend audit_packs, add consultant tables)
3. Update Product Logic Specification (pack generation logic)
4. Update RLS & Permissions Rules (consultant permissions)

### Phase 2: API & Backend
5. Update Backend API Specification (new endpoints)
6. Update Background Jobs Specification (pack generation jobs)
7. Update Notification & Messaging Specification (pack notifications)

### Phase 3: Frontend & UX
8. Update Frontend Routes & Component Map
9. Update UI/UX Design System

### Phase 4: Commercial & Testing
10. Update Master Commercial Plan (pricing, positioning)
11. Update Testing QA Strategy (test cases)
12. Update Technical Architecture (if needed)
13. Update Deployment DevOps Strategy (if needed)
14. Update User Workflow Maps

---

## Critical Dependencies

**Before implementing packs, ensure:**
- ✅ Audit pack generation is working (foundation)
- ✅ Evidence linking is complete (required for packs)
- ✅ Multi-site support is working (for Board Pack)
- ✅ User roles/permissions are implemented (for Consultant features)

---

## Risk Assessment

**High Risk Areas:**
1. **Consultant permissions** - Complex RLS policies, must be tested thoroughly
2. **Pack generation performance** - Multiple pack types may impact generation time
3. **Pricing complexity** - Multiple tiers may confuse sales process
4. **Pack content logic** - Different pack types need different content, must be clearly defined

**Mitigation:**
- Start with Regulator Pack (simplest, highest value)
- Add other packs incrementally
- Test consultant permissions extensively
- Keep pricing simple initially (Base + Pro only)

---

## Conclusion

**Answer:** Yes, **14 out of 16 documents** need updates. This is a significant feature addition that touches:
- Data model (new tables, fields, enums)
- Business logic (pack generation, consultant features)
- API (new endpoints)
- Permissions (consultant RLS)
- Pricing (new tiers)
- UI/UX (new interfaces)

**Recommendation:** 
1. Start with **Regulator Pack** (baked into modules) - highest impact, simplest
2. Then add **Tender Pack** (Pro plan) - high ACV impact
3. Then **Consultant Control Centre** - distribution channel
4. Then **Board Pack** and **Insurer Pack** (Pro plan) - expansion features

This phased approach minimizes risk while maximizing impact.

---

**End of Impact Analysis**

