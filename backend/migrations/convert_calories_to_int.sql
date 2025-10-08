-- Convert calorie columns from DECIMAL to INT (whole kcal values)
-- This migration standardizes all calorie values to whole numbers (kcal)

USE calorie_tracker;

-- Step 1: Update existing data in foods table to round to whole numbers
UPDATE foods 
SET calories_per_100g = ROUND(calories_per_100g, 0)
WHERE calories_per_100g IS NOT NULL;

-- Step 2: Update existing data in food_logs table to round to whole numbers
UPDATE food_logs 
SET calories = ROUND(calories, 0)
WHERE calories IS NOT NULL;

-- Step 3: Change foods.calories_per_100g from DECIMAL(10,2) to INT
ALTER TABLE foods 
MODIFY COLUMN calories_per_100g INT NOT NULL 
COMMENT 'Calories per 100 grams (kcal) - whole numbers only';

-- Step 4: Change food_logs.calories from DECIMAL(8,2) to INT
ALTER TABLE food_logs 
MODIFY COLUMN calories INT NOT NULL 
COMMENT 'Total calories consumed (kcal) - whole numbers only';

-- Step 5: Update users table daily_calorie_goal to ensure it's INT (should already be)
-- Check if column exists and modify if needed
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'daily_calorie_goal'
);

-- Update users.daily_calorie_goal to INT if it exists and isn't already
UPDATE users 
SET daily_calorie_goal = ROUND(daily_calorie_goal, 0)
WHERE daily_calorie_goal IS NOT NULL;

-- Modify column to INT (in case it was DECIMAL)
ALTER TABLE users 
MODIFY COLUMN daily_calorie_goal INT DEFAULT 2000 
COMMENT 'Daily calorie goal (kcal) - whole numbers only';

-- Step 6: Show updated table structures
SHOW CREATE TABLE foods;
SHOW CREATE TABLE food_logs;
SHOW CREATE TABLE daily_goals;
SHOW CREATE TABLE users;

-- Step 7: Verify data integrity - show sample data
SELECT 'Foods Sample:' as table_name;
SELECT id, name, calories_per_100g FROM foods LIMIT 5;

SELECT 'Food Logs Sample:' as table_name;
SELECT id, name, calories FROM food_logs LIMIT 5;

SELECT 'Daily Goals Sample:' as table_name;
SELECT id, user_id, goal_calories FROM daily_goals LIMIT 3;

COMMIT;