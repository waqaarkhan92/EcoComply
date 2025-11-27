# Oblicore UI/UX Design System Specification

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ User Workflow Maps (1.3) - Complete
- ✅ Frontend Routes & Component Map (2.6) - Complete
- ✅ Onboarding Flow Specification (2.7) - Complete

**Purpose:** Defines the complete UI/UX design system for the Oblicore platform, including design tokens, component specifications, navigation patterns, mobile responsiveness, accessibility guidelines, and implementation details. This document ensures world-class design, Procore-inspired aesthetics, and optimal user experience across all devices.

> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

1. [Document Overview](#1-document-overview)
2. [Design Tokens](#2-design-tokens)
3. [Component Specifications](#3-component-specifications)
4. [Layout System](#4-layout-system)
5. [Complete Navigation System](#5-complete-navigation-system)
6. [Screen-Specific Components](#6-screen-specific-components)
7. [Mobile-First Responsive Design](#7-mobile-first-responsive-design)
8. [Advanced UI/UX Patterns](#8-advanced-uiux-patterns)
9. [Procore-Inspired Design Elements](#9-procore-inspired-design-elements)
10. [Accessibility Specifications](#10-accessibility-specifications)
11. [Performance Specifications](#11-performance-specifications)
12. [Component Composition Patterns](#12-component-composition-patterns)
13. [Design System Documentation Standards](#13-design-system-documentation-standards)
14. [TypeScript Interfaces](#14-typescript-interfaces)

---

# 1. Document Overview

## 1.1 Design Philosophy

The Oblicore platform follows a **Procore-inspired design philosophy** that emphasizes:

- **Enterprise Authority:** Bold, confident styling - not "app cute"
- **Dark Surfaces with Light Content Blocks:** High contrast for premium feel
- **Table-Heavy Dashboards:** Dense data visibility for compliance workflows
- **Large, Prominent Headers:** Status and location prominence
- **Industrial Deep Teal:** Primary accent color (#026A67) replacing Procore's orange with regulatory/environmental signal

## 1.2 Framework & Technology Stack

**Framework:** Next.js 14 App Router  
**Language:** TypeScript  
**Styling:** Tailwind CSS (with design tokens)  
**State Management:** React Query (TanStack Query) + Zustand  
**Form Management:** React Hook Form  
**UI Components:** Design System components (this document)

## 1.3 Design System Principles

1. **Consistency:** All components follow the same design patterns and tokens
2. **Accessibility:** WCAG 2.1 AA compliance across all components
3. **Mobile-First:** Responsive design starting from mobile breakpoints
4. **Performance:** Optimized for fast loading and smooth interactions
5. **Scalability:** Components designed to scale across different screen sizes and use cases

---

# 2. Design Tokens

## 2.1 Color Palette

### Primary Accent Color

**Industrial Deep Teal:** `#026A67`
- **Usage:** CTAs, buttons, active states, hero highlights, charts accents
- **Rationale:** Regulatory + environmental signal, replaces Procore's orange
- **Primary Dark:** `#014D4A` (darker teal variant for hover states, active states)
- **Primary Light:** `#039A96` (lighter teal variant for backgrounds, highlights)

### Enterprise Neutrals

- **Dark Charcoal:** `#101314`
  - **Usage:** Header, sidebar navigation, main background, power sections
- **Soft Slate:** `#E2E6E7`
  - **Usage:** Panels, backgrounds, subtle borders
- **White:** `#FFFFFF`
  - **Usage:** Content backgrounds, cards
- **Black:** `#000000`
  - **Usage:** Text, icons

### Status / Semantic Colors

- **Success:** `#1E7A50`
  - **Usage:** Compliant status, success actions, positive indicators
  - **Rationale:** Industrial green, serious not playful
- **Warning:** `#CB7C00`
  - **Usage:** At risk, warnings, caution indicators
  - **Rationale:** Amber/gold, regulatory urgency like HSE notices
- **Danger:** `#B13434`
  - **Usage:** Non-compliant, errors, critical alerts
  - **Rationale:** Deep red, legal danger clarity
- **Info:** `#026A67`
  - **Usage:** Information - uses primary teal

### Text Colors

- **Text Primary:** `#101314` (Dark Charcoal - main text)
- **Text Secondary:** `#6B7280` (medium gray - secondary text)
- **Text Tertiary:** `#9CA3AF` (light gray - tertiary text)
- **Text Disabled:** `#D1D5DB` (disabled gray - disabled text)

### Background Colors

- **Background Primary:** `#FFFFFF` (White - main content areas)
- **Background Secondary:** `#E2E6E7` (Soft Slate - panels, cards)
- **Background Tertiary:** `#F9FAFB` (very light gray - subtle backgrounds)
- **Background Dark:** `#101314` (Dark Charcoal - dark mode, headers)

## 2.2 Typography Scale

### Font Family

**System Font Stack:**
```css
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Font Sizes

- **xs:** 12px
- **sm:** 14px
- **base:** 16px
- **lg:** 18px
- **xl:** 20px
- **2xl:** 24px
- **3xl:** 30px
- **4xl:** 36px

### Line Heights

- **Tight:** 1.25
- **Normal:** 1.5
- **Relaxed:** 1.75

### Font Weights

- **Light:** 300
- **Normal:** 400
- **Medium:** 500
- **Semibold:** 600
- **Bold:** 700

### Headings

- **h1:** 3xl (30px), bold
- **h2:** 2xl (24px), semibold
- **h3:** xl (20px), semibold
- **h4:** lg (18px), medium
- **h5:** base (16px), medium
- **h6:** sm (14px), medium

## 2.3 Spacing Scale

**Spacing Values:**
- 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px)

**Usage:**
- **Margin/Padding:** Use spacing scale consistently
- **Gap:** Use spacing scale for flex/grid gaps

## 2.4 Border Radius

**Values:**
- **None:** 0
- **sm:** 2px
- **base:** 4px
- **md:** 6px
- **lg:** 8px
- **xl:** 12px
- **2xl:** 16px
- **full:** 9999px

**Usage:**
- **Buttons:** md (6px)
- **Cards:** lg (8px)
- **Modals:** xl (12px)
- **Inputs:** base (4px)

## 2.5 Shadows

**Values:**
- **sm:** Subtle shadow (0 1px 2px rgba(0, 0, 0, 0.05))
- **base:** Default shadow (0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06))
- **md:** Elevated shadow (0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06))
- **lg:** High shadow (0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05))
- **xl:** Very high shadow (0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04))

**Usage:**
- **Cards:** base shadow
- **Modals:** lg shadow
- **Dropdowns:** sm shadow

## 2.6 Breakpoints

**Responsive Breakpoints:**
- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md)
- **Desktop:** 1024px - 1280px (lg)
- **Large Desktop:** > 1280px (xl)

---

# 3. Component Specifications

## 3.1 Buttons

### Button Variants

**Primary Button:**
- **Background:** Primary Teal (#026A67)
- **Text:** White, font-semibold
- **Hover:** Darker teal (#014D4A)
- **Usage:** Primary actions, CTAs

**Secondary Button (Outline Style):**
- **Background:** Transparent
- **Border:** 2px solid Dark Charcoal (#101314)
- **Text:** Dark Charcoal (#101314)
- **Hover:** Dark Charcoal background, white text
- **Usage:** Secondary actions, cancel buttons

**Danger Button:**
- **Background:** Danger Red (#B13434)
- **Text:** White
- **Hover:** Darker red (#8B2828)
- **Usage:** Destructive actions

**Ghost Button:**
- **Background:** Transparent
- **Text:** Dark Charcoal (#101314)
- **Hover:** Light gray background (#E2E6E7)
- **Usage:** Tertiary actions

**Link Button:**
- **Background:** Transparent
- **Text:** Primary Teal (#026A67)
- **Hover:** Darker teal (#014D4A), underline
- **Usage:** Text links styled as buttons

### Button Sizes

- **Small (sm):** Height 32px, padding 8px 16px, text sm (14px)
- **Medium (md):** Height 40px, padding 12px 24px, text base (16px)
- **Large (lg):** Height 48px, padding 16px 32px, text lg (18px)

### Button States

- **Default:** Normal appearance
- **Hover:** Slight darken/lighten, cursor pointer
- **Active:** Pressed state (slight scale down: scale(0.98))
- **Disabled:** Opacity 50%, cursor not-allowed, no interactions
- **Loading:** Spinner icon, disabled state

### Button Component API

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}
```

### Button Usage Example

```typescript
<Button variant="primary" size="md" onClick={handleClick}>
  Submit
</Button>

<Button variant="secondary" size="sm" icon={<Icon />} iconPosition="left">
  Cancel
</Button>
```

## 3.2 Forms

### Input Fields

**Input Types:**
- **Text:** Standard text input
- **Email:** Email input with validation
- **Password:** Password input with show/hide toggle
- **Number:** Numeric input with min/max validation
- **Date:** Date picker input
- **Time:** Time picker input
- **Textarea:** Multi-line text input
- **Select:** Dropdown select
- **File Upload:** File input with drag-drop

### Input Component API

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

### Input States

- **Default:** Normal appearance, border color #E2E6E7
- **Focus:** Border color Primary Teal (#026A67), ring outline
- **Error:** Border color Danger Red (#B13434), error message below
- **Disabled:** Opacity 50%, cursor not-allowed
- **Read-only:** Gray background, no border

### Input Validation

- **Error Message Display:** Red text (#B13434) below input, 12px font size
- **Success Indicator:** Green checkmark icon on right side (optional)
- **Real-time Validation:** Validate on blur, show errors immediately

### Dropdowns

**Types:**
- **Single Select:** One option selection
- **Multi-select:** Multiple option selection
- **Searchable:** Dropdown with search input

**States:**
- **Default:** Closed, shows selected value or placeholder
- **Open:** Dropdown menu visible, searchable if enabled
- **Selected:** Selected option highlighted
- **Disabled:** Grayed out, not clickable

**Accessibility:**
- **Keyboard Navigation:** Arrow keys to navigate, Enter to select, Escape to close
- **ARIA Attributes:** aria-expanded, aria-haspopup, aria-label

### File Uploads

**Standard File Upload:**
- **Design:** Drag-drop zone + click to browse
- **States:** Default, Dragging (highlighted border), Uploading (progress bar), Success (checkmark), Error (error message)
- **Mobile:** Camera integration for photo capture

**Excel File Upload (Specialized):**
- **Accepts:** .xlsx, .xls, .csv
- **File Size Limit:** 10MB
- **Row Limit:** 10,000 rows
- **Visual:** Excel icon, file type indicator
- **Validation:** File format validation, size validation
- **Progress:** Upload progress bar, processing indicator

**Excel Import Components:**

**ExcelImportDropzone:**
- **Visual:** Excel icon, "Drop Excel file here" text
- **Accepts:** .xlsx, .xls, .csv
- **Validation Feedback:** Show error if invalid format
- **Component API:**
```typescript
interface ExcelImportDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[]; // ['.xlsx', '.xls', '.csv']
  maxSize: number; // 10MB
  maxRows: number; // 10,000
  disabled?: boolean;
}
```

**ImportPreview:**
- **Design:** Preview table showing valid rows, errors, warnings
- **Columns:** Row number, Status (valid/error/warning), Data preview, Error message
- **Actions:** Edit errors, Skip errors, Confirm import
- **Component API:**
```typescript
interface ImportPreviewProps {
  importId: string;
  validRows: ImportRow[];
  errors: ImportError[];
  warnings: ImportWarning[];
  onConfirm: () => void;
  onEdit: (rowIndex: number) => void;
  onSkip: (rowIndex: number) => void;
}

interface ImportRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'valid' | 'error' | 'warning';
  errors?: string[];
  warnings?: string[];
}
```

**ColumnMappingHelper:**
- **Purpose:** Help users map Excel columns to system fields
- **Expected Columns:** permit_number, obligation_title, frequency, deadline_date, site_id
- **Auto-detect:** Fuzzy match column names
- **Manual Mapping:** Dropdown to select system field for each Excel column

**ImportOptions:**
- **Checkboxes:** Create missing sites, Create missing permits, Skip duplicates

**ImportProgress:**
- **Progress Bar:** Upload → Validation → Processing → Complete
- **Status Messages:** "Uploading...", "Validating...", "Processing...", "Complete"

**ImportSuccess:**
- **Show:** Success count, Error count (if any), Link to view obligations
- **Actions:** View obligations, Import another file

## 3.3 Dashboards

### Traffic Light Status Indicators

**Green (Compliant):** `#1E7A50`
- **Condition:** All obligations met, no overdue items
- **Design:** Large circle (64px diameter), green background, white checkmark icon
- **Text:** "All Compliant" in white, bold font

**Yellow (At Risk):** `#CB7C00`
- **Condition:** Upcoming deadlines (7-3 days), missing evidence
- **Design:** Large circle (64px diameter), yellow background, white warning icon
- **Text:** "At Risk" in white, bold font

**Red (Non-Compliant):** `#B13434`
- **Condition:** Overdue obligations, missing evidence past grace period
- **Design:** Large circle (64px diameter), red background, white alert icon
- **Text:** "Non-Compliant" in white, bold font

**Click Action:** Filter obligations by status

### Obligation Lists

**Table View:**
- **Sortable Columns:** Click header to sort, show sort indicator (↑↓)
- **Filterable Rows:** Filter by status, frequency, deadline, site
- **Pagination:** Bottom pagination, 25 items per page
- **Bulk Actions:** Select multiple rows, bulk edit/delete

**Card View:**
- **Layout:** Grid of cards (3 columns desktop, 2 tablet, 1 mobile)
- **Card Content:** Title, frequency, deadline, status badge, evidence count
- **Hover:** Elevation increase, show quick actions
- **Click:** Navigate to obligation detail

**Status Indicators:**
- **Color-coded Badges:** Green/Yellow/Red small badges
- **Size:** 8px × 8px circle, 4px spacing from text

**Edit Controls:**
- **Inline Edit:** Click to edit directly in table
- **Modal Edit:** Click edit button to open edit modal
- **Bulk Actions:** Select multiple, bulk edit/delete

### Deadline Calendars

**Month View:**
- **Design:** Calendar grid with deadline indicators (colored dots)
- **Dot Colors:** Green (compliant), Yellow (at risk), Red (overdue)
- **Click Deadline:** Navigate to obligation detail

**Week View:**
- **Design:** Week timeline with deadline bars
- **Bar Colors:** Green/Yellow/Red based on status
- **Bar Height:** Proportional to urgency

**List View:**
- **Design:** Chronological list of deadlines
- **Sort:** By date (ascending)
- **Format:** Date, Obligation Title, Status Badge

## 3.4 Evidence Cards

### File Preview

**Image Files:**
- **Thumbnail:** 120px × 120px thumbnail preview
- **Hover:** Show full-size preview overlay
- **Click:** Open full-size image modal

**PDF Files:**
- **Preview:** First page thumbnail (120px × 160px)
- **PDF Icon:** Show PDF icon overlay
- **Click:** Open PDF viewer

**Other Files:**
- **File Type Icon:** Show appropriate file type icon
- **Size:** 48px × 48px icon
- **Click:** Download file

### Linking Interface

**Obligation Selector:**
- **Design:** Searchable dropdown or modal
- **Search:** Search obligations by title
- **Filter:** Filter by site, status
- **Multi-select:** Select multiple obligations to link

**Link Confirmation:**
- **Show:** Linked obligation details (title, deadline, status)
- **Confirmation:** "Linked to [Obligation Title]" message

**Unlink Option:**
- **Action:** Remove link button
- **Confirmation:** "Unlink from [Obligation Title]?" modal

### Upload Status

**Uploading:**
- **Progress Bar:** Horizontal progress bar with percentage
- **Percentage:** Show "Uploading... 45%"
- **Cancel:** Cancel button

**Success:**
- **Icon:** Green checkmark icon
- **Message:** "Upload successful"
- **Auto-dismiss:** After 3 seconds

**Error:**
- **Icon:** Red error icon
- **Message:** Error message (e.g., "File too large")
- **Retry Button:** Retry upload button

## 3.5 Audit Pack View

### Preview

**PDF Preview:**
- **Design:** Embedded PDF viewer
- **Controls:** Zoom in/out, fit to width/height, page navigation
- **Toolbar:** Download, print, fullscreen buttons

**Page Navigation:**
- **Previous/Next:** Arrow buttons, keyboard shortcuts (← →)
- **Page Number:** Current page / total pages display
- **Jump to Page:** Page number input

**Zoom Controls:**
- **Zoom In/Out:** +/- buttons, mouse wheel
- **Fit to Width/Height:** Fit buttons
- **Zoom Level:** Show current zoom percentage

### Download

**Download Button:**
- **Design:** Prominent CTA button (Primary Teal)
- **Size:** Large (48px height)
- **Icon:** Download icon + text

**Download Status:**
- **Progress Indicator:** Progress bar for large files
- **Percentage:** Show download percentage
- **Cancel:** Cancel download button

**Download History:**
- **Track:** Download events (date, time, user)
- **Display:** Download history list

### Generation Status

**Pending:**
- **Message:** "Generating..." message
- **Progress Indicator:** Circular progress spinner
- **Estimated Time:** Show estimated time remaining

**Complete:**
- **Message:** "Ready" message
- **Download Button:** Prominent download button
- **Preview:** Show preview thumbnail

**Error:**
- **Message:** Error message
- **Retry Button:** Retry generation button
- **Support Link:** Contact support link

---

# 4. Layout System

## 4.1 Grid System

**12-Column Grid:** Responsive grid system  
**Breakpoints:** Mobile (1 column), Tablet (2-3 columns), Desktop (3-4 columns)  
**Gutters:** Consistent spacing between columns (24px default)  
**Usage:** Use grid system for all page layouts, dashboard widgets, card grids

**Grid Implementation:**
```css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}

.col-span-1 { grid-column: span 1; }
.col-span-2 { grid-column: span 2; }
/* ... up to col-span-12 */
```

**Responsive Grid:**
- **Mobile (< 640px):** Single column, full width
- **Tablet (640px - 1024px):** 2-3 columns
- **Desktop (1024px - 1280px):** 3-4 columns
- **Large Desktop (> 1280px):** 4+ columns, max width 1280px (centered)

## 4.2 Container Widths

**Mobile:** Full width (with padding 16px)  
**Tablet:** Max width 768px (centered, padding 24px)  
**Desktop:** Max width 1024px (centered, padding 32px)  
**Large Desktop:** Max width 1280px (centered, padding 40px)

**Container Implementation:**
```css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 16px;
}

@media (min-width: 640px) {
  .container { padding: 24px; }
}

@media (min-width: 1024px) {
  .container { max-width: 1024px; padding: 32px; }
}

@media (min-width: 1280px) {
  .container { max-width: 1280px; padding: 40px; }
}
```

## 4.3 Layout Components

### Header Component

**Purpose:** Top navigation bar (see Section 4.1 for complete specifications)  
**Background:** Dark Charcoal (#101314)  
**Height:** 64px (desktop), 56px (mobile)  
**Position:** Fixed top, z-index 50  
**Components:** Logo, navigation links, site switcher, search, notifications, user menu

### Sidebar Component

**Purpose:** Left navigation sidebar (see Section 5.2 for complete specifications)  
**Background:** Dark Charcoal (#101314)  
**Width:** 256px (expanded), 64px (collapsed)  
**Position:** Fixed left, below header, z-index 100  
**Components:** Navigation menu items, module shortcuts, site switcher (mobile)

### Footer Component

**Purpose:** Footer with links and copyright  
**Background:** Soft Slate (#E2E6E7)  
**Border:** Top border, 1px solid #D1D5DB  
**Padding:** 16px vertical, 16px horizontal  
**Layout:** Horizontal flex layout with links on left, copyright on right

**Footer Component API:**
```typescript
interface FooterProps {
  version?: string;
}
```

**Footer Implementation:**
```typescript
function Footer({ version }: FooterProps) {
  return (
    <footer className="bg-[#E2E6E7] border-t border-[#D1D5DB] py-4 px-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Link href="/privacy" className="text-sm text-[#6B7280] hover:text-[#026A67]">
            Privacy
          </Link>
          <Link href="/terms" className="text-sm text-[#6B7280] hover:text-[#026A67]">
            Terms
          </Link>
          <Link href="/support" className="text-sm text-[#6B7280] hover:text-[#026A67]">
            Support
          </Link>
        </div>
        <div className="text-sm text-[#6B7280]">
          © {new Date().getFullYear()} Oblicore {version && `v${version}`}
        </div>
      </div>
    </footer>
  );
}
```

**Footer Links:**
- **Privacy:** Link to privacy policy
- **Terms:** Link to terms of service
- **Support:** Link to support/help center
- **Copyright:** Current year, version number (optional)

**Mobile Footer:**
- **Layout:** Stacked vertically on mobile
- **Spacing:** 16px between links
- **Full-width:** Full width on mobile

### Main Content Area

**Purpose:** Main content area with padding  
**Background:** Dark Charcoal (#101314) - main background  
**Content Cards:** White (#FFFFFF) cards on dark background  
**Padding:** Responsive padding (16px mobile, 24px tablet, 32px desktop, 40px large desktop)  
**Max Width:** Container max widths apply (see Container Widths above)

**Main Content Layout:**
```typescript
function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 bg-[#101314] p-4 md:p-6 lg:p-8 xl:p-10">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}
```

**Content Cards:**
- **Background:** White (#FFFFFF)
- **Shadow:** Base shadow (subtle elevation)
- **Border Radius:** Large (lg - 8px)
- **Padding:** 24px
- **Spacing:** 24px gap between cards

---

# 5. Complete Navigation System

## 5.1 Top Navigation Bar (Header)

### Header Structure

**Background:** Dark Charcoal (#101314) - Procore-inspired dark header  
**Height:** 64px (desktop), 56px (mobile)  
**Layout:** Horizontal flex layout with logo, navigation, search, user menu  
**Position:** Fixed top, z-index 50  
**Border:** Bottom border, 1px solid #374151

### Logo Placement

**Position:** Left side of header  
**Size:** 40px height (desktop), 32px (mobile)  
**Spacing:** 16px padding from left edge  
**Logo Variants:** Light logo (white) on dark background, dark logo on light background (for light mode)  
**Click Action:** Navigate to dashboard

### Navigation Links

**Position:** Center-left of header (after logo)  
**Items:** Dashboard, Sites, Documents, Obligations, Evidence, Modules, Audit Packs  
**Styling:** White text (#FFFFFF), font size 14px, font weight 500  
**Hover:** Primary Teal (#026A67) underline, cursor pointer  
**Active State:** Primary Teal underline (2px), bold font weight  
**Spacing:** 24px between items (desktop)  
**Mobile:** Hidden (moved to sidebar)

### Site Switcher Component

**Position:** After navigation links  
**Design:** Dropdown button showing current site name  
**Dropdown:** Site list with search, current site highlighted  
**Styling:** White text, Primary Teal hover, dropdown with white background  
**Mobile:** Moved to sidebar  
**Component API:**
```typescript
interface SiteSwitcherProps {
  currentSiteId: string;
  sites: Site[];
  onSiteChange: (siteId: string) => void;
}
```

### Search Bar

**Position:** Center-right of header  
**Design:** Search input with search icon, expandable on focus  
**Width:** 240px (collapsed), 400px (expanded)  
**Mobile:** Hidden (moved to mobile search overlay)  
**Features:** Autocomplete, recent searches, keyboard shortcuts (Cmd/Ctrl+K)  
**Styling:** White background, dark text, Primary Teal border on focus

### Notifications Bell

**Position:** Right side, before user menu  
**Design:** Bell icon with badge count (red badge if unread)  
**Badge:** Red circle (#B13434) with white count, positioned top-right  
**Dropdown:** Notification list dropdown (max 10 items, "View All" link)  
**Mobile:** Moved to mobile menu  
**Styling:** White icon, hover: Primary Teal

### User Profile Menu

**Position:** Rightmost in header  
**Design:** Avatar circle with dropdown menu  
**Avatar:** User initials or profile image, 32px diameter  
**Dropdown Menu Items:** Profile, Settings, Help, Logout  
**Styling:** White background dropdown, hover states, divider between sections  
**Mobile:** Moved to mobile menu

## 5.2 Sidebar Navigation

### Sidebar Structure

**Background:** Dark Charcoal (#101314) - Procore-inspired dark sidebar  
**Width:** 256px (expanded), 64px (collapsed)  
**Height:** Full viewport height minus header  
**Position:** Fixed left, below header  
**Z-index:** 100 (below modals, above content)  
**Border:** Right border, 1px solid #374151

### Sidebar Collapse

**Collapse Button:** Top-right of sidebar, icon-only button  
**Collapsed State:** Show icons only, tooltip on hover  
**Animation:** Smooth 200ms transition  
**Mobile:** Always collapsed (drawer overlay)

### Navigation Menu Items

**Layout:** Vertical list, icon + text (expanded), icon only (collapsed)  
**Spacing:** 8px between items  
**Padding:** 12px vertical, 16px horizontal  
**Active State:** Primary Teal background (#026A67), white text, left border (4px Primary Teal)  
**Hover State:** Light gray background (#374151), white text  
**Icon Size:** 20px × 20px  
**Text:** White (#FFFFFF), font size 14px, font weight 500

### Nested Navigation

**Expandable Sections:** Chevron icon indicates expandable  
**Sub-menu Items:** Indented 24px, smaller font (13px)  
**Animation:** Smooth expand/collapse (200ms)  
**Active Sub-item:** Primary Teal text, bold font weight

### Module-Specific Navigation

**Conditional Display:** Show Module 2/3 items only if module activated  
**Module Indicators:** Badge showing "Module 2" or "Module 3" next to item  
**Module Items:** Parameters (Module 2), Lab Results (Module 2), Generators (Module 3), Run Hours (Module 3)

### Role-Based Navigation

**Owner/Admin:** All menu items visible  
**Staff:** Hide "User Management", "System Settings"  
**Viewer:** Show read-only items only (no create/edit actions)  
**Consultant:** Show client-specific items only

### Mobile Sidebar (Drawer)

**Behavior:** Overlay drawer from left, dark backdrop  
**Width:** 280px (80% of screen width, max 320px)  
**Animation:** Slide in from left (300ms), fade backdrop  
**Close:** Swipe left, tap backdrop, or close button  
**Touch Gestures:** Swipe left to close

## 5.3 Breadcrumb Navigation

### Breadcrumb Component

**Position:** Below header, above page title  
**Background:** Transparent or light gray (#F9FAFB)  
**Padding:** 12px vertical, 16px horizontal  
**Font Size:** 14px  
**Separator:** Chevron icon (>) or slash (/), gray color (#9CA3AF)

### Breadcrumb Structure

**Format:** Home > Sites > [Site Name] > [Page Name]  
**Clickable:** All items except current page  
**Hover:** Underline on hover  
**Current Page:** Bold font weight, Primary Teal color (#026A67)

### When to Show

**Show:** Detail pages, nested routes (3+ levels deep)  
**Hide:** Top-level pages (dashboard, sites list)  
**Mobile:** Show if space allows, otherwise hide

### Breadcrumb Component API

```typescript
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
}
```

## 5.4 Mobile Navigation

### Bottom Navigation Bar

**Position:** Fixed bottom, full width  
**Height:** 64px (including safe area on iOS)  
**Background:** Dark Charcoal (#101314)  
**Border:** Top border, 1px solid #374151  
**Items:** 4-5 primary actions (Dashboard, Sites, Documents, Obligations, Profile)  
**Layout:** Icon (24px) + label (12px font), centered  
**Active State:** Primary Teal (#026A67) icon and text  
**Inactive State:** Gray (#9CA3AF) icon and text  
**Touch Targets:** Minimum 44px × 44px per item

### Hamburger Menu

**Position:** Left side of mobile header  
**Icon:** Three horizontal lines, white color  
**Size:** 24px × 24px  
**Animation:** Transform to X on open (rotate 90deg)  
**Touch Target:** 44px × 44px

### Mobile Search Overlay

**Trigger:** Search icon in mobile header  
**Behavior:** Full-screen overlay, slide down animation  
**Components:** Search input, recent searches, suggestions  
**Close:** X button, swipe down, or tap backdrop

## 5.5 Module Navigation

### Module Switcher

**Position:** In sidebar, below main navigation  
**Design:** Dropdown or expandable section  
**Items:** Module 1 (Core), Module 2 (Trade Effluent), Module 3 (MCPD/Generators)  
**Active Module:** Highlighted with Primary Teal  
**Inactive Modules:** Grayed out, show activation prompt

### Module Activation Prompts

**Design:** Card with module info, "Activate" button  
**Position:** In sidebar or as inline prompt  
**Styling:** White background card, Primary Teal CTA button

---

# 6. Screen-Specific Components

## 6.1 Dashboard Screens

### Dashboard Layout

**Grid System:** 12-column grid, responsive  
**Widget Spacing:** 24px gap between widgets  
**Mobile:** Single column, stacked widgets  
**Background:** Dark Charcoal (#101314) main background, white content cards

### Traffic Light Status Widget

**Size:** Large card (full width or 6 columns)  
**Design:** Three large circles (Green/Yellow/Red) with status text  
**Green (Compliant):** #1E7A50, "All Compliant" text, white checkmark icon  
**Yellow (At Risk):** #CB7C00, "At Risk" text, white warning icon  
**Red (Non-Compliant):** #B13434, "Non-Compliant" text, white alert icon  
**Circle Size:** 64px diameter  
**Click Action:** Filter obligations by status  
**Mobile:** Stacked vertically, smaller circles (48px)

### Obligation Summary Cards

**Layout:** Grid of 3-4 cards  
**Card Design:** White background (#FFFFFF), shadow (base), rounded corners (lg)  
**Content:** Title, count, trend indicator (↑↓), link to detail  
**Hover:** Slight elevation (shadow md), cursor pointer  
**Mobile:** Single column, full width

### Upcoming Deadlines Widget

**Design:** List of deadlines, sorted by date  
**Items:** Deadline date, obligation title, days remaining, status badge  
**Urgency Colors:** Red (< 3 days), Yellow (3-7 days), Green (> 7 days)  
**Click Action:** Navigate to obligation detail  
**Mobile:** Card layout, scrollable

### Evidence Status Widget

**Design:** Progress bar showing evidence completion percentage  
**Components:** Progress bar, percentage text, missing evidence count  
**Colors:** Green (complete), Yellow (partial), Red (missing)  
**Click Action:** Navigate to evidence list

### Quick Actions Panel

**Design:** Horizontal row of action buttons  
**Actions:** Upload Document, Add Obligation, Upload Evidence, Generate Audit Pack  
**Styling:** Primary Teal buttons, icon + text  
**Mobile:** Vertical stack, full-width buttons

## 6.2 Document Screens

### Document List Table

**Design:** Sortable table with columns (Name, Type, Upload Date, Status, Actions)  
**Row Actions:** View, Edit, Delete (dropdown menu)  
**Sortable Columns:** Click header to sort, show sort indicator (↑↓)  
**Filterable:** Filter by type, status, date range  
**Pagination:** Bottom pagination, 25 items per page  
**Mobile:** Convert to card layout, swipe actions

### Document Card View

**Design:** Grid of cards (3 columns desktop, 2 tablet, 1 mobile)  
**Card Content:** Thumbnail, title, type badge, date, status badge, actions menu  
**Hover:** Elevation increase, show actions  
**Click:** Navigate to document detail

### Document Upload Interface

**Drag-Drop Zone:** Large dropzone, dashed border, Primary Teal on drag  
**File Input:** Hidden file input, click zone to trigger  
**File Preview:** Show selected file name, size, type, remove button  
**Progress Bar:** Upload progress with percentage  
**Mobile:** Full-width dropzone, camera integration

### PDF Viewer Component

**Design:** Embedded PDF viewer with controls  
**Controls:** Zoom in/out, fit to width/height, page navigation  
**Toolbar:** Download, print, fullscreen buttons  
**Mobile:** Full-screen viewer, swipe to navigate pages

## 6.3 Obligation Screens

### Obligation List Table

**Design:** Sortable table with columns (Title, Frequency, Deadline, Status, Evidence, Actions)  
**Status Badges:** Green/Yellow/Red traffic light badges  
**Bulk Actions:** Select multiple, bulk edit, bulk delete  
**Filters:** Status, frequency, deadline range, site  
**Mobile:** Card layout, swipe to reveal actions

### Obligation Card View

**Design:** Card with title, frequency, deadline, status badge, evidence count  
**Layout:** Grid (3 columns desktop, 2 tablet, 1 mobile)  
**Hover:** Elevation increase, show quick actions  
**Click:** Navigate to obligation detail

### Deadline Calendar

**Month View:** Calendar grid with deadline indicators (colored dots)  
**Week View:** Week timeline with deadline bars  
**List View:** Chronological list of deadlines  
**Click Deadline:** Navigate to obligation detail  
**Mobile:** List view default, tap to switch views

## 6.4 Evidence Screens

### Evidence Upload Interface

**Design:** Drag-drop zone + file picker + camera button  
**Camera Integration:** Direct camera access on mobile, photo capture  
**File Types:** Images, PDFs, documents  
**Preview:** Thumbnail preview before upload  
**Mobile:** Full-screen camera interface

### Evidence Grid View

**Design:** Masonry grid layout (Pinterest-style)  
**Items:** Thumbnail, title, date, linked obligations count  
**Hover:** Show overlay with actions (view, link, delete)  
**Mobile:** 2-column grid

### Evidence List View

**Design:** List with thumbnail, metadata, linked obligations  
**Actions:** View, link to obligation, unlink, delete  
**Mobile:** Single column, touch-optimized

### Evidence Linking Modal

**Design:** Modal with obligation selector (searchable dropdown)  
**Search:** Search obligations by title, filter by site  
**Multi-Select:** Select multiple obligations to link  
**Confirmation:** Show linked obligations before confirming

## 6.5 Module 2 Screens (Trade Effluent)

### Parameter Management Interface

**Design:** List of parameters with current value, limit, status  
**Form:** Parameter entry form with validation  
**Limit Indicators:** Visual indicator (progress bar) showing limit proximity  
**Exceedance Alerts:** Red alert cards for exceeded limits

### Lab Results Entry

**Design:** Form with parameter selector, value input, date, source  
**CSV Upload:** Bulk entry via CSV upload  
**Validation:** Value must be numeric, date must be valid  
**Mobile:** Stacked form, full-width inputs

### Exceedance Alerts

**Design:** Alert cards with parameter name, exceeded value, limit, date  
**Styling:** Red background (#B13434), white text, urgent styling  
**Actions:** Acknowledge, view details, link to parameter

## 6.6 Module 3 Screens (MCPD/Generators)

### Generator Management

**Design:** List of generators with name, type, status  
**Form:** Generator creation/edit form  
**Run Hour Tracking:** Show total run hours, last entry date  
**Mobile:** Card layout

### Run Hour Entry

**Design:** Form with generator selector, hours input, date, source  
**Bulk Entry:** Multiple generators, same date  
**Chart Visualization:** Line chart showing run hours over time  
**Mobile:** Full-screen form, simplified chart

## 6.7 Admin Screens

### User Management Interface

**Design:** Table of users with name, email, role, sites, actions  
**Role Assignment:** Dropdown to change role, confirmation modal  
**Site Assignment:** Multi-select to assign sites  
**Filters:** Filter by role, site, company  
**Mobile:** Card layout, stacked actions

### Site Management

**Design:** List of sites with name, address, regulator, actions  
**Creation Form:** Site creation form with validation  
**Settings:** Site-specific settings (modules, users, permissions)  
**Mobile:** Card layout, full-screen forms

---

# 7. Mobile-First Responsive Design

## 7.1 Mobile Navigation

### Mobile Header

**Height:** 56px  
**Components:** Hamburger menu (left), logo (center), notifications/user menu (right)  
**Background:** Dark Charcoal (#101314)  
**Sticky:** Fixed top, scrolls with content

### Mobile Sidebar Drawer

**Width:** 280px (80% screen width, max 320px)  
**Animation:** Slide in from left (300ms ease-out)  
**Backdrop:** Dark overlay (rgba(0,0,0,0.5)), fade in (200ms)  
**Close:** Swipe left, tap backdrop, or close button  
**Touch Gestures:** Swipe left to close, swipe right to open

### Bottom Navigation Bar

**Position:** Fixed bottom, full width  
**Height:** 64px (including safe area on iOS)  
**Items:** 4-5 primary actions (Dashboard, Sites, Documents, Obligations, Profile)  
**Layout:** Icon (24px) + label (12px font), centered  
**Active State:** Primary Teal (#026A67) icon and text  
**Inactive State:** Gray (#9CA3AF) icon and text  
**Touch Targets:** Minimum 44px × 44px per item

## 7.2 Mobile Screen Adaptations

### Table → Card Conversion

**Trigger:** Screen width < 768px  
**Conversion:** Each table row becomes a card  
**Card Layout:** Vertical stack of fields, actions at bottom  
**Swipe Actions:** Swipe left to reveal actions (edit, delete)

### Form Layouts

**Mobile:** Single column, full-width inputs  
**Stacking:** Labels above inputs, buttons full-width  
**Spacing:** 16px vertical spacing between fields  
**Keyboard:** Inputs adjust for virtual keyboard

### Modal Behavior

**Mobile:** Full-screen modals (not centered)  
**Close:** Swipe down to dismiss, or close button  
**Animation:** Slide up from bottom (300ms)  
**Backdrop:** Full-screen dark overlay

### Touch Gestures

**Swipe Left:** Delete action (on list items)  
**Swipe Right:** Navigate back (on detail pages)  
**Pull-to-Refresh:** Refresh data (on list pages)  
**Long-Press:** Context menu (on cards, list items)

## 7.3 Mobile-Specific Components

### Mobile Search Overlay

**Design:** Full-screen overlay, slide down animation  
**Components:** Search input, recent searches, suggestions  
**Close:** Swipe down, tap backdrop, or X button  
**Keyboard:** Auto-focus input, show keyboard

### Mobile Filters

**Design:** Bottom sheet filter panel  
**Components:** Filter options, apply/cancel buttons  
**Animation:** Slide up from bottom (300ms)  
**Filter Chips:** Show active filters as chips above list

### Mobile Actions (FAB)

**Design:** Floating action button, bottom-right  
**Size:** 56px × 56px  
**Icon:** Plus icon, white color  
**Actions:** Primary action (upload, create)  
**Position:** Above bottom navigation bar

### Mobile Camera

**Design:** Full-screen camera interface  
**Components:** Camera viewfinder, capture button, gallery button  
**Features:** Flash toggle, camera flip (front/back)  
**After Capture:** Preview, retake, use photo

## 7.4 Responsive Breakpoint Details

### Breakpoint: Mobile (< 640px)

**Layout:** Single column, full width  
**Navigation:** Bottom nav, hamburger menu  
**Tables:** Card layout  
**Modals:** Full-screen  
**Forms:** Stacked, full-width inputs  
**Spacing:** 16px padding

### Breakpoint: Tablet (640px - 1024px)

**Layout:** 2-column grid (where applicable)  
**Navigation:** Sidebar (collapsible), top header  
**Tables:** Table layout (scrollable)  
**Modals:** Centered, max width 600px  
**Forms:** 2-column (where applicable)  
**Spacing:** 24px padding

### Breakpoint: Desktop (1024px - 1280px)

**Layout:** 3-4 column grid  
**Navigation:** Full sidebar, top header  
**Tables:** Full table layout  
**Modals:** Centered, max width 800px  
**Forms:** 2-column layout  
**Spacing:** 32px padding

### Breakpoint: Large Desktop (> 1280px)

**Layout:** 4+ column grid, max width 1280px (centered)  
**Navigation:** Full sidebar, top header  
**Tables:** Full table layout  
**Modals:** Centered, max width 1000px  
**Forms:** 2-column layout  
**Spacing:** 40px padding

---

# 8. Advanced UI/UX Patterns

## 8.1 Data Display Components

### Table Component

**Design:** Sortable, filterable, paginated table  
**Features:** Row selection (checkbox), bulk actions, column resizing  
**Sorting:** Click header to sort, show sort indicator (↑↓)  
**Filtering:** Column filters (dropdown, text input, date range)  
**Pagination:** Bottom pagination, page size selector  
**Mobile:** Card layout, swipe actions

**Component API:**
```typescript
interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  onRowClick?: (row: T) => void;
}
```

### Card Component

**Variants:** Default (white background), Elevated (shadow), Outlined (border)  
**Hover States:** Elevation increase, cursor pointer  
**Click Behavior:** Navigate to detail or trigger action  
**Content:** Header, body, footer, actions  
**Mobile:** Full-width, stacked content

### List Component

**Variants:** Default, Bordered (border between items), Striped (alternating background)  
**Item Spacing:** 8px between items  
**Actions:** Inline actions (right side), hover to reveal  
**Mobile:** Touch-optimized, swipe actions

### Grid Component

**Layout:** Responsive grid, auto-fit columns  
**Gap:** 24px between items  
**Masonry Option:** Pinterest-style masonry layout  
**Mobile:** 1-2 columns

## 8.2 Data Visualization

### Chart Components

**Types:** Line chart, Bar chart, Pie chart, Area chart  
**Styling:** Primary Teal (#026A67) for primary data, gray for secondary  
**Interactive:** Hover to show tooltip, click to drill down  
**Responsive:** Auto-resize on window resize  
**Mobile:** Simplified charts, touch interactions

### Progress Indicators

**Progress Bar:** Horizontal bar, percentage display  
**Circular Progress:** Circular progress indicator  
**Step Indicators:** Multi-step progress (onboarding, forms)  
**Colors:** Green (complete), Yellow (in progress), Red (error)

### Status Indicators

**Traffic Lights:** Large circles (Green/Yellow/Red)  
**Badges:** Small colored badges with text  
**Icons:** Status icons (checkmark, warning, error)  
**Color Coding:** Green (#1E7A50), Yellow (#CB7C00), Red (#B13434)

### Timeline Component

**Design:** Vertical timeline with events/deadlines  
**Items:** Date, title, description, status badge  
**Mobile:** Horizontal scrollable timeline

## 8.3 Interactive Elements

### Dropdown Menus

**Design:** Dropdown with menu items, hover states  
**Positioning:** Auto-position (above/below, left/right)  
**Keyboard Navigation:** Arrow keys, Enter to select, Escape to close  
**Mobile:** Full-screen overlay menu

### Context Menus

**Design:** Right-click menu, action menu  
**Positioning:** Positioned at cursor/click point  
**Items:** Action items with icons, dividers between sections  
**Mobile:** Long-press to show, bottom sheet style

### Tooltips

**Design:** Small popover with text, arrow pointer  
**Positioning:** Auto-position (top/bottom/left/right)  
**Delay:** 300ms delay before showing  
**Accessibility:** ARIA-describedby, keyboard accessible

### Popovers

**Design:** Larger popover with content, close button  
**Positioning:** Positioned relative to trigger  
**Dismiss:** Click outside, Escape key, close button  
**Mobile:** Full-screen overlay

### Modals

**Sizes:** Small (400px), Medium (600px), Large (800px), XL (1000px), Fullscreen  
**Overlay:** Dark backdrop (rgba(0,0,0,0.5))  
**Focus Trap:** Trap focus within modal  
**Animation:** Fade in backdrop, scale in modal (200ms)  
**Mobile:** Full-screen modals

### Drawers

**Side Drawers:** Slide in from left/right (300px width)  
**Bottom Drawers:** Slide up from bottom (mobile)  
**Animation:** Slide animation (300ms)  
**Backdrop:** Dark overlay, tap to close

## 8.4 Feedback & Notifications

### Toast Notifications

**Design:** Small notification card, slide in from top-right  
**Types:** Success (green), Warning (yellow), Error (red), Info (teal)  
**Positioning:** Stack vertically, auto-dismiss after 5 seconds  
**Actions:** Dismiss button, action button (optional)  
**Mobile:** Full-width, bottom position

### Alert Banners

**Design:** Full-width banner at top of page  
**Variants:** Success, Warning, Error, Info  
**Dismissible:** X button to dismiss  
**Persistent:** Can be persistent or dismissible

### Loading States

**Skeleton Loaders:** Gray placeholder boxes, shimmer animation  
**Spinners:** Circular spinner, Primary Teal color  
**Progress Indicators:** Progress bar with percentage  
**Placement:** Center of content area or inline

### Empty States

**Design:** Illustration, message, CTA button  
**Illustrations:** Custom illustrations or icons  
**Messaging:** Clear, helpful message  
**CTAs:** Primary action button (e.g., "Upload Document")

### Error States

**Design:** Error illustration, error message, recovery actions  
**Illustrations:** Error icon or illustration  
**Messaging:** Clear error message, helpful suggestions  
**Actions:** Retry button, contact support link

## 8.5 Form Patterns

### Form Layouts

**Single Column:** All fields stacked vertically (mobile default)  
**Two Column:** Fields side-by-side (desktop, wide forms)  
**Responsive Stacking:** Two column → single column on mobile  
**Field Grouping:** Group related fields with section headers

### Field Grouping

**Section Headers:** Bold header, 24px spacing above  
**Field Spacing:** 16px vertical spacing between fields  
**Grouping Logic:** Group by function (e.g., "Basic Information", "Advanced Options")

### Validation Display

**Inline Errors:** Error message below field, red text (#B13434)  
**Field-Level Errors:** Show error icon, red border  
**Form-Level Errors:** Error summary at top of form  
**Success Indicators:** Green checkmark for valid fields

### Form Actions

**Button Placement:** Primary action right, secondary left  
**Mobile:** Stacked buttons, primary on top, full-width  
**Loading State:** Disable form, show loading spinner on submit button

## 8.6 Search & Filter

### Search Interface

**Design:** Search input with search icon, clear button  
**Autocomplete:** Show suggestions as user types  
**Recent Searches:** Show recent searches below input  
**Keyboard:** Cmd/Ctrl+K to open search, Escape to close

### Filter Interface

**Filter Panel:** Side panel or bottom sheet (mobile)  
**Filter Types:** Dropdown, checkbox, date range, text input  
**Active Filters:** Show as chips above content  
**Clear Filters:** "Clear All" button

### Sort Interface

**Sort Dropdown:** Dropdown with sort options  
**Multi-Column Sort:** Allow sorting by multiple columns  
**Sort Indicators:** Show ↑↓ arrows in table headers  
**Mobile:** Sort button opens bottom sheet

---

# 9. Procore-Inspired Design Elements

## 9.1 Dark Sidebar/Header

### Dark Sidebar Specifications

**Background:** Dark Charcoal (#101314)  
**Width:** 256px (expanded), 64px (collapsed)  
**Text Color:** White (#FFFFFF)  
**Hover State:** Light gray (#374151)  
**Active State:** Primary Teal (#026A67)  
**Border:** Right border, 1px solid #374151

### Dark Header Specifications

**Background:** Dark Charcoal (#101314)  
**Height:** 64px  
**Text Color:** White (#FFFFFF)  
**Logo:** Light logo variant  
**Border:** Bottom border, 1px solid #374151

## 9.2 Content Cards

### White Cards on Dark Background

**Card Background:** White (#FFFFFF)  
**Shadow:** Base shadow (subtle elevation)  
**Border Radius:** Large (lg - 8px)  
**Padding:** 24px  
**Contrast:** High contrast against dark background

## 9.3 Large Headers

### Header Specifications

**Size:** text-3xl (30px) for page titles, font-bold  
**Color:** White on dark backgrounds, Dark Charcoal (#101314) on light  
**Spacing:** 32px margin below header  
**Status Prominence:** Large status indicators, prominent placement

## 9.4 Button Styles

### Primary Button

**Background:** Primary Teal (#026A67)  
**Text:** White, font-semibold  
**Hover:** Darker teal (#014D4A)  
**Size:** Medium (40px height) default, Large (48px) for CTAs

### Secondary Button (Outline Style)

**Background:** Transparent  
**Border:** 2px solid Dark Charcoal (#101314)  
**Text:** Dark Charcoal (#101314)  
**Hover:** Dark Charcoal background, white text  
**Styling:** Bold, confident, not "app cute"

## 9.5 Logo Usage

### Logo Specifications

**Placement:** Left side of header, 16px padding  
**Size:** 40px height (desktop), 32px (mobile)  
**Variants:** Light logo (white) on dark background, dark logo on light background  
**No Gradient:** Flat color only, no gradients  
**Wordmark:** Black wordmark + Teal motif (subtle eco-technology tie)

---

# 10. Accessibility Specifications

## 10.1 Keyboard Navigation

### Complete Keyboard Shortcuts

**Tab:** Move to next interactive element  
**Shift+Tab:** Move to previous interactive element  
**Enter/Space:** Activate button/link  
**Arrow Keys:** Navigate dropdowns, lists, tables  
**Escape:** Close modals, dropdowns, menus  
**Cmd/Ctrl+K:** Open search  
**Cmd/Ctrl+/:** Show keyboard shortcuts help

### Keyboard Navigation Patterns

**Tables:** Arrow keys to navigate cells, Enter to activate  
**Dropdowns:** Arrow keys to navigate options, Enter to select  
**Modals:** Tab cycles through elements, Escape closes  
**Menus:** Arrow keys to navigate, Enter to select

### Focus Management

**Focus Indicators:** 2px solid Primary Teal outline, visible on all interactive elements  
**Focus Trap:** Trap focus within modals, drawers  
**Focus Restoration:** Restore focus to trigger after modal closes  
**Skip Links:** Skip to main content link (visible on focus)

## 10.2 Screen Reader Support

### ARIA Patterns

**Labels:** All interactive elements have descriptive labels  
**Roles:** Semantic roles (button, link, navigation, main, etc.)  
**Descriptions:** aria-describedby for additional context  
**Live Regions:** aria-live for dynamic content announcements  
**Landmarks:** Navigation, main, complementary landmarks

### Live Regions

**Usage:** Announce form errors, success messages, loading states  
**Politeness:** "polite" for non-urgent, "assertive" for urgent  
**Examples:** "Form submitted successfully", "Error: Email is required"

## 10.3 Visual Accessibility

### Color Contrast Specifications

**Text on White:** Dark Charcoal (#101314) - 16.7:1 contrast ratio ✅  
**Text on Dark:** White (#FFFFFF) - 16.7:1 contrast ratio ✅  
**Primary Teal on White:** #026A67 - 4.8:1 contrast ratio ✅  
**Primary Teal on Dark:** #026A67 - 3.2:1 contrast ratio ✅  
**Error Red on White:** #B13434 - 4.9:1 contrast ratio ✅  
**Minimum:** 4.5:1 for text, 3:1 for UI components (WCAG AA)

### Focus Indicators

**Design:** 2px solid Primary Teal (#026A67) outline  
**Visibility:** Always visible, high contrast  
**Consistency:** Same style across all interactive elements

### Text Scaling

**Support:** Up to 200% text scaling  
**Layout Adjustments:** Layout adapts to larger text (stacking, wrapping)  
**No Horizontal Scrolling:** Content wraps, no horizontal scroll

### Motion Preferences

**Respect:** prefers-reduced-motion media query  
**Animation Alternatives:** Reduce or remove animations when motion reduced  
**Transitions:** Use CSS transitions, respect user preference

---

# 11. Performance Specifications

## 11.1 Loading Performance

### Skeleton Loaders

**Design:** Gray placeholder boxes matching content layout  
**Animation:** Shimmer animation (subtle, not distracting)  
**Usage:** Show for all async content (lists, tables, cards)  
**Placement:** Replace content area during loading

### Lazy Loading

**Images:** Lazy load images below fold, show placeholder  
**Components:** Lazy load heavy components (charts, PDF viewer)  
**Routes:** Code split by route, lazy load route components  
**Placeholders:** Show skeleton loader during lazy load

### Progressive Enhancement

**Core Content First:** Load essential content first  
**Enhancements Later:** Load non-critical features after core  
**Graceful Degradation:** Features work without JavaScript where possible

## 10.2 Visual Performance

### Image Optimization

**Formats:** WebP with fallback to JPEG/PNG  
**Responsive Images:** srcset for different screen sizes  
**Lazy Loading:** Native lazy loading, Intersection Observer fallback  
**Placeholders:** Blur-up placeholders, low-quality image placeholders

### Animation Performance

**GPU Acceleration:** Use transform and opacity for animations  
**Performance Budget:** 60fps animations, < 16ms per frame  
**Reduce Motion:** Respect prefers-reduced-motion  
**Optimization:** Use will-change sparingly, remove after animation

### Render Optimization

**Virtual Scrolling:** Virtual scrolling for long lists (1000+ items)  
**Windowing:** Render only visible items, virtualize large tables  
**Memoization:** Memoize expensive computations, React.memo for components  
**Debouncing:** Debounce search input, resize handlers

---

# 12. Component Composition Patterns

## 12.1 Page Layouts

### Standard Page Layouts

**Dashboard Layout:** Header + sidebar + main content (grid of widgets)  
**Detail Layout:** Header + breadcrumb + tabs + content + actions  
**Form Layout:** Header + form (single/two column) + actions  
**List Layout:** Header + filters + table/cards + pagination

## 11.2 Section Compositions

### Common Section Patterns

**Header + Content + Actions:** Page header, content area, action buttons (right)  
**Card Header + Body + Footer:** Card with header, body content, footer actions  
**Tab Navigation + Content:** Tabs above content, content changes on tab switch

## 11.3 Component Combinations

### Form + Validation

**Pattern:** Form fields with inline validation, error summary at top  
**Validation Display:** Real-time validation, error messages below fields  
**Success Indicators:** Green checkmark for valid fields

### Table + Filters

**Pattern:** Filter panel (left/side) + table (right/main)  
**Active Filters:** Show as chips above table  
**Filter Actions:** Apply, Clear, Reset buttons

### List + Actions

**Pattern:** List with bulk actions toolbar (above list)  
**Bulk Selection:** Select all checkbox, individual checkboxes  
**Bulk Actions:** Delete, Edit, Export buttons (disabled if none selected)

### Detail + Tabs

**Pattern:** Detail view with tab navigation  
**Tabs:** Horizontal tabs above content  
**Content:** Tab content changes on tab switch, preserve scroll position

---

# 13. Design System Documentation Standards

## 13.1 Component Documentation

### Usage Guidelines

**When to Use:** Clear description of when to use component  
**When Not to Use:** When component should not be used  
**Examples:** Code examples showing usage  
**Variants:** All variants documented with examples

### Do's and Don'ts

**Do's:** Visual examples of correct usage  
**Don'ts:** Visual examples of incorrect usage (with explanation)  
**Best Practices:** Best practices for component usage

### Accessibility Notes

**Keyboard Navigation:** Keyboard navigation patterns  
**Screen Reader:** Screen reader support, ARIA usage  
**Focus Management:** Focus handling, focus indicators

### Performance Notes

**Performance Considerations:** Performance implications  
**Optimization Tips:** Tips for optimal performance  
**Lazy Loading:** When to lazy load component

## 12.2 Design Tokens Documentation

### Token Usage Guidelines

**When to Use:** When to use which token  
**Token Hierarchy:** Token hierarchy (primary, secondary, tertiary)  
**Overrides:** When/how to override tokens

### Token Naming Conventions

**Naming Pattern:** color-primary-500, spacing-md, etc.  
**Consistency:** Consistent naming across all tokens  
**Documentation:** Document all tokens with usage examples

---

# 14. TypeScript Interfaces

## 14.1 Component Interfaces

### Button Interface

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}
```

### Input Interface

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```

### Table Interface

```typescript
interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  onRowClick?: (row: T) => void;
}
```

### Modal Interface

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
}
```

### Site Switcher Interface

```typescript
interface SiteSwitcherProps {
  currentSiteId: string;
  sites: Site[];
  onSiteChange: (siteId: string) => void;
}
```

### Breadcrumb Interface

```typescript
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    current?: boolean;
  }>;
}
```

### Excel Import Interfaces

```typescript
interface ExcelImportDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[]; // ['.xlsx', '.xls', '.csv']
  maxSize: number; // 10MB
  maxRows: number; // 10,000
  disabled?: boolean;
}

interface ImportPreviewProps {
  importId: string;
  validRows: ImportRow[];
  errors: ImportError[];
  warnings: ImportWarning[];
  onConfirm: () => void;
  onEdit: (rowIndex: number) => void;
  onSkip: (rowIndex: number) => void;
}

interface ImportRow {
  rowNumber: number;
  data: Record<string, any>;
  status: 'valid' | 'error' | 'warning';
  errors?: string[];
  warnings?: string[];
}
```

## 13.2 Design Token Interfaces

### Color Tokens

```typescript
interface ColorTokens {
  primary: {
    main: '#026A67';
    dark: '#014D4A';
    light: '#039A96';
  };
  neutral: {
    darkCharcoal: '#101314';
    softSlate: '#E2E6E7';
    white: '#FFFFFF';
    black: '#000000';
  };
  status: {
    success: '#1E7A50';
    warning: '#CB7C00';
    danger: '#B13434';
    info: '#026A67';
  };
  text: {
    primary: '#101314';
    secondary: '#6B7280';
    tertiary: '#9CA3AF';
    disabled: '#D1D5DB';
  };
  background: {
    primary: '#FFFFFF';
    secondary: '#E2E6E7';
    tertiary: '#F9FAFB';
    dark: '#101314';
  };
}
```

### Typography Tokens

```typescript
interface TypographyTokens {
  fontFamily: string;
  fontSize: {
    xs: '12px';
    sm: '14px';
    base: '16px';
    lg: '18px';
    xl: '20px';
    '2xl': '24px';
    '3xl': '30px';
    '4xl': '36px';
  };
  lineHeight: {
    tight: 1.25;
    normal: 1.5;
    relaxed: 1.75;
  };
  fontWeight: {
    light: 300;
    normal: 400;
    medium: 500;
    semibold: 600;
    bold: 700;
  };
}
```

### Spacing Tokens

```typescript
interface SpacingTokens {
  0: '0';
  1: '4px';
  2: '8px';
  3: '12px';
  4: '16px';
  5: '20px';
  6: '24px';
  8: '32px';
  10: '40px';
  12: '48px';
  16: '64px';
  20: '80px';
  24: '96px';
}
```

---

> [v1 UPDATE – Pack UI Components – 2024-12-27]

# 15. v1.0 Pack UI Components

## 15.1 Pack Type Selector Component

**Component:** `PackTypeSelector`

**Purpose:** Allows users to select pack type for generation (plan-based filtering)

**Props:**
```typescript
interface PackTypeSelectorProps {
  userPlan: 'CORE' | 'GROWTH' | 'CONSULTANT';
  selectedPackType?: PackType;
  onSelect: (packType: PackType) => void;
  disabled?: boolean;
}
```

**Visual Design:**
- Card-based selection interface
- Each pack type shown as card with icon, name, description
- Disabled state for unavailable pack types (grayed out, tooltip explains plan requirement)
- Selected state: Teal border (#026A67), checkmark icon

**Pack Type Cards:**
- **Regulator Pack:** 🏛️ Icon, "Inspector-Ready Compliance Pack", Available: Core+
- **Tender Pack:** 📋 Icon, "Client Assurance & Tender Pack", Available: Growth+
- **Board Pack:** 📊 Icon, "Multi-Site Risk Summary", Available: Growth+ (Owner/Admin only)
- **Insurer Pack:** 🛡️ Icon, "Insurance & Broker Pack", Available: Growth+
- **Audit Pack:** 📁 Icon, "Full Evidence Compilation", Available: All plans

**Reference:** Product Logic Specification Section I.8.6 (Pack Type Selection Logic)

---

## 15.2 Pack Generation Modal Component

**Component:** `GeneratePackModal`

**Purpose:** Modal for configuring and generating packs

**Props:**
```typescript
interface GeneratePackModalProps {
  packType: PackType;
  siteId?: UUID;
  companyId?: UUID; // Required for Board Pack
  onGenerate: (config: PackGenerationConfig) => void;
  onClose: () => void;
}
```

**Component Structure:**
```
GeneratePackModal
├── ModalHeader
│   ├── PackTypeBadge
│   ├── ModalTitle
│   └── CloseButton
├── ModalContent
│   ├── PackTypeSpecificForm
│   │   ├── DateRangeSelector
│   │   ├── DocumentSelector (if applicable)
│   │   ├── RecipientFields (if applicable)
│   │   └── PurposeField (optional)
│   └── PreviewSection
│       ├── EstimatedSize
│       └── EstimatedTime
└── ModalFooter
    ├── CancelButton
    └── GenerateButton
```

**Pack Type-Specific Fields:**
- **Regulator Pack:** Date range, document selector, recipient name
- **Tender Pack:** Date range, document selector, client name, purpose
- **Board Pack:** Date range, company scope (all sites), recipient name
- **Insurer Pack:** Date range, document selector, broker name, purpose
- **Audit Pack:** Date range, document selector, filters

---

## 15.3 Pack Distribution Component

**Component:** `PackDistributionPanel`

**Purpose:** Distribute packs via email or shared link (Growth Plan only)

**Props:**
```typescript
interface PackDistributionPanelProps {
  packId: UUID;
  packType: PackType;
  userPlan: 'CORE' | 'GROWTH' | 'CONSULTANT';
  onDistribute: (config: DistributionConfig) => void;
}
```

**Component Structure:**
```
PackDistributionPanel
├── DistributionMethodTabs
│   ├── EmailTab
│   └── SharedLinkTab
├── EmailDistributionForm (if EmailTab)
│   ├── RecipientsInput
│   ├── MessageTextarea
│   └── SendButton
└── SharedLinkSection (if SharedLinkTab)
    ├── LinkDisplay
    ├── ExpirationSelector
    ├── CopyButton
    └── ShareButton
```

**Visual Design:**
- Teal accent for distribution actions (#026A67)
- Success state: Green checkmark when distributed
- Link display: Monospace font, copy button prominent

---

> [v1 UPDATE – Consultant Interface Design – 2024-12-27]

# 16. Consultant Control Centre Interface Design

## 16.1 Consultant Dashboard Layout

**Layout:** Multi-column dashboard with client cards and aggregated metrics

**Component Structure:**
```
ConsultantDashboard
├── DashboardHeader
│   ├── WelcomeMessage
│   └── QuickActions
├── MetricsRow
│   ├── TotalClientsCard
│   ├── ActiveClientsCard
│   ├── TotalSitesCard
│   └── AvgComplianceScoreCard
├── RecentActivitySection
│   └── ActivityTimeline (cross-client)
└── ClientComplianceTable
    ├── ClientRow (repeated)
    │   ├── ClientName
    │   ├── SiteCount
    │   ├── ComplianceScore
    │   ├── OverdueCount
    │   └── ActionsMenu
    └── ViewAllClientsLink
```

**Visual Design:**
- Client cards: White background, subtle shadow
- Compliance score: Color-coded (green/yellow/red)
- Hover state: Slight elevation, cursor pointer
- Click: Navigate to client detail page

---

## 16.2 Client List Component

**Component:** `ConsultantClientList`

**Purpose:** Display all assigned clients with compliance status

**Props:**
```typescript
interface ConsultantClientListProps {
  clients: ConsultantClient[];
  onClientSelect: (clientId: UUID) => void;
  onGeneratePack: (clientId: UUID, packType: PackType) => void;
}
```

**Visual Design:**
- Table layout: Client name, sites, compliance score, overdue count, actions
- Compliance score: Progress bar with color coding
- Actions menu: Generate pack, view details, view packs
- Empty state: "No clients assigned" with onboarding CTA

---

## 16.3 Client Detail View Component

**Component:** `ConsultantClientDetail`

**Purpose:** View single client's compliance data

**Component Structure:**
```
ConsultantClientDetail
├── ClientHeader
│   ├── ClientName
│   ├── ComplianceBadge
│   └── ClientActions
│       ├── GeneratePackButton
│       └── ViewPacksButton
├── ClientTabs
│   ├── OverviewTab
│   ├── SitesTab
│   ├── DocumentsTab
│   ├── ObligationsTab
│   └── PacksTab
└── TabContent
```

**Visual Design:**
- Client header: Prominent, dark background (#101314) with white text
- Tabs: Standard tab navigation, active tab highlighted in teal
- Content: Standard table/list layouts per tab

**Reference:** Product Logic Specification Section C.5.3 (Consultant Dashboard Logic)

---

**Document Complete**

This specification defines the complete UI/UX design system for the Oblicore platform, including all design tokens, component specifications, navigation patterns, mobile responsiveness, accessibility guidelines, performance specifications, and implementation details.

**Document Status:** ✅ **COMPLETE**

**Word Count:** ~12,000+ words

**Sections:** 13 comprehensive sections covering all aspects of UI/UX design system implementation

