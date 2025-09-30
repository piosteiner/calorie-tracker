# Frontend Copilot Prompt - Complete System Integration

Hello! I need to update my calorie tracker frontend to integrate with the enhanced backend system. The backend has been significantly upgraded with food database management and standardized to use grams only.

## Current Backend Capabilities

### 🔧 API Endpoints Available
- `GET /api/foods/search?q=query` - Search local foods  
- `GET /api/external-foods/search?q=query&limit=10` - Search Open Food Facts (Swiss-prioritized)
- `POST /api/external-foods/log` - Log external food consumption
- `GET /api/admin/foods` - List all foods (admin only)
- `GET /api/admin/food-categories` - Food categories (admin only)
- `GET /api/admin/stats` - System statistics (admin only)

### 📊 Food Data Structure
All foods now return data in this format:
```json
{
  "id": "food_id",
  "name": "Swiss Apple",
  "calories": 52,
  "unit": "g",
  "source": "Local Database", // or "Open Food Facts"
  "protein": 0.3,
  "carbs": 13.8,
  "fat": 0.2,
  "fiber": 2.4,
  "brand": "Local Farm",
  "external_id": "1234567890" // for Open Food Facts foods
}
```

## Required Frontend Updates

### 1. Unit System - CRITICAL CHANGE
**Current Issue**: Frontend dropdown shows multiple units (Pieces, Grams, Cups, Tablespoons, Ounces)
**Required Change**: Standardize to grams only

**Update the unit dropdown in index.html:**
```html
<!-- Replace the existing unit select with: -->
<div class="input-group">
    <label for="unit">Unit</label>
    <select id="unit" name="unit" required>
        <option value="g" selected>Grams (g)</option>
    </select>
</div>
```

### 2. Hybrid Food Search Integration
**Current Issue**: Frontend calls Open Food Facts API directly, bypassing backend
**Required Change**: Use backend's hybrid search system

**Update searchAllFoodsWithFavorites() method in script.js:**
```javascript
async searchAllFoodsWithFavorites(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    // 1. Search favorites first (instant)
    const favorites = this.getFavorites().filter(food => 
        food.name.toLowerCase().includes(searchTerm)
    );
    results.push(...favorites.slice(0, 3).map(food => ({...food, source: `⭐ ${food.source}`})));
    
    // 2. Search offline database (instant fallback)
    const offlineResults = this.searchOfflineDatabase(query);
    results.push(...offlineResults.map(food => ({...food, source: 'Offline Database'})));
    
    // 3. Search backend (hybrid: local + external foods) if online
    if (this.isOnline && navigator.onLine && !CONFIG.DEVELOPMENT_MODE) {
        try {
            // Search local foods first
            const localResults = await this.searchLocalFoods(query, 5);
            results.push(...localResults);
            
            // Search external foods (Open Food Facts via backend)
            const externalResults = await this.searchBackendFoods(query, 8 - results.length);
            results.push(...externalResults);
            
        } catch (error) {
            console.log('Backend search failed, using offline only:', error);
        }
    }
    
    // Remove duplicates by name (keep first occurrence)
    const seen = new Set();
    const uniqueResults = results.filter(food => {
        const key = food.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    
    return uniqueResults;
}
```

**Add new searchLocalFoods() method:**
```javascript
async searchLocalFoods(query, limit = 10) {
    try {
        const response = await this.apiCall(`/foods/search?q=${encodeURIComponent(query)}`);
        if (response.success && response.foods) {
            return response.foods.map(food => ({
                id: food.id,
                name: food.name,
                calories: food.calories_per_unit || food.calories,
                unit: 'g', // All foods now use grams
                brand: food.brand || '',
                source: 'Local Database',
                protein: food.protein_per_100g || 0,
                carbs: food.carbs_per_100g || 0,
                fat: food.fat_per_100g || 0,
                fiber: food.fiber_per_100g || 0
            }));
        }
        return [];
    } catch (error) {
        console.error('Local food search error:', error);
        return [];
    }
}
```

**Update existing searchBackendFoods() method:**
```javascript
async searchBackendFoods(query, limit = 10) {
    try {
        const response = await this.apiCall(`/external-foods/search?q=${encodeURIComponent(query)}&limit=${limit}&source=openfoodfacts`);
        
        if (response.success && response.foods) {
            return response.foods.map(food => ({
                id: food.external_id || `off_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                external_id: food.external_id, // Store for logging
                name: food.name,
                calories: food.calories_per_100g || food.calories,
                unit: 'g', // Standard unit is grams
                brand: food.brand || '',
                source: 'Open Food Facts',
                protein: food.protein_per_100g || 0,
                carbs: food.carbs_per_100g || 0,
                fat: food.fat_per_100g || 0,
                fiber: food.fiber_per_100g || 0,
                cached: !!response.cached
            }));
        }
        return [];
    } catch (error) {
        console.error('Backend food search error:', error);
        return [];
    }
}
```

### 3. Enhanced Food Logging
**Update handleAddEnhancedFood() method for proper external food logging:**
```javascript
async handleAddEnhancedFood(foodData, quantity, unit) {
    try {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false, hour: '2-digit', minute: '2-digit'
        });

        // Calculate calories (everything is now per 100g basis)
        const calories = Math.round((foodData.calories / 100) * quantity);

        // Check if this is an external food that needs backend logging
        if (foodData.source === 'Open Food Facts' && foodData.external_id) {
            const logData = {
                external_food_id: foodData.external_id,
                name: foodData.name,
                quantity: quantity,
                unit: 'g', // Always grams now
                calories: calories,
                calories_per_100g: foodData.calories,
                protein_per_100g: foodData.protein || 0,
                carbs_per_100g: foodData.carbs || 0,
                fat_per_100g: foodData.fat || 0,
                fiber_per_100g: foodData.fiber || 0,
                brand: foodData.brand || null,
                source: 'Open Food Facts'
            };

            try {
                const response = await this.apiCall('/external-foods/log', 'POST', logData);
                
                if (response.success) {
                    // Add to local food log with backend log ID
                    const foodLogEntry = {
                        id: response.logId || Date.now(),
                        name: foodData.name,
                        quantity: quantity,
                        unit: 'g',
                        calories: calories,
                        timestamp: timestamp,
                        external: true,
                        source: 'Open Food Facts',
                        brand: foodData.brand || ''
                    };
                    
                    this.foodLog.push(foodLogEntry);
                    this.updateFoodLog();
                    this.updateDashboard();
                    this.saveToStorage();
                    this.addToFavorites(foodData);
                    
                    this.showMessage(`Added ${foodData.name} (${quantity}g, ${calories} cal)`, 'success');
                    document.getElementById('foodForm').reset();
                    this.selectedFoodData = null;
                    return;
                }
            } catch (error) {
                console.error('Error logging external food:', error);
                this.showMessage('Failed to log external food. Added locally.', 'warning');
            }
        }

        // Fallback: add locally (for offline foods or if backend logging fails)
        const foodLogEntry = {
            id: Date.now(),
            name: foodData.name,
            quantity: quantity,
            unit: 'g',
            calories: calories,
            timestamp: timestamp,
            offline: !this.isOnline,
            source: foodData.source || 'Local',
            brand: foodData.brand || ''
        };
        
        this.foodLog.push(foodLogEntry);
        this.updateFoodLog();
        this.updateDashboard();
        this.saveToStorage();
        this.addToFavorites(foodData);
        
        this.showMessage(`Added ${foodData.name} (${quantity}g, ${calories} cal)`, 'success');
        document.getElementById('foodForm').reset();
        this.selectedFoodData = null;

    } catch (error) {
        console.error('Error adding enhanced food:', error);
        this.showMessage('Error adding food. Please try again.', 'error');
    }
}
```

### 4. Admin Panel Integration (Optional)
If you want admin capabilities in the frontend, add these methods:
```javascript
// Get admin statistics
async getAdminStats() {
    try {
        const response = await this.apiCall('/admin/stats');
        return response.success ? response.stats : null;
    } catch (error) {
        console.error('Admin stats error:', error);
        return null;
    }
}

// List all foods for admin management
async getAdminFoods(page = 1, limit = 50, search = '') {
    try {
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        
        if (search) {
            queryParams.append('search', search);
        }
        
        const response = await this.apiCall(`/admin/foods?${queryParams}`);
        return response.success ? response.foods : [];
    } catch (error) {
        console.error('Admin foods error:', error);
        return [];
    }
}
```

## Expected Behavior After Updates

### ✅ User Experience
- **Unit Selection**: Only grams shown in dropdown
- **Food Search**: Shows local + Swiss-prioritized Open Food Facts results  
- **Food Logging**: Precise gram-based portions (e.g., "50g chicken breast")
- **Nutrition Display**: Accurate per-100g nutrition information
- **Offline Support**: Maintains functionality when offline

### ✅ Technical Integration
- **Hybrid Search**: Combines 3 food sources (local + external + favorites)
- **Smart Caching**: External foods cached on backend for performance
- **Proper Logging**: External foods logged with full nutrition data
- **Admin Ready**: Backend provides admin APIs for food management

## Backend Status
- ✅ **20 local foods** standardized to grams
- ✅ **26 cached external foods** from Open Food Facts
- ✅ **Hybrid search** working with Swiss prioritization  
- ✅ **Admin APIs** ready for food management
- ✅ **Nutrition data** stored for all food types

Please implement these changes to integrate with the enhanced backend system. The result will be a professional, precise, and internationally-friendly calorie tracker using grams as the standard unit!