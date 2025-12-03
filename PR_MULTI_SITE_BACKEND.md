# PR: Fix Multi-Site Permit Backend Persistence

## Summary

Fixes critical implementation gap where multi-site permit data (`is_primary`, `obligations_shared`) was accepted in API requests but never persisted to the database. The backend API now correctly inserts/updates records in `document_site_assignments` table and returns complete assignment state.

## Problem Statement

**Issue:** Multi-site permit feature had complete database schema but zero persistence logic.

**Root Cause:** The `POST /api/v1/documents/{documentId}/sites` endpoint:
- Accepted `is_primary` and `obligations_shared` in request body
- Returned these fields in response
- **Never INSERT/UPDATE** into `document_site_assignments` table
- Only updated `documents.site_id` (single site field)

**Impact:** Multi-site permit assignments were lost after API response sent. Feature was non-functional.

## Changes Made

### Modified Files

**File:** `app/api/v1/documents/[documentId]/sites/route.ts` (complete rewrite)

**Before:**
- 133 lines
- POST endpoint only
- No persistence to `document_site_assignments`
- Checked for duplicate site assignment but only against `documents.site_id`
- Returned fake data that was never stored

**After:**
- 412 lines
- GET, POST, DELETE endpoints
- Full CRUD operations on `document_site_assignments`
- Correct `is_primary` logic (only one primary per document)
- Returns complete assignment state

### Implementation Details

#### 1. Validation with Zod Schema

```typescript
const assignSiteSchema = z.object({
  site_id: z.string().uuid('Invalid site_id format'),
  is_primary: z.boolean().optional().default(false),
  obligations_shared: z.boolean().optional().default(false),
});
```

**Benefits:**
- Runtime type validation
- Clear error messages with field-level details
- TypeScript type inference

#### 2. GET Endpoint (New)

**Route:** `GET /api/v1/documents/{documentId}/sites`

**Purpose:** Retrieve all site assignments for a multi-site permit

**Query:**
```typescript
const { data: assignments } = await supabaseAdmin
  .from('document_site_assignments')
  .select(`
    id,
    document_id,
    site_id,
    is_primary,
    obligations_shared,
    created_at,
    updated_at,
    sites (
      id,
      name,
      company_id
    )
  `)
  .eq('document_id', documentId)
  .order('is_primary', { ascending: false })
  .order('created_at', { ascending: true });
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "uuid",
    "primary_site_id": "uuid",
    "assignments": [
      {
        "id": "uuid",
        "site_id": "uuid",
        "is_primary": true,
        "obligations_shared": false,
        "sites": {
          "id": "uuid",
          "name": "London Site"
        }
      }
    ],
    "total": 1
  }
}
```

#### 3. POST Endpoint (Fixed)

**Route:** `POST /api/v1/documents/{documentId}/sites`

**Purpose:** Assign document to additional site (creates multi-site permit)

**Request Body:**
```json
{
  "site_id": "uuid",
  "is_primary": false,
  "obligations_shared": true
}
```

**Key Logic:**

##### a) Validation
- Verifies document exists
- Verifies site exists and belongs to same company as document
- Validates UUID formats via Zod schema

##### b) is_primary Enforcement (Lines 198-235)

**Business Rule:** Only ONE site can be primary per document.

```typescript
if (body.is_primary && !isPrimarySite) {
  // User wants to make this the new primary site
  
  // 1. Unset is_primary for all existing assignments
  await supabaseAdmin
    .from('document_site_assignments')
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq('document_id', documentId);
  
  // 2. Update document.site_id to new primary
  await supabaseAdmin
    .from('documents')
    .update({
      site_id: body.site_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);
    
} else if (!body.is_primary && isPrimarySite) {
  // Cannot unset primary site as non-primary
  return errorResponse(
    ErrorCodes.VALIDATION_ERROR,
    'Cannot unset primary site. Set another site as primary first.',
    422
  );
}
```

**Edge Cases Handled:**
- Setting new primary site → Unsets old primary first
- Trying to unset current primary → Blocked with 422 error
- Creating assignment for primary site → Automatically sets `is_primary: true`

##### c) Upsert to document_site_assignments (Lines 238-262)

**Uses Postgres UPSERT** (INSERT or UPDATE if conflict):

```typescript
const { data: assignment } = await supabaseAdmin
  .from('document_site_assignments')
  .upsert(
    {
      document_id: documentId,
      site_id: body.site_id,
      is_primary: body.is_primary || isPrimarySite,
      obligations_shared: body.obligations_shared,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'document_id,site_id',  // Unique constraint
      ignoreDuplicates: false,             // Update if exists
    }
  )
  .select('id, document_id, site_id, is_primary, obligations_shared, created_at, updated_at')
  .single();
```

**Guarantees:**
- Unique constraint enforced: `(document_id, site_id)` pair must be unique
- Idempotent: Can POST same assignment multiple times safely
- Atomic: Either succeeds completely or fails completely

##### d) Return Complete State (Lines 274-288)

**Returns ALL assignments** after upsert:

```typescript
const { data: allAssignments } = await supabaseAdmin
  .from('document_site_assignments')
  .select(`
    id,
    site_id,
    is_primary,
    obligations_shared,
    sites (
      id,
      name
    )
  `)
  .eq('document_id', documentId)
  .order('is_primary', { ascending: false });
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "uuid",
      "site_id": "uuid",
      "is_primary": false,
      "obligations_shared": true
    },
    "all_assignments": [
      {
        "id": "uuid",
        "site_id": "site-1-uuid",
        "is_primary": true,
        "obligations_shared": false,
        "sites": { "id": "site-1-uuid", "name": "Primary Site" }
      },
      {
        "id": "uuid",
        "site_id": "site-2-uuid",
        "is_primary": false,
        "obligations_shared": true,
        "sites": { "id": "site-2-uuid", "name": "Secondary Site" }
      }
    ],
    "message": "Site assignment created successfully"
  }
}
```

**Benefits:**
- Frontend gets complete multi-site state in single request
- No need to make separate GET request after POST
- Easier to update UI with new state

#### 4. DELETE Endpoint (New)

**Route:** `DELETE /api/v1/documents/{documentId}/sites?site_id={siteId}`

**Purpose:** Remove a site assignment (cannot remove primary site)

**Query Parameters:**
- `site_id` (required) - UUID of site to remove

**Validation:**
- Cannot delete primary site assignment
- Must set another site as primary first

**Example:**
```bash
DELETE /api/v1/documents/abc123/sites?site_id=xyz789
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "abc123",
    "site_id": "xyz789",
    "message": "Site assignment removed successfully"
  }
}
```

## Database Schema (No Changes Required)

**Table:** `document_site_assignments`

Already exists in migration: [supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql:54-66](supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql#L54-L66)

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

CREATE UNIQUE INDEX uq_document_site_assignments 
    ON document_site_assignments(document_id, site_id);
```

**RLS Policies:** Already exist in [supabase/migrations/20250128000014_create_rls_policies_module1.sql:77-144](supabase/migrations/20250128000014_create_rls_policies_module1.sql#L77-L144)

**No migration needed** - schema is complete.

## Testing

### Manual Testing Checklist

#### 1. Create Multi-Site Assignment

```bash
# Assign document to additional site
curl -X POST http://localhost:3000/api/v1/documents/{documentId}/sites \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "site-2-uuid",
    "is_primary": false,
    "obligations_shared": true
  }'

# Expected: 201 Created, assignment persisted to DB
```

#### 2. Get All Assignments

```bash
curl -X GET http://localhost:3000/api/v1/documents/{documentId}/sites \
  -H "Authorization: Bearer {token}"

# Expected: 200 OK, returns all site assignments with site details
```

#### 3. Set New Primary Site

```bash
curl -X POST http://localhost:3000/api/v1/documents/{documentId}/sites \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "site-2-uuid",
    "is_primary": true,
    "obligations_shared": false
  }'

# Expected: 
# - Old primary site gets is_primary=false
# - New site becomes primary (is_primary=true)
# - documents.site_id updated to new primary
```

#### 4. Delete Non-Primary Assignment

```bash
curl -X DELETE "http://localhost:3000/api/v1/documents/{documentId}/sites?site_id={siteId}" \
  -H "Authorization: Bearer {token}"

# Expected: 200 OK, assignment removed
```

#### 5. Try to Delete Primary Site (Should Fail)

```bash
curl -X DELETE "http://localhost:3000/api/v1/documents/{documentId}/sites?site_id={primarySiteId}" \
  -H "Authorization: Bearer {token}"

# Expected: 422 Validation Error
# Message: "Cannot remove primary site assignment. Set another site as primary first."
```

#### 6. Try Cross-Company Assignment (Should Fail)

```bash
# Try to assign document to site from different company
curl -X POST http://localhost:3000/api/v1/documents/{documentId}/sites \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "other-company-site-uuid",
    "is_primary": false,
    "obligations_shared": true
  }'

# Expected: 403 Forbidden
# Message: "Site must belong to the same company as the document"
```

### Database Verification

```sql
-- Verify assignments persisted
SELECT 
  dsa.id,
  dsa.document_id,
  dsa.site_id,
  dsa.is_primary,
  dsa.obligations_shared,
  s.name as site_name,
  d.site_id as document_primary_site
FROM document_site_assignments dsa
JOIN sites s ON s.id = dsa.site_id
JOIN documents d ON d.id = dsa.document_id
WHERE dsa.document_id = 'your-document-uuid';

-- Expected: Rows exist with correct is_primary and obligations_shared values
```

```sql
-- Verify only one primary per document
SELECT 
  document_id,
  COUNT(*) as total_assignments,
  SUM(CASE WHEN is_primary THEN 1 ELSE 0 END) as primary_count
FROM document_site_assignments
GROUP BY document_id
HAVING SUM(CASE WHEN is_primary THEN 1 ELSE 0 END) > 1;

-- Expected: 0 rows (no documents with multiple primaries)
```

```sql
-- Verify unique constraint enforced
INSERT INTO document_site_assignments (document_id, site_id, is_primary, obligations_shared)
VALUES ('same-doc', 'same-site', false, false);

INSERT INTO document_site_assignments (document_id, site_id, is_primary, obligations_shared)
VALUES ('same-doc', 'same-site', false, false);

-- Expected: Second INSERT fails with unique constraint violation
```

## API Documentation

### Endpoints

#### GET /api/v1/documents/:documentId/sites

**Purpose:** Retrieve all site assignments for a document

**Auth:** Required (any authenticated user with access to document)

**Response:**
```json
{
  "success": true,
  "data": {
    "document_id": "string (uuid)",
    "primary_site_id": "string (uuid)",
    "assignments": [
      {
        "id": "string (uuid)",
        "document_id": "string (uuid)",
        "site_id": "string (uuid)",
        "is_primary": "boolean",
        "obligations_shared": "boolean",
        "created_at": "string (iso8601)",
        "updated_at": "string (iso8601)",
        "sites": {
          "id": "string (uuid)",
          "name": "string",
          "company_id": "string (uuid)"
        }
      }
    ],
    "total": "number"
  }
}
```

#### POST /api/v1/documents/:documentId/sites

**Purpose:** Assign document to additional site (create multi-site permit)

**Auth:** Required (Owner, Admin, or Staff role)

**Request Body:**
```json
{
  "site_id": "string (uuid, required)",
  "is_primary": "boolean (optional, default: false)",
  "obligations_shared": "boolean (optional, default: false)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "string (uuid)",
      "document_id": "string (uuid)",
      "site_id": "string (uuid)",
      "is_primary": "boolean",
      "obligations_shared": "boolean",
      "created_at": "string (iso8601)",
      "updated_at": "string (iso8601)"
    },
    "all_assignments": [
      {
        "id": "string (uuid)",
        "site_id": "string (uuid)",
        "is_primary": "boolean",
        "obligations_shared": "boolean",
        "sites": {
          "id": "string (uuid)",
          "name": "string"
        }
      }
    ],
    "message": "Site assignment created successfully"
  }
}
```

**Errors:**
- `404` - Document or site not found
- `403` - Site belongs to different company than document
- `422` - Validation error (invalid UUID, trying to unset primary, etc.)

#### DELETE /api/v1/documents/:documentId/sites

**Purpose:** Remove a site assignment

**Auth:** Required (Owner, Admin, or Staff role)

**Query Parameters:**
- `site_id` (required) - UUID of site to remove

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "document_id": "string (uuid)",
    "site_id": "string (uuid)",
    "message": "Site assignment removed successfully"
  }
}
```

**Errors:**
- `404` - Document not found
- `422` - Cannot remove primary site (validation error)

## Breaking Changes

**None.** This is a pure backend fix that:
- Uses existing database schema
- Adds new GET and DELETE endpoints (additive changes)
- Fixes POST endpoint to actually persist data (bug fix)
- Maintains backward compatibility with request/response formats

## Remaining Work (Not in This PR)

This PR **only fixes backend persistence**. Still missing:

1. **Frontend UI** - Multi-site selection interface ([app/dashboard/documents/upload/page.tsx](app/dashboard/documents/upload/page.tsx))
   - No UI to select multiple sites
   - No radio buttons for shared vs replicated obligations

2. **Cross-Site Evidence Validation** - Prevent invalid evidence linking ([app/api/v1/evidence/[evidenceId]/link/route.ts](app/api/v1/evidence/[evidenceId]/link/route.ts))
   - Currently allows evidence from Site A to link to obligation from Site B
   - Should check `obligations_shared` flag

3. **Billing Enforcement** - Multi-site permit pricing
   - No tier restrictions (Core vs Growth)
   - No £49/site charge

4. **Obligation Creation Logic** - Use `obligations_shared` flag
   - Obligations table doesn't reference `document_site_assignments`
   - Cannot determine if obligation is shared vs replicated

## References

- **Audit Report:** [MULTI_SITE_PERMIT_AUDIT.md](MULTI_SITE_PERMIT_AUDIT.md)
- **Database Schema:** [supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql](supabase/migrations/20250128000004_create_phase4_module1_document_tables.sql)
- **RLS Policies:** [supabase/migrations/20250128000014_create_rls_policies_module1.sql](supabase/migrations/20250128000014_create_rls_policies_module1.sql)
- **Spec Design:** [docs/specs/62_Frontend_User_Workflows.md:1350-1377](docs/specs/62_Frontend_User_Workflows.md#L1350-L1377)

## Conclusion

This PR fixes the **critical backend persistence gap** identified in the multi-site permit audit. The API now correctly:

✅ **Inserts/updates** rows in `document_site_assignments`  
✅ **Enforces** unique `(document_id, site_id)` constraint  
✅ **Handles** `is_primary` logic (only one primary per permit)  
✅ **Persists** `obligations_shared` setting  
✅ **Returns** complete assignment state in responses  

**Next Steps:** Frontend UI implementation to allow users to actually create multi-site permits.
