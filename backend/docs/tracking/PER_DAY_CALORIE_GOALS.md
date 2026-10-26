# Per-Day Calorie Goals Implementation

## Overview

This feature allows users to set custom calorie goals for specific dates, providing flexibility beyond a single global daily goal. The system uses a hybrid approach:
- **Default Goal**: User's `daily_calorie_goal` from the `users` table (applies to all days)
- **Per-Day Goals**: Custom goals stored in the `daily_goals` table (overrides default for specific dates)

## Database Schema

### `daily_goals` Table

```sql
CREATE TABLE daily_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    goal_date DATE NOT NULL,
    goal_calories INT NOT NULL DEFAULT 2000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, goal_date),
    INDEX idx_user_id (user_id),
    INDEX idx_goal_date (goal_date),
    INDEX idx_user_date (user_id, goal_date)
);
```

### Key Features:
- ✅ **Unique Constraint**: One goal per user per date
- ✅ **Cascade Delete**: Goals deleted when user is deleted
- ✅ **Optimized Indexes**: Fast queries for user and date lookups
- ✅ **Automatic Timestamps**: Track when goals are created/updated

## API Endpoints

### 1. Set/Update Per-Day Goal

**Endpoint**: `POST /api/user/daily-goal`

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "date": "2025-10-07",
  "goal": 2500
}
```

**Validation**:
- `date`: ISO 8601 date format (YYYY-MM-DD), required
- `goal`: Integer between 500-10000, required

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Daily goal for 2025-10-07 saved successfully",
  "goal": 2500,
  "date": "2025-10-07"
}
```

**Response** (Error - 400):
```json
{
  "error": "Validation failed",
  "details": [
    {
      "msg": "Valid date is required",
      "param": "date"
    }
  ]
}
```

**Implementation Details**:
- Uses `INSERT ... ON DUPLICATE KEY UPDATE` for upsert behavior
- Automatically updates existing goals if one exists for the date
- Sets `updated_at` timestamp on updates

**cURL Example**:
```bash
curl -X POST https://api.calorie-tracker.piogino.ch/api/user/daily-goal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-10-07", "goal": 2500}'
```

---

### 2. Get Per-Day Goal

**Endpoint**: `GET /api/user/daily-goal/:date`

**Authentication**: Required (JWT Bearer token)

**Parameters**:
- `date`: ISO 8601 date (YYYY-MM-DD) in URL path

**Response** (Success - 200):
```json
{
  "success": true,
  "goal": 2500,
  "date": "2025-10-07",
  "source": "specific"
}
```

**Goal Sources**:
- `specific`: Custom goal set for this specific date (from `daily_goals` table)
- `default`: User's default goal (from `users.daily_calorie_goal`)
- `fallback`: System default (2000) if user has no default set

**Priority Order**:
1. Specific per-day goal (if exists)
2. User's default goal (if no per-day goal)
3. System fallback (2000 kcal)

**cURL Example**:
```bash
curl -X GET https://api.calorie-tracker.piogino.ch/api/user/daily-goal/2025-10-07 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. Food Log History with Per-Day Goals

**Endpoint**: `GET /api/logs/history`

**Authentication**: Required (JWT Bearer token)

**Query Parameters**:
- `limit`: Number of days to return (default: 30, max: 100)
- `offset`: Pagination offset (default: 0)

**Response** (Success - 200):
```json
{
  "success": true,
  "history": [
    {
      "log_date": "2025-10-07",
      "meals_count": 5,
      "total_calories": 2450,
      "daily_goal": 2500,
      "first_log_time": "2025-10-07T08:15:00Z",
      "last_log_time": "2025-10-07T20:30:00Z"
    },
    {
      "log_date": "2025-10-06",
      "meals_count": 4,
      "total_calories": 1980,
      "daily_goal": 2000,
      "first_log_time": "2025-10-06T07:30:00Z",
      "last_log_time": "2025-10-06T19:45:00Z"
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 30,
    "totalDays": 45,
    "hasMore": true
  }
}
```

**Key Changes**:
- Added `daily_goal` field to each history entry
- Uses `LEFT JOIN` to include per-day goals
- Falls back to user's default goal with `COALESCE()`

**SQL Query**:
```sql
SELECT 
    fl.log_date,
    COUNT(*) as meals_count,
    SUM(fl.calories) as total_calories,
    MIN(fl.logged_at) as first_log_time,
    MAX(fl.logged_at) as last_log_time,
    COALESCE(dg.goal_calories, u.daily_calorie_goal) as daily_goal
FROM food_logs fl
LEFT JOIN daily_goals dg ON fl.user_id = dg.user_id AND fl.log_date = dg.goal_date
LEFT JOIN users u ON fl.user_id = u.id
WHERE fl.user_id = ?
GROUP BY fl.log_date, dg.goal_calories, u.daily_calorie_goal
ORDER BY fl.log_date DESC
LIMIT ? OFFSET ?
```

---

## Frontend Integration

### Setting a Per-Day Goal

```javascript
async function setDailyGoal(date, goal) {
    try {
        const response = await fetch('/api/user/daily-goal', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date, goal })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Goal for ${date} set to ${goal} kcal`);
            // Update UI to show new goal
        }
    } catch (error) {
        console.error('Failed to set daily goal:', error);
    }
}

// Example: Set goal for today
setDailyGoal('2025-10-07', 2500);
```

### Getting a Per-Day Goal

```javascript
async function getDailyGoal(date) {
    try {
        const response = await fetch(`/api/user/daily-goal/${date}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Goal for ${date}: ${data.goal} kcal (${data.source})`);
            return data.goal;
        }
    } catch (error) {
        console.error('Failed to get daily goal:', error);
        return 2000; // Fallback
    }
}

// Example: Get goal for today
const todayGoal = await getDailyGoal('2025-10-07');
```

### Inline Goal Editing (from GitHub implementation)

```javascript
// Make the goal editable inline
function makeGoalEditable(goalElement, date) {
    goalElement.contentEditable = true;
    goalElement.focus();
    
    // Select all text for easy editing
    const range = document.createRange();
    range.selectNodeContents(goalElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Save on blur or Enter key
    goalElement.addEventListener('blur', () => saveGoal(goalElement, date));
    goalElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            goalElement.blur();
        }
    });
}

async function saveGoal(element, date) {
    const newGoal = parseInt(element.textContent);
    
    if (isNaN(newGoal) || newGoal < 500 || newGoal > 10000) {
        alert('Goal must be between 500 and 10000 kcal');
        element.textContent = element.dataset.originalGoal;
        return;
    }
    
    try {
        await setDailyGoal(date, newGoal);
        element.dataset.originalGoal = newGoal;
        element.contentEditable = false;
    } catch (error) {
        element.textContent = element.dataset.originalGoal;
    }
}
```

### Loading History with Per-Day Goals

```javascript
async function loadHistory() {
    try {
        const response = await fetch('/api/logs/history?limit=30', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            data.history.forEach(day => {
                const progress = (day.total_calories / day.daily_goal) * 100;
                
                console.log(`${day.log_date}:`);
                console.log(`  Calories: ${day.total_calories} / ${day.daily_goal} kcal`);
                console.log(`  Progress: ${progress.toFixed(1)}%`);
                console.log(`  Meals: ${day.meals_count}`);
            });
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}
```

---

## Use Cases

### 1. Special Events
```javascript
// Set higher goal for a celebration day
await setDailyGoal('2025-12-25', 3500); // Christmas
```

### 2. Calorie Cycling
```javascript
// Different goals for different days
await setDailyGoal('2025-10-08', 2200); // High day
await setDailyGoal('2025-10-09', 1800); // Low day
```

### 3. Training Days
```javascript
// Higher goals on workout days
const workoutDays = ['2025-10-08', '2025-10-10', '2025-10-12'];
workoutDays.forEach(date => setDailyGoal(date, 2800));
```

### 4. Bulk Goal Setting
```javascript
// Set goals for entire week
async function setWeeklyGoals(startDate, weekGoals) {
    const promises = weekGoals.map((goal, index) => {
        const date = addDays(startDate, index);
        return setDailyGoal(date, goal);
    });
    
    await Promise.all(promises);
}

// Monday to Sunday
await setWeeklyGoals('2025-10-07', [2200, 2200, 2000, 2200, 2200, 2500, 2300]);
```

---

## Database Queries Reference

### Get Goal for Date (with fallback)
```sql
SELECT COALESCE(dg.goal_calories, u.daily_calorie_goal, 2000) as goal
FROM users u
LEFT JOIN daily_goals dg ON u.id = dg.user_id AND dg.goal_date = '2025-10-07'
WHERE u.id = 1;
```

### Get All User's Custom Goals
```sql
SELECT goal_date, goal_calories 
FROM daily_goals 
WHERE user_id = 1 
ORDER BY goal_date DESC;
```

### Delete Old Custom Goals (cleanup)
```sql
DELETE FROM daily_goals 
WHERE goal_date < DATE_SUB(CURDATE(), INTERVAL 90 DAY);
```

### Get Weekly Goal Summary
```sql
SELECT 
    WEEK(goal_date) as week_num,
    AVG(goal_calories) as avg_goal,
    COUNT(*) as days_with_custom_goals
FROM daily_goals
WHERE user_id = 1 
  AND goal_date >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
GROUP BY WEEK(goal_date);
```

---

## Performance Considerations

### Indexes
The table includes optimized indexes for common queries:
- `idx_user_id`: Fast user-specific queries
- `idx_goal_date`: Fast date-range queries
- `idx_user_date`: Composite index for user+date lookups (fastest)

### Query Optimization
- Uses `LEFT JOIN` to avoid missing data when no per-day goal exists
- `COALESCE()` provides efficient fallback without subqueries
- `UNIQUE` constraint prevents duplicate entries and improves lookup speed

### Caching Strategy (Optional)
For high-traffic applications, consider caching:
```javascript
// Cache goals for the current week
const goalCache = new Map();

async function getCachedGoal(date) {
    if (!goalCache.has(date)) {
        const goal = await getDailyGoal(date);
        goalCache.set(date, goal);
    }
    return goalCache.get(date);
}
```

---

## Migration Instructions

### Running the Migration
```bash
mysql -u calorie_app -p calorie_tracker < migrations/create_daily_goals_table.sql
```

### Rollback (if needed)
```sql
DROP TABLE IF EXISTS daily_goals;
```

### Verify Installation
```sql
SHOW TABLES LIKE 'daily_goals';
DESCRIBE daily_goals;
SELECT COUNT(*) FROM daily_goals; -- Should be 0 initially
```

---

## Error Handling

### Common Errors

**1. Invalid Date Format**
```json
{
  "error": "Validation failed",
  "details": [{"msg": "Valid date is required", "param": "date"}]
}
```
**Solution**: Use ISO 8601 format (YYYY-MM-DD)

**2. Goal Out of Range**
```json
{
  "error": "Validation failed",
  "details": [{"msg": "Goal must be between 500-10000 calories", "param": "goal"}]
}
```
**Solution**: Ensure goal is between 500-10000 kcal

**3. Database Constraint Error**
```json
{
  "error": "Failed to save daily goal",
  "details": "Duplicate entry..."
}
```
**Solution**: This shouldn't happen with ON DUPLICATE KEY UPDATE, but indicates a race condition

---

## Testing

### Manual Testing

**1. Set a per-day goal:**
```bash
curl -X POST http://localhost:3000/api/user/daily-goal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-10-07", "goal": 2500}'
```

**2. Get the goal:**
```bash
curl -X GET http://localhost:3000/api/user/daily-goal/2025-10-07 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**3. Check history includes goal:**
```bash
curl -X GET "http://localhost:3000/api/logs/history?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Scenarios

- ✅ Set goal for future date
- ✅ Update existing goal
- ✅ Get goal with specific per-day override
- ✅ Get goal with default fallback
- ✅ History shows correct goals for each day
- ✅ Invalid date format rejected
- ✅ Out-of-range goals rejected

---

## Summary

✅ **Flexible Goal System**: Per-day goals with automatic fallback to default
✅ **Optimized Performance**: Indexed queries and efficient JOINs
✅ **Data Integrity**: Unique constraints and foreign key relationships  
✅ **User-Friendly API**: Simple POST/GET endpoints with clear responses
✅ **Frontend Ready**: Inline editing, bulk updates, caching strategies
✅ **Production Tested**: Deployed and working with frontend from GitHub commit 19022aa

This implementation provides a robust, scalable solution for per-day calorie goal management that seamlessly integrates with your existing calorie tracking system.