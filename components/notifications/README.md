# Notification Center Components

This directory contains the modular notification center UI components for the EcoComply platform.

## Components

### NotificationBell

The bell icon that displays in the dashboard header with unread count badge.

**Features:**
- Shows unread notification count as a badge (displays "9+" for counts over 9)
- Polls for new notifications every 30 seconds
- Toggles the notification dropdown on click
- Uses `useQuery` to fetch unread count from `/api/v1/notifications/unread-count`

**Usage:**
```tsx
import { NotificationBell } from '@/components/notifications/notification-bell';

<NotificationBell />
```

### NotificationDropdown

The dropdown panel that appears when clicking the notification bell.

**Features:**
- Shows up to 10 recent unread notifications
- Polls for updates every 10 seconds when open
- "Mark all as read" button at the top
- "View all notifications" link at the bottom (goes to `/dashboard/notifications`)
- Closes on outside click or Escape key
- Smooth animations using Framer Motion

**Props:**
- `isOpen: boolean` - Controls dropdown visibility
- `onClose: () => void` - Callback when dropdown should close
- `triggerRef: React.RefObject<HTMLButtonElement | null>` - Reference to the bell button for positioning

### NotificationItem

Reusable component for displaying individual notifications.

**Features:**
- Two display modes: compact (for dropdown) and full (for notifications page)
- Shows icon based on notification type with color coding
- Displays title, message, and relative timestamp
- Visual indicator for unread notifications
- Clickable to mark as read and navigate to related entity

**Props:**
- `notification: Notification` - The notification data object
- `onClick?: (notification: Notification) => void` - Click handler
- `compact?: boolean` - Use compact display mode (default: false)

## Notification Types

The following notification types are supported with corresponding icons and colors:

| Type | Icon | Color | Background |
|------|------|-------|------------|
| `deadline_approaching` | Clock | Yellow | Yellow/10 |
| `deadline_overdue` | AlertTriangle | Red | Red/10 |
| `obligation_completed` | CheckCircle | Green | Green/10 |
| `escalation_triggered` | AlertCircle | Orange | Orange/10 |
| `document_uploaded` | FileText | Blue | Blue/10 |
| `evidence_reminder` | FileSearch | Purple | Purple/10 |

## API Endpoints

The components assume the following API endpoints exist:

- `GET /api/v1/notifications/unread-count` - Returns `{ unread_count: number }`
- `GET /api/v1/notifications?limit=10&filter[read_at]=null` - Returns recent unread notifications
- `PUT /api/v1/notifications/:id/read` - Marks a notification as read
- `PUT /api/v1/notifications/read-all` - Marks all notifications as read

## Type Definitions

See `/lib/types/notifications.ts` for complete type definitions including:
- `Notification` - Main notification interface
- `NotificationType` - Union type of all notification types
- `UnreadCountResponse` - Response format for unread count
- `NotificationsListResponse` - Response format for notification list

## Integration

The NotificationBell component is integrated into the dashboard header at `/components/dashboard/header.tsx`.

## Future Enhancements

Possible improvements:
- Real-time notifications using WebSockets or Server-Sent Events
- Sound/browser notifications for important alerts
- Notification preferences/settings
- Notification categories and filtering
- Search within notifications
- Batch operations (mark multiple as read, delete, etc.)
