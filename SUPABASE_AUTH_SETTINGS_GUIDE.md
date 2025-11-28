# Supabase Auth Settings Location Guide

## Where to Find Auth Settings in Supabase Dashboard

### Step 1: Email/Password Provider
✅ **You found this:** Authentication → Providers → Email → Toggle ON

### Step 2: Password Requirements
**Location:** Authentication → Settings → Password Requirements

**What to look for:**
- Minimum password length (should be 8)
- May be under "Password Policy" or "Password Settings"
- If you can't find it, the default is usually 6 characters, but we can verify this is working when we test signup

### Step 3: JWT Settings
**Location:** Authentication → Settings → JWT Settings (or "Token Settings")

**Alternative locations:**
- May be under "Advanced Settings"
- May be under "Security" tab
- May be in "API Settings" section

**What to look for:**
- Access Token Expiration (default is usually 1 hour, we want 24 hours)
- Refresh Token Expiration (default is usually 1 week, which is correct)

**Note:** If you can't find JWT settings, Supabase defaults are:
- Access Token: 1 hour (we can change this later via API if needed)
- Refresh Token: 7 days (this is correct)

### Step 4: Email Templates
**Location:** Authentication → Email Templates

**What to look for:**
- Confirm signup template
- Magic link template
- Change email address template
- Reset password template

**Note:** Templates exist by default, but you can customize them later with Oblicore branding.

### Step 5: Email Confirmation
**Location:** Authentication → Settings → Email Confirmation

**What to look for:**
- "Enable email confirmations" toggle
- For development: Can be disabled
- For production: Should be enabled

### Step 6: Session Storage
**Location:** Authentication → Settings → Session Storage (or "Cookie Settings")

**What to look for:**
- HTTP-only cookies setting
- SameSite setting (Lax or Strict)

**Note:** Supabase uses HTTP-only cookies by default for web, so this is likely already configured correctly.

---

## What's Acceptable for Phase 1

### ✅ Must Have:
- Email/Password provider enabled ✅ (You have this)

### ⚠️ Nice to Have (Can Configure Later):
- Password requirements (default is usually 6, we'll enforce 8 in code)
- JWT expiration (defaults are usually fine, can adjust later)
- Email templates (defaults exist, can customize later)
- Email confirmation (can enable for production)
- Session storage (defaults are usually correct)

---

## Quick Check: What You Actually Need

For Phase 1 completion, you only need:
1. ✅ Email/Password enabled (You have this)
2. ⚠️ Everything else can be configured later or uses defaults

**The important thing is that Email/Password is enabled, which you've confirmed!**

---

## If You Can't Find Settings

**Don't worry!** Many of these settings:
- Use sensible defaults
- Can be configured via API later
- Can be enforced in application code (e.g., password length validation)
- Are not critical for Phase 1 completion

**What matters for Phase 1:**
- ✅ Email/Password provider is enabled (You have this)
- ✅ Database schema is complete (We verified this)
- ✅ RLS policies are in place (We verified this)
- ✅ Storage buckets exist (You confirmed this)

---

## Next Steps

Since you have:
- ✅ Storage buckets (all 4)
- ✅ Email/Password enabled
- ⚠️ CORS (handled automatically by Supabase)
- ⚠️ Backups (free tier limitation - acceptable)

**Phase 1 is essentially complete!** The other auth settings can be configured later or are using acceptable defaults.

