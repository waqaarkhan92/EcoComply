# Mobile & Offline Testing Checklist

## Pre-Deployment Testing

### 1. Service Worker Registration
- [ ] Service worker registers successfully (check DevTools → Application → Service Workers)
- [ ] Service worker activates (status: "activated")
- [ ] Service worker controls the page (shows "controlling")
- [ ] Update checks run automatically
- [ ] Update notification appears when new version available
- [ ] Skip waiting works (clicking update reloads page)
- [ ] No console errors during registration

### 2. PWA Manifest
- [ ] Manifest.json loads correctly (no 404)
- [ ] Manifest validates (use https://manifest-validator.appspot.com/)
- [ ] Icons load correctly (192x192 and 512x512)
- [ ] Theme color displays in browser chrome
- [ ] Name and description are correct
- [ ] Shortcuts are configured
- [ ] Share target is configured (if supported)

### 3. PWA Installation - Desktop
- [ ] Install icon appears in Chrome address bar
- [ ] Install icon appears in Edge address bar
- [ ] "Install EcoComply" option in browser menu
- [ ] Installation completes successfully
- [ ] App opens in standalone window
- [ ] App icon shows in taskbar/dock
- [ ] App can be uninstalled
- [ ] Reinstallation works

### 4. PWA Installation - Mobile (iOS)
- [ ] Safari: "Add to Home Screen" available
- [ ] Icon appears on home screen
- [ ] App name displays correctly under icon
- [ ] Tapping icon opens app
- [ ] App opens in standalone mode (no browser UI)
- [ ] Status bar color matches theme
- [ ] App can be deleted from home screen

### 5. PWA Installation - Mobile (Android)
- [ ] Chrome: "Install app" prompt appears
- [ ] Install banner shows (if criteria met)
- [ ] Installation completes
- [ ] Icon appears on home screen
- [ ] App opens in standalone mode
- [ ] Splash screen displays
- [ ] App can be uninstalled

### 6. Offline Functionality - Basic
- [ ] Go offline (airplane mode or DevTools)
- [ ] Dashboard loads from cache
- [ ] Offline indicator appears
- [ ] Cached pages navigate successfully
- [ ] Images load from cache
- [ ] Fonts load correctly
- [ ] Styles apply correctly
- [ ] Previously visited pages work

### 7. Offline Functionality - Data
- [ ] View cached obligations while offline
- [ ] View cached evidence while offline
- [ ] View cached user data while offline
- [ ] Create new item offline (queues for sync)
- [ ] Edit item offline (queues for sync)
- [ ] Offline indicator shows pending count
- [ ] Data persists across page reloads

### 8. Offline Functionality - Sync
- [ ] Go back online
- [ ] Sync starts automatically
- [ ] Sync indicator shows "Syncing..."
- [ ] Pending count decreases
- [ ] All items sync successfully
- [ ] Sync indicator disappears
- [ ] Synced data appears on server
- [ ] No duplicate items created

### 9. Offline Functionality - Error Handling
- [ ] Failed sync items marked as failed
- [ ] Retry logic works (up to 3 attempts)
- [ ] User notified of sync failures
- [ ] Failed items can be retried manually
- [ ] Navigation to uncached page shows offline page
- [ ] Offline page has retry button
- [ ] Offline page has navigation options

### 10. Mobile UI - Layout
- [ ] Mobile header shows on small screens (<768px)
- [ ] Desktop header shows on large screens (≥768px)
- [ ] Bottom navigation shows on mobile only
- [ ] Sidebar hidden on mobile
- [ ] Mobile sidebar accessible via hamburger
- [ ] Content padding correct on mobile
- [ ] Content margin for headers correct
- [ ] No horizontal scroll on mobile

### 11. Mobile UI - Mobile Header
- [ ] Hamburger icon visible and clickable
- [ ] Company name/logo displays
- [ ] Search button opens command palette
- [ ] Notification bell shows count
- [ ] Notification bell clickable
- [ ] User avatar displays correctly
- [ ] All touch targets minimum 44px
- [ ] Header fixed at top

### 12. Mobile UI - Bottom Navigation
- [ ] Fixed at bottom of screen
- [ ] All 5 nav items visible
- [ ] Icons display correctly
- [ ] Labels display correctly
- [ ] Active state highlights current page
- [ ] Navigation works (changes pages)
- [ ] Touch targets minimum 44px
- [ ] Safe area insets respected
- [ ] Doesn't obstruct content

### 13. Mobile UI - Mobile Sidebar
- [ ] Opens when hamburger clicked
- [ ] Slides in from left
- [ ] Shows all navigation items
- [ ] Active state highlights current page
- [ ] Close button works
- [ ] Closes on backdrop click
- [ ] Closes on navigation
- [ ] Smooth animations
- [ ] Doesn't block interaction when closed

### 14. Offline Indicator
- [ ] Shows when going offline
- [ ] Shows "You are offline" message
- [ ] Shows pending sync count
- [ ] Updates count in real-time
- [ ] Shows "Syncing..." when syncing
- [ ] Shows "Back online" when reconnected
- [ ] Auto-hides after 3 seconds when online
- [ ] Positioned correctly (not blocking content)
- [ ] ARIA live region works (screen reader announces)

### 15. Caching - Static Assets
- [ ] CSS files cached
- [ ] JavaScript files cached
- [ ] Font files cached
- [ ] Favicon cached
- [ ] Cache size limits enforced (max 50 items)
- [ ] Old items removed when limit reached
- [ ] TTL enforced (24 hours)
- [ ] Stale items refreshed

### 16. Caching - Images
- [ ] PNG images cached
- [ ] JPG images cached
- [ ] SVG images cached
- [ ] WebP images cached
- [ ] Cache size limits enforced (max 30 items)
- [ ] Stale-while-revalidate strategy works
- [ ] Images update in background
- [ ] TTL enforced (30 days)

### 17. Caching - API Responses
- [ ] API responses cached
- [ ] Network-first strategy works
- [ ] Falls back to cache when offline
- [ ] Cache size limits enforced (max 20 items)
- [ ] TTL enforced (5 minutes)
- [ ] Stale data refreshed when online
- [ ] Failed requests return 503 offline

### 18. IndexedDB Storage
- [ ] Database creates successfully
- [ ] All object stores created
- [ ] Indexes work correctly
- [ ] Data persists across sessions
- [ ] Storage quota respected
- [ ] Can store user data
- [ ] Can store obligations
- [ ] Can store evidence
- [ ] Can store sync queue items
- [ ] Can query by indexes

### 19. Sync Queue
- [ ] Items added to queue when offline
- [ ] Queue persists across page reloads
- [ ] Items processed in order
- [ ] Retry logic works
- [ ] Failed items marked correctly
- [ ] Synced items removed from queue
- [ ] Background sync registers (Chrome/Edge)
- [ ] Manual sync trigger works

### 20. Performance
- [ ] Service worker loads quickly (<100ms)
- [ ] Cache lookups fast (<50ms)
- [ ] IndexedDB operations fast (<100ms)
- [ ] No blocking on main thread
- [ ] Smooth animations (60fps)
- [ ] No jank when syncing
- [ ] Memory usage reasonable (<50MB)
- [ ] Storage usage reasonable (<30MB)

### 21. Accessibility
- [ ] Offline indicator announced by screen reader
- [ ] Mobile navigation keyboard accessible
- [ ] Focus management correct
- [ ] Skip links work
- [ ] Color contrast sufficient
- [ ] Touch targets meet WCAG (44px)
- [ ] All interactive elements labeled
- [ ] ARIA attributes correct

### 22. Cross-Browser Testing
#### Chrome
- [ ] All features work
- [ ] Background sync works
- [ ] PWA install works
- [ ] Offline mode works

#### Firefox
- [ ] All features work
- [ ] PWA install works (Android)
- [ ] Offline mode works
- [ ] Background sync fallback works

#### Safari (iOS)
- [ ] All features work
- [ ] Add to home screen works
- [ ] Standalone mode works
- [ ] Offline mode works
- [ ] Background sync fallback works

#### Safari (macOS)
- [ ] All features work
- [ ] PWA install works
- [ ] Offline mode works

#### Edge
- [ ] All features work
- [ ] Background sync works
- [ ] PWA install works
- [ ] Offline mode works

### 23. Device Testing
#### Mobile Phone (Portrait)
- [ ] Layout correct
- [ ] Bottom nav visible
- [ ] Content not obscured
- [ ] Touch targets adequate
- [ ] Scrolling smooth

#### Mobile Phone (Landscape)
- [ ] Layout adapts
- [ ] Bottom nav visible
- [ ] Content accessible
- [ ] No horizontal scroll

#### Tablet (Portrait)
- [ ] Layout correct
- [ ] May show desktop or mobile UI
- [ ] All features accessible

#### Tablet (Landscape)
- [ ] Desktop UI likely shows
- [ ] Layout correct
- [ ] All features work

#### Desktop
- [ ] Desktop UI shows
- [ ] No mobile components visible
- [ ] Sidebar visible
- [ ] Desktop header shows

### 24. Network Conditions
- [ ] Works on WiFi
- [ ] Works on 4G/5G
- [ ] Works on 3G (slow)
- [ ] Works on 2G (very slow)
- [ ] Handles connection drops
- [ ] Handles intermittent connectivity
- [ ] Handles slow networks (shows loading states)

### 25. Edge Cases
- [ ] Storage quota exceeded (handles gracefully)
- [ ] IndexedDB unavailable (fallback)
- [ ] Service worker registration fails (app still works)
- [ ] Multiple tabs open (syncs across tabs)
- [ ] App updated while offline (updates on reconnect)
- [ ] Large data sync (handles without timeout)
- [ ] Concurrent operations (no race conditions)
- [ ] Browser back/forward works
- [ ] Page refresh preserves state

### 26. Security
- [ ] HTTPS enforced in production
- [ ] No sensitive data in service worker
- [ ] Auth tokens not exposed in cache
- [ ] IndexedDB origin-isolated
- [ ] No cross-site data access
- [ ] CSP headers allow service worker
- [ ] No mixed content warnings

### 27. Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] Component documentation complete
- [ ] Code comments adequate
- [ ] Examples provided
- [ ] Troubleshooting guide available
- [ ] Migration guide (if needed)

### 28. Monitoring & Analytics
- [ ] Service worker registration tracked
- [ ] Offline events logged
- [ ] Sync success/failure tracked
- [ ] Cache hit/miss ratio tracked
- [ ] Storage quota usage monitored
- [ ] Error logging configured
- [ ] Performance metrics tracked

## Post-Deployment Checks

### Week 1
- [ ] Monitor service worker registration rate
- [ ] Check for errors in production logs
- [ ] Review sync failure rate
- [ ] Check storage quota usage
- [ ] Review user feedback
- [ ] Monitor cache performance
- [ ] Check PWA install rate

### Week 2
- [ ] Review analytics data
- [ ] Check for edge cases in logs
- [ ] Optimize cache sizes if needed
- [ ] Adjust TTL values if needed
- [ ] Address any reported issues
- [ ] Update documentation as needed

### Month 1
- [ ] Performance review
- [ ] User satisfaction survey
- [ ] Feature usage analysis
- [ ] Optimization opportunities
- [ ] Plan enhancements
- [ ] Update roadmap

## Notes

- Test on real devices, not just emulators
- Test with real network conditions
- Test with actual user data volumes
- Test all critical user flows
- Document any issues found
- Retest after fixes

## Sign-off

- [ ] All critical tests passed
- [ ] All blockers resolved
- [ ] Documentation complete
- [ ] Team approval obtained
- [ ] Ready for production deployment

---

**Tested by:** _________________
**Date:** _________________
**Notes:** _________________
