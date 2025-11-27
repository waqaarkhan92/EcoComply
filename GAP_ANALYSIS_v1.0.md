# Oblicore v1.0 — Gap Analysis Report

**Date:** 2024-12-27  
**Version:** v1.0 Launch-Ready  
**Status:** Complete Gap Analysis

---

## Executive Summary

This document identifies gaps and required updates across all documentation files to support Oblicore v1.0 launch-ready capabilities:

**New Commercial Capabilities:**
1. Regulator/Inspection Pack (included in Core plan)
2. Tender/Client Assurance Pack (included in Growth plan)
3. Board/Multi-Site Risk Pack (Growth plan only)
4. Insurer/Broker Pack (bundled with Tender pack)
5. Consultant Control Centre (separate edition)

**Scope Constraints:**
- ✗ NO new regulatory modules (EP, TE, MCPD only)
- ✗ NO semantic changes to obligations/evidence/extraction/scoring
- ✓ Append only — preserve all core EP/TE/MCPD logic
- ✓ Packs must reuse existing data only

---

## Document Categories

### Commercial Documents
- EP_Compliance_Master_Plan.md
- EP_Compliance_Pricing_Model_Explorer.md
- EP_Compliance_New_Packs_Impact_Analysis.md

### Product Logic Documents
- EP_Compliance_Product_Logic_Specification.md
- EP_Compliance_User_Workflow_Maps.md

### Technical Architecture Documents
- EP_Compliance_Technical_Architecture_Stack.md
- EP_Compliance_Database_Schema.md
- EP_Compliance_Backend_API_Specification.md
- EP_Compliance_Background_Jobs_Specification.md
- EP_Compliance_RLS_Permissions_Rules.md

### AI/Extraction Documents
- AI_Extraction_Rules_Library.md
- AI_Microservice_Prompts_Complete.md
- AI_Layer_Design_Cost_Optimization.md
- EP_Compliance_AI_Integration_Layer.md

### UX/Workflow Documents
- EP_Compliance_UI_UX_Design_System.md
- EP_Compliance_Frontend_Routes_Component_Map.md
- EP_Compliance_Onboarding_Flow_Specification.md
- EP_Compliance_Color_Palette_Reference.md
- EP_Compliance_Procore_UI_Comparison.md

### Operations Documents
- EP_Compliance_Deployment_DevOps_Strategy.md
- EP_Compliance_Testing_QA_Strategy.md
- EP_Compliance_Notification_Messaging_Specification.md

### Reference Documents
- Canonical_Dictionary.md
- EP_Compliance_Master_Build_Order.md

---

## GAP ANALYSIS TABLE

| File | Category | Priority | Gaps Identified | Required Updates |
|------|----------|----------|----------------|-----------------|
| **EP_Compliance_Master_Plan.md** | Commercial | 🔴 CRITICAL | • Pricing structure doesn't include pack-based tiers<br>• No mention of 5 pack types<br>• Consultant Control Centre not in GTM strategy<br>• ARPU calculations don't account for Growth plan upsells | • Add Section 7.1: v1.0 Pricing Tiers (Core/Growth/Consultant)<br>• Update Section 5: Solution Architecture (add pack types)<br>• Add Consultant Control Centre to Section 8: GTM Strategy<br>• Update Section 7: ARPU calculations with Growth plan<br>• Add pack value props to ICP profiles |
| **EP_Compliance_Product_Logic_Specification.md** | Product Logic | 🔴 CRITICAL | • No pack generation logic for 4 new pack types<br>• Consultant Control Centre logic missing<br>• Pack type selection logic missing<br>• Multi-site aggregation logic for Board Pack missing | • Add Section B.9: Pack Generation Logic (all 5 types)<br>• Add Section C.5: Consultant Control Centre Logic<br>• Add pack type enum definitions<br>• Add Board Pack multi-site aggregation rules<br>• Update Section I: Audit Pack Logic (extend to all packs) |
| **Canonical_Dictionary.md** | Reference | 🔴 CRITICAL | • pack_type enum incomplete (only AUDIT_PACK)<br>• Consultant entity definition missing<br>• consultant_client_assignments table missing<br>• Pack distribution fields missing | • Add pack_type enum: REGULATOR_INSPECTION, TENDER_CLIENT_ASSURANCE, BOARD_MULTI_SITE_RISK, INSURER_BROKER<br>• Add Consultant entity (Section C.1)<br>• Add consultant_client_assignments table (Section E)<br>• Extend AuditPack entity with pack-specific fields |
| **EP_Compliance_Database_Schema.md** | Technical | 🔴 CRITICAL | • audit_packs.pack_type field missing<br>• consultant_client_assignments table missing<br>• pack_distributions table missing<br>• Pack-specific fields missing from audit_packs | • ALTER audit_packs: add pack_type, recipient_type, recipient_name, purpose, distribution_method<br>• CREATE consultant_client_assignments table<br>• CREATE pack_distributions table (optional)<br>• Add indexes for pack_type queries |
| **EP_Compliance_Backend_API_Specification.md** | Technical | 🔴 CRITICAL | • No endpoints for 4 new pack types<br>• Consultant Control Centre endpoints missing<br>• Pack distribution endpoints missing<br>• Pack type filtering missing | • Add Section 16.6-16.9: Pack-specific generation endpoints<br>• Add Section 16.10: Pack Distribution Endpoints<br>• Add Section 26: Consultant Control Centre Endpoints<br>• Update Section 16: Add pack_type parameter to existing endpoints |
| **EP_Compliance_RLS_Permissions_Rules.md** | Technical | 🔴 CRITICAL | • Consultant RLS policies incomplete<br>• Pack access policies missing<br>• Pack distribution policies missing<br>• Consultant client assignment policies missing | • Add Section 10: Consultant RLS Policies<br>• Add Section 11: Pack Access Policies<br>• Add Section 12: Pack Distribution Policies<br>• Update all existing policies to handle CONSULTANT role |
| **EP_Compliance_Background_Jobs_Specification.md** | Technical | 🟡 HIGH | • Pack generation job only handles AUDIT_PACK<br>• Pack distribution job missing<br>• Consultant sync jobs missing | • Update Section 6.3: Extend to all pack types<br>• Add Section 6.4: Pack Distribution Job<br>• Add Section 6.5: Consultant Client Sync Job |
| **EP_Compliance_Notification_Messaging_Specification.md** | Technical | 🟡 HIGH | • Pack generation notifications only for AUDIT_PACK<br>• Consultant notifications missing<br>• Pack distribution notifications missing | • Add pack-specific notification templates<br>• Add Section 5.6: Consultant Notification Templates<br>• Add pack distribution notification types |
| **EP_Compliance_Frontend_Routes_Component_Map.md** | UX | 🟡 HIGH | • No routes for new pack types<br>• Consultant Control Centre routes missing<br>• Pack management routes incomplete | • Add pack generation routes (/packs/regulator, /packs/tender, etc.)<br>• Add Consultant routes (/consultant/dashboard, /consultant/clients)<br>• Add pack management routes (/packs, /packs/{id}/share) |
| **EP_Compliance_UI_UX_Design_System.md** | UX | 🟡 HIGH | • Pack UI components missing<br>• Consultant interface design missing<br>• Pack type selector component missing | • Add pack generation UI components<br>• Add consultant dashboard design<br>• Add pack type selector component<br>• Add pack sharing/distribution UI |
| **EP_Compliance_User_Workflow_Maps.md** | Product Logic | 🟡 HIGH | • Pack generation workflows only for AUDIT_PACK<br>• Consultant workflows missing<br>• Pack distribution workflows missing | • Add workflows for all 5 pack types<br>• Add Consultant Control Centre workflows<br>• Add pack distribution workflows |
| **EP_Compliance_Testing_QA_Strategy.md** | Operations | 🟢 MEDIUM | • Test cases only for AUDIT_PACK<br>• Consultant access tests incomplete<br>• Pack type tests missing | • Add test cases for all pack types<br>• Add consultant RLS test cases<br>• Add pack distribution test cases |
| **EP_Compliance_Technical_Architecture_Stack.md** | Technical | 🟢 MEDIUM | • Pack generation service architecture incomplete<br>• Consultant feature infrastructure missing | • Add pack generation service architecture<br>• Add consultant feature infrastructure |
| **EP_Compliance_Deployment_DevOps_Strategy.md** | Operations | ⚪ LOW | • Pack storage bucket configuration may need updates | • Update storage bucket config if pack-specific buckets needed |
| **EP_Compliance_Onboarding_Flow_Specification.md** | UX | 🟡 HIGH | • Consultant onboarding flow missing<br>• Pack feature onboarding missing | • Add consultant onboarding flow<br>• Add pack feature discovery in onboarding |
| **EP_Compliance_Pricing_Model_Explorer.md** | Commercial | 🟡 HIGH | • Doesn't reflect v1.0 pack-based pricing<br>• Consultant Edition pricing missing | • Update Section 1: Current Pricing Model<br>• Add Consultant Edition pricing analysis |
| **EP_Compliance_New_Packs_Impact_Analysis.md** | Commercial | 🟢 MEDIUM | • Document is analysis, not specification<br>• Needs update to reflect final decisions | • Mark as "Pre-v1.0 Analysis"<br>• Reference final v1.0 decisions |
| **AI_Extraction_Rules_Library.md** | AI | ⚪ LOW | • No changes needed (packs reuse existing data) | • No updates required |
| **AI_Microservice_Prompts_Complete.md** | AI | ⚪ LOW | • No changes needed | • No updates required |
| **AI_Layer_Design_Cost_Optimization.md** | AI | ⚪ LOW | • No changes needed | • No updates required |
| **EP_Compliance_AI_Integration_Layer.md** | AI | ⚪ LOW | • No changes needed | • No updates required |
| **EP_Compliance_Color_Palette_Reference.md** | UX | ⚪ LOW | • May need pack-specific colors | • Optional: Add pack type color coding |
| **EP_Compliance_Procore_UI_Comparison.md** | UX | ⚪ LOW | • No changes needed | • No updates required |
| **EP_Compliance_Master_Build_Order.md** | Reference | 🟡 HIGH | • Doesn't reflect v1.0 pack features<br>• Consultant features not in build order | • Update document status to reflect v1.0<br>• Add pack features to build order |

---

## Critical Dependencies

**Before implementing v1.0 features, ensure:**
- ✅ Audit pack generation is working (foundation)
- ✅ Evidence linking is complete (required for all packs)
- ✅ Multi-site support is working (required for Board Pack)
- ✅ User roles/permissions are implemented (required for Consultant features)
- ✅ Module activation logic is complete (required for pack access control)

---

## Implementation Priority

### Phase 1: Foundation (Critical Path)
1. Canonical Dictionary (add pack_type enum, consultant entities)
2. Database Schema (extend audit_packs, add consultant tables)
3. Product Logic Specification (pack generation logic)
4. RLS & Permissions Rules (consultant permissions)

### Phase 2: API & Backend
5. Backend API Specification (new endpoints)
6. Background Jobs Specification (pack generation jobs)
7. Notification & Messaging Specification (pack notifications)

### Phase 3: Frontend & UX
8. Frontend Routes & Component Map
9. UI/UX Design System
10. User Workflow Maps

### Phase 4: Commercial & Testing
11. Master Commercial Plan (pricing, positioning)
12. Testing QA Strategy (test cases)
13. Technical Architecture (if needed)
14. Onboarding Flow Specification

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
- Keep pricing simple initially (Core + Growth only)

---

## Validation

**Total Documents Requiring Updates:** 18 out of 25

**Total Estimated Effort:** 35-50 hours

**Status:** Gap analysis complete. Ready for Phase 2 (Update) implementation.

---

**END OF GAP ANALYSIS**

