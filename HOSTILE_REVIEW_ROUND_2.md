# Oblicore v1.0 — Hostile Review Round 2

**Generated:** 2024-12-27  
**Review Type:** Deep Technical Review  
**Status:** 🔴 ADDITIONAL CRITICAL ISSUES FOUND

---

## Executive Summary

Round 2 review identified **5 CRITICAL technical inconsistencies** and **7 MEDIUM issues** that would cause implementation failures. These are deeper technical issues missed in Round 1.

---

## 🔴 CRITICAL TECHNICAL ISSUES

### 1. RLS Policy Blocks Board Pack Generation

**Location:** `EP_Compliance_RLS_Permissions_Rules.md` Section 11.2

**Issue:** RLS INSERT policy for `audit_packs` checks `site_id IN (SELECT site_id FROM user_site_assignments...)` but Board Pack requires `site_id = NULL`.

**Evidence:**
- **RLS Policy (line 1383-1388):**
  ```sql
  CREATE POLICY audit_packs_insert_staff_access ON audit_packs
  FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  );
  ```
- **Product Logic (line 3420):** "Board Pack MUST have `site_id = NULL`"
- **Database Schema (line 685):** CHECK constraint allows `site_id = NULL` for Board Pack

**Problem:**
- Board Pack generation will **FAIL** because RLS policy requires `site_id` to be in user's site assignments
- `NULL IN (SELECT ...)` always returns FALSE in PostgreSQL
- Board Pack cannot be inserted due to RLS violation

**Impact:** 
- **CRITICAL:** Board Pack generation completely broken
- Users cannot generate Board Packs even with Growth Plan

**Fix Required:**
```sql
CREATE POLICY audit_packs_insert_staff_access ON audit_packs
FOR INSERT
WITH CHECK (
  -- Board Pack: company_id access only (site_id = NULL)
  (pack_type = 'BOARD_MULTI_SITE_RISK' AND site_id IS NULL AND
   company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid()))
  OR
  -- All other pack types: site_id access required
  (pack_type != 'BOARD_MULTI_SITE_RISK' AND site_id IS NOT NULL AND
   site_id IN (
     SELECT site_id FROM user_site_assignments
     WHERE user_id = auth.uid()
     AND role IN ('owner', 'admin', 'staff', 'consultant')
   ))
);
```

**Also Update:**
- SELECT policy needs same fix
- UPDATE policy needs same fix
- Consultant RLS policies need Board Pack exception

---

### 2. API Request Schema Inconsistency for Board Pack

**Location:** `EP_Compliance_Backend_API_Specification.md` Section 16.2

**Issue:** Generic `/api/v1/audit-packs` endpoint requires `site_id` but Board Pack needs `site_id = NULL`.

**Evidence:**
- **API Request Schema (line 3172):**
  ```typescript
  interface CreateAuditPackRequest {
    site_id: string;  // REQUIRED
    pack_type: 'AUDIT_PACK' | 'REGULATOR_INSPECTION' | ... | 'BOARD_MULTI_SITE_RISK' | ...;
  }
  ```
- **Board Pack Endpoint (line 3359):** Uses `company_id` (not `site_id`)
- **Product Logic:** Board Pack requires `site_id = NULL`

**Problem:**
- Generic endpoint schema doesn't match Board Pack requirements
- Board Pack endpoint is separate but generic endpoint would fail validation
- TypeScript interface doesn't allow `site_id` to be optional/null

**Impact:**
- **CRITICAL:** Generic endpoint cannot generate Board Packs
- Type safety violation
- API inconsistency

**Fix Required:**
```typescript
interface CreateAuditPackRequest {
  pack_type: 'AUDIT_PACK' | 'REGULATOR_INSPECTION' | 'TENDER_CLIENT_ASSURANCE' | 'BOARD_MULTI_SITE_RISK' | 'INSURER_BROKER';
  // Board Pack: company_id required, site_id must be null
  // All other packs: site_id required, company_id derived from site
  company_id?: string;  // Required for Board Pack only
  site_id?: string;     // Required for all packs except Board Pack
  document_id?: string; // Optional for Board Pack (multi-site)
  // ... rest of fields
}
```

**Validation Logic:**
```typescript
if (pack_type === 'BOARD_MULTI_SITE_RISK') {
  if (!company_id || site_id) {
    throw new ValidationError('Board Pack requires company_id and site_id must be null');
  }
} else {
  if (!site_id) {
    throw new ValidationError('Pack type requires site_id');
  }
}
```

---

### 3. Board Pack Owner/Admin Requirement Missing from Product Logic

**Location:** `EP_Compliance_User_Workflow_Maps.md` vs `EP_Compliance_Product_Logic_Specification.md`

**Issue:** Workflow says "Board Pack requires Owner/Admin role" but Product Logic doesn't mention this requirement.

**Evidence:**
- **Workflow (line 742):** "If Board Pack and user not Owner/Admin, then display error 'Board Pack requires Owner/Admin role'"
- **Product Logic I.8.4:** No role requirement mentioned
- **API Spec (line 3350):** "Authentication: Required (Owner, Admin)" — matches workflow

**Problem:**
- Product Logic is the source of truth but missing critical requirement
- Implementation would be inconsistent
- Permission matrix doesn't reflect this restriction

**Impact:**
- **MEDIUM:** Inconsistent implementation risk
- Staff users might be able to generate Board Packs when they shouldn't

**Fix Required:**
Add to Product Logic Section I.8.4:

```markdown
**Access Requirements:**
- Plan: Growth Plan or Consultant Edition
- Role: Owner or Admin only (Staff cannot generate Board Packs)
- Rationale: Board Pack contains company-wide risk data requiring executive-level access
```

**Also Update:**
- Permission Matrix B.10.2: Add Board Pack generation restriction
- RLS Policies: Enforce Owner/Admin check for Board Pack INSERT

---

### 4. Background Job Input Schema Missing Board Pack Validation

**Location:** `EP_Compliance_Background_Jobs_Specification.md` Section 6.3

**Issue:** Background job accepts `site_id?: UUID` as optional but doesn't validate Board Pack requirements.

**Evidence:**
- **Job Input (line 2716-2719):**
  ```typescript
  interface AuditPackGenerationJobInput {
    pack_type: 'AUDIT_PACK' | 'REGULATOR_INSPECTION' | ... | 'BOARD_MULTI_SITE_RISK' | ...;
    document_id?: UUID;  // Optional
    site_id?: UUID;      // Optional — but should be required for non-Board packs
    company_id: UUID;     // Required
  }
  ```
- **Product Logic:** Board Pack requires `site_id = NULL`, all others require `site_id NOT NULL`

**Problem:**
- Job can be queued with invalid `site_id` for Board Pack
- No validation in job input schema
- Job will fail at database INSERT due to CHECK constraint

**Impact:**
- **MEDIUM:** Job failures and retries
- Poor error messages
- Wasted compute resources

**Fix Required:**
Add validation in job input:

```typescript
interface AuditPackGenerationJobInput {
  pack_type: 'AUDIT_PACK' | 'REGULATOR_INSPECTION' | 'TENDER_CLIENT_ASSURANCE' | 'BOARD_MULTI_SITE_RISK' | 'INSURER_BROKER';
  company_id: UUID;  // Always required
  site_id?: UUID;    // Required for all packs except BOARD_MULTI_SITE_RISK
  document_id?: UUID; // Optional for BOARD_MULTI_SITE_RISK
  // ... rest
}

// Validation function
function validatePackGenerationInput(input: AuditPackGenerationJobInput): void {
  if (input.pack_type === 'BOARD_MULTI_SITE_RISK') {
    if (input.site_id !== null && input.site_id !== undefined) {
      throw new ValidationError('Board Pack must have site_id = null');
    }
    if (!input.company_id) {
      throw new ValidationError('Board Pack requires company_id');
    }
  } else {
    if (!input.site_id) {
      throw new ValidationError(`${input.pack_type} requires site_id`);
    }
  }
}
```

---

### 5. Pack Download Endpoint Plan Restriction Ambiguity

**Location:** `EP_Compliance_Backend_API_Specification.md`

**Issue:** No explicit download endpoint documented. Distribution endpoints require Growth Plan, but Product Logic says "All pack types support download" for all plans.

**Evidence:**
- **Product Logic (line 3516):** "Download: All pack types, all plans (Core Plan can download Regulator Pack and Audit Pack)"
- **API Spec:** Only distribution endpoints documented (`/packs/{packId}/share`, `/packs/{packId}/distribute`)
- **Distribution Endpoints:** Require Growth Plan (line 3416, 3449)

**Problem:**
- No explicit download endpoint documented
- Unclear if download is separate from distribution
- Core Plan users might not be able to download their Regulator Pack

**Impact:**
- **MEDIUM:** Core Plan users cannot download packs
- Feature gap for Core Plan

**Fix Required:**
Add explicit download endpoint:

```markdown
## 16.12 GET /api/v1/packs/{packId}/download

**Purpose:** Download pack PDF file

**Authentication:** Required (all roles with pack access)

**Plan Requirement:** None (all plans can download their accessible packs)

**Request:**
- Method: GET
- Path Parameters:
  - `packId` (UUID, required) - Pack identifier

**Response:** 200 OK
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="pack-{packId}.pdf"
- Body: PDF file binary

**Access Control:**
- User must have access to pack's site/company
- Core Plan: Can download Regulator Pack and Audit Pack
- Growth Plan: Can download all pack types
- Consultant: Can download packs for assigned clients

**Error Codes:**
- `403 FORBIDDEN` - User doesn't have access to pack
- `404 NOT_FOUND` - Pack not found
```

---

## 🟡 MEDIUM ISSUES

### 6. Consultant Pack Generation RLS Policy Missing

**Location:** `EP_Compliance_RLS_Permissions_Rules.md`

**Issue:** RLS policies for `audit_packs` don't explicitly check consultant client assignments.

**Evidence:**
- **RLS Policy (line 1383):** Checks `site_id IN (SELECT site_id FROM user_site_assignments...)`
- **Product Logic:** Consultants access via `consultant_client_assignments` table
- **Consultant Logic:** Consultants can generate packs for assigned clients

**Problem:**
- RLS policy uses `user_site_assignments` but consultants use `consultant_client_assignments`
- Consultant pack generation might fail RLS check
- Need explicit consultant exception in RLS policies

**Fix Required:**
Update RLS policies to include consultant check:

```sql
CREATE POLICY audit_packs_insert_staff_access ON audit_packs
FOR INSERT
WITH CHECK (
  -- Regular users: site access check
  (site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'staff')
  ))
  OR
  -- Consultants: client assignment check
  (EXISTS (
    SELECT 1 FROM consultant_client_assignments
    WHERE consultant_id = auth.uid()
    AND client_company_id = company_id
    AND status = 'ACTIVE'
  ))
);
```

---

### 7. Notification Templates Missing Pack Type Context

**Location:** `EP_Compliance_Notification_Messaging_Specification.md` Section 2.9

**Issue:** Pack ready notifications don't include pack type-specific messaging.

**Evidence:**
- **Notification Templates:** Generic "Pack Ready" messages
- **Product Logic:** Each pack type has different purpose and audience
- **User Experience:** Users need context about which pack type was generated

**Problem:**
- Notifications don't differentiate between pack types
- Missing pack type-specific messaging
- Users might not understand which pack was generated

**Fix Required:**
Add pack type-specific messaging to notification templates:

```markdown
### Regulator Pack Ready Notification
**Subject:** ✅ Regulator Pack Ready: {{pack_name}}
**Body:**
Your Regulator/Inspection Pack has been generated and is ready for download.
This pack contains inspector-ready compliance evidence for regulatory inspections.

### Tender Pack Ready Notification
**Subject:** 📋 Tender Pack Ready: {{pack_name}}
**Body:**
Your Tender/Client Assurance Pack has been generated and is ready for distribution.
This pack contains a client-facing compliance summary suitable for tender submissions.

### Board Pack Ready Notification
**Subject:** 📊 Board Pack Ready: Multi-Site Compliance Summary
**Body:**
Your Board/Multi-Site Risk Pack has been generated and is ready for download.
This pack contains company-wide compliance trends and risk analysis for executive reporting.
```

---

### 8. Frontend Route Missing Board Pack Validation

**Location:** `EP_Compliance_Frontend_Routes_Component_Map.md` Section 3.7

**Issue:** Frontend route doesn't validate Board Pack requirements (Owner/Admin role, company_id).

**Evidence:**
- **Frontend Route:** `/companies/[companyId]/packs/board` exists
- **Workflow:** Validates Owner/Admin role
- **Frontend Spec:** Doesn't mention role validation or company_id requirement

**Problem:**
- Frontend might allow Staff to access Board Pack route
- Missing validation in component structure
- Inconsistent with workflow

**Fix Required:**
Add to Frontend Routes:

```markdown
### Route: `/companies/[companyId]/packs/board`

**Access:** Growth Plan, Owner/Admin role only

**Component Structure:**
```
BoardPackGenerationPage
├── RoleGuard (Owner/Admin only)
├── CompanySelector (company_id required)
├── PackConfigurationForm
│   ├── DateRangeSelector
│   ├── IncludeAllSitesToggle (always true for Board Pack)
│   └── RecipientNameInput
└── GenerateButton
```

**Validation:**
- Check user role: Must be Owner or Admin
- Check plan: Must be Growth Plan or Consultant Edition
- Validate: site_id must be null (enforced in API)
```

---

### 9. Workflow Missing Board Pack Site Validation

**Location:** `EP_Compliance_User_Workflow_Maps.md` Section 2.6

**Issue:** Workflow doesn't explicitly validate `site_id = NULL` for Board Pack.

**Evidence:**
- **Workflow (line 735):** "Board Pack: Date range, company scope (all sites), recipient name"
- **Product Logic:** Board Pack MUST have `site_id = NULL`
- **Workflow:** Doesn't mention site_id validation

**Problem:**
- Workflow incomplete
- Missing validation step
- Users might try to generate Board Pack with site_id

**Fix Required:**
Add validation step:

```markdown
7. **System:** Validates configuration
    - **If** Board Pack and user not Owner/Admin, **then** display error "Board Pack requires Owner/Admin role"
    - **If** Board Pack and site_id provided, **then** display error "Board Pack requires company-level scope (no site_id)"
    - **If** Board Pack and company_id missing, **then** display error "Board Pack requires company_id"
    - **If** no Obligations match filters, **then** display warning "No data matches your filters"
    - **Else** proceed to generation
```

---

### 10. API Endpoint Authentication Inconsistency

**Location:** `EP_Compliance_Backend_API_Specification.md` Section 16.6-16.9

**Issue:** Pack-specific endpoints have different authentication requirements than generic endpoint.

**Evidence:**
- **Generic Endpoint (line 3148):** "Authentication: Required (Owner, Admin, Staff, Consultant for assigned clients)"
- **Regulator Pack (line 3291):** "Authentication: Required (Owner, Admin, Staff)"
- **Board Pack (line 3350):** "Authentication: Required (Owner, Admin)" — different!
- **Tender/Insurer (line 3320, 3380):** "Authentication: Required (Owner, Admin, Staff)"

**Problem:**
- Inconsistent authentication requirements
- Board Pack excludes Staff (correct) but others don't
- Generic endpoint includes Consultant but pack-specific don't mention it

**Fix Required:**
Standardize authentication:

```markdown
**Authentication Requirements:**
- **Regulator Pack:** Owner, Admin, Staff (Core Plan feature)
- **Tender Pack:** Owner, Admin, Staff (Growth Plan feature)
- **Board Pack:** Owner, Admin only (executive-level access)
- **Insurer Pack:** Owner, Admin, Staff (Growth Plan feature)
- **Audit Pack:** Owner, Admin, Staff (all plans)
- **Consultant:** Can generate all pack types for assigned clients (regardless of pack-specific role requirements)
```

---

### 11. Missing Consultant Pack Generation Validation

**Location:** `EP_Compliance_Backend_API_Specification.md` Section 26.3

**Issue:** Consultant pack generation endpoint doesn't validate Board Pack requirements.

**Evidence:**
- **Consultant Endpoint (line 6593):** `POST /api/v1/consultant/clients/{clientId}/packs`
- **Request Body:** Generic pack generation request
- **Missing:** Board Pack validation (Owner/Admin role, company_id, site_id = NULL)

**Problem:**
- Consultants might be able to generate Board Packs when they shouldn't
- Missing Board Pack-specific validation
- Inconsistent with regular pack generation

**Fix Required:**
Add validation to consultant endpoint:

```markdown
**Validation:**
- Validates consultant has `ACTIVE` assignment to client company
- **If** pack_type is `BOARD_MULTI_SITE_RISK`:
  - Validates client company has Owner/Admin users (consultant cannot generate Board Pack)
  - OR: Allows consultant to generate but requires Owner/Admin approval
- Validates pack type access based on client's plan
- Returns `403 FORBIDDEN` if consultant not assigned to client
- Returns `403 FORBIDDEN` if pack type requires Owner/Admin and consultant is generating Board Pack
```

---

### 12. Background Job Error Handling Missing Board Pack Context

**Location:** `EP_Compliance_Background_Jobs_Specification.md` Section 6.3

**Issue:** Error handling doesn't account for Board Pack-specific failures.

**Evidence:**
- **Error Handling:** Generic error messages
- **Board Pack:** Has unique requirements (site_id = NULL, company_id required)
- **Error Messages:** Don't differentiate pack type failures

**Problem:**
- Poor error messages for Board Pack failures
- Difficult to debug Board Pack generation issues
- Missing pack type-specific error handling

**Fix Required:**
Add pack type-specific error handling:

```markdown
**Error Handling:**

**Board Pack Specific Errors:**
- `VALIDATION_ERROR`: "Board Pack requires company_id and site_id must be null"
- `RLS_ERROR`: "User doesn't have company-level access for Board Pack"
- `ROLE_ERROR`: "Board Pack requires Owner or Admin role"

**Other Pack Type Errors:**
- `VALIDATION_ERROR`: "Pack type requires site_id"
- `RLS_ERROR`: "User doesn't have site access"
```

---

## 📋 ACTION ITEMS

### Immediate (Before Launch)
1. ✅ Fix RLS policy for Board Pack (site_id = NULL)
2. ✅ Fix API request schema for Board Pack
3. ✅ Add Board Pack Owner/Admin requirement to Product Logic
4. ✅ Add Board Pack validation to Background Job input
5. ✅ Add explicit download endpoint

### High Priority (Before Launch)
6. ✅ Fix Consultant RLS policies for pack generation
7. ✅ Add pack type-specific notification messaging
8. ✅ Add Board Pack validation to Frontend Routes
9. ✅ Add Board Pack validation to Workflow
10. ✅ Standardize API authentication requirements
11. ✅ Add Consultant Board Pack validation
12. ✅ Improve Background Job error handling

---

## 🎯 REVIEW METHODOLOGY

**Documents Reviewed:** 7 files (deep technical review)
**Sections Reviewed:** 50+ sections
**Technical Issues Found:** 12 issues (5 critical, 7 medium)

**Review Areas:**
- ✅ RLS policy consistency
- ✅ API endpoint consistency
- ✅ Background job validation
- ✅ Workflow completeness
- ✅ Frontend route validation
- ✅ Notification templates
- ✅ Error handling

---

**Status:** 🔴 **REQUIRES IMMEDIATE FIXES**

**Critical Impact:**
- Board Pack generation **completely broken** due to RLS policy
- API inconsistencies will cause implementation failures
- Missing validations will cause runtime errors

**Next Steps:**
1. Fix RLS policies immediately
2. Fix API schemas
3. Add missing validations
4. Re-test Board Pack generation flow
5. Verify all pack types work correctly

