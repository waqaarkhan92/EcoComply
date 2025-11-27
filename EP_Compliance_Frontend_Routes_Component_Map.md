# Oblicore Frontend Routes & Component Map

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ Product Logic Specification (1.1) - Complete
- ✅ User Workflow Maps (1.3) - Complete
- ✅ Backend API (2.5) - Complete

**Purpose:** Defines the complete frontend routing structure, component hierarchy, navigation patterns, and implementation specifications for the Oblicore platform. This document ensures world-class design, mobile responsiveness, accessibility compliance, and optimal performance.

> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

1. [Document Overview](#1-document-overview)
2. [Route Structure](#2-route-structure)
3. [Detailed Route Specifications](#3-detailed-route-specifications)
4. [Component Hierarchy](#4-component-hierarchy)
5. [Data Fetching Logic](#5-data-fetching-logic)
6. [State Management](#6-state-management)
7. [Navigation Flow](#7-navigation-flow)
8. [Route Guards](#8-route-guards)
9. [Deep Linking Support](#9-deep-linking-support)
10. [Mobile-First Responsive Design](#10-mobile-first-responsive-design)
11. [Accessibility Requirements](#11-accessibility-requirements)
12. [Performance Optimization](#12-performance-optimization)
13. [Error Handling & States](#13-error-handling--states)
14. [Animation & Transitions](#14-animation--transitions)
15. [Form Validation & UX](#15-form-validation--ux)
16. [Search & Filter UX](#16-search--filter-ux)
17. [Notification & Toast System](#17-notification--toast-system)
18. [Print Styles](#18-print-styles)
19. [Offline Support](#19-offline-support)
20. [Progressive Web App (PWA)](#20-progressive-web-app-pwa)
21. [Internationalization (i18n)](#21-internationalization-i18n)
22. [Dark Mode Support](#22-dark-mode-support)
23. [Component Library Integration](#23-component-library-integration)
24. [Keyboard Shortcuts](#24-keyboard-shortcuts)
25. [TypeScript Interfaces](#25-typescript-interfaces)

---

# 1. Document Overview

## 1.1 Framework & Technology Stack

**Framework:** Next.js 14 App Router  
**Language:** TypeScript  
**Styling:** Tailwind CSS (with design tokens from Design System 2.9)  
**State Management:** React Query (TanStack Query) + Zustand  
**Form Management:** React Hook Form  
**UI Components:** Design System components (see Document 2.9)

## 1.2 Design System Integration

This document references and integrates with **Document 2.9: UI/UX Design System** for:
- Design tokens (colors, typography, spacing)
- Component specifications
- Accessibility guidelines
- Responsive breakpoints

**Primary Color Palette (from Design System 2.9 - Procore-Inspired):**
- **Primary Accent:** #026A67 (Industrial Deep Teal)
  - Used for: CTAs, buttons, active states, hero highlights, charts accents
  - Replaces Procore's orange with regulatory/environmental signal
- **Primary Dark:** #014D4A (darker teal variant for hover/active states)
- **Primary Light:** #039A96 (lighter teal variant for backgrounds, dark mode)
- **Enterprise Neutrals:**
  - **Dark Charcoal:** #101314 (header, sidebar navigation, main background, power sections)
  - **Soft Slate:** #E2E6E7 (content cards, panels, light backgrounds)
  - **Border Gray:** #374151 (subtle borders on dark backgrounds)
- **Status Colors:**
  - **Success:** #1E7A50 (compliant status - industrial green, serious not playful)
  - **Warning:** #CB7C00 (at risk - amber/gold, regulatory urgency)
  - **Danger:** #B13434 (non-compliant - deep red, legal danger clarity)
  - **Info:** #026A67 (information - uses primary teal)

**Design Philosophy (Procore-Inspired):**
- **Dark surfaces with light content blocks** - High contrast for premium feel
- **Bold, confident styling** - Enterprise authority, not "app cute"
- **Table-heavy dashboards** - Dense data visibility for compliance workflows
- **Large, prominent headers** - Status and location prominence

## 1.3 Project Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── sites/
│   │   ├── [siteId]/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── upload/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [documentId]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── review/
│   │   │   │           └── page.tsx
│   │   │   ├── obligations/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [obligationId]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── evidence/
│   │   │   │           └── upload/
│   │   │   │               └── page.tsx
│   │   │   ├── module-2/
│   │   │   │   ├── parameters/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── lab-results/
│   │   │   │       └── import/
│   │   │   │           └── page.tsx
│   │   │   └── module-3/
│   │   │       ├── run-hours/
│   │   │       │   └── page.tsx
│   │   │       └── aer/
│   │   │           └── generate/
│   │   │               └── page.tsx
│   │   └── layout.tsx
├── modules/
│   └── page.tsx
├── layout.tsx
└── page.tsx
```

---

# 2. Route Structure

## 2.1 Base Route Configuration

**Framework:** Next.js 14 App Router  
**Route File Structure:** `app/{route}/page.tsx`  
**Route Groups:** 
- `(auth)` - Authentication routes (login, signup)
- `(dashboard)` - Protected dashboard routes
- `(modules)` - Module-specific routes

**Dynamic Routes:**
- `[siteId]` - Site identifier
- `[documentId]` - Document identifier
- `[obligationId]` - Obligation identifier
- `[auditPackId]` - Audit pack identifier

## 2.2 Route Metadata

Each route includes metadata configuration:

```typescript
export const metadata: Metadata = {
  title: 'Page Title | Oblicore',
  description: 'Page description for SEO and accessibility',
};
```

**Breadcrumb Configuration:**
- Defined per route in route configuration
- Auto-generated from route hierarchy
- Customizable for complex routes

**Example Breadcrumb:**
```
Home > Sites > Site Name > Documents > Upload Document
```

## 2.3 Route Groups

**Route Group: `(auth)`**
- Purpose: Authentication pages (login, signup, password reset)
- Layout: Minimal layout, no sidebar/header
- Access: Public (unauthenticated users)

**Route Group: `(dashboard)`**
- Purpose: Protected application routes
- Layout: Full application layout (header, sidebar, footer)
- Access: Authenticated users only

**Route Group: `(modules)`**
- Purpose: Module-specific routes
- Layout: Module-specific layout (if needed)
- Access: Module activation required

---

# 3. Detailed Route Specifications

## 3.1 Authentication Routes

### Route: `/login`

**URL Pattern:** `/login`  
**File:** `app/(auth)/login/page.tsx`  
**Access:** Public (redirects to dashboard if authenticated)

**Component Structure:**
```
LoginPage
├── LoginForm
│   ├── EmailInput
│   ├── PasswordInput
│   ├── RememberMeCheckbox
│   ├── ForgotPasswordLink
│   └── SubmitButton
└── LoginFooter
    ├── SignupLink
    └── HelpLink
```

**Data Fetching:**
- `useLogin()` - Mutation hook for authentication
- `useAuth()` - Check if already authenticated

**User Interactions:**
- Email/password entry
- Form submission
- "Remember me" toggle
- Forgot password link
- Signup link

**Navigation Flow:**
- Entry: From unauthenticated access or explicit navigation
- Success: Redirect to `/dashboard` or return URL
- Error: Show error message, remain on page

**Mobile Responsiveness:**
- Full-width form on mobile
- Touch-optimized inputs (min 44x44px touch targets)
- Keyboard-aware layout (adjusts for virtual keyboard)

**Accessibility:**
- Form labels associated with inputs
- Error messages announced via ARIA live region
- Keyboard navigation (Tab, Enter)
- Focus management (focus first input on load)

**Loading States:**
- Button loading state during submission
- Disable form during submission

**Error States:**
- Inline error messages below inputs
- Form-level error summary
- Clear error messages (no technical jargon)

---

### Route: `/signup`

**URL Pattern:** `/signup`  
**File:** `app/(auth)/signup/page.tsx`  
**Access:** Public

**Component Structure:**
```
SignupPage
├── SignupForm
│   ├── CompanyNameInput
│   ├── EmailInput
│   ├── PasswordInput
│   ├── ConfirmPasswordInput
│   ├── TermsCheckbox
│   └── SubmitButton
└── SignupFooter
    └── LoginLink
```

**Data Fetching:**
- `useSignup()` - Mutation hook for user registration
- `useEmailValidation()` - Real-time email validation

**User Interactions:**
- Company name entry
- Email entry (with validation)
- Password entry (with strength indicator)
- Password confirmation
- Terms acceptance
- Form submission

**Form Validation:**
- Real-time email format validation
- Password strength indicator (weak/medium/strong)
- Password match validation
- Terms acceptance required

**Navigation Flow:**
- Entry: From login page or direct navigation
- Success: Redirect to email verification page
- Error: Show error message, remain on page

---

## 3.2 Dashboard Routes

### Route: `/dashboard`

**URL Pattern:** `/dashboard`  
**File:** `app/(dashboard)/dashboard/page.tsx`  
**Access:** Authenticated users

**Component Structure:**
```
MultiSiteDashboardPage
├── SiteSwitcher
│   ├── SiteDropdown
│   └── AddSiteButton
├── ConsolidatedView
│   ├── ConsolidatedStatusCard
│   │   ├── OverallComplianceStatus
│   │   └── SiteBreakdown
│   ├── ConsolidatedObligationsCard
│   │   ├── ObligationsSummary
│   │   └── ObligationsList
│   ├── ConsolidatedDeadlinesCard
│   │   ├── DeadlinesSummary
│   │   └── DeadlinesTimeline
│   └── QuickActionsCard
│       ├── UploadDocumentButton
│       ├── UploadEvidenceButton
│       └── GenerateAuditPackButton
└── RecentActivityCard
    └── ActivityFeed
```

**Data Fetching:**
- `useUserSites()` - Fetch user's accessible sites
- `useConsolidatedView(siteIds, dateRange)` - Fetch consolidated data
- `useRecentActivity(siteIds)` - Fetch recent activity

**User Interactions:**
- Site selection (switch active site)
- View consolidated data
- Filter by date range
- Navigate to specific site dashboard
- Click obligation → navigate to site-specific obligation detail
- Quick actions → navigate to respective pages

**Navigation Flow:**
- Entry: Default route for multi-site users
- Site selection: Navigate to `/sites/[siteId]/dashboard`
- Click obligation: Navigate to site-specific obligation detail

**Mobile Responsiveness:**
- Site switcher: Full-width dropdown on mobile
- Cards: Stack vertically on mobile
- Consolidated view: Simplified on mobile (key metrics only)

**Performance:**
- Lazy load consolidated data
- Prefetch site data on hover
- Cache consolidated view data

**Empty States:**
- No sites: "Create your first site" CTA
- No data: "Upload your first document" CTA

---

### Route: `/sites/[siteId]/dashboard`

**URL Pattern:** `/sites/:siteId/dashboard`  
**File:** `app/(dashboard)/sites/[siteId]/dashboard/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure (Procore-Inspired Layout):**
```
SiteDashboardPage
├── SiteHeader (Large, Bold, Prominent - text-3xl font-bold text-white)
│   ├── SiteName (Large display text)
│   ├── SiteStatusBadge (Traffic Light: Green/Yellow/Red)
│   └── SiteActionsMenu
├── TrafficLightStatus (High Contrast Panel - bg-white rounded-lg shadow-lg)
│   ├── StatusIndicator (Green/Yellow/Red - Large, Bold)
│   ├── StatusMessage (text-xl font-semibold text-[#101314])
│   └── StatusBreakdown
├── DashboardGrid (High Contrast: White Cards on Dark Background)
│   ├── OverdueObligationsCard (bg-white rounded-lg shadow-lg p-6)
│   │   ├── CardHeader (text-xl font-bold text-[#101314] mb-4)
│   │   ├── ObligationsCount (text-3xl font-bold text-[#B13434])
│   │   └── ObligationsTable (Dense, Scannable - table format)
│   ├── UpcomingDeadlinesCard (bg-white rounded-lg shadow-lg p-6)
│   │   ├── CardHeader (text-xl font-bold text-[#101314] mb-4)
│   │   ├── DeadlinesCount (text-3xl font-bold text-[#CB7C00])
│   │   └── DeadlinesTable (Dense, Scannable - table format)
│   ├── RecentActivityCard (bg-white rounded-lg shadow-lg p-6)
│   │   └── ActivityTimeline (Table Format - dense rows)
│   └── QuickActionsCard (bg-white rounded-lg shadow-lg p-6)
│       ├── UploadDocumentButton (Primary Teal #026A67)
│       ├── UploadEvidenceButton (Primary Teal #026A67)
│       └── GenerateAuditPackButton (Primary Teal #026A67)
└── ComplianceMetricsCard (bg-white rounded-lg shadow-lg p-6)
    ├── ComplianceScore (Large, Bold Display - text-4xl font-bold)
    └── MetricsChart (Teal Accents #026A67)
```

**Layout Pattern (Procore-Inspired):**
- **Main Background:** Dark Charcoal (#101314) - creates premium feel
- **Content Cards:** White (#FFFFFF) with rounded corners (rounded-lg) and shadow (shadow-lg)
- **High Contrast:** White cards pop on dark background (Procore pattern)
- **Table-Heavy:** Dense data tables for obligations, deadlines, evidence (scannable, enterprise)
- **Large Headers:** Bold, prominent headers (text-3xl, text-2xl, text-xl with font-bold)
- **Visual Weight:** Bold, confident styling throughout (font-semibold, font-bold)

**Data Fetching:**
- `useSite(siteId)` - Fetch site details
- `useSiteDashboard(siteId)` - Fetch dashboard data (aggregated)
- `useOverdueObligations(siteId)` - Fetch overdue obligations
- `useUpcomingDeadlines(siteId, days=7)` - Fetch upcoming deadlines
- `useRecentActivity(siteId)` - Fetch recent activity

**User Interactions:**
- Click overdue obligation → navigate to obligation detail
- Click upcoming deadline → navigate to obligation detail
- Click quick action → navigate to respective upload/generation page
- Refresh dashboard data
- Filter by date range

**Navigation Flow:**
- Entry: Default route after site selection
- Click obligation: Navigate to `/sites/[siteId]/obligations/[obligationId]`
- Quick actions: Navigate to respective pages

**Mobile Responsiveness:**
- Cards: Stack vertically on mobile
- Traffic light: Prominent on mobile (top of page)
- Quick actions: Bottom navigation bar on mobile

**Loading States:**
- Skeleton loaders for each card
- Progressive loading (load critical data first)

**Error States:**
- Site not found: 404 page with navigation options
- Access denied: Clear message with action to request access

---

## 3.3 Document Routes

### Route: `/sites/[siteId]/documents`

**URL Pattern:** `/sites/:siteId/documents`  
**File:** `app/(dashboard)/sites/[siteId]/documents/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
DocumentsListPage
├── DocumentsHeader
│   ├── PageTitle
│   └── UploadDocumentButton
├── DocumentsFilterBar
│   ├── SearchInput
│   ├── DocumentTypeFilter
│   ├── StatusFilter
│   └── DateRangeFilter
├── DocumentsTable
│   ├── TableHeader
│   │   ├── SortableColumn (Title)
│   │   ├── SortableColumn (Type)
│   │   ├── SortableColumn (Status)
│   │   ├── SortableColumn (Uploaded)
│   │   └── ActionsColumn
│   └── DocumentRow (repeated)
│       ├── DocumentTitle
│       ├── DocumentTypeBadge
│       ├── DocumentStatusBadge
│       ├── UploadDate
│       └── DocumentActions
│           ├── ViewButton
│           ├── EditButton
│           └── DeleteButton
└── DocumentsPagination
    ├── PageInfo
    ├── PreviousButton
    ├── PageNumbers
    └── NextButton
```

**Data Fetching:**
- `useDocuments(siteId, filters, pagination)` - Fetch documents list
- `useDocumentFilters()` - Fetch available filter options

**User Interactions:**
- Search documents
- Filter by type, status, date range
- Sort by title, type, status, uploaded date
- Pagination (next/previous pages)
- Click document row → navigate to document detail
- Upload document → navigate to upload page

**Navigation Flow:**
- Entry: From site dashboard or navigation menu
- Click row: Navigate to `/sites/[siteId]/documents/[documentId]`
- Upload: Navigate to `/sites/[siteId]/documents/upload`

**Mobile Responsiveness:**
- Table: Convert to card layout on mobile
- Filters: Collapsible filter drawer on mobile
- Search: Full-width search bar on mobile

**Performance:**
- Debounce search input (300ms)
- Virtual scrolling for large lists
- Lazy load document thumbnails

**Empty States:**
- No documents: "Upload your first document" CTA with illustration
- No results: "No documents match your filters" with clear filters button

---

### Route: `/sites/[siteId]/documents/upload`

**URL Pattern:** `/sites/:siteId/documents/upload`  
**File:** `app/(dashboard)/sites/[siteId]/documents/upload/page.tsx`  
**Access:** Owner, Admin, Staff roles with site access

**Component Structure:**
```
DocumentUploadPage
├── UploadHeader
│   ├── PageTitle
│   └── CancelButton
├── UploadMethodSelector
│   ├── MethodRadioGroup
│   │   ├── PDFUploadOption (selected by default)
│   │   └── ExcelImportOption
│   └── MethodDescription
│       ├── PDFDescription ("Upload PDF permit for AI extraction")
│       └── ExcelDescription ("Import existing obligations from Excel")
├── PDFUploadPath (if PDF selected)
│   ├── DocumentUploadForm
│   │   ├── FileDropzone
│   │   │   ├── DropzoneArea
│   │   │   ├── FileInput (hidden)
│   │   │   ├── DragDropIndicator
│   │   │   └── FileList
│   │   ├── DocumentTypeSelector
│   │   │   ├── TypeDropdown
│   │   │   └── TypeDescription
│   │   ├── MetadataForm
│   │   │   ├── TitleInput
│   │   │   ├── DescriptionTextarea
│   │   │   └── TagsInput
│   │   └── FormActions
│   │       ├── CancelButton
│   │       └── UploadButton
│   ├── UploadProgress
│   │   ├── ProgressBar
│   │   ├── ProgressPercentage
│   │   └── UploadSpeed
│   └── UploadSuccess
│       ├── SuccessMessage
│       ├── DocumentPreview
│       └── NextActions
│           ├── ReviewButton
│           └── UploadAnotherButton
└── ExcelImportPath (if Excel selected)
    ├── ExcelImportForm
    │   ├── ExcelFileDropzone
    │   │   ├── DropzoneArea (accepts .xlsx, .xls, .csv)
    │   │   ├── FileInput (hidden)
    │   │   ├── ExcelIcon
    │   │   ├── FormatIndicator ("Excel or CSV file")
    │   │   └── FileList
    │   ├── ImportOptionsForm
    │   │   ├── CreateMissingSitesCheckbox
    │   │   ├── CreateMissingPermitsCheckbox
    │   │   └── SkipDuplicatesCheckbox
    │   ├── ColumnMappingHelper
    │   │   ├── ExpectedColumnsList
    │   │   │   ├── RequiredColumns (permit_number, obligation_title, frequency, deadline_date, site_id)
    │   │   │   └── OptionalColumns (permit_type, permit_date, regulator, evidence_linked, notes)
    │   │   └── MappingHelpText
    │   └── FormActions
    │       ├── CancelButton
    │       └── ImportButton
    ├── ImportPreview (after upload, before confirmation)
    │   ├── PreviewHeader
    │   │   ├── PreviewTitle
    │   │   ├── ValidCount ("142 valid rows")
    │   │   └── ErrorCount ("8 errors")
    │   ├── ValidRowsTable
    │   │   ├── TableHeader
    │   │   └── ValidRow (repeated)
    │   │       ├── RowNumber
    │   │       ├── PermitNumber
    │   │       ├── ObligationTitle
    │   │       ├── Frequency
    │   │       ├── DeadlineDate
    │   │       └── WarningsBadge (if warnings)
    │   ├── ErrorsTable
    │   │   ├── TableHeader
    │   │   └── ErrorRow (repeated)
    │   │       ├── RowNumber
    │   │       ├── ErrorMessages
    │   │       └── EditButton
    │   ├── PreviewActions
    │   │   ├── EditErrorsButton
    │   │   ├── SkipErrorsCheckbox
    │   │   └── ConfirmImportButton
    │   └── PreviewHelpText
    ├── ImportProgress (during processing)
    │   ├── ProgressBar
    │   ├── StatusMessage ("Validating...", "Processing...")
    │   └── EstimatedTime
    └── ImportSuccess (after confirmation)
        ├── SuccessMessage
        ├── SuccessSummary
        │   ├── ObligationsCreatedCount
        │   └── ErrorsCount (if any)
        └── NextActions
            ├── ViewObligationsButton
            └── ImportAnotherButton
```

**Data Fetching:**
- `useSite(siteId)` - Fetch site details
- `useDocumentUpload()` - Mutation hook for PDF upload
- `useExcelImport()` - Mutation hook for Excel import
- `useExcelImportPreview(importId)` - Fetch import preview
- `useExcelImportConfirm(importId)` - Confirm import mutation
- `useDocumentTypes()` - Fetch available document types

**User Interactions:**
- **Upload Method Selection:**
  - Choose "Upload PDF" or "Import from Excel"
- **PDF Upload Path:**
  - File drag-drop or click to select
  - Document type selection
  - Metadata entry (optional)
  - Form submission
  - Upload progress tracking
- **Excel Import Path:**
  - Excel file drag-drop or click to select
  - Import options selection (create missing sites/permits, skip duplicates)
  - Preview review (see valid rows, errors, warnings)
  - Edit errors (if any)
  - Confirm import
  - Import progress tracking
- Cancel navigation (both paths)

**Navigation Flow:**
- Entry: From site dashboard or documents list
- **PDF Upload Success:** Navigate to `/sites/[siteId]/documents/[documentId]/review`
- **Excel Import Success:** Navigate to `/sites/[siteId]/obligations` (show imported obligations)
- Cancel: Navigate back to `/sites/[siteId]/documents`

**Mobile Responsiveness:**
- File upload: Touch-optimized file picker
- Dropzone: Full-width on mobile
- Form: Stacked layout on mobile
- Camera integration: Direct camera access on mobile

**Accessibility:**
- File input: Properly labeled
- Drag-drop: Keyboard accessible alternative
- Progress: Announced via ARIA live region

**Loading States:**
- Upload progress bar with percentage
- Upload speed indicator
- Disable form during upload

**Error States:**
- File too large: Clear error message with size limit
- Invalid file type: List allowed types
- Upload failed: Retry button

---

### Route: `/sites/[siteId]/documents/[documentId]`

**URL Pattern:** `/sites/:siteId/documents/:documentId`  
**File:** `app/(dashboard)/sites/[siteId]/documents/[documentId]/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
DocumentDetailPage
├── DocumentHeader
│   ├── DocumentTitle
│   ├── DocumentStatusBadge
│   └── DocumentActionsMenu
│       ├── EditButton
│       ├── DownloadButton
│       └── DeleteButton
├── DocumentTabs
│   ├── OverviewTab
│   ├── ObligationsTab
│   ├── ExtractionLogsTab
│   └── EvidenceTab
├── DocumentOverview
│   ├── DocumentMetadata
│   │   ├── DocumentType
│   │   ├── UploadDate
│   │   ├── UploadedBy
│   │   └── FileSize
│   ├── DocumentPreview
│   │   ├── PDFViewer (if PDF)
│   │   └── ImagePreview (if image)
│   └── ExtractionStatus
│       ├── ExtractionStatusBadge
│       └── ExtractionProgress
└── DocumentObligations
    ├── ObligationsList
    └── ExtractionResults
```

**Data Fetching:**
- `useDocument(documentId)` - Fetch document details
- `useDocumentObligations(documentId)` - Fetch extracted obligations
- `useDocumentExtractionLogs(documentId)` - Fetch extraction logs

**User Interactions:**
- View document preview
- Navigate between tabs
- View extracted obligations
- Trigger extraction (if not extracted)
- Download document
- Edit document metadata

**Navigation Flow:**
- Entry: From documents list or direct link
- Back: Navigate to `/sites/[siteId]/documents`
- Click obligation: Navigate to `/sites/[siteId]/obligations/[obligationId]`

**Mobile Responsiveness:**
- Tabs: Horizontal scrollable tabs on mobile
- Preview: Full-width on mobile
- Metadata: Stacked layout on mobile

**Performance:**
- Lazy load PDF viewer
- Progressive image loading
- Virtual scrolling for obligations list

---

## 3.4 Obligation Routes

### Route: `/sites/[siteId]/obligations`

**URL Pattern:** `/sites/:siteId/obligations`  
**File:** `app/(dashboard)/sites/[siteId]/obligations/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
ObligationsListPage
├── ObligationsHeader
│   ├── PageTitle
│   └── CreateObligationButton (if permitted)
├── ObligationsFilterBar
│   ├── SearchInput
│   ├── StatusFilter
│   ├── CategoryFilter
│   ├── DeadlineFilter
│   └── ClearFiltersButton
├── ObligationsViewToggle
│   ├── TableViewButton
│   └── CardViewButton
├── ObligationsTable (or ObligationsGrid)
│   ├── TableHeader (or GridHeader)
│   └── ObligationRow (or ObligationCard) (repeated)
│       ├── ObligationTitle
│       ├── ObligationStatusBadge
│       ├── ObligationCategory
│       ├── ObligationDeadline
│       └── ObligationActions
│           ├── ViewButton
│           ├── EditButton
│           ├── MarkNAButton
│           └── LinkEvidenceButton
└── ObligationsPagination
```

**Data Fetching:**
- `useObligations(siteId, filters, pagination)` - Fetch obligations list
- `useObligationFilters()` - Fetch available filter options

**User Interactions:**
- Search obligations
- Filter by status, category, deadline
- Sort by deadline, status, title
- Toggle between table and card view
- Pagination (next/previous pages)
- Click obligation row → navigate to detail
- Edit obligation → open edit modal
- Mark N/A → confirmation dialog
- Link evidence → navigate to evidence upload

**Navigation Flow:**
- Entry: From site dashboard or navigation menu
- Click row: Navigate to `/sites/[siteId]/obligations/[obligationId]`
- Edit: Open edit modal (inline or separate page)
- Link evidence: Navigate to `/sites/[siteId]/obligations/[obligationId]/evidence/upload`

**Mobile Responsiveness:**
- Table: Convert to card layout on mobile
- Filters: Collapsible filter drawer on mobile
- View toggle: Hidden on mobile (always card view)
- Actions: Swipe actions on mobile

**Performance:**
- Debounce search input (300ms)
- Virtual scrolling for large lists
- Optimistic updates for status changes

**Empty States:**
- No obligations: "No obligations found" with upload document CTA
- No results: "No obligations match your filters" with clear filters button

---

### Route: `/sites/[siteId]/obligations/[obligationId]`

**URL Pattern:** `/sites/:siteId/obligations/:obligationId`  
**File:** `app/(dashboard)/sites/[siteId]/obligations/[obligationId]/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
ObligationDetailPage
├── ObligationHeader
│   ├── ObligationTitle
│   ├── ObligationStatusBadge
│   └── ObligationActionsMenu
│       ├── EditButton
│       ├── MarkNAButton
│       └── DeleteButton
├── ObligationTabs
│   ├── DetailsTab
│   ├── EvidenceTab
│   ├── DeadlinesTab
│   └── ScheduleTab
├── ObligationDetails
│   ├── ObligationDescription
│   ├── ObligationCategory
│   ├── ObligationFrequency
│   ├── ObligationDeadline
│   └── ObligationRequirements
├── EvidenceList
│   ├── EvidenceCount
│   └── EvidenceItems
│       └── EvidenceCard (repeated)
│           ├── EvidencePreview
│           ├── EvidenceMetadata
│           └── EvidenceActions
└── ObligationActions
    ├── LinkEvidenceButton
    ├── CreateScheduleButton
    └── ViewDeadlinesButton
```

**Data Fetching:**
- `useObligation(obligationId)` - Fetch obligation details
- `useObligationEvidence(obligationId)` - Fetch linked evidence
- `useObligationDeadlines(obligationId)` - Fetch deadlines
- `useObligationSchedule(obligationId)` - Fetch monitoring schedule

**User Interactions:**
- View obligation details
- Navigate between tabs
- View linked evidence
- Link new evidence
- Create/update monitoring schedule
- View deadlines
- Edit obligation details
- Mark obligation as N/A

**Navigation Flow:**
- Entry: From obligations list or direct link
- Back: Navigate to `/sites/[siteId]/obligations`
- Link evidence: Navigate to `/sites/[siteId]/obligations/[obligationId]/evidence/upload`

**Mobile Responsiveness:**
- Tabs: Horizontal scrollable tabs on mobile
- Details: Stacked layout on mobile
- Evidence: Grid layout (2 columns) on mobile

**Performance:**
- Lazy load evidence previews
- Progressive image loading
- Virtual scrolling for evidence list

---

## 3.5 Evidence Routes

### Route: `/sites/[siteId]/obligations/[obligationId]/evidence/upload`

**URL Pattern:** `/sites/:siteId/obligations/:obligationId/evidence/upload`  
**File:** `app/(dashboard)/sites/[siteId]/obligations/[obligationId]/evidence/upload/page.tsx`  
**Access:** Owner, Admin, Staff roles with site access

**Component Structure:**
```
EvidenceUploadPage
├── UploadHeader
│   ├── PageTitle
│   ├── ObligationContext
│   └── CancelButton
├── EvidenceUploadForm
│   ├── UploadMethodToggle
│   │   ├── FileUploadTab
│   │   ├── PhotoCaptureTab
│   │   └── CSVImportTab
│   ├── FileUploadSection
│   │   ├── FileDropzone
│   │   └── FileInput
│   ├── PhotoCaptureSection
│   │   ├── CameraPreview
│   │   ├── CaptureButton
│   │   └── PhotoGallery
│   ├── CSVImportSection
│   │   ├── CSVFileInput
│   │   └── CSVPreview
│   ├── EvidenceTypeSelector
│   │   ├── TypeDropdown
│   │   └── TypeDescription
│   ├── MetadataForm
│   │   ├── TitleInput
│   │   ├── DescriptionTextarea
│   │   └── DateInput
│   └── FormActions
│       ├── CancelButton
│       └── UploadButton
├── EvidencePreview
│   ├── PreviewGrid
│   └── PreviewActions
└── UploadSuccess
    ├── SuccessMessage
    └── NextActions
        ├── LinkToObligationButton
        └── UploadAnotherButton
```

**Data Fetching:**
- `useObligation(obligationId)` - Fetch obligation context
- `useEvidenceUpload()` - Mutation hook for evidence upload
- `useEvidenceTypes()` - Fetch available evidence types

**User Interactions:**
- File upload (drag-drop or click)
- Photo capture (mobile camera)
- CSV import (file selection)
- Evidence type selection
- Metadata entry
- Form submission
- Cancel navigation

**Navigation Flow:**
- Entry: From obligation detail page or obligations list
- Success: Navigate back to obligation detail page
- Cancel: Navigate back to previous page

**Mobile Responsiveness:**
- Upload methods: Tab navigation on mobile
- File upload: Touch-optimized file picker
- Camera: Full-screen camera interface on mobile
- Form: Stacked layout on mobile

**Accessibility:**
- File input: Properly labeled
- Camera: Screen reader announcements
- Form: Keyboard navigation

**Loading States:**
- Upload progress bar
- Processing indicator for CSV import

**Error States:**
- File too large: Clear error message
- Invalid file type: List allowed types
- Camera not available: Fallback to file upload

---

## 3.6 Module Routes

### Route: `/modules`

**URL Pattern:** `/modules`  
**File:** `app/(dashboard)/modules/page.tsx`  
**Access:** Authenticated users

**Component Structure:**
```
ModuleSelectionPage
├── ModulesHeader
│   ├── PageTitle
│   └── PageDescription
├── ModulesGrid
│   └── ModuleCard (repeated)
│       ├── ModuleIcon
│       ├── ModuleInfo
│       │   ├── ModuleName
│       │   ├── ModuleDescription
│       │   └── ModulePricing
│       ├── ModulePrerequisites
│       │   └── PrerequisitesList
│       ├── ModuleStatusBadge
│       └── ModuleActions
│           ├── ActivateButton (if inactive)
│           ├── ViewButton (if active)
│           └── DeactivateButton (if active)
└── CrossSellPrompts
    └── CrossSellCard (repeated)
        ├── CrossSellMessage
        └── CrossSellActions
            ├── ActivateButton
            └── DismissButton
```

**Data Fetching:**
- `useModules()` - Fetch available modules from `modules` table
- `useUserModuleActivations()` - Fetch user's active modules
- `useCrossSellTriggers()` - Fetch cross-sell trigger notifications

**User Interactions:**
- View module details
- Activate module (with confirmation)
- Deactivate module (with confirmation)
- Dismiss cross-sell prompts
- View module screens (if active)

**Navigation Flow:**
- Entry: From navigation menu or cross-sell prompt
- Activation: Navigate to module-specific screens
- Cross-sell: Navigate to module activation

**Mobile Responsiveness:**
- Grid: Single column on mobile
- Cards: Full-width on mobile
- Actions: Stacked buttons on mobile

---

### Route: `/sites/[siteId]/module-2/parameters`

**URL Pattern:** `/sites/:siteId/module-2/parameters`  
**File:** `app/(dashboard)/sites/[siteId]/module-2/parameters/page.tsx`  
**Access:** Module 2 activation required

**Component Structure:**
```
ParameterTrackingPage
├── ParametersHeader
│   ├── PageTitle
│   └── ImportLabResultsButton
├── ParametersView
│   ├── ParametersList
│   │   └── ParameterRow (repeated)
│   │       ├── ParameterName
│   │       ├── CurrentValue
│   │       ├── LimitValue
│   │       ├── StatusIndicator
│   │       └── ParameterChart
│   └── ParametersChart
│       ├── ChartContainer
│       └── ChartControls
└── ExceedanceAlerts
    ├── AlertsCount
    └── AlertsList
        └── ExceedanceCard (repeated)
```

**Data Fetching:**
- `useParameters(siteId)` - Fetch parameter tracking data
- `useExceedances(siteId)` - Fetch exceedance alerts

**Route Guards:** Module 2 activation required

**Mobile Responsiveness:**
- List: Card layout on mobile
- Chart: Full-width on mobile, simplified controls

---

### Route: `/sites/[siteId]/module-3/run-hours`

**URL Pattern:** `/sites/:siteId/module-3/run-hours`  
**File:** `app/(dashboard)/sites/[siteId]/module-3/run-hours/page.tsx`  
**Access:** Module 3 activation required

**Component Structure:**
```
RunHourTrackingPage
├── RunHoursHeader
│   ├── PageTitle
│   └── AddRunHourButton
├── RunHourEntryForm (modal or inline)
│   ├── GeneratorSelector
│   ├── HoursInput
│   ├── DateInput
│   ├── SourceSelector
│   └── SubmitButton
├── RunHoursList
│   └── RunHourRow (repeated)
│       ├── GeneratorName
│       ├── Hours
│       ├── Date
│       └── Actions
└── RunHourChart
    ├── ChartContainer
    └── LimitBreachAlerts
```

**Data Fetching:**
- `useRunHours(siteId)` - Fetch run-hour records
- `useLimitBreaches(siteId)` - Fetch limit breach alerts

**Route Guards:** Module 3 activation required

**Mobile Responsiveness:**
- Form: Full-screen modal on mobile
- List: Card layout on mobile
- Chart: Full-width on mobile

---

## 3.7 Pack Routes (v1.0)

> [v1 UPDATE – Pack Routes – 2024-12-27]

### Route: `/sites/[siteId]/packs`

**URL Pattern:** `/sites/:siteId/packs`  
**File:** `app/(dashboard)/sites/[siteId]/packs/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
PacksListPage
├── PacksHeader
│   ├── PageTitle
│   ├── PageDescription
│   └── GeneratePackButton (with pack type selector)
├── PackTypeTabs
│   ├── AllTab
│   ├── RegulatorTab
│   ├── TenderTab
│   ├── BoardTab
│   ├── InsurerTab
│   └── AuditTab
├── PacksFilterBar
│   ├── StatusFilter
│   ├── DateRangeFilter
│   └── ClearFiltersButton
├── PacksList
│   └── PackRow (repeated)
│       ├── PackTypeBadge
│       ├── PackTitle
│       ├── PackDateRange
│       ├── PackStatusBadge
│       ├── PackStats
│       └── PackActions
│           ├── ViewButton
│           ├── DownloadButton
│           ├── ShareButton (if Growth Plan)
│           └── DeleteButton
└── GeneratePackModal
    ├── PackTypeSelector
    │   ├── RegulatorOption (Core Plan)
    │   ├── TenderOption (Growth Plan)
    │   ├── BoardOption (Growth Plan)
    │   ├── InsurerOption (Growth Plan)
    │   └── AuditOption (All Plans)
    ├── PackTypeSpecificForm
    └── GenerateButton
```

**Plan-Based Access:**
- Core Plan: Regulator Pack, Audit Pack options only
- Growth Plan: All pack types available
- Consultant Edition: All pack types (for assigned clients)

---

### Route: `/sites/[siteId]/packs/[packId]`

**URL Pattern:** `/sites/:siteId/packs/:packId`  
**File:** `app/(dashboard)/sites/[siteId]/packs/[packId]/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
PackDetailPage
├── PackHeader
│   ├── PackTypeBadge
│   ├── PackTitle
│   ├── PackStatusBadge
│   └── PackActionsMenu
│       ├── DownloadButton
│       ├── ShareButton (if Growth Plan)
│       ├── DistributeButton (if Growth Plan)
│       ├── RegenerateButton
│       └── DeleteButton
├── PackTabs
│   ├── PreviewTab
│   ├── MetadataTab
│   └── DistributionTab (if Growth Plan)
├── PackPreview
└── PackDistributionSection (if Growth Plan)
    ├── EmailDistributionForm
    └── SharedLinkSection
```

---

### Route: `/companies/[companyId]/packs/board`

**URL Pattern:** `/companies/:companyId/packs/board`  
**File:** `app/(dashboard)/companies/[companyId]/packs/board/page.tsx`  
**Access:** Growth Plan, Owner/Admin role only

**Component Structure:**
```
BoardPackGenerationPage
├── RoleGuard (Owner/Admin only — redirects Staff users)
├── PlanGuard (Growth Plan or Consultant Edition)
├── CompanyHeader
│   ├── CompanyName
│   └── SiteCount
├── PackConfigurationForm
│   ├── DateRangeSelector
│   ├── IncludeAllSitesToggle (always true for Board Pack, disabled)
│   ├── RecipientNameInput
│   └── PurposeTextarea (optional)
└── GenerateButton
```

**Validation:**
- **Role Check:** Must be Owner or Admin (Staff redirected with error message)
- **Plan Check:** Must be Growth Plan or Consultant Edition
- **Company Scope:** Validates company_id is provided, site_id is null
- **API Call:** Sends `company_id`, `pack_type: 'BOARD_MULTI_SITE_RISK'`, `site_id: null`

**Error Handling:**
- Role insufficient: "Board Pack requires Owner or Admin role"
- Plan insufficient: "Upgrade to Growth Plan to generate Board Packs"
- Validation error: "Board Pack requires company-level scope"

**Purpose:** Board Pack generation (multi-site aggregation)

**Component Structure:**
```
BoardPackPage
├── BoardPackHeader
├── MultiSiteSelector
├── DateRangeSelector
└── GenerateBoardPackButton
```

**Reference:** Product Logic Specification Section I.8.4 (Board/Multi-Site Risk Pack Logic)

---

### Route: `/sites/[siteId]/audit-packs` (Legacy Route)

**Note:** Legacy route maintained for backward compatibility. Redirects to `/sites/[siteId]/packs` with filter for Audit Pack type.

**URL Pattern:** `/sites/:siteId/audit-packs`  
**File:** `app/(dashboard)/sites/[siteId]/audit-packs/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
AuditPacksListPage
├── AuditPacksHeader
│   ├── PageTitle
│   ├── PageDescription
│   └── GenerateAuditPackButton
├── AuditPacksFilterBar
│   ├── StatusFilter
│   ├── DateRangeFilter
│   └── ClearFiltersButton
├── AuditPacksList
│   └── AuditPackRow (repeated)
│       ├── AuditPackTitle
│       ├── AuditPackDateRange
│       ├── AuditPackStatusBadge
│       ├── AuditPackStats
│       │   ├── ObligationCount
│       │   ├── EvidenceCount
│       │   └── PageCount
│       ├── AuditPackMetadata
│       │   ├── GeneratedDate
│       │   ├── GeneratedBy
│       │   └── FileSize
│       └── AuditPackActions
│           ├── ViewButton
│           ├── DownloadButton
│           ├── ShareButton
│           └── DeleteButton
└── GenerateAuditPackModal
    ├── ModalHeader
    │   ├── ModalTitle
    │   └── CloseButton
    ├── ModalContent
    │   ├── DateRangeSelector
    │   │   ├── StartDateInput
    │   │   ├── EndDateInput
    │   │   └── PresetButtons
    │   ├── ObligationsSelector
    │   │   ├── SelectAllCheckbox
    │   │   ├── ObligationsList
    │   │   │   └── ObligationCheckbox (repeated)
    │   │   └── SearchInput
    │   ├── OptionsSection
    │   │   ├── IncludeArchivedCheckbox
    │   │   ├── IncludeEvidenceCheckbox
    │   │   └── IncludeExtractionLogsCheckbox
    │   └── PreviewSection
    │       ├── PreviewStats
    │       └── EstimatedSize
    └── ModalFooter
        ├── CancelButton
        └── GenerateButton
```

**Data Fetching:**
- `useAuditPacks(siteId, filters)` - Fetch audit packs list
- `useAuditPackGeneration()` - Mutation hook for generation
- `useObligations(siteId)` - Fetch obligations for selection

**User Interactions:**
- Filter audit packs by status, date range
- View audit pack details
- Generate new audit pack
- Download audit pack PDF
- Delete audit pack (with confirmation)
- Share audit pack (if implemented)

**Navigation Flow:**
- Entry: From site dashboard or navigation menu
- Click row: Navigate to `/sites/[siteId]/audit-packs/[auditPackId]`
- Generate: Open modal, generate, navigate to detail page

**Mobile Responsiveness:**
- List: Card layout on mobile
- Modal: Full-screen on mobile
- Filters: Collapsible drawer on mobile

**Accessibility:**
- Modal: Focus trap, escape key to close
- Form: Proper labels, error announcements
- Actions: Keyboard accessible

**Loading States:**
- Skeleton loaders for list
- Loading state for generation
- Progress indicator during generation

**Error States:**
- No audit packs: "Generate your first audit pack" CTA
- Generation failed: Error message with retry button

**Performance:**
- Lazy load audit pack previews
- Virtual scrolling for large lists
- Optimistic updates for generation

---

### Route: `/sites/[siteId]/audit-packs/[auditPackId]`

**URL Pattern:** `/sites/:siteId/audit-packs/:auditPackId`  
**File:** `app/(dashboard)/sites/[siteId]/audit-packs/[auditPackId]/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
AuditPackDetailPage
├── AuditPackHeader
│   ├── BreadcrumbNavigation
│   ├── AuditPackTitle
│   ├── AuditPackStatusBadge
│   └── AuditPackActionsMenu
│       ├── DownloadButton
│       ├── ShareButton
│       ├── RegenerateButton
│       └── DeleteButton
├── AuditPackTabs
│   ├── PreviewTab
│   ├── MetadataTab
│   └── ObligationsTab
├── AuditPackPreview (if status === COMPLETED)
│   ├── PDFViewer
│   │   ├── PDFCanvas
│   │   ├── PageNavigation
│   │   │   ├── PreviousPageButton
│   │   │   ├── PageNumberInput
│   │   │   ├── PageCount
│   │   │   └── NextPageButton
│   │   ├── ZoomControls
│   │   │   ├── ZoomOutButton
│   │   │   ├── ZoomLevel
│   │   │   ├── ZoomInButton
│   │   │   └── FitToWidthButton
│   │   └── Toolbar
│   │       ├── DownloadButton
│   │       ├── PrintButton
│   │       └── FullscreenButton
│   └── LoadingState (if generating)
│       ├── ProgressBar
│       ├── ProgressPercentage
│       └── EstimatedTimeRemaining
├── AuditPackStatus (if status !== COMPLETED)
│   ├── StatusIndicator
│   ├── StatusMessage
│   ├── GenerationProgress
│   └── CancelButton (if status === GENERATING)
└── AuditPackMetadata
    ├── DateRange
    ├── ObligationCount
    ├── EvidenceCount
    ├── PageCount
    ├── FileSize
    ├── GeneratedDate
    ├── GeneratedBy
    └── DownloadHistory
```

**Data Fetching:**
- `useAuditPack(auditPackId)` - Fetch audit pack details
- `useAuditPackDownload(auditPackId)` - Download mutation
- `useAuditPackObligations(auditPackId)` - Fetch included obligations

**User Interactions:**
- View PDF preview
- Navigate pages
- Zoom in/out
- Download PDF
- Print PDF
- View metadata
- View included obligations
- Regenerate audit pack
- Delete audit pack

**Navigation Flow:**
- Entry: From audit packs list or direct link
- Back: Navigate to `/sites/[siteId]/audit-packs`
- Download: Trigger download, show progress

**Mobile Responsiveness:**
- Preview: Full-width on mobile
- Controls: Bottom toolbar on mobile
- Zoom: Pinch to zoom on mobile
- Tabs: Horizontal scrollable tabs on mobile

**Accessibility:**
- PDF viewer: Keyboard navigation (arrow keys)
- Zoom: Keyboard shortcuts
- Download: Screen reader announcements

**Performance:**
- Lazy load PDF viewer
- Progressive PDF loading
- Cache PDF pages

**Error States:**
- Generation failed: Error message with retry button
- PDF not available: Clear message

---

> [v1 UPDATE – Consultant Routes – 2024-12-27]

## 3.8 Consultant Control Centre Routes

### Route: `/consultant/dashboard`

**URL Pattern:** `/consultant/dashboard`  
**File:** `app/(dashboard)/consultant/dashboard/page.tsx`  
**Access:** Consultant role only

**Component Structure:**
```
ConsultantDashboardPage
├── DashboardHeader
│   ├── PageTitle
│   └── QuickActions
├── OverviewCards
│   ├── TotalClientsCard
│   ├── ActiveClientsCard
│   ├── TotalSitesCard
│   └── ComplianceScoreCard
├── RecentActivitySection
│   └── ActivityTimeline
├── UpcomingDeadlinesSection
│   └── DeadlinesList (across all clients)
└── ClientComplianceSummary
    └── ClientComplianceTable
```

**Data Fetching:**
- `useConsultantDashboard()` - Fetch aggregated dashboard data
- `useConsultantClients()` - Fetch client list
- `useConsultantUpcomingDeadlines()` - Fetch deadlines across clients

---

### Route: `/consultant/clients`

**URL Pattern:** `/consultant/clients`  
**File:** `app/(dashboard)/consultant/clients/page.tsx`  
**Access:** Consultant role only

**Component Structure:**
```
ConsultantClientsPage
├── ClientsHeader
│   ├── PageTitle
│   └── AddClientButton (if allowed)
├── ClientsFilterBar
│   ├── StatusFilter
│   └── SearchInput
├── ClientsList
│   └── ClientCard (repeated)
│       ├── ClientName
│       ├── SiteCount
│       ├── ComplianceScore
│       ├── OverdueCount
│       └── ClientActions
│           ├── ViewButton
│           └── GeneratePackButton
└── AddClientModal (if allowed)
```

---

### Route: `/consultant/clients/[clientId]`

**URL Pattern:** `/consultant/clients/:clientId`  
**File:** `app/(dashboard)/consultant/clients/[clientId]/page.tsx`  
**Access:** Consultant role, assigned client only

**Component Structure:**
```
ConsultantClientPage
├── ClientHeader
│   ├── ClientName
│   ├── ComplianceBadge
│   └── ClientActions
├── ClientTabs
│   ├── OverviewTab
│   ├── SitesTab
│   ├── DocumentsTab
│   ├── ObligationsTab
│   └── PacksTab
└── ClientContent (tab-specific)
```

**Data Fetching:**
- `useConsultantClient(clientId)` - Fetch client details
- `useConsultantClientSites(clientId)` - Fetch client sites
- `useConsultantClientPacks(clientId)` - Fetch client packs

---

### Route: `/consultant/packs`

**URL Pattern:** `/consultant/packs`  
**File:** `app/(dashboard)/consultant/packs/page.tsx`  
**Access:** Consultant role only

**Purpose:** View all packs generated for all assigned clients

**Component Structure:**
```
ConsultantPacksPage
├── PacksHeader
├── ClientFilter
├── PackTypeFilter
└── PacksList (with client attribution)
```

---
- Download failed: Error message with retry button

---

## 3.8 Schedule Routes

### Route: `/sites/[siteId]/schedules`

**URL Pattern:** `/sites/:siteId/schedules`  
**File:** `app/(dashboard)/sites/[siteId]/schedules/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
SchedulesListPage
├── SchedulesHeader
│   ├── PageTitle
│   └── CreateScheduleButton
├── SchedulesFilterBar
│   ├── ObligationFilter
│   ├── FrequencyFilter
│   ├── StatusFilter
│   └── ClearFiltersButton
├── SchedulesList
│   └── ScheduleRow (repeated)
│       ├── ObligationName
│       ├── FrequencyBadge
│       ├── NextDeadline
│       ├── StatusBadge
│       └── ScheduleActions
│           ├── ViewButton
│           ├── EditButton
│           └── DeleteButton
└── CreateScheduleModal
    ├── ObligationSelector
    ├── FrequencySelector
    ├── StartDateInput
    ├── CustomScheduleOptions
    └── SubmitButton
```

**Data Fetching:**
- `useSchedules(siteId, filters)` - Fetch schedules list
- `useObligations(siteId)` - Fetch obligations for selection
- `useScheduleCreate()` - Mutation hook for creating schedule

**User Interactions:**
- Filter schedules by obligation, frequency, status
- Create new schedule
- Edit schedule
- Delete schedule (with confirmation)
- View schedule details

**Navigation Flow:**
- Entry: From site dashboard or navigation menu
- Click row: Navigate to `/sites/[siteId]/schedules/[scheduleId]`
- Create: Open modal, create, navigate to detail

**Mobile Responsiveness:**
- List: Card layout on mobile
- Modal: Full-screen on mobile

---

### Route: `/sites/[siteId]/schedules/[scheduleId]`

**URL Pattern:** `/sites/:siteId/schedules/:scheduleId`  
**File:** `app/(dashboard)/sites/[siteId]/schedules/[scheduleId]/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
ScheduleDetailPage
├── ScheduleHeader
│   ├── ScheduleTitle
│   ├── ScheduleStatusBadge
│   └── ScheduleActionsMenu
├── ScheduleTabs
│   ├── DetailsTab
│   ├── DeadlinesTab
│   └── HistoryTab
├── ScheduleDetails
│   ├── ObligationInfo
│   ├── FrequencyInfo
│   ├── StartDate
│   ├── NextDeadline
│   └── CustomScheduleOptions
├── DeadlinesList
│   └── DeadlineRow (repeated)
│       ├── DeadlineDate
│       ├── DeadlineStatus
│       └── DeadlineActions
└── ScheduleHistory
    └── HistoryTimeline
```

**Data Fetching:**
- `useSchedule(scheduleId)` - Fetch schedule details
- `useScheduleDeadlines(scheduleId)` - Fetch deadlines
- `useScheduleHistory(scheduleId)` - Fetch history

**User Interactions:**
- View schedule details
- View deadlines
- Edit schedule
- Delete schedule
- Complete deadlines

**Navigation Flow:**
- Entry: From schedules list or direct link
- Back: Navigate to `/sites/[siteId]/schedules`
- Click deadline: Navigate to deadline detail

---

## 3.9 Deadline Routes

### Route: `/sites/[siteId]/deadlines`

**URL Pattern:** `/sites/:siteId/deadlines`  
**File:** `app/(dashboard)/sites/[siteId]/deadlines/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
DeadlinesListPage
├── DeadlinesHeader
│   ├── PageTitle
│   └── ViewToggle
│       ├── ListViewButton
│       ├── CalendarViewButton
│       └── TimelineViewButton
├── DeadlinesFilterBar
│   ├── StatusFilter
│   ├── DateRangeFilter
│   ├── ObligationFilter
│   └── ClearFiltersButton
├── DeadlinesListView
│   └── DeadlineRow (repeated)
│       ├── DeadlineDate
│       ├── ObligationName
│       ├── DeadlineStatus
│       └── DeadlineActions
├── DeadlinesCalendarView
│   ├── CalendarGrid
│   └── DeadlineMarkers
└── DeadlinesTimelineView
    └── TimelineComponent
```

**Data Fetching:**
- `useDeadlines(siteId, filters)` - Fetch deadlines list
- `useDeadlineFilters()` - Fetch available filters

**User Interactions:**
- Filter deadlines by status, date range, obligation
- Toggle between list, calendar, timeline views
- Complete deadline
- View deadline detail

**Navigation Flow:**
- Entry: From site dashboard or navigation menu
- Click row: Navigate to `/sites/[siteId]/deadlines/[deadlineId]`

**Mobile Responsiveness:**
- List: Card layout on mobile
- Calendar: Month view on mobile
- Timeline: Vertical timeline on mobile

---

## 3.10 Review Queue Routes

### Route: `/sites/[siteId]/review-queue`

**URL Pattern:** `/sites/:siteId/review-queue`  
**File:** `app/(dashboard)/sites/[siteId]/review-queue/page.tsx`  
**Access:** Owner, Admin, Staff roles with site access

**Component Structure:**
```
ReviewQueuePage
├── ReviewQueueHeader
│   ├── PageTitle
│   ├── QueueCount
│   └── BulkActionsMenu
├── ReviewQueueFilterBar
│   ├── ReviewStatusFilter
│   ├── ItemTypeFilter
│   └── ClearFiltersButton
├── ReviewQueueList
│   └── ReviewQueueItem (repeated)
│       ├── ItemPreview
│       ├── ItemTypeBadge
│       ├── ReviewStatusBadge
│       ├── ConfidenceScore
│       ├── ItemDetails
│       └── ReviewActions
│           ├── ConfirmButton
│           ├── RejectButton
│           └── EditButton
└── ReviewItemModal
    ├── ItemPreview
    ├── ExtractedData
    ├── ConfidenceIndicators
    └── ReviewActions
```

**Data Fetching:**
- `useReviewQueue(siteId, filters)` - Fetch review queue items
- `useReviewQueueConfirm()` - Mutation hook for confirming item
- `useReviewQueueReject()` - Mutation hook for rejecting item

**User Interactions:**
- Filter review queue items
- Confirm item (with optional edits)
- Reject item (with reason)
- Edit item before confirming
- Bulk actions (confirm/reject multiple)

**Navigation Flow:**
- Entry: From site dashboard or navigation menu
- Click item: Open review modal
- Confirm/Reject: Update item, remove from queue

**Mobile Responsiveness:**
- List: Card layout on mobile
- Modal: Full-screen on mobile

---

## 3.11 User Management Routes

### Route: `/users`

**URL Pattern:** `/users`  
**File:** `app/(dashboard)/users/page.tsx`  
**Access:** Owner, Admin roles

**Component Structure:**
```
UsersListPage
├── UsersHeader
│   ├── PageTitle
│   └── CreateUserButton
├── UsersFilterBar
│   ├── RoleFilter
│   ├── StatusFilter
│   ├── SearchInput
│   └── ClearFiltersButton
├── UsersTable
│   └── UserRow (repeated)
│       ├── UserName
│       ├── UserEmail
│       ├── UserRoleBadge
│       ├── UserStatusBadge
│       ├── AssignedSites
│       └── UserActions
│           ├── EditButton
│           ├── DeleteButton
│           └── MoreMenu
└── CreateUserModal
    ├── UserForm
    │   ├── NameInput
    │   ├── EmailInput
    │   ├── RoleSelector
    │   ├── SiteAssignments
    │   └── SendInviteCheckbox
    └── SubmitButton
```

**Data Fetching:**
- `useUsers(filters)` - Fetch users list
- `useUserCreate()` - Mutation hook for creating user
- `useUserUpdate()` - Mutation hook for updating user
- `useUserDelete()` - Mutation hook for deleting user

**User Interactions:**
- Filter users by role, status
- Search users
- Create new user
- Edit user
- Delete user (with confirmation)
- Assign/unassign sites

**Navigation Flow:**
- Entry: From navigation menu (admin only)
- Click row: Navigate to `/users/[userId]`
- Create: Open modal, create, navigate to detail

---

### Route: `/users/[userId]`

**URL Pattern:** `/users/:userId`  
**File:** `app/(dashboard)/users/[userId]/page.tsx`  
**Access:** Owner, Admin roles, or own profile

**Component Structure:**
```
UserDetailPage
├── UserHeader
│   ├── UserAvatar
│   ├── UserName
│   ├── UserEmail
│   └── UserActionsMenu
├── UserTabs
│   ├── ProfileTab
│   ├── RolesTab
│   ├── SitesTab
│   └── ActivityTab
├── UserProfile
│   ├── BasicInfo
│   ├── ContactInfo
│   └── Preferences
├── UserRoles
│   └── RolesList
├── UserSites
│   └── SitesList
└── UserActivity
    └── ActivityTimeline
```

**Data Fetching:**
- `useUser(userId)` - Fetch user details
- `useUserRoles(userId)` - Fetch user roles
- `useUserSites(userId)` - Fetch assigned sites
- `useUserActivity(userId)` - Fetch activity

**User Interactions:**
- Edit profile
- Assign/remove roles
- Assign/unassign sites
- View activity

**Navigation Flow:**
- Entry: From users list or direct link
- Back: Navigate to `/users`

---

## 3.12 Company Management Routes

### Route: `/company`

**URL Pattern:** `/company`  
**File:** `app/(dashboard)/company/page.tsx`  
**Access:** Owner, Admin roles

**Component Structure:**
```
CompanyPage
├── CompanyHeader
│   ├── CompanyName
│   └── EditButton
├── CompanyTabs
│   ├── DetailsTab
│   ├── SitesTab
│   ├── UsersTab
│   ├── ModulesTab
│   └── SettingsTab
├── CompanyDetails
│   ├── CompanyInfo
│   ├── ContactInfo
│   └── BillingInfo
├── CompanySites
│   └── SitesList
├── CompanyUsers
│   └── UsersList
├── CompanyModules
│   └── ModulesList
└── CompanySettings
    └── SettingsForm
```

**Data Fetching:**
- `useCompany()` - Fetch company details
- `useCompanySites()` - Fetch company sites
- `useCompanyUsers()` - Fetch company users
- `useCompanyModules()` - Fetch activated modules

**User Interactions:**
- Edit company details
- Manage sites
- Manage users
- Activate/deactivate modules
- Update settings

**Navigation Flow:**
- Entry: From navigation menu
- Edit: Open edit modal or navigate to edit page

---

## 3.13 Site Management Routes

### Route: `/sites/[siteId]/settings`

**URL Pattern:** `/sites/:siteId/settings`  
**File:** `app/(dashboard)/sites/[siteId]/settings/page.tsx`  
**Access:** Owner, Admin roles with site access

**Component Structure:**
```
SiteSettingsPage
├── SiteSettingsHeader
│   ├── PageTitle
│   └── SaveButton
├── SiteSettingsTabs
│   ├── GeneralTab
│   ├── UsersTab
│   ├── DocumentsTab
│   └── AdvancedTab
├── GeneralSettings
│   ├── SiteNameInput
│   ├── SiteAddressInput
│   ├── RegulatorSelector
│   └── SiteDescriptionTextarea
├── SiteUsers
│   └── UsersList
├── SiteDocuments
│   └── DocumentsList
└── AdvancedSettings
    └── SettingsForm
```

**Data Fetching:**
- `useSite(siteId)` - Fetch site details
- `useSiteUsers(siteId)` - Fetch site users
- `useSiteUpdate()` - Mutation hook for updating site

**User Interactions:**
- Edit site details
- Manage site users
- View site documents
- Update advanced settings

**Navigation Flow:**
- Entry: From site dashboard or navigation menu
- Save: Update site, show success message

---

## 3.14 Regulator Questions Routes

### Route: `/sites/[siteId]/regulator-questions`

**URL Pattern:** `/sites/:siteId/regulator-questions`  
**File:** `app/(dashboard)/sites/[siteId]/regulator-questions/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
RegulatorQuestionsPage
├── QuestionsHeader
│   ├── PageTitle
│   └── CreateQuestionButton
├── QuestionsFilterBar
│   ├── StatusFilter
│   ├── QuestionTypeFilter
│   ├── DeadlineFilter
│   └── ClearFiltersButton
├── QuestionsList
│   └── QuestionRow (repeated)
│       ├── QuestionText
│       ├── QuestionTypeBadge
│       ├── ResponseDeadline
│       ├── QuestionStatusBadge
│       └── QuestionActions
│           ├── ViewButton
│           ├── RespondButton
│           └── CloseButton
└── CreateQuestionModal
    ├── QuestionForm
    │   ├── QuestionTypeSelector
    │   ├── QuestionTextInput
    │   ├── ObligationSelector
    │   ├── ResponseDeadlineInput
    │   └── AssignedToSelector
    └── SubmitButton
```

**Data Fetching:**
- `useRegulatorQuestions(siteId, filters)` - Fetch questions list
- `useRegulatorQuestionCreate()` - Mutation hook for creating question
- `useRegulatorQuestionUpdate()` - Mutation hook for updating question

**User Interactions:**
- Filter questions by status, type, deadline
- Create new question
- Respond to question
- Close question
- View question detail

**Navigation Flow:**
- Entry: From site dashboard or navigation menu
- Click row: Navigate to `/sites/[siteId]/regulator-questions/[questionId]`

---

### Route: `/sites/[siteId]/regulator-questions/[questionId]`

**URL Pattern:** `/sites/:siteId/regulator-questions/:questionId`  
**File:** `app/(dashboard)/sites/[siteId]/regulator-questions/[questionId]/page.tsx`  
**Access:** Authenticated users with site access

**Component Structure:**
```
RegulatorQuestionDetailPage
├── QuestionHeader
│   ├── QuestionTitle
│   ├── QuestionStatusBadge
│   └── QuestionActionsMenu
├── QuestionDetails
│   ├── QuestionText
│   ├── QuestionType
│   ├── RaisedDate
│   ├── ResponseDeadline
│   ├── AssignedTo
│   └── RelatedObligation
├── ResponseSection
│   ├── ResponseTextEditor
│   ├── ResponseEvidenceSelector
│   └── SubmitResponseButton
└── QuestionHistory
    └── HistoryTimeline
```

**Data Fetching:**
- `useRegulatorQuestion(questionId)` - Fetch question details
- `useRegulatorQuestionResponse()` - Mutation hook for submitting response

**User Interactions:**
- View question details
- Submit response
- Attach evidence to response
- Close question

**Navigation Flow:**
- Entry: From questions list or direct link
- Back: Navigate to `/sites/[siteId]/regulator-questions`

---

# 4. Component Hierarchy

## 4.1 Shared Layout Components

### Layout Component

```typescript
interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}

function Layout({ children, showSidebar = true, showHeader = true, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#101314]">
      {showHeader && <Header />}
      <div className="flex flex-1">
        {showSidebar && <Sidebar />}
        <MainContent className="flex-1 bg-[#101314] p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </MainContent>
      </div>
      {showFooter && <Footer />}
    </div>
  );
}
```

**Header Component:**
```typescript
interface HeaderProps {
  user?: User;
  notifications?: Notification[];
  onSearch?: (query: string) => void;
}

function Header({ user, notifications, onSearch }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#101314] border-b border-[#374151]">
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-4">
          <Logo />
          <NavigationMenu />
        </div>
        <div className="flex items-center gap-4">
          <GlobalSearch onSearch={onSearch} />
          <NotificationBell notifications={notifications} />
          <UserProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
```

**Features:**
- Sticky header (stays at top on scroll)
- Responsive navigation (hamburger menu on mobile)
- Global search (keyboard shortcut: Cmd/Ctrl + K)
- Notification bell with unread count
- User profile menu with dropdown

**Sidebar Component:**
```typescript
interface SidebarProps {
  currentRoute?: string;
  sites?: Site[];
  activeModules?: string[];
  collapsed?: boolean;
  onToggle?: () => void;
}

function Sidebar({ currentRoute, sites, activeModules, collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={cn(
      "bg-[#101314] border-r border-[#374151] transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4">
        <SiteSwitcher sites={sites} />
      </div>
      <nav className="px-4">
        <NavigationLinks currentRoute={currentRoute} />
        {activeModules && <ModuleShortcuts modules={activeModules} />}
      </nav>
      <button 
        onClick={onToggle} 
        className="absolute bottom-4 left-4 text-[#E2E6E7] hover:text-white"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>
    </aside>
  );
}
```

**Features:**
- **Dark Charcoal background** (#101314) - Always visible, matches Procore pattern
- Collapsible sidebar (defaults to expanded)
- Site switcher dropdown
- Navigation links with active state (teal accent #026A67)
- Module shortcuts (if modules active)
- Mobile: Drawer overlay

**Navigation Link Styling (Dark Sidebar):**
```typescript
// Active navigation link
className="flex items-center gap-3 px-4 py-2 rounded-md bg-[#026A67] text-white font-medium"

// Inactive navigation link
className="flex items-center gap-3 px-4 py-2 rounded-md text-[#E2E6E7] hover:bg-[#1F2937] hover:text-white"

// Navigation icon (light colored)
className="w-5 h-5 text-[#E2E6E7]"
```

**Footer Component:**
```typescript
interface FooterProps {
  version?: string;
}

function Footer({ version }: FooterProps) {
  return (
    <footer className="bg-[#E2E6E7] border-t border-[#D1D5DB] py-4 px-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </div>
        <div className="text-sm text-[#6B7280]">
          © {new Date().getFullYear()} Oblicore {version && `v${version}`}
        </div>
      </div>
    </footer>
  );
}
```

## 4.2 Shared UI Components

### Button Component

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantStyles = {
    primary: "bg-[#026A67] text-white hover:bg-[#014D4A] focus:ring-[#026A67] font-semibold",
    secondary: "bg-transparent border-2 border-[#101314] text-[#101314] hover:bg-[#101314] hover:text-white focus:ring-[#101314] font-semibold",
    danger: "bg-[#B13434] text-white hover:bg-[#8B2828] focus:ring-[#B13434] font-semibold",
    ghost: "bg-transparent text-[#101314] hover:bg-[#E2E6E7] focus:ring-[#101314]",
    link: "bg-transparent text-[#026A67] hover:text-[#014D4A] underline-offset-4 hover:underline focus:ring-[#026A67]"
  };
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm h-8",
    md: "px-4 py-2 text-base h-10",
    lg: "px-6 py-3 text-lg h-12"
  };

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner className="mr-2" />
      ) : (
        icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'right' && !loading && <span className="ml-2">{icon}</span>}
    </button>
  );
}
```

**Features:**
- Multiple variants (primary, secondary, danger, ghost, link)
- Three sizes (sm, md, lg)
- Loading state with spinner
- Icon support (left or right)
- Full width option
- Disabled state
- Keyboard accessible
- Focus indicators

### Input Component

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={cn("flex flex-col", fullWidth && "w-full")}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#101314] mb-1">
          {label}
          {props.required && <span className="text-[#B13434] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            "block w-full rounded-md border-[#E2E6E7] shadow-sm",
            "focus:border-[#026A67] focus:ring-[#026A67]",
            error && "border-[#B13434] focus:border-[#B13434] focus:ring-[#B13434]",
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF]">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-[#B13434]" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-[#6B7280]">
          {helperText}
        </p>
      )}
    </div>
  );
}
```

**Features:**
- Label support with required indicator
- Error message display
- Helper text support
- Left/right icon support
- Full width option
- ARIA attributes for accessibility
- Focus states
- Validation states

### Modal Component

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  children,
  footer
}: ModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEscape]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-[#101314] bg-opacity-75 transition-opacity"
          onClick={closeOnBackdropClick ? handleClose : undefined}
        />
        <div
          className={cn(
            "relative bg-white rounded-lg shadow-xl transform transition-all",
            size === 'sm' && "max-w-sm",
            size === 'md' && "max-w-md",
            size === 'lg' && "max-w-lg",
            size === 'xl' && "max-w-xl",
            size === 'fullscreen' && "max-w-full w-full h-full m-0 rounded-none",
            isClosing && "scale-95 opacity-0"
          )}
        >
          {(title || description) && (
            <div className="px-6 py-4 border-b border-gray-200">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-[#101314]">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-[#6B7280]">
                  {description}
                </p>
              )}
            </div>
          )}
          <div className="px-6 py-4">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 border-t border-[#E2E6E7] bg-[#E2E6E7]">
              {footer}
            </div>
          )}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#6B7280]"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Features:**
- Multiple sizes (sm, md, lg, xl, fullscreen)
- Focus trap (keeps focus within modal)
- Escape key to close
- Backdrop click to close (optional)
- Body scroll lock when open
- ARIA attributes
- Animation on open/close
- Footer support

### Table Component

```typescript
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  pagination?: PaginationProps;
  loading?: boolean;
  emptyState?: React.ReactNode;
}

interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  sortable = false,
  pagination,
  loading = false,
  emptyState
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return <TableSkeleton />;
  }

  if (data.length === 0) {
    return emptyState || <EmptyState message="No data available" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-[#E2E6E7]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                  sortable && column.sortable !== false && "cursor-pointer hover:bg-gray-100"
                )}
                onClick={() => column.sortable !== false && handleSort(column.key)}
                style={{ width: column.width }}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {sortable && column.sortable !== false && sortColumn === column.key && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-gray-50"
              )}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
```

**Features:**
- Generic type support
- Sortable columns
- Row click handler
- Loading state with skeleton
- Empty state support
- Pagination support
- Responsive (horizontal scroll on mobile)
- Accessibility (proper table semantics)

### Pagination Component

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
}

function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = false
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
        </span>
        {showPageSizeSelector && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="ml-2 border border-gray-300 rounded-md px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={cn(
              "px-3 py-1 border border-gray-300 rounded-md text-sm",
              page === currentPage && "bg-[#026A67] text-white border-[#026A67]",
              page === '...' && "border-transparent cursor-default"
            )}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

**Features:**
- Page number display with ellipsis
- Previous/Next buttons
- Page size selector (optional)
- Item count display
- Disabled states
- Keyboard accessible

---

# 5. Data Fetching Logic

## 5.1 Data Fetching Strategy

**React Query (TanStack Query) Configuration:**
```typescript
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      cacheTime: 10 * 60 * 1000, // 10 minutes - cache retention
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true, // Refetch on component mount
      refetchOnReconnect: true, // Refetch on network reconnect
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 0, // Don't retry mutations
      onError: (error) => {
        // Global error handler for mutations
        console.error('Mutation error:', error);
      },
    },
  },
});
```

**Query Client Provider Setup:**
```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

## 5.2 Custom Hooks - List Queries

**Obligations List Hook:**
```typescript
interface UseObligationsParams {
  siteId: string;
  filters?: {
    status?: string[];
    category?: string[];
    deadline?: {
      start?: string;
      end?: string;
    };
    search?: string;
  };
  pagination?: {
    page?: number;
    limit?: number;
    cursor?: string;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

function useObligations({
  siteId,
  filters = {},
  pagination = { page: 1, limit: 20 },
  sort = { field: 'deadline', direction: 'asc' }
}: UseObligationsParams) {
  return useQuery({
    queryKey: ['obligations', siteId, filters, pagination, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add filters
      if (filters.status) params.append('filter[status]', filters.status.join(','));
      if (filters.category) params.append('filter[category]', filters.category.join(','));
      if (filters.search) params.append('filter[search]', filters.search);
      
      // Add pagination
      if (pagination.page) params.append('page', pagination.page.toString());
      if (pagination.limit) params.append('limit', pagination.limit.toString());
      if (pagination.cursor) params.append('cursor', pagination.cursor);
      
      // Add sort
      params.append('sort', `${sort.direction === 'desc' ? '-' : ''}${sort.field}`);
      
      const response = await fetch(`/api/v1/obligations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch obligations');
      }
      
      return response.json();
    },
    enabled: !!siteId, // Only fetch if siteId is provided
    staleTime: 2 * 60 * 1000, // 2 minutes for list data
    keepPreviousData: true, // Keep previous data while fetching new data
  });
}
```

**Documents List Hook:**
```typescript
interface UseDocumentsParams {
  siteId: string;
  filters?: {
    documentType?: string[];
    status?: string[];
    extractionStatus?: string[];
    search?: string;
  };
  pagination?: PaginationParams;
}

function useDocuments({ siteId, filters = {}, pagination }: UseDocumentsParams) {
  return useQuery({
    queryKey: ['documents', siteId, filters, pagination],
    queryFn: async () => {
      const params = buildQueryParams(filters, pagination);
      const response = await fetch(`/api/v1/documents?${params}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    enabled: !!siteId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
```

## 5.3 Custom Hooks - Detail Queries

**Obligation Detail Hook:**
```typescript
function useObligation(obligationId: string | null) {
  return useQuery({
    queryKey: ['obligation', obligationId],
    queryFn: async () => {
      if (!obligationId) return null;
      
      const response = await fetch(`/api/v1/obligations/${obligationId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Obligation not found');
        }
        throw new Error('Failed to fetch obligation');
      }
      
      return response.json();
    },
    enabled: !!obligationId, // Only fetch if obligationId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes for detail data
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error.message === 'Obligation not found') return false;
      return failureCount < 2;
    },
  });
}
```

**Document Detail Hook:**
```typescript
function useDocument(documentId: string | null) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      
      const response = await fetch(`/api/v1/documents/${documentId}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000,
  });
}
```

## 5.4 Custom Hooks - Mutations

**Obligation Update Mutation:**
```typescript
function useObligationUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ obligationId, data }: { obligationId: string; data: Partial<Obligation> }) => {
      const response = await fetch(`/api/v1/obligations/${obligationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update obligation');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(['obligation', variables.obligationId]);
      queryClient.invalidateQueries(['obligations']);
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Obligation updated successfully',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    },
  });
}
```

**Document Upload Mutation:**
```typescript
function useDocumentUpload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ siteId, file, documentType, metadata }: {
      siteId: string;
      file: File;
      documentType: string;
      metadata?: Record<string, any>;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('site_id', siteId);
      formData.append('document_type', documentType);
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }
      
      const response = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload document');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate documents list
      queryClient.invalidateQueries(['documents', variables.siteId]);
      
      // Prefetch document detail
      queryClient.prefetchQuery({
        queryKey: ['document', data.id],
        queryFn: () => fetch(`/api/v1/documents/${data.id}`).then(r => r.json()),
      });
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'error',
      });
    },
  });
}
```

## 5.5 Optimistic Updates

**Obligation Status Update with Optimistic Update:**
```typescript
function useObligationStatusUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ obligationId, status }: { obligationId: string; status: string }) => {
      const response = await fetch(`/api/v1/obligations/${obligationId}/mark-na`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update obligation status');
      }
      
      return response.json();
    },
    // Optimistic update
    onMutate: async ({ obligationId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['obligation', obligationId]);
      await queryClient.cancelQueries(['obligations']);
      
      // Snapshot previous values
      const previousObligation = queryClient.getQueryData(['obligation', obligationId]);
      const previousObligations = queryClient.getQueryData(['obligations']);
      
      // Optimistically update obligation
      queryClient.setQueryData(['obligation', obligationId], (old: any) => ({
        ...old,
        status,
        updated_at: new Date().toISOString(),
      }));
      
      // Optimistically update obligations list
      queryClient.setQueryData(['obligations'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((ob: any) =>
            ob.id === obligationId ? { ...ob, status } : ob
          ),
        };
      });
      
      return { previousObligation, previousObligations };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousObligation) {
        queryClient.setQueryData(['obligation', variables.obligationId], context.previousObligation);
      }
      if (context?.previousObligations) {
        queryClient.setQueryData(['obligations'], context.previousObligations);
      }
      
      toast({
        title: 'Error',
        description: 'Failed to update obligation status',
        variant: 'error',
      });
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['obligation', variables.obligationId]);
      queryClient.invalidateQueries(['obligations']);
    },
  });
}
```

## 5.6 Infinite Queries (for Infinite Scroll)

**Infinite Obligations List:**
```typescript
function useInfiniteObligations(siteId: string, filters: Filters) {
  return useInfiniteQuery({
    queryKey: ['obligations', 'infinite', siteId, filters],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam);
      if (filters.status) params.append('filter[status]', filters.status.join(','));
      
      const response = await fetch(`/api/v1/obligations?${params}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch obligations');
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.cursor || null,
    enabled: !!siteId,
  });
}
```

## 5.7 Parallel Queries

**Fetch Multiple Related Data:**
```typescript
function useSiteDashboard(siteId: string) {
  const obligations = useObligations({ siteId, pagination: { limit: 5 } });
  const documents = useDocuments({ siteId, pagination: { limit: 5 } });
  const deadlines = useDeadlines({ siteId, pagination: { limit: 5 } });
  
  return {
    obligations: obligations.data,
    documents: documents.data,
    deadlines: deadlines.data,
    isLoading: obligations.isLoading || documents.isLoading || deadlines.isLoading,
    isError: obligations.isError || documents.isError || deadlines.isError,
  };
}
```

## 5.8 Dependent Queries

**Fetch Data Based on Previous Query:**
```typescript
function useObligationWithEvidence(obligationId: string) {
  const obligation = useObligation(obligationId);
  
  const evidence = useQuery({
    queryKey: ['obligation', obligationId, 'evidence'],
    queryFn: async () => {
      const response = await fetch(`/api/v1/obligations/${obligationId}/evidence`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
    enabled: !!obligation.data, // Only fetch if obligation is loaded
  });
  
  return {
    obligation: obligation.data,
    evidence: evidence.data,
    isLoading: obligation.isLoading || evidence.isLoading,
  };
}
```

## 5.9 Prefetching

**Prefetch on Hover:**
```typescript
function ObligationRow({ obligation }: { obligation: Obligation }) {
  const queryClient = useQueryClient();
  
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['obligation', obligation.id],
      queryFn: () => fetchObligation(obligation.id),
      staleTime: 5 * 60 * 1000,
    });
  };
  
  return (
    <tr onMouseEnter={handleMouseEnter}>
      {/* Row content */}
    </tr>
  );
}
```

## 5.10 Error Handling

**Global Error Handler:**
```typescript
function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="p-4 bg-[#FEF2F2] border border-[#B13434] rounded-md">
          <h2 className="text-lg font-semibold text-[#B13434]">Something went wrong</h2>
          <p className="text-[#B13434]">{error.message}</p>
          <button onClick={resetErrorBoundary} className="mt-2 px-4 py-2 bg-[#B13434] text-white rounded-md hover:bg-[#8B2828]">
            Try again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

# 6. State Management

## 6.1 Global State (Zustand)

### User Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'staff' | 'consultant' | 'viewer';
  company_id: string;
}

interface UserStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      logout: () => {
        set({ user: null, token: null, refreshToken: null });
        localStorage.removeItem('user-storage');
      },
      get isAuthenticated() {
        return !!get().user && !!get().token;
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

### Site Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Site {
  id: string;
  name: string;
  company_id: string;
  address?: string;
  regulator?: string;
}

interface SiteStore {
  currentSiteId: string | null;
  sites: Site[];
  setCurrentSiteId: (siteId: string | null) => void;
  setSites: (sites: Site[]) => void;
  addSite: (site: Site) => void;
  removeSite: (siteId: string) => void;
  getCurrentSite: () => Site | null;
}

export const useSiteStore = create<SiteStore>()(
  persist(
    (set, get) => ({
      currentSiteId: null,
      sites: [],
      setCurrentSiteId: (siteId) => {
        set({ currentSiteId: siteId });
        if (siteId) {
          localStorage.setItem('currentSiteId', siteId);
        } else {
          localStorage.removeItem('currentSiteId');
        }
      },
      setSites: (sites) => set({ sites }),
      addSite: (site) => set((state) => ({ sites: [...state.sites, site] })),
      removeSite: (siteId) =>
        set((state) => ({
          sites: state.sites.filter((s) => s.id !== siteId),
          currentSiteId: state.currentSiteId === siteId ? null : state.currentSiteId,
        })),
      getCurrentSite: () => {
        const { currentSiteId, sites } = get();
        return sites.find((s) => s.id === currentSiteId) || null;
      },
    }),
    {
      name: 'site-storage',
      partialize: (state) => ({
        currentSiteId: state.currentSiteId,
        sites: state.sites,
      }),
    }
  )
);
```

### Module Store

```typescript
interface Module {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  activated_at?: string;
}

interface ModuleStore {
  activeModules: string[];
  modules: Module[];
  setActiveModules: (moduleIds: string[]) => void;
  setModules: (modules: Module[]) => void;
  activateModule: (moduleId: string) => void;
  deactivateModule: (moduleId: string) => void;
  isModuleActive: (moduleId: string) => boolean;
}

export const useModuleStore = create<ModuleStore>((set, get) => ({
  activeModules: [],
  modules: [],
  setActiveModules: (moduleIds) => set({ activeModules: moduleIds }),
  setModules: (modules) => set({ modules }),
  activateModule: (moduleId) =>
    set((state) => ({
      activeModules: [...state.activeModules, moduleId],
    })),
  deactivateModule: (moduleId) =>
    set((state) => ({
      activeModules: state.activeModules.filter((id) => id !== moduleId),
    })),
  isModuleActive: (moduleId) => get().activeModules.includes(moduleId),
}));
```

### UI Store

```typescript
interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      notifications: [],
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      addNotification: (notification) =>
        set((state) => ({
          notifications: [...state.notifications, notification],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
    }
  )
);
```

## 6.2 Route-Level State

### Form State (React Hook Form)

**Document Upload Form:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const documentUploadSchema = z.object({
  file: z.instanceof(File).refine((file) => file.size <= 50 * 1024 * 1024, 'File size must be less than 50MB'),
  documentType: z.enum(['PERMIT', 'CONSENT', 'MCPD_REGISTRATION', 'VARIATION']),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional(),
});

type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

function DocumentUploadForm({ siteId, onSubmit }: { siteId: string; onSubmit: (data: DocumentUploadFormData) => void }) {
  const form = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      documentType: 'PERMIT',
      title: '',
      description: '',
      metadata: {},
    },
    mode: 'onBlur', // Validate on blur
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = form;
  
  const selectedFile = watch('file');
  const documentType = watch('documentType');

  // Auto-generate title from filename
  useEffect(() => {
    if (selectedFile && !form.getValues('title')) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setValue('title', fileName);
    }
  }, [selectedFile, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="file">Document File</label>
        <input
          {...register('file')}
          type="file"
          accept=".pdf,.doc,.docx"
          className={errors.file ? 'border-red-500' : ''}
        />
        {errors.file && <p className="text-[#B13434] text-sm">{errors.file.message}</p>}
      </div>

      <div>
        <label htmlFor="documentType">Document Type</label>
        <select {...register('documentType')}>
          <option value="PERMIT">Permit</option>
          <option value="CONSENT">Consent</option>
          <option value="MCPD_REGISTRATION">MCPD Registration</option>
          <option value="VARIATION">Variation</option>
        </select>
      </div>

      <div>
        <label htmlFor="title">Title</label>
        <input {...register('title')} className={errors.title ? 'border-red-500' : ''} />
        {errors.title && <p className="text-[#B13434] text-sm">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="description">Description (Optional)</label>
        <textarea {...register('description')} rows={4} />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Uploading...' : 'Upload Document'}
      </button>
    </form>
  );
}
```

**Obligation Form with Field Dependencies:**
```typescript
const obligationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['MONITORING', 'REPORTING', 'RECORD_KEEPING', 'OPERATIONAL', 'MAINTENANCE']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME']),
  customSchedule: z.object({
    enabled: z.boolean(),
    days: z.array(z.number()).optional(),
    months: z.array(z.number()).optional(),
  }).optional(),
}).refine((data) => {
  // If customSchedule is enabled, days or months must be provided
  if (data.customSchedule?.enabled) {
    return !!(data.customSchedule.days?.length || data.customSchedule.months?.length);
  }
  return true;
}, {
  message: 'Custom schedule requires days or months',
  path: ['customSchedule'],
});

function ObligationForm({ obligation, onSubmit }: { obligation?: Obligation; onSubmit: (data: any) => void }) {
  const form = useForm({
    resolver: zodResolver(obligationSchema),
    defaultValues: obligation || {
      title: '',
      category: 'MONITORING',
      frequency: 'MONTHLY',
      customSchedule: { enabled: false },
    },
  });

  const { register, handleSubmit, watch, formState: { errors } } = form;
  const customScheduleEnabled = watch('customSchedule.enabled');
  const frequency = watch('frequency');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      {frequency === 'CUSTOM' && (
        <div>
          <label>
            <input type="checkbox" {...register('customSchedule.enabled')} />
            Enable Custom Schedule
          </label>
          {customScheduleEnabled && (
            <div>
              {/* Custom schedule fields */}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
```

### Filter State (URL Query Parameters)

**Obligations Filter Hook:**
```typescript
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';

function useObligationsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = {
    status: searchParams.get('status')?.split(',') || [],
    category: searchParams.get('category')?.split(',') || [],
    search: searchParams.get('search') || '',
    deadlineStart: searchParams.get('deadline_start') || '',
    deadlineEnd: searchParams.get('deadline_end') || '',
  };

  const setFilters = (newFilters: Partial<typeof filters>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        } else {
          params.delete(key);
        }
      } else if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push({ pathname: router.pathname, query: params.toString() });
  };

  const clearFilters = () => {
    router.push({ pathname: router.pathname });
  };

  return { filters, setFilters, clearFilters };
}
```

### Pagination State (URL Query Parameters)

**Pagination Hook:**
```typescript
function usePagination(defaultPageSize = 20) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || defaultPageSize.toString(), 10);
  const cursor = searchParams.get('cursor') || null;

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push({ pathname: router.pathname, query: params.toString() });
  };

  const setLimit = (newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', newLimit.toString());
    params.delete('page'); // Reset to first page
    router.push({ pathname: router.pathname, query: params.toString() });
  };

  const setCursor = (newCursor: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCursor) {
      params.set('cursor', newCursor);
    } else {
      params.delete('cursor');
    }
    router.push({ pathname: router.pathname, query: params.toString() });
  };

  return {
    page,
    limit,
    cursor,
    setPage,
    setLimit,
    setCursor,
  };
}
```

### Modal State (Local Component State)

**Modal State Hook:**
```typescript
function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const open = (data?: any) => {
    setModalData(data);
    setIsOpen(true);
    document.body.style.overflow = 'hidden'; // Prevent body scroll
  };

  const close = () => {
    setIsOpen(false);
    setModalData(null);
    document.body.style.overflow = 'unset';
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'; // Cleanup
    };
  }, []);

  return { isOpen, modalData, open, close };
}
```

## 6.3 State Persistence

**Form Draft Persistence:**
```typescript
function useFormDraft<T>(formKey: string, defaultValues: T) {
  const [draft, setDraft] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`form-draft-${formKey}`);
      return saved ? JSON.parse(saved) : defaultValues;
    }
    return defaultValues;
  });

  const saveDraft = useCallback((values: T) => {
    setDraft(values);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`form-draft-${formKey}`, JSON.stringify(values));
    }
  }, [formKey]);

  const clearDraft = useCallback(() => {
    setDraft(defaultValues);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`form-draft-${formKey}`);
    }
  }, [formKey, defaultValues]);

  return { draft, saveDraft, clearDraft };
}
```

---

# 7. Navigation Flow

## 7.1 Navigation Patterns

**Programmatic Navigation:**
```typescript
const router = useRouter();
router.push('/sites/[siteId]/dashboard');
```

**Link Navigation:**
```typescript
<Link href="/sites/[siteId]/dashboard">
  Go to Dashboard
</Link>
```

**Back Navigation:**
```typescript
router.back();
```

## 7.2 Navigation Guards

**Authentication Guard:**
```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUserStore();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated]);
  
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
```

**Authorization Guard:**
```typescript
function AuthorizedRoute({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole: Role[];
}) {
  const { user } = useUserStore();
  
  if (!user || !requiredRole.includes(user.role)) {
    return <UnauthorizedPage />;
  }
  
  return <>{children}</>;
}
```

**Module Activation Guard:**
```typescript
function ModuleRoute({ 
  children, 
  moduleId 
}: { 
  children: React.ReactNode;
  moduleId: string;
}) {
  const { activeModules } = useModuleStore();
  
  if (!activeModules.includes(moduleId)) {
    return <ModuleNotActivePage moduleId={moduleId} />;
  }
  
  return <>{children}</>;
}
```

## 7.3 Breadcrumb Navigation

**Breadcrumb Component:**
```typescript
function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            {index < items.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

---

# 8. Route Guards

## 8.1 Authentication Guard

**Implementation:**
- Check JWT token validity
- Redirect to `/login` if not authenticated
- Store return URL for post-login redirect

## 8.2 Authorization Guard

**Implementation:**
- Check user role/permissions
- Check site access (RLS)
- Redirect to `/dashboard` if insufficient permissions

## 8.3 Module Activation Guard

**Implementation:**
- Check module activation status
- Redirect to `/modules` if module not active
- Show activation prompt if prerequisites not met

---

# 9. Deep Linking Support

## 9.1 Deep Link Patterns

- Obligation detail: `/sites/[siteId]/obligations/[obligationId]`
- Evidence upload: `/sites/[siteId]/obligations/[obligationId]/evidence/upload`
- Audit pack: `/sites/[siteId]/audit-packs/[auditPackId]`

## 9.2 Deep Link Handling

- Validate site access before rendering
- Show loading state while validating
- Redirect to dashboard if access denied

---

# 10. Mobile-First Responsive Design

## 10.1 Responsive Breakpoints

**Breakpoints (from Design System 2.9):**
- **Mobile:** < 640px (sm) - Single column, stacked layout
- **Tablet:** 640px - 1024px (md) - 2-3 columns, optimized touch
- **Desktop:** 1024px - 1280px (lg) - 3-4 columns, hover states
- **Large Desktop:** > 1280px (xl) - 4+ columns, expanded layouts

## 10.2 Mobile Navigation Patterns

**Header:**
- Hamburger menu (mobile)
- Full navigation (desktop)

**Sidebar:**
- Collapsible drawer (mobile)
- Persistent sidebar (desktop)

**Bottom Navigation:**
- Fixed bottom nav for primary actions (mobile only)

**Tab Navigation:**
- Horizontal scrollable tabs (mobile)
- Full tabs (desktop)

## 10.3 Mobile-Specific Components

**File Upload:**
- Touch-optimized file picker
- Camera integration

**Forms:**
- Full-width inputs
- Stacked fields
- Large touch targets (min 44x44px)

**Tables:**
- Card layout on mobile
- Table view on desktop

**Modals:**
- Full-screen on mobile (< 640px)
- Centered modal on desktop

## 10.4 Touch Interactions

**Swipe Gestures:**
- Swipe to delete
- Swipe to navigate

**Pull to Refresh:**
- Refresh data on list screens

**Long Press:**
- Context menus
- Bulk selection

**Pinch to Zoom:**
- Image/PDF preview zoom

## 10.5 Responsive Typography (Procore-Inspired)

**Typography Scale (Bold, Confident):**
- **Page Headers:** text-3xl (30px) font-bold - Large, prominent (Procore pattern)
- **Section Headers:** text-2xl (24px) font-bold - Bold, confident
- **Card Headers:** text-xl (20px) font-bold - Strong hierarchy
- **Subsection Headers:** text-lg (18px) font-semibold
- **Body Text:** text-base (16px) font-normal
- **Small Text:** text-sm (14px) font-normal

**Mobile:**
- Smaller font sizes (base: 14px)
- Maintain bold weights for headers
- Tighter line heights

**Desktop:**
- Larger font sizes (base: 16px)
- Maximum visual impact with large headers
- Relaxed line heights

**Visual Weight (Procore-Inspired):**
- **Bold, confident styling** - Enterprise authority
- **Strong hierarchy** - Status and location prominence
- **No "app cute" styling** - Professional, serious tone

**Fluid Typography:**
- Use `clamp()` for responsive font scaling

---

# 11. Accessibility Requirements

## 11.1 WCAG 2.1 AA Compliance

**Level:** WCAG 2.1 AA compliance  
**Color Contrast:** Minimum 4.5:1 for text, 3:1 for UI components  
**Keyboard Navigation:** All interactive elements keyboard accessible  
**Screen Reader Support:** ARIA labels, roles, descriptions  
**Focus Management:** Visible focus indicators, logical tab order

**Compliance Checklist:**
- ✅ Perceivable: Text alternatives, captions, sufficient contrast
- ✅ Operable: Keyboard accessible, no seizure triggers, navigable
- ✅ Understandable: Readable, predictable, input assistance
- ✅ Robust: Compatible with assistive technologies

## 11.2 Keyboard Navigation

### Tab Order

**Logical Tab Sequence:**
```typescript
function DocumentUploadForm() {
  return (
    <form>
      {/* Tab order: 1 */}
      <input type="file" tabIndex={1} aria-label="Select document file" />
      
      {/* Tab order: 2 */}
      <select tabIndex={2} aria-label="Document type">
        <option>Permit</option>
        <option>Consent</option>
      </select>
      
      {/* Tab order: 3 */}
      <input type="text" tabIndex={3} aria-label="Document title" />
      
      {/* Tab order: 4 */}
      <button type="submit" tabIndex={4}>Upload</button>
      
      {/* Tab order: 5 */}
      <button type="button" tabIndex={5}>Cancel</button>
    </form>
  );
}
```

### Skip Links

**Skip to Main Content:**
```typescript
function SkipLinks() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#026A67] focus:text-white"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#026A67] focus:text-white"
      >
        Skip to navigation
      </a>
    </>
  );
}
```

### Keyboard Shortcuts Implementation

**Global Keyboard Shortcuts Hook:**
```typescript
function useKeyboardShortcuts() {
  const router = useRouter();
  const { openSearch } = useSearchStore();
  const { toggleSidebar } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global search: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }

      // Keyboard shortcuts help: Cmd/Ctrl + /
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        // Show shortcuts modal
      }

      // Toggle sidebar: Cmd/Ctrl + B
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }

      // Close modals: Escape
      if (e.key === 'Escape') {
        // Close any open modals
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearch, toggleSidebar]);
}
```

**Dropdown Keyboard Navigation:**
```typescript
function Dropdown({ options, onSelect }: { options: Option[]; onSelect: (option: Option) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(options[focusedIndex]);
        setIsOpen(false);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (isOpen && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      focusedElement?.focus();
    }
  }, [focusedIndex, isOpen]);

  return (
    <div onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        Select option
      </button>
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Options"
        >
          {options.map((option, index) => (
            <li
              key={option.id}
              role="option"
              tabIndex={index === focusedIndex ? 0 : -1}
              aria-selected={index === focusedIndex}
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## 11.3 Screen Reader Support

### ARIA Labels

**Button with ARIA Label:**
```typescript
<button
  aria-label="Delete document"
  onClick={handleDelete}
>
  <TrashIcon aria-hidden="true" />
</button>
```

**Form Input with ARIA:**
```typescript
<div>
  <label htmlFor="email-input">Email Address</label>
  <input
    id="email-input"
    type="email"
    aria-required="true"
    aria-invalid={errors.email ? 'true' : 'false'}
    aria-describedby={errors.email ? 'email-error' : undefined}
  />
  {errors.email && (
    <span id="email-error" role="alert" aria-live="polite">
      {errors.email.message}
    </span>
  )}
</div>
```

### ARIA Roles

**Navigation with ARIA:**
```typescript
<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <a role="menuitem" href="/dashboard">Dashboard</a>
    </li>
    <li role="none">
      <a role="menuitem" href="/documents">Documents</a>
    </li>
  </ul>
</nav>
```

**Status with ARIA:**
```typescript
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

### Live Regions

**Dynamic Content Announcements:**
```typescript
function useLiveRegion() {
  const [announcement, setAnnouncement] = useState('');

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(''), 1000);
  };

  return {
    announce,
    LiveRegion: () => (
      <div
        role="status"
        aria-live={priority}
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    ),
  };
}

// Usage
function DocumentUpload() {
  const { announce, LiveRegion } = useLiveRegion();
  const uploadMutation = useDocumentUpload();

  const handleSuccess = () => {
    announce('Document uploaded successfully');
  };

  return (
    <>
      <LiveRegion />
      {/* Form */}
    </>
  );
}
```

### Alt Text

**Image with Descriptive Alt Text:**
```typescript
<img
  src="/compliance-status.png"
  alt="Compliance status indicator showing green traffic light, indicating all obligations are compliant"
  role="img"
/>
```

**Decorative Image:**
```typescript
<img
  src="/decoration.png"
  alt=""
  role="presentation"
  aria-hidden="true"
/>
```

## 11.4 Color Contrast

### Contrast Ratios

**Text Contrast:**
```css
/* Normal text: minimum 4.5:1 */
.text-primary {
  color: #1f2937; /* Gray-800: 4.6:1 on white */
}

.text-secondary {
  color: #6b7280; /* Gray-500: 4.5:1 on white */
}

/* Large text (18px+): minimum 3:1 */
.text-large {
  font-size: 18px;
  color: #9ca3af; /* Gray-400: 3.1:1 on white */
}
```

**UI Component Contrast:**
```css
/* Buttons: minimum 3:1 */
.btn-primary {
  background-color: #2563eb; /* Blue-600 */
  color: #ffffff; /* White: 4.5:1 on blue */
}

.btn-secondary {
  background-color: #e5e7eb; /* Gray-200 */
  color: #111827; /* Gray-900: 12.6:1 on gray */
}
```

**Status Indicators (Color + Text):**
```typescript
function StatusBadge({ status }: { status: 'compliant' | 'at-risk' | 'non-compliant' }) {
  const config = {
    compliant: { color: 'green', text: 'Compliant', icon: CheckIcon },
    'at-risk': { color: 'yellow', text: 'At Risk', icon: WarningIcon },
    'non-compliant': { color: 'red', text: 'Non-Compliant', icon: XIcon },
  };

  const { color, text, icon: Icon } = config[status];

  return (
    <span
      className={`bg-${color}-100 text-${color}-800 flex items-center gap-1`}
      role="status"
      aria-label={`Status: ${text}`}
    >
      <Icon aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
```

## 11.5 Focus Management

### Focus Indicators

**Visible Focus Styles:**
```css
/* Default focus */
*:focus {
  outline: 2px solid #2563eb; /* Blue-600 */
  outline-offset: 2px;
}

/* Focus for interactive elements */
button:focus,
a:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Remove default focus for mouse users (optional) */
.js-focus-visible *:focus:not(.focus-visible) {
  outline: none;
}
```

### Focus Trap

**Modal Focus Trap:**
```typescript
function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTab);
    };
  }, [isActive]);

  return containerRef;
}
```

### Focus Restoration

**Restore Focus After Modal Close:**
```typescript
function Modal({ isOpen, onClose, children }: ModalProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // ... rest of modal implementation
}
```

## 11.6 Form Accessibility

**Accessible Form Example:**
```typescript
function AccessibleForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Document upload form"
      noValidate
    >
      <fieldset>
        <legend>Document Information</legend>
        
        <div>
          <label htmlFor="file-input">
            Document File
            <span aria-label="required">*</span>
          </label>
          <input
            id="file-input"
            type="file"
            required
            aria-required="true"
            aria-invalid={errors.file ? 'true' : 'false'}
            aria-describedby={errors.file ? 'file-error' : 'file-help'}
            onChange={handleFileChange}
          />
          <span id="file-help" className="help-text">
            Accepted formats: PDF, DOC, DOCX. Maximum size: 50MB
          </span>
          {errors.file && (
            <span id="file-error" role="alert" aria-live="polite">
              {errors.file}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="title-input">Title</label>
          <input
            id="title-input"
            type="text"
            required
            aria-required="true"
            aria-invalid={errors.title ? 'true' : 'false'}
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title && (
            <span id="title-error" role="alert">
              {errors.title}
            </span>
          )}
        </div>
      </fieldset>

      <div role="group" aria-label="Form actions">
        <button type="submit">Submit</button>
        <button type="button" onClick={handleCancel}>Cancel</button>
      </div>
    </form>
  );
}
```

---

# 12. Performance Optimization

## 12.1 Code Splitting

### Route-Based Splitting

**Next.js Automatic Code Splitting:**
- Each route in `app/` directory automatically creates a separate bundle
- Route groups `(auth)`, `(dashboard)` create separate chunks
- Dynamic routes `[siteId]` share code but split per route

**Manual Route Splitting:**
```typescript
// app/documents/page.tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const DocumentTable = dynamic(() => import('@/components/DocumentTable'), {
  loading: () => <TableSkeleton />,
});

const DocumentFilters = dynamic(() => import('@/components/DocumentFilters'), {
  loading: () => <FilterSkeleton />,
});

export default function DocumentsPage() {
  return (
    <div>
      <DocumentFilters />
      <DocumentTable />
    </div>
  );
}
```

### Component Lazy Loading

**Heavy Components:**
```typescript
// PDF Viewer - large library
const PDFViewer = dynamic(() => import('@/components/PDFViewer'), {
  loading: () => <PDFViewerSkeleton />,
  ssr: false, // Don't render on server
});

// Chart Library
const Chart = dynamic(() => import('@/components/Chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

// Rich Text Editor
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  loading: () => <EditorSkeleton />,
  ssr: false,
});
```

**Conditional Loading:**
```typescript
function DocumentDetail({ documentId }: { documentId: string }) {
  const { data: document } = useDocument(documentId);
  const [showPreview, setShowPreview] = useState(false);

  const PDFViewer = useMemo(
    () =>
      dynamic(() => import('@/components/PDFViewer'), {
        loading: () => <PDFViewerSkeleton />,
        ssr: false,
      }),
    []
  );

  return (
    <div>
      <button onClick={() => setShowPreview(true)}>Preview Document</button>
      {showPreview && document && <PDFViewer document={document} />}
    </div>
  );
}
```

### Dynamic Imports with Preloading

**Preload on Hover:**
```typescript
function DocumentRow({ document }: { document: Document }) {
  const handleMouseEnter = () => {
    // Preload PDF viewer
    import('@/components/PDFViewer');
  };

  return (
    <tr onMouseEnter={handleMouseEnter}>
      {/* Row content */}
    </tr>
  );
}
```

## 12.2 Image Optimization

### Next.js Image Component

**Optimized Image Usage:**
```typescript
import Image from 'next/image';

function DocumentThumbnail({ document }: { document: Document }) {
  return (
    <Image
      src={document.thumbnail_url}
      alt={document.title}
      width={200}
      height={200}
      loading="lazy"
      placeholder="blur"
      blurDataURL={document.blur_data_url}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

**Responsive Images:**
```typescript
function ResponsiveImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={800}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      srcSet={`
        ${src}?w=640 640w,
        ${src}?w=1024 1024w,
        ${src}?w=1200 1200w
      `}
      loading="lazy"
    />
  );
}
```

### Image Lazy Loading

**Intersection Observer for Lazy Loading:**
```typescript
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="relative">
      {!isLoaded && <ImageSkeleton />}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={cn(!isLoaded && 'hidden')}
        />
      )}
    </div>
  );
}
```

## 12.3 Data Fetching Optimization

### Prefetching Strategies

**Prefetch on Hover:**
```typescript
function ObligationRow({ obligation }: { obligation: Obligation }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['obligation', obligation.id],
      queryFn: () => fetchObligation(obligation.id),
      staleTime: 5 * 60 * 1000,
    });
  };

  return (
    <tr onMouseEnter={handleMouseEnter}>
      {/* Row content */}
    </tr>
  );
}
```

**Prefetch on Route Change:**
```typescript
function usePrefetchRoute(route: string, prefetchFn: () => Promise<any>) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      if (url.startsWith(route)) {
        prefetchFn();
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    return () => router.events.off('routeChangeStart', handleRouteChangeStart);
  }, [route, prefetchFn]);
}
```

### Caching Strategy

**React Query Cache Configuration:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
});

// Route-specific cache times
function useObligations(siteId: string) {
  return useQuery({
    queryKey: ['obligations', siteId],
    queryFn: () => fetchObligations(siteId),
    staleTime: 2 * 60 * 1000, // 2 minutes for list data
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

function useObligation(obligationId: string) {
  return useQuery({
    queryKey: ['obligation', obligationId],
    queryFn: () => fetchObligation(obligationId),
    staleTime: 5 * 60 * 1000, // 5 minutes for detail data
    cacheTime: 10 * 60 * 1000, // 10 minutes cache
  });
}
```

### Pagination Optimization

**Infinite Scroll:**
```typescript
function useInfiniteObligations(siteId: string) {
  return useInfiniteQuery({
    queryKey: ['obligations', 'infinite', siteId],
    queryFn: ({ pageParam = null }) =>
      fetchObligations(siteId, { cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.pagination?.cursor || null,
    getPreviousPageParam: (firstPage) => firstPage.pagination?.previousCursor || null,
  });
}

function ObligationsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteObligations(siteId);

  const observerRef = useIntersectionObserver({
    threshold: 0.1,
    onIntersect: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.data.map((obligation) => (
            <ObligationRow key={obligation.id} obligation={obligation} />
          ))}
        </React.Fragment>
      ))}
      <div ref={observerRef} />
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}
```

### Debouncing

**Search Input Debouncing:**
```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedSearchTerm],
    queryFn: () => searchDocuments(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length > 2,
  });

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search documents..."
    />
  );
}
```

## 12.4 Loading Performance

### Skeleton Loaders

**Component Skeletons:**
```typescript
function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg shadow p-4">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-4 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
  );
}
```

### Progressive Loading

**Critical Content First:**
```typescript
function DashboardPage() {
  // Load critical data first
  const { data: criticalData } = useQuery({
    queryKey: ['dashboard', 'critical'],
    queryFn: fetchCriticalDashboardData,
  });

  // Load secondary data after critical data is loaded
  const { data: secondaryData } = useQuery({
    queryKey: ['dashboard', 'secondary'],
    queryFn: fetchSecondaryDashboardData,
    enabled: !!criticalData, // Only fetch after critical data loads
  });

  return (
    <div>
      {criticalData && <CriticalSection data={criticalData} />}
      {secondaryData && <SecondarySection data={secondaryData} />}
    </div>
  );
}
```

### Bundle Size Optimization

**Bundle Analysis:**
```typescript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },
};
```

**Tree Shaking:**
```typescript
// Import only what you need
import { Button } from '@/components/ui'; // ✅ Good
import * as UI from '@/components/ui'; // ❌ Bad - imports everything

// Use named exports
export { Button } from './Button'; // ✅ Good
export default Button; // ❌ Bad - harder to tree shake
```

## 12.5 Performance Monitoring

**Web Vitals Tracking:**
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function reportWebVitals(metric: any) {
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

export function useWebVitals() {
  useEffect(() => {
    getCLS(reportWebVitals);
    getFID(reportWebVitals);
    getFCP(reportWebVitals);
    getLCP(reportWebVitals);
    getTTFB(reportWebVitals);
  }, []);
}
```

---

# 13. Error Handling & States

## 13.1 Error Boundaries

### Route-Level Error Boundary

**Implementation:**
```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-[#FEF2F2] rounded-full">
          <ExclamationTriangleIcon className="h-6 w-6 text-[#B13434]" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900 text-center">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-gray-600 text-center">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log error to error reporting service
        console.error('Route error:', error, errorInfo);
        // Send to error tracking (e.g., Sentry)
      }}
      onReset={() => {
        // Reset any state if needed
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Component-Level Error Boundary

**Component Error Boundary:**
```typescript
function ComponentErrorBoundary({ children, fallback }: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        fallback || (
          <div className="p-4 bg-[#FEF2F2] border border-[#B13434] rounded-md">
            <p className="text-[#B13434]">{error.message}</p>
            <button onClick={resetErrorBoundary} className="mt-2 text-[#B13434] underline">
              Retry
            </button>
          </div>
        )
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Usage
function DocumentList() {
  return (
    <ComponentErrorBoundary>
      <DocumentsTable />
    </ComponentErrorBoundary>
  );
}
```

## 13.2 Error States

### Network Errors

**Network Error Component:**
```typescript
function NetworkError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isOffline = !navigator.onLine;

  return (
    <div className="p-4 bg-[#FFF7ED] border border-[#CB7C00] rounded-md">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-5 w-5 text-[#CB7C00] mt-0.5" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-[#CB7C00]">
            {isOffline ? 'You are offline' : 'Network error'}
          </h3>
          <p className="mt-1 text-sm text-[#92400E]">
            {isOffline
              ? 'Please check your internet connection and try again.'
              : error.message || 'Failed to load data. Please try again.'}
          </p>
          <button
            onClick={onRetry}
            className="mt-3 px-4 py-2 bg-[#CB7C00] text-white rounded-md hover:bg-[#A16207]"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Validation Errors

**Form Validation Error Display:**
```typescript
function FormField({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      {error && (
        <div className="mt-1 flex items-center gap-1 text-sm text-red-600" role="alert">
          <ExclamationCircleIcon className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function FormErrorSummary({ errors }: { errors: Record<string, string> }) {
  const errorCount = Object.keys(errors).length;
  
  if (errorCount === 0) return null;

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
      <h3 className="text-sm font-medium text-red-800">
        Please fix the following {errorCount} error{errorCount > 1 ? 's' : ''}:
      </h3>
      <ul className="mt-2 list-disc list-inside text-sm text-red-700">
        {Object.entries(errors).map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`} className="underline">
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Permission Errors

**Permission Error Component:**
```typescript
function PermissionError({ 
  requiredRole, 
  currentRole 
}: { 
  requiredRole: string[];
  currentRole: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <LockClosedIcon className="h-12 w-12 text-gray-400 mx-auto" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 text-center">
          Access Denied
        </h2>
        <p className="mt-2 text-sm text-gray-600 text-center">
          You don't have permission to access this page. This page requires one of the following roles: {requiredRole.join(', ')}.
        </p>
        <p className="mt-2 text-sm text-gray-500 text-center">
          Your current role: {currentRole}
        </p>
        <div className="mt-6">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
        <div className="mt-4 text-center">
          <a href="/support" className="text-sm text-blue-600 hover:text-blue-700">
            Request Access
          </a>
        </div>
      </div>
    </div>
  );
}
```

### 404 Error Page

**Custom 404 Page:**
```typescript
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-bold text-gray-200">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">
          Page Not Found
        </h2>
        <p className="mt-2 text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
          >
            Go Back
          </button>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </a>
        </div>
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Links:</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            <a href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700">Dashboard</a>
            <a href="/documents" className="text-sm text-blue-600 hover:text-blue-700">Documents</a>
            <a href="/obligations" className="text-sm text-blue-600 hover:text-blue-700">Obligations</a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 500 Error Page

**Server Error Page:**
```typescript
export default function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <ServerIcon className="h-12 w-12 text-red-400 mx-auto" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 text-center">
          Server Error
        </h2>
        <p className="mt-2 text-sm text-gray-600 text-center">
          We're experiencing technical difficulties. Please try again in a few moments.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reload Page
          </button>
          <a
            href="/dashboard"
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 text-center"
          >
            Go to Dashboard
          </a>
        </div>
        <div className="mt-4 text-center">
          <a href="/support" className="text-sm text-blue-600 hover:text-blue-700">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
```

## 13.3 Empty States

### No Data Empty State

**Generic Empty State Component:**
```typescript
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: string;
}

function EmptyState({ title, description, icon, action, illustration }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {illustration ? (
        <img src={illustration} alt="" className="mx-auto h-48 w-48 mb-4" />
      ) : (
        icon && <div className="mx-auto h-12 w-12 text-gray-400 mb-4">{icon}</div>
      )}
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Route-Specific Empty States:**
```typescript
// Documents empty state
function DocumentsEmptyState({ siteId }: { siteId: string }) {
  return (
    <EmptyState
      title="No documents yet"
      description="Upload your first permit, consent, or MCPD registration document to get started."
      icon={<DocumentIcon />}
      action={{
        label: "Upload Document",
        onClick: () => router.push(`/sites/${siteId}/documents/upload`),
      }}
      illustration="/empty-documents.svg"
    />
  );
}

// Obligations empty state
function ObligationsEmptyState({ siteId }: { siteId: string }) {
  return (
    <EmptyState
      title="No obligations found"
      description="Obligations will appear here after you upload and process your first document."
      icon={<ClipboardIcon />}
      action={{
        label: "Upload Document",
        onClick: () => router.push(`/sites/${siteId}/documents/upload`),
      }}
    />
  );
}
```

### No Results Empty State

**Search/Filter Empty State:**
```typescript
function NoResultsEmptyState({ 
  searchTerm, 
  onClearFilters 
}: { 
  searchTerm?: string;
  onClearFilters: () => void;
}) {
  return (
    <div className="text-center py-12">
      <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        No results found
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {searchTerm
          ? `No results found for "${searchTerm}". Try adjusting your search terms.`
          : 'No items match your current filters.'}
      </p>
      <div className="mt-6">
        <button
          onClick={onClearFilters}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
```

## 13.4 Loading States

### Skeleton Loaders

**Table Skeleton:**
```typescript
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded"></div>
        ))}
      </div>
    </div>
  );
}
```

**Card Skeleton:**
```typescript
function CardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg shadow p-4">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
  );
}
```

### Loading Indicators

**Spinner Component:**
```typescript
function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`} />
  );
}
```

**Progress Bar:**
```typescript
function ProgressBar({ progress, label }: { progress: number; label?: string }) {
  return (
    <div>
      {label && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

---

# # 14. Animation & Transitions

## 14.1 Page Transitions

### Route Transitions

**Fade Transition:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Slide Transition:**
```typescript
function SlideTransition({ children, direction = 'right' }: { 
  children: React.ReactNode;
  direction?: 'left' | 'right';
}) {
  const variants = {
    initial: {
      x: direction === 'right' ? 100 : -100,
      opacity: 0,
    },
    animate: {
      x: 0,
      opacity: 1,
    },
    exit: {
      x: direction === 'right' ? -100 : 100,
      opacity: 0,
    },
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

### Loading Transitions

**Fade In Content:**
```typescript
function FadeInContent({ children, delay = 0 }: { 
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
}
```

### Modal Transitions

**Modal Animation:**
```typescript
function AnimatedModal({ isOpen, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

## 14.2 Micro-Interactions

### Button Hover Animation

**Button with Hover Effect:**
```typescript
function AnimatedButton({ children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

### Form Focus Animation

**Input with Focus Animation:**
```typescript
function AnimatedInput({ label, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <motion.label
        animate={{
          y: isFocused || props.value ? -20 : 0,
          fontSize: isFocused || props.value ? 12 : 16,
        }}
        className="absolute left-3 text-gray-500 pointer-events-none"
      >
        {label}
      </motion.label>
      <input
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    </div>
  );
}
```

### Success Animation

**Success Checkmark Animation:**
```typescript
function SuccessAnimation() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
    >
      <motion.svg
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      >
        <CheckIcon />
      </motion.svg>
    </motion.div>
  );
}
```

### Error Shake Animation

**Shake Animation for Errors:**
```typescript
function ShakeAnimation({ children, trigger }: { 
  children: React.ReactNode;
  trigger: boolean;
}) {
  const x = useMotionValue(0);

  useEffect(() => {
    if (trigger) {
      animate(x, [0, -10, 10, -10, 10, 0], {
        duration: 0.5,
      });
    }
  }, [trigger, x]);

  return (
    <motion.div style={{ x }}>
      {children}
    </motion.div>
  );
}
```

## 14.3 Performance Considerations

### GPU Acceleration

**Transform-based Animations:**
```css
/* ✅ Good - GPU accelerated */
.animated-element {
  transform: translateX(100px);
  opacity: 0.5;
}

/* ❌ Bad - Not GPU accelerated */
.animated-element {
  left: 100px;
  filter: blur(5px);
}
```

### Reduce Motion

**Respect User Preferences:**
```typescript
function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function ConditionalAnimation({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

### Animation Duration Guidelines

**Duration Standards:**
- Micro-interactions: 100-200ms
- Page transitions: 200-300ms
- Modal/drawer: 250-350ms
- Complex animations: 300-500ms

---

# 15. Form Validation & UX

## 15.1 Validation Patterns

### Real-Time Validation

**Validate on Blur:**
```typescript
function ValidatedInput({ name, rules, ...props }: InputProps) {
  const { register, formState: { errors }, trigger } = useFormContext();
  const [isTouched, setIsTouched] = useState(false);

  return (
    <div>
      <input
        {...register(name, rules)}
        onBlur={async () => {
          setIsTouched(true);
          await trigger(name);
        }}
        {...props}
      />
      {isTouched && errors[name] && (
        <span className="text-red-600 text-sm">{errors[name].message}</span>
      )}
    </div>
  );
}
```

**Validate on Change (Debounced):**
```typescript
function DebouncedValidation({ name, rules }: { name: string; rules: any }) {
  const { register, formState: { errors }, trigger } = useFormContext();
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, 500);

  useEffect(() => {
    if (debouncedValue) {
      trigger(name);
    }
  }, [debouncedValue, name, trigger]);

  return (
    <input
      {...register(name, rules)}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

### Inline Error Display

**Error Message Component:**
```typescript
function ErrorMessage({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1 flex items-center gap-1 text-sm text-red-600"
      role="alert"
    >
      <ExclamationCircleIcon className="h-4 w-4" />
      <span>{error}</span>
    </motion.div>
  );
}
```

### Success Indicators

**Success Checkmark:**
```typescript
function SuccessIndicator({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
        >
          <CheckCircleIcon className="h-5 w-5 text-[#1E7A50]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

## 15.2 Validation Feedback

### Error Message Examples

**Clear, Actionable Messages:**
```typescript
const errorMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  pattern: 'Invalid format',
  custom: (message: string) => message,
};
```

### Success Confirmation

**Success Toast:**
```typescript
function useFormSuccess() {
  const { toast } = useToast();

  const showSuccess = (message: string) => {
    toast({
      title: 'Success',
      description: message,
      variant: 'success',
      duration: 3000,
    });
  };

  return { showSuccess };
}
```

## 15.3 Form UX

### Auto-Save Drafts

**Form Draft Hook:**
```typescript
function useFormDraft<T>(key: string, defaultValues: T) {
  const [draft, setDraft] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`draft-${key}`);
      return saved ? JSON.parse(saved) : defaultValues;
    }
    return defaultValues;
  });

  const saveDraft = useCallback((values: T) => {
    setDraft(values);
    sessionStorage.setItem(`draft-${key}`, JSON.stringify(values));
  }, [key]);

  const clearDraft = useCallback(() => {
    setDraft(defaultValues);
    sessionStorage.removeItem(`draft-${key}`);
  }, [key, defaultValues]);

  return { draft, saveDraft, clearDraft };
}
```

### Field Dependencies

**Conditional Fields:**
```typescript
function ConditionalField({ 
  condition, 
  children 
}: { 
  condition: boolean;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {condition && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Progressive Disclosure

**Collapsible Advanced Options:**
```typescript
function AdvancedOptions({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        {isOpen ? 'Hide' : 'Show'} Advanced Options
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

# 16. Search & Filter UX

## 16.1 Search Patterns

### Global Search

**Global Search Component:**
```typescript
function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => searchAll(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Search documents, obligations, sites..."
        className="w-full px-4 py-2 border border-gray-300 rounded-md"
      />
      {isOpen && results && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          {results.documents.length > 0 && (
            <div>
              <h3 className="px-4 py-2 text-sm font-medium text-gray-500">Documents</h3>
              {results.documents.map((doc) => (
                <SearchResultItem key={doc.id} item={doc} type="document" />
              ))}
            </div>
          )}
          {results.obligations.length > 0 && (
            <div>
              <h3 className="px-4 py-2 text-sm font-medium text-gray-500">Obligations</h3>
              {results.obligations.map((ob) => (
                <SearchResultItem key={ob.id} item={ob} type="obligation" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Search Suggestions

**Autocomplete Component:**
```typescript
function AutocompleteSearch({ onSelect }: { onSelect: (item: any) => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 200);

  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: () => getSearchSuggestions(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, (suggestions?.length || 0) - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions?.[selectedIndex]) {
        onSelect(suggestions[selectedIndex]);
      }
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {suggestions && (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              className={index === selectedIndex ? 'bg-blue-50' : ''}
              onClick={() => onSelect(suggestion)}
            >
              {highlightMatch(suggestion.label, query)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Highlighted Search Results

**Highlight Match Function:**
```typescript
function highlightMatch(text: string, query: string) {
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200">{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
```

## 16.2 Filter Patterns

### Filter Bar Component

**Persistent Filter Bar:**
```typescript
function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        <FilterDropdown
          label="Status"
          options={statusOptions}
          value={filters.status}
          onChange={(value) => onFilterChange({ ...filters, status: value })}
        />
        <FilterDropdown
          label="Category"
          options={categoryOptions}
          value={filters.category}
          onChange={(value) => onFilterChange({ ...filters, category: value })}
        />
        <DateRangeFilter
          value={filters.dateRange}
          onChange={(value) => onFilterChange({ ...filters, dateRange: value })}
        />
        {hasActiveFilters(filters) && (
          <button
            onClick={() => onFilterChange({})}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
```

### Filter Chips

**Active Filter Chips:**
```typescript
function FilterChips({ filters, onRemove }: FilterChipsProps) {
  const activeFilters = getActiveFilters(filters);

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          <span>{filter.label}: {filter.value}</span>
          <button
            onClick={() => onRemove(filter.key)}
            className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
            aria-label={`Remove ${filter.label} filter`}
          >
            <XIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
```

### Filter Presets

**Save/Load Filter Presets:**
```typescript
function FilterPresets({ filters, onLoadPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  const savePreset = (name: string) => {
    const newPreset = { id: uuid(), name, filters };
    setPresets([...presets, newPreset]);
    localStorage.setItem('filter-presets', JSON.stringify([...presets, newPreset]));
  };

  const loadPreset = (preset: FilterPreset) => {
    onLoadPreset(preset.filters);
  };

  return (
    <div>
      <select onChange={(e) => loadPreset(presets.find(p => p.id === e.target.value)!)}>
        <option value="">Load preset...</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>{preset.name}</option>
        ))}
      </select>
      <button onClick={() => savePreset('My Preset')}>Save Current Filters</button>
    </div>
  );
}
```

## 16.3 Filter UX

### Clear Filters

**Clear All Filters Button:**
```typescript
function ClearFiltersButton({ onClear }: { onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
    >
      <XIcon className="h-4 w-4" />
      Clear All Filters
    </button>
  );
}
```

### Filter Count Display

**Results Count:**
```typescript
function FilterResultsCount({ 
  total, 
  filtered 
}: { 
  total: number;
  filtered: number;
}) {
  const isFiltered = total !== filtered;

  return (
    <div className="text-sm text-gray-600">
      {isFiltered ? (
        <>
          Showing <span className="font-medium">{filtered}</span> of{' '}
          <span className="font-medium">{total}</span> results
        </>
      ) : (
        <span className="font-medium">{total}</span> results
      )}
    </div>
  );
}
```

---

# 17. Notification & Toast System

## 17.1 Toast Notifications

### Toast Component

**Toast Implementation:**
```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function Toast({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon,
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-[#026A67]"
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${
          toast.type === 'success' ? 'text-[#1E7A50]' :
          toast.type === 'error' ? 'text-[#B13434]' :
          toast.type === 'warning' ? 'text-[#CB7C00]' :
          'text-[#026A67]'
        }`} />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-[#101314]">{toast.title}</h4>
          {toast.description && (
            <p className="mt-1 text-sm text-[#6B7280]">{toast.description}</p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm text-[#026A67] hover:text-[#014D4A]"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[#9CA3AF] hover:text-[#6B7280]"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
```

### Toast Container

**Toast Manager:**
```typescript
function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### Toast Hook

**useToast Hook:**
```typescript
function useToast() {
  const { addToast } = useToastStore();

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = uuid();
    addToast({ ...options, id });
    return id;
  }, [addToast]);

  return {
    toast,
    success: (title: string, description?: string) =>
      toast({ type: 'success', title, description }),
    error: (title: string, description?: string) =>
      toast({ type: 'error', title, description }),
    warning: (title: string, description?: string) =>
      toast({ type: 'warning', title, description }),
    info: (title: string, description?: string) =>
      toast({ type: 'info', title, description }),
  };
}
```

## 17.2 In-App Notifications

### Notification Center

**Notification Bell Component:**
```typescript
function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
```

### Notification List

**Notification Dropdown:**
```typescript
function NotificationDropdown({
  notifications,
  onMarkAsRead,
  onClose,
}: NotificationDropdownProps) {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <button
            onClick={() => {
              notifications.forEach(n => onMarkAsRead(n.id));
            }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mark all as read
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => onMarkAsRead(notification.id)}
            />
          ))
        )}
      </div>
      <div className="p-4 border-t border-gray-200">
        <a href="/notifications" className="text-sm text-blue-600 hover:text-blue-700">
          View all notifications
        </a>
      </div>
    </div>
  );
}
```

### Notification Item

**Notification Item Component:**
```typescript
function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: () => void;
}) {
  return (
    <div
      className={cn(
        "p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer",
        !notification.read_at && "bg-blue-50"
      )}
      onClick={onMarkAsRead}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {notification.title}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {notification.message}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {formatRelativeTime(notification.created_at)}
          </p>
        </div>
        {!notification.read_at && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </div>
    </div>
  );
}
```

---

# 18. Print Styles

## 18.1 Print-Optimized Routes

**Audit Packs:**
- Print-friendly PDF generation

**Reports:**
- Print styles for compliance reports

**Obligation Lists:**
- Print-friendly table layouts

## 18.2 Print CSS

**Hide Navigation:**
- Hide header, sidebar, footer

**Page Breaks:**
- Control page breaks for multi-page content

**Print Colors:**
- Ensure sufficient contrast in print

**Print Headers:**
- Page numbers, document title

---

# 19. Offline Support

## 19.1 Offline Detection

**Online/Offline Indicator:**
- Show connection status

**Offline Queue:**
- Queue actions when offline, sync when online

**Offline Cache:**
- Cache critical data for offline access

## 19.2 Offline UX

**Offline Message:**
- Clear message when offline

**Offline Actions:**
- Show which actions are queued

**Sync Status:**
- Show sync progress when coming online

---

# 20. Progressive Web App (PWA)

## 20.1 PWA Features

**Service Worker:**
- Cache static assets, API responses

**App Manifest:**
- App metadata, icons, theme colors

**Install Prompt:**
- "Add to Home Screen" prompt

**Offline Support:**
- Basic offline functionality

## 20.2 PWA Configuration

**Icons:**
- Multiple icon sizes (192x192, 512x512)

**Theme Colors:**
- Match brand colors

**Display Mode:**
- Standalone or fullscreen

---

# 21. Internationalization (i18n)

## 21.1 i18n Structure

**Translation Keys:**
- Use translation keys, not hardcoded text

**Locale Detection:**
- Detect user locale from browser

**Locale Switching:**
- Language switcher in user settings

**RTL Support:**
- Right-to-left layout support (if needed)

## 21.2 i18n Implementation

**Translation Files:**
- JSON files per locale

**Pluralization:**
- Handle plural forms correctly

**Date/Time Formatting:**
- Locale-aware date/time formatting

**Number Formatting:**
- Locale-aware number formatting

---

# 22. Dark Mode Support

## 22.1 Dark Mode Implementation

**Theme Toggle:**
- Toggle in user settings, system preference detection

**Theme Persistence:**
- Save theme preference in localStorage

**Color Tokens:**
- Use CSS variables for theme colors

**Component Themes:**
- All components support dark mode

## 22.2 Dark Mode Colors

**Backgrounds:**
- Dark backgrounds (gray-900, gray-800)

**Text:**
- Light text (gray-100, gray-200)

**Borders:**
- Subtle borders (gray-700)

**Status Colors:**
- Adjusted for dark mode contrast

---

# 23. Component Library Integration

## 23.1 Design System Integration

**Design Tokens:**
- Use tokens from Design System (2.9)

**Component Library:**
- Reference component specs from Design System

**Consistency:**
- Ensure all routes use design system components

**Customization:**
- Allow route-specific customization where needed

## 23.2 Component Usage

**Shared Components:**
- Use shared components from design system

**Route-Specific Components:**
- Extend design system components

**Component Props:**
- Follow design system component APIs

---

# 24. Keyboard Shortcuts

## 24.1 Global Shortcuts

- `Ctrl/Cmd + K`: Open global search
- `Ctrl/Cmd + /`: Show keyboard shortcuts help
- `Ctrl/Cmd + N`: New document/obligation (context-dependent)
- `Esc`: Close modals, dropdowns, sidebars

## 24.2 Route-Specific Shortcuts

**Obligations List:**
- `F`: Focus filter
- `N`: Create new obligation

**Document Upload:**
- `Ctrl/Cmd + Enter`: Submit form

**Evidence Upload:**
- `Ctrl/Cmd + Enter`: Submit form

## 24.3 Shortcut Help

**Shortcut Modal:**
- Show all shortcuts in modal (`Ctrl/Cmd + /`)

**Contextual Hints:**
- Show shortcuts in tooltips

---

# 25. TypeScript Interfaces

## 25.1 Route Interfaces

```typescript
interface RouteParams {
  siteId?: string;
  documentId?: string;
  obligationId?: string;
  auditPackId?: string;
}

interface RouteSearchParams {
  page?: string;
  limit?: string;
  filter?: string;
  sort?: string;
}
```

## 25.2 Component Props Interfaces

```typescript
interface DocumentUploadPageProps {
  siteId: string;
}

interface ObligationListPageProps {
  siteId: string;
}

interface EvidenceUploadPageProps {
  siteId: string;
  obligationId: string;
}
```

## 25.3 Data Fetching Interfaces

```typescript
interface UseObligationsParams {
  siteId: string;
  filters?: ObligationFilters;
  pagination?: PaginationParams;
}

interface UseDocumentParams {
  documentId: string;
}
```

---

# Appendix A: Route Configuration Reference

## A.1 Route Metadata Template

```typescript
export const metadata: Metadata = {
  title: 'Page Title | Oblicore',
  description: 'Page description',
};

export const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Sites', href: '/sites' },
  { label: 'Site Name', href: '/sites/[siteId]' },
  { label: 'Current Page', href: null },
];
```

## A.2 Route Guard Template

```typescript
export default function ProtectedPage() {
  return (
    <ProtectedRoute requiredRole={['owner', 'admin', 'staff']}>
      <PageContent />
    </ProtectedRoute>
  );
}
```

---

# Appendix B: Performance Benchmarks

## B.1 Target Metrics

- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.5s
- **Cumulative Layout Shift (CLS):** < 0.1
- **First Input Delay (FID):** < 100ms

## B.2 Bundle Size Targets

- **Initial Bundle:** < 200KB (gzipped)
- **Total Bundle:** < 1MB (gzipped)
- **Route Chunks:** < 50KB per route (gzipped)

---

# Appendix C: Accessibility Checklist

## C.1 WCAG 2.1 AA Checklist

- ✅ Color contrast meets minimum requirements
- ✅ All interactive elements keyboard accessible
- ✅ Screen reader support (ARIA labels, roles)
- ✅ Focus indicators visible
- ✅ Form labels associated with inputs
- ✅ Error messages announced
- ✅ Skip links implemented
- ✅ Alt text for all images

---

**Document End**

This document provides comprehensive specifications for implementing a world-class frontend for the Oblicore platform, ensuring mobile responsiveness, accessibility compliance, optimal performance, and excellent user experience.

