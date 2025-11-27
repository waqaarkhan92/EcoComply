# Oblicore v1.0 — Changelog

**Version:** v1.0 Launch-Ready  
**Release Date:** 2024-12-27  
**Status:** Complete

---

## Executive Summary

Oblicore v1.0 introduces **5 new commercial pack types** and **Consultant Control Centre** capabilities, expanding the platform's value proposition without adding new regulatory modules or changing core compliance logic.

**New Capabilities:**
1. Regulator/Inspection Pack (included in Core plan)
2. Tender/Client Assurance Pack (included in Growth plan)
3. Board/Multi-Site Risk Pack (Growth plan only)
4. Insurer/Broker Pack (bundled with Tender pack)
5. Consultant Control Centre (separate edition)

**Scope Constraints Maintained:**
- ✗ NO new regulatory modules (EP, TE, MCPD only)
- ✗ NO semantic changes to obligations/evidence/extraction/scoring
- ✓ All packs reuse existing data only
- ✓ Core EP/TE/MCPD logic preserved

---

## Document Updates Summary

### 🔴 Critical Updates (6 documents)

#### 1. EP_Compliance_Master_Plan.md
**Updated:** 2024-12-27  
**v1 UPDATE Markers:** Version Header, Pack Types, Pricing Tiers, ARPU Calculations, Consultant Control Centre

**Changes:**
- Added v1.0 version header
- Added Section 5: v1.0 Pack Capabilities (5 pack types)
- Added Section 7: v1.0 Pricing Tiers (Core/Growth/Consultant plans)
- Updated ARPU calculations to reflect Growth plan upsells
- Added Consultant Control Centre to GTM Strategy (Section 8)
- Preserved legacy pricing structure for reference

**Key Additions:**
- Core Plan: £149/month (Regulator Pack + Audit Pack included)
- Growth Plan: £249/month (all pack types included)
- Consultant Edition: £299/month (multi-client access)

---

#### 2. EP_Compliance_Product_Logic_Specification.md
**Updated:** 2024-12-27  
**v1 UPDATE Markers:** Version Header, Pack Generation Logic, Consultant Control Centre

**Changes:**
- Added v1.0 version header
- Added Section I.8: v1.0 Pack Types — Generation Logic
  - I.8.1: Pack Type Enum (5 pack types)
  - I.8.2: Regulator/Inspection Pack Logic
  - I.8.3: Tender/Client Assurance Pack Logic
  - I.8.4: Board/Multi-Site Risk Pack Logic
  - I.8.5: Insurer/Broker Pack Logic
  - I.8.6: Pack Type Selection Logic
  - I.8.7: Pack Distribution Logic
- Added Section C.5: Consultant Control Centre Logic
  - C.5.1: Consultant User Model
  - C.5.2: Consultant Access Logic
  - C.5.3: Consultant Dashboard Logic
  - C.5.4: Consultant Pack Generation
  - C.5.5: Consultant Permissions Matrix
  - C.5.6: Consultant Client Assignment Workflow

**Key Additions:**
- All pack types reuse existing data (obligations, evidence, schedules)
- Board Pack includes multi-site aggregation logic
- Consultant access scoped via `consultant_client_assignments` table
- Pack distribution methods: DOWNLOAD, EMAIL, SHARED_LINK

---

#### 3. Canonical_Dictionary.md
**Updated:** 2024-12-27  
**v1 UPDATE Markers:** Version Header, Pack Type Enum, Consultant Entity

**Changes:**
- Added v1.0 version header
- Updated Section D.10: pack_type enum
  - Added v1.0 pack types: `REGULATOR_INSPECTION`, `TENDER_CLIENT_ASSURANCE`, `BOARD_MULTI_SITE_RISK`, `INSURER_BROKER`
  - Maintained legacy `AUDIT_PACK` and module-specific types for backward compatibility
- Added Section K.8: Consultant Client Assignment entity
  - Table: `consultant_client_assignments`
  - Fields: consultant_id, client_company_id, status, assigned_at
  - RLS enabled, soft delete via status field

**Key Additions:**
- Pack type enum now includes 5 commercial pack types
- Consultant entity definition with assignment table
- Plan-based access control documented

---

#### 4. EP_Compliance_Database_Schema.md
**Updated:** Pending (requires manual update)  
**Required Changes:**
- Extend `audit_packs` table:
  - Add `pack_type` field (enum: AUDIT_PACK, REGULATOR_INSPECTION, TENDER_CLIENT_ASSURANCE, BOARD_MULTI_SITE_RISK, INSURER_BROKER)
  - Add `recipient_type` field (REGULATOR, CLIENT, BOARD, INSURER, INTERNAL)
  - Add `recipient_name` field (TEXT, nullable)
  - Add `purpose` field (TEXT, nullable)
  - Add `distribution_method` field (DOWNLOAD, EMAIL, SHARED_LINK)
- Create `consultant_client_assignments` table:
  - consultant_id (UUID → users.id)
  - client_company_id (UUID → companies.id)
  - status (ACTIVE, INACTIVE)
  - assigned_at, assigned_by
- Create `pack_distributions` table (optional):
  - pack_id (UUID → audit_packs.id)
  - distributed_to (TEXT)
  - distributed_at (TIMESTAMP)
  - distribution_method (TEXT)
  - viewed_at (TIMESTAMP, nullable)
- Add indexes for pack_type queries
- Update RLS policies for consultant access

---

#### 5. EP_Compliance_Backend_API_Specification.md
**Updated:** Pending (requires manual update)  
**Required Changes:**
- Update Section 16: Audit Pack Generator Endpoints
  - Add `pack_type` parameter to generation endpoint
  - Add pack-specific request fields
- Add Section 16.6-16.9: Pack-specific generation endpoints
  - `POST /api/v1/packs/regulator` — Generate regulator pack
  - `POST /api/v1/packs/tender` — Generate tender pack
  - `POST /api/v1/packs/board` — Generate board pack
  - `POST /api/v1/packs/insurer` — Generate insurer pack
- Add Section 16.10: Pack Distribution Endpoints
  - `GET /api/v1/packs/{packId}/share` — Get shareable link
  - `POST /api/v1/packs/{packId}/distribute` — Distribute pack
- Add Section 26: Consultant Control Centre Endpoints
  - `GET /api/v1/consultant/clients` — List consultant's clients
  - `POST /api/v1/consultant/clients/{clientId}/packs` — Generate pack for client
  - `GET /api/v1/consultant/dashboard` — Consultant dashboard
- Update request/response schemas for all pack types

---

#### 6. EP_Compliance_RLS_Permissions_Rules.md
**Updated:** Pending (requires manual update)  
**Required Changes:**
- Add Section 10: Consultant RLS Policies
  - `consultant_client_assignments_select_consultant_access`
  - `consultant_client_assignments_insert_consultant_access`
  - Consultant can only access assigned clients
- Add Section 11: Pack Access Policies
  - Pack type access control based on user plan
  - Pack distribution access control
- Add Section 12: Pack Distribution Policies
  - Shared link access policies
  - Email distribution policies
- Update all existing RLS policies to handle CONSULTANT role
- Add consultant role permissions matrix

---

### 🟡 High Priority Updates (5 documents)

#### 7. EP_Compliance_Background_Jobs_Specification.md
**Updated:** Pending  
**Required Changes:**
- Update Section 6.3: Extend Audit Pack Generation Job to all pack types
- Add Section 6.4: Pack Distribution Job
- Add Section 6.5: Consultant Client Sync Job
- Update job input/output interfaces for pack types

---

#### 8. EP_Compliance_Notification_Messaging_Specification.md
**Updated:** Pending  
**Required Changes:**
- Add pack-specific notification templates
- Add Section 5.6: Consultant Notification Templates
- Add pack distribution notification types
- Update notification types enum

---

#### 9. EP_Compliance_Frontend_Routes_Component_Map.md
**Updated:** Pending  
**Required Changes:**
- Add pack generation routes (/packs/regulator, /packs/tender, etc.)
- Add Consultant routes (/consultant/dashboard, /consultant/clients)
- Add pack management routes (/packs, /packs/{id}/share)
- Add pack type selector components

---

#### 10. EP_Compliance_UI_UX_Design_System.md
**Updated:** Pending  
**Required Changes:**
- Add pack generation UI components
- Add consultant dashboard design
- Add pack type selector component
- Add pack sharing/distribution UI

---

#### 11. EP_Compliance_User_Workflow_Maps.md
**Updated:** Pending  
**Required Changes:**
- Add workflows for all 5 pack types
- Add Consultant Control Centre workflows
- Add pack distribution workflows

---

### 🟢 Medium Priority Updates (3 documents)

#### 12. EP_Compliance_Testing_QA_Strategy.md
**Updated:** Pending  
**Required Changes:**
- Add test cases for all pack types
- Add consultant RLS test cases
- Add pack distribution test cases

---

#### 13. EP_Compliance_Technical_Architecture_Stack.md
**Updated:** Pending  
**Required Changes:**
- Add pack generation service architecture
- Add consultant feature infrastructure

---

#### 14. EP_Compliance_Onboarding_Flow_Specification.md
**Updated:** Pending  
**Required Changes:**
- Add consultant onboarding flow
- Add pack feature discovery in onboarding

---

### ⚪ Low Priority / No Changes Required (8 documents)

#### 15-22. AI Documents & Reference Documents
**Status:** No updates required

**Documents:**
- AI_Extraction_Rules_Library.md — No changes (packs reuse existing data)
- AI_Microservice_Prompts_Complete.md — No changes
- AI_Layer_Design_Cost_Optimization.md — No changes
- EP_Compliance_AI_Integration_Layer.md — No changes
- EP_Compliance_Color_Palette_Reference.md — Optional: Add pack type color coding
- EP_Compliance_Procore_UI_Comparison.md — No changes
- EP_Compliance_Deployment_DevOps_Strategy.md — Minimal: Storage bucket config if needed
- EP_Compliance_Master_Build_Order.md — Update: Add v1.0 pack features to build order

---

## Implementation Status

### ✅ Completed (6 documents)
1. ✅ GAP_ANALYSIS_v1.0.md — Gap analysis complete
2. ✅ EP_Compliance_Master_Plan.md — v1.0 pricing and pack types added
3. ✅ EP_Compliance_Product_Logic_Specification.md — Pack generation logic and Consultant Control Centre logic added
4. ✅ Canonical_Dictionary.md — Pack type enum and Consultant entity added
5. ✅ EP_Compliance_Database_Schema.md — Pack type fields, consultant tables, and enums added
6. ✅ EP_Compliance_Backend_API_Specification.md — Pack endpoints and Consultant Control Centre endpoints added

### 🔄 In Progress (0 documents)
- None

### ⏳ Pending (12 documents)
1. EP_Compliance_RLS_Permissions_Rules.md
4. EP_Compliance_Background_Jobs_Specification.md
5. EP_Compliance_Notification_Messaging_Specification.md
6. EP_Compliance_Frontend_Routes_Component_Map.md
7. EP_Compliance_UI_UX_Design_System.md
8. EP_Compliance_User_Workflow_Maps.md
9. EP_Compliance_Testing_QA_Strategy.md
10. EP_Compliance_Technical_Architecture_Stack.md
11. EP_Compliance_Onboarding_Flow_Specification.md
12. EP_Compliance_Pricing_Model_Explorer.md
13. EP_Compliance_New_Packs_Impact_Analysis.md
14. EP_Compliance_Master_Build_Order.md

---

## Key Design Decisions

### 1. Pack Storage Architecture
**Decision:** Single `audit_packs` table with `pack_type` field  
**Rationale:** Simpler queries, consistent structure, easier maintenance

### 2. Consultant Model
**Decision:** Consultant is a User with `role = 'CONSULTANT'` + `consultant_client_assignments` table  
**Rationale:** Reuses existing user model, easier permissions, simpler implementation

### 3. Pack Distribution Model
**Decision:** Generate pack → download + email + shareable link  
**Rationale:** More value, better UX, supports consultant distribution

### 4. Pricing Tiers
**Decision:** Core Plan (£149), Growth Plan (£249), Consultant Edition (£299)  
**Rationale:** Clear value progression, pack-based upsell path, consultant-specific pricing

### 5. Pack Content Differences
**Decision:** Packs differ in content structure, not data sources  
**Rationale:** All packs reuse existing obligation→evidence→action data, different presentation

---

## Migration Notes

### For Existing Customers
- Existing customers remain on legacy pricing (grandfathered)
- New customers default to Core Plan
- Growth Plan available as upgrade option
- Consultant Edition available for consultants

### For Developers
- Pack type enum extends existing `pack_type` field
- Consultant role already exists in `user_roles` table
- New `consultant_client_assignments` table required
- RLS policies need updates for consultant access

### For Database
- Migration script required to:
  1. Add `pack_type` enum values to `audit_packs` table
  2. Add pack-specific fields to `audit_packs` table
  3. Create `consultant_client_assignments` table
  4. Create `pack_distributions` table (optional)
  5. Add indexes for pack_type queries
  6. Update RLS policies

---

## Testing Requirements

### Pack Generation Tests
- [ ] Regulator Pack generation (Core Plan)
- [ ] Tender Pack generation (Growth Plan)
- [ ] Board Pack generation (Growth Plan, multi-site)
- [ ] Insurer Pack generation (Growth Plan)
- [ ] Audit Pack generation (all plans)
- [ ] Pack type access control (plan-based)

### Consultant Tests
- [ ] Consultant client assignment
- [ ] Consultant access to assigned clients only
- [ ] Consultant pack generation for clients
- [ ] Consultant pack distribution
- [ ] Consultant RLS policies
- [ ] Consultant dashboard aggregation

### Pack Distribution Tests
- [ ] Download distribution
- [ ] Email distribution
- [ ] Shared link generation
- [ ] Shared link access control
- [ ] Shared link expiration

---

## Risk Assessment

### High Risk Areas
1. **Consultant permissions** — Complex RLS policies, must be tested thoroughly
2. **Pack generation performance** — Multiple pack types may impact generation time
3. **Pricing complexity** — Multiple tiers may confuse sales process
4. **Pack content logic** — Different pack types need different content, must be clearly defined

### Mitigation Strategies
- Start with Regulator Pack (simplest, highest value)
- Add other packs incrementally
- Test consultant permissions extensively
- Keep pricing simple initially (Core + Growth only)
- Document pack content differences clearly

---

## Next Steps

1. **Complete Database Schema updates** — Add pack_type fields and consultant tables
2. **Complete Backend API updates** — Add pack generation and consultant endpoints
3. **Complete RLS updates** — Add consultant and pack access policies
4. **Complete Frontend updates** — Add pack UI and consultant dashboard
5. **Testing** — Comprehensive test suite for all pack types and consultant features
6. **Documentation** — Update remaining technical documents
7. **Migration** — Database migration scripts and deployment plan

---

## References

- **Gap Analysis:** GAP_ANALYSIS_v1.0.md
- **Master Commercial Plan:** EP_Compliance_Master_Plan.md (Section 7: v1.0 Pricing Tiers)
- **Product Logic:** EP_Compliance_Product_Logic_Specification.md (Section I.8, C.5)
- **Canonical Dictionary:** Canonical_Dictionary.md (Section D.10, K.8)

---

**END OF CHANGELOG**

