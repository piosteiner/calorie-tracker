'use strict';

/**
 * routes/sync.js
 * SSE-based live sync endpoint.
 *
 * Flow (prevents JWT appearing in nginx access logs):
 *   1. Client POSTs  /api/sync/ticket   with Authorization: Bearer <jwt>
 *      → receives a random, single-use, 30-second ticket string
 *   2. Client opens  EventSource('/api/sync/events?ticket=<ticket>')
 *      → ticket is verified, immediately deleted, SSE stream begins
 */

const express  = require('express');
const crypto   = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const sseManager = require('../services/sseManager');

const router = express.Router();

// In-memory ticket store: Map<ticket, { userId, expiresAt }>
// Single-use, 30-second TTL.  Fine for single-instance deployments.
const ticketStore = new Map();
const TICKET_TTL = 30 * 1000; // ms

/**
 * POST /api/sync/ticket
 * Requires the standard Authorization: Bearer <jwt> header.
 * Returns a short-lived, single-use ticket the client can pass to EventSource.
 */
router.post('/ticket', authenticateToken, function (req, res) {
    const ticket = crypto.randomBytes(32).toString('hex');
    ticketStore.set(ticket, {
        userId:    req.user.id,
        expiresAt: Date.now() + TICKET_TTL
    });

    // Auto-expire if the client never connects
    setTimeout(function () { ticketStore.delete(ticket); }, TICKET_TTL);

    res.json({ ticket });
});

/**
 * GET /api/sync/events?ticket=<ticket>
 * Redeems the one-time ticket and begins streaming SSE events.
 */
router.get('/events', function (req, res) {
    const ticket = req.query.ticket;

    if (!ticket) {
        return res.status(401).json({ error: 'Sync ticket required' });
    }

    // Redeem immediately — single use regardless of outcome
    const entry = ticketStore.get(ticket);
    ticketStore.delete(ticket);

    if (!entry || Date.now() > entry.expiresAt) {
        return res.status(401).json({ error: 'Invalid or expired sync ticket' });
    }

    // All auth complete — upgrade to SSE stream
    const remove = sseManager.addClient(entry.userId, res);

    // Wire both events so cleanup fires on clean close AND abrupt TCP drop
    req.on('close', remove);
    res.on('close', remove);
});

module.exports = router;
