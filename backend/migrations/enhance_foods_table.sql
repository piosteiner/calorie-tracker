-- Enhance foods table for better custom food management
-- This adds fields commonly needed for comprehensive food databases

USE calorie_tracker;

-- Add additional nutrition and metadata columns to foods table
-- Check and add columns one by one to avoid syntax errors

-- Add nutrition columns
ALTER TABLE foods 
ADD COLUMN protein_per_100g DECIMAL(8,2) DEFAULT NULL COMMENT 'Protein in grams per 100g';

ALTER TABLE foods 
ADD COLUMN carbs_per_100g DECIMAL(8,2) DEFAULT NULL COMMENT 'Carbohydrates in grams per 100g';

ALTER TABLE foods 
ADD COLUMN fat_per_100g DECIMAL(8,2) DEFAULT NULL COMMENT 'Fat in grams per 100g';

ALTER TABLE foods 
ADD COLUMN fiber_per_100g DECIMAL(8,2) DEFAULT NULL COMMENT 'Fiber in grams per 100g';

ALTER TABLE foods 
ADD COLUMN sodium_per_100g DECIMAL(8,2) DEFAULT NULL COMMENT 'Sodium in mg per 100g';

ALTER TABLE foods 
ADD COLUMN sugar_per_100g DECIMAL(8,2) DEFAULT NULL COMMENT 'Sugar in grams per 100g';

-- Add metadata columns
ALTER TABLE foods 
ADD COLUMN description TEXT DEFAULT NULL COMMENT 'Food description or notes';

ALTER TABLE foods 
ADD COLUMN barcode VARCHAR(50) DEFAULT NULL COMMENT 'Product barcode if available';

ALTER TABLE foods 
ADD COLUMN source ENUM('custom', 'imported', 'system') DEFAULT 'custom' COMMENT 'Source of food data';

ALTER TABLE foods 
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE COMMENT 'Whether nutrition data is verified';

ALTER TABLE foods 
ADD COLUMN created_by INT DEFAULT NULL COMMENT 'User ID who created this food';

ALTER TABLE foods 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes
ALTER TABLE foods ADD INDEX idx_source (source);
ALTER TABLE foods ADD INDEX idx_barcode (barcode);

-- Create foods_import_log table to track imports
CREATE TABLE IF NOT EXISTS foods_import_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    import_source VARCHAR(100) NOT NULL COMMENT 'Source of import (e.g., google_sheets, csv)',
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    foods_imported INT DEFAULT 0,
    foods_updated INT DEFAULT 0,
    foods_skipped INT DEFAULT 0,
    import_notes TEXT,
    imported_by INT,
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create food categories table for better organization
CREATE TABLE IF NOT EXISTS food_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff' COMMENT 'Hex color for UI',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT IGNORE INTO food_categories (name, description, color) VALUES 
('Fruits', 'Fresh and dried fruits', '#28a745'),
('Vegetables', 'Fresh vegetables and leafy greens', '#20c997'),
('Proteins', 'Meat, fish, eggs, and protein sources', '#dc3545'),
('Grains', 'Bread, rice, pasta, and grain products', '#fd7e14'),
('Dairy', 'Milk, cheese, yogurt, and dairy products', '#6f42c1'),
('Snacks', 'Chips, cookies, and snack foods', '#ffc107'),
('Beverages', 'Drinks and liquid calories', '#17a2b8'),
('Custom', 'User-defined custom foods', '#6c757d');

-- Add category reference to foods table
ALTER TABLE foods 
ADD COLUMN IF NOT EXISTS category_id INT DEFAULT NULL,
ADD FOREIGN KEY fk_foods_category (category_id) REFERENCES food_categories(id) ON DELETE SET NULL,
ADD INDEX idx_category (category_id);

-- Update existing foods to have 'system' source
UPDATE foods SET source = 'system' WHERE source IS NULL;