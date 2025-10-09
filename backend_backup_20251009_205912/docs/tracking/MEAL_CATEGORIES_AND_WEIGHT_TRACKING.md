# Calorie Tracker API - Meal Categories & Weight Tracking Enhancement

## 📋 Summary

This document outlines the new features added to the Calorie Tracker API backend:
- **Meal categorization** (breakfast, lunch, dinner, snack, other)
- **Flexible date logging** (log foods for past dates, not just today)
- **Weight tracking** with trends and history
- **Calendar view** with monthly summaries
- **Date range queries** for analytics

---

## 🗄️ Database Changes

### 1. Modified `food_logs` Table

Added two new columns:

```sql
ALTER TABLE food_logs 
ADD COLUMN meal_category VARCHAR(20) DEFAULT 'other' AFTER logged_at,
ADD COLUMN meal_time TIME NULL AFTER meal_category;

ALTER TABLE food_logs 
ADD INDEX idx_user_date_category (user_id, log_date, meal_category);
```

**Fields:**
- `meal_category` - VARCHAR(20), default 'other'
  - Valid values: 'breakfast', 'lunch', 'dinner', 'snack', 'other'
- `meal_time` - TIME, nullable
  - Format: HH:MM:SS

**Index:** `idx_user_date_category` for efficient queries by user, date, and meal category

### 2. New `weight_logs` Table

```sql
CREATE TABLE weight_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    log_date DATE NOT NULL,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, log_date),
    INDEX idx_user_date (user_id, log_date)
);
```

**Features:**
- One weight entry per user per date (UNIQUE constraint)
- Weight range: 20-300 kg
- Optional notes field
- Automatic timestamps

---

## 🔌 API Endpoints

### Modified Endpoints

#### 1. **POST /api/logs** - Enhanced Food Logging

**New Parameters:**
- `log_date` (optional, string) - Date in 'YYYY-MM-DD' format, defaults to today
- `meal_category` (optional, string) - One of: 'breakfast', 'lunch', 'dinner', 'snack', 'other'
- `meal_time` (optional, string) - Time in 'HH:MM:SS' format

**Validation:**
- `log_date` cannot be in the future
- `meal_category` must be one of the valid values
- `meal_time` must match HH:MM:SS format

**Example Request:**
```json
POST /api/logs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Oatmeal with Honey",
  "quantity": 80,
  "unit": "g",
  "calories": 320,
  "log_date": "2025-10-09",
  "meal_category": "breakfast",
  "meal_time": "08:30:00"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Successfully logged 80g of Oatmeal with Honey (320 kcal)",
  "logId": 45,
  "entry": {
    "id": 45,
    "foodName": "Oatmeal with Honey",
    "quantity": 80,
    "unit": "g",
    "calories": 320,
    "logDate": "2025-10-09",
    "meal_category": "breakfast",
    "meal_time": "08:30:00"
  }
}
```

---

#### 2. **GET /api/logs?date=YYYY-MM-DD** - Enhanced with Meal Grouping

**Returns:** Logs grouped by meal category with totals

**Example Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 45,
      "food_name": "Oatmeal with Honey",
      "quantity": 80,
      "unit": "g",
      "calories": 320,
      "meal_category": "breakfast",
      "meal_time": "08:30:00",
      "log_date": "2025-10-09"
    }
  ],
  "grouped": {
    "breakfast": {
      "foods": [...],
      "total_calories": 450
    },
    "lunch": {
      "foods": [...],
      "total_calories": 680
    },
    "dinner": {
      "foods": [...],
      "total_calories": 520
    },
    "snack": {
      "foods": [...],
      "total_calories": 200
    },
    "other": {
      "foods": [...],
      "total_calories": 0
    }
  },
  "totals": {
    "total_calories": 1850,
    "meals_count": 12,
    "categories_used": ["breakfast", "lunch", "dinner", "snack"]
  },
  "date": "2025-10-09"
}
```

---

#### 3. **PUT /api/logs/:id** - Update Food Log

**New Parameters:**
- `meal_category` (optional) - Update meal category
- `meal_time` (optional) - Update meal time

**Example Request:**
```json
PUT /api/logs/45
Authorization: Bearer <token>
Content-Type: application/json

{
  "meal_category": "lunch",
  "meal_time": "12:00:00"
}
```

---

### New Endpoints

#### 4. **GET /api/logs/range** - Date Range Query

Get logs for a date range (max 90 days).

**Query Parameters:**
- `start_date` (required) - Start date in YYYY-MM-DD format
- `end_date` (required) - End date in YYYY-MM-DD format

**Validation:**
- Date range cannot exceed 90 days
- End date must be after start date

**Example Request:**
```
GET /api/logs/range?start_date=2025-10-01&end_date=2025-10-07
Authorization: Bearer <token>
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "2025-10-01": {
      "logs": [...],
      "grouped": {
        "breakfast": {...},
        "lunch": {...}
      },
      "total_calories": 2100
    },
    "2025-10-02": {
      "logs": [...],
      "grouped": {...},
      "total_calories": 1850
    }
  },
  "summary": {
    "total_days": 7,
    "days_logged": 6,
    "average_calories": 2050
  }
}
```

---

#### 5. **GET /api/logs/calendar** - Monthly Calendar View

Get calendar overview for a specific month.

**Query Parameters:**
- `year` (required) - Year (2000-2100)
- `month` (required) - Month (1-12)

**Example Request:**
```
GET /api/logs/calendar?year=2025&month=10
Authorization: Bearer <token>
```

**Example Response:**
```json
{
  "success": true,
  "calendar": [
    {
      "date": "2025-10-01",
      "total_calories": 2100,
      "meals_count": 8,
      "goal_met": true,
      "has_weight_log": false
    },
    {
      "date": "2025-10-02",
      "total_calories": 1850,
      "meals_count": 6,
      "goal_met": false,
      "has_weight_log": true
    }
  ]
}
```

---

### Weight Tracking Endpoints

#### 6. **POST /api/weight/log** - Log Body Weight

**Request Body:**
- `weight_kg` (required) - Weight in kilograms (20-300)
- `log_date` (optional) - Date in YYYY-MM-DD format, defaults to today
- `notes` (optional) - Text notes (max 500 chars)

**Validation:**
- Weight must be between 20 and 300 kg
- Log date cannot be in the future
- Only one weight entry per date (use PUT to update)

**Example Request:**
```json
POST /api/weight/log
Authorization: Bearer <token>
Content-Type: application/json

{
  "weight_kg": 75.5,
  "log_date": "2025-10-09",
  "notes": "Morning weight before breakfast"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 12,
    "weight_kg": 75.5,
    "log_date": "2025-10-09",
    "notes": "Morning weight before breakfast",
    "change_from_previous": -0.3
  }
}
```

---

#### 7. **GET /api/weight/history** - Weight History with Trends

Get weight history with trend analysis.

**Query Parameters:**
- `days` (optional) - Number of days to retrieve (1-365), default: 30

**Example Request:**
```
GET /api/weight/history?days=30
Authorization: Bearer <token>
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "weight_kg": 75.5,
      "log_date": "2025-10-09",
      "log_time": "2025-10-09T07:30:00Z",
      "notes": "Morning weight",
      "change_from_previous": -0.3,
      "change_from_start": -2.5
    }
  ],
  "summary": {
    "current_weight": 75.5,
    "starting_weight": 78.0,
    "total_change": -2.5,
    "average_change_per_week": -0.6,
    "trend": "decreasing"
  }
}
```

**Trend Values:**
- `"decreasing"` - Lost more than 0.5 kg
- `"increasing"` - Gained more than 0.5 kg
- `"stable"` - Changed less than 0.5 kg

---

#### 8. **PUT /api/weight/:id** - Update Weight Log

**Request Body:**
- `weight_kg` (optional) - Updated weight (20-300 kg)
- `notes` (optional) - Updated notes

**Example Request:**
```json
PUT /api/weight/12
Authorization: Bearer <token>
Content-Type: application/json

{
  "weight_kg": 75.7,
  "notes": "Updated measurement - after breakfast"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Weight log updated successfully",
  "data": {
    "id": 12,
    "weight_kg": 75.7,
    "log_date": "2025-10-09",
    "log_time": "2025-10-09T07:30:00Z",
    "notes": "Updated measurement - after breakfast"
  }
}
```

---

#### 9. **DELETE /api/weight/:id** - Delete Weight Log

**Example Request:**
```
DELETE /api/weight/12
Authorization: Bearer <token>
```

**Example Response:**
```json
{
  "success": true,
  "message": "Weight log deleted successfully"
}
```

---

## 🔒 Security & Validation

### Authentication
- All endpoints require JWT authentication via `Authorization: Bearer <token>` header
- Users can only access/modify their own data

### Input Validation
- All dates validated in YYYY-MM-DD format
- Future dates rejected (except today)
- Meal categories validated against whitelist
- Weight range: 20-300 kg
- Text fields sanitized and length-limited

### Error Responses
All errors follow consistent format:
```json
{
  "success": false,
  "error": "Descriptive error message",
  "details": [...]  // Optional validation details
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Validation error / Bad request
- `401` - Unauthorized (no/invalid token)
- `404` - Resource not found
- `500` - Server error

---

## 🧪 Testing Scenarios

### 1. Meal Category Logging
```bash
# Log breakfast
curl -X POST http://localhost:3000/api/logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Scrambled Eggs",
    "quantity": 150,
    "unit": "g",
    "calories": 210,
    "meal_category": "breakfast",
    "meal_time": "07:30:00"
  }'
```

### 2. Past Date Logging
```bash
# Log food from 3 days ago
curl -X POST http://localhost:3000/api/logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chicken Salad",
    "quantity": 300,
    "unit": "g",
    "calories": 350,
    "log_date": "2025-10-06",
    "meal_category": "lunch"
  }'
```

### 3. Future Date Rejection
```bash
# Should fail - future date
curl -X POST http://localhost:3000/api/logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza",
    "quantity": 200,
    "unit": "g",
    "calories": 600,
    "log_date": "2025-10-15"
  }'
# Expected: {"success": false, "error": "Cannot log food for future dates"}
```

### 4. Weight Tracking
```bash
# Log today's weight
curl -X POST http://localhost:3000/api/weight/log \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "weight_kg": 75.5,
    "notes": "Morning weight"
  }'

# Get weight history
curl -X GET "http://localhost:3000/api/weight/history?days=30" \
  -H "Authorization: Bearer <token>"
```

### 5. Calendar View
```bash
# Get October 2025 calendar
curl -X GET "http://localhost:3000/api/logs/calendar?year=2025&month=10" \
  -H "Authorization: Bearer <token>"
```

### 6. Date Range Query
```bash
# Get last week's data
curl -X GET "http://localhost:3000/api/logs/range?start_date=2025-10-02&end_date=2025-10-09" \
  -H "Authorization: Bearer <token>"
```

### 7. Duplicate Weight Check
```bash
# Try to log weight for same date twice (should fail)
curl -X POST http://localhost:3000/api/weight/log \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"weight_kg": 76.0, "log_date": "2025-10-09"}'
# Expected: {"success": false, "error": "Weight already logged for this date. Use PUT to update."}
```

---

## 📊 Performance Considerations

### Database Indexes
- `food_logs`: Composite index on (user_id, log_date, meal_category) for fast filtering
- `weight_logs`: Composite index on (user_id, log_date) for history queries
- UNIQUE constraint on (user_id, log_date) in weight_logs prevents duplicates

### Query Optimization
- All date range queries limited to 90 days maximum
- Calendar queries optimized to fetch only summary data
- Weight trend calculations done in-memory on filtered result sets

---

## 🚀 Next Steps - Frontend Implementation

### UI Components Needed

1. **Meal Category Selector**
   - Dropdown or button group for breakfast/lunch/dinner/snack/other
   - Default to "other" or auto-detect based on time

2. **Date Picker**
   - Allow selecting past dates (not future)
   - Visual indicator for dates with existing logs

3. **Calendar View**
   - Monthly grid with daily calorie totals
   - Color coding for goal achievement
   - Click to view day details

4. **Weight Tracking Dashboard**
   - Line chart showing weight trend over time
   - Input form for logging daily weight
   - Statistics: current weight, change from start, weekly average

5. **Meal Timeline View**
   - Group foods by meal category
   - Show meal times
   - Visual breakdown of daily calories by meal

### Recommended Frontend Stack Updates

**State Management:**
- Add meal category to food log forms
- Cache calendar data for current month
- Store weight history for trend visualization

**API Integration:**
- Update food logging to include meal_category and log_date
- Fetch calendar data for month view
- Poll weight history for dashboard

**UI/UX Enhancements:**
- Show meal category badges in food list
- Color code meals (breakfast=yellow, lunch=blue, dinner=orange, snack=green)
- Add "Log Yesterday's Food" quick action
- Weight graph with goal line overlay

---

## 📝 Migration Notes

- **Backward Compatible:** Existing food logs work without meal_category (defaults to 'other')
- **No Data Loss:** All existing logs retained, new columns added
- **Optional Features:** Meal categories and weight tracking are optional enhancements
- **Rollback Available:** Migration file includes rollback SQL (commented)

---

## 📞 Support & Questions

For issues or questions about these new features:
1. Check API health endpoint: `GET /health`
2. Review validation error details in response
3. Verify JWT token is valid and not expired
4. Check server logs: `pm2 logs calorie-tracker-api`

---

**Implementation Date:** October 9, 2025  
**API Version:** 1.0.0  
**Database Migration:** `add_meal_categories_and_weight_tracking.sql`
