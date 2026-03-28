/**
 * sw.js — Service Worker for Calorie Tracker PWA
 *
 * Responsibilities:
 *   1. Receive push events from the backend and show notifications.
 *   2. Handle notification clicks (focus app tab or open a new one).
 *   3. Serve a minimal offline fallback so the install prompt works.
 */

const CACHE_NAME = 'caltracker-v1';
const OFFLINE_URLS = ['/', '/index.html', '/styles.css', '/script.js', '/config.js', '/logger.js', '/validators.js', '/themeToggle.js', '/realtimeSync.js'];

// ── Install: pre-cache shell assets ─────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS).catch(() => {}))
    );
    self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ── Fetch: network-first, offline fallback for navigation ───────────────────
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request).catch(() =>
            caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
        )
    );
});

// ── Push: show notification ──────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (_) {}

    const title   = data.title   || '🍎 Calorie Tracker';
    const body    = data.body    || 'You have a new update.';
    const tag     = data.tag     || 'caltracker-default';
    const url     = data.url     || '/';
    const icon    = data.icon    || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍎</text></svg>";
    const badge   = data.badge   || icon;

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge,
            tag,
            data: { url },
            renotify: !!data.renotify,
            requireInteraction: !!data.requireInteraction,
        })
    );
});

// ── Notification click: focus or open the app ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Focus an existing app tab if one is open
            for (const client of clients) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            return self.clients.openWindow(targetUrl);
        })
    );
});
