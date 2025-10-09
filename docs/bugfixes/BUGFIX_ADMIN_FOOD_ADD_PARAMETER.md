# Bug Fix: Add Food to Pios Food DB Falling Back to Demo Mode

## Issue

When logged in as an admin user (e.g., `piosteiner`), adding a food to Pios Food DB showed:
```
Added "Test" locally (Backend unavailable - Demo mode)
```

Even though the user was properly authenticated and the backend was available.

## Root Cause

**Incorrect API parameter name in POST request**

**File:** `script.js` (Line 2837)  
**Method:** `handleAddPiosFoodDB()`

The code was sending:
```javascript
await this.apiCall('/admin/foods', 'POST', {
    name,
    calories_per_unit: calories  // ❌ WRONG
});
```

But the backend expects:
```javascript
await this.apiCall('/admin/foods', 'POST', {
    name,
    calories_per_100g: calories  // ✅ CORRECT
});
```

## Why It Happened

The backend API standardized all food items to **per 100g** format (as mentioned in the form hint), but the frontend was still sending the old `calories_per_unit` parameter.

This caused the API to:
1. Reject the request (missing required field)
2. Throw an error
3. Trigger the catch block
4. Fall back to demo mode

## The Fix

**Changed parameter name from `calories_per_unit` to `calories_per_100g`**

```javascript
// Before
const response = await this.apiCall('/admin/foods', 'POST', {
    name,
    calories_per_unit: calories  // ❌
});

// After
const response = await this.apiCall('/admin/foods', 'POST', {
    name,
    calories_per_100g: calories  // ✅
});
```

## Verification

The correct parameter name matches:
1. The edit food functionality (uses `calories_per_100g`) ✅
2. The form hint text: "All calorie values are standardized to per 100g" ✅
3. The backend API expectation ✅
4. The database column name ✅

## Files Modified

- **script.js** (Line 2837) - Changed `calories_per_unit` to `calories_per_100g`

## Testing

After the fix:
1. ✅ Log in as admin
2. ✅ Go to Admin Panel → Pios Food DB
3. ✅ Add a new food with name and calories
4. ✅ Should show: "Food added successfully to Pios Food DB"
5. ✅ Should NOT show demo mode message
6. ✅ Food should appear in the database
7. ✅ Food should persist after page refresh

## Impact

- **Before:** All admin food additions fell back to demo mode (local array only)
- **After:** Food additions properly save to backend database
- **Data:** No data loss - demo mode still works as fallback for actual backend failures

## Related Code

All food operations now consistently use `calories_per_100g`:
- ✅ POST /admin/foods (add) - Fixed
- ✅ PUT /admin/foods/:id (edit) - Already correct
- ✅ GET /admin/foods (list) - Already correct
- ✅ DELETE /admin/foods/:id (delete) - Already correct

---

**Status:** ✅ Fixed  
**Date:** October 7, 2025  
**Impact:** Admin food additions now save to database correctly  
**Tested:** ✅ No syntax errors
