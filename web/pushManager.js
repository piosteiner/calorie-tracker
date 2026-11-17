/**
 * pushManager.js
 * Manages PWA push-notification subscriptions for Calorie Tracker.
 *
 * Usage (called from script.js after login):
 *   await pushManager.init(authToken);
 *
 * The module exposes:
 *   pushManager.isSupported()          – true if browser can do push
 *   pushManager.getPermission()        – 'granted' | 'denied' | 'default'
 *   pushManager.isSubscribed           – boolean
 *   pushManager.subscribe(authToken)   – request permission + subscribe
 *   pushManager.unsubscribe(authToken) – unsubscribe + remove from server
 *   pushManager.init(authToken)        – re-attaches an existing sub or does nothing
 */
(function () {
    'use strict';

    // Helpers ─────────────────────────────────────────────────────────────────

    /** Convert a base64url string to a Uint8Array (for applicationServerKey). */
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw     = atob(base64);
        return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
    }

    function apiBase() {
        return (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '';
    }

    async function sendToServer(method, subscription, authToken) {
        const res = await fetch(apiBase() + '/push/subscription', {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken,
            },
            body: JSON.stringify({ subscription }),
        });
        if (!res.ok) throw new Error('Server responded ' + res.status);
    }

    // PushManager object ──────────────────────────────────────────────────────

    var mgr = {
        isSubscribed: false,
        _swReg: null,

        isSupported: function () {
            return 'serviceWorker' in navigator &&
                   'PushManager'   in window     &&
                   'Notification'  in window;
        },

        getPermission: function () {
            return Notification.permission;
        },

        /**
         * Called once after login.  Re-associates any existing subscription with
         * the current auth token so the server has the latest endpoint mapping.
         */
        init: async function (authToken) {
            if (!this.isSupported()) return;
            try {
                this._swReg = await navigator.serviceWorker.ready;
                const existing = await this._swReg.pushManager.getSubscription();
                if (existing) {
                    this.isSubscribed = true;
                    // Re-send to server in case the token changed (e.g. re-login)
                    await sendToServer('POST', existing.toJSON(), authToken).catch(() => {});
                }
            } catch (_) {}
        },

        /**
         * Request notification permission and create a push subscription.
         * Sends the subscription endpoint to the backend.
         */
        subscribe: async function (authToken) {
            if (!this.isSupported()) throw new Error('Push not supported in this browser.');

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') throw new Error('Notification permission denied.');

            const vapidKey = (typeof CONFIG !== 'undefined') ? CONFIG.VAPID_PUBLIC_KEY : null;
            if (!vapidKey) throw new Error('VAPID public key not configured (CONFIG.VAPID_PUBLIC_KEY).');

            this._swReg = await navigator.serviceWorker.ready;

            const subscription = await this._swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });

            await sendToServer('POST', subscription.toJSON(), authToken);
            this.isSubscribed = true;
            return subscription;
        },

        /**
         * Cancel the push subscription and notify the server to remove it.
         */
        unsubscribe: async function (authToken) {
            if (!this.isSupported()) return;
            try {
                this._swReg = this._swReg || await navigator.serviceWorker.ready;
                const sub = await this._swReg.pushManager.getSubscription();
                if (sub) {
                    await sendToServer('DELETE', sub.toJSON(), authToken).catch(() => {});
                    await sub.unsubscribe();
                }
            } catch (_) {}
            this.isSubscribed = false;
        },
    };

    window.pushManager = mgr;
}());
