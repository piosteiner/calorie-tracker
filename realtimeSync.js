/**
 * realtimeSync.js
 * Live cross-device data synchronisation for Calorie Tracker.
 *
 * Strategy (in priority order):
 *   1. Server-Sent Events (SSE) at /sync/events  — zero latency server push
 *   2. Polling every POLL_INTERVAL ms             — works without SSE backend support
 *
 * The Page Visibility API is used to pause activity while the tab is hidden
 * and resume (with an immediate refresh) when the user returns.
 */
(function () {
    'use strict';

    var POLL_INTERVAL   = 15000;   // ms between poll ticks when tab is visible
    var SSE_RETRY_DELAY = 10000;   // ms before retrying SSE after a transient error
    var DEBOUNCE_DELAY  = 1500;    // ms to debounce rapid back-to-back update events

    function RealtimeSync() {
        this._callbacks    = [];
        this._eventSource  = null;
        this._pollTimer    = null;
        this._authToken    = null;
        this._fetchData    = null;   // async fn that returns a comparable snapshot string
        this._useSse       = true;   // try SSE first; reset to false after first failure
        this._running      = false;
        this._lastSnapshot = null;
        this._debounceTimer = null;
        this._sseOpenTime  = 0;
        this._visHandler   = this._onVisibilityChange.bind(this);
    }

    /**
     * Start live sync.
     *
     * @param {string}   authToken  JWT bearer token for the current session
     * @param {Function} fetchData  Async function that returns a snapshot string used
     *                              for polling-based change detection.  It should be
     *                              lightweight (e.g. return JSON.stringify of today's logs).
     */
    RealtimeSync.prototype.start = function (authToken, fetchData) {
        if (this._running) this.stop();
        this._authToken    = authToken;
        this._fetchData    = fetchData;
        this._useSse       = true;
        this._running      = true;
        this._lastSnapshot = null;
        document.addEventListener('visibilitychange', this._visHandler);
        this._connect();
    };

    /** Stop all sync activity and release resources. */
    RealtimeSync.prototype.stop = function () {
        this._running = false;
        this._clearPoll();
        this._closeSSE();
        clearTimeout(this._debounceTimer);
        document.removeEventListener('visibilitychange', this._visHandler);
    };

    /**
     * Register a callback invoked when remote data has changed.
     * @param   {Function} fn  Called with an event object describing the change.
     * @returns {Function}     Call to unsubscribe.
     */
    RealtimeSync.prototype.onUpdate = function (fn) {
        this._callbacks.push(fn);
        var self = this;
        return function () {
            self._callbacks = self._callbacks.filter(function (cb) { return cb !== fn; });
        };
    };

    // ── Private helpers ──────────────────────────────────────────────────────

    RealtimeSync.prototype._notify = function (evt) {
        var self = this;
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(function () {
            self._callbacks.forEach(function (fn) {
                try { fn(evt); } catch (_) {}
            });
        }, DEBOUNCE_DELAY);
    };

    RealtimeSync.prototype._connect = function () {
        if (!this._running || document.visibilityState === 'hidden') return;
        if (this._useSse && typeof EventSource !== 'undefined') {
            this._connectSSE();
        } else {
            this._startPolling();
        }
    };

    RealtimeSync.prototype._connectSSE = function () {
        this._closeSSE();
        if (!this._authToken) { this._startPolling(); return; }

        var base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '';
        var url  = base + '/sync/events?token=' + encodeURIComponent(this._authToken);

        var es;
        try { es = new EventSource(url); }
        catch (_) { this._useSse = false; this._startPolling(); return; }

        this._eventSource = es;
        this._sseOpenTime = Date.now();
        var self = this;

        // Named event emitted by the backend when any data changes
        es.addEventListener('data_updated', function (e) {
            var parsed;
            try { parsed = JSON.parse(e.data); } catch (_) { parsed = {}; }
            self._notify(parsed);
        });

        // Generic message fallback (some backends emit 'message' events)
        es.onmessage = function (e) {
            var parsed;
            try { parsed = JSON.parse(e.data); } catch (_) { parsed = {}; }
            self._notify(parsed);
        };

        es.onerror = function () {
            var elapsed = Date.now() - self._sseOpenTime;
            self._closeSSE();
            if (!self._running) return;

            // If the connection never established (< 3 s), SSE likely not supported —
            // fall back to polling permanently for this session.
            if (elapsed < 3000) {
                self._useSse = false;
                self._startPolling();
            } else {
                // Transient network error — retry SSE after a delay
                setTimeout(function () {
                    if (self._running) self._connectSSE();
                }, SSE_RETRY_DELAY);
            }
        };
    };

    RealtimeSync.prototype._closeSSE = function () {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
    };

    RealtimeSync.prototype._startPolling = function () {
        this._clearPoll();
        if (!this._running || document.visibilityState === 'hidden') return;
        this._poll();
        var self = this;
        this._pollTimer = setInterval(function () { self._poll(); }, POLL_INTERVAL);
    };

    RealtimeSync.prototype._clearPoll = function () {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
        }
    };

    RealtimeSync.prototype._poll = async function () {
        if (!this._running || !this._fetchData) return;
        try {
            var snapshot = await this._fetchData();
            if (this._lastSnapshot !== null && snapshot !== this._lastSnapshot) {
                this._notify({ type: 'poll_update' });
            }
            this._lastSnapshot = snapshot;
        } catch (_) {
            // Server temporarily unavailable — silently ignore, will retry next tick
        }
    };

    RealtimeSync.prototype._onVisibilityChange = function () {
        if (document.visibilityState === 'visible') {
            // User returned to the tab — reconnect and refresh immediately
            this._connect();
        } else {
            // Tab hidden — conserve resources
            this._clearPoll();
            this._closeSSE();
        }
    };

    // ── Expose singleton globally ────────────────────────────────────────────
    window.RealtimeSync  = RealtimeSync;
    window.realtimeSync  = new RealtimeSync();

}());
