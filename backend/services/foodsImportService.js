const fs = require('fs');
const path = require('path');
const db = require('../database');

class FoodsImportService {
    constructor() {
        this.validColumns = [
            'name', 'calories_per_unit', 'default_unit', 'category',
            'brand', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g',
            'fiber_per_100g', 'sodium_per_100g', 'sugar_per_100g',
            'description', 'barcode'
        ];
    }

    // Import from CSV data (can be from Google Sheets export)
    async importFromCSV(csvData, source = 'csv', importedBy = null) {
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: []
        };

        try {
            const lines = csvData.split('\n');
            if (lines.length < 2) {
                throw new Error('CSV must have at least a header and one data row');
            }

            // Parse header
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
            console.log('CSV Headers:', headers);

            // Validate required columns
            if (!headers.includes('name') || !headers.includes('calories_per_unit') || !headers.includes('default_unit')) {
                throw new Error('CSV must contain at least: name, calories_per_unit, default_unit columns');
            }

            // Process each data row
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue; // Skip empty lines

                try {
                    const values = this.parseCSVLine(line);
                    if (values.length !== headers.length) {
                        results.errors.push(`Row ${i + 1}: Column count mismatch`);
                        results.skipped++;
                        continue;
                    }

                    const foodData = {};
                    headers.forEach((header, index) => {
                        if (this.validColumns.includes(header)) {
                            foodData[header] = values[index];
                        }
                    });

                    // Validate required fields
                    if (!foodData.name || !foodData.calories_per_unit || !foodData.default_unit) {
                        results.errors.push(`Row ${i + 1}: Missing required fields`);
                        results.skipped++;
                        continue;
                    }

                    // Check if food already exists
                    const existing = await db.query(
                        'SELECT id FROM foods WHERE LOWER(name) = LOWER(?)',
                        [foodData.name]
                    );

                    if (existing.length > 0) {
                        // Update existing
                        await this.updateFood(existing[0].id, foodData, importedBy);
                        results.updated++;
                    } else {
                        // Create new
                        await this.createFood(foodData, source, importedBy);
                        results.imported++;
                    }

                } catch (error) {
                    results.errors.push(`Row ${i + 1}: ${error.message}`);
                    results.skipped++;
                }
            }

            // Log the import
            await this.logImport(source, results, importedBy);

            return results;

        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }

    // Parse CSV line handling quoted values
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim()); // Don't forget the last field
        
        return result;
    }

    // Create new food
    async createFood(foodData, source, importedBy) {
        const categoryId = await this.getCategoryId(foodData.category);
        
        const sql = `
            INSERT INTO foods (
                name, calories_per_unit, default_unit, category_id, brand,
                protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                sodium_per_100g, sugar_per_100g, description, barcode,
                source, is_verified, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            foodData.name,
            parseFloat(foodData.calories_per_unit) || 0,
            foodData.default_unit,
            categoryId,
            foodData.brand || null,
            parseFloat(foodData.protein_per_100g) || null,
            parseFloat(foodData.carbs_per_100g) || null,
            parseFloat(foodData.fat_per_100g) || null,
            parseFloat(foodData.fiber_per_100g) || null,
            parseFloat(foodData.sodium_per_100g) || null,
            parseFloat(foodData.sugar_per_100g) || null,
            foodData.description || null,
            foodData.barcode || null,
            source === 'csv' ? 'imported' : 'custom',
            false, // is_verified
            importedBy
        ];

        return await db.query(sql, values);
    }

    // Update existing food
    async updateFood(foodId, foodData, importedBy) {
        const categoryId = await this.getCategoryId(foodData.category);
        
        const sql = `
            UPDATE foods SET
                calories_per_unit = ?, default_unit = ?, category_id = ?, brand = ?,
                protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, fiber_per_100g = ?,
                sodium_per_100g = ?, sugar_per_100g = ?, description = ?, barcode = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        const values = [
            parseFloat(foodData.calories_per_unit) || 0,
            foodData.default_unit,
            categoryId,
            foodData.brand || null,
            parseFloat(foodData.protein_per_100g) || null,
            parseFloat(foodData.carbs_per_100g) || null,
            parseFloat(foodData.fat_per_100g) || null,
            parseFloat(foodData.fiber_per_100g) || null,
            parseFloat(foodData.sodium_per_100g) || null,
            parseFloat(foodData.sugar_per_100g) || null,
            foodData.description || null,
            foodData.barcode || null,
            foodId
        ];

        return await db.query(sql, values);
    }

    // Get or create category ID
    async getCategoryId(categoryName) {
        if (!categoryName) return null;
        
        // Try to find existing category
        const existing = await db.query(
            'SELECT id FROM food_categories WHERE LOWER(name) = LOWER(?)',
            [categoryName]
        );
        
        if (existing.length > 0) {
            return existing[0].id;
        }
        
        // Create new category
        const result = await db.query(
            'INSERT INTO food_categories (name, description) VALUES (?, ?)',
            [categoryName, `Imported category: ${categoryName}`]
        );
        
        return result.insertId;
    }

    // Log import results
    async logImport(source, results, importedBy) {
        const notes = `Imported: ${results.imported}, Updated: ${results.updated}, Skipped: ${results.skipped}`;
        if (results.errors.length > 0) {
            notes += `\nErrors: ${results.errors.slice(0, 5).join('; ')}`;
        }

        await db.query(`
            INSERT INTO foods_import_log (
                import_source, foods_imported, foods_updated, foods_skipped,
                import_notes, imported_by
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [source, results.imported, results.updated, results.skipped, notes, importedBy]);
    }

    // Import from JSON (alternative format)
    async importFromJSON(jsonData, source = 'json', importedBy = null) {
        const results = {
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: []
        };

        try {
            const foods = Array.isArray(jsonData) ? jsonData : [jsonData];

            for (const foodData of foods) {
                try {
                    // Validate required fields
                    if (!foodData.name || !foodData.calories_per_unit || !foodData.default_unit) {
                        results.errors.push(`Food "${foodData.name || 'unnamed'}": Missing required fields`);
                        results.skipped++;
                        continue;
                    }

                    // Check if food already exists
                    const existing = await db.query(
                        'SELECT id FROM foods WHERE LOWER(name) = LOWER(?)',
                        [foodData.name]
                    );

                    if (existing.length > 0) {
                        await this.updateFood(existing[0].id, foodData, importedBy);
                        results.updated++;
                    } else {
                        await this.createFood(foodData, source, importedBy);
                        results.imported++;
                    }

                } catch (error) {
                    results.errors.push(`Food "${foodData.name}": ${error.message}`);
                    results.skipped++;
                }
            }

            await this.logImport(source, results, importedBy);
            return results;

        } catch (error) {
            console.error('JSON import error:', error);
            throw error;
        }
    }

    // Get import history
    async getImportHistory(limit = 10) {
        return await db.query(`
            SELECT fil.*, u.username as imported_by_username
            FROM foods_import_log fil
            LEFT JOIN users u ON fil.imported_by = u.id
            ORDER BY fil.import_date DESC
            LIMIT ?
        `, [limit]);
    }
}

module.exports = new FoodsImportService();