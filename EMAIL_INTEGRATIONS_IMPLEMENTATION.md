# Email Integrations Implementation

**Status:** In Progress

## TODO Locations to Integrate

1. ✅ **Pack Distribution** - `app/api/v1/packs/[packId]/distribute/route.ts` (DONE)
2. ⏳ **User Invitation** - `app/api/v1/users/route.ts` (Line 228)
3. ⏳ **Consultant Assignment** - `app/api/v1/companies/[companyId]/consultants/assign/route.ts` (Lines 154, 197)
4. ⏳ **Lab Result Threshold Alerts** - `app/api/v1/module-2/lab-results/route.ts` (Line 137)

---

## Implementation Plan

### 1. Pack Distribution ✅
- **Status:** Complete
- **Location:** `app/api/v1/packs/[packId]/distribute/route.ts`
- **Email Template:** `packDistributionEmail()`
- **Trigger:** After distribution record created
- **Details:** Sends email with download link or shared link

### 2. User Invitation
- **Status:** Pending
- **Location:** `app/api/v1/users/route.ts`
- **Email Template:** `userInvitationEmail()`
- **Trigger:** After user created (when password not provided = invitation)
- **Details:** Sends invitation email with signup/acceptance link

### 3. Consultant Assignment
- **Status:** Pending
- **Location:** `app/api/v1/companies/[companyId]/consultants/assign/route.ts`
- **Email Template:** `consultantClientAssignedEmail()`
- **Trigger:** After consultant assignment created/reactivated
- **Details:** Sends email notification to consultant about new client

### 4. Lab Result Threshold Alerts
- **Status:** Pending
- **Location:** `app/api/v1/module-2/lab-results/route.ts`
- **Email Template:** `labResultThresholdAlertEmail()`
- **Trigger:** When threshold (80%, 90%, 100%) is reached
- **Details:** Creates notification record + sends email alert

---

## Next Steps

1. Implement user invitation email
2. Implement consultant assignment email
3. Implement lab result threshold alerts

