# Multi-Site Backend Persistence Fix - Quick Summary

## What Was Broken

The `/api/v1/documents/{documentId}/sites` endpoint accepted `is_primary` and `obligations_shared` in requests but **never saved them to the database**. Multi-site permit assignments were lost.

## What's Fixed

### Single File Changed
- **File:** [app/api/v1/documents/[documentId]/sites/route.ts](app/api/v1/documents/[documentId]/sites/route.ts)
- **Lines:** 133 → 412 (complete rewrite)
- **No migrations needed** (schema already exists)

### New Functionality

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/documents/:documentId/sites` | GET | Retrieve all site assignments |
| `/api/v1/documents/:documentId/sites` | POST | Assign to additional site (FIXED) |
| `/api/v1/documents/:documentId/sites?site_id=X` | DELETE | Remove site assignment |

### Key Features

1. **Persistence Fixed**
   - Actually INSERTs/UPDATEs to `document_site_assignments` table
   - Uses Postgres UPSERT for idempotency
   - Respects unique constraint on `(document_id, site_id)`

2. **is_primary Logic**
   - Only ONE primary site per document enforced
   - Setting new primary automatically unsets old primary
   - Cannot delete primary site (blocked with 422 error)

3. **obligations_shared Storage**
   - Now correctly persisted to database
   - Returned in all responses
   - Ready for future evidence validation logic

4. **Complete State Response**
   - POST returns both created assignment AND all assignments
   - Frontend gets full multi-site state in single request
   - No need for separate GET after POST

## Example Usage

```bash
# Assign document to additional site
POST /api/v1/documents/doc-123/sites
{
  "site_id": "site-2",
  "is_primary": false,
  "obligations_shared": true
}

# Response includes complete state
{
  "success": true,
  "data": {
    "assignment": { /* newly created */ },
    "all_assignments": [
      { "site_id": "site-1", "is_primary": true, "obligations_shared": false },
      { "site_id": "site-2", "is_primary": false, "obligations_shared": true }
    ]
  }
}
```

## Verification

```bash
# Start dev server
npm run dev

# Server compiling with no TypeScript errors ✅
# Routes accessible ✅
# RLS policies already exist ✅
```

## What's NOT Fixed (Future Work)

- ❌ Frontend UI (still only single-site selection)
- ❌ Cross-site evidence validation
- ❌ Billing enforcement (£49/site charge)
- ❌ Obligation creation using `obligations_shared` flag

## Impact

**Before:** Multi-site permits were non-functional (data lost after response)  
**After:** Backend correctly persists and manages multi-site assignments

**Risk:** Low - uses existing schema, additive changes, maintains API compatibility

**Testing:** Manual testing via curl/Postman, database verification via SQL queries

---

**Full Details:** See [PR_MULTI_SITE_BACKEND.md](PR_MULTI_SITE_BACKEND.md)  
**Audit Report:** See [MULTI_SITE_PERMIT_AUDIT.md](MULTI_SITE_PERMIT_AUDIT.md)
