-- Migration: Convert calories_per_unit to calories_per_100g
-- This migration adds the new column and migrates existing data

USE calorie_tracker;

-- Step 1: Add the new calories_per_100g column
ALTER TABLE foods 
ADD COLUMN calories_per_100g DECIMAL(10,2) DEFAULT NULL 
COMMENT 'Calories per 100 grams of the food item';

-- Step 2: Migrate existing data from calories_per_unit to calories_per_100g
-- For foods with gram-based units, we need to convert to per 100g basis
-- This assumes calories_per_unit represents calories for the default_unit amount

-- For foods already in grams (default_unit = 'g'), convert directly to per 100g
UPDATE foods 
SET calories_per_100g = calories_per_unit 
WHERE default_unit = 'g' AND calories_per_unit IS NOT NULL;

-- For foods with specific gram amounts (like '30g', '150g'), calculate per 100g
UPDATE foods 
SET calories_per_100g = ROUND((calories_per_unit / CAST(SUBSTRING(default_unit, 1, LENGTH(default_unit) - 1) AS DECIMAL(10,2))) * 100, 2)
WHERE default_unit REGEXP '^[0-9]+g$' AND calories_per_unit IS NOT NULL;

-- For foods with non-gram units, we'll need to make reasonable estimates
-- These will need manual review, but we'll provide reasonable defaults

-- Pieces (estimate 100g average)
UPDATE foods 
SET calories_per_100g = calories_per_unit 
WHERE default_unit = 'piece' AND calories_per_unit IS NOT NULL;

-- Medium items (estimate 150g average)
UPDATE foods 
SET calories_per_100g = ROUND((calories_per_unit / 150) * 100, 2)
WHERE default_unit = 'medium' AND calories_per_unit IS NOT NULL;

-- Cups (estimate 240g for liquids)
UPDATE foods 
SET calories_per_100g = ROUND((calories_per_unit / 240) * 100, 2)
WHERE default_unit = 'cup' AND calories_per_unit IS NOT NULL;

-- Tablespoons (estimate 15g)
UPDATE foods 
SET calories_per_100g = ROUND((calories_per_unit / 15) * 100, 2)
WHERE default_unit IN ('tbsp', '2 tbsp') AND calories_per_unit IS NOT NULL;

-- Slices (estimate 30g)
UPDATE foods 
SET calories_per_100g = ROUND((calories_per_unit / 30) * 100, 2)
WHERE default_unit = 'slice' AND calories_per_unit IS NOT NULL;

-- Step 3: Update default_unit to 'g' for consistency (all foods now measured in grams)
UPDATE foods SET default_unit = 'g' WHERE default_unit IS NOT NULL;

-- Step 4: Set calories_per_100g as NOT NULL (after migration)
-- First, set any NULL values to a default (this shouldn't happen if migration worked)
UPDATE foods SET calories_per_100g = 0 WHERE calories_per_100g IS NULL;

-- Make the column required
ALTER TABLE foods MODIFY COLUMN calories_per_100g DECIMAL(10,2) NOT NULL COMMENT 'Calories per 100 grams of the food item';

-- Step 5: Show migration results
SELECT 
    COUNT(*) as total_foods,
    AVG(calories_per_100g) as avg_calories_per_100g,
    MIN(calories_per_100g) as min_calories,
    MAX(calories_per_100g) as max_calories
FROM foods;

-- Step 6: Show foods that might need manual review (very high or very low calories)
SELECT id, name, calories_per_unit, calories_per_100g, default_unit
FROM foods 
WHERE calories_per_100g > 1000 OR calories_per_100g < 10
ORDER BY calories_per_100g DESC;

COMMIT;