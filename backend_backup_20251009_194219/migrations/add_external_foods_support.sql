-- Migration: Add Open Food Facts database integration support
-- Date: $(date)
-- Description: Add tables for external food sources, cache, and update food_logs

-- Add external food sources table
CREATE TABLE IF NOT EXISTS external_food_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(255),
    api_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_active (is_active)
);

-- Insert Open Food Facts as a source
INSERT IGNORE INTO external_food_sources (name, api_endpoint, is_active) 
VALUES ('Open Food Facts', 'https://world.openfoodfacts.org', TRUE);

-- Update food_logs table to support external foods
-- Check if columns exist first, then add them
SET @exist_external_food_id = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND column_name = 'external_food_id');
SET @exist_external_source_id = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND column_name = 'external_source_id');
SET @exist_brand = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND column_name = 'brand');
SET @exist_protein = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND column_name = 'protein_per_100g');
SET @exist_carbs = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND column_name = 'carbs_per_100g');
SET @exist_fat = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND column_name = 'fat_per_100g');
SET @exist_fiber = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND column_name = 'fiber_per_100g');
SET @exist_name = (SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND column_name = 'name');

SET @sql_external_food_id = IF(@exist_external_food_id = 0, 'ALTER TABLE food_logs ADD COLUMN external_food_id VARCHAR(100);', 'SELECT "external_food_id column already exists";');
SET @sql_external_source_id = IF(@exist_external_source_id = 0, 'ALTER TABLE food_logs ADD COLUMN external_source_id INT;', 'SELECT "external_source_id column already exists";');
SET @sql_brand = IF(@exist_brand = 0, 'ALTER TABLE food_logs ADD COLUMN brand VARCHAR(255);', 'SELECT "brand column already exists";');
SET @sql_protein = IF(@exist_protein = 0, 'ALTER TABLE food_logs ADD COLUMN protein_per_100g DECIMAL(8,2);', 'SELECT "protein_per_100g column already exists";');
SET @sql_carbs = IF(@exist_carbs = 0, 'ALTER TABLE food_logs ADD COLUMN carbs_per_100g DECIMAL(8,2);', 'SELECT "carbs_per_100g column already exists";');
SET @sql_fat = IF(@exist_fat = 0, 'ALTER TABLE food_logs ADD COLUMN fat_per_100g DECIMAL(8,2);', 'SELECT "fat_per_100g column already exists";');
SET @sql_fiber = IF(@exist_fiber = 0, 'ALTER TABLE food_logs ADD COLUMN fiber_per_100g DECIMAL(8,2);', 'SELECT "fiber_per_100g column already exists";');
SET @sql_name = IF(@exist_name = 0, 'ALTER TABLE food_logs ADD COLUMN name VARCHAR(255);', 'SELECT "name column already exists";');

PREPARE stmt_external_food_id FROM @sql_external_food_id;
EXECUTE stmt_external_food_id;
DEALLOCATE PREPARE stmt_external_food_id;

PREPARE stmt_external_source_id FROM @sql_external_source_id;
EXECUTE stmt_external_source_id;
DEALLOCATE PREPARE stmt_external_source_id;

PREPARE stmt_brand FROM @sql_brand;
EXECUTE stmt_brand;
DEALLOCATE PREPARE stmt_brand;

PREPARE stmt_protein FROM @sql_protein;
EXECUTE stmt_protein;
DEALLOCATE PREPARE stmt_protein;

PREPARE stmt_carbs FROM @sql_carbs;
EXECUTE stmt_carbs;
DEALLOCATE PREPARE stmt_carbs;

PREPARE stmt_fat FROM @sql_fat;
EXECUTE stmt_fat;
DEALLOCATE PREPARE stmt_fat;

PREPARE stmt_fiber FROM @sql_fiber;
EXECUTE stmt_fiber;
DEALLOCATE PREPARE stmt_fiber;

PREPARE stmt_name FROM @sql_name;
EXECUTE stmt_name;
DEALLOCATE PREPARE stmt_name;

-- Add foreign key constraint for external source (only if not exists)
SET @exist_fk = (SELECT COUNT(*) FROM information_schema.table_constraints 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND constraint_name = 'fk_food_logs_external_source');

SET @sql_fk = IF(@exist_fk = 0, 
    'ALTER TABLE food_logs ADD CONSTRAINT fk_food_logs_external_source FOREIGN KEY (external_source_id) REFERENCES external_food_sources(id) ON DELETE SET NULL;', 
    'SELECT "Foreign key constraint already exists";');

PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- Create cache table for frequently accessed foods
CREATE TABLE IF NOT EXISTS cached_external_foods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    external_id VARCHAR(100) NOT NULL,
    external_source_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    calories_per_100g INT NOT NULL,
    protein_per_100g DECIMAL(8,2),
    carbs_per_100g DECIMAL(8,2),
    fat_per_100g DECIMAL(8,2),
    fiber_per_100g DECIMAL(8,2),
    brand VARCHAR(255),
    countries TEXT,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    usage_count INT DEFAULT 1,
    FOREIGN KEY (external_source_id) REFERENCES external_food_sources(id) ON DELETE CASCADE,
    UNIQUE KEY unique_external_food (external_id, external_source_id),
    INDEX idx_name_search (name),
    INDEX idx_usage_count (usage_count),
    INDEX idx_cached_at (cached_at),
    INDEX idx_external_source (external_source_id)
);

-- Add indexes to food_logs for better performance with external foods (only if not exists)
SET @exist_idx1 = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND index_name = 'idx_food_logs_external_food_id');
SET @exist_idx2 = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND index_name = 'idx_food_logs_external_source_id');
SET @exist_idx3 = (SELECT COUNT(*) FROM information_schema.statistics 
    WHERE table_schema = DATABASE() AND table_name = 'food_logs' AND index_name = 'idx_food_logs_log_date_user');

SET @sql_idx1 = IF(@exist_idx1 = 0, 'CREATE INDEX idx_food_logs_external_food_id ON food_logs(external_food_id);', 'SELECT "Index idx_food_logs_external_food_id already exists";');
SET @sql_idx2 = IF(@exist_idx2 = 0, 'CREATE INDEX idx_food_logs_external_source_id ON food_logs(external_source_id);', 'SELECT "Index idx_food_logs_external_source_id already exists";');
SET @sql_idx3 = IF(@exist_idx3 = 0, 'CREATE INDEX idx_food_logs_log_date_user ON food_logs(log_date, user_id);', 'SELECT "Index idx_food_logs_log_date_user already exists";');

PREPARE stmt_idx1 FROM @sql_idx1;
EXECUTE stmt_idx1;
DEALLOCATE PREPARE stmt_idx1;

PREPARE stmt_idx2 FROM @sql_idx2;
EXECUTE stmt_idx2;
DEALLOCATE PREPARE stmt_idx2;

PREPARE stmt_idx3 FROM @sql_idx3;
EXECUTE stmt_idx3;
DEALLOCATE PREPARE stmt_idx3;

-- Create view for unified food search (internal + external)
DROP VIEW IF EXISTS unified_food_search;
CREATE VIEW unified_food_search AS
SELECT 
    'internal' as source_type,
    f.id as food_id,
    NULL as external_id,
    f.name as food_name,
    f.calories_per_unit as calories_per_100g,
    NULL as protein_per_100g,
    NULL as carbs_per_100g,
    NULL as fat_per_100g,
    NULL as fiber_per_100g,
    f.brand,
    f.category,
    NULL as countries,
    f.created_at
FROM foods f
UNION ALL
SELECT 
    'external' as source_type,
    NULL as food_id,
    cef.external_id,
    cef.name as food_name,
    cef.calories_per_100g,
    cef.protein_per_100g,
    cef.carbs_per_100g,
    cef.fat_per_100g,
    cef.fiber_per_100g,
    cef.brand,
    NULL as category,
    cef.countries,
    cef.cached_at as created_at
FROM cached_external_foods cef
JOIN external_food_sources efs ON cef.external_source_id = efs.id
WHERE efs.is_active = TRUE;