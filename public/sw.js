/**
 * Service Worker for EcoComply PWA
 * Enhanced offline support and caching
 * Reference: docs/specs/61_Frontend_Routes_Components.md Section 19-20
 */

const VERSION = '1.0.0';
const CACHE_NAME = `ecocomply-static-v${VERSION}`;
const RUNTIME_CACHE = `ecocomply-runtime-v${VERSION}`;
const IMAGE_CACHE = `ecocomply-images-v${VERSION}`;
const API_CACHE = `ecocomply-api-v${VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/offline',
  '/manifest.json',
];

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  runtime: 50,
  images: 30,
  api: 20,
};

// Cache time to live (in milliseconds)
const CACHE_TTL = {
  api: 5 * 60 * 1000, // 5 minutes
  images: 30 * 24 * 60 * 60 * 1000, // 30 days
  runtime: 24 * 60 * 60 * 1000, // 24 hours
};

// Background sync queue
const SYNC_QUEUE_NAME = 'ecocomply-sync-queue';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('ecocomply-') &&
                     cacheName !== CACHE_NAME &&
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== IMAGE_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      // Claim all clients
      self.clients.claim(),
    ])
  );
});

// Trim cache to max size
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

// Check if cached response is still fresh
function isCacheFresh(response, maxAge) {
  if (!response) return false;
  const cachedDate = response.headers.get('sw-cache-date');
  if (!cachedDate) return false;
  const age = Date.now() - new Date(cachedDate).getTime();
  return age < maxAge;
}

// Add timestamp to cached response
function addCacheDate(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-date', new Date().toISOString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

// Network first strategy (for API calls)
async function networkFirst(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, addCacheDate(response.clone()));
      await trimCache(cacheName, MAX_CACHE_SIZE.api);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached && isCacheFresh(cached, maxAge)) {
      return cached;
    }
    throw error;
  }
}

// Cache first strategy (for static assets)
async function cacheFirst(request, cacheName, maxAge) {
  const cached = await caches.match(request);
  if (cached && isCacheFresh(cached, maxAge)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, addCacheDate(response.clone()));
      await trimCache(cacheName, MAX_CACHE_SIZE.runtime);
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, addCacheDate(response.clone()));
      await trimCache(cacheName, MAX_CACHE_SIZE.images);
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Fetch event - route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for known CDNs)
  if (!url.origin.includes(self.location.origin) &&
      !url.origin.includes('cdn') &&
      !url.origin.includes('fonts.googleapis.com')) {
    return;
  }

  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirst(request, API_CACHE, CACHE_TTL.api)
        .catch(() => {
          return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        })
    );
    return;
  }

  // Images - stale while revalidate
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, CACHE_TTL.images));
    return;
  }

  // Static assets (CSS, JS, fonts) - cache first
  if (url.pathname.match(/\.(css|js|woff2|woff|ttf|eot)$/)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE, CACHE_TTL.runtime));
    return;
  }

  // Navigation requests - network first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline') || new Response('Offline'))
    );
    return;
  }

  // Default - stale while revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, CACHE_TTL.runtime));
});

// Background sync for offline uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncQueuedRequests());
  }
});

async function syncQueuedRequests() {
  // This will be integrated with IndexedDB queue
  console.log('Syncing queued requests...');
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('ecocomply-'))
            .map((name) => caches.delete(name))
        );
      })
    );
  }
});

