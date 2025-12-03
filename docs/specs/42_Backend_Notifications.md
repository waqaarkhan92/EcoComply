# EcoComply Notification & Messaging Specification

**EcoComply v1.3 — Launch-Ready / Last updated: 2025-12-01**

**Document Version:** 1.3
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ User Workflow Maps (1.3) - Complete
- ✅ Product Logic Specification (1.1) - Complete
- ✅ Database Schema (2.2) - Complete
- ✅ Background Jobs (2.3) - Complete

**Purpose:** Defines the complete notification and messaging system, including email/SMS templates, escalation chains, delivery mechanisms, rate limiting, and integration with background jobs for the EcoComply platform.

> [v1.3 UPDATE – Database Schema v1.3 Features – 2025-12-01]

## Changelog

### v1.4 (2025-01-01)
- Added severity levels (INFO, WARNING, CRITICAL) to notification schema
- Added deep linking fields (obligation_id, evidence_id) to notifications table
- Added breach detection notification templates (COMPLIANCE_BREACH_DETECTED, REGULATORY_DEADLINE_BREACH)
- Enhanced all breach/SLA notifications with deep links to obligations/evidence
- Made action_url REQUIRED for all notifications
- Added background job integration for breach detection and SLA miss alerts

### v1.3 (2025-12-01)
- Added Compliance Clock notification templates (CRITICAL, REMINDER, OVERDUE)
- Added Escalation Workflow notification templates (LEVEL_1 through LEVEL_4, RESOLVED)
- Added Permit Workflow notification templates (RENEWAL_DUE, SUBMITTED, RESPONSE_OVERDUE, APPROVED, SURRENDER_INSPECTION)
- Added Corrective Action notification templates (ASSIGNED, DUE_SOON, OVERDUE, READY_FOR_CLOSURE, CLOSURE_APPROVED)
- Added Validation notification templates (CONSIGNMENT_VALIDATION_FAILED, CONSIGNMENT_VALIDATION_WARNING)
- Added Runtime Monitoring notification templates (VALIDATION_PENDING, VALIDATION_REJECTED)
- Added SLA Breach notification templates (SLA_BREACH_DETECTED, SLA_BREACH_EXTENDED)
- Updated TypeScript interfaces with new notification types

### v1.0 (2024-12-27)
- Initial specification with deadline, parameter, pack, and import notifications
- Escalation chain logic
- Multi-channel delivery (Email, SMS, In-app)
- Rate limiting and preference management

---

# Table of Contents

1. [Document Overview](#1-document-overview)
2. [Email Notification Templates](#2-email-notification-templates)
3. [SMS Notification Templates](#3-sms-notification-templates)
5. [Escalation Chain Logic](#4-escalation-chain-logic)
6. [Notification Queue Database Schema](#5-notification-queue-database-schema)
7. [Rate Limiting](#6-rate-limiting)
8. [Notification Preferences](#7-notification-preferences)
9. [Integration Points](#8-integration-points)
10. [Delivery Provider Integration](#9-delivery-provider-integration)
11. [Template Versioning Strategy](#10-template-versioning-strategy)
12. [Error Handling & Retry Logic](#11-error-handling--retry-logic)
13. [Testing Requirements](#12-testing-requirements)

---

# 1. Document Overview

## 1.1 Notification System Architecture

The EcoComply notification system provides multi-channel (email, SMS, in-app) notifications for compliance-related events, with intelligent escalation chains and preference management.

### Key Features

- **Multi-Channel Delivery:** Email, SMS, and in-app notifications
- **Template System:** Variable-based templates for consistent messaging
- **Escalation Chains:** Automatic escalation to higher management levels
- **Rate Limiting:** Prevents notification spam and provider rate limit violations
- **Preference Management:** User-configurable notification preferences
- **Delivery Tracking:** Complete delivery status tracking and retry logic
- **Background Job Integration:** Seamless integration with background job system

### Notification Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Notification Flow Architecture              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Background Job / API Event                                │
│         │                                                   │
│         ▼                                                   │
│  Notification Service                                       │
│         │                                                   │
│         ├─► Check User Preferences                         │
│         ├─► Apply Rate Limits                             │
│         ├─► Render Template                                │
│         ├─► Determine Escalation                           │
│         │                                                   │
│         ▼                                                   │
│  Notification Queue                                         │
│         │                                                   │
│         ├─► Email Queue (SendGrid)                         │
│         ├─► SMS Queue (Twilio)                             │
│         └─► In-App Queue (Supabase Realtime)               │
│         │                                                   │
│         ▼                                                   │
│  Delivery Provider                                         │
│         │                                                   │
│         ▼                                                   │
│  Delivery Status Tracking                                  │
│         │                                                   │
│         └─► Webhook Callbacks                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 1.2 Notification Types

The system supports the following notification types:

| Notification Type | Trigger | Channels | Escalation |
|-------------------|---------|----------|------------|
| **Module 1: Core Compliance** |
| Deadline Warning (7-day) | Background Job | EMAIL, IN_APP | Level 1 |
| Deadline Warning (3-day) | Background Job | EMAIL, IN_APP | Level 1 → Level 2 |
| Deadline Warning (1-day) | Background Job | EMAIL, SMS, IN_APP | Level 1 → Level 2 → Level 3 |
| Overdue Obligation | Background Job | EMAIL, SMS, IN_APP | Level 1 → Level 2 → Level 3 |
| Evidence Reminder | Background Job | EMAIL, IN_APP | Level 1 → Level 2 |
| Permit Renewal Reminder | Background Job | EMAIL, IN_APP | Level 1 |
| **Compliance Clock Notifications (v1.3)** |
| Compliance Clock Critical | Background Job | EMAIL, IN_APP | Level 1 |
| Compliance Clock Reminder | Background Job | EMAIL, IN_APP | None |
| Compliance Clock Overdue | Background Job | EMAIL, IN_APP, SLACK | Level 1 → Level 2 → Level 3 |
| **Escalation Workflow (v1.3)** |
| Escalation Level 1 | Background Job | EMAIL, IN_APP | Level 1 |
| Escalation Level 2 | Background Job | EMAIL, IN_APP | Level 2 |
| Escalation Level 3 | Background Job | EMAIL, IN_APP, SLACK | Level 3 |
| Escalation Level 4 | Background Job | EMAIL, IN_APP, SLACK | Level 4 |
| Escalation Resolved | System Event | EMAIL, IN_APP | None |
| **Permit Workflows (v1.3)** |
| Permit Renewal Due | Background Job | EMAIL, IN_APP | Level 1 |
| Permit Workflow Submitted | System Event | EMAIL, IN_APP | None |
| Regulator Response Overdue | Background Job | EMAIL, IN_APP | Level 1 |
| Permit Workflow Approved | System Event | EMAIL, IN_APP | None |
| Permit Surrender Inspection Due | Background Job | EMAIL, IN_APP | Level 1 |
| **Corrective Actions (v1.3)** |
| Corrective Action Item Assigned | System Event | EMAIL, IN_APP | None |
| Corrective Action Item Due Soon | Background Job | EMAIL, IN_APP | None |
| Corrective Action Item Overdue | Background Job | EMAIL, IN_APP | Level 1 |
| Corrective Action Ready for Closure | System Event | EMAIL, IN_APP | None |
| Corrective Action Closure Approved | System Event | EMAIL, IN_APP | None |
| **Module 2: Parameter Monitoring** |
| Parameter Exceedance (80%) | Background Job | EMAIL, IN_APP | Level 1 |
| Parameter Exceedance (90%) | Background Job | EMAIL, IN_APP | Level 1 → Level 2 |
| Parameter Exceedance (100%) | Background Job | EMAIL, SMS, IN_APP | Level 1 → Level 2 → Level 3 |
| **Module 3: Runtime Monitoring** |
| Runtime Threshold Exceeded (90%) | Background Job | EMAIL, IN_APP | None (HIGH priority) |
| Runtime Annual Limit Exceeded (100%) | Background Job | EMAIL, IN_APP | None (HIGH priority) |
| Runtime Monthly Limit Exceeded (100%) | Background Job | EMAIL, IN_APP | None (HIGH priority) |
| Runtime Validation Pending | Background Job | EMAIL (Digest) | None |
| Runtime Validation Rejected | System Event | EMAIL, IN_APP | None |
| **Module 4: Waste Consignments (v1.3)** |
| Consignment Validation Failed | Background Job | EMAIL, IN_APP | None |
| Consignment Validation Warning | Background Job | IN_APP | None |
| **SLA Management (v1.3)** |
| SLA Breach Detected | Background Job | EMAIL, IN_APP | Level 1 |
| SLA Breach Extended | Background Job | EMAIL, IN_APP, SLACK | Level 2 |
| **Breach Detection (v1.4)** |
| Compliance Breach Detected | Background Job | EMAIL, SMS, IN_APP | Level 1 → Level 2 → Level 3 |
| Regulatory Deadline Breach | Background Job | EMAIL, SMS, IN_APP | Level 1 → Level 2 → Level 3 |
| **Pack Generation** |
| Audit Pack Ready | Background Job | EMAIL, IN_APP | None |
| Regulator Pack Ready | Background Job | EMAIL, IN_APP | None |
| Tender Pack Ready | Background Job | EMAIL, IN_APP | None |
| Board Pack Ready | Background Job | EMAIL, IN_APP | None |
| Insurer Pack Ready | Background Job | EMAIL, IN_APP | None |
| Pack Distributed | Background Job | EMAIL, IN_APP | None |
| **Consultant Features** |
| Consultant Client Assigned | System Event | EMAIL, IN_APP | None |
| Consultant Client Pack Generated | Background Job | EMAIL, IN_APP | None |
| Consultant Client Activity | System Event | EMAIL, IN_APP | None |
| **Data Import** |
| Excel Import Ready for Review | Background Job | EMAIL, IN_APP | None |
| Excel Import Completed | Background Job | EMAIL, IN_APP | None |
| Excel Import Failed | Background Job | EMAIL, IN_APP | None |
| **System** |
| System Alert | System Event | EMAIL, IN_APP | Admin Only |

---

# 2. Email Notification Templates

## 2.1 Template Structure

All email templates follow a consistent structure with variable substitution using `{{variable_name}}` syntax.

### Template Components

1. **Subject Line:** Single line with key information
2. **HTML Body:** Formatted HTML email with branding
3. **Plain Text Fallback:** Plain text version for email clients that don't support HTML
4. **Variables:** Dynamic content placeholders
5. **Action Buttons:** CTA buttons linking to relevant pages
6. **Unsubscribe Link:** Per-email-type unsubscribe option

### Variable Substitution System

Variables are replaced at render time using a simple template engine:

```typescript
interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined && value !== null ? String(value) : match;
  });
}
```

### Email Branding Guidelines

- **Primary Accent Color:** #026A67 (Industrial Deep Teal)
- **Success Color:** #1E7A50 (Compliant status)
- **Warning Color:** #CB7C00 (At risk)
- **Danger/Error Color:** #B13434 (Non-compliant)
- **Neutral Background:** #E2E6E7 (Soft Slate)
- **Dark Background:** #101314 (Dark Charcoal)
- **Font:** System font stack (Arial, Helvetica, sans-serif)
- **Logo:** EcoComply logo (header)
- **Footer:** Company information, unsubscribe link

---

## 2.2 Deadline Warning Templates

### A. 7-Day Warning Template

**Subject Line Template:**
```
{{obligation_title}} - {{days_remaining}} days remaining
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background-color: #10B981; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">EcoComply</h1>
    </div>
    
    <!-- Body -->
    <div style="background-color: #f9fafb; padding: 30px;">
      <h2 style="color: #10B981; margin-top: 0;">Upcoming Deadline Reminder</h2>
      
      <p>Hello,</p>
      
      <p>This is a reminder that you have an upcoming compliance obligation:</p>
      
      <div style="background-color: white; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
        <strong>{{obligation_title}}</strong><br>
        <span style="color: #6b7280;">Site: {{site_name}}</span><br>
        <span style="color: #6b7280;">Due Date: {{deadline_date}}</span><br>
        <span style="color: #6b7280;">Days Remaining: {{days_remaining}}</span>
      </div>
      
      <p>Please ensure all required evidence is uploaded and linked to this obligation before the deadline.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{action_url}}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Obligation</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">{{company_name}} | EcoComply</p>
      <p style="margin: 5px 0;">
        <a href="{{unsubscribe_url}}" style="color: #6b7280;">Unsubscribe from deadline reminders</a>
      </p>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
EcoComply - Upcoming Deadline Reminder

Hello,

This is a reminder that you have an upcoming compliance obligation:

{{obligation_title}}
Site: {{site_name}}
Due Date: {{deadline_date}}
Days Remaining: {{days_remaining}}

Please ensure all required evidence is uploaded and linked to this obligation before the deadline.

View Obligation: {{action_url}}

---
{{company_name}} | EcoComply
Unsubscribe: {{unsubscribe_url}}
```

**Variables:**
- `obligation_title`: string - Title of the obligation
- `deadline_date`: string - Formatted deadline date (e.g., "15 Jan 2025")
- `days_remaining`: number - Days until deadline
- `site_name`: string - Name of the site
- `company_name`: string - Name of the company
- `action_url`: string - URL to view the obligation (e.g., "https://app.epcompliance.com/sites/{siteId}/obligations/{obligationId}")
- `unsubscribe_url`: string - URL to unsubscribe from deadline reminders

**Example Rendered Email:**

Subject: `Monthly Monitoring Report - 7 days remaining`

Body: (HTML rendered with actual values)

---

### B. 3-Day Warning Template

**Subject Line Template:**
```
⚠️ {{obligation_title}} - {{days_remaining}} days remaining (Urgent)
```

**HTML Body Template:**
Similar to 7-day template, but with:
- Warning color (#F59E0B) instead of success color
- "Urgent" indicator in the header
- Stronger language ("Action required soon")

**Variables:** Same as 7-day template

**Escalation:** Level 2 (Compliance Manager) notified if no action after 24 hours

---

### C. 1-Day Warning Template

**Subject Line Template:**
```
🚨 CRITICAL: {{obligation_title}} - Due Tomorrow
```

**HTML Body Template:**
Similar to 3-day template, but with:
- Error color (#EF4444) instead of warning color
- "CRITICAL" indicator in the header
- Strongest language ("Immediate action required")
- SMS notification also sent

**Variables:** Same as 7-day template

**Escalation:** Level 3 (MD) notified if no action after 48 hours

---

## 2.3 Overdue Obligation Template

**Subject Line Template:**
```
🚨 OVERDUE: {{obligation_title}} - {{overdue_days}} days overdue
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background-color: #EF4444; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">EcoComply</h1>
    </div>
    
    <!-- Body -->
    <div style="background-color: #f9fafb; padding: 30px;">
      <h2 style="color: #EF4444; margin-top: 0;">⚠️ Overdue Obligation</h2>
      
      <p>Hello,</p>
      
      <p><strong>This obligation is now overdue and requires immediate attention:</strong></p>
      
      <div style="background-color: white; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
        <strong>{{obligation_title}}</strong><br>
        <span style="color: #6b7280;">Site: {{site_name}}</span><br>
        <span style="color: #EF4444;"><strong>Due Date: {{deadline_date}}</strong></span><br>
        <span style="color: #EF4444;"><strong>Days Overdue: {{overdue_days}}</strong></span>
        {{#if escalation_indicator}}
        <br><span style="color: #EF4444;"><strong>⚠️ This has been escalated to {{escalation_level}}</strong></span>
        {{/if}}
      </div>
      
      <p>Please upload the required evidence immediately to avoid compliance issues.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{action_url}}" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">View Obligation</a>
        <a href="{{evidence_upload_url}}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Upload Evidence</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">{{company_name}} | EcoComply</p>
      <p style="margin: 5px 0;">
        <a href="{{unsubscribe_url}}" style="color: #6b7280;">Unsubscribe from overdue alerts</a>
      </p>
    </div>
  </div>
</body>
</html>
```

**Variables:**
- `obligation_title`: string
- `deadline_date`: string
- `overdue_days`: number
- `site_name`: string
- `company_name`: string
- `action_url`: string
- `evidence_upload_url`: string - URL to upload evidence (e.g., "https://app.epcompliance.com/sites/{siteId}/obligations/{obligationId}/evidence/upload")
- `escalation_indicator`: boolean - Whether this has been escalated
- `escalation_level`: string - Escalation level (e.g., "Compliance Manager", "MD")
- `unsubscribe_url`: string

**Escalation:** Level 1 → Level 2 (24h) → Level 3 (48h)

---

## 2.4 Evidence Reminder Template

**Subject Line Template:**
```
📎 Evidence Required: {{obligation_title}}
```

**HTML Body Template:**
Similar structure to deadline warning, with:
- Focus on evidence requirement
- Grace period indicator (if within 7-day grace period - see PLS Section B.4.1.1)
- Direct link to evidence upload

**Variables:**
- `obligation_title`: string
- `evidence_required`: string - Description of required evidence
- `days_since_deadline`: number - Days since deadline passed
- `site_name`: string
- `company_name`: string
- `action_url`: string
- `evidence_upload_url`: string
- `grace_period_indicator`: boolean - Whether within 7-day grace period
- `grace_period_days_remaining`: number - Days remaining in grace period (if applicable)
- `unsubscribe_url`: string

**Escalation:** 
- Level 1 → Level 2: After 24 hours if no action (after 7-day grace period)
- Level 2 → Level 3: After 48 hours if no action (after 14 days overdue)

---

## 2.5 Permit Renewal Reminder Template

**Subject Line Template:**
```
🔄 Permit Renewal Due: {{permit_reference}} expires in {{days_until_expiry}} days
```

**HTML Body Template:**
Similar structure, with:
- Permit-specific information
- Renewal action link

**Variables:**
- `permit_reference`: string - Permit reference number
- `expiry_date`: string - Permit expiry date
- `days_until_expiry`: number - Days until permit expires
- `site_name`: string
- `company_name`: string
- `action_url`: string - URL to permit details
- `renewal_action_url`: string - URL to renewal workflow
- `unsubscribe_url`: string

**Escalation:** Level 1 only

---

## 2.6 Module 2: Parameter Exceedance Alert Template

**Subject Line Template:**
```
⚠️ Parameter Exceedance Alert: {{parameter_name}} at {{percentage}}% of limit
```

**HTML Body Template:**
Similar structure, with:
- Parameter-specific information
- Current value vs limit comparison
- Water company contact information (if applicable)

**Variables:**
- `parameter_name`: string - Name of parameter (e.g., "BOD", "COD")
- `current_value`: number - Current parameter value
- `limit_value`: number - Parameter limit
- `percentage`: number - Percentage of limit (e.g., 80)
- `site_name`: string
- `company_name`: string
- `sample_date`: string - Date of sample
- `water_company_contact`: string - Water company contact info (if applicable)
- `action_url`: string - URL to parameter tracking page
- `unsubscribe_url`: string

**Escalation:** 
- Level 1 (80%): Initial notification
- Level 1 → Level 2 (90%): After 24 hours if no action
- Level 2 → Level 3 (100%): After 48 hours if no action

---

## 2.7 Module 3: Run-Hour Limit Breach Alert Templates

### A. 80% Threshold Template

**Subject Line Template:**
```
⚠️ Run-Hour Alert: {{generator_name}} at {{percentage}}% of limit
```

**Variables:**
- `generator_name`: string
- `current_hours`: number - Current run hours
- `limit_hours`: number - Annual/monthly limit
- `percentage`: number - Percentage (80)
- `site_name`: string
- `company_name`: string
- `action_url`: string
- `unsubscribe_url`: string

**Escalation:** Level 1

### B. 90% Threshold Template

**Subject Line Template:**
```
🚨 Run-Hour Warning: {{generator_name}} at {{percentage}}% of limit (Urgent)
```

**Variables:** Same as 80%, with `percentage: 90`

**Escalation:** Level 1 → Level 2

### C. 100% Threshold Template

**Subject Line Template:**
```
🚨 CRITICAL: {{generator_name}} - Run-Hour Limit Breached
```

**Variables:** Same as 80%, with `percentage: 100`

**Escalation:** Level 1 → Level 2 → Level 3

**SMS Notification:** Also sent for 100% threshold

---

## 2.8 Audit Pack Ready Notification Template

**Subject Line Template:**
```
✅ Audit Pack Ready: {{audit_pack_name}}
```

**HTML Body Template:**
Similar structure, with:
- Audit pack details
- Download and preview links

**Variables:**
- `audit_pack_name`: string - Name of audit pack
- `generation_date`: string - Date audit pack was generated
- `site_name`: string
- `company_name`: string
- `obligation_count`: number - Number of obligations included
- `evidence_count`: number - Number of evidence items included
- `download_url`: string - URL to download audit pack PDF
- `preview_url`: string - URL to preview audit pack
- `unsubscribe_url`: string

**Escalation:** None

---

> [v1 UPDATE – Pack-Specific Notifications – 2024-12-27]

## 2.9 v1.0 Pack-Specific Notification Templates

### 2.9.1 Regulator Pack Ready Notification

**Subject Line Template:**
```
✅ Regulator Pack Ready: {{pack_name}}
```

**Variables:**
- `pack_name`: string - Pack title
- `pack_type`: "REGULATOR_INSPECTION"
- `generation_date`: string
- `site_name`: string
- `download_url`: string
- `recipient_name`: string (optional)

**Reference:** Product Logic Specification Section I.8.2 (Regulator/Inspection Pack Logic)

---

### 2.9.2 Tender Pack Ready Notification

> [v1 UPDATE – Pack Type-Specific Messaging – 2024-12-27]

**Subject Line Template:**
```
📋 Tender Pack Ready: {{pack_name}}
```

**Email Body Template:**
```
Your Tender/Client Assurance Pack has been generated and is ready for distribution.

This pack contains a client-facing compliance summary suitable for tender submissions. It emphasizes compliance strengths and highlights remediation plans for any gaps.

Pack Details:
- Client: {{client_name}}
- Site: {{site_name}}
- Date Range: {{date_range_start}} to {{date_range_end}}
- Generated: {{generation_date}}

[Download Pack]({{pack_download_url}}) | [Distribute Pack]({{pack_distribute_url}})
```

**Variables:**
- `pack_name`: string - Pack title
- `pack_type`: "TENDER_CLIENT_ASSURANCE"
- `generation_date`: string
- `client_name`: string
- `site_name`: string
- `date_range_start`: string
- `date_range_end`: string
- `download_url`: string
- `share_url`: string (if shared link generated)
- `pack_distribute_url`: string

**Reference:** Product Logic Specification Section I.8.3 (Tender/Client Assurance Pack Logic)

---

### 2.9.3 Board Pack Ready Notification

> [v1 UPDATE – Pack Type-Specific Messaging – 2024-12-27]

**Subject Line Template:**
```
📊 Board Pack Ready: Multi-Site Compliance Summary
```

**Email Body Template:**
```
Your Board/Multi-Site Risk Pack has been generated and is ready for download.

This pack contains company-wide compliance trends and risk analysis for executive reporting. It aggregates data across all your sites and provides board-level insights.

Pack Details:
- Company: {{company_name}}
- Total Sites: {{total_sites}}
- Compliance Score: {{compliance_score}}%
- Date Range: {{date_range_start}} to {{date_range_end}}
- Generated: {{generation_date}}

[Download Pack]({{pack_download_url}})

Note: This pack is company-level and requires Owner/Admin access.
```

**Variables:**
- `company_name`: string
- `pack_type`: "BOARD_MULTI_SITE_RISK"
- `generation_date`: string
- `total_sites`: number
- `compliance_score`: number
- `date_range_start`: string
- `date_range_end`: string
- `download_url`: string

**Reference:** Product Logic Specification Section I.8.4 (Board/Multi-Site Risk Pack Logic)

---

### 2.9.4 Insurer Pack Ready Notification

> [v1 UPDATE – Pack Type-Specific Messaging – 2024-12-27]

**Subject Line Template:**
```
🛡️ Insurer Pack Ready: {{pack_name}}
```

**Email Body Template:**
```
Your Insurer/Broker Pack has been generated and is ready for distribution.

This pack contains a risk narrative and compliance controls summary suitable for insurance purposes. It emphasizes compliance controls and provides evidence overview for broker/insurer review.

Pack Details:
- Broker: {{broker_name}}
- Site: {{site_name}}
- Date Range: {{date_range_start}} to {{date_range_end}}
- Generated: {{generation_date}}

[Download Pack]({{pack_download_url}}) | [Distribute Pack]({{pack_distribute_url}})
```

**Variables:**
- `pack_name`: string - Pack title
- `pack_type`: "INSURER_BROKER"
- `generation_date`: string
- `broker_name`: string (optional)
- `site_name`: string
- `date_range_start`: string
- `date_range_end`: string
- `download_url`: string
- `pack_distribute_url`: string

**Reference:** Product Logic Specification Section I.8.5 (Insurer/Broker Pack Logic)

---

### 2.9.5 Audit Pack Ready Notification

**Subject:** 📄 Audit Pack Ready: {{pack_name}}

**Body:**
Your Audit Pack has been generated and is ready for download.

This pack contains full evidence compilation for internal audits. It includes all obligations, complete evidence files, and compliance status.

**Download:** [View Pack]({{pack_download_url}})

**Reference:** Product Logic Specification Section I.8 (v1.0 Pack Types — Generation Logic)

**Subject Line Template:**
```
🛡️ Insurer Pack Ready: {{pack_name}}
```

**Variables:**
- `pack_name`: string - Pack title
- `pack_type`: "INSURER_BROKER"
- `generation_date`: string
- `broker_name`: string (optional)
- `download_url`: string

**Reference:** Product Logic Specification Section I.8.5 (Insurer/Broker Pack Logic)

---

### 2.9.5 Pack Distribution Notification

**Subject Line Template:**
```
📤 Pack Distributed: {{pack_name}}
```

**Variables:**
- `pack_name`: string
- `distribution_method`: "EMAIL" | "SHARED_LINK"
- `recipients`: Array<string> - Recipient emails/names
- `shared_link`: string (if SHARED_LINK)
- `expires_at`: string (if SHARED_LINK)

**Reference:** Product Logic Specification Section I.8.7 (Pack Distribution Logic)

---

> [v1 UPDATE – Consultant Notifications – 2024-12-27]

## 2.10 Consultant Notification Templates

### 2.10.1 Client Assigned Notification

**Subject Line Template:**
```
👥 New Client Assigned: {{client_company_name}}
```

**Variables:**
- `client_company_name`: string
- `assigned_at`: string
- `client_dashboard_url`: string
- `site_count`: number

**Reference:** Product Logic Specification Section C.5.6 (Consultant Client Assignment Workflow)

---

### 2.10.2 Client Pack Generated Notification

**Subject Line Template:**
```
📋 Pack Generated for {{client_company_name}}: {{pack_name}}
```

**Variables:**
- `client_company_name`: string
- `pack_name`: string
- `pack_type`: string
- `generation_date`: string
- `client_pack_url`: string

---

### 2.10.3 Client Activity Alert Notification

**Subject Line Template:**
```
🔔 Activity Alert: {{client_company_name}} - {{activity_type}}
```

**Variables:**
- `client_company_name`: string
- `activity_type`: string (e.g., "Overdue Obligation", "New Evidence Uploaded")
- `activity_description`: string
- `activity_timestamp`: string
- `client_dashboard_url`: string

---

## 2.11 Excel Import Notification Templates

### 2.9.1 Excel Import Ready for Review Template

**Subject Line Template:**
```
📊 Excel Import Ready for Review: {{file_name}}
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Excel Import Ready for Review</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #026A67; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        📊
      </div>
    </div>
    
    <h1 style="color: #026A67; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Excel Import Ready for Review
    </h1>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your Excel import for <strong>{{file_name}}</strong> has been processed and is ready for your review.
    </p>
    
    <div style="background-color: #F9FAFB; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-weight: 600;">Total Rows:</span>
        <span>{{row_count}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #1E7A50;">
        <span style="font-weight: 600;">Valid Rows:</span>
        <span>{{valid_count}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; color: #B13434;">
        <span style="font-weight: 600;">Errors:</span>
        <span>{{error_count}}</span>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{review_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Review Import
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Review the import preview to confirm which obligations will be created.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Excel Import Ready for Review: {{file_name}}

Your Excel import has been processed and is ready for review.

Total Rows: {{row_count}}
Valid Rows: {{valid_count}}
Errors: {{error_count}}

Review your import: {{review_url}}
```

**Variables:**
- `file_name`: string - Name of uploaded Excel file
- `row_count`: number - Total number of rows in file
- `valid_count`: number - Number of valid rows
- `error_count`: number - Number of rows with errors
- `site_name`: string
- `company_name`: string
- `review_url`: string - URL to review import preview
- `unsubscribe_url`: string

**Escalation:** None

**Trigger:** Background job completes Excel import validation (status: PENDING_REVIEW)

---

### 2.9.2 Excel Import Completed Template

**Subject Line Template:**
```
✅ Excel Import Completed: {{success_count}} obligations imported
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Excel Import Completed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #1E7A50; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ✅
      </div>
    </div>
    
    <h1 style="color: #1E7A50; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Excel Import Completed Successfully
    </h1>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your Excel import for <strong>{{file_name}}</strong> has been completed successfully.
    </p>
    
    <div style="background-color: #F0FDF4; border-left: 4px solid #1E7A50; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #1E7A50;">
        <span style="font-weight: 600;">Obligations Created:</span>
        <span style="font-size: 20px; font-weight: 700;">{{success_count}}</span>
      </div>
      {{#if error_count}}
      <div style="display: flex; justify-content: space-between; margin-top: 10px; color: #B13434;">
        <span style="font-weight: 600;">Errors:</span>
        <span>{{error_count}}</span>
      </div>
      {{/if}}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{obligations_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Obligations
      </a>
    </div>
    
    {{#if error_count}}
    <p style="font-size: 14px; color: #6B7280; margin-top: 20px; text-align: center;">
      Some rows had errors and were skipped. Check the import details for more information.
    </p>
    {{/if}}
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Excel Import Completed: {{success_count}} obligations imported

Your Excel import has been completed successfully.

Obligations Created: {{success_count}}
{{#if error_count}}
Errors: {{error_count}}
{{/if}}

View your obligations: {{obligations_url}}
```

**Variables:**
- `file_name`: string - Name of uploaded Excel file
- `success_count`: number - Number of obligations successfully created
- `error_count`: number - Number of rows with errors (optional)
- `site_name`: string
- `company_name`: string
- `obligations_url`: string - URL to view imported obligations
- `unsubscribe_url`: string

**Escalation:** None

**Trigger:** Background job completes Excel import bulk creation (status: COMPLETED)

---

### 2.9.3 Excel Import Failed Template

**Subject Line Template:**
```
❌ Excel Import Failed: {{file_name}}
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Excel Import Failed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #B13434; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ❌
      </div>
    </div>
    
    <h1 style="color: #B13434; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Excel Import Failed
    </h1>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your Excel import for <strong>{{file_name}}</strong> has failed.
    </p>
    
    <div style="background-color: #FEF2F2; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; color: #B13434; margin-bottom: 10px;">Error:</p>
      <p style="color: #101314;">{{error_message}}</p>
      {{#if error_details}}
      <p style="font-size: 14px; color: #6B7280; margin-top: 10px;">{{error_details}}</p>
      {{/if}}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{retry_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        Retry Import
      </a>
      <a href="{{support_url}}" style="background-color: transparent; color: #026A67; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 2px solid #026A67;">
        Contact Support
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Common issues: Invalid file format, missing required columns, file too large (>10MB), or too many rows (>10,000).
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Excel Import Failed: {{file_name}}

Your Excel import has failed.

Error: {{error_message}}
{{#if error_details}}
Details: {{error_details}}
{{/if}}

Retry import: {{retry_url}}
Contact support: {{support_url}}
```

**Variables:**
- `file_name`: string - Name of uploaded Excel file
- `error_message`: string - Error message
- `error_details`: string - Detailed error information (optional)
- `site_name`: string
- `company_name`: string
- `retry_url`: string - URL to retry import
- `support_url`: string - URL to contact support
- `unsubscribe_url`: string

**Escalation:** None

**Trigger:** Background job fails Excel import processing (status: FAILED)

---

> [v1.3 UPDATE – Compliance Clock Notifications – 2025-12-01]

## 2.12 Compliance Clock Notification Templates

### 2.12.1 Compliance Clock Critical Template

**Subject Line Template:**
```
CRITICAL: {entity_type} '{entity_name}' - {days_remaining} days remaining
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #B13434; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⏰
      </div>
    </div>

    <h1 style="color: #B13434; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Compliance Clock: CRITICAL Status
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      A compliance clock has entered <strong style="color: #B13434;">CRITICAL</strong> status and requires immediate attention.
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Entity Type:</span> {{entity_type}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Entity Name:</span> {{entity_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Target Date:</span> {{target_date}}
      </div>
      <div style="color: #B13434;">
        <span style="font-weight: 600;">Days Remaining:</span> <span style="font-size: 20px; font-weight: 700;">{{days_remaining}}</span>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #B13434; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Take Action Now
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      This notification is sent once when a compliance clock reaches critical status (≤7 days remaining).
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
CRITICAL: {{entity_type}} '{{entity_name}}' - {{days_remaining}} days remaining

A compliance clock has entered CRITICAL status and requires immediate attention.

Entity Type: {{entity_type}}
Entity Name: {{entity_name}}
Target Date: {{target_date}}
Days Remaining: {{days_remaining}}

Take Action: {{action_url}}

This notification is sent once when a compliance clock reaches critical status (≤7 days remaining).
```

**Variables:**
- `entity_type`: string - Type of entity (e.g., "Obligation", "Permit", "Deadline")
- `entity_name`: string - Name/title of the entity
- `target_date`: string - Formatted target date (e.g., "15 Jan 2025")
- `days_remaining`: number - Days until target date (≤7)
- `site_name`: string
- `company_name`: string
- `action_url`: string - URL to view entity details
- `unsubscribe_url`: string

**Recipients:** Assigned user + Site managers

**Channels:** EMAIL, IN_APP

**Priority:** HIGH

**Frequency:** Once per transition to RED criticality

**Escalation:** Level 1

**Trigger:** Compliance clock `criticality_status` transitions to RED (days_remaining ≤ 7)

---

### 2.12.2 Compliance Clock Reminder Template

**Subject Line Template:**
```
Reminder: {entity_type} '{entity_name}' due in {days_remaining} days
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #CB7C00; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        🔔
      </div>
    </div>

    <h1 style="color: #CB7C00; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Compliance Clock Reminder
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      This is a scheduled reminder for an upcoming compliance deadline.
    </p>

    <div style="background-color: #FFF8E8; border-left: 4px solid #CB7C00; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Entity Type:</span> {{entity_type}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Entity Name:</span> {{entity_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Target Date:</span> {{target_date}}
      </div>
      <div style="color: #CB7C00;">
        <span style="font-weight: 600;">Days Remaining:</span> {{days_remaining}}
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Details
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      You will receive reminders at {{reminder_intervals}}.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Reminder: {{entity_type}} '{{entity_name}}' due in {{days_remaining}} days

This is a scheduled reminder for an upcoming compliance deadline.

Entity Type: {{entity_type}}
Entity Name: {{entity_name}}
Target Date: {{target_date}} ({{days_remaining}} days away)

View Details: {{action_url}}

You will receive reminders at {{reminder_intervals}}.
```

**Variables:**
- `entity_type`: string
- `entity_name`: string
- `target_date`: string
- `days_remaining`: number
- `reminder_intervals`: string - e.g., "30, 14, 7, and 1 day milestones"
- `site_name`: string
- `company_name`: string
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** Assigned user

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once per reminder threshold (e.g., 30, 14, 7, 1 days)

**Escalation:** None

**Trigger:** Compliance clock `days_remaining` matches value in `reminder_days` array

---

### 2.12.3 Compliance Clock Overdue Template

**Subject Line Template:**
```
OVERDUE: {entity_type} '{entity_name}' was due on {target_date}
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #B13434; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⚠️
      </div>
    </div>

    <h1 style="color: #B13434; font-size: 24px; margin-bottom: 20px; text-align: center;">
      OVERDUE: Compliance Deadline Missed
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong style="color: #B13434;">This compliance deadline is now overdue and requires immediate resolution.</strong>
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Entity Type:</span> {{entity_type}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Entity Name:</span> {{entity_name}}
      </div>
      <div style="margin-bottom: 10px; color: #B13434;">
        <span style="font-weight: 600;">Due Date:</span> {{target_date}}
      </div>
      <div style="color: #B13434;">
        <span style="font-weight: 600;">Days Overdue:</span> <span style="font-size: 20px; font-weight: 700;">{{days_overdue}}</span>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #B13434; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        Resolve Now
      </a>
      <a href="{{escalation_url}}" style="background-color: transparent; color: #026A67; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 2px solid #026A67;">
        Escalation Details
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Daily reminders will continue until this is resolved. This has been escalated to site managers and admins.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
OVERDUE: {{entity_type}} '{{entity_name}}' was due on {{target_date}}

This compliance deadline is now overdue and requires immediate resolution.

Entity Type: {{entity_type}}
Entity Name: {{entity_name}}
Due Date: {{target_date}}
Days Overdue: {{days_overdue}}

Resolve Now: {{action_url}}
Escalation Details: {{escalation_url}}

Daily reminders will continue until this is resolved. This has been escalated to site managers and admins.
```

**Variables:**
- `entity_type`: string
- `entity_name`: string
- `target_date`: string
- `days_overdue`: number
- `site_name`: string
- `company_name`: string
- `action_url`: string
- `escalation_url`: string
- `unsubscribe_url`: string

**Recipients:** Assigned user + Site managers + Admins

**Channels:** EMAIL, IN_APP, SLACK (if configured)

**Priority:** CRITICAL

**Frequency:** Daily while overdue

**Escalation:** Level 1 → Level 2 → Level 3

**Trigger:** Compliance clock `status` changes to OVERDUE

---

> [v1.3 UPDATE – Escalation Workflow Notifications – 2025-12-01]

## 2.13 Escalation Workflow Notification Templates

### 2.13.1 Escalation Level Templates (Levels 1-4)

**Subject Line Template:**
```
ESCALATION LEVEL {level}: {obligation_title} is {days_overdue} days overdue
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: {{level_color}}; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700;">
        L{{level}}
      </div>
    </div>

    <h1 style="color: {{level_color}}; font-size: 24px; margin-bottom: 20px; text-align: center;">
      ESCALATION LEVEL {{level}}
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      An overdue obligation has been escalated to <strong>Level {{level}}</strong> and requires your immediate attention.
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid {{level_color}}; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Obligation:</span> {{obligation_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Due Date:</span> {{due_date}}
      </div>
      <div style="margin-bottom: 10px; color: {{level_color}};">
        <span style="font-weight: 600;">Days Overdue:</span> <span style="font-size: 20px; font-weight: 700;">{{days_overdue}}</span>
      </div>
      <div>
        <span style="font-weight: 600;">Assigned To:</span> {{assigned_to}}
      </div>
    </div>

    {{#if escalation_message}}
    <div style="background-color: #F9FAFB; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px;">Escalation Message:</p>
      <p style="margin: 0;">{{escalation_message}}</p>
    </div>
    {{/if}}

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: {{level_color}}; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        Take Action
      </a>
      <a href="{{escalation_history_url}}" style="background-color: transparent; color: #026A67; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 2px solid #026A67;">
        View Escalation History
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      {{escalation_note}}
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
ESCALATION LEVEL {{level}}: {{obligation_title}} is {{days_overdue}} days overdue

An overdue obligation has been escalated to Level {{level}} and requires your immediate attention.

Obligation: {{obligation_title}}
Site: {{site_name}}
Due Date: {{due_date}}
Days Overdue: {{days_overdue}}
Assigned To: {{assigned_to}}

{{#if escalation_message}}
Escalation Message: {{escalation_message}}
{{/if}}

Take Action: {{action_url}}
View Escalation History: {{escalation_history_url}}

{{escalation_note}}
```

**Variables:**
- `level`: number - Escalation level (1-4)
- `level_color`: string - Color code based on level (#CB7C00, #F59E0B, #EF4444, #991B1B)
- `obligation_title`: string
- `obligation_id`: string
- `site_name`: string
- `company_name`: string
- `due_date`: string
- `days_overdue`: number
- `assigned_to`: string - Name of assigned user
- `escalation_message`: string (optional) - Custom escalation message
- `escalation_note`: string - Note about next escalation level
- `action_url`: string
- `escalation_history_url`: string
- `unsubscribe_url`: string

**Recipients:** Users in `level_N_recipients` array (configurable per workflow)

**Channels:**
- Levels 1-2: EMAIL, IN_APP
- Levels 3-4: EMAIL, IN_APP, SLACK (if configured)

**Priority:**
- Level 1: HIGH
- Level 2: HIGH
- Level 3: CRITICAL
- Level 4: URGENT

**Frequency:** Once per level transition

**Trigger:** Escalation level triggered based on `days_overdue` and workflow configuration

**Escalation Logic:**
- Level 1: Initial escalation (typically at overdue + configured threshold)
- Level 2: After Level 1 + time threshold with no action
- Level 3: After Level 2 + time threshold with no action
- Level 4: After Level 3 + time threshold with no action (highest level)

---

### 2.13.2 Escalation Resolved Template

**Subject Line Template:**
```
Escalation Resolved: {obligation_title}
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #1E7A50; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ✓
      </div>
    </div>

    <h1 style="color: #1E7A50; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Escalation Resolved
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      The previously escalated obligation has been completed and the escalation has been resolved.
    </p>

    <div style="background-color: #F0FDF4; border-left: 4px solid #1E7A50; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Obligation:</span> {{obligation_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Previous Escalation Level:</span> Level {{max_level_reached}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Completed By:</span> {{completed_by}}
      </div>
      <div>
        <span style="font-weight: 600;">Completion Date:</span> {{completion_date}}
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Obligation
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Thank you for your attention to this matter.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Escalation Resolved: {{obligation_title}}

The previously escalated obligation has been completed and the escalation has been resolved.

Obligation: {{obligation_title}}
Site: {{site_name}}
Previous Escalation Level: Level {{max_level_reached}}
Completed By: {{completed_by}}
Completion Date: {{completion_date}}

View Obligation: {{action_url}}

Thank you for your attention to this matter.
```

**Variables:**
- `obligation_title`: string
- `obligation_id`: string
- `site_name`: string
- `company_name`: string
- `max_level_reached`: number - Highest escalation level reached
- `completed_by`: string - Name of user who completed
- `completion_date`: string
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** All users who received escalation notifications

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once when resolved

**Escalation:** None

**Trigger:** Overdue obligation completed (status changes from OVERDUE to COMPLETED)

---

> [v1.3 UPDATE – Permit Workflow Notifications – 2025-12-01]

## 2.14 Permit Workflow Notification Templates

### 2.14.1 Permit Renewal Due Template

**Subject Line Template:**
```
Permit Renewal: '{permit_number}' expires on {expiry_date}
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #026A67; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        📋
      </div>
    </div>

    <h1 style="color: #026A67; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Permit Renewal Required
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      A permit is due for renewal. A renewal workflow has been automatically created to track the application process.
    </p>

    <div style="background-color: #F9FAFB; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Permit Number:</span> {{permit_number}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Permit Type:</span> {{permit_type}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px; color: #CB7C00;">
        <span style="font-weight: 600;">Expiry Date:</span> {{expiry_date}}
      </div>
      <div>
        <span style="font-weight: 600;">Days Until Expiry:</span> {{days_until_expiry}}
      </div>
    </div>

    <div style="background-color: #E8F4F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #026A67;">Renewal Workflow Created</p>
      <p style="margin: 0; font-size: 14px;">
        A renewal workflow has been created to help you track the application submission, regulator review, and approval process.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{workflow_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        View Renewal Workflow
      </a>
      <a href="{{permit_url}}" style="background-color: transparent; color: #026A67; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 2px solid #026A67;">
        View Permit
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Permit renewals are automatically tracked 90 days before expiry.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Permit Renewal: '{{permit_number}}' expires on {{expiry_date}}

A permit is due for renewal. A renewal workflow has been automatically created to track the application process.

Permit Number: {{permit_number}}
Permit Type: {{permit_type}}
Site: {{site_name}}
Expiry Date: {{expiry_date}}
Days Until Expiry: {{days_until_expiry}}

Renewal Workflow Created:
A renewal workflow has been created to help you track the application submission, regulator review, and approval process.

View Renewal Workflow: {{workflow_url}}
View Permit: {{permit_url}}

Permit renewals are automatically tracked 90 days before expiry.
```

**Variables:**
- `permit_number`: string
- `permit_id`: string
- `permit_type`: string
- `site_name`: string
- `company_name`: string
- `expiry_date`: string
- `days_until_expiry`: number
- `workflow_url`: string - URL to renewal workflow
- `permit_url`: string - URL to permit details
- `unsubscribe_url`: string

**Recipients:** Permit owner + Site managers

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once when renewal workflow created

**Escalation:** Level 1 (for tracking)

**Trigger:** Auto-creation of renewal workflow (typically 90 days before permit expiry)

---

### 2.14.2 Permit Workflow Submitted Template

**Subject Line Template:**
```
Permit {workflow_type} Submitted: '{permit_number}'
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #1E7A50; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        📤
      </div>
    </div>

    <h1 style="color: #1E7A50; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Permit Application Submitted
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      A permit {{workflow_type}} application has been submitted to the regulator.
    </p>

    <div style="background-color: #F0FDF4; border-left: 4px solid #1E7A50; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Workflow Type:</span> {{workflow_type}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Permit Number:</span> {{permit_number}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Submitted Date:</span> {{submitted_date}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Submitted To:</span> {{regulator_name}}
      </div>
      <div style="color: #026A67;">
        <span style="font-weight: 600;">Expected Response By:</span> {{regulator_response_deadline}}
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{workflow_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Track Application Status
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      You will be notified when the regulator responds or if the response deadline is missed.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Permit {{workflow_type}} Submitted: '{{permit_number}}'

A permit {{workflow_type}} application has been submitted to the regulator.

Workflow Type: {{workflow_type}}
Permit Number: {{permit_number}}
Site: {{site_name}}
Submitted Date: {{submitted_date}}
Submitted To: {{regulator_name}}
Expected Response By: {{regulator_response_deadline}}

Track Application Status: {{workflow_url}}

You will be notified when the regulator responds or if the response deadline is missed.
```

**Variables:**
- `workflow_type`: string - "Renewal", "Variation", "Transfer", "Surrender"
- `workflow_id`: string
- `permit_number`: string
- `permit_id`: string
- `site_name`: string
- `company_name`: string
- `submitted_date`: string
- `regulator_name`: string
- `regulator_response_deadline`: string
- `workflow_url`: string
- `unsubscribe_url`: string

**Recipients:** Workflow creator + Admins

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once when submitted

**Escalation:** None

**Trigger:** Workflow status changes to SUBMITTED

---

### 2.14.3 Regulator Response Overdue Template

**Subject Line Template:**
```
Regulator Response Overdue: {workflow_type} for '{permit_number}'
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #CB7C00; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⏰
      </div>
    </div>

    <h1 style="color: #CB7C00; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Regulator Response Overdue
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      The expected response deadline from the regulator has passed without a response.
    </p>

    <div style="background-color: #FFF8E8; border-left: 4px solid #CB7C00; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Workflow Type:</span> {{workflow_type}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Permit Number:</span> {{permit_number}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Submitted Date:</span> {{submitted_date}}
      </div>
      <div style="margin-bottom: 10px; color: #CB7C00;">
        <span style="font-weight: 600;">Expected Response:</span> {{regulator_response_deadline}}
      </div>
      <div style="color: #CB7C00;">
        <span style="font-weight: 600;">Days Overdue:</span> {{days_overdue}}
      </div>
    </div>

    <div style="background-color: #F9FAFB; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px;">Recommended Actions:</p>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Contact the regulator to check application status</li>
        <li>Update the workflow with any response received</li>
        <li>Document any delays or issues</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{workflow_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Update Workflow
      </a>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Regulator Response Overdue: {{workflow_type}} for '{{permit_number}}'

The expected response deadline from the regulator has passed without a response.

Workflow Type: {{workflow_type}}
Permit Number: {{permit_number}}
Site: {{site_name}}
Submitted Date: {{submitted_date}}
Expected Response: {{regulator_response_deadline}}
Days Overdue: {{days_overdue}}

Recommended Actions:
- Contact the regulator to check application status
- Update the workflow with any response received
- Document any delays or issues

Update Workflow: {{workflow_url}}
```

**Variables:**
- `workflow_type`: string
- `workflow_id`: string
- `permit_number`: string
- `permit_id`: string
- `site_name`: string
- `company_name`: string
- `submitted_date`: string
- `regulator_response_deadline`: string
- `days_overdue`: number
- `workflow_url`: string
- `unsubscribe_url`: string

**Recipients:** Workflow creator + Admins

**Channels:** EMAIL, IN_APP

**Priority:** HIGH

**Frequency:** Once when overdue, then weekly reminders

**Escalation:** Level 1

**Trigger:** `regulator_response_deadline` passed with no response recorded

---

### 2.14.4 Permit Workflow Approved Template

**Subject Line Template:**
```
Permit {workflow_type} Approved: '{permit_number}'
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #1E7A50; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ✓
      </div>
    </div>

    <h1 style="color: #1E7A50; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Permit Application Approved
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your permit {{workflow_type}} application has been approved by the regulator.
    </p>

    <div style="background-color: #F0FDF4; border-left: 4px solid #1E7A50; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Workflow Type:</span> {{workflow_type}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Permit Number:</span> {{permit_number}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Approved Date:</span> {{approved_date}}
      </div>
      {{#if new_expiry_date}}
      <div style="color: #1E7A50;">
        <span style="font-weight: 600;">New Expiry Date:</span> {{new_expiry_date}}
      </div>
      {{/if}}
    </div>

    {{#if obligations_count}}
    <div style="background-color: #E8F4F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #026A67;">Obligations Updated</p>
      <p style="margin: 0; font-size: 14px;">
        {{obligations_count}} obligation(s) have been updated to reflect the approved changes.
      </p>
    </div>
    {{/if}}

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{permit_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        View Updated Permit
      </a>
      <a href="{{workflow_url}}" style="background-color: transparent; color: #026A67; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 2px solid #026A67;">
        View Workflow
      </a>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Permit {{workflow_type}} Approved: '{{permit_number}}'

Great news! Your permit {{workflow_type}} application has been approved by the regulator.

Workflow Type: {{workflow_type}}
Permit Number: {{permit_number}}
Site: {{site_name}}
Approved Date: {{approved_date}}
{{#if new_expiry_date}}
New Expiry Date: {{new_expiry_date}}
{{/if}}

{{#if obligations_count}}
Obligations Updated:
{{obligations_count}} obligation(s) have been updated to reflect the approved changes.
{{/if}}

View Updated Permit: {{permit_url}}
View Workflow: {{workflow_url}}
```

**Variables:**
- `workflow_type`: string
- `workflow_id`: string
- `permit_number`: string
- `permit_id`: string
- `site_name`: string
- `company_name`: string
- `approved_date`: string
- `new_expiry_date`: string (optional, for renewals)
- `obligations_count`: number (optional)
- `permit_url`: string
- `workflow_url`: string
- `unsubscribe_url`: string

**Recipients:** Workflow creator + Affected users

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once when approved

**Escalation:** None

**Trigger:** Workflow status changes to APPROVED

---

### 2.14.5 Permit Surrender Inspection Due Template

**Subject Line Template:**
```
Final Inspection Required: Permit Surrender for '{permit_number}'
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #026A67; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        🔍
      </div>
    </div>

    <h1 style="color: #026A67; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Final Inspection Required
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      A final inspection is required as part of the permit surrender process.
    </p>

    <div style="background-color: #F9FAFB; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Permit Number:</span> {{permit_number}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Surrender Workflow Created:</span> {{workflow_created_date}}
      </div>
      <div style="color: #026A67;">
        <span style="font-weight: 600;">Inspection Scheduled:</span> {{final_inspection_date}}
      </div>
    </div>

    <div style="background-color: #E8F4F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #026A67;">Inspection Preparation</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
        <li>Ensure site is accessible for inspection</li>
        <li>Prepare all required documentation</li>
        <li>Coordinate with site personnel</li>
        <li>Review surrender application requirements</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{workflow_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Surrender Workflow
      </a>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Final Inspection Required: Permit Surrender for '{{permit_number}}'

A final inspection is required as part of the permit surrender process.

Permit Number: {{permit_number}}
Site: {{site_name}}
Surrender Workflow Created: {{workflow_created_date}}
Inspection Scheduled: {{final_inspection_date}}

Inspection Preparation:
- Ensure site is accessible for inspection
- Prepare all required documentation
- Coordinate with site personnel
- Review surrender application requirements

View Surrender Workflow: {{workflow_url}}
```

**Variables:**
- `workflow_id`: string
- `permit_number`: string
- `permit_id`: string
- `site_name`: string
- `company_name`: string
- `workflow_created_date`: string
- `final_inspection_date`: string
- `workflow_url`: string
- `unsubscribe_url`: string

**Recipients:** Site managers + Inspectors

**Channels:** EMAIL, IN_APP

**Priority:** HIGH

**Frequency:** Once when workflow created, reminder 7 days before inspection

**Escalation:** Level 1

**Trigger:** Surrender workflow created + final_inspection_date approaching

---

> [v1.3 UPDATE – Corrective Action Notifications – 2025-12-01]

## 2.15 Corrective Action Notification Templates

### 2.15.1 Corrective Action Item Assigned Template

**Subject Line Template:**
```
Action Item Assigned: '{item_title}'
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #026A67; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ✓
      </div>
    </div>

    <h1 style="color: #026A67; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Action Item Assigned
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      A corrective action item has been assigned to you.
    </p>

    <div style="background-color: #F9FAFB; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Action Item:</span> {{item_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Parent Action:</span> {{action_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Assigned By:</span> {{assigned_by}}
      </div>
      <div style="color: #026A67;">
        <span style="font-weight: 600;">Due Date:</span> {{due_date}}
      </div>
    </div>

    {{#if item_description}}
    <div style="background-color: #E8F4F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #026A67;">Description:</p>
      <p style="margin: 0; font-size: 14px;">{{item_description}}</p>
    </div>
    {{/if}}

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Action Item
      </a>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Action Item Assigned: '{{item_title}}'

A corrective action item has been assigned to you.

Action Item: {{item_title}}
Parent Action: {{action_title}}
Site: {{site_name}}
Assigned By: {{assigned_by}}
Due Date: {{due_date}}

{{#if item_description}}
Description: {{item_description}}
{{/if}}

View Action Item: {{action_url}}
```

**Variables:**
- `item_title`: string
- `item_id`: string
- `action_title`: string - Parent corrective action title
- `action_id`: string
- `site_name`: string
- `company_name`: string
- `assigned_by`: string - Name of user who assigned
- `due_date`: string
- `item_description`: string (optional)
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** assigned_to user

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once when assigned

**Escalation:** None

**Trigger:** New corrective action item created with assignment

---

### 2.15.2 Corrective Action Item Due Soon Template

**Subject Line Template:**
```
Action Item Due Soon: '{item_title}' - Due in {days_remaining} days
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #CB7C00; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⏰
      </div>
    </div>

    <h1 style="color: #CB7C00; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Action Item Due Soon
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      A corrective action item assigned to you is due soon.
    </p>

    <div style="background-color: #FFF8E8; border-left: 4px solid #CB7C00; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Action Item:</span> {{item_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Parent Action:</span> {{action_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px; color: #CB7C00;">
        <span style="font-weight: 600;">Due Date:</span> {{due_date}}
      </div>
      <div style="color: #CB7C00;">
        <span style="font-weight: 600;">Days Remaining:</span> <span style="font-size: 20px; font-weight: 700;">{{days_remaining}}</span>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #CB7C00; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        Complete Action Item
      </a>
      <a href="{{parent_action_url}}" style="background-color: transparent; color: #026A67; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 2px solid #026A67;">
        View Full Action
      </a>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Action Item Due Soon: '{{item_title}}' - Due in {{days_remaining}} days

A corrective action item assigned to you is due soon.

Action Item: {{item_title}}
Parent Action: {{action_title}}
Site: {{site_name}}
Due Date: {{due_date}}
Days Remaining: {{days_remaining}}

Complete Action Item: {{action_url}}
View Full Action: {{parent_action_url}}
```

**Variables:**
- `item_title`: string
- `item_id`: string
- `action_title`: string
- `action_id`: string
- `site_name`: string
- `company_name`: string
- `due_date`: string
- `days_remaining`: number (typically 3)
- `action_url`: string
- `parent_action_url`: string
- `unsubscribe_url`: string

**Recipients:** assigned_to user

**Channels:** EMAIL, IN_APP

**Priority:** HIGH

**Frequency:** Once at 3 days before due date

**Escalation:** None

**Trigger:** Item due_date in 3 days AND status != COMPLETED

---

### 2.15.3 Corrective Action Item Overdue Template

**Subject Line Template:**
```
OVERDUE: Action Item '{item_title}' - Was due {due_date}
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #B13434; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⚠️
      </div>
    </div>

    <h1 style="color: #B13434; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Action Item Overdue
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong style="color: #B13434;">A corrective action item assigned to you is now overdue.</strong>
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Action Item:</span> {{item_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Parent Action:</span> {{action_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px; color: #B13434;">
        <span style="font-weight: 600;">Due Date:</span> {{due_date}}
      </div>
      <div style="color: #B13434;">
        <span style="font-weight: 600;">Days Overdue:</span> <span style="font-size: 20px; font-weight: 700;">{{days_overdue}}</span>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #B13434; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Complete Now
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Daily reminders will continue until this action item is completed. The corrective action owner has been notified.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
OVERDUE: Action Item '{{item_title}}' - Was due {{due_date}}

A corrective action item assigned to you is now overdue.

Action Item: {{item_title}}
Parent Action: {{action_title}}
Site: {{site_name}}
Due Date: {{due_date}}
Days Overdue: {{days_overdue}}

Complete Now: {{action_url}}

Daily reminders will continue until this action item is completed. The corrective action owner has been notified.
```

**Variables:**
- `item_title`: string
- `item_id`: string
- `action_title`: string
- `action_id`: string
- `site_name`: string
- `company_name`: string
- `due_date`: string
- `days_overdue`: number
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** assigned_to user + Corrective action owner

**Channels:** EMAIL, IN_APP

**Priority:** CRITICAL

**Frequency:** Daily while overdue

**Escalation:** Level 1

**Trigger:** Item overdue AND status != COMPLETED

---

### 2.15.4 Corrective Action Ready for Closure Template

**Subject Line Template:**
```
Corrective Action Ready for Closure: '{action_title}'
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #1E7A50; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ✓
      </div>
    </div>

    <h1 style="color: #1E7A50; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Corrective Action Ready for Closure
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      All action items have been completed. This corrective action is ready for closure review{{#if requires_approval}} and approval{{/if}}.
    </p>

    <div style="background-color: #F0FDF4; border-left: 4px solid #1E7A50; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Corrective Action:</span> {{action_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Created Date:</span> {{created_date}}
      </div>
      <div style="margin-bottom: 10px; color: #1E7A50;">
        <span style="font-weight: 600;">Items Completed:</span> {{item_count}} / {{item_count}}
      </div>
      <div>
        <span style="font-weight: 600;">Lifecycle Phase:</span> RESOLUTION
      </div>
    </div>

    {{#if requires_approval}}
    <div style="background-color: #E8F4F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #026A67;">Manager Approval Required</p>
      <p style="margin: 0; font-size: 14px;">
        This corrective action requires manager approval before closure.
      </p>
    </div>
    {{/if}}

    <div style="text-align: center; margin: 30px 0;">
      {{#if requires_approval}}
      <a href="{{approval_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        Review & Approve
      </a>
      {{else}}
      <a href="{{action_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        Close Action
      </a>
      {{/if}}
      <a href="{{action_url}}" style="background-color: transparent; color: #026A67; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; border: 2px solid #026A67;">
        View Details
      </a>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Corrective Action Ready for Closure: '{{action_title}}'

All action items have been completed. This corrective action is ready for closure review{{#if requires_approval}} and approval{{/if}}.

Corrective Action: {{action_title}}
Site: {{site_name}}
Created Date: {{created_date}}
Items Completed: {{item_count}} / {{item_count}}
Lifecycle Phase: RESOLUTION

{{#if requires_approval}}
Manager Approval Required:
This corrective action requires manager approval before closure.

Review & Approve: {{approval_url}}
{{else}}
Close Action: {{action_url}}
{{/if}}

View Details: {{action_url}}
```

**Variables:**
- `action_title`: string
- `action_id`: string
- `site_name`: string
- `company_name`: string
- `created_date`: string
- `item_count`: number
- `requires_approval`: boolean
- `approval_url`: string (if requires_approval)
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** Corrective action owner + Managers (if approval required)

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once when all items completed

**Escalation:** None

**Trigger:** All items completed + lifecycle_phase = RESOLUTION

---

### 2.15.5 Corrective Action Closure Approved Template

**Subject Line Template:**
```
Corrective Action Closed: '{action_title}'
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #1E7A50; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ✓
      </div>
    </div>

    <h1 style="color: #1E7A50; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Corrective Action Closed
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      A corrective action has been successfully closed.
    </p>

    <div style="background-color: #F0FDF4; border-left: 4px solid #1E7A50; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Corrective Action:</span> {{action_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Closed Date:</span> {{closed_date}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Approved By:</span> {{approved_by_name}}
      </div>
      <div>
        <span style="font-weight: 600;">Total Items Completed:</span> {{item_count}}
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Closed Action
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Great work completing this corrective action!
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Corrective Action Closed: '{{action_title}}'

A corrective action has been successfully closed.

Corrective Action: {{action_title}}
Site: {{site_name}}
Closed Date: {{closed_date}}
Approved By: {{approved_by_name}}
Total Items Completed: {{item_count}}

View Closed Action: {{action_url}}

Great work completing this corrective action!
```

**Variables:**
- `action_title`: string
- `action_id`: string
- `site_name`: string
- `company_name`: string
- `closed_date`: string
- `approved_by_name`: string
- `item_count`: number
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** Corrective action owner + All assigned users

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once when closure approved

**Escalation:** None

**Trigger:** Closure approved by manager

---

> [v1.3 UPDATE – Module 4 Validation Notifications – 2025-12-01]

## 2.16 Waste Consignment Validation Notification Templates

### 2.16.1 Consignment Validation Failed Template

**Subject Line Template:**
```
Consignment Validation Failed: {consignment_reference} - {error_count} errors
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #B13434; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ✗
      </div>
    </div>

    <h1 style="color: #B13434; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Consignment Validation Failed
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      The waste consignment validation has failed. <strong style="color: #B13434;">{{error_count}} error(s)</strong> must be resolved before submission.
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Consignment:</span> {{consignment_reference}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Validation Date:</span> {{validation_date}}
      </div>
      <div style="color: #B13434;">
        <span style="font-weight: 600;">Errors Found:</span> <span style="font-size: 20px; font-weight: 700;">{{error_count}}</span>
      </div>
    </div>

    <div style="background-color: #F9FAFB; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #B13434;">Validation Errors:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
        {{#each validation_errors}}
        <li style="margin-bottom: 5px;">{{this}}</li>
        {{/each}}
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #B13434; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Fix Errors
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      The consignment cannot be submitted until all validation errors are resolved.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Consignment Validation Failed: {{consignment_reference}} - {{error_count}} errors

The waste consignment validation has failed. {{error_count}} error(s) must be resolved before submission.

Consignment: {{consignment_reference}}
Site: {{site_name}}
Validation Date: {{validation_date}}
Errors Found: {{error_count}}

Validation Errors:
{{#each validation_errors}}
- {{this}}
{{/each}}

Fix Errors: {{action_url}}

The consignment cannot be submitted until all validation errors are resolved.
```

**Variables:**
- `consignment_reference`: string
- `consignment_id`: string
- `site_name`: string
- `company_name`: string
- `validation_date`: string
- `error_count`: number
- `validation_errors`: Array<string> - List of error messages
- `action_url`: string - URL to edit consignment
- `unsubscribe_url`: string

**Recipients:** Consignment creator + Waste managers

**Channels:** EMAIL, IN_APP

**Priority:** HIGH

**Frequency:** Once per validation failure

**Escalation:** None

**Trigger:** Consignment validation completes with pre_validation_status = FAILED

---

### 2.16.2 Consignment Validation Warning Template

**Subject Line Template:**
```
Consignment Validation Warnings: {consignment_reference}
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #CB7C00; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⚠️
      </div>
    </div>

    <h1 style="color: #CB7C00; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Consignment Validation Warnings
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      The waste consignment has <strong>{{warning_count}} warning(s)</strong>. Review these before submission.
    </p>

    <div style="background-color: #FFF8E8; border-left: 4px solid #CB7C00; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Consignment:</span> {{consignment_reference}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Validation Date:</span> {{validation_date}}
      </div>
      <div style="color: #CB7C00;">
        <span style="font-weight: 600;">Warnings:</span> {{warning_count}}
      </div>
    </div>

    <div style="background-color: #F9FAFB; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #CB7C00;">Warnings Detected:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
        {{#each validation_warnings}}
        <li style="margin-bottom: 5px;">{{this}}</li>
        {{/each}}
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Review Consignment
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Warnings do not prevent submission, but should be reviewed to ensure accuracy.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Consignment Validation Warnings: {{consignment_reference}}

The waste consignment has {{warning_count}} warning(s). Review these before submission.

Consignment: {{consignment_reference}}
Site: {{site_name}}
Validation Date: {{validation_date}}
Warnings: {{warning_count}}

Warnings Detected:
{{#each validation_warnings}}
- {{this}}
{{/each}}

Review Consignment: {{action_url}}

Warnings do not prevent submission, but should be reviewed to ensure accuracy.
```

**Variables:**
- `consignment_reference`: string
- `consignment_id`: string
- `site_name`: string
- `company_name`: string
- `validation_date`: string
- `warning_count`: number
- `validation_warnings`: Array<string> - List of warning messages
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** Consignment creator

**Channels:** IN_APP only (warnings don't warrant email)

**Priority:** NORMAL

**Frequency:** Once per validation with warnings

**Escalation:** None

**Trigger:** Validation passes with WARNING severity results

---

> [v1.3 UPDATE – Module 3 Runtime Monitoring Notifications – 2025-12-01]

## 2.17 Runtime Monitoring Notification Templates

### 2.17.1 Runtime Validation Pending (Digest) Template

**Subject Line Template:**
```
Daily Digest: {count} manual runtime entries pending validation
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #026A67; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⏱️
      </div>
    </div>

    <h1 style="color: #026A67; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Manual Runtime Entries Pending Validation
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      You have <strong>{{count}}</strong> manual runtime entries awaiting your validation.
    </p>

    <div style="background-color: #F9FAFB; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px;">Pending Entries by Generator:</p>
      {{#each pending_by_generator}}
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;">
        <span>{{generator_name}}</span>
        <span style="font-weight: 600; color: #026A67;">{{entry_count}} entries</span>
      </div>
      {{/each}}
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{validation_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Review Entries
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      This is a daily digest. You will receive this notification once per day if there are pending entries.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Daily Digest: {{count}} manual runtime entries pending validation

You have {{count}} manual runtime entries awaiting your validation.

Pending Entries by Generator:
{{#each pending_by_generator}}
- {{generator_name}}: {{entry_count}} entries
{{/each}}

Review Entries: {{validation_url}}

This is a daily digest. You will receive this notification once per day if there are pending entries.
```

**Variables:**
- `count`: number - Total pending entries
- `pending_by_generator`: Array<{generator_name: string, entry_count: number}>
- `site_name`: string (optional, if single site)
- `company_name`: string
- `validation_url`: string - URL to validation queue
- `unsubscribe_url`: string

**Recipients:** Generator managers with pending validations

**Channels:** EMAIL (digest format)

**Priority:** NORMAL

**Frequency:** Daily digest (once per day if pending entries exist)

**Escalation:** None

**Trigger:** Manual runtime entries with validation_status = PENDING (aggregated daily)

---

### 2.17.2 Runtime Validation Rejected Template

**Subject Line Template:**
```
Manual Runtime Entry Rejected: {generator_name} ({runtime_date})
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #B13434; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ✗
      </div>
    </div>

    <h1 style="color: #B13434; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Manual Runtime Entry Rejected
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your manual runtime entry has been rejected by a manager.
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Generator:</span> {{generator_name}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Runtime Date:</span> {{runtime_date}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Runtime Value:</span> {{runtime_value}} hours
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Rejected By:</span> {{rejected_by}}
      </div>
      <div>
        <span style="font-weight: 600;">Rejection Date:</span> {{rejection_date}}
      </div>
    </div>

    {{#if rejection_reason}}
    <div style="background-color: #F9FAFB; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #B13434;">Rejection Reason:</p>
      <p style="margin: 0; font-size: 14px;">{{rejection_reason}}</p>
    </div>
    {{/if}}

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #026A67; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Resubmit Entry
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      Please review the rejection reason and correct the entry before resubmitting.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
Manual Runtime Entry Rejected: {{generator_name}} ({{runtime_date}})

Your manual runtime entry has been rejected by a manager.

Generator: {{generator_name}}
Runtime Date: {{runtime_date}}
Runtime Value: {{runtime_value}} hours
Rejected By: {{rejected_by}}
Rejection Date: {{rejection_date}}

{{#if rejection_reason}}
Rejection Reason: {{rejection_reason}}
{{/if}}

Resubmit Entry: {{action_url}}

Please review the rejection reason and correct the entry before resubmitting.
```

**Variables:**
- `generator_name`: string
- `generator_id`: string
- `runtime_date`: string
- `runtime_value`: number
- `rejected_by`: string - Name of manager who rejected
- `rejection_date`: string
- `rejection_reason`: string (optional)
- `site_name`: string
- `company_name`: string
- `action_url`: string - URL to edit/resubmit entry
- `unsubscribe_url`: string

**Recipients:** Entry creator

**Channels:** EMAIL, IN_APP

**Priority:** NORMAL

**Frequency:** Once when rejected

**Escalation:** None

**Trigger:** Manager rejects manual runtime entry (validation_status changes to REJECTED)

---

### 2.17.3 Runtime Exceedance Alert Template

**Subject Line Template:**
```
⚠️ Generator Runtime Limit Exceeded: {generator_identifier} ({exceedance_type})
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #B13434; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⚠️
      </div>
    </div>

    <h1 style="color: #B13434; font-size: 24px; margin-bottom: 20px; text-align: center;">
      Generator Runtime Limit Exceeded
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Generator <strong>{{generator_identifier}}</strong> has exceeded its runtime limit. Immediate action may be required to maintain compliance.
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Generator:</span> {{generator_identifier}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Run Date:</span> {{run_date}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Runtime Hours:</span> {{runtime_hours}} hours
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Run Duration:</span> {{run_duration}} hours
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Reason Code:</span> {{reason_code}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Exceedance Type:</span> {{exceedance_type}}
      </div>
      {{#if annual_percentage}}
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Annual Usage:</span> {{annual_percentage}}% of limit ({{current_year_hours}} / {{annual_limit}} hours)
      </div>
      {{/if}}
      {{#if monthly_percentage}}
      <div>
        <span style="font-weight: 600;">Monthly Usage:</span> {{monthly_percentage}}% of limit ({{current_month_hours}} / {{monthly_limit}} hours)
      </div>
      {{/if}}
    </div>

    {{#if exceedance_details}}
    <div style="background-color: #FFF7ED; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #F59E0B;">Exceedance Details:</p>
      <p style="margin: 0; font-size: 14px;">{{exceedance_details}}</p>
    </div>
    {{/if}}

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #B13434; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        View Generator Details
      </a>
    </div>

    <div style="background-color: #F9FAFB; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px;">Next Steps:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
        <li>Review generator runtime history</li>
        <li>Check Compliance Clock for related alerts</li>
        <li>Consider corrective actions if limit exceeded</li>
        <li>Update exemption records if applicable</li>
      </ul>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      This notification was triggered automatically when the runtime limit was exceeded. The Compliance Clock has been updated to reflect this exceedance.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
⚠️ Generator Runtime Limit Exceeded: {{generator_identifier}} ({{exceedance_type}})

Generator {{generator_identifier}} has exceeded its runtime limit. Immediate action may be required to maintain compliance.

Generator: {{generator_identifier}}
Run Date: {{run_date}}
Runtime Hours: {{runtime_hours}} hours
Run Duration: {{run_duration}} hours
Reason Code: {{reason_code}}
Exceedance Type: {{exceedance_type}}

{{#if annual_percentage}}
Annual Usage: {{annual_percentage}}% of limit ({{current_year_hours}} / {{annual_limit}} hours)
{{/if}}

{{#if monthly_percentage}}
Monthly Usage: {{monthly_percentage}}% of limit ({{current_month_hours}} / {{monthly_limit}} hours)
{{/if}}

{{#if exceedance_details}}
Exceedance Details: {{exceedance_details}}
{{/if}}

View Generator Details: {{action_url}}

Next Steps:
- Review generator runtime history
- Check Compliance Clock for related alerts
- Consider corrective actions if limit exceeded
- Update exemption records if applicable

This notification was triggered automatically when the runtime limit was exceeded. The Compliance Clock has been updated to reflect this exceedance.
```

**Variables:**
- `generator_identifier`: string - Generator identifier/name
- `generator_id`: string - Generator UUID
- `run_date`: string - Date when runtime occurred (ISO date)
- `runtime_hours`: number - Total runtime hours
- `run_duration`: number - Duration of runtime period in hours
- `reason_code`: string - Reason code (Test, Emergency, Maintenance, Normal)
- `exceedance_type`: string - Type of exceedance (THRESHOLD_EXCEEDED, ANNUAL_LIMIT_EXCEEDED, MONTHLY_LIMIT_EXCEEDED)
- `annual_percentage`: number - Percentage of annual limit used (optional)
- `current_year_hours`: number - Current year runtime hours (optional)
- `annual_limit`: number - Annual runtime hour limit (optional)
- `monthly_percentage`: number - Percentage of monthly limit used (optional)
- `current_month_hours`: number - Current month runtime hours (optional)
- `monthly_limit`: number - Monthly runtime hour limit (optional)
- `exceedance_details`: string - Additional details about the exceedance (optional)
- `site_name`: string
- `company_name`: string
- `action_url`: string - URL to generator details page
- `unsubscribe_url`: string

**Recipients:** Site managers, admins, and owners

**Channels:** EMAIL, IN_APP

**Priority:** HIGH

**Frequency:** Once per exceedance (per runtime entry)

**Escalation:** None (high priority notification)

**Trigger:** Background job detects runtime exceedance (job_escalation flags set to true)

**Business Logic:**
- Notification is sent when `CHECK_RUNTIME_EXCEEDANCES` job detects an exceedance
- Only sent if `job_escalation_notification_sent` is false
- Compliance Clock is updated with RED criticality status
- Notification includes both annual and monthly percentages if applicable
- Different messaging based on exceedance type (threshold vs limit exceeded)

---

> [v1.3 UPDATE – SLA Management Notifications – 2025-12-01]

## 2.18 SLA Breach Notification Templates

### 2.18.1 SLA Breach Detected Template

**Subject Line Template:**
```
SLA BREACH: '{deadline_title}' exceeded internal SLA
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #B13434; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        ⚠️
      </div>
    </div>

    <h1 style="color: #B13434; font-size: 24px; margin-bottom: 20px; text-align: center;">
      SLA BREACH DETECTED
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong style="color: #B13434;">An internal SLA has been breached.</strong> The regulatory deadline has not yet passed, but your internal buffer time has expired.
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Deadline:</span> {{deadline_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px; color: #B13434;">
        <span style="font-weight: 600;">Internal SLA:</span> {{sla_target_date}} (BREACHED)
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Regulatory Deadline:</span> {{due_date}}
      </div>
      <div style="color: #CB7C00;">
        <span style="font-weight: 600;">Days to Regulatory Deadline:</span> {{days_to_due_date}}
      </div>
    </div>

    <div style="background-color: #F9FAFB; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-weight: 600; margin-bottom: 10px;">What is an SLA?</p>
      <p style="margin: 0; font-size: 14px;">
        SLAs (Service Level Agreements) are internal buffer dates set before regulatory deadlines to ensure timely completion. This breach means your internal target has been missed, though you still have time before the legal deadline.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #B13434; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Take Action Now
      </a>
    </div>

    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; text-align: center;">
      You still have {{days_to_due_date}} days before the regulatory deadline.
    </p>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
SLA BREACH: '{{deadline_title}}' exceeded internal SLA

An internal SLA has been breached. The regulatory deadline has not yet passed, but your internal buffer time has expired.

Deadline: {{deadline_title}}
Site: {{site_name}}
Internal SLA: {{sla_target_date}} (BREACHED)
Regulatory Deadline: {{due_date}}
Days to Regulatory Deadline: {{days_to_due_date}}

What is an SLA?
SLAs (Service Level Agreements) are internal buffer dates set before regulatory deadlines to ensure timely completion. This breach means your internal target has been missed, though you still have time before the legal deadline.

Take Action Now: {{action_url}}

You still have {{days_to_due_date}} days before the regulatory deadline.
```

**Variables:**
- `deadline_title`: string
- `deadline_id`: string
- `site_name`: string
- `company_name`: string
- `sla_target_date`: string - Internal SLA date
- `due_date`: string - Regulatory deadline
- `days_to_due_date`: number - Days remaining until regulatory deadline
- `sla_breach_hours`: number - Hours since SLA breach
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** Deadline assignee + Managers

**Channels:** EMAIL, IN_APP

**Priority:** HIGH

**Severity:** CRITICAL

**Frequency:** Once when SLA breached

**Escalation:** Level 1

**Trigger:** Deadline crosses sla_target_date without completion

**Deep Linking:**
- `obligation_id`: UUID of related obligation (required)
- `action_url`: URL to obligation detail page (required)
- Format: `https://app.epcompliance.com/sites/{siteId}/obligations/{obligationId}`

---

### 2.18.2 SLA Breach Extended Template

**Subject Line Template:**
```
EXTENDED SLA BREACH: '{deadline_title}' - Breached for {sla_breach_duration_hours} hours
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #991B1B; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        🚨
      </div>
    </div>

    <h1 style="color: #991B1B; font-size: 24px; margin-bottom: 20px; text-align: center;">
      EXTENDED SLA BREACH
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong style="color: #991B1B;">URGENT:</strong> An SLA breach has been ongoing for <strong>{{sla_breach_duration_hours}} hours</strong> without resolution.
    </p>

    <div style="background-color: #FEF2F2; border: 2px solid #991B1B; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Deadline:</span> {{deadline_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px; color: #991B1B;">
        <span style="font-weight: 600;">Internal SLA:</span> {{sla_target_date}}
      </div>
      <div style="margin-bottom: 10px; color: #991B1B;">
        <span style="font-weight: 600;">SLA Breach Duration:</span> <span style="font-size: 20px; font-weight: 700;">{{sla_breach_duration_hours}} hours</span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Regulatory Deadline:</span> {{due_date}}
      </div>
      <div style="color: #CB7C00;">
        <span style="font-weight: 600;">Days to Regulatory Deadline:</span> {{days_to_due_date}}
      </div>
    </div>

    <div style="background-color: #FFF8E8; padding: 15px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #CB7C00;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #CB7C00;">Critical Action Required</p>
      <p style="margin: 0; font-size: 14px;">
        This deadline has been breaching its SLA for over 24 hours. Management has been notified. Please prioritize completion immediately to avoid missing the regulatory deadline.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #991B1B; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Resolve Immediately
      </a>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
EXTENDED SLA BREACH: '{{deadline_title}}' - Breached for {{sla_breach_duration_hours}} hours

URGENT: An SLA breach has been ongoing for {{sla_breach_duration_hours}} hours without resolution.

Deadline: {{deadline_title}}
Site: {{site_name}}
Internal SLA: {{sla_target_date}}
SLA Breach Duration: {{sla_breach_duration_hours}} hours
Regulatory Deadline: {{due_date}}
Days to Regulatory Deadline: {{days_to_due_date}}

Critical Action Required:
This deadline has been breaching its SLA for over 24 hours. Management has been notified. Please prioritize completion immediately to avoid missing the regulatory deadline.

Resolve Immediately: {{action_url}}
```

**Variables:**
- `deadline_title`: string
- `deadline_id`: string
- `site_name`: string
- `company_name`: string
- `sla_target_date`: string
- `due_date`: string
- `days_to_due_date`: number
- `sla_breach_duration_hours`: number - Hours since SLA breach
- `action_url`: string
- `unsubscribe_url`: string

**Recipients:** Site managers + Company admins

**Channels:** EMAIL, IN_APP, SLACK (if configured)

**Priority:** URGENT

**Severity:** CRITICAL

**Frequency:** Once when breach >24 hours, then daily

**Escalation:** Level 2

**Trigger:** SLA breach duration > 24 hours

**Deep Linking:**
- `obligation_id`: UUID of related obligation (required)
- `action_url`: URL to obligation detail page (required)
- Format: `https://app.epcompliance.com/sites/{siteId}/obligations/{obligationId}`

---

> [v1.4 UPDATE – Breach Detection Notifications – 2025-01-01]

## 2.19 Breach Detection Notification Templates

### 2.19.1 Compliance Breach Detected Template

**Purpose:** Alert when a regulatory deadline is breached (deadline passed without completion).

**Subject Line Template:**
```
🚨 COMPLIANCE BREACH: '{{obligation_title}}' deadline passed
```

**HTML Body Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #101314; background-color: #E2E6E7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background-color: #991B1B; color: #FFFFFF; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">
        🚨
      </div>
    </div>

    <h1 style="color: #991B1B; font-size: 24px; margin-bottom: 20px; text-align: center;">
      COMPLIANCE BREACH DETECTED
    </h1>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong style="color: #991B1B;">CRITICAL:</strong> A regulatory deadline has been breached. The obligation deadline has passed without completion.
    </p>

    <div style="background-color: #FEF2F2; border: 2px solid #991B1B; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Obligation:</span> {{obligation_title}}
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Site:</span> {{site_name}}
      </div>
      <div style="margin-bottom: 10px; color: #991B1B;">
        <span style="font-weight: 600;">Deadline:</span> {{deadline_date}} <strong>(BREACHED)</strong>
      </div>
      <div style="margin-bottom: 10px; color: #991B1B;">
        <span style="font-weight: 600;">Days Overdue:</span> <span style="font-size: 20px; font-weight: 700;">{{days_overdue}} days</span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="font-weight: 600;">Regulator:</span> {{regulator_name}}
      </div>
    </div>

    <div style="background-color: #FFF8E8; padding: 15px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #CB7C00;">
      <p style="font-weight: 600; margin-bottom: 10px; color: #CB7C00;">Immediate Action Required</p>
      <p style="margin: 0; font-size: 14px;">
        This compliance breach may result in regulatory penalties. Please complete the obligation and upload evidence immediately. Management has been notified.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{action_url}}" style="background-color: #991B1B; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin-right: 10px;">
        View Obligation
      </a>
      <a href="{{evidence_upload_url}}" style="background-color: #10B981; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Upload Evidence
      </a>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**
```
🚨 COMPLIANCE BREACH: '{{obligation_title}}' deadline passed

CRITICAL: A regulatory deadline has been breached. The obligation deadline has passed without completion.

Obligation: {{obligation_title}}
Site: {{site_name}}
Deadline: {{deadline_date}} (BREACHED)
Days Overdue: {{days_overdue}} days
Regulator: {{regulator_name}}

Immediate Action Required:
This compliance breach may result in regulatory penalties. Please complete the obligation and upload evidence immediately. Management has been notified.

View Obligation: {{action_url}}
Upload Evidence: {{evidence_upload_url}}
```

**Variables:**
- `obligation_title`: string
- `obligation_id`: UUID
- `deadline_id`: UUID
- `site_name`: string
- `company_name`: string
- `deadline_date`: string - Formatted deadline date
- `days_overdue`: number - Days since deadline passed
- `regulator_name`: string - Name of regulator
- `action_url`: string - URL to obligation detail page (REQUIRED)
- `evidence_upload_url`: string - URL to upload evidence
- `unsubscribe_url`: string

**Recipients:** Obligation assignee + Site managers + Company admins

**Channels:** EMAIL, SMS, IN_APP

**Priority:** CRITICAL

**Severity:** CRITICAL

**Frequency:** Immediately when breach detected, then daily until resolved

**Escalation:** Level 1 → Level 2 (24h) → Level 3 (48h)

**Trigger:** Deadline passes without obligation completion

**Deep Linking:**
- `obligation_id`: UUID of breached obligation (required)
- `action_url`: URL to obligation detail page (required)
- Format: `https://app.epcompliance.com/sites/{siteId}/obligations/{obligationId}`

---

### 2.19.2 Regulatory Deadline Breach Template

**Purpose:** Alert when a regulatory deadline is breached and evidence is missing.

**Subject Line Template:**
```
🚨 REGULATORY BREACH: '{{obligation_title}}' - Evidence missing
```

**HTML Body Template:**
Similar structure to Compliance Breach Detected, but with focus on missing evidence.

**Variables:**
- Same as Compliance Breach Detected
- `evidence_required`: string - Description of required evidence
- `evidence_status`: string - Current evidence status

**Recipients:** Obligation assignee + Site managers + Company admins

**Channels:** EMAIL, SMS, IN_APP

**Priority:** CRITICAL

**Severity:** CRITICAL

**Frequency:** Immediately when breach detected, then daily until resolved

**Escalation:** Level 1 → Level 2 (24h) → Level 3 (48h)

**Trigger:** Deadline passes without required evidence

**Deep Linking:**
- `obligation_id`: UUID of breached obligation (required)
- `evidence_id`: UUID of missing evidence (if applicable)
- `action_url`: URL to obligation detail page (required)
- Format: `https://app.epcompliance.com/sites/{siteId}/obligations/{obligationId}`

---

# 3. SMS Notification Templates

## 3.1 SMS Template Structure

SMS notifications are concise, action-oriented messages with character limits:
- **Standard SMS:** 160 characters (single message)
- **Concatenated SMS:** 320 characters (2 messages, auto-concatenated by provider)

### Variable Substitution

Same variable substitution system as email templates, but with URL shortening for links.

### URL Shortening

All URLs in SMS messages are shortened using a URL shortener service:

```typescript
async function shortenUrl(longUrl: string): Promise<string> {
  // Use URL shortener service (e.g., bit.ly API)
  // Store mapping in database for analytics
  const shortUrl = await urlShortener.shorten(longUrl);
  return shortUrl;
}
```

---

## 3.2 Critical Deadline SMS (1 Day Remaining)

**Template:**
```
{{site_name}}: {{obligation_title}} due tomorrow. View: {{short_link}}
```

**Character Count:** <160 (with URL shortening)

**Variables:**
- `site_name`: string - Site name (abbreviated if needed)
- `obligation_title`: string - Obligation title (truncated if needed)
- `short_link`: string - Shortened URL to obligation

**Example Rendered SMS:**
```
Site A: Monthly Monitoring Report due tomorrow. View: https://epc.ly/abc123
```

**Trigger:** Sent only for 1-day deadline warnings (CRITICAL severity)

---

## 3.3 Limit Breach SMS (100% Threshold)

**Template:**
```
{{site_name}}: {{parameter_name}} breach ({{current_value}}/{{limit_value}}). View: {{short_link}}
```

**Character Count:** <160 (with URL shortening)

**Variables:**
- `site_name`: string
- `parameter_name`: string - Parameter name (e.g., "BOD", "Run-Hours")
- `current_value`: number - Current value
- `limit_value`: number - Limit value
- `short_link`: string - Shortened URL

**Example Rendered SMS:**
```
Site A: BOD breach (45/40). View: https://epc.ly/xyz789
```

**Trigger:** Sent only for 100% threshold breaches (CRITICAL severity)

---

# 4. Escalation Chain Logic

## 4.1 Escalation State Machine

Escalations follow a hierarchical state machine with automatic progression:

```
PENDING
  │
  ├─► ESCALATED_LEVEL_1 (Site Manager)
  │     │
  │     ├─► (24h no action) ──► ESCALATED_LEVEL_2 (Compliance Manager)
  │     │                           │
  │     │                           ├─► (48h no action) ──► ESCALATED_LEVEL_3 (MD)
  │     │                           │                         │
  │     │                           │                         └─► RESOLVED
  │     │                           │
  │     │                           └─► RESOLVED
  │     │
  │     └─► RESOLVED
  │
  └─► RESOLVED (immediate resolution)
```

### Escalation Levels

| Level | Role | Description |
|-------|------|-------------|
| Level 1 | Site Manager | First point of contact, immediate notification |
| Level 2 | Compliance Manager | Escalated after 24h of no action (Level 1) |
| Level 3 | MD (Managing Director) | Escalated after 48h of no action (Level 2) |

### Escalation State Enum

```typescript
enum EscalationState {
  PENDING = 'PENDING',
  ESCALATED_LEVEL_1 = 'ESCALATED_LEVEL_1',
  ESCALATED_LEVEL_2 = 'ESCALATED_LEVEL_2',
  ESCALATED_LEVEL_3 = 'ESCALATED_LEVEL_3',
  RESOLVED = 'RESOLVED'
}
```

---

## 4.2 Escalation Rules by Notification Type

### A. Deadline Warnings

**7-Day Warning:**
- Level 1 (Site Manager): Immediate notification
- Escalation: No escalation (informational only)

**3-Day Warning:**
- Level 1 (Site Manager): Immediate notification
- Level 1 → Level 2 (Compliance Manager): If no action after 24 hours
- Level 2 → Level 3 (MD): If no action after 48 hours (from Level 2 notification)
- Escalation Check: Query `obligations` table for evidence linked after Level 1 notification

**1-Day Warning:**
- Level 1 (Site Manager): Immediate notification
- Level 1 → Level 2 (Compliance Manager): If no action after 24 hours
- Level 2 → Level 3 (MD): If no action after 48 hours (from Level 2 notification)
- Level 3 (MD): If no action after 48 hours
- Escalation Check: Query `obligations` table for evidence linked

### B. Overdue Obligations

**Escalation Timeline:**
- Level 1 (Site Manager): Immediate on overdue detection
- Level 1 → Level 2 (Compliance Manager): If no action after 24 hours
- Level 2 → Level 3 (MD): If no action after 48 hours (from Level 2 notification)
- Level 3 (MD): If no action after 48 hours

**Escalation Check Logic:**
```typescript
async function checkEscalation(obligationId: string, escalationLevel: number): Promise<boolean> {
  const obligation = await db.query(`
    SELECT 
      o.id,
      o.status,
      COUNT(ei.id) as evidence_count,
      MAX(ei.created_at) as latest_evidence_date,
      MAX(n.created_at) as latest_notification_date
    FROM obligations o
    LEFT JOIN evidence_items ei ON ei.obligation_id = o.id
    LEFT JOIN notifications n ON n.entity_id = o.id 
      AND n.entity_type = 'obligation'
      AND n.escalation_level = $1
    WHERE o.id = $2
    GROUP BY o.id
  `, [escalationLevel, obligationId]);
  
  // Check if evidence was added after last escalation
  if (obligation.evidence_count > 0 && 
      obligation.latest_evidence_date > obligation.latest_notification_date) {
    return false; // Resolved, no escalation needed
  }
  
  // Check if enough time has passed
  const hoursSinceNotification = 
    (Date.now() - new Date(obligation.latest_notification_date).getTime()) / (1000 * 60 * 60);
  
  if (escalationLevel === 1 && hoursSinceNotification >= 24) {
    return true; // Escalate to Level 2
  }
  
  if (escalationLevel === 2 && hoursSinceNotification >= 48) {
    return true; // Escalate to Level 3
  }
  
  return false;
}
```

### C. Evidence Reminders

**Escalation Timeline:**
- Level 1 (Site Manager): Immediate on reminder
- Level 2 (Compliance Manager): If no evidence after 7-day grace period (see PLS Section B.4.1.1)
- Level 3 (MD): If no evidence after 14 days overdue

**Grace Period Logic:**
```typescript
function isWithinGracePeriod(deadlineDate: Date): boolean {
  const gracePeriodEnd = new Date(deadlineDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7-day grace period
  
  return new Date() <= gracePeriodEnd;
}
```

### D. Limit Breaches

**Escalation Timeline (Immediate):**
- Level 1 (Site Manager): Immediate on 80% threshold
- Level 2 (Compliance Manager): Immediate on 90% threshold
- Level 3 (MD): Immediate on 100% threshold

**No Time-Based Escalation:** Limit breaches escalate immediately based on threshold, not time.

---

## 4.3 Escalation Recipient Determination

### Role-Based Lookup

Escalation recipients are determined by querying the `user_roles` and `user_site_assignments` tables:

```typescript
interface EscalationRecipient {
  userId: string;
  email: string;
  phone?: string;
  role: string;
  level: number;
}

async function getEscalationRecipients(
  siteId: string,
  companyId: string,
  level: number
): Promise<EscalationRecipient[]> {
  const roleMap = {
    1: ['ADMIN', 'OWNER'], // Site Manager (site-level admin/owner)
    2: ['ADMIN', 'OWNER'], // Compliance Manager (company-level admin/owner)
    3: ['OWNER'] // MD (company owner only)
  };
  
  const roles = roleMap[level];
  
  if (level === 1) {
    // Level 1: Site Manager (site-level admin/owner)
    const recipients = await db.query(`
      SELECT DISTINCT
        u.id as user_id,
        u.email,
        u.phone,
        ur.role
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN user_site_assignments usa ON usa.user_id = u.id
      WHERE usa.site_id = $1
        AND ur.role = ANY($2::text[])
        AND u.company_id = $3
      ORDER BY ur.role DESC -- OWNER first, then ADMIN
      LIMIT 5
    `, [siteId, roles, companyId]);
    
    return recipients.map(r => ({
      userId: r.user_id,
      email: r.email,
      phone: r.phone,
      role: r.role,
      level: 1
    }));
  } else if (level === 2) {
    // Level 2: Compliance Manager (company-level admin/owner)
    const recipients = await db.query(`
      SELECT DISTINCT
        u.id as user_id,
        u.email,
        u.phone,
        ur.role
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.company_id = $1
        AND ur.role = ANY($2::text[])
      ORDER BY ur.role DESC -- OWNER first, then ADMIN
      LIMIT 5
    `, [companyId, roles]);
    
    return recipients.map(r => ({
      userId: r.user_id,
      email: r.email,
      phone: r.phone,
      role: r.role,
      level: 2
    }));
  } else {
    // Level 3: MD (company owner only)
    const recipients = await db.query(`
      SELECT DISTINCT
        u.id as user_id,
        u.email,
        u.phone,
        ur.role
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.company_id = $1
        AND ur.role = 'OWNER'
      LIMIT 5
    `, [companyId]);
    
    return recipients.map(r => ({
      userId: r.user_id,
      email: r.email,
      phone: r.phone,
      role: r.role,
      level: 3
    }));
  }
}
```

---

## 4.4 Escalation Implementation

### Escalation State Tracking

Escalation state is tracked in the `notifications` table using the `escalation_level` and `escalation_state` fields:

```sql
-- Create escalation notification
INSERT INTO notifications (
  user_id,
  company_id,
  site_id,
  alert_type,
  severity,
  channel,
  title,
  message,
  entity_type,
  entity_id,
  action_url,
  is_escalation,
  escalation_level,
  metadata
) VALUES (
  :recipient_user_id,
  :company_id,
  :site_id,
  'ESCALATION',
  'CRITICAL',
  'EMAIL',
  'Escalated: ' || :original_title,
  'This obligation has been escalated to your attention.',
  :entity_type,
  :entity_id,
  :action_url,
  true,
  :escalation_level,
  jsonb_build_object(
    'original_notification_id', :original_notification_id,
    'escalation_reason', :escalation_reason,
    'time_since_original', :time_since_original
  )
);
```

### Escalation History Logging

Escalation history is logged in the `notifications` table metadata:

```typescript
interface EscalationHistory {
  originalNotificationId: string;
  escalationLevel: number;
  escalatedAt: string;
  escalatedTo: string; // User ID
  reason: string;
  resolvedAt?: string;
  resolvedBy?: string;
}
```

### Escalation Resolution Tracking

Escalations are marked as resolved when:
1. Evidence is linked to the obligation
2. Obligation status changes to "COMPLETED"
3. User manually marks as resolved

```typescript
async function resolveEscalation(notificationId: string, resolvedBy: string): Promise<void> {
  await db.query(`
    UPDATE notifications
    SET 
      metadata = jsonb_set(
        metadata,
        '{escalation_history,resolved_at}',
        to_jsonb(NOW()::text)
      ),
      metadata = jsonb_set(
        metadata,
        '{escalation_history,resolved_by}',
        to_jsonb($1)
      )
    WHERE id = $2
  `, [resolvedBy, notificationId]);
  
  // Also mark related escalation notifications as resolved
  await db.query(`
    UPDATE notifications
    SET metadata = jsonb_set(
      metadata,
      '{escalation_state}',
      '"RESOLVED"'
    )
    WHERE metadata->>'original_notification_id' = $1
      AND is_escalation = true
  `, [notificationId]);
}
```

---

# 5. Notification Queue Database Schema

## 5.1 Enhanced Notifications Table

The `notifications` table is enhanced to support delivery tracking, escalation, and provider integration:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient Information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_phone TEXT, -- For SMS notifications
  
  -- Notification Details
  notification_type TEXT NOT NULL 
    CHECK (notification_type IN (
      'DEADLINE_WARNING_7D',
      'DEADLINE_WARNING_3D',
      'DEADLINE_WARNING_1D',
      'OVERDUE_OBLIGATION',
      'EVIDENCE_REMINDER',
      'PERMIT_RENEWAL_REMINDER',
      'PARAMETER_EXCEEDANCE_80',
      'PARAMETER_EXCEEDANCE_90',
      'PARAMETER_EXCEEDANCE_100',
      'RUN_HOUR_BREACH_80',
      'RUN_HOUR_BREACH_90',
      'RUN_HOUR_BREACH_100',
      'AUDIT_PACK_READY',
      'REGULATOR_PACK_READY',
      'TENDER_PACK_READY',
      'BOARD_PACK_READY',
      'INSURER_PACK_READY',
      'PACK_DISTRIBUTED',
      'CONSULTANT_CLIENT_ASSIGNED',
      'CONSULTANT_CLIENT_PACK_GENERATED',
      'CONSULTANT_CLIENT_ACTIVITY',
      'SYSTEM_ALERT',
      'ESCALATION',
      'DEADLINE_ALERT',
      'EXCEEDANCE',
      'BREACH',
      'MODULE_ACTIVATION',
      'SLA_BREACH_DETECTED',
      'SLA_BREACH_EXTENDED',
      'COMPLIANCE_BREACH_DETECTED',
      'REGULATORY_DEADLINE_BREACH'
    )),
  channel TEXT NOT NULL 
    CHECK (channel IN ('EMAIL', 'SMS', 'IN_APP', 'PUSH')),
  priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'URGENT')),
  severity TEXT NOT NULL DEFAULT 'INFO'
    CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  
  -- Content
  subject TEXT NOT NULL, -- Email subject or SMS preview
  body_html TEXT, -- HTML email body
  body_text TEXT NOT NULL, -- Plain text email body or SMS content
  variables JSONB NOT NULL DEFAULT '{}', -- Template variables used
  
  -- Delivery Tracking
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING', 'CANCELLED')),
  delivery_status TEXT
    CHECK (delivery_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED')),
  delivery_provider TEXT -- 'SENDGRID', 'TWILIO', 'SUPABASE_REALTIME'
  delivery_provider_id TEXT, -- Provider's message ID for tracking
  delivery_error TEXT, -- Error message if delivery failed
  
  -- Escalation
  is_escalation BOOLEAN NOT NULL DEFAULT false,
  escalation_level INTEGER CHECK (escalation_level >= 1 AND escalation_level <= 3),
  escalation_state TEXT DEFAULT 'PENDING'
    CHECK (escalation_state IN ('PENDING', 'ESCALATED_LEVEL_1', 'ESCALATED_LEVEL_2', 'ESCALATED_LEVEL_3', 'RESOLVED')),
  escalation_delay_minutes INTEGER DEFAULT 60 
    CHECK (escalation_delay_minutes >= 0),
  max_retries INTEGER DEFAULT 3 
    CHECK (max_retries >= 0),
  
  -- Entity Reference (Deep Linking)
  entity_type TEXT, -- 'obligation', 'deadline', 'evidence', 'audit_pack', etc.
  entity_id UUID,
  obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL, -- Deep link to obligation
  evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL, -- Deep link to evidence
  action_url TEXT NOT NULL, -- URL to relevant page (REQUIRED for all notifications)
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  actioned_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_site_id ON notifications(site_id);
CREATE INDEX idx_notifications_notification_type ON notifications(notification_type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX idx_notifications_escalation_state ON notifications(escalation_state);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_obligation_id ON notifications(obligation_id);
CREATE INDEX idx_notifications_evidence_id ON notifications(evidence_id);
CREATE INDEX idx_notifications_severity ON notifications(severity);
CREATE INDEX idx_notifications_severity_priority ON notifications(severity, priority);

-- Composite index for escalation checks
CREATE INDEX idx_notifications_escalation_check ON notifications(entity_type, entity_id, escalation_state, created_at);
```

---

## 5.2 User Notification Preferences Table

```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Preference Scope
  notification_type TEXT NOT NULL
    CHECK (notification_type IN (
      'DEADLINE_WARNING_7D',
      'DEADLINE_WARNING_3D',
      'DEADLINE_WARNING_1D',
      'OVERDUE_OBLIGATION',
      'EVIDENCE_REMINDER',
      'PERMIT_RENEWAL_REMINDER',
      'PARAMETER_EXCEEDANCE_80',
      'PARAMETER_EXCEEDANCE_90',
      'PARAMETER_EXCEEDANCE_100',
      'RUN_HOUR_BREACH_80',
      'RUN_HOUR_BREACH_90',
      'RUN_HOUR_BREACH_100',
      'AUDIT_PACK_READY',
      'REGULATOR_PACK_READY',
      'TENDER_PACK_READY',
      'BOARD_PACK_READY',
      'INSURER_PACK_READY',
      'PACK_DISTRIBUTED',
      'CONSULTANT_CLIENT_ASSIGNED',
      'CONSULTANT_CLIENT_PACK_GENERATED',
      'CONSULTANT_CLIENT_ACTIVITY',
      'SYSTEM_ALERT',
      'ESCALATION',
      'ALL' -- For default preferences
    )),
  
  -- Channel Preferences
  channel_preference TEXT NOT NULL DEFAULT 'ALL_CHANNELS'
    CHECK (channel_preference IN ('EMAIL_ONLY', 'SMS_ONLY', 'EMAIL_AND_SMS', 'IN_APP_ONLY', 'ALL_CHANNELS')),
  
  -- Frequency Preferences
  frequency_preference TEXT NOT NULL DEFAULT 'IMMEDIATE'
    CHECK (frequency_preference IN ('IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST', 'NEVER')),
  
  -- Enabled/Disabled
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one preference per user per notification type
  UNIQUE(user_id, notification_type)
);

-- Indexes
CREATE INDEX idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_preferences_notification_type ON user_notification_preferences(notification_type);
```

---

## 5.3 Delivery Status Tracking

### Status Transitions

```
PENDING → QUEUED → SENDING → SENT → DELIVERED
                                    ↓
                                 FAILED → RETRYING → SENT → DELIVERED
                                                      ↓
                                                   CANCELLED
```

### Delivery Status Enum

- **PENDING:** Notification created but not yet queued
- **QUEUED:** Notification queued for delivery
- **SENDING:** Currently being sent to provider
- **SENT:** Sent to provider (awaiting delivery confirmation)
- **DELIVERED:** Confirmed delivered to recipient
- **FAILED:** Delivery failed (will retry)
- **RETRYING:** Retrying after failure
- **CANCELLED:** Cancelled before delivery

---

# 6. Rate Limiting

## 6.1 Rate Limit Rules

Rate limiting prevents notification spam and provider rate limit violations:

| Scope | Email Limit | SMS Limit |
|-------|-------------|-----------|
| Per User | 100/hour | 10/hour |
| Per Company | 500/hour | 50/hour |
| Global | 10,000/hour | 1,000/hour |

### Rate Limit Enforcement

Rate limits are enforced using Redis for fast lookups:

```typescript
interface RateLimitKey {
  scope: 'user' | 'company' | 'global';
  id: string;
  channel: 'EMAIL' | 'SMS';
}

async function checkRateLimit(key: RateLimitKey): Promise<boolean> {
  const redisKey = `rate_limit:${key.scope}:${key.id}:${key.channel}`;
  const current = await redis.get(redisKey);
  const limit = getRateLimit(key);
  
  if (current && parseInt(current) >= limit) {
    return false; // Rate limit exceeded
  }
  
  // Increment counter
  await redis.incr(redisKey);
  await redis.expire(redisKey, 3600); // 1 hour TTL
  
  return true; // Within limit
}

function getRateLimit(key: RateLimitKey): number {
  if (key.channel === 'EMAIL') {
    return key.scope === 'user' ? 100 : key.scope === 'company' ? 500 : 10000;
  } else {
    return key.scope === 'user' ? 10 : key.scope === 'company' ? 50 : 1000;
  }
}
```

---

## 6.2 Rate Limit Error Handling

When rate limits are exceeded:

1. **Queue for Delayed Delivery:** Notification is queued with `scheduled_for` set to next available slot
2. **Log Warning:** Rate limit exceeded event is logged
3. **Notify Admin (if critical):** Critical notifications trigger admin alerts

```typescript
async function handleRateLimitExceeded(
  notification: Notification,
  rateLimitKey: RateLimitKey
): Promise<void> {
  // Calculate next available slot
  const nextSlot = await calculateNextAvailableSlot(rateLimitKey);
  
  // Update notification scheduled_for
  await db.query(`
    UPDATE notifications
    SET 
      scheduled_for = $1,
      status = 'QUEUED',
      metadata = jsonb_set(
        metadata,
        '{rate_limit_exceeded}',
        jsonb_build_object(
          'exceeded_at', NOW(),
          'rescheduled_for', $1
        )
      )
    WHERE id = $2
  `, [nextSlot, notification.id]);
  
  // Log warning
  logger.warn('Rate limit exceeded', {
    notificationId: notification.id,
    rateLimitKey,
    rescheduledFor: nextSlot
  });
  
  // Alert admin if critical
  if (notification.priority === 'CRITICAL' || notification.priority === 'URGENT') {
    await createAdminAlert({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'WARNING',
      message: `Rate limit exceeded for ${rateLimitKey.scope} ${rateLimitKey.id}`,
      metadata: { notificationId: notification.id, rateLimitKey }
    });
  }
}
```

---

## 6.3 Queue Prioritization

Notifications are prioritized in the queue:

| Priority | Description | Examples |
|----------|-------------|----------|
| CRITICAL | Immediate delivery required | 1-day deadlines, 100% breaches |
| URGENT | High priority | Overdue obligations, escalations |
| HIGH | Important but not urgent | 3-day deadlines, 90% breaches |
| NORMAL | Standard priority | 7-day deadlines, evidence reminders |
| LOW | Low priority | Audit pack ready, system alerts |

**Queue Processing Order:** CRITICAL → URGENT → HIGH → NORMAL → LOW

---

## 6.4 Rate Limit Reset Logic

Rate limit counters reset hourly:

```typescript
// Redis keys expire after 1 hour (3600 seconds)
// This automatically resets the counter

// For database-based rate limiting (if needed):
async function resetRateLimits(): Promise<void> {
  await db.query(`
    DELETE FROM rate_limit_counters
    WHERE created_at < NOW() - INTERVAL '1 hour'
  `);
}

// Run as scheduled job (hourly)
```

---

# 7. Notification Preferences

## 7.1 Preference Application Logic

User preferences filter notifications before sending:

```typescript
async function applyPreferences(
  notification: Notification,
  userId: string
): Promise<boolean> {
  // Get user preferences (with fallback to defaults)
  const preferences = await getUserPreferences(userId, notification.notification_type);
  
  // Check if notification type is enabled
  if (!preferences.enabled) {
    return false; // Skip notification
  }
  
  // Check channel preference
  if (preferences.channel_preference === 'EMAIL_ONLY' && notification.channel !== 'EMAIL') {
    return false;
  }
  if (preferences.channel_preference === 'SMS_ONLY' && notification.channel !== 'SMS') {
    return false;
  }
  if (preferences.channel_preference === 'IN_APP_ONLY' && notification.channel !== 'IN_APP') {
    return false;
  }
  
  // Check frequency preference
  if (preferences.frequency_preference === 'NEVER') {
    return false;
  }
  
  if (preferences.frequency_preference === 'DAILY_DIGEST') {
    // Queue for daily digest instead of immediate
    await queueForDigest(notification, userId, 'DAILY');
    return false; // Don't send immediately
  }
  
  if (preferences.frequency_preference === 'WEEKLY_DIGEST') {
    // Queue for weekly digest instead of immediate
    await queueForDigest(notification, userId, 'WEEKLY');
    return false; // Don't send immediately
  }
  
  // IMMEDIATE: Send now
  return true;
}
```

---

## 7.2 Preference Inheritance

Preferences follow an inheritance hierarchy:

1. **User-Specific Preferences:** Highest priority (explicit user settings)
2. **Company Defaults:** Fallback if user preference not set
3. **System Defaults:** Final fallback (all notifications enabled, immediate delivery)

```typescript
async function getUserPreferences(
  userId: string,
  notificationType: string
): Promise<NotificationPreference> {
  // Try user-specific preference
  let preference = await db.query(`
    SELECT * FROM user_notification_preferences
    WHERE user_id = $1 AND notification_type = $2
  `, [userId, notificationType]);
  
  if (preference) {
    return preference;
  }
  
  // Try user's "ALL" preference
  preference = await db.query(`
    SELECT * FROM user_notification_preferences
    WHERE user_id = $1 AND notification_type = 'ALL'
  `, [userId]);
  
  if (preference) {
    return preference;
  }
  
  // Fallback to system defaults
  return {
    channel_preference: 'ALL_CHANNELS',
    frequency_preference: 'IMMEDIATE',
    enabled: true
  };
}
```

---

## 7.3 Preference Management API

**Reference:** Backend API Specification (2.5) Section 5.E

**GET /api/v1/users/{userId}/notification-preferences**

Returns user's notification preferences.

**PUT /api/v1/users/{userId}/notification-preferences**

Updates user's notification preferences.

```typescript
interface NotificationPreferenceRequest {
  notification_type: string;
  channel_preference: 'EMAIL_ONLY' | 'SMS_ONLY' | 'EMAIL_AND_SMS' | 'IN_APP_ONLY' | 'ALL_CHANNELS';
  frequency_preference: 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST' | 'NEVER';
  enabled: boolean;
}
```

---

# 8. Integration Points

## 8.1 Background Jobs Integration

### Notification Creation from Background Jobs

Background jobs create notifications by inserting records into the `notifications` table:

```typescript
// Example: Deadline Alert Job creating notifications
async function createDeadlineNotification(
  deadline: Deadline,
  daysRemaining: number
): Promise<void> {
  // Determine notification type based on days remaining
  let notificationType: string;
  let severity: string;
  let channels: string[];
  
  if (daysRemaining === 7) {
    notificationType = 'DEADLINE_WARNING_7D';
    severity = 'INFO';
    channels = ['EMAIL', 'IN_APP'];
  } else if (daysRemaining === 3) {
    notificationType = 'DEADLINE_WARNING_3D';
    severity = 'WARNING';
    channels = ['EMAIL', 'IN_APP'];
  } else if (daysRemaining === 1) {
    notificationType = 'DEADLINE_WARNING_1D';
    severity = 'CRITICAL';
    channels = ['EMAIL', 'SMS', 'IN_APP'];
  }
  
  // Get recipient
  const recipient = await getRecipient(deadline.obligation_id);
  
  // Render template
  const template = await getTemplate(notificationType, 'EMAIL');
  const variables = {
    obligation_title: deadline.obligation.title,
    deadline_date: formatDate(deadline.due_date),
    days_remaining: daysRemaining,
    site_name: deadline.site.name,
    company_name: deadline.company.name,
    action_url: `${BASE_URL}/sites/${deadline.site_id}/obligations/${deadline.obligation_id}`,
    unsubscribe_url: `${BASE_URL}/preferences/unsubscribe?type=${notificationType}`
  };
  
  const subject = renderTemplate(template.subject, variables);
  const bodyHtml = renderTemplate(template.body_html, variables);
  const bodyText = renderTemplate(template.body_text, variables);
  
  // Create notification record
  await db.query(`
    INSERT INTO notifications (
      user_id,
      company_id,
      site_id,
      recipient_email,
      notification_type,
      channel,
      priority,
      severity,
      subject,
      body_html,
      body_text,
      variables,
      entity_type,
      entity_id,
      obligation_id,
      action_url,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'PENDING')
  `, [
    recipient.userId,
    deadline.company_id,
    deadline.site_id,
    recipient.email,
    notificationType,
    'EMAIL',
    severity === 'CRITICAL' ? 'CRITICAL' : severity === 'WARNING' ? 'HIGH' : 'NORMAL',
    severity,
    subject,
    bodyHtml,
    bodyText,
    JSON.stringify(variables),
    'deadline',
    deadline.id,
    deadline.obligation_id,
    variables.action_url
  ]);
  
  // If SMS channel, create SMS notification too
  if (channels.includes('SMS') && recipient.phone) {
    await createSMSNotification(deadline, notificationType, recipient, variables);
  }
  
  // If IN_APP channel, create in-app notification
  if (channels.includes('IN_APP')) {
    await createInAppNotification(deadline, notificationType, recipient, variables);
  }
}
```

### Integration with Specific Background Jobs

**Reference:** Background Jobs Specification (2.3)

1. **Deadline Alert Job (2.3.2):** Creates deadline warning notifications (7/3/1 day)
2. **Evidence Reminder Job (2.3.3):** Creates evidence reminder notifications
3. **Permit Renewal Reminder Job (2.3.8):** Creates permit renewal reminder notifications
4. **Module 2: Sampling Schedule Job (2.3.4):** Creates sampling reminder notifications
5. **Module 3: Run-Hour Monitoring Job (2.3.6):** Creates run-hour breach notifications (80%/90%/100%)
6. **AER Generation Job (2.3.7):** Creates AER generation success/failure notifications
7. **Audit Pack Generation Job (2.3.10):** Creates audit pack ready notifications

---

### Breach Detection Integration

The `DETECT_BREACHES_AND_ALERTS` background job (runs every 15 minutes) MUST trigger notifications for all breaches and SLA misses:

```typescript
// Example: Breach Detection Job creating notifications
async function createBreachNotification(
  deadline: Deadline,
  breachType: 'COMPLIANCE_BREACH' | 'SLA_BREACH'
): Promise<void> {
  // Determine notification type and severity
  let notificationType: string;
  let severity: 'CRITICAL' | 'WARNING' | 'INFO';
  
  if (breachType === 'COMPLIANCE_BREACH') {
    // Check if evidence is missing
    const evidenceCount = await getEvidenceCount(deadline.obligation_id);
    const evidenceRequired = await isEvidenceRequired(deadline.obligation_id);
    
    if (evidenceRequired && evidenceCount === 0) {
      notificationType = 'REGULATORY_DEADLINE_BREACH';
    } else {
      notificationType = 'COMPLIANCE_BREACH_DETECTED';
    }
    severity = 'CRITICAL'; // All compliance breaches are CRITICAL
  } else {
    notificationType = 'SLA_BREACH_DETECTED';
    const breachHours = calculateBreachDuration(deadline.sla_breached_at);
    severity = breachHours > 48 ? 'CRITICAL' : breachHours > 24 ? 'WARNING' : 'INFO';
  }
  
  // Get recipients (assignee + managers + admins)
  const recipients = await getBreachRecipients(deadline);
  
  // Generate deep link
  const actionUrl = generateActionUrl(deadline.site_id, deadline.obligation_id);
  
  // Render template
  const template = await getTemplate(notificationType, 'EMAIL');
  const variables = {
    obligation_title: deadline.obligation.title,
    obligation_id: deadline.obligation_id,
    deadline_id: deadline.id,
    deadline_date: formatDate(deadline.due_date),
    days_overdue: calculateDaysOverdue(deadline.due_date),
    site_name: deadline.site.name,
    company_name: deadline.company.name,
    action_url: actionUrl, // REQUIRED: Deep link to obligation
    evidence_upload_url: `${BASE_URL}/sites/${deadline.site_id}/obligations/${deadline.obligation_id}/evidence/upload`,
    unsubscribe_url: `${BASE_URL}/preferences/unsubscribe?type=${notificationType}`
  };
  
  const subject = renderTemplate(template.subject, variables);
  const bodyHtml = renderTemplate(template.body_html, variables);
  const bodyText = renderTemplate(template.body_text, variables);
  
  // Create notification for each recipient
  for (const recipient of recipients) {
    await db.query(`
      INSERT INTO notifications (
        user_id,
        company_id,
        site_id,
        recipient_email,
        recipient_phone,
        notification_type,
        channel,
        priority,
        severity,
        subject,
        body_html,
        body_text,
        variables,
        entity_type,
        entity_id,
        obligation_id,
        action_url,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'PENDING')
    `, [
      recipient.userId,
      deadline.company_id,
      deadline.site_id,
      recipient.email,
      recipient.phone,
      notificationType,
      severity === 'CRITICAL' ? 'EMAIL, SMS, IN_APP' : 'EMAIL, IN_APP',
      severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      severity,
      subject,
      bodyHtml,
      bodyText,
      JSON.stringify(variables),
      'deadline',
      deadline.id,
      deadline.obligation_id,
      actionUrl
    ]);
  }
  
  // Mark breach notification as sent
  await db.query(`
    UPDATE deadlines
    SET breach_notification_sent = true,
        breach_detected_at = NOW()
    WHERE id = $1
  `, [deadline.id]);
}
```

**Key Requirements:**
- **All breaches MUST trigger notifications** (no exceptions)
- **Severity MUST be set** (INFO, WARNING, or CRITICAL)
- **Deep links MUST be included** (`action_url` pointing to obligation detail page)
- **Obligation reference MUST be included** (`obligation_id` for linking)
- **Evidence reference MUST be included** (`evidence_id` if evidence is missing)

**Reference:** Background Jobs Specification Section 13.2 (Detect Breaches and Trigger Alerts Job)

---

## 8.2 Real-Time Notification Delivery

### WebSocket Integration

In-app notifications are delivered via Supabase Realtime:

```typescript
// Server-side: Broadcast notification
async function broadcastInAppNotification(notification: Notification): Promise<void> {
  await supabase.channel(`user:${notification.user_id}`)
    .send({
      type: 'broadcast',
      event: 'notification',
      payload: {
        id: notification.id,
        type: notification.notification_type,
        title: notification.subject,
        message: notification.body_text,
        action_url: notification.action_url,
        created_at: notification.created_at
      }
    });
}

// Client-side: Subscribe to notifications
const channel = supabase.channel(`user:${userId}`)
  .on('broadcast', { event: 'notification' }, (payload) => {
    // Display notification toast
    showNotificationToast(payload.payload);
    
    // Update notification badge
    updateNotificationBadge();
  })
  .subscribe();
```

---

## 8.3 Notification History/Archive

### Notification History Queries

```typescript
// Get user's notification history
async function getNotificationHistory(
  userId: string,
  filters: {
    notification_type?: string;
    channel?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<Notification[]> {
  let query = `
    SELECT * FROM notifications
    WHERE user_id = $1
  `;
  
  const params: any[] = [userId];
  let paramIndex = 2;
  
  if (filters.notification_type) {
    query += ` AND notification_type = $${paramIndex}`;
    params.push(filters.notification_type);
    paramIndex++;
  }
  
  if (filters.channel) {
    query += ` AND channel = $${paramIndex}`;
    params.push(filters.channel);
    paramIndex++;
  }
  
  if (filters.startDate) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
  }
  
  if (filters.endDate) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(filters.limit || 50, filters.offset || 0);
  
  return await db.query(query, params);
}
```

### Notification Archive Policy

Notifications are retained for 90 days, then archived:

```typescript
// Archive old notifications (run as scheduled job)
async function archiveOldNotifications(): Promise<void> {
  const archiveDate = new Date();
  archiveDate.setDate(archiveDate.getDate() - 90); // 90 days ago
  
  await db.query(`
    INSERT INTO notifications_archive
    SELECT * FROM notifications
    WHERE created_at < $1
      AND (delivery_status = 'DELIVERED' OR delivery_status = 'FAILED')
  `, [archiveDate]);
  
  await db.query(`
    DELETE FROM notifications
    WHERE created_at < $1
      AND (delivery_status = 'DELIVERED' OR delivery_status = 'FAILED')
  `, [archiveDate]);
}
```

---

## 8.4 Notification Read/Unread Tracking

### Mark as Read

```typescript
async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  await db.query(`
    UPDATE notifications
    SET read_at = NOW()
    WHERE id = $1 AND user_id = $2
  `, [notificationId, userId]);
  
  // Broadcast read status update (for real-time UI updates)
  await supabase.channel(`user:${userId}`)
    .send({
      type: 'broadcast',
      event: 'notification_read',
      payload: { notificationId }
    });
}
```

### Unread Count

```typescript
async function getUnreadCount(userId: string): Promise<number> {
  const result = await db.query(`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = $1
      AND read_at IS NULL
      AND channel = 'IN_APP'
  `, [userId]);
  
  return parseInt(result.rows[0].count);
}
```

---

# 9. Delivery Provider Integration

## 9.1 Email Provider (SendGrid)

### SendGrid Rate Limits

**Provider-Specific Limits:**
- **Free Tier:** 100 emails/day
- **Essentials Plan:** 40,000 emails/day
- **Pro Plan:** 100,000 emails/day
- **Premier Plan:** Custom limits

**Rate Limit Alignment:**
- Internal API limit: 100 requests/minute per user
- SendGrid free tier: 100 emails/day = ~0.07 emails/minute
- **Implementation:** Queue notifications and batch send to respect provider limits
- **Circuit Breaker:** If SendGrid quota exceeded, queue notifications and retry after quota reset

**Quota Management:**
- Monitor daily email count via SendGrid API
- Alert when quota reaches 80% (before hitting limit)
- Implement exponential backoff for rate limit errors (429)
- Fallback to SMS channel if email quota exhausted

### SendGrid API Integration

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(notification: Notification): Promise<string> {
  const msg = {
    to: notification.recipient_email,
    from: 'noreply@epcompliance.com',
    subject: notification.subject,
    html: notification.body_html,
    text: notification.body_text,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    },
    customArgs: {
      notification_id: notification.id
    }
  };
  
  try {
    const [response] = await sgMail.send(msg);
    
    // Update notification with provider ID
    await db.query(`
      UPDATE notifications
      SET 
        delivery_provider = 'SENDGRID',
        delivery_provider_id = $1,
        status = 'SENT',
        sent_at = NOW()
      WHERE id = $2
    `, [response.headers['x-message-id'], notification.id]);
    
    return response.headers['x-message-id'];
  } catch (error) {
    // Handle error
    await handleDeliveryError(notification, error);
    throw error;
  }
}
```

### SendGrid Webhook Configuration

Webhook endpoint: `POST /api/v1/webhooks/sendgrid`

```typescript
// Handle SendGrid webhook events
app.post('/api/v1/webhooks/sendgrid', async (req, res) => {
  const events = req.body;
  
  for (const event of events) {
    const notificationId = event.custom_args?.notification_id;
    
    if (!notificationId) continue;
    
    switch (event.event) {
      case 'delivered':
        await db.query(`
          UPDATE notifications
          SET 
            delivery_status = 'DELIVERED',
            delivered_at = NOW()
          WHERE id = $1
        `, [notificationId]);
        break;
        
      case 'bounce':
        await db.query(`
          UPDATE notifications
          SET 
            delivery_status = 'BOUNCED',
            delivery_error = $1
          WHERE id = $2
        `, [event.reason, notificationId]);
        break;
        
      case 'spamreport':
        await db.query(`
          UPDATE notifications
          SET 
            delivery_status = 'COMPLAINED',
            delivery_error = 'Marked as spam'
          WHERE id = $1
        `, [notificationId]);
        break;
    }
  }
  
  res.status(200).send('OK');
});
```

---

## 9.2 SMS Provider (Twilio)

### Twilio Rate Limits

**Provider-Specific Limits:**
- **Trial Account:** 1 SMS/day (for testing)
- **Paid Account:** Varies by region and account type
  - **UK:** Typically 1,000 SMS/day (can be increased)
  - **US:** Typically 1,000 SMS/day (can be increased)
  - **International:** Varies by destination country

**Rate Limit Alignment:**
- Internal API limit: 100 requests/minute per user
- Twilio paid account: ~0.7 SMS/minute (1,000/day)
- **Implementation:** Queue SMS notifications and batch send to respect provider limits
- **Circuit Breaker:** If Twilio quota exceeded, queue notifications and retry after quota reset

**Quota Management:**
- Monitor daily SMS count via Twilio API
- Alert when quota reaches 80% (before hitting limit)
- Implement exponential backoff for rate limit errors (429)
- Fallback to email channel if SMS quota exhausted

### Twilio API Integration

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS(notification: Notification): Promise<string> {
  try {
    const message = await client.messages.create({
      body: notification.body_text,
      to: notification.recipient_phone!,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.BASE_URL}/api/v1/webhooks/twilio`
    });
    
    // Update notification with provider ID
    await db.query(`
      UPDATE notifications
      SET 
        delivery_provider = 'TWILIO',
        delivery_provider_id = $1,
        status = 'SENT',
        sent_at = NOW()
      WHERE id = $2
    `, [message.sid, notification.id]);
    
    return message.sid;
  } catch (error) {
    await handleDeliveryError(notification, error);
    throw error;
  }
}
```

### Twilio Webhook Configuration

Webhook endpoint: `POST /api/v1/webhooks/twilio`

```typescript
app.post('/api/v1/webhooks/twilio', async (req, res) => {
  const messageSid = req.body.MessageSid;
  const messageStatus = req.body.MessageStatus;
  
  const notification = await db.query(`
    SELECT id FROM notifications
    WHERE delivery_provider_id = $1
  `, [messageSid]);
  
  if (!notification.rows[0]) {
    return res.status(404).send('Notification not found');
  }
  
  const notificationId = notification.rows[0].id;
  
  switch (messageStatus) {
    case 'delivered':
      await db.query(`
        UPDATE notifications
        SET 
          delivery_status = 'DELIVERED',
          delivered_at = NOW()
        WHERE id = $1
      `, [notificationId]);
      break;
      
    case 'failed':
      await db.query(`
        UPDATE notifications
        SET 
          delivery_status = 'FAILED',
          delivery_error = $1
        WHERE id = $2
      `, [req.body.ErrorMessage, notificationId]);
      break;
  }
  
  res.status(200).send('OK');
});
```

---

# 10. Template Versioning Strategy

## 10.1 Template Versioning System

**Purpose:** Enable safe template updates, A/B testing, and rollback capabilities without affecting in-flight notifications.

**Database Schema:**
```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code TEXT NOT NULL, -- e.g., 'DEADLINE_WARNING_7D'
  version INTEGER NOT NULL DEFAULT 1,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  deprecated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(template_code, version)
);

CREATE INDEX idx_notification_templates_active 
  ON notification_templates(template_code, is_active) 
  WHERE is_active = true;
```

**Versioning Rules:**
1. **New Version Creation:** When updating a template, create new version (increment version number)
2. **Active Version:** Only one version per `template_code` can be `is_active = true`
3. **In-Flight Notifications:** Store `template_version_id` in `notifications` table to preserve rendering
4. **Rollback:** Set new version `is_active = false`, set previous version `is_active = true`
5. **Deprecation:** Set `deprecated_at` timestamp when version is no longer used

**Template Rendering:**
```typescript
async function renderNotification(notification: Notification): Promise<RenderedNotification> {
  // Get active template version
  const template = await db.query(`
    SELECT * FROM notification_templates
    WHERE template_code = $1
    AND is_active = true
    ORDER BY version DESC
    LIMIT 1
  `, [notification.notification_type]);
  
  // Render with template
  const subject = renderTemplate(template.subject_template, notification.variables);
  const html = renderTemplate(template.html_template, notification.variables);
  const text = renderTemplate(template.text_template, notification.variables);
  
  // Store template version used
  await db.query(`
    UPDATE notifications
    SET template_version_id = $1
    WHERE id = $2
  `, [template.id, notification.id]);
  
  return { subject, html, text };
}
```

**A/B Testing Support:**
- Create multiple active versions with different `template_code` suffixes (e.g., `DEADLINE_WARNING_7D_V2`)
- Route percentage of notifications to test version
- Track metrics (open rate, click rate) per version
- Promote winning version to primary template

**Template Preview/Testing:**
- Admin interface to preview template with sample data
- Test send to admin email before activation
- Validate template syntax before saving

---

# 11. Error Handling & Retry Logic

## 10.1 Failed Delivery Retry

### Retry Strategy

- **Max Retries:** 3 attempts total
- **Retry Delays:** Exponential backoff (5 minutes, 30 minutes)
- **Retry Conditions:** Transient errors only (network errors, rate limits)
- **Non-Retryable Errors:** Invalid email/phone, hard bounces, spam complaints

```typescript
async function retryFailedNotification(notificationId: string): Promise<void> {
  const notification = await db.query(`
    SELECT * FROM notifications
    WHERE id = $1
  `, [notificationId]);
  
  if (!notification.rows[0]) return;
  
  const n = notification.rows[0];
  const retryCount = (n.metadata?.retry_count || 0) + 1;
  
  if (retryCount > 3) {
    // Move to dead-letter queue
    await moveToDeadLetterQueue(n);
    return;
  }
  
  // Calculate retry delay
  const delayMinutes = retryCount === 1 ? 5 : 30;
  const retryAt = new Date();
  retryAt.setMinutes(retryAt.getMinutes() + delayMinutes);
  
  // Update notification for retry
  await db.query(`
    UPDATE notifications
    SET 
      status = 'RETRYING',
      scheduled_for = $1,
      metadata = jsonb_set(
        metadata,
        '{retry_count}',
        to_jsonb($2)
      )
    WHERE id = $3
  `, [retryAt, retryCount, notificationId]);
  
  // Schedule retry job
  await scheduleRetryJob(notificationId, retryAt);
}
```

---

## 10.2 Error Types

### Transient Errors (Retryable)

- Network timeouts
- Rate limit errors (429)
- Service unavailable (503)
- Temporary provider errors

### Permanent Errors (Non-Retryable)

- Invalid email/phone format
- Hard bounces (invalid recipient)
- Spam complaints
- Unsubscribe requests
- Blocked domains/numbers

```typescript
function isRetryableError(error: any): boolean {
  if (error.code === 'INVALID_EMAIL' || error.code === 'INVALID_PHONE') {
    return false; // Permanent error
  }
  
  if (error.statusCode === 429 || error.statusCode === 503) {
    return true; // Transient error
  }
  
  if (error.message?.includes('timeout')) {
    return true; // Transient error
  }
  
  return false; // Default to non-retryable for safety
}
```

---

## 10.3 Dead-Letter Queue Handling

After max retries, notifications are moved to dead-letter queue:

```typescript
async function moveToDeadLetterQueue(notification: Notification): Promise<void> {
  // Create dead-letter queue record
  const dlqRecord = await db.query(`
    INSERT INTO dead_letter_queue (
      job_type,
      payload,
      error_message,
      error_stack,
      retry_count,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id
  `, [
    'NOTIFICATION_DELIVERY',
    JSON.stringify(notification),
    notification.delivery_error || 'Max retries exceeded',
    null,
    notification.metadata?.retry_count || 3
  ]);
  
  // Update notification
  await db.query(`
    UPDATE notifications
    SET 
      status = 'FAILED',
      metadata = jsonb_set(
        metadata,
        '{dead_letter_queue_id}',
        to_jsonb($1)
      )
    WHERE id = $2
  `, [dlqRecord.rows[0].id, notification.id]);
  
  // Alert admin
  await createAdminAlert({
    type: 'NOTIFICATION_DLQ',
    severity: 'ERROR',
    message: `Notification delivery failed after ${notification.metadata?.retry_count || 3} retries`,
    metadata: { notificationId: notification.id, dlqId: dlqRecord.rows[0].id }
  });
}
```

---

## 10.4 Error Logging

All errors are logged to `notification_errors` table:

```sql
CREATE TABLE notification_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_errors_notification_id ON notification_errors(notification_id);
CREATE INDEX idx_notification_errors_created_at ON notification_errors(created_at);
```

---

# 12. Testing Requirements

## 11.1 Template Rendering Tests

Test that all templates render correctly with variables:

```typescript
describe('Email Templates', () => {
  it('should render 7-day deadline warning template', () => {
    const template = getTemplate('DEADLINE_WARNING_7D', 'EMAIL');
    const variables = {
      obligation_title: 'Monthly Monitoring Report',
      deadline_date: '15 Jan 2025',
      days_remaining: 7,
      site_name: 'Site A',
      company_name: 'Company XYZ',
      action_url: 'https://app.epcompliance.com/sites/123/obligations/456',
      unsubscribe_url: 'https://app.epcompliance.com/preferences/unsubscribe?type=DEADLINE_WARNING_7D'
    };
    
    const rendered = renderTemplate(template.subject, variables);
    expect(rendered).toBe('Monthly Monitoring Report - 7 days remaining');
    
    const renderedBody = renderTemplate(template.body_html, variables);
    expect(renderedBody).toContain('Monthly Monitoring Report');
    expect(renderedBody).toContain('Site A');
    expect(renderedBody).toContain('7');
  });
  
  // Test all other templates...
});
```

---

## 11.2 Escalation Chain Tests

Test escalation logic:

```typescript
describe('Escalation Chain', () => {
  it('should escalate to Level 2 after 24 hours', async () => {
    // Create Level 1 notification
    const notification = await createNotification({
      escalation_level: 1,
      created_at: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
    });
    
    // Check escalation
    const shouldEscalate = await checkEscalation(notification.entity_id, 1);
    expect(shouldEscalate).toBe(true);
    
    // Verify Level 2 notification created
    const level2Notification = await db.query(`
      SELECT * FROM notifications
      WHERE entity_id = $1
        AND escalation_level = 2
    `, [notification.entity_id]);
    
    expect(level2Notification.rows.length).toBe(1);
  });
});
```

---

## 11.3 Rate Limiting Tests

Test rate limit enforcement:

```typescript
describe('Rate Limiting', () => {
  it('should enforce per-user email rate limit', async () => {
    const userId = 'user-123';
    
    // Send 100 emails (at limit)
    for (let i = 0; i < 100; i++) {
      const allowed = await checkRateLimit({
        scope: 'user',
        id: userId,
        channel: 'EMAIL'
      });
      expect(allowed).toBe(true);
    }
    
    // 101st email should be blocked
    const allowed = await checkRateLimit({
      scope: 'user',
      id: userId,
      channel: 'EMAIL'
    });
    expect(allowed).toBe(false);
  });
});
```

---

## 11.4 Delivery Provider Integration Tests

Test SendGrid and Twilio integration:

```typescript
describe('Delivery Providers', () => {
  it('should send email via SendGrid', async () => {
    const notification = await createTestNotification('EMAIL');
    
    const messageId = await sendEmail(notification);
    expect(messageId).toBeDefined();
    
    // Verify notification updated
    const updated = await db.query(`
      SELECT * FROM notifications WHERE id = $1
    `, [notification.id]);
    
    expect(updated.rows[0].delivery_provider).toBe('SENDGRID');
    expect(updated.rows[0].delivery_provider_id).toBe(messageId);
    expect(updated.rows[0].status).toBe('SENT');
  });
  
  // Test Twilio SMS...
});
```

---

## 11.5 Preference Application Tests

Test preference filtering:

```typescript
describe('Notification Preferences', () => {
  it('should skip notification if user disabled type', async () => {
    await createPreference({
      user_id: 'user-123',
      notification_type: 'DEADLINE_WARNING_7D',
      enabled: false
    });
    
    const notification = await createTestNotification('DEADLINE_WARNING_7D');
    const shouldSend = await applyPreferences(notification, 'user-123');
    
    expect(shouldSend).toBe(false);
  });
  
  it('should queue for digest if frequency preference is DAILY_DIGEST', async () => {
    await createPreference({
      user_id: 'user-123',
      notification_type: 'DEADLINE_WARNING_7D',
      frequency_preference: 'DAILY_DIGEST'
    });
    
    const notification = await createTestNotification('DEADLINE_WARNING_7D');
    const shouldSend = await applyPreferences(notification, 'user-123');
    
    expect(shouldSend).toBe(false);
    
    // Verify queued for digest
    const digestQueue = await getDigestQueue('user-123', 'DAILY');
    expect(digestQueue).toContainEqual(expect.objectContaining({
      id: notification.id
    }));
  });
});
```

---

# Appendix A: TypeScript Interfaces

## A.1 Notification Interface

```typescript
interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  site_id?: string;
  recipient_email: string;
  recipient_phone?: string;
  notification_type: NotificationType;
  channel: Channel;
  priority: Priority;
  subject: string;
  body_html?: string;
  body_text: string;
  variables: Record<string, any>;
  status: NotificationStatus;
  delivery_status?: DeliveryStatus;
  delivery_provider?: DeliveryProvider;
  delivery_provider_id?: string;
  delivery_error?: string;
  is_escalation: boolean;
  escalation_level?: number;
  escalation_state?: EscalationState;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  scheduled_for: Date;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  actioned_at?: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

type NotificationType =
  // Core Module 1 - Compliance
  | 'DEADLINE_WARNING_7D'
  | 'DEADLINE_WARNING_3D'
  | 'DEADLINE_WARNING_1D'
  | 'OVERDUE_OBLIGATION'
  | 'EVIDENCE_REMINDER'
  | 'PERMIT_RENEWAL_REMINDER'
  // v1.3 - Compliance Clock
  | 'COMPLIANCE_CLOCK_CRITICAL'
  | 'COMPLIANCE_CLOCK_REMINDER'
  | 'COMPLIANCE_CLOCK_OVERDUE'
  // v1.3 - Escalation Workflow
  | 'ESCALATION_LEVEL_1'
  | 'ESCALATION_LEVEL_2'
  | 'ESCALATION_LEVEL_3'
  | 'ESCALATION_LEVEL_4'
  | 'ESCALATION_RESOLVED'
  // v1.3 - Permit Workflows
  | 'PERMIT_RENEWAL_DUE'
  | 'PERMIT_WORKFLOW_SUBMITTED'
  | 'REGULATOR_RESPONSE_OVERDUE'
  | 'PERMIT_WORKFLOW_APPROVED'
  | 'PERMIT_SURRENDER_INSPECTION_DUE'
  // v1.3 - Corrective Actions
  | 'CORRECTIVE_ACTION_ITEM_ASSIGNED'
  | 'CORRECTIVE_ACTION_ITEM_DUE_SOON'
  | 'CORRECTIVE_ACTION_ITEM_OVERDUE'
  | 'CORRECTIVE_ACTION_READY_FOR_CLOSURE'
  | 'CORRECTIVE_ACTION_CLOSURE_APPROVED'
  // Module 2 - Parameter Monitoring
  | 'PARAMETER_EXCEEDANCE_80'
  | 'PARAMETER_EXCEEDANCE_90'
  | 'PARAMETER_EXCEEDANCE_100'
  // Module 3 - Runtime Monitoring
  | 'RUN_HOUR_BREACH_80'
  | 'RUN_HOUR_BREACH_90'
  | 'RUN_HOUR_BREACH_100'
  | 'RUNTIME_VALIDATION_PENDING'
  | 'RUNTIME_VALIDATION_REJECTED'
  | 'RUNTIME_EXCEEDANCE'
  // v1.3 - Module 4 - Waste Consignments
  | 'CONSIGNMENT_VALIDATION_FAILED'
  | 'CONSIGNMENT_VALIDATION_WARNING'
  // v1.3 - SLA Management
  | 'SLA_BREACH_DETECTED'
  | 'SLA_BREACH_EXTENDED'
  // Pack Generation
  | 'AUDIT_PACK_READY'
  | 'REGULATOR_PACK_READY'
  | 'TENDER_PACK_READY'
  | 'BOARD_PACK_READY'
  | 'INSURER_PACK_READY'
  | 'PACK_DISTRIBUTED'
  // Consultant Features
  | 'CONSULTANT_CLIENT_ASSIGNED'
  | 'CONSULTANT_CLIENT_PACK_GENERATED'
  | 'CONSULTANT_CLIENT_ACTIVITY'
  // Data Import
  | 'EXCEL_IMPORT_READY_FOR_REVIEW'
  | 'EXCEL_IMPORT_COMPLETED'
  | 'EXCEL_IMPORT_FAILED'
  // System
  | 'SYSTEM_ALERT'
  | 'ESCALATION'; // Legacy - use specific ESCALATION_LEVEL_N types

type Channel = 'EMAIL' | 'SMS' | 'IN_APP' | 'PUSH';

type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | 'URGENT';

type NotificationStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED';

type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'COMPLAINED';

type DeliveryProvider = 'SENDGRID' | 'TWILIO' | 'SUPABASE_REALTIME';

type EscalationState = 'PENDING' | 'ESCALATED_LEVEL_1' | 'ESCALATED_LEVEL_2' | 'ESCALATED_LEVEL_3' | 'RESOLVED';
```

---

## A.2 Notification Preference Interface

```typescript
interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType | 'ALL';
  channel_preference: ChannelPreference;
  frequency_preference: FrequencyPreference;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

type ChannelPreference =
  | 'EMAIL_ONLY'
  | 'SMS_ONLY'
  | 'EMAIL_AND_SMS'
  | 'IN_APP_ONLY'
  | 'ALL_CHANNELS';

type FrequencyPreference = 'IMMEDIATE' | 'DAILY_DIGEST' | 'WEEKLY_DIGEST' | 'NEVER';
```

---

## A.3 Template Interface

```typescript
interface EmailTemplate {
  notification_type: NotificationType;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[]; // List of required variables
}

interface SMSTemplate {
  notification_type: NotificationType;
  template: string;
  max_length: number;
  variables: string[];
}
```

---

# Appendix B: Reference Links

- **Product Logic Specification (1.1):** Evidence Enforcement Rule (Section B.4.1.1), Grace Period Logic
- **Database Schema (2.2):** `notifications` table structure
- **Background Jobs (2.3):** Notification creation from background jobs
- **Backend API (2.5):** Notification preferences API endpoints

---

**Document End**

