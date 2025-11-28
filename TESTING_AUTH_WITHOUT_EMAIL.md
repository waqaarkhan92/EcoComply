# Testing Auth Endpoints Without Email Access

**Problem:** Email verification is required, but you don't have access to test email addresses.

**Solution:** Disable email verification in Supabase for development, or manually verify users.

---

## Option 1: Disable Email Verification (Recommended for Development)

### Steps:

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/ekyldwgruwntrvoyjzor
   - Go to **Authentication** → **Settings** → **Email Auth**

2. **Disable Email Confirmation:**
   - Find **"Enable email confirmations"** toggle
   - **Turn it OFF** (disable email confirmation)
   - Save changes

3. **Test Signup:**
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

4. **Expected Result:**
   - User created successfully
   - **Access token and refresh token are returned** (not null)
   - You can immediately test login

5. **Test Login:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPassword123"
     }'
   ```

---

## Option 2: Manually Verify Users in Supabase Dashboard

### Steps:

1. **Signup a user** (tokens will be null)

2. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/ekyldwgruwntrvoyjzor
   - Go to **Authentication** → **Users**

3. **Find your test user:**
   - Search for the email you used
   - Click on the user

4. **Manually verify email:**
   - Look for **"Email Confirmed"** field
   - Click **"Confirm Email"** or toggle it to verified
   - Save changes

5. **Test Login:**
   - Now you can test login with that user
   - Tokens will be returned

---

## Option 3: Use Your Real Email Address

### Steps:

1. **Signup with your real email:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-real-email@gmail.com",
       "password": "TestPassword123",
       "full_name": "Your Name",
       "company_name": "Test Company"
     }'
   ```

2. **Check your email inbox:**
   - Look for verification email from Supabase
   - Click the verification link

3. **Test Login:**
   - Now you can test login
   - Tokens will be returned

---

## Option 4: Skip Full Auth Testing for Now

**You can:**
- ✅ Proceed to Phase 2.3 (Core Entity Endpoints)
- ✅ Come back to full auth testing later when email is set up
- ✅ The endpoints are implemented correctly (we've verified the code)

**What's already tested:**
- ✅ Signup creates all records correctly
- ✅ Login validates credentials correctly
- ✅ Error handling works correctly
- ✅ Database records are created properly

**What needs email verification:**
- ⚠️ Full login flow (getting tokens)
- ⚠️ Refresh token endpoint
- ⚠️ Me endpoint (with real token)

---

## Recommended Approach

**For Development:**
1. **Disable email verification** (Option 1) - fastest way to test everything
2. Test all endpoints
3. **Re-enable email verification** before production

**For Production:**
- Keep email verification enabled
- Use real email addresses
- Test with actual email verification flow

---

## Quick Test Commands (After Disabling Email Verification)

```bash
# 1. Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "full_name": "Test User",
    "company_name": "Test Company"
  }'

# 2. Login (should work immediately)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'

# 3. Get current user (use access_token from login)
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'

# 5. Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Supabase Dashboard Links

- **Project Dashboard:** https://supabase.com/dashboard/project/ekyldwgruwntrvoyjzor
- **Auth Settings:** https://supabase.com/dashboard/project/ekyldwgruwntrvoyjzor/auth/settings
- **Users List:** https://supabase.com/dashboard/project/ekyldwgruwntrvoyjzor/auth/users

---

**Recommendation:** Use Option 1 (disable email verification) for now to test everything quickly, then re-enable it later.

