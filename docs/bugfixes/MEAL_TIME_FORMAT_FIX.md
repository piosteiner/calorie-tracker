# Food Logging Validation Error Fix

## Problem
Food logging was failing with a **400 Validation failed** error from the backend. The food appeared briefly in the UI but disappeared after page refresh because the backend rejected the data.

## Root Cause
**Time Format Mismatch**

The HTML time input (`<input type="time">`) returns time in `HH:MM` format (e.g., "18:39"), but the backend validation expects `HH:MM:SS` format (e.g., "18:39:00").

### Backend Validation (logs.js)
```javascript
body('meal_time')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage('Meal time must be in HH:MM:SS format')
```

### Frontend Issue
```javascript
// ❌ OLD - Missing seconds
const mealTime = document.getElementById('mealTime')?.value || null;
// Returns: "18:39" (HH:MM format)
```

### Error in Console
```
POST https://api.calorie-tracker.piogino.ch/api/logs
[HTTP/2 400  23ms]
[ERROR] API Error (400): Validation failed
```

## Solution

Added seconds (":00") to the time value before sending to backend:

### In `handleAddFood()` (lines ~1755-1760)
```javascript
// ✅ NEW - Convert to HH:MM:SS format
const mealTimeInput = document.getElementById('mealTime')?.value || null;
// Convert HH:MM to HH:MM:SS format for backend
const mealTime = mealTimeInput ? `${mealTimeInput}:00` : null;
// Returns: "18:39:00" (HH:MM:SS format)
```

### In `handleAddEnhancedFood()` (lines ~1920-1927)
```javascript
// ✅ NEW - Convert to HH:MM:SS format
const mealTimeInput = document.getElementById('mealTime')?.value || null;
// Convert HH:MM to HH:MM:SS format for backend
const mealTime = mealTimeInput ? `${mealTimeInput}:00` : null;
```

## Data Flow

### Before Fix
```
User selects: 18:39 in time input
  ↓
Frontend reads: "18:39"
  ↓
Sent to backend: { meal_time: "18:39" }
  ↓
Backend validation: ❌ FAIL - Regex expects HH:MM:SS
  ↓
Result: 400 Validation failed
```

### After Fix
```
User selects: 18:39 in time input
  ↓
Frontend reads: "18:39"
  ↓
Frontend converts: "18:39" → "18:39:00"
  ↓
Sent to backend: { meal_time: "18:39:00" }
  ↓
Backend validation: ✅ PASS - Matches HH:MM:SS regex
  ↓
Result: 201 Created, food saved successfully
```

## Additional Improvements

### Enhanced Error Logging
Added detailed validation error logging to help debug future issues:

```javascript
if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    
    if (showError && !silent) {
        logger.error(`API Error (${response.status}):`, errorData.error || errorData.message);
        
        // Log validation details if present
        if (errorData.details) {
            logger.error('Validation errors:', errorData.details);
            console.error('📋 Full validation details:', errorData.details);
        }
        
        // Show error notification
        const errorMessage = this.getHttpErrorMessage(response.status, errorData);
        this.notifications.error(errorMessage);
    }
}
```

Now when validation fails, the console will show the specific field errors.

## Testing

After this fix, food logging should:
- ✅ Save to backend database
- ✅ Persist after page refresh
- ✅ Display correct calories in summary
- ✅ Award reward points
- ✅ Work with all meal categories and times

## Related Files
- `script.js` (handleAddFood, handleAddEnhancedFood)
- `backend/routes/logs.js` (validation schema)

## Date
October 9, 2025
