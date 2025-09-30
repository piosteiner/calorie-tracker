# Frontend Update: Standardize to Grams Only

## Summary
Your backend has been updated to standardize all foods to use **grams (g)** as the unit. Here's what you need to update in your frontend:

## HTML Changes Required

In your `index.html`, find the unit dropdown and replace it with:

```html
<!-- OLD: Multiple unit options -->
<div class="input-group">
    <label for="unit">Unit</label>
    <select id="unit" name="unit" required>
        <option value="pieces">Pieces</option>
        <option value="grams">Grams</option>
        <option value="cups">Cups</option>
        <option value="tablespoons">Tablespoons</option>
        <option value="ounces">Ounces</option>
    </select>
</div>

<!-- NEW: Grams only -->
<div class="input-group">
    <label for="unit">Unit (grams)</label>
    <input type="hidden" id="unit" name="unit" value="g">
    <span class="unit-display">grams (g)</span>
</div>
```

Or even simpler, just fix the dropdown to only show grams:

```html
<div class="input-group">
    <label for="unit">Unit</label>
    <select id="unit" name="unit" required>
        <option value="g" selected>Grams (g)</option>
    </select>
</div>
```

## JavaScript Changes Required

In your `script.js`, update any unit-related logic:

### 1. Update `calculateCalories()` method
Since everything is now in grams, the calculation becomes simpler:

```javascript
calculateCalories(caloriesPer100g, quantity, unit, baseUnit) {
    // Now everything is per 100g, so simple proportion
    return Math.round((caloriesPer100g / 100) * quantity);
}
```

### 2. Update food display logic
Update any unit display logic to show "g" consistently:

```javascript
// In food suggestions and displays, ensure unit shows as 'g'
unit: food.unit || 'g'
```

## Backend Changes Applied

✅ **Database**: All foods now use 'g' as default_unit
✅ **API Responses**: External foods include `unit: 'g'`
✅ **Consistent Calculation**: All calories calculated per gram basis

## Benefits of Grams-Only System

1. **🎯 Precision**: Users can be exact with portions
2. **📏 Consistency**: No unit conversion confusion  
3. **🌍 International**: Grams are universally understood
4. **⚡ Simplicity**: Easier calculations and UI
5. **📊 Nutrition Labels**: Most nutrition info is per 100g

## Testing

After frontend updates, test:
- Food search shows grams as unit
- Food logging accepts gram quantities  
- Calorie calculations are accurate
- Display shows "g" consistently

Your database is ready - just update the frontend to match! 🚀