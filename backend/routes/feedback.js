// Feedback from visitors: the "F" button at the bottom right (feedback.js in the frontend), as on the
// movies, books and arthistory sites.
//   GET    /api/feedback/form-token   a signed token with the time the panel was opened
//   POST   /api/feedback              { kind, message, email, pageUrl, pageTitle, elements, viewport, token, contact_me_by_fax }
//   GET    /api/feedback              admin: all feedback, newest first
//   PATCH  /api/feedback/:id          admin: { done }
//   DELETE /api/feedback/:id          admin
// Bot protection as on the other sites: a field people never see, the token's age (under 2 s is too fast for a
// person, over 2 h is stale), a message that is mostly links; caught requests get the usual answer.
// Rate limits: 5 an hour per address, 50 a day in all. Kept for a year.
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

const KINDS = ['bug', 'idea', 'content', 'other'];
const FORM_MIN_MS = 2000;
const FORM_MAX_MS = 2 * 60 * 60_000;
const KEEP_DAYS = 365;
const DAILY_MAX = 50;

// the table is created on first use, so a deploy needs no manual migration (same SQL: migrations/create_feedback.sql)
let ready = null;
function ensureTable() {
    ready ||= db.query(`
        CREATE TABLE IF NOT EXISTS feedback (
            id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
            kind       VARCHAR(10)   NOT NULL,
            message    TEXT          NOT NULL,
            email      VARCHAR(200)  NULL,
            page_url   VARCHAR(500)  NULL,
            page_title VARCHAR(200)  NULL,
            elements   JSON          NULL,
            viewport   VARCHAR(20)   NULL,
            user_id    INT           NULL,
            username   VARCHAR(50)   NULL,
            done       TINYINT(1)    NOT NULL DEFAULT 0,
            created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_feedback_created_at (created_at)
        )`).catch((err) => { ready = null; throw err; });
    return ready;
}

const sign = (text) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(text).digest('base64url');
const formToken = () => { const t = String(Date.now()); return `${t}.${sign(`feedback-form.${t}`)}`; };
function formTokenAge(token) {
    const [t, sig] = String(token || '').split('.');
    if (!t || !sig) return null;
    const a = Buffer.from(sig);
    const b = Buffer.from(sign(`feedback-form.${t}`));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return Date.now() - Number(t);
}
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

let caught = 0;
setInterval(() => { if (caught) { console.log(`Feedback bot protection: ${caught} request(s) filtered in the last day`); caught = 0; } }, 86_400_000).unref();

let today = '', todayCount = 0;
const perAddress = rateLimit({
    windowMs: 60 * 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'That was a lot of feedback. Please try again later.' })
});

router.get('/form-token', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const fresh = formToken();
    res.json({ token: fresh });
});

router.post('/', perAddress, optionalAuth, async (req, res) => {
    const b = req.body || {};
    const quietly = () => { caught++; res.status(201).json({ ok: true }); };
    try {
        if (b.contact_me_by_fax) return quietly();
        const age = formTokenAge(b.token);
        if (age == null || age < FORM_MIN_MS || age > FORM_MAX_MS) return quietly();

        const message = String(b.message ?? '').replace(/\r\n/g, '\n').trim().slice(0, 3000);
        if (message.length < 3) return res.status(400).json({ error: 'Please write a few words.' });
        // links are fine in feedback, but a message that is mostly links is spam
        if ((message.match(/https?:\/\//g) || []).length > 3) return quietly();

        const day = new Date().toISOString().slice(0, 10);
        if (day !== today) { today = day; todayCount = 0; }
        if (++todayCount > DAILY_MAX) return res.status(429).json({ error: 'That was a lot of feedback. Please try again later.' });

        const email = clean(b.email, 200);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'That email address doesn’t look right.' });
        }
        // only a path on this site (the page is on another origin than the API)
        const pageUrl = String(b.pageUrl || '').startsWith('/') ? clean(b.pageUrl, 500) : '';
        const elements = (Array.isArray(b.elements) ? b.elements : []).slice(0, 20).map((e) => ({
            selector: String(e?.selector ?? '').slice(0, 400), what: clean(e?.what, 40), text: clean(e?.text, 200), title: clean(e?.title, 200)
        })).filter((e) => e.selector);

        await ensureTable();
        await db.query(
            `INSERT INTO feedback (kind, message, email, page_url, page_title, elements, viewport, user_id, username)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [KINDS.includes(b.kind) ? b.kind : 'other', message, email || null, pageUrl || null, clean(b.pageTitle, 200) || null,
             JSON.stringify(elements), clean(b.viewport, 20) || null, req.user?.id || null, req.user?.username || null]
        );
        // a year is enough
        db.query('DELETE FROM feedback WHERE created_at < NOW() - INTERVAL ? DAY', [KEEP_DAYS]).catch(() => {});
        res.status(201).json({ ok: true });
    } catch (err) {
        console.error('POST /api/feedback error:', err);
        res.status(500).json({ error: 'Sending failed. Please try again.' });
    }
});

// ---------- admin ----------

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await ensureTable();
        const rows = await db.query('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 500');
        res.json({
            success: true,
            feedback: rows.map((r) => ({
                ...r,
                done: !!r.done,
                elements: typeof r.elements === 'string' ? JSON.parse(r.elements || '[]') : (r.elements || [])
            }))
        });
    } catch (err) {
        console.error('GET /api/feedback error:', err);
        res.status(500).json({ error: 'Could not load feedback' });
    }
});

router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await ensureTable();
        const r = await db.query('UPDATE feedback SET done = ? WHERE id = ?', [req.body?.done ? 1 : 0, Number(req.params.id)]);
        if (!r.affectedRows) return res.status(404).json({ error: 'No such feedback' });
        res.json({ success: true });
    } catch (err) {
        console.error('PATCH /api/feedback error:', err);
        res.status(500).json({ error: 'Could not update feedback' });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await ensureTable();
        await db.query('DELETE FROM feedback WHERE id = ?', [Number(req.params.id)]);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/feedback error:', err);
        res.status(500).json({ error: 'Could not delete feedback' });
    }
});

module.exports = router;
