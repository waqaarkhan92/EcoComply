# Manual Testing Guide for Auth Endpoints

**How to test authentication endpoints manually**

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
   Expected: `{"data":{"status":"healthy",...}}`

---

## Test 1: Signup - Valid Request

**Request:**
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

**Expected Response:** 201 Created
```json
{
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "full_name": "Test User",
      "company_id": "uuid",
      "email_verified": false
    },
    "message": "Please check your email to verify your account before logging in."
  }
}
```

**What to Check:**
- ✅ Status code: 201
- ✅ User record created in database
- ✅ Company record created
- ✅ user_roles record created (role = 'OWNER')
- ✅ module_activation created (Module 1)
- ⚠️ If email verification is enabled, access_token may be null

---

## Test 2: Signup - Duplicate Email

**Request:**
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

**Expected Response:** 409 Conflict
```json
{
  "error": {
    "code": "ALREADY_EXISTS",
    "message": "Email already registered",
    "details": {
      "email": "This email is already registered. Please log in instead."
    }
  }
}
```

---

## Test 3: Signup - Invalid Email

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "TestPassword123",
    "full_name": "Test User",
    "company_name": "Test Company"
  }'
```

**Expected Response:** 422 Unprocessable Entity
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "email": "Must be a valid email address"
    }
  }
}
```

---

## Test 4: Signup - Weak Password

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "short",
    "full_name": "Test User",
    "company_name": "Test Company"
  }'
```

**Expected Response:** 422 Unprocessable Entity
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters",
    "details": {
      "password": "Password must be at least 8 characters long"
    }
  }
}
```

---

## Test 5: Signup - Missing Fields

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test3@example.com"
  }'
```

**Expected Response:** 422 Unprocessable Entity
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields: email, password, full_name, company_name",
    "details": {
      "missing_fields": ["password", "full_name", "company_name"]
    }
  }
}
```

---

## Test 6: Login - Valid Credentials

**Note:** If email verification is required, you may need to verify the email first.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "full_name": "Test User",
      "company_id": "uuid",
      "roles": ["OWNER"],
      "email_verified": true
    }
  }
}
```

**What to Check:**
- ✅ Status code: 200
- ✅ Access token received
- ✅ Refresh token received
- ✅ User roles included
- ✅ last_login_at updated in database

---

## Test 7: Login - Invalid Credentials

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword"
  }'
```

**Expected Response:** 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password",
    "details": {
      "error": "Invalid credentials"
    }
  }
}
```

---

## Test 8: Get Current User (Me)

**Prerequisites:** You need a valid access token from login.

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "full_name": "Test User",
    "company_id": "uuid",
    "roles": ["OWNER"],
    "sites": [],
    "email_verified": true,
    "is_active": true,
    "created_at": "2025-01-28T12:00:00Z"
  }
}
```

**What to Check:**
- ✅ Status code: 200
- ✅ User details returned
- ✅ Roles included
- ✅ Sites array included (empty for new user)

---

## Test 9: Get Current User - No Token

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Content-Type: application/json"
```

**Expected Response:** 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

## Test 10: Refresh Token

**Prerequisites:** You need a valid refresh token from login.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 86400
  }
}
```

**What to Check:**
- ✅ Status code: 200
- ✅ New access token received
- ✅ New refresh token received

---

## Test 11: Refresh Token - Invalid Token

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "invalid_token"
  }'
```

**Expected Response:** 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired refresh token"
  }
}
```

---

## Test 12: Logout

**Prerequisites:** You need a valid access token.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:** 200 OK
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Database Verification

After signup, verify in Supabase Dashboard:

1. **Check auth.users table:**
   - User should exist with email
   - Email should be unverified (if email verification enabled)

2. **Check users table:**
   - User record should exist
   - `id` should match `auth.users.id`
   - `company_id` should be set
   - `email_verified` should be false

3. **Check companies table:**
   - Company should exist
   - `name` should match signup company_name
   - `billing_email` should match signup email
   - `subscription_tier` should be 'core'

4. **Check user_roles table:**
   - Role record should exist
   - `user_id` should match user.id
   - `role` should be 'OWNER'

5. **Check module_activations table:**
   - Activation record should exist
   - `company_id` should match company.id
   - `module_id` should be Module 1
   - `status` should be 'ACTIVE'

---

## Using the Automated Test Script

Run the automated test script:

```bash
./scripts/test-auth-endpoints.sh
```

Or with custom base URL:

```bash
BASE_URL=http://localhost:3000 ./scripts/test-auth-endpoints.sh
```

---

## Troubleshooting

### Server not running
- Error: `Connection refused`
- Fix: Start server with `npm run dev`

### Email verification blocking login
- If email verification is enabled, you need to verify email before login
- Check Supabase Dashboard → Authentication → Users
- Click on user → Resend verification email (if needed)

### Database errors
- Check Supabase Dashboard → Database → Logs
- Verify all migrations are applied
- Check RLS policies are enabled

### Token issues
- Verify JWT_SECRET is set in .env.local
- Check Supabase Auth settings
- Verify token expiration settings

---

**Once all tests pass, proceed to Phase 2.3: Core Entity Endpoints!**

