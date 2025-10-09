-- Add distributor field to foods table
-- This allows tracking where food products can be purchased

USE calorie_tracker;

-- Add distributor column to foods table
ALTER TABLE foods 
ADD COLUMN distributor VARCHAR(100) DEFAULT NULL COMMENT 'Store/distributor where food can be purchased' 
AFTER brand;

-- Show the updated table structure
DESCRIBE foods;

-- Display sample data to verify the change
SELECT id, name, brand, distributor, calories_per_100g 
FROM foods 
LIMIT 5;

-- Migration completed successfully
SELECT 'Distributor field added successfully to foods table' as result;