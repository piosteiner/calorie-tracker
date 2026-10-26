'use strict';

/**
 * sseManager.js
 * Manages Server-Sent Events (SSE) connections and broadcasts data_updated
 * events to the correct user's connected clients.
 *
 * A user may have multiple tabs open simultaneously — all are tracked and notified.
 */

// Map<userId (number), Set<{ res, heartbeatTimer }>>
const clients = new Map();

/**
 * Register a new SSE client response object for a given user.
 * Sends SSE headers and schedules a heartbeat comment every 30 s so that
 * proxies (nginx) and browsers do not treat the connection as idle.
 *
 * @param {number}   userId
 * @param {object}   res     Express response object
 * @returns {Function}       Call to cleanly remove this client
 */
function addClient(userId, res) {
    res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        // Allow the frontend origin configured via CORS — the middleware on the
        // router already handles CORS, but the SSE stream needs explicit headers
        // because we bypass express.json() for this route.
        'X-Accel-Buffering': 'no' // tell nginx not to buffer SSE
    });

    // Send an initial comment so the browser considers the connection open
    res.write(': connected\n\n');

    const heartbeatTimer = setInterval(function () {
        if (!res.writableEnded) {
            res.write(': heartbeat\n\n');
        }
    }, 30000);

    const client = { res, heartbeatTimer };

    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }
    clients.get(userId).add(client);

    // Idempotent: safe to call multiple times (req close + res close may both fire)
    var removed = false;
    return function remove() {
        if (removed) return;
        removed = true;
        clearInterval(heartbeatTimer);
        const userClients = clients.get(userId);
        if (userClients) {
            userClients.delete(client);
            if (userClients.size === 0) {
                clients.delete(userId);
            }
        }
    };
}

/**
 * Send a `data_updated` SSE event to every active connection for the given user.
 *
 * @param {number} userId
 * @param {object} [payload]   Optional data merged into the event payload.
 *                             Keep it minimal — no PII, no sensitive fields.
 */
function notifyUser(userId, payload) {
    const userClients = clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const data = JSON.stringify(
        Object.assign({ type: 'data_updated', ts: Date.now() }, payload || {})
    );
    const message = 'event: data_updated\ndata: ' + data + '\n\n';

    userClients.forEach(function (client) {
        if (!client.res.writableEnded) {
            client.res.write(message);
        }
    });
}

/** Total number of currently connected SSE clients (all users combined). */
function connectionCount() {
    var total = 0;
    clients.forEach(function (set) { total += set.size; });
    return total;
}

module.exports = { addClient, notifyUser, connectionCount };
