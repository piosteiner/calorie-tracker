-- Complete the foods table enhancement
-- Add remaining features for food management

USE calorie_tracker;

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

-- Add category reference to foods table (check if exists first)
-- We'll handle this programmatically to avoid IF NOT EXISTS issues

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

-- Update existing foods to have 'system' source
UPDATE foods SET source = 'system' WHERE source IS NULL;