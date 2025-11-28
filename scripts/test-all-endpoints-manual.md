# Manual Testing Guide for All Endpoints (Phases 2.0-2.5)

**Comprehensive testing guide for all implemented API endpoints**

---

## Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   Server should be running on `http://localhost:3000`

2. **Verify health endpoint:**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

3. **Optional: Disable email verification in Supabase** (for easier testing):
   - Go to Supabase Dashboard → Authentication → Settings → Email Auth
   - Turn OFF "Enable email confirmations"
   - Save changes

---

## Phase 2.1: Health Check

**Test:**
```bash
curl http://localhost:3000/api/v1/health
```

**Expected:** 200 OK with service statuses

---

## Phase 2.2: Authentication Endpoints

### 1. Signup

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "full_name": "Test User",
    "company_name": "Test Company"
  }'
```

**Expected:** 201 Created
- User created
- Company created
- user_roles record created (OWNER)
- module_activation created (Module 1)
- Access token returned (if email verification disabled)

**Save the `access_token` and `company_id` from response for next tests.**

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

**Expected:** 200 OK with access_token and refresh_token

### 3. Get Current User (Me)

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:** 200 OK with user details, roles, sites

### 4. Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

**Expected:** 200 OK with new tokens

### 5. Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:** 200 OK

---

## Phase 2.3: Core Entity Endpoints

### Companies

**1. Get Companies:**
```bash
curl -X GET http://localhost:3000/api/v1/companies \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**2. Get Company by ID:**
```bash
curl -X GET http://localhost:3000/api/v1/companies/COMPANY_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. Update Company:**
```bash
curl -X PUT http://localhost:3000/api/v1/companies/COMPANY_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Company Name",
    "billing_email": "newemail@example.com"
  }'
```

### Sites

**1. Create Site:**
```bash
curl -X POST http://localhost:3000/api/v1/sites \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Site",
    "address_line_1": "123 Test Street",
    "city": "London",
    "postcode": "SW1A 1AA",
    "regulator": "EA"
  }'
```

**Save the `id` from response as `SITE_ID`.**

**2. Get Sites:**
```bash
curl -X GET "http://localhost:3000/api/v1/sites?filter[regulator]=EA" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. Get Site by ID:**
```bash
curl -X GET http://localhost:3000/api/v1/sites/SITE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**4. Update Site:**
```bash
curl -X PUT http://localhost:3000/api/v1/sites/SITE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Site Name",
    "grace_period_days": 14
  }'
```

### Users

**1. Get Users:**
```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**2. Get User by ID:**
```bash
curl -X GET http://localhost:3000/api/v1/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. Create User (Invite):**
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password123",
    "full_name": "New User",
    "company_id": "COMPANY_ID"
  }'
```

**4. Update User:**
```bash
curl -X PUT http://localhost:3000/api/v1/users/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Name",
    "phone": "+44 1234567890"
  }'
```

---

## Phase 2.4: Document Upload Endpoints

### 1. Upload Document

**Create a test PDF file first:**
```bash
# Create minimal valid PDF
cat > /tmp/test.pdf << 'EOF'
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
178
%%EOF
EOF
```

**Upload:**
```bash
curl -X POST http://localhost:3000/api/v1/documents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/tmp/test.pdf" \
  -F "site_id=SITE_ID" \
  -F "document_type=PERMIT" \
  -F 'metadata={"reference_number":"EPR/AB1234CD"}'
```

**Save the `id` from response as `DOCUMENT_ID`.**

### 2. Get Documents

```bash
curl -X GET "http://localhost:3000/api/v1/documents?filter[site_id]=SITE_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Get Document by ID

```bash
curl -X GET http://localhost:3000/api/v1/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Update Document

```bash
curl -X PUT http://localhost:3000/api/v1/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Document Title",
    "reference_number": "EPR/AB1234CD-UPDATED"
  }'
```

---

## Phase 2.5: Obligations Endpoints

**Note:** Obligations are typically created by background jobs (document processing). You may need to wait for document processing or create obligations manually in the database for testing.

### 1. Get Obligations

```bash
curl -X GET "http://localhost:3000/api/v1/obligations?filter[site_id]=SITE_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Get Obligation by ID

```bash
curl -X GET http://localhost:3000/api/v1/obligations/OBLIGATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Update Obligation

```bash
curl -X PUT http://localhost:3000/api/v1/obligations/OBLIGATION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "obligation_title": "Updated Obligation Title",
    "category": "MONITORING",
    "frequency": "MONTHLY"
  }'
```

### 4. Mark Obligation as Not Applicable

```bash
curl -X PUT http://localhost:3000/api/v1/obligations/OBLIGATION_ID/mark-na \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "This obligation is not applicable to our operations"
  }'
```

---

## Using the Automated Test Script

Run the comprehensive test script:

```bash
./scripts/test-all-endpoints.sh
```

Or with custom base URL:

```bash
BASE_URL=http://localhost:3000 ./scripts/test-all-endpoints.sh
```

---

## Expected Test Results

**Phase 2.1:**
- ✅ Health check returns 200

**Phase 2.2:**
- ✅ Signup creates user, company, roles, module activation
- ✅ Login returns tokens
- ✅ Me endpoint returns user details

**Phase 2.3:**
- ✅ Get companies returns user's company
- ✅ Get/Update company works
- ✅ Create/Get/Update site works
- ✅ Get/Update users works

**Phase 2.4:**
- ✅ Upload document creates document record
- ✅ Get documents returns list
- ✅ Get/Update document works

**Phase 2.5:**
- ✅ Get obligations returns list (may be empty if no processing)
- ✅ Get/Update obligation works (if obligations exist)
- ✅ Mark not applicable works (if obligations exist)

---

## Troubleshooting

### Email Verification Blocking Tests
- **Solution:** Disable email verification in Supabase Dashboard
- **Or:** Manually verify user in Supabase Dashboard → Authentication → Users

### No Obligations for Testing
- **Solution:** Wait for document processing (background jobs)
- **Or:** Create test obligations manually in database
- **Or:** Skip obligation-specific tests

### File Upload Fails
- **Check:** Supabase Storage bucket 'documents' exists
- **Check:** File size is under 50MB
- **Check:** File type is PDF, DOC, or DOCX

### RLS Errors
- **Check:** User has correct company_id
- **Check:** User has correct roles
- **Check:** RLS policies are enabled in database

---

**Once all tests pass, proceed to Phase 2.6: Evidence Endpoints!**

