# Multi-Site Permit Feature Audit

**Date:** 2025-12-03  
**Scope:** Actual implementation vs. designed specification  
**Method:** Examined database schema, migrations, RLS policies, backend API code, and frontend routing

---

## Executive Summary

**Verdict: B) Partially Implemented with Gaps**

The multi-site permit feature has a **complete database schema** and **RLS policies**, but **critical implementation gaps exist**:
- Backend API mentions fields but doesn't create records
- No frontend UI for user to choose shared vs replicated
- No cross-site evidence validation
- No billing enforcement logic implemented

---

## Detailed Findings

### 1. document_site_assignments Table

**Exists:** ✅ Yes

**Source Files:**
- Schema: [supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql:54-66](supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql#L54-L66)
- RLS Enable: [supabase/migrations/20250128000012_enable_rls_on_tables.sql:21](supabase/migrations/20250128000012_enable_rls_on_tables.sql#L21)
- RLS Policies: [supabase/migrations/20250128000014_create_rls_policies_module1.sql:77-144](supabase/migrations/20250128000014_create_rls_policies_module1.sql#L77-L144)

**Schema Fields:**
```sql
CREATE TABLE document_site_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    obligations_shared BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_document_site_assignments_document_id` ON (document_id)
- `idx_document_site_assignments_site_id` ON (site_id)
- Unique constraint: `uq_document_site_assignments` ON (document_id, site_id)

**RLS Policies (Lines 80-144):**
- `document_site_assignments_select_site_access` - Users can SELECT assignments for documents in their sites
- `document_site_assignments_insert_staff_access` - Staff can INSERT assignments for their sites
- `document_site_assignments_update_staff_access` - Staff can UPDATE assignments for their sites
- `document_site_assignments_delete_owner_admin_access` - Owner/Admin can DELETE assignments

**Status:** ✅ Fully implemented in database layer

---

### 2. is_primary Column

**Exists:** ✅ Yes (in schema)  
**Used:** ⚠️ Partially (mentioned but not stored)

**Source Files:**
- Schema: [supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql:58](supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql#L58)
- Backend mention: [app/api/v1/documents/[documentId]/sites/route.ts:113](app/api/v1/documents/[documentId]/sites/route.ts#L113)

**Field Definition:**
```sql
is_primary BOOLEAN NOT NULL DEFAULT false
```

**Backend Code (Lines 88-116):**
```typescript
// Lines 88-97: Updates documents table (NOT document_site_assignments)
const { data: updatedDocument, error: updateError } = await supabaseAdmin
  .from('documents')
  .update({
    site_id: body.site_id,  // Only updates primary site_id
    updated_at: new Date().toISOString(),
  })
  .eq('id', documentId)
  .select('id, site_id, updated_at')
  .single();

// Lines 109-116: Returns is_primary in response but never stores it
const response = successResponse(
  {
    document_id: documentId,
    site_id: body.site_id,
    is_primary: body.is_primary || false,  // ⚠️ NOT STORED ANYWHERE
    obligations_shared: body.obligations_shared !== false,
    created_at: updatedDocument.updated_at,
  },
  201,
  { request_id: requestId }
);
```

**Gap:**
- API accepts `is_primary` in request body
- API returns `is_primary` in response
- **BUT:** No INSERT/UPDATE to `document_site_assignments` table
- Value is lost after response sent

**Status:** ❌ Schema exists, but not used in implementation

---

### 3. obligations_shared Column

**Exists:** ✅ Yes (in schema)  
**Used:** ⚠️ Partially (mentioned but not stored)

**Source Files:**
- Schema: [supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql:59](supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql#L59)
- Backend mention: [app/api/v1/documents/[documentId]/sites/route.ts:114](app/api/v1/documents/[documentId]/sites/route.ts#L114)
- Spec reference: [docs/specs/62_Frontend_User_Workflows.md:1357-1367](docs/specs/62_Frontend_User_Workflows.md#L1357-L1367)

**Field Definition:**
```sql
obligations_shared BOOLEAN NOT NULL DEFAULT false
```

**Backend Code (Line 114):**
```typescript
obligations_shared: body.obligations_shared !== false,  // ⚠️ NOT STORED ANYWHERE
```

**Spec Design (Lines 1357-1367):**
```
14. **System:** Sets `obligations_shared` flag and creates Obligations
    - Sets `document_site_assignments.obligations_shared = true` if user chose "Shared"
    - Sets `document_site_assignments.obligations_shared = false` if user chose "Replicated"
    - **If** `obligations_shared = true`:
      - Creates one Obligation record per condition extracted
      - Links Obligation to Document (not site-specific)
      - Evidence can be linked from any site in `document_site_assignments`
    - **If** `obligations_shared = false`:
      - Creates separate Obligation records for each Site
      - Links each Obligation to Document and specific Site
      - Evidence must be linked from same Site as Obligation
```

**Gap:**
- Same issue as `is_primary`
- API accepts and returns value, but doesn't persist it
- **Critical:** No logic to create shared vs replicated obligations

**Status:** ❌ Schema exists, spec designed, but NOT implemented

---

### 4. Foreign Key Relationships

**Exists:** ✅ Yes

**Source:** [supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql:54-66](supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql#L54-L66)

**Foreign Keys:**
```sql
document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
```

**Related Table Queries:**
- [app/api/v1/sites/[siteId]/documents/route.ts:74-76](app/api/v1/sites/[siteId]/documents/route.ts#L74-L76) - Queries FROM document_site_assignments
```typescript
let query = supabaseAdmin
  .from('document_site_assignments')
  .select(`
    documents (
      id,
      // ... other fields
    )
  `)
```

**Obligations Table:**
- [supabase/migrations/20250128000005_create_phase5_module1_core_tables.sql:10-12](supabase/migrations/20250128000005_create_phase5_module1_core_tables.sql#L10-L12)
```sql
document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
```

**Gap:**
- Obligations table has `site_id` (always required)
- **No reference** to `document_site_assignments` table
- Cannot determine if obligation is shared vs replicated

**Status:** ✅ FKs exist, but ⚠️ obligations table doesn't link to document_site_assignments

---

### 5. UI Flow: Shared vs Replicated Selection

**Exists:** ❌ No

**Searched Files:**
- [app/dashboard/documents/upload/page.tsx:1-278](app/dashboard/documents/upload/page.tsx#L1-L278)
- [app/dashboard/evidence/upload/page.tsx](app/dashboard/evidence/upload/page.tsx)
- [app/dashboard/sites/[siteId]/module-2/consents/upload/page.tsx](app/dashboard/sites/[siteId]/module-2/consents/upload/page.tsx)
- [app/dashboard/sites/[siteId]/module-3/registrations/upload/page.tsx](app/dashboard/sites/[siteId]/module-3/registrations/upload/page.tsx)

**Upload UI Code (Lines 214-232):**
```typescript
{/* Site Selection */}
<div>
  <label className="block text-sm font-medium text-text-primary mb-2">
    Site <span className="text-danger">*</span>
  </label>
  <select
    value={formData.site_id}
    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
    required
    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
  >
    <option value="">Select a site</option>
    {sites.map((site) => (
      <option key={site.id} value={site.id}>
        {site.name}
      </option>
    ))}
  </select>
</div>
```

**Gap:**
- UI only allows selecting **one site**
- No UI for selecting multiple sites
- No prompt: "Should obligations be replicated per site or shared?"
- No radio buttons or checkboxes for shared/replicated choice

**Spec Design (Lines 1350-1356):**
```
11. **User:** Selects additional Sites
    - Checkbox list of Company's other Sites
    - Sets `is_primary = true` for first selected Site
    - Sets `is_primary = false` for all other sites
    - Prompts: "Should obligations be replicated per site or shared?"
```

**Status:** ❌ Not implemented - UI doesn't support multi-site selection

---

### 6. Billing Enforcement Logic

**Exists:** ❌ No

**Search Results:**
- Billing logic found in **specs only** (not code):
  - [docs/specs/30_Product_Business_Logic.md](docs/specs/30_Product_Business_Logic.md)
  - [docs/specs/22_Database_Canonical_Dictionary.md](docs/specs/22_Database_Canonical_Dictionary.md)
- No actual billing calculation code found in `lib/` directory
- No Stripe integration code found

**Spec Design (Section 10.4.2):**
```
Multi-Site Permits (£49/permit/site pair, Growth+ only)
- Core tier: 1 permit per site (no multi-site support)
- Growth/Consultant tiers: Enable multi-site permits
- Charge £49 per additional site for shared permits
```

**Searched Patterns:**
- `stripe` - Found only in prompts/i18n config (not billing code)
- `billing` - Found only in companies table field
- `calculateBilling` - Not found
- `multi.*site.*bill` - Found only in specs

**Gap:**
- No code to enforce tier restrictions (Core vs Growth)
- No code to calculate £49/site charge
- No Stripe integration for multi-site billing

**Status:** ❌ Not implemented - only designed in specs

---

### 7. Cross-Site Evidence Validation

**Exists:** ❌ No

**Source File:** [app/api/v1/evidence/[evidenceId]/link/route.ts:43-76](app/api/v1/evidence/[evidenceId]/link/route.ts#L43-L76)

**Current Implementation (Lines 43-76):**
```typescript
// Verify evidence exists and user has access
const { data: evidence, error: evidenceError } = await supabaseAdmin
  .from('evidence')
  .select('id, site_id, company_id, enforcement_status')
  .eq('id', evidenceId)
  .is('deleted_at', null)
  .single();

// Verify obligation exists and user has access
const { data: obligation, error: obligationError } = await supabaseAdmin
  .from('obligations')
  .select('id, site_id, company_id')
  .eq('id', obligation_id)
  .is('deleted_at', null)
  .single();

// ⚠️ NO SITE VALIDATION HERE
// Creates link regardless of site mismatch
const { data: link, error: linkError } = await supabaseAdmin
  .from('evidence_obligation_links')
  .insert({
    evidence_id: evidenceId,
    obligation_id: obligation_id,
    linked_by: user.id,
    linked_at: new Date().toISOString(),
  })
```

**Gap:**
- No check if `evidence.site_id === obligation.site_id`
- No check for multi-site permits with `obligations_shared = true`
- Allows linking evidence from Site A to obligation from Site B

**Spec Design (Line 1377):**
```
**Cross-Site Evidence Linking Attempted:** Error displayed; evidence must be 
linked within same Site **unless both are linked to same multi-site shared 
permit (obligations_shared = true)**
```

**Expected Logic:**
```typescript
// Should validate:
if (evidence.site_id !== obligation.site_id) {
  // Check if obligation belongs to multi-site shared permit
  const { data: assignment } = await supabaseAdmin
    .from('document_site_assignments')
    .select('obligations_shared')
    .eq('document_id', obligation.document_id)
    .eq('site_id', evidence.site_id)
    .single();
  
  if (!assignment || !assignment.obligations_shared) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Evidence must be linked to obligations from the same site',
      400
    );
  }
}
```

**Status:** ❌ Not implemented - no cross-site validation

---

## Summary Table

| Item | Schema | Backend API | Frontend UI | Validation | Status |
|------|--------|-------------|-------------|------------|--------|
| 1. document_site_assignments table | ✅ Yes | ⚠️ Partial | ❌ No | ✅ Yes (RLS) | **Partial** |
| 2. is_primary column | ✅ Yes | ⚠️ Mentioned only | ❌ No | ❌ No | **Not Used** |
| 3. obligations_shared column | ✅ Yes | ⚠️ Mentioned only | ❌ No | ❌ No | **Not Used** |
| 4. Foreign key relationships | ✅ Yes | ⚠️ Partial query | N/A | ✅ Yes (DB) | **Partial** |
| 5. UI: Shared vs Replicated | N/A | N/A | ❌ No | N/A | **Missing** |
| 6. Billing enforcement | N/A | ❌ No | N/A | ❌ No | **Missing** |
| 7. Cross-site evidence validation | N/A | ❌ No | N/A | ❌ No | **Missing** |

---

## Implementation Gaps

### Critical Gaps (Breaks Feature)

1. **Backend API doesn't persist multi-site data**
   - File: [app/api/v1/documents/[documentId]/sites/route.ts:88-116](app/api/v1/documents/[documentId]/sites/route.ts#L88-L116)
   - Issue: Accepts `is_primary` and `obligations_shared` but doesn't INSERT into `document_site_assignments`
   - Impact: Multi-site assignments are lost
   - Fix needed: Add INSERT to `document_site_assignments` table

2. **No UI for multi-site permit selection**
   - File: [app/dashboard/documents/upload/page.tsx:214-232](app/dashboard/documents/upload/page.tsx#L214-L232)
   - Issue: Only single-site dropdown, no multi-select or shared/replicated choice
   - Impact: Users cannot create multi-site permits
   - Fix needed: Add multi-site selection UI and shared/replicated radio buttons

3. **No cross-site evidence validation**
   - File: [app/api/v1/evidence/[evidenceId]/link/route.ts:43-76](app/api/v1/evidence/[evidenceId]/link/route.ts#L43-L76)
   - Issue: Allows evidence from Site A to link to obligation from Site B
   - Impact: Data integrity violation
   - Fix needed: Add site validation with `obligations_shared` check

### Non-Critical Gaps (Missing Business Logic)

4. **No billing enforcement**
   - Impact: Cannot charge £49/site for multi-site permits
   - Fix needed: Implement tier checking and Stripe integration

5. **Obligations don't reference document_site_assignments**
   - Impact: Cannot determine if obligation is shared vs replicated
   - Fix needed: Add logic to check `obligations_shared` when creating obligations

---

## Verdict

**B) Partially Implemented with Gaps**

**What's Complete:**
- ✅ Database schema (100% designed)
- ✅ RLS policies (100% implemented)
- ✅ Foreign key relationships (enforced at DB level)

**What's Missing:**
- ❌ Backend persistence (API doesn't create records)
- ❌ Frontend UI (no multi-site selection)
- ❌ Cross-site validation (no evidence site checking)
- ❌ Billing enforcement (no tier restrictions or charges)
- ❌ Obligation creation logic (doesn't use `obligations_shared`)

**Answer to Original Question:**
> "does my saas map one permit to one site? what if my client has one permit covering more than one site?"

**Current Reality:** Your SaaS **only supports one permit per site**. The multi-site feature is **designed but not implemented**.

**What Exists:**
- Database schema supports multi-site (via `document_site_assignments` table)
- Spec documents detail the workflow

**What Doesn't Work:**
- Backend API doesn't persist multi-site assignments
- Frontend has no UI to select multiple sites
- No validation to prevent cross-site evidence linking
- No billing logic to charge for multi-site permits

**To Make It Work:** Requires implementation of items 1, 2, 3, and 5 from the gaps list above.

---

**Report Generated:** 2025-12-03  
**Methodology:** Code audit (no assumptions, only actual files examined)
