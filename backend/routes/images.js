const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Uploads directory for images
const uploadsDir = path.join(__dirname, '../uploads/images');

// Ensure uploads/images directory exists
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// GET /api/images/file/:filename — serve an image file (no auth required)
// Filenames are opaque SHA hashes so public access is safe
router.get('/file/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // Prevent path traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ success: false, error: { message: 'Invalid filename' } });
        }

        // Look up the image record (no user restriction)
        const rows = await db.query(
            'SELECT * FROM images WHERE filename = ?',
            [filename]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: { message: 'Image not found' } });
        }

        const filePath = path.join(uploadsDir, filename);
        if (!fsSync.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: { message: 'Image file not found' } });
        }

        res.setHeader('Content-Type', rows[0].mime_type || 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.sendFile(filePath);
    } catch (error) {
        console.error('Serve image error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to serve image' } });
    }
});

// All routes below require authentication
router.use(authenticateToken);

// Multer configuration for temporary storage
const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
        const uniqueName = crypto.randomBytes(16).toString('hex') + '_temp' + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }, // 10MB default
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG, JPG, GIF, and WebP are allowed.'));
        }
    }
});

// Maximum dimensions and post-conversion size cap for stored images
const MAX_DIMENSION = parseInt(process.env.MAX_IMAGE_DIMENSION) || 1920; // px (longest edge)
const MAX_STORED_BYTES = parseInt(process.env.MAX_STORED_IMAGE_SIZE) || 500 * 1024; // 500 KB

// Convert image to WebP format, auto-shrinking quality until it fits under MAX_STORED_BYTES
async function convertToWebP(inputPath, originalName) {
    const webpFilename = crypto.randomBytes(16).toString('hex') + '.webp';
    const webpPath = path.join(uploadsDir, webpFilename);

    try {
        let quality = 85;
        let info;

        // Iteratively reduce quality until the output is within the size cap
        while (quality >= 20) {
            info = await sharp(inputPath)
                .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality, effort: 6, lossless: false })
                .toFile(webpPath);

            if (info.size <= MAX_STORED_BYTES) break;

            quality -= 10;
            // Remove the oversized attempt before retrying
            await fs.unlink(webpPath).catch(() => {});
        }

        // If still too large at minimum quality, reduce dimensions and try once more
        if (info.size > MAX_STORED_BYTES) {
            const reducedDim = Math.round(MAX_DIMENSION * 0.6); // 60% of max dimension
            info = await sharp(inputPath)
                .resize(reducedDim, reducedDim, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 20, effort: 6, lossless: false })
                .toFile(webpPath);
        }

        await fs.unlink(inputPath);

        console.log(`Image converted to WebP: ${originalName} → ${(info.size / 1024).toFixed(2)} KB`);

        return {
            filename: webpFilename,
            path: webpPath,
            size: info.size,
            mimeType: 'image/webp'
        };
    } catch (error) {
        console.error('WebP conversion failed, keeping original:', error);
        const fallbackFilename = crypto.randomBytes(16).toString('hex') + path.extname(originalName);
        const fallbackPath = path.join(uploadsDir, fallbackFilename);
        await fs.rename(inputPath, fallbackPath);

        const stats = await fs.stat(fallbackPath);
        return {
            filename: fallbackFilename,
            path: fallbackPath,
            size: stats.size,
            mimeType: 'image/' + path.extname(originalName).slice(1).toLowerCase()
        };
    }
}

// GET /api/images — list all images for the authenticated user
router.get('/', async (req, res) => {
    try {
        const images = await db.getUserImages(req.user.id);
        res.json({ success: true, data: { images } });
    } catch (error) {
        console.error('Get images error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to retrieve images' } });
    }
});

// POST /api/images/upload — upload an image file
router.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
    }

    try {
        const tempPath = path.join(uploadsDir, req.file.filename);
        const converted = await convertToWebP(tempPath, req.file.originalname);

        const imageRecord = await db.addImage(req.user.id, {
            filename: converted.filename,
            original_name: req.file.originalname,
            url: `/api/images/file/${converted.filename}`,
            type: 'uploaded',
            mime_type: converted.mimeType,
            size: converted.size,
            original_size: req.file.size
        });

        console.log(`Image uploaded by user ${req.user.id}: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB → ${(converted.size / 1024).toFixed(2)} KB)`);

        res.status(201).json({ success: true, data: imageRecord });
    } catch (error) {
        console.error('Image upload error:', error);
        // Clean up temp file on error
        try { await fs.unlink(path.join(uploadsDir, req.file.filename)); } catch (_) {}
        res.status(500).json({ success: false, error: { message: 'Failed to process uploaded image' } });
    }
});

// POST /api/images/url — save an image by external URL
router.post('/url', async (req, res) => {
    try {
        const { url, name } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: { message: 'url is required' } });
        }

        // Basic URL validation — must be http/https
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({ success: false, error: { message: 'Only http and https URLs are allowed' } });
        }

        const imageRecord = await db.addImage(req.user.id, {
            original_name: name || 'External Image',
            url,
            type: 'url'
        });

        res.status(201).json({ success: true, data: imageRecord });
    } catch (error) {
        if (error instanceof TypeError) {
            return res.status(400).json({ success: false, error: { message: 'Invalid URL' } });
        }
        console.error('Add image URL error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to save image URL' } });
    }
});

// PUT /api/images/:id — rename an image
router.put('/:id', async (req, res) => {
    try {
        const imageId = parseInt(req.params.id, 10);
        const { name, originalName } = req.body;
        const newName = originalName || name;

        if (!newName) {
            return res.status(400).json({ success: false, error: { message: 'name or originalName is required' } });
        }

        const updated = await db.updateImage(imageId, req.user.id, { original_name: newName });

        if (!updated) {
            return res.status(404).json({ success: false, error: { message: 'Image not found' } });
        }

        res.json({ success: true, data: updated, message: 'Image updated successfully' });
    } catch (error) {
        console.error('Update image error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to update image' } });
    }
});

// DELETE /api/images/:id — delete an image
router.delete('/:id', async (req, res) => {
    try {
        const imageId = parseInt(req.params.id, 10);
        const deleted = await db.deleteImage(imageId, req.user.id);

        if (!deleted) {
            return res.status(404).json({ success: false, error: { message: 'Image not found' } });
        }

        // Delete the physical file for uploaded images
        if (deleted.type === 'uploaded' && deleted.filename) {
            try {
                await fs.unlink(path.join(uploadsDir, deleted.filename));
            } catch (fileError) {
                console.error('Failed to delete image file:', fileError);
                // Non-fatal: DB record is already removed
            }
        }

        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to delete image' } });
    }
});

module.exports = router;
