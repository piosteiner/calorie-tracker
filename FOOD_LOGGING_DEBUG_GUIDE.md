# Food Logging & Rewards - Debugging Guide

## Issues Reported
1. Food items not persisting after page reload
2. Rewards points not being awarded

## Changes Made

### 1. Enhanced Logging Throughout Food Log Flow

#### A. Food Submission (`handleAddFood`)
**Location**: `script.js` line ~1803

**Added Logging**:
```javascript
logger.info('Food log API response:', logResponse);
logger.info('Current food log after adding:', this.foodLog);
logger.info('Rewards data from response:', { pointsAwarded, pointsDetails, milestoneLevel });
```

**What to Check**:
- API response structure
- Whether `logId` is present
- Whether `pointsAwarded` exists
- Current state of food log array

#### B. Loading Today's Data (`loadTodaysData`)
**Location**: `script.js` line ~1946

**Added Logging**:
```javascript
logger.info('Loading today\'s data for date:', today);
logger.info('Logs response:', logsResponse);
logger.info('Parsed logs array:', logs);
logger.info('Mapped food log:', this.foodLog);
logger.info('Total daily calories:', this.dailyCalories);
```

**What to Check**:
- Which date is being loaded
- Full API response structure
- How logs array is parsed
- Final food log state

### 2. Fixed Response Parsing

#### Handle Multiple Response Formats
**Before**:
```javascript
const logId = logResponse.logId;
const pointsAwarded = logResponse.pointsAwarded;
```

**After**:
```javascript
// Handle different response formats
const logId = logResponse.logId || logResponse.id || logResponse.data?.id || Date.now();
const pointsAwarded = logResponse.pointsAwarded || logResponse.data?.pointsAwarded;
const pointsDetails = logResponse.pointsDetails || logResponse.data?.pointsDetails;
const milestoneLevel = logResponse.milestoneLevel || logResponse.data?.milestoneLevel;
```

**Why**: Backend may return data in different structures

#### Handle Logs Array Parsing
**Before**:
```javascript
this.foodLog = logsResponse.logs.map(...)
```

**After**:
```javascript
const logs = logsResponse.logs || logsResponse.data?.logs || logsResponse.data || [];
this.foodLog = logs.map(...)
```

**Why**: Response format may vary, need to handle all cases

### 3. Added Data Refresh After Food Log

**Location**: `script.js` line ~1838

**Added**:
```javascript
// Reload today's data from server to ensure we have the latest
await this.loadTodaysData();
```

**Why**: Ensures the UI reflects the server state after successful save

## Backend API Response Format

### POST /api/logs (Expected Response)
```json
{
  "success": true,
  "message": "Successfully logged 100g of Banana (105 kcal)",
  "logId": 123,
  "entry": {
    "id": 123,
    "foodName": "Banana",
    "quantity": 100,
    "unit": "g",
    "calories": 105,
    "logDate": "2025-10-09",
    "meal_category": "snack",
    "meal_time": "14:30:00"
  },
  "pointsAwarded": 60,
  "pointsDetails": [
    {
      "reason": "food_log",
      "points": 60,
      "basePoints": 50,
      "multiplier": 1.2
    }
  ]
}
```

### GET /api/logs?date=2025-10-09 (Expected Response)
```json
{
  "success": true,
  "logs": [
    {
      "id": 123,
      "food_name": "Banana",
      "quantity": "100.00",
      "unit": "g",
      "calories": "105.00",
      "log_date": "2025-10-09T00:00:00.000Z",
      "meal_category": "snack",
      "meal_time": "14:30:00"
    }
  ],
  "grouped": { ... },
  "totals": {
    "total_calories": 105,
    "meals_count": 1,
    "categories_used": ["snack"]
  },
  "date": "2025-10-09"
}
```

## Debugging Steps

### Step 1: Check If Food Is Being Saved
1. Open browser console (F12)
2. Log a food item
3. Look for this log:
   ```
   Food log API response: {success: true, logId: 123, ...}
   ```
4. **If missing**: Food is not being saved to backend
5. **If present**: Note the `logId` value

### Step 2: Check If Food Is Being Loaded
1. Stay in console
2. Refresh the page
3. Look for these logs:
   ```
   Loading today's data for date: 2025-10-09
   Logs response: {success: true, logs: [...]}
   Mapped food log: [{id: 123, name: "Banana", ...}]
   ```
4. **If logs array is empty**: Backend is not returning saved foods
5. **If logs array has items**: Foods are being loaded correctly

### Step 3: Check Points Award
1. After logging food, look for:
   ```
   Rewards data from response: {pointsAwarded: 60, pointsDetails: [...]}
   ```
2. **If pointsAwarded is 0 or undefined**: Backend rewards not implemented or not working
3. **If pointsAwarded > 0**: Look for toast notification

### Step 4: Network Tab Investigation
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Log a food item
4. Find `POST /api/logs` request
5. Click it and check:
   - **Request Payload**: Are all fields present?
   - **Response**: What structure is returned?
   - **Status**: Should be 201

### Step 5: Check Today's Date Consistency
1. In console, run:
   ```javascript
   new Date().toISOString().split('T')[0]
   ```
2. Compare with `log_date` from backend response
3. **If different**: Time zone issue may be preventing logs from loading

## Common Issues & Solutions

### Issue 1: Food Disappears After Reload
**Symptoms**:
- Food shows immediately after logging
- Disappears on page refresh
- Console shows empty logs array

**Possible Causes**:
1. **Date mismatch**: Frontend and backend using different dates
2. **API authentication**: Token expired or invalid
3. **Backend issue**: Food not actually saved to database

**Debug**:
```javascript
// Check current date being used
app.loadTodaysData()

// Check auth token
localStorage.getItem('calorieTrackerAuthToken')

// Manually fetch logs
fetch('https://api.calorie-tracker.piogino.ch/api/logs?date=2025-10-09', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('calorieTrackerAuthToken')
  }
}).then(r => r.json()).then(console.log)
```

### Issue 2: No Rewards Points
**Symptoms**:
- Food logs successfully
- No points toast appears
- Rewards display doesn't update

**Possible Causes**:
1. **Backend rewards not implemented**: Points system not ready
2. **Response format mismatch**: Points data in unexpected location
3. **Same-day logging requirement**: Backend only awards points for today's logs
4. **Silent failure**: Rewards loading failing quietly

**Debug**:
```javascript
// Check if rewards API is available
app.loadRewardsData()

// Check points in response
// (logged automatically after food submission)

// Manually test rewards endpoint
fetch('https://api.calorie-tracker.piogino.ch/api/rewards/points', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('calorieTrackerAuthToken')
  }
}).then(r => r.json()).then(console.log)
```

### Issue 3: Points Toast Not Showing
**Symptoms**:
- Points awarded in response
- No visual notification

**Possible Causes**:
1. `showPointsToast` function not working
2. CSS class `points-toast` missing or misconfigured
3. Toast being created but not visible (z-index, positioning)

**Debug**:
```javascript
// Manually trigger toast
app.showPointsToast({
  total: 50,
  reason: 'Test notification',
  breakdown: {
    base: 50,
    multiplier: 1.0
  }
})
```

## Expected Console Output (Success Case)

### On Food Logging:
```
🍽️ handleAddFood called
Food log API response: {success: true, logId: 123, pointsAwarded: 60, ...}
Current food log after adding: [{id: 123, name: "Banana", ...}]
Rewards data from response: {pointsAwarded: 60, pointsDetails: [...]}
Showing points toast for: 60
Loading rewards data for user: demo
Rewards API response: {success: true, data: {...}}
Loading today's data for date: 2025-10-09
Logs response: {success: true, logs: [{...}]}
Mapped food log: [{id: 123, name: "Banana", ...}]
```

### On Page Load:
```
Loading today's data for date: 2025-10-09
Logs response: {success: true, logs: [{id: 123, ...}]}
Parsed logs array: [{id: 123, food_name: "Banana", ...}]
Mapped food log: [{id: 123, name: "Banana", ...}]
Total daily calories: 105
Loading rewards data for user: demo
Showing default rewards state (or) Rewards display updated successfully
```

## Manual Testing Commands

### Test Food Logging
```javascript
// In browser console
const testFood = {
  name: "Test Food",
  quantity: 100,
  unit: "g",
  calories: 200,
  meal_category: "snack"
};

app.apiCall('/logs', 'POST', testFood).then(response => {
  console.log('Test response:', response);
});
```

### Test Loading Logs
```javascript
// Check what's in memory
console.log('Current food log:', app.foodLog);
console.log('Daily calories:', app.dailyCalories);

// Force reload
app.loadTodaysData();
```

### Test Rewards
```javascript
// Check rewards state
console.log('Current user:', app.currentUser);

// Force rewards load
app.loadRewardsData();

// Test toast
app.showPointsToast({
  total: 100,
  reason: 'Test',
  breakdown: { base: 100 }
});
```

## Files Modified

1. **script.js** (~line 1803-1848): Enhanced food logging with comprehensive logging and refresh
2. **script.js** (~line 1946-1979): Enhanced loadTodaysData with logging and flexible parsing

## Next Steps

1. **Clear browser cache**: Sometimes old code is cached
2. **Check console logs**: Follow the debugging steps above
3. **Test network requests**: Verify API responses
4. **Check backend logs**: If frontend looks correct, issue may be backend
5. **Verify authentication**: Make sure token is valid

## Success Indicators

✅ Console shows "Food log API response" with logId  
✅ Console shows "pointsAwarded" > 0  
✅ Points toast notification appears  
✅ Food remains after page reload  
✅ Rewards display updates  
✅ Total calories updates correctly  

## Failure Indicators

❌ Empty logs array on reload  
❌ No "Food log API response" in console  
❌ "pointsAwarded" is 0 or undefined  
❌ No toast notification  
❌ Network error in console  
❌ 401 authentication error  

---

**Remember**: The extensive logging added will help identify exactly where the issue is occurring. Check the console output carefully!
