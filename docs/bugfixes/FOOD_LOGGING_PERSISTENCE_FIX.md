# Food Logging Persistence Fix

## Problem
Food items appeared in the log after being added but disappeared after page reload. Calories weren't added to the summary and no reward points were awarded.

## Root Cause
The frontend had multiple critical issues:

### 1. **Wrong Property Name in API Request**
- **Issue**: Frontend was sending `log_date` (snake_case) but backend expected `logDate` (camelCase)
- **Impact**: Backend wasn't receiving the date field correctly

### 2. **Premature UI Updates in `handleAddFood()`**
- **Issue**: Code was updating local state (`this.foodLog` and `this.dailyCalories`) immediately after API call without verifying success
- **Impact**: UI showed the food even if backend save failed
- **Code Flow**: 
  ```javascript
  // ❌ OLD (WRONG)
  await this.apiCall('/logs', 'POST', logData);
  this.foodLog.push(foodEntry);  // ← Updates UI immediately
  this.dailyCalories += calories;
  this.updateDashboard();
  this.updateFoodLog();
  await this.loadTodaysData();  // ← Loads from backend (which may not have the data)
  ```

### 3. **`handleAddEnhancedFood()` Not Sending to Backend**
- **Issue**: When selecting food from search suggestions, the function only updated local UI state and never sent data to backend
- **Impact**: Any food added through search disappeared immediately on reload
- **Missing**: No API call to `/logs` endpoint

## Solution

### Fix 1: Correct Property Names
Changed all instances from `log_date` to `logDate` to match backend expectations:
```javascript
logData = {
    foodId: food.id,
    quantity,
    unit,
    calories,
    logDate: logDate,  // ← Fixed from log_date
    meal_category: mealCategory,
    meal_time: mealTime
};
```

### Fix 2: Proper State Management in `handleAddFood()`
Now verifies backend save success before updating UI, and reloads all data from server:
```javascript
// ✅ NEW (CORRECT)
const logResponse = await this.apiCall('/logs', 'POST', logData);

// Verify success
if (!logResponse || !logResponse.success) {
    throw new Error('Failed to save food log to backend');
}

// Reload ALL data from server (single source of truth)
await this.loadTodaysData();  // ← This updates foodLog, dailyCalories, and UI

// No manual UI updates needed - loadTodaysData() handles it
```

### Fix 3: Fixed `handleAddEnhancedFood()`
Added proper backend integration:
```javascript
async handleAddEnhancedFood(foodData, quantity, unit) {
    if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
        // Send to backend
        const logData = {
            foodId: foodData.id || undefined,
            name: foodData.name,
            quantity,
            unit: 'g',
            calories,
            logDate: logDate,
            meal_category: mealCategory,
            meal_time: mealTime
        };
        
        const logResponse = await this.apiCall('/logs', 'POST', logData);
        
        // Verify success and reload from server
        if (!logResponse || !logResponse.success) {
            throw new Error('Failed to save food log to backend');
        }
        
        await this.loadTodaysData();
        
        // Handle rewards from response
        // ...
    } else {
        // Offline mode fallback
    }
}
```

## Benefits

1. **Single Source of Truth**: Backend database is the authoritative source
2. **Consistent State**: UI always reflects what's actually in the database
3. **Proper Error Handling**: UI doesn't update if backend save fails
4. **Rewards Work**: Points are awarded because backend successfully saves the log
5. **Persistence**: Food logs survive page refreshes
6. **Accurate Calorie Totals**: Daily calories are calculated from backend data

## Testing Checklist

- [x] Log food through manual entry → appears in log
- [x] Log food through search selection → appears in log
- [x] Refresh page → food still appears
- [x] Calorie total updates correctly
- [x] Reward points are awarded
- [x] Offline mode still works (doesn't break)

## Files Modified
- `script.js`:
  - `handleAddFood()` function (lines ~1768-1863)
  - `handleAddEnhancedFood()` function (lines ~1876-1970)

## Related Issues
- Backend was already working correctly (verified with "Test apple" via backend)
- Issue was entirely in frontend code
- No database changes needed

## Date
October 9, 2025
