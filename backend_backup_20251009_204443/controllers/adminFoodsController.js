const db = require('../database');
const foodsImportService = require('../services/foodsImportService');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/temp_imports/');
    },
    filename: (req, file, cb) => {
        cb(null, `import-${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.csv', '.json'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and JSON files are allowed'));
        }
    }
});

class AdminFoodsController {
    // Get all foods with enhanced data
    async getAllFoods(req, res) {
        try {
            const { page = 1, limit = 50, category, source, search } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (category) {
                whereClause += ' AND fc.name = ?';
                params.push(category);
            }

            if (source) {
                whereClause += ' AND f.source = ?';
                params.push(source);
            }

            if (search) {
                whereClause += ' AND (f.name LIKE ? OR f.brand LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            // Get total count
            const countResult = await db.query(`
                SELECT COUNT(*) as total
                FROM foods f
                LEFT JOIN food_categories fc ON f.category_id = fc.id
                ${whereClause}
            `, params);

            // Get foods with pagination - sorted alphabetically with umlaut handling
            const foods = await db.query(`
                SELECT 
                    f.*,
                    fc.name as category_name,
                    fc.color as category_color,
                    u.username as created_by_username,
                    (SELECT COUNT(*) FROM food_logs fl WHERE fl.food_id = f.id) as usage_count
                FROM foods f
                LEFT JOIN food_categories fc ON f.category_id = fc.id
                LEFT JOIN users u ON f.created_by = u.id
                ${whereClause}
                ORDER BY REPLACE(REPLACE(REPLACE(UPPER(f.name), 'Ä', 'AE'), 'Ö', 'OE'), 'Ü', 'UE') ASC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            res.json({
                success: true,
                foods,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            });

        } catch (error) {
            console.error('Pios Food DB get foods error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve foods'
            });
        }
    }

    // Create new food
    async createFood(req, res) {
        try {
            const {
                name, calories_per_100g, category_id, brand, distributor,
                protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                sodium_per_100g, sugar_per_100g, description, barcode, is_verified
            } = req.body;
            
            // Always use 100g as the default unit since all calories are standardized to per 100g
            const default_unit = '100g';

            // Check if food already exists
            const existing = await db.query('SELECT id FROM foods WHERE LOWER(name) = LOWER(?)', [name]);
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Food with this name already exists'
                });
            }

            const result = await db.query(`
                INSERT INTO foods (
                    name, calories_per_100g, default_unit, category_id, brand, distributor,
                    protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                    sodium_per_100g, sugar_per_100g, description, barcode,
                    source, is_verified, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?, ?)
            `, [
                name, calories_per_100g, default_unit, category_id, brand, distributor,
                protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                sodium_per_100g, sugar_per_100g, description, barcode,
                is_verified || false, req.user.id
            ]);

            res.json({
                success: true,
                message: `"${name}" has been successfully added to your food database`,
                foodId: result.insertId,
                food: {
                    id: result.insertId,
                    name: name,
                    calories_per_100g: calories_per_100g
                }
            });

        } catch (error) {
            console.error('Pios Food DB create food error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create food'
            });
        }
    }

    // Update food
    async updateFood(req, res) {
        try {
            const { foodId } = req.params;
            const {
                name, calories_per_100g, category_id, brand, distributor,
                protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                sodium_per_100g, sugar_per_100g, description, barcode, is_verified
            } = req.body;
            
            // Always use 100g as the default unit since all calories are standardized to per 100g
            const default_unit = '100g';

            // Check if food exists
            const existing = await db.query('SELECT id FROM foods WHERE id = ?', [foodId]);
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Food not found'
                });
            }

            await db.query(`
                UPDATE foods SET
                    name = ?, calories_per_100g = ?, default_unit = ?, category_id = ?, brand = ?, distributor = ?,
                    protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, fiber_per_100g = ?,
                    sodium_per_100g = ?, sugar_per_100g = ?, description = ?, barcode = ?,
                    is_verified = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                name, calories_per_100g, default_unit, category_id, brand, distributor,
                protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                sodium_per_100g, sugar_per_100g, description, barcode,
                is_verified || false, foodId
            ]);

            res.json({
                success: true,
                message: `"${name}" has been successfully updated`,
                food: {
                    id: foodId,
                    name: name,
                    calories_per_100g: calories_per_100g
                }
            });

        } catch (error) {
            console.error('Pios Food DB update food error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update food'
            });
        }
    }

    // Delete food
    async deleteFood(req, res) {
        try {
            const { foodId } = req.params;

            // Check if food is used in logs
            const usage = await db.query('SELECT COUNT(*) as count FROM food_logs WHERE food_id = ?', [foodId]);
            if (usage[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete this food because it has been logged ${usage[0].count} time${usage[0].count > 1 ? 's' : ''} by users. To delete this food, you must first remove all associated food log entries.`,
                    details: {
                        usageCount: usage[0].count,
                        reason: 'FOOD_IN_USE'
                    }
                });
            }

            const result = await db.query('DELETE FROM foods WHERE id = ?', [foodId]);
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Food not found'
                });
            }

            res.json({
                success: true,
                message: 'Food deleted successfully'
            });

        } catch (error) {
            console.error('Pios Food DB delete food error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete food'
            });
        }
    }

    // Get food categories
    async getCategories(req, res) {
        try {
            const categories = await db.query(`
                SELECT 
                    fc.*,
                    COUNT(f.id) as food_count
                FROM food_categories fc
                LEFT JOIN foods f ON fc.id = f.category_id
                GROUP BY fc.id
                ORDER BY fc.name
            `);

            res.json({
                success: true,
                categories
            });

        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve categories'
            });
        }
    }

    // Import foods from CSV/JSON
    async importFoods(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const fs = require('fs');
            const filePath = req.file.path;
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const fileExt = path.extname(req.file.originalname).toLowerCase();

            let results;
            if (fileExt === '.csv') {
                results = await foodsImportService.importFromCSV(fileContent, 'csv_upload', req.user.id);
            } else if (fileExt === '.json') {
                const jsonData = JSON.parse(fileContent);
                results = await foodsImportService.importFromJSON(jsonData, 'json_upload', req.user.id);
            }

            // Clean up uploaded file
            fs.unlinkSync(filePath);

            res.json({
                success: true,
                message: 'Import completed',
                results
            });

        } catch (error) {
            console.error('Import error:', error);
            
            // Clean up file on error
            if (req.file && req.file.path) {
                try {
                    require('fs').unlinkSync(req.file.path);
                } catch (cleanupError) {
                    console.error('File cleanup error:', cleanupError);
                }
            }

            res.status(500).json({
                success: false,
                message: `Import failed: ${error.message}`
            });
        }
    }

    // Get import history
    async getImportHistory(req, res) {
        try {
            const history = await foodsImportService.getImportHistory(20);
            
            res.json({
                success: true,
                imports: history
            });

        } catch (error) {
            console.error('Get import history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve import history'
            });
        }
    }

    // Get upload middleware
    getUploadMiddleware() {
        return upload.single('file');
    }
}

module.exports = new AdminFoodsController();