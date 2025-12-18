# Quick Start: Mobile & Offline Features

## Getting Started

### 1. Test PWA Installation

**Desktop:**
1. Open Chrome/Edge
2. Click install icon in address bar
3. Or: Menu → Install EcoComply

**Mobile:**
1. Open in Safari (iOS) or Chrome (Android)
2. Add to Home Screen
3. Launch from home screen

### 2. Test Offline Mode

```javascript
// In browser console
navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls: ['/dashboard'] });

// Then go offline
// Network tab → Throttling → Offline
// Or Settings → Turn off WiFi
```

### 3. Using the Offline Hook

```typescript
import { useOffline } from '@/lib/hooks/use-offline';

function MyComponent() {
  const { isOffline, pendingCount, queueRequest } = useOffline();

  if (isOffline) {
    return <div>You are offline. {pendingCount} items pending sync.</div>;
  }

  return <div>Online and ready!</div>;
}
```

### 4. Queue Offline Requests

```typescript
import { useOffline } from '@/lib/hooks/use-offline';
import { toast } from 'sonner';

function UploadForm() {
  const { isOffline, queueRequest } = useOffline();

  const handleSubmit = async (data) => {
    if (isOffline) {
      // Queue for later
      await queueRequest('/api/evidence', 'POST', data);
      toast.success('Saved offline. Will sync when connected.');
    } else {
      // Send now
      await fetch('/api/evidence', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast.success('Uploaded successfully!');
    }
  };
}
```

### 5. Store Data for Offline Access

```typescript
import { saveObligations, getObligations } from '@/lib/offline';

// When fetching data (while online)
const fetchObligations = async () => {
  const response = await fetch('/api/obligations');
  const data = await response.json();

  // Save for offline access
  await saveObligations(data);

  return data;
};

// When loading data (works offline)
const loadObligations = async () => {
  // Try network first
  if (navigator.onLine) {
    try {
      return await fetchObligations();
    } catch (error) {
      // Fall back to offline data
    }
  }

  // Load from offline storage
  return await getObligations();
};
```

## Mobile Components

### Mobile Header

Automatically shown on mobile devices:
- Hamburger menu
- Search button
- Notifications
- User avatar

### Bottom Navigation

Fixed navigation bar with:
- Dashboard
- Obligations
- Evidence
- Notifications
- Settings

## Testing Checklist

### PWA Features
- [ ] Install app on mobile device
- [ ] Install app on desktop
- [ ] App opens in standalone mode
- [ ] App icon shows on home screen
- [ ] Theme color matches brand

### Offline Features
- [ ] App works when offline
- [ ] Cached pages load
- [ ] Offline indicator shows
- [ ] Data syncs when back online
- [ ] Queued requests send successfully

### Mobile UI
- [ ] Bottom navigation works
- [ ] Mobile header shows
- [ ] Desktop sidebar hidden on mobile
- [ ] Touch targets are 44px minimum
- [ ] Safe area insets respected

### Service Worker
- [ ] Service worker registers
- [ ] Caching strategies work
- [ ] Update notifications show
- [ ] Old caches cleaned up
- [ ] Background sync triggers

## Common Issues

### Service Worker Not Updating

```javascript
// Force update
navigator.serviceWorker.getRegistration().then(reg => {
  reg.update();
});

// Or unregister and refresh
navigator.serviceWorker.getRegistration().then(reg => {
  reg.unregister().then(() => window.location.reload());
});
```

### Clear All Offline Data

```javascript
// Clear IndexedDB
indexedDB.deleteDatabase('ecocomply-offline');

// Clear all caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// Then reload
window.location.reload();
```

### Check Sync Queue

```javascript
import { getPendingSyncItems } from '@/lib/offline';

const pending = await getPendingSyncItems();
console.log(`${pending.length} items in queue:`, pending);
```

### Manual Sync

```javascript
import { syncManager } from '@/lib/offline';

// Sync everything
await syncManager.syncAll();

// Or sync specific data
await syncManager.syncObligations();
await syncManager.syncEvidence();
```

## Development Tips

### 1. Always Test Offline
- Use Chrome DevTools Network → Offline
- Test on real mobile devices with airplane mode
- Verify all critical flows work offline

### 2. Cache Important Data
```typescript
// After fetching important data
import { cacheUrls } from '@/lib/pwa/register-service-worker';

await cacheUrls([
  '/dashboard',
  '/api/obligations',
  '/api/sites',
]);
```

### 3. Show Offline Status
```typescript
import { useOffline } from '@/lib/hooks/use-offline';

function StatusIndicator() {
  const { isOffline, pendingCount } = useOffline();

  return (
    <div>
      {isOffline && (
        <Badge variant="warning">
          Offline • {pendingCount} pending
        </Badge>
      )}
    </div>
  );
}
```

### 4. Handle Sync Failures
```typescript
// Listen for sync failures
window.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-queue') {
    const pending = await getPendingSyncItems();
    const failed = pending.filter(item => item.status === 'failed');

    if (failed.length > 0) {
      toast.error(`${failed.length} items failed to sync`);
    }
  }
});
```

## Performance Tips

### 1. Lazy Load Mobile Components
```typescript
const BottomNav = dynamic(() => import('@/components/mobile/bottom-nav'), {
  ssr: false,
});
```

### 2. Optimize Cache Sizes
```javascript
// In sw.js
const MAX_CACHE_SIZE = {
  runtime: 50,   // Adjust based on usage
  images: 30,    // Keep recent images
  api: 20,       // Recent API responses
};
```

### 3. Use Appropriate TTL
```javascript
const CACHE_TTL = {
  api: 5 * 60 * 1000,                    // 5 minutes
  images: 30 * 24 * 60 * 60 * 1000,     // 30 days
  runtime: 24 * 60 * 60 * 1000,          // 24 hours
};
```

## Resources

- [MDN: Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Full Documentation](./MOBILE_OFFLINE_SUPPORT.md)

## Need Help?

1. Check browser console for errors
2. Review service worker status in DevTools
3. Test in incognito mode (clean state)
4. Review full documentation
5. Contact development team
