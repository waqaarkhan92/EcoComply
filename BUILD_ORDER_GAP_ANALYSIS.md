# Build Order Gap Analysis

**Date:** 2025-01-28  
**Purpose:** Identify missing features/components in BUILD_ORDER_AND_IMPLEMENTATION_PROMPTS.md

---

## ✅ What's Covered in Build Order

### Phase 0: Prerequisites
- ✅ Tools & accounts setup
- ✅ Environment variables
- ✅ Local development environment

### Phase 1: Foundation
- ✅ Database schema (all 36 tables)
- ✅ RLS policies (all ~111 policies)
- ✅ Helper functions
- ✅ Auth integration
- ✅ Seed data

### Phase 2: API Layer
- ✅ Authentication endpoints
- ✅ Core entity endpoints (companies, sites, users)
- ✅ Document upload endpoints
- ✅ Obligations endpoints
- ✅ Evidence endpoints
- ✅ Pagination, error handling, rate limiting

### Phase 3: AI Extraction
- ✅ OpenAI integration
- ✅ Pattern matching
- ✅ Document processing
- ✅ Confidence scoring
- ✅ Review queue items creation (low confidence)

### Phase 4: Background Jobs
- ✅ Monitoring schedule job
- ✅ Deadline alert job
- ✅ Evidence reminder job
- ✅ Document processing job
- ✅ Pack generation job

### Phase 5: Frontend Core
- ✅ Signup/Login pages
- ✅ Dashboard layout
- ✅ Document management pages
- ✅ Obligations pages

### Phase 6: Frontend Features
- ✅ Evidence management
- ✅ Pack generation UI
- ✅ Onboarding flow
- ✅ Notifications system

### Phase 7: Integration & Testing
- ✅ E2E testing
- ✅ Performance testing
- ✅ Security testing
- ✅ Deployment

### Phase 8: Module Extensions
- ✅ Module 2 (Trade Effluent)
- ✅ Module 3 (MCPD/Generators)

---

## ❌ Missing from Build Order

### 1. Consultant Control Centre (CRITICAL - Missing)

**What's Missing:**
- Consultant Dashboard implementation (multi-client aggregation)
- Client Assignment UI (assign consultant to client)
- Consultant Pack Generation UI (generate packs for clients)
- Consultant Onboarding Flow (separate from regular onboarding)
- Consultant-specific routes and navigation

**Where it should be:** Phase 6.5 (after pack generation, before Phase 7)

**Impact:** HIGH - Consultant Edition is a core v1.0 feature

**References:**
- EP_Compliance_Product_Logic_Specification.md Section C.5
- EP_Compliance_User_Workflow_Maps.md Section 2.7
- EP_Compliance_Backend_API_Specification.md Section 26
- EP_Compliance_Frontend_Routes_Component_Map.md Section 3.8

---

### 2. Review Queue UI & Workflow (HIGH PRIORITY - Missing)

**What's Missing:**
- Review Queue page/component
- Review workflow UI (side-by-side review, approve/reject/edit)
- Review Queue API endpoints implementation
- Review Queue filtering and prioritization
- Manual review completion workflow

**Where it should be:** Phase 6.6 (after notifications, before Phase 7)

**Impact:** HIGH - Review queue is critical for low-confidence obligations

**References:**
- EP_Compliance_Product_Logic_Specification.md Section A.7
- EP_Compliance_User_Workflow_Maps.md Section 2.2
- EP_Compliance_Backend_API_Specification.md Section 14
- EP_Compliance_Frontend_Routes_Component_Map.md (Review Queue routes)

---

### 3. Excel Import Feature (MEDIUM PRIORITY - Missing)

**What's Missing:**
- Excel Import UI (upload Excel, preview, confirm)
- Excel Import API endpoints implementation
- Excel Import validation and processing
- Excel Import error handling
- Excel Import background job (mentioned in Phase 4 but not detailed)

**Where it should be:** Phase 2.9 (after evidence endpoints) AND Phase 5.6 (frontend)

**Impact:** MEDIUM - Excel import is an alternative to PDF upload

**References:**
- EP_Compliance_Product_Logic_Specification.md Section B.1.2
- EP_Compliance_Backend_API_Specification.md Section 9
- EP_Compliance_Background_Jobs_Specification.md Section 4

---

### 4. Permit Renewal Reminders (MEDIUM PRIORITY - Missing)

**What's Missing:**
- Permit renewal reminder background job (mentioned but not detailed)
- Permit renewal reminder notifications
- Permit expiry tracking
- Renewal workflow

**Where it should be:** Phase 4.2.4 (after evidence reminder job)

**Impact:** MEDIUM - Important for compliance

**References:**
- EP_Compliance_Background_Jobs_Specification.md Section 2.4
- EP_Compliance_Product_Logic_Specification.md (permit renewal logic)

---

### 5. Settings & User Preferences (LOW PRIORITY - Missing)

**What's Missing:**
- User settings page (profile, preferences)
- Company settings page (billing, subscription, users)
- Site settings page (business days, notifications)
- Notification preferences UI
- Email/SMS preference toggles

**Where it should be:** Phase 6.7 (after notifications)

**Impact:** LOW - Nice to have for v1.0

**References:**
- EP_Compliance_Frontend_Routes_Component_Map.md (Settings routes)
- EP_Compliance_UI_UX_Design_System.md (Settings components)

---

### 6. Search, Filter & Export (LOW PRIORITY - Missing)

**What's Missing:**
- Advanced search implementation (full-text search)
- Filter UI components (date ranges, status, category)
- Export functionality (CSV/Excel export)
- Search/filter API endpoints

**Where it should be:** Phase 5.6 (after obligations pages) AND Phase 6.8

**Impact:** LOW - Can be added post-v1.0

**References:**
- EP_Compliance_Backend_API_Specification.md Section 6
- EP_Compliance_Frontend_Routes_Component_Map.md (Search/Filter)

---

### 7. Analytics & Compliance Score (LOW PRIORITY - Missing)

**What's Missing:**
- Compliance score calculation
- Analytics dashboard
- Compliance metrics visualization
- Trend analysis

**Where it should be:** Phase 6.9 (optional for v1.0)

**Impact:** LOW - Can be added post-v1.0

**References:**
- EP_Compliance_Product_Logic_Specification.md (compliance scoring)
- FEATURE_INVENTORY_AND_REFERENCES.md Section 20

---

### 8. Module Activation UI (MEDIUM PRIORITY - Missing)

**What's Missing:**
- Module activation UI (activate/deactivate modules)
- Module activation wizard
- Module pricing display
- Module prerequisites checking

**Where it should be:** Phase 6.10 (after pack generation)

**Impact:** MEDIUM - Users need to activate modules

**References:**
- EP_Compliance_Product_Logic_Specification.md Section E.4
- EP_Compliance_Frontend_Routes_Component_Map.md (Module activation routes)

---

### 9. Regulator Questions Feature (LOW PRIORITY - Missing)

**What's Missing:**
- Regulator questions table (exists in schema)
- Regulator questions UI
- Regulator questions API endpoints

**Where it should be:** Phase 6.11 (optional for v1.0)

**Impact:** LOW - May not be needed for v1.0

**References:**
- EP_Compliance_Database_Schema.md (regulator_questions table)
- EP_Compliance_Backend_API_Specification.md Section 27

---

### 10. Shared Link Distribution (MEDIUM PRIORITY - Missing)

**What's Missing:**
- Shared link generation UI
- Shared link access page (public route)
- Shared link expiration handling
- Shared link password protection

**Where it should be:** Phase 6.2.3 (after pack distribution)

**Impact:** MEDIUM - Growth Plan feature

**References:**
- EP_Compliance_Product_Logic_Specification.md Section I.8.7
- EP_Compliance_Backend_API_Specification.md Section 19

---

## Summary

### Critical Missing (Must Add):
1. **Consultant Control Centre** - Complete implementation (dashboard, client assignment, pack generation)
2. **Review Queue UI & Workflow** - Complete review workflow implementation

### High Priority Missing (Should Add):
3. **Excel Import** - Full implementation (UI + API + background job)
4. **Module Activation UI** - Module activation wizard and UI

### Medium Priority Missing (Nice to Have):
5. **Permit Renewal Reminders** - Detailed implementation
6. **Shared Link Distribution** - Shared link generation and access

### Low Priority Missing (Post-v1.0):
7. **Settings & User Preferences** - Settings pages
8. **Search, Filter & Export** - Advanced search and export
9. **Analytics & Compliance Score** - Analytics dashboard
10. **Regulator Questions** - Regulator questions feature

---

## Recommendation

**Add to Build Order:**
- Phase 6.5: Consultant Control Centre (CRITICAL)
- Phase 6.6: Review Queue UI & Workflow (CRITICAL)
- Phase 2.9: Excel Import API (HIGH)
- Phase 5.6: Excel Import UI (HIGH)
- Phase 6.10: Module Activation UI (HIGH)
- Phase 6.2.3: Shared Link Distribution (MEDIUM)
- Phase 4.2.4: Permit Renewal Reminders (MEDIUM)

**Total Missing Critical Features:** 2 (Consultant Control Centre, Review Queue)  
**Total Missing High Priority Features:** 2 (Excel Import, Module Activation UI)  
**Total Missing Medium Priority Features:** 2 (Shared Links, Permit Renewal)

**Build Order Completeness:** ~85% (missing 6 critical/high priority features)

