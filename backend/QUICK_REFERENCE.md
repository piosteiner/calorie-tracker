# 🚀 Quick Reference Card - New API Features

## Quick Endpoint Reference

### 🍽️ Food Logging with Meal Categories

```bash
# Log breakfast
POST /api/logs
{
  "name": "Oatmeal",
  "quantity": 80, "unit": "g", "calories": 300,
  "meal_category": "breakfast",
  "meal_time": "08:00:00",
  "log_date": "2025-10-09"
}

# Get today's meals (grouped by category)
GET /api/logs?date=2025-10-09

# Update meal category
PUT /api/logs/45
{ "meal_category": "lunch" }
```

### ⚖️ Weight Tracking

```bash
# Log today's weight
POST /api/weight/log
{ "weight_kg": 75.5, "notes": "Morning weight" }

# Get 30-day history with trends
GET /api/weight/history?days=30

# Update weight entry
PUT /api/weight/12
{ "weight_kg": 75.7 }

# Delete weight entry
DELETE /api/weight/12
```

### 📅 Date Range & Calendar

```bash
# Get last 7 days of data
GET /api/logs/range?start_date=2025-10-02&end_date=2025-10-09

# Get October calendar view
GET /api/logs/calendar?year=2025&month=10
```

## Meal Categories

- `breakfast` - Morning meals
- `lunch` - Midday meals
- `dinner` - Evening meals
- `snack` - Between-meal foods
- `other` - Default/uncategorized

## Response Structure Examples

### Grouped Meals Response
```json
{
  "logs": [...],
  "grouped": {
    "breakfast": { "foods": [...], "total_calories": 450 },
    "lunch": { "foods": [...], "total_calories": 680 }
  },
  "totals": {
    "total_calories": 1850,
    "meals_count": 12,
    "categories_used": ["breakfast", "lunch", "dinner"]
  }
}
```

### Weight History Response
```json
{
  "data": [{
    "weight_kg": 75.5,
    "log_date": "2025-10-09",
    "change_from_previous": -0.3,
    "change_from_start": -2.5
  }],
  "summary": {
    "current_weight": 75.5,
    "total_change": -2.5,
    "average_change_per_week": -0.6,
    "trend": "decreasing"
  }
}
```

### Calendar Response
```json
{
  "calendar": [{
    "date": "2025-10-01",
    "total_calories": 2100,
    "meals_count": 8,
    "goal_met": true,
    "has_weight_log": false
  }]
}
```

## Validation Rules

- **Dates:** YYYY-MM-DD format, no future dates
- **Weight:** 20-300 kg range
- **Meal Category:** Must be one of: breakfast, lunch, dinner, snack, other
- **Meal Time:** HH:MM:SS format (24-hour)
- **Date Range:** Maximum 90 days
- **Weight History:** Maximum 365 days

## Authentication

All endpoints require JWT Bearer token:
```bash
curl -H "Authorization: Bearer <your_jwt_token>" ...
```

## Common Errors

- `400` - Invalid date format / Future date / Invalid meal category
- `401` - Missing or invalid authentication token
- `404` - Resource not found (log entry, weight entry)
- `500` - Server error

## File Locations

- **Migration:** `/migrations/add_meal_categories_and_weight_tracking.sql`
- **Weight Routes:** `/routes/weight.js`
- **Full Docs:** `/docs/MEAL_CATEGORIES_AND_WEIGHT_TRACKING.md`
- **Summary:** `/IMPLEMENTATION_COMPLETE.md`
- **Test Script:** `/test-new-features.sh`

## Testing

```bash
# Health check
curl http://localhost:3000/health

# Run test script
./test-new-features.sh

# View logs
pm2 logs 3 --lines 50
```

## Database Tables

### food_logs (modified)
- Added: `meal_category` VARCHAR(20) DEFAULT 'other'
- Added: `meal_time` TIME NULL
- Added: INDEX `idx_user_date_category`

### weight_logs (new)
- `id`, `user_id`, `weight_kg`, `log_date`, `notes`
- UNIQUE constraint on (user_id, log_date)

---

**Ready for Frontend! 🎨**

Next: Implement UI components for meal categories, date picker, calendar view, and weight tracking dashboard.
