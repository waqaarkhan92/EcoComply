# Phase 1 Manual Verification Guide

**How to check all 4 manual verification steps in Supabase Dashboard**

---

## ✅ Step 1: Storage Buckets Verification

### How to Check:

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard
   - Select your project: `ekyldwgruwntrvoyjzor`

2. **Navigate to Storage:**
   - Click **"Storage"** in the left sidebar
   - You should see a list of buckets

3. **Verify 4 Buckets Exist:**
   - ✅ `documents` - Should exist
   - ✅ `evidence` - Should exist
   - ✅ `audit-packs` - Should exist
   - ✅ `aer-documents` - Should exist

4. **What to Look For:**
   - Each bucket should be listed
   - Click on each bucket to verify it exists
   - Check that bucket names match exactly (case-sensitive)

### Expected Result:
```
Storage Buckets:
✅ documents
✅ evidence
✅ audit-packs
✅ aer-documents
```

### If Missing:
- If any bucket is missing, we need to create it
- Run: `node scripts/create-storage-buckets.js`

---

## ✅ Step 2: CORS Configuration Verification

### How to Check:

1. **Go to Storage:**
   - Click **"Storage"** in the left sidebar
   - Click on the **`documents`** bucket

2. **Check Settings:**
   - Click on **"Settings"** tab (or gear icon)
   - Look for **"CORS Configuration"** or **"Allowed Origins"**

3. **Verify CORS is Configured:**
   - Should have allowed origins configured
   - For development: `http://localhost:3000` (or your local dev URL)
   - For production: Your production domain

4. **Check File Size Limits:**
   - Look for **"File Size Limit"** or **"Max File Size"**
   - Should be set (e.g., 50MB or 100MB)

### Expected Result:
```
Bucket Settings:
✅ CORS: Configured (allowed origins set)
✅ File Size Limit: Set (e.g., 50MB)
```

### If Not Configured:
- Click **"Edit"** or **"Configure"**
- Add allowed origins:
  - Development: `http://localhost:3000`
  - Production: Your production domain (e.g., `https://yourdomain.com`)
- Set file size limit (recommended: 50MB for documents, 100MB for evidence)

---

## ✅ Step 3: Backup Setup Verification

### How to Check:

1. **Go to Database:**
   - Click **"Database"** in the left sidebar
   - Click on **"Backups"** tab (or look for backup settings)

2. **Check Backup Status:**
   - Look for **"Backup Status"** or **"Point-in-Time Recovery (PITR)"**
   - Should show if backups are enabled

3. **Verify Backup Configuration:**
   - **Free Tier:** May have limited backup options
   - **Paid Tier:** Should have PITR (Point-in-Time Recovery) available
   - Check if automatic backups are enabled

4. **Check Backup Schedule:**
   - Look for backup frequency (daily, weekly, etc.)
   - Verify retention period

### Expected Result:
```
Backup Status:
✅ Backups: Enabled (or available)
✅ PITR: Available (if on paid tier)
```

### If Not Configured:
- **Free Tier:** Backups may be limited - this is OK for development
- **Paid Tier:** Enable PITR if available
- For production, ensure backups are configured

### Note:
- Free tier may not have PITR - this is acceptable for development
- For production, consider upgrading to enable PITR

---

## ✅ Step 4: Auth Configuration Verification

### How to Check:

1. **Go to Authentication:**
   - Click **"Authentication"** in the left sidebar
   - Click on **"Settings"** or **"Providers"** tab

2. **Verify Email/Password Provider:**
   - Look for **"Email"** provider
   - Should be **Enabled** (toggle should be ON)

3. **Check Email Templates:**
   - Click on **"Email Templates"** tab
   - Verify templates exist:
     - ✅ Confirm signup
     - ✅ Magic link
     - ✅ Change email address
     - ✅ Reset password
   - Check if templates are customized with Oblicore branding

4. **Verify Email Confirmation:**
   - Look for **"Enable email confirmations"** setting
   - For production: Should be **Enabled**
   - For development: Can be disabled for testing

5. **Check Password Requirements:**
   - Look for **"Password Requirements"** or **"Password Policy"**
   - Verify **"Minimum length"** is set to **8 characters**
   - Check if other requirements are set (uppercase, numbers, etc.)

6. **Verify JWT Settings:**
   - Look for **"JWT Settings"** or **"Token Settings"**
   - **Access Token Expiration:** Should be **24 hours** (or 86400 seconds)
   - **Refresh Token Expiration:** Should be **7 days** (or 604800 seconds)

7. **Check Session Storage:**
   - Look for **"Session Storage"** or **"Cookie Settings"**
   - Should be set to **HTTP-only cookies** for web
   - Verify **"SameSite"** is set appropriately (Lax or Strict)

### Expected Result:
```
Auth Configuration:
✅ Email/Password: Enabled
✅ Email Templates: Configured
✅ Email Confirmation: Enabled (for production)
✅ Password Min Length: 8 characters
✅ Access Token Expiration: 24 hours
✅ Refresh Token Expiration: 7 days
✅ Session Storage: HTTP-only cookies
```

### If Not Configured:

**Enable Email/Password:**
1. Go to Authentication → Providers
2. Find "Email" provider
3. Toggle to **Enabled**

**Configure Email Templates:**
1. Go to Authentication → Email Templates
2. Customize templates with Oblicore branding:
   - Add your logo
   - Update colors to match brand (#026A67)
   - Update text to match Oblicore tone

**Set Password Requirements:**
1. Go to Authentication → Settings
2. Find "Password Requirements"
3. Set minimum length to **8 characters**

**Configure JWT Settings:**
1. Go to Authentication → Settings
2. Find "JWT Settings" or "Token Settings"
3. Set:
   - Access Token: **86400** seconds (24 hours)
   - Refresh Token: **604800** seconds (7 days)

**Configure Session Storage:**
1. Go to Authentication → Settings
2. Find "Session Storage" or "Cookie Settings"
3. Set to **HTTP-only cookies**

---

## 📋 Quick Checklist

Copy this checklist and check off each item:

### ✅ Step 1: Storage Buckets
- [ ] Opened Supabase Dashboard → Storage
- [ ] Verified `documents` bucket exists
- [ ] Verified `evidence` bucket exists
- [ ] Verified `audit-packs` bucket exists
- [ ] Verified `aer-documents` bucket exists

### ✅ Step 2: CORS Configuration
- [ ] Opened `documents` bucket → Settings
- [ ] Verified CORS is configured (allowed origins set)
- [ ] Verified file size limit is set
- [ ] Checked other buckets have CORS configured

### ✅ Step 3: Backup Setup
- [ ] Opened Supabase Dashboard → Database → Backups
- [ ] Verified backup status
- [ ] Checked if PITR is available (if on paid tier)
- [ ] Noted backup configuration

### ✅ Step 4: Auth Configuration
- [ ] Opened Supabase Dashboard → Authentication → Settings
- [ ] Verified Email/Password provider is enabled
- [ ] Checked email templates are configured
- [ ] Verified email confirmation setting (enabled for production)
- [ ] Verified password minimum length is 8 characters
- [ ] Verified access token expiration is 24 hours
- [ ] Verified refresh token expiration is 7 days
- [ ] Verified session storage is HTTP-only cookies

---

## 🎯 What to Report Back

After checking all 4 steps, report back:

1. **Storage Buckets:** ✅ All 4 exist / ❌ Missing: [list missing buckets]
2. **CORS Configuration:** ✅ Configured / ❌ Not configured
3. **Backup Setup:** ✅ Configured / ⚠️ Limited (free tier) / ❌ Not configured
4. **Auth Configuration:** ✅ All settings correct / ❌ Needs configuration: [list what needs fixing]

---

## 🚨 If Something is Missing

**If storage buckets are missing:**
- Run: `node scripts/create-storage-buckets.js`
- Or create manually in Supabase Dashboard → Storage → New Bucket

**If CORS is not configured:**
- Go to each bucket → Settings → Configure CORS
- Add allowed origins

**If auth is not configured:**
- Follow the configuration steps above
- Most settings are in Authentication → Settings

**If backups are not configured:**
- Free tier: This is OK for development
- Paid tier: Enable PITR if available

---

**Once all 4 steps are verified, Phase 1 is complete and ready for Phase 2!**

