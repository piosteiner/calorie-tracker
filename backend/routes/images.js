const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const { body, param, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── Storage ──────────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);
const MAX_SIZE     = 15 * 1024 * 1024; // 15 MB

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename:    (_req, file,  cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${crypto.randomUUID()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits:     { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, AVIF)'));
    }
});

// ── All management routes require JWT ────────────────────────────────────────
router.use(authenticateToken);

// GET / — list all images owned by the user
router.get('/', async (req, res) => {
    try {
        const images = await db.query(
            `SELECT id, filename, original_name, url, type, mime_type, size, created_at
             FROM images WHERE user_id = ? ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, images });
    } catch (err) {
        console.error('List images error:', err);
        res.status(500).json({ error: 'Failed to retrieve images' });
    }
});

// GET /file/:filename — serve an image file (owner only via JWT)
router.get('/file/:filename', [
    param('filename').matches(/^[\w\-]+\.\w{2,6}$/).withMessage('Invalid filename')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid filename' });

    try {
        const rows = await db.query(
            'SELECT * FROM images WHERE filename = ? AND user_id = ?',
            [req.params.filename, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Image not found' });

        const image = rows[0];

        if (image.type === 'url') {
            return res.redirect(302, image.url);
        }

        const filePath = path.join(UPLOAD_DIR, image.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

        res.setHeader('Content-Type', image.mime_type || 'image/jpeg');
        res.setHeader('Cache-Control', 'private, max-age=86400');
        res.sendFile(filePath);
    } catch (err) {
        console.error('Serve image error:', err);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

// POST /upload — upload an image file
router.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    try {
        const { filename, originalname, mimetype, size } = req.file;
        const result = await db.query(
            `INSERT INTO images (user_id, filename, original_name, type, mime_type, size, original_size)
             VALUES (?, ?, ?, 'upload', ?, ?, ?)`,
            [req.user.id, filename, originalname, mimetype, size, size]
        );
        res.status(201).json({
            success: true,
            image: {
                id:            result.insertId,
                filename,
                original_name: originalname,
                type:          'upload',
                mime_type:     mimetype,
                size
            }
        });
    } catch (err) {
        // Clean up orphaned file if DB write failed
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error('Upload image error:', err);
        res.status(500).json({ error: 'Failed to save image' });
    }
});

// POST /url — save an external image by URL
router.post('/url', [
    body('url').isURL({ protocols: ['http', 'https'] }).withMessage('Valid HTTP/HTTPS URL required'),
    body('name').optional().trim().isLength({ max: 200 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    try {
        const { url, name } = req.body;
        const result = await db.query(
            `INSERT INTO images (user_id, filename, original_name, url, type)
             VALUES (?, ?, ?, ?, 'url')`,
            [req.user.id, crypto.randomUUID(), name || url, url]
        );
        res.status(201).json({
            success: true,
            image: {
                id:   result.insertId,
                url,
                type: 'url',
                original_name: name || url
            }
        });
    } catch (err) {
        console.error('Save URL image error:', err);
        res.status(500).json({ error: 'Failed to save image URL' });
    }
});

// PUT /:id — rename an image
router.put('/:id', [
    param('id').isInt({ min: 1 }),
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    try {
        const result = await db.query(
            'UPDATE images SET original_name = ? WHERE id = ? AND user_id = ?',
            [req.body.name, req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Image not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('Rename image error:', err);
        res.status(500).json({ error: 'Failed to rename image' });
    }
});

// DELETE /:id — delete image and its file
router.delete('/:id', [
    param('id').isInt({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    try {
        const rows = await db.query(
            'SELECT * FROM images WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Image not found' });

        const image = rows[0];

        // Detach from any food logs first (FK is ON DELETE SET NULL, but we do it explicitly)
        await db.query('UPDATE food_logs SET image_id = NULL WHERE image_id = ?', [image.id]);
        await db.query('DELETE FROM images WHERE id = ?', [image.id]);

        if (image.type === 'upload') {
            const filePath = path.join(UPLOAD_DIR, image.filename);
            fs.unlink(filePath, () => {});
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Delete image error:', err);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

module.exports = router;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
