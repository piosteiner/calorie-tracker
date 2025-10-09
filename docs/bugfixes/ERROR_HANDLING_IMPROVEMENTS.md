# Error Handling Improvements - Food Deletion

## Summary
Enhanced the admin panel's food deletion functionality to properly display backend error messages when deletion fails due to validation errors (e.g., food is in use).

## Changes Made

### 1. Enhanced `apiCall()` Method (Lines 598-645)
**What Changed:**
- Modified error handling to preserve full error response data
- Added `error.statusCode` to track HTTP status codes
- Added `error.data` to preserve complete backend response including `details` and `usageCount`

**Why:**
- Previously, only the error message was preserved
- Now we can access detailed information like `usageCount` and `reason` from backend

**Code:**
```javascript
// Create an error object with both message and full data
const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
error.statusCode = response.status;
error.data = errorData; // Preserve full error data including details
throw error;
```

### 2. Enhanced Single Food Deletion (Lines ~2173-2200)
**What Changed:**
- Added detailed error message display from backend
- Check for `error.data.message` and display it to user
- Show usage count when food is in use
- Only fallback to local deletion for connection errors, not validation errors

**User Experience:**
- ✅ **Before:** Silent failure or generic "Failed to delete" message
- ✅ **After:** Clear message: "Cannot delete this food because it has been logged 5 times by users..."

**Code:**
```javascript
if (error.data && error.data.message) {
    const message = error.data.message;
    const usageCount = error.data.details?.usageCount;
    
    if (usageCount !== undefined) {
        this.showMessage(message, 'error');
        logger.warn(`Cannot delete food ${foodId}: Used in ${usageCount} food log entries`);
    } else {
        this.showMessage(message, 'error');
    }
    return; // Don't try local fallback for backend validation errors
}
```

### 3. Enhanced Bulk Food Deletion (Lines 1482-1580)
**What Changed:**
- Track which foods failed to delete and why
- Build detailed error report with food names and reasons
- Distinguish between validation errors (food in use) and other errors
- Show comprehensive summary message

**User Experience:**
- ✅ **Before:** Generic message "5 succeeded, 2 failed"
- ✅ **After:** Detailed report showing which foods failed and why:
  ```
  Deleted 5 foods, but 2 failed.
  
  Failed foods:
  "apple" (logged 5 times)
  "banana" (logged 3 times)
  ```

**Code:**
```javascript
const failedFoods = []; // Track foods that couldn't be deleted

// In error handling:
if (error.data && error.data.details?.reason === 'FOOD_IN_USE') {
    const usageCount = error.data.details.usageCount;
    failedFoods.push(`"${foodName}" (logged ${usageCount} time${usageCount > 1 ? 's' : ''})`);
}

// Show detailed result:
this.showMessage(
    `Deleted ${successCount} foods, but ${failCount} failed.\n\n` +
    `Failed foods:\n${failedFoods.join('\n')}`,
    'warning'
);
```

## Backend Error Format (Reference)

The backend sends errors in this format:

```json
{
  "success": false,
  "message": "Cannot delete this food because it has been logged 5 times by users. To delete this food, you must first remove all associated food log entries.",
  "details": {
    "usageCount": 5,
    "reason": "FOOD_IN_USE"
  }
}
```

## Error Scenarios Handled

### 1. ✅ Food In Use (HTTP 400)
- **Backend Response:** Detailed message with usage count
- **Frontend Display:** Shows full error message to user
- **Example:** "Cannot delete this food because it has been logged 5 times by users..."

### 2. ✅ Food Not Found (HTTP 404)
- **Backend Response:** "Food not found"
- **Frontend Display:** Shows error message
- **Fallback:** None (error is displayed)

### 3. ✅ Server Error (HTTP 500)
- **Backend Response:** Error message
- **Frontend Display:** Shows error to user
- **Fallback:** None for validation errors

### 4. ✅ Connection Error
- **Backend Response:** Network error / timeout
- **Frontend Display:** Shows connection error
- **Fallback:** Attempts local deletion (demo mode)

## Testing Instructions

### Test Case 1: Delete Food In Use
1. Log in as admin
2. Go to "Pios Food DB" section
3. Try to delete "apple" (ID: 1)
4. **Expected:** Error message appears: "Cannot delete this food because it has been logged 5 times by users..."
5. **Expected:** Food remains in the list

### Test Case 2: Delete Unused Food
1. Add a new test food that has never been logged
2. Try to delete it
3. **Expected:** Success message: "Food deleted successfully from Pios Food DB"
4. **Expected:** Food is removed from the list

### Test Case 3: Bulk Delete Mixed
1. Select multiple foods (some used, some unused)
2. Click "Delete Selected"
3. **Expected:** Detailed message showing:
   - How many succeeded
   - How many failed
   - List of failed foods with reasons

### Test Case 4: Bulk Delete All In Use
1. Select only "apple" and other logged foods
2. Click "Delete Selected"
3. **Expected:** Error message with list of all foods that couldn't be deleted

## Benefits

1. **✅ User Clarity:** Users now understand WHY deletion failed
2. **✅ Actionable Feedback:** Users know they need to delete food logs first
3. **✅ Transparency:** Shows usage count so users know how many logs to delete
4. **✅ Better UX:** No more silent failures or generic errors
5. **✅ Professional:** Matches industry-standard error handling patterns

## Files Modified

- `script.js`:
  - `apiCall()` method (~lines 598-645)
  - Single food deletion (~lines 2173-2200)
  - Bulk food deletion (~lines 1482-1580)

## No Breaking Changes

- All existing functionality preserved
- Fallback to local deletion still works for connection errors
- Only validation errors now properly display backend messages
- Success messages unchanged

## Next Steps (Optional Enhancements)

1. **Add confirmation before forcing delete:**
   - Could add a "Force Delete" option that first deletes all logs
   - Would require additional backend endpoint

2. **Show affected users:**
   - Display which users have logged this food
   - Helpful for admins to contact users if needed

3. **Batch log deletion:**
   - Add admin tool to delete all logs for a specific food
   - Then allow food deletion

4. **Visual indicators:**
   - Show badge on foods that have been logged
   - Indicate "deletable" vs "in-use" status in the table
