-- Standardize all food units to grams
-- This will convert existing foods to use grams as the standard unit

USE calorie_tracker;

-- Update foods to standardize units to grams
-- Converting common units to gram equivalents

-- Pieces (estimating average weights)
UPDATE foods SET 
    default_unit = '100g',
    calories_per_unit = calories_per_unit -- Keep same calories, user will specify grams
WHERE default_unit = 'piece';

-- Medium items (estimating 150g average)
UPDATE foods SET 
    default_unit = '150g',
    calories_per_unit = ROUND(calories_per_unit * 1.5, 2) -- Adjust calories for 150g
WHERE default_unit = 'medium';

-- Cups to grams (approximately 240g for liquids, 120g for solids)
UPDATE foods SET 
    default_unit = '240g',
    calories_per_unit = ROUND(calories_per_unit * 2.4, 2) -- Adjust calories for 240g
WHERE default_unit = 'cup';

-- Tablespoons to grams (approximately 15g)
UPDATE foods SET 
    default_unit = '15g',
    calories_per_unit = ROUND(calories_per_unit * 0.15, 2) -- Adjust calories for 15g
WHERE default_unit = '2 tbsp';

-- Slices to grams (approximately 30g)
UPDATE foods SET 
    default_unit = '30g',
    calories_per_unit = ROUND(calories_per_unit * 0.3, 2) -- Adjust calories for 30g
WHERE default_unit = 'slice';

-- Standardize all to just 'g' format (remove numbers)
UPDATE foods SET default_unit = 'g' WHERE default_unit LIKE '%g';

-- Show updated units
SELECT DISTINCT default_unit FROM foods ORDER BY default_unit;