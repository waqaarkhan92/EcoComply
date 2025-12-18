# Mobile and Offline Support Documentation

This document describes the enhanced mobile and offline capabilities of the EcoComply platform.

## Overview

EcoComply now includes comprehensive Progressive Web App (PWA) features with offline support and mobile-optimized interfaces. Users can install the app on their devices and continue working even without an internet connection.

## Features

### 1. Progressive Web App (PWA)

#### Installation
- Users can install EcoComply as a standalone app on mobile and desktop
- Provides native app-like experience
- Works across iOS, Android, and desktop platforms

#### Manifest Configuration
Location: `/public/manifest.json`

Features:
- App name and branding
- Custom icons for various sizes (192x192, 512x512)
- Standalone display mode
- Theme color: `#104B3A` (EcoComply green)
- Launch URL: `/dashboard`
- Share target for evidence uploads
- App shortcuts for quick navigation

### 2. Service Worker & Caching

#### Enhanced Service Worker
Location: `/public/sw.js`

**Caching Strategies:**

1. **Static Assets** (Cache First)
   - CSS, JavaScript, fonts
   - TTL: 24 hours
   - Max cache size: 50 items

2. **Images** (Stale While Revalidate)
   - All image formats (jpg, png, webp, svg, etc.)
   - TTL: 30 days
   - Max cache size: 30 items

3. **API Requests** (Network First)
   - All `/api/*` endpoints
   - Falls back to cache when offline
   - TTL: 5 minutes
   - Max cache size: 20 items

4. **Navigation** (Network First)
   - Page routes
   - Offline fallback page

**Cache Management:**
- Automatic version-based cache cleanup
- Old caches removed on service worker activation
- Cache size limits to prevent storage bloat
- Timestamp-based freshness checks

#### Service Worker Registration
Location: `/lib/pwa/register-service-worker.ts`

Features:
- Automatic registration on app load
- Update checks every hour
- Update notifications via toast
- Manual cache clearing
- Background sync support

### 3. Offline Data Storage

#### IndexedDB Store
Location: `/lib/offline/indexed-db-store.ts`

**Object Stores:**

1. **user-data**
   - Stores current user information
   - Enables offline authentication state

2. **obligations**
   - Caches obligation data
   - Indexed by siteId and status
   - Enables offline viewing

3. **evidence**
   - Stores evidence items
   - Indexed by obligationId and status
   - Supports offline uploads

4. **sync-queue**
   - Queues offline operations
   - Indexed by status and timestamp
   - Auto-syncs when online

5. **cache-meta**
   - Tracks cache freshness
   - Indexed by timestamp
   - Enables TTL management

**API Methods:**

```typescript
// Store data
await offlineStore.set(storeName, data);
await offlineStore.setMany(storeName, dataArray);

// Retrieve data
const item = await offlineStore.get(storeName, key);
const items = await offlineStore.getAll(storeName);
const filtered = await offlineStore.getByIndex(storeName, indexName, value);

// Delete data
await offlineStore.delete(storeName, key);
await offlineStore.clear(storeName);

// Sync queue
const id = await offlineStore.addToSyncQueue({ url, method, body });
const pending = await offlineStore.getSyncQueue();
await offlineStore.updateSyncItem(id, updates);
```

#### Sync Manager
Location: `/lib/offline/sync-manager.ts`

Features:
- Automatic sync when back online
- Retry logic with exponential backoff
- Max 3 retries per item
- Failed item tracking
- Batch synchronization

### 4. Mobile Navigation

#### Mobile Header
Location: `/components/mobile/mobile-header.tsx`

Features:
- Fixed top header (14px height)
- Hamburger menu button
- Company name/logo
- Search button (opens command palette)
- Notification bell
- User avatar
- Responsive design (hidden on desktop)

#### Bottom Navigation
Location: `/components/mobile/bottom-nav.tsx`

Navigation Items:
- Home (Dashboard)
- Obligations
- Evidence
- Notifications
- Settings

Features:
- Fixed bottom bar (16px height)
- Icons with labels
- Active state indication
- Touch-optimized (44px minimum touch targets)
- Safe area inset support
- Responsive design (hidden on desktop)

### 5. Offline Indicator

Location: `/components/ui/offline-indicator.tsx`

Features:
- Shows when user goes offline
- Displays pending sync count
- Shows syncing status
- Auto-hides when back online (after 3 seconds)
- Updates every 10 seconds
- Accessible (ARIA live region)

States:
- **Offline**: Red/warning color, shows "You are offline"
- **Syncing**: Green/success color, shows "Syncing..."
- **Synced**: Shows briefly then hides

### 6. Responsive Dashboard Layout

Location: `/app/dashboard/layout.tsx`

**Desktop (md and above):**
- Permanent sidebar
- Desktop header
- Full padding

**Mobile (below md):**
- Hidden sidebar (accessible via hamburger)
- Mobile header
- Bottom navigation
- Reduced padding
- Content adjusted for mobile headers

### 7. Offline Page

Location: `/app/offline/page.tsx`

Features:
- Shown when navigation fails offline
- Retry button
- Link to dashboard
- Helpful instructions
- Branded design

## Usage Examples

### Using Offline Hook

```typescript
import { useOffline } from '@/lib/hooks/use-offline';

function MyComponent() {
  const { isOffline, pendingCount, queueRequest } = useOffline();

  const handleSubmit = async (data) => {
    if (isOffline) {
      // Queue for later sync
      await queueRequest('/api/evidence', 'POST', data);
      toast.info('Saved locally. Will sync when online.');
    } else {
      // Send immediately
      await fetch('/api/evidence', { method: 'POST', body: JSON.stringify(data) });
    }
  };

  return (
    <div>
      {isOffline && <div>Offline mode - {pendingCount} pending</div>}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

### Storing Data Offline

```typescript
import { saveObligations, getObligations } from '@/lib/offline';

// Save obligations for offline access
await saveObligations(obligationsArray);

// Retrieve obligations while offline
const obligations = await getObligations();

// Get obligations by site
const siteObligations = await getObligationsBySite(siteId);
```

### Manual Sync Trigger

```typescript
import { syncManager } from '@/lib/offline';

// Manually trigger sync
await syncManager.syncAll();

// Sync specific data types
await syncManager.syncObligations();
await syncManager.syncEvidence();
```

## Best Practices

### 1. Optimistic UI Updates
- Update UI immediately
- Queue changes for sync
- Show sync status
- Handle failures gracefully

### 2. Cache Management
- Cache essential data only
- Respect TTL values
- Clean up old data
- Monitor storage usage

### 3. Error Handling
```typescript
try {
  await queueRequest(url, method, data);
} catch (error) {
  // Handle storage errors
  console.error('Failed to queue request:', error);
  toast.error('Unable to save offline. Please try again.');
}
```

### 4. User Communication
- Show offline status clearly
- Indicate pending syncs
- Notify when sync completes
- Explain offline limitations

### 5. Testing
- Test offline scenarios
- Verify sync behavior
- Check cache limits
- Test on real devices

## Browser Support

### Service Worker
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 11.3+)

### IndexedDB
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support

### Background Sync
- Chrome/Edge: ✅ Full support
- Firefox: ⚠️ Limited support
- Safari: ❌ Not supported (falls back to online event)

### PWA Installation
- Chrome/Edge: ✅ Full support
- Firefox: ⚠️ Limited (Android only)
- Safari: ✅ Full support (iOS/macOS)

## Performance Considerations

### Service Worker Size
- Minified: ~8KB
- No external dependencies
- Fast activation time

### IndexedDB Storage
- Default quota: ~50MB
- Expandable on request
- Automatic cleanup

### Cache Sizes
- Static: Max 50 items
- Images: Max 30 items
- API: Max 20 items
- Total: ~20-30MB typical

## Security

### Cache Security
- Same-origin policy enforced
- HTTPS required in production
- No sensitive data in service worker

### Storage Security
- IndexedDB is origin-isolated
- No cross-site access
- Secure by default

### Sync Security
- Authentication headers preserved
- Token refresh handled
- Failed auth clears queue

## Troubleshooting

### Service Worker Not Registering
1. Check HTTPS (required in production)
2. Verify `/sw.js` is accessible
3. Check browser console for errors
4. Clear cache and reload

### Data Not Syncing
1. Check online status
2. Verify sync queue: `await getPendingSyncItems()`
3. Check retry count
4. Review failed items

### Cache Not Working
1. Verify service worker is active
2. Check cache names match
3. Review TTL settings
4. Check storage quota

### Mobile Layout Issues
1. Test on real devices
2. Check viewport meta tag
3. Verify breakpoints (md: 768px)
4. Test safe area insets

## Future Enhancements

### Planned Features
- [ ] Push notifications for updates
- [ ] File upload queue with progress
- [ ] Advanced cache strategies per route
- [ ] Offline analytics tracking
- [ ] Background sync for large uploads
- [ ] Conflict resolution UI
- [ ] Storage quota management UI
- [ ] Install prompt optimization

### API Considerations
- Background sync API (when Safari supports)
- Periodic background sync
- Web Share Target for evidence
- File System Access API for exports

## Support

For issues or questions:
1. Check browser console for errors
2. Review this documentation
3. Check service worker status in DevTools
4. Test in incognito mode (fresh state)
5. Contact development team

## Related Files

### Core Files
- `/public/sw.js` - Service worker
- `/public/manifest.json` - PWA manifest
- `/lib/pwa/register-service-worker.ts` - SW registration
- `/lib/offline/indexed-db-store.ts` - Offline storage
- `/lib/offline/sync-manager.ts` - Sync logic

### Components
- `/components/mobile/mobile-header.tsx` - Mobile header
- `/components/mobile/bottom-nav.tsx` - Bottom nav
- `/components/ui/offline-indicator.tsx` - Offline status
- `/app/offline/page.tsx` - Offline page

### Hooks & Utilities
- `/lib/hooks/use-offline.ts` - Offline hook
- `/lib/providers/pwa-provider.tsx` - PWA provider

### Layouts
- `/app/dashboard/layout.tsx` - Responsive dashboard
- `/app/layout.tsx` - Root layout with offline indicator
