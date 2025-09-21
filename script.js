// Calorie Tracker App JavaScript

class CalorieTracker {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.dailyCalories = 0;
        this.foodLog = [];
        this.calorieGoal = CONFIG.DEFAULT_CALORIE_GOAL;
        this.isOnline = navigator.onLine;
        
        // Admin properties
        this.isAdmin = false;
        this.adminData = {
            users: [],
            foods: [],
            stats: {}
        };
        
        // Hybrid storage properties
        this.syncQueue = []; // Queue for pending sync operations
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.syncStatus = 'pending'; // 'pending', 'syncing', 'synced', 'error'
        
        // Sample food database (fallback for offline mode)
        this.offlineFoodDatabase = {
            'apple': { id: 1, calories: 95, unit: 'piece' },
            'banana': { id: 2, calories: 105, unit: 'piece' },
            'chicken breast': { id: 3, calories: 165, unit: '100g' },
            'rice': { id: 4, calories: 130, unit: 'cup' },
            'bread': { id: 5, calories: 80, unit: 'slice' },
            'egg': { id: 6, calories: 70, unit: 'piece' },
            'milk': { id: 7, calories: 150, unit: 'cup' },
            'cheese': { id: 8, calories: 113, unit: '100g' },
            'salmon': { id: 9, calories: 208, unit: '100g' },
            'broccoli': { id: 10, calories: 55, unit: 'cup' },
            'pasta': { id: 11, calories: 220, unit: 'cup' },
            'yogurt': { id: 12, calories: 150, unit: 'cup' },
            'almonds': { id: 13, calories: 164, unit: '28g' },
            'orange': { id: 14, calories: 62, unit: 'piece' },
            'spinach': { id: 15, calories: 7, unit: 'cup' },
            'potato': { id: 16, calories: 161, unit: 'medium' },
            'tomato': { id: 17, calories: 22, unit: 'medium' },
            'avocado': { id: 18, calories: 234, unit: 'piece' },
            'oatmeal': { id: 19, calories: 147, unit: 'cup' },
            'peanut butter': { id: 20, calories: 188, unit: '2 tbsp' },
            'lasagna': { id: 21, calories: 320, unit: 'serving' },
            'lasagne': { id: 22, calories: 320, unit: 'serving' },
            'meat lasagna': { id: 23, calories: 350, unit: 'serving' },
            'vegetable lasagna': { id: 24, calories: 280, unit: 'serving' },
            'beef lasagna': { id: 25, calories: 365, unit: 'serving' },
            'cheese lasagna': { id: 26, calories: 300, unit: 'serving' },
            'pizza': { id: 27, calories: 285, unit: 'slice' },
            'hamburger': { id: 28, calories: 540, unit: 'piece' },
            'french fries': { id: 29, calories: 365, unit: 'medium' },
            'chocolate': { id: 30, calories: 546, unit: '100g' }
        };
        
        // Open Food Facts API integration
        this.openFoodFactsCache = new Map();
        this.setupOpenFoodFacts();
        this.loadCachedFoods();
        
        this.init();
    }

    // Open Food Facts API methods
    setupOpenFoodFacts() {
        this.openFoodFactsAPI = {
            baseURL: 'https://world.openfoodfacts.org',
            searchURL: '/cgi/search.pl',
            productURL: '/api/v0/product'
        };
    }

    // Search foods from Open Food Facts
    async searchOpenFoodFacts(query, limit = 10) {
        if (!query || query.length < 2) return [];
        
        // Check cache first
        const cacheKey = `search_${query.toLowerCase()}_${limit}`;
        if (this.openFoodFactsCache.has(cacheKey)) {
            return this.openFoodFactsCache.get(cacheKey);
        }
        
        try {
            const url = `${this.openFoodFactsAPI.baseURL}${this.openFoodFactsAPI.searchURL}?search_terms=${encodeURIComponent(query)}&page_size=${limit}&json=1&fields=product_name,nutriments,quantity,brands,countries`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            const foods = this.processOpenFoodFactsResults(data.products || []);
            
            // Cache results for 10 minutes
            this.openFoodFactsCache.set(cacheKey, foods);
            setTimeout(() => this.openFoodFactsCache.delete(cacheKey), 10 * 60 * 1000);
            
            return foods;
        } catch (error) {
            console.error('Open Food Facts search error:', error);
            return [];
        }
    }

    // Process Open Food Facts API results
    processOpenFoodFactsResults(products) {
        return products
            .filter(product => 
                product.product_name && 
                product.nutriments && 
                product.nutriments['energy-kcal_100g']
            )
            .map(product => ({
                id: `off_${product._id || Math.random().toString(36).substr(2, 9)}`,
                name: product.product_name,
                calories: Math.round(product.nutriments['energy-kcal_100g'] || 0),
                unit: '100g',
                brand: product.brands ? product.brands.split(',')[0].trim() : '',
                countries: product.countries || '',
                source: 'Open Food Facts',
                // Additional nutrition data
                protein: product.nutriments.proteins_100g || 0,
                carbs: product.nutriments.carbohydrates_100g || 0,
                fat: product.nutriments.fat_100g || 0,
                fiber: product.nutriments.fiber_100g || 0
            }))
            .slice(0, 10); // Limit results
    }

    // Combined search: offline + backend (which includes Open Food Facts)
    async searchAllFoods(query) {
        const results = [];
        
        // 1. Search offline database first (fast)
        const offlineResults = this.searchOfflineDatabase(query);
        results.push(...offlineResults.map(food => ({...food, source: 'Offline Database'})));
        
        // 2. Search backend (which includes Open Food Facts) if online
        if (this.isOnline && navigator.onLine && !CONFIG.DEVELOPMENT_MODE) {
            try {
                const backendResults = await this.searchBackendFoods(query, 8);
                results.push(...backendResults);
            } catch (error) {
                console.log('Backend search failed, trying direct Open Food Facts:', error);
                // Fallback to direct Open Food Facts API if backend is unavailable
                try {
                    const directResults = await this.searchOpenFoodFacts(query, 6);
                    results.push(...directResults);
                } catch (directError) {
                    console.log('Direct Open Food Facts search also failed, using offline only');
                }
            }
        }
        
        return results;
    }

    // Search backend foods (includes Open Food Facts integration)
    async searchBackendFoods(query, limit = 10) {
        try {
            // Only use backend API if user is authenticated
            if (this.authToken) {
                const response = await this.apiCall(`/external-foods/search?q=${encodeURIComponent(query)}&limit=${limit}&source=openfoodfacts`);
                
                if (response.success && response.foods) {
                    return response.foods.map(food => ({
                        id: food.external_id || `off_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        name: food.name,
                        calories: food.calories_per_100g || food.calories,
                        unit: '100g',
                        brand: food.brand || '',
                        source: 'Open Food Facts',
                        // Additional nutrition data from backend
                        protein: food.protein_per_100g || 0,
                        carbs: food.carbs_per_100g || 0,
                        fat: food.fat_per_100g || 0,
                        fiber: food.fiber_per_100g || 0,
                        cached: !!response.cached
                    }));
                }
            }
            return [];
        } catch (error) {
            console.error('Backend food search error:', error);
            return [];
        }
    }

    // Search offline database
    searchOfflineDatabase(query) {
        const searchTerm = query.toLowerCase();
        return Object.entries(this.offlineFoodDatabase)
            .filter(([name]) => name.toLowerCase().includes(searchTerm))
            .map(([name, data]) => ({
                id: `offline_${data.id}`,
                name: name,
                calories: data.calories,
                unit: data.unit
            }));
    }

    // Search local foods in backend database
    async searchLocalFoods(query, limit = 10) {
        try {
            const response = await this.apiCall(`/foods/search?q=${encodeURIComponent(query)}`);
            
            if (response.success && response.foods) {
                return response.foods.map(food => ({
                    id: food.id,
                    name: food.name,
                    calories: food.calories_per_unit,
                    unit: food.default_unit,
                    brand: food.brand || '',
                    category: food.category || '',
                    source: 'Local Database'
                })).slice(0, limit);
            }
            return [];
        } catch (error) {
            console.error('Local foods search error:', error);
            return [];
        }
    }

    // Enhanced caching system for food searches
    loadCachedFoods() {
        try {
            const cached = localStorage.getItem('foodSearchCache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                // Only load cache if it's less than 24 hours old
                if (Date.now() - cacheData.timestamp < 24 * 60 * 60 * 1000) {
                    cacheData.searches.forEach(search => {
                        this.openFoodFactsCache.set(search.key, search.results);
                    });
                    console.log(`Loaded ${cacheData.searches.length} cached food searches`);
                }
            }
        } catch (error) {
            console.error('Error loading cached foods:', error);
        }
    }

    saveCacheToStorage() {
        try {
            const cacheData = {
                timestamp: Date.now(),
                searches: Array.from(this.openFoodFactsCache.entries()).map(([key, results]) => ({
                    key,
                    results
                }))
            };
            localStorage.setItem('foodSearchCache', JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error saving food cache:', error);
        }
    }

    // Add frequently used foods to persistent cache
    addToFavorites(foodData) {
        try {
            const favorites = this.getFavorites();
            const existing = favorites.find(f => f.name === foodData.name && f.source === foodData.source);
            
            if (!existing) {
                favorites.push({
                    ...foodData,
                    addedAt: Date.now(),
                    usageCount: 1
                });
            } else {
                existing.usageCount++;
                existing.lastUsed = Date.now();
            }
            
            // Keep only top 50 favorites
            favorites.sort((a, b) => b.usageCount - a.usageCount);
            const topFavorites = favorites.slice(0, 50);
            
            localStorage.setItem('favoritesFoods', JSON.stringify(topFavorites));
        } catch (error) {
            console.error('Error adding to favorites:', error);
        }
    }

    getFavorites() {
        try {
            const favorites = localStorage.getItem('favoritesFoods');
            return favorites ? JSON.parse(favorites) : [];
        } catch (error) {
            console.error('Error getting favorites:', error);
            return [];
        }
    }

    // Enhanced search with favorites priority
    async searchAllFoodsWithFavorites(query) {
        const results = [];
        const searchTerm = query.toLowerCase();
        
        // 1. Search favorites first (instant)
        const favorites = this.getFavorites().filter(food => 
            food.name.toLowerCase().includes(searchTerm)
        );
        results.push(...favorites.slice(0, 3).map(food => ({...food, source: `⭐ ${food.source}`})));
        
        // 2. Search offline database
        const offlineResults = this.searchOfflineDatabase(query);
        results.push(...offlineResults.map(food => ({...food, source: 'Offline Database'})));
        
        // 3. Search backend (includes local foods + cached external foods + Open Food Facts)
        if (this.isOnline && navigator.onLine && results.length < 8) {
            try {
                // Search local foods first
                const localResults = await this.searchLocalFoods(query, 3);
                results.push(...localResults);
                
                // Then search external foods (cached + Open Food Facts)
                const externalResults = await this.searchBackendFoods(query, 8 - results.length);
                results.push(...externalResults);
                
                // Save cache periodically
                if (externalResults.length > 0) {
                    setTimeout(() => this.saveCacheToStorage(), 1000);
                }
            } catch (error) {
                console.log('Backend search failed, falling back to direct Open Food Facts');
                // Fallback to direct Open Food Facts API if backend is unavailable
                try {
                    const directResults = await this.searchOpenFoodFacts(query, 8 - results.length);
                    results.push(...directResults);
                } catch (directError) {
                    console.log('Direct Open Food Facts search also failed, using offline only');
                }
            }
        }
        
        return results;
    }

    init() {
        this.bindEvents();
        this.loadFromStorage();
        this.checkAuthStatus();
        
        // Show offline indicator if in development mode
        if (CONFIG.DEVELOPMENT_MODE) {
            document.getElementById('offlineIndicator').classList.add('show');
        }
        
        // Check online status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showMessage('Connection restored', 'success');
            // Try to process pending sync queue when back online
            setTimeout(() => this.processSyncQueue(), 1000);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showMessage('Working offline', 'warning');
        });
        
        // Initialize sync status
        this.updateSyncStatus('pending');
        
        // Periodic sync attempt (every 30 seconds)
        setInterval(() => {
            if (this.isOnline && this.syncQueue.length > 0 && !this.syncInProgress) {
                this.processSyncQueue();
            }
        }, 30000);
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleLogin();
            return false;
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Food form
        document.getElementById('foodForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddFood();
        });

        // Food name input for suggestions
        document.getElementById('foodName').addEventListener('input', (e) => {
            this.debouncedFoodSearch(e.target.value);
        });

        // Add keyboard navigation for food suggestions
        document.getElementById('foodName').addEventListener('keydown', (e) => {
            this.handleSuggestionKeyboard(e);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#foodName') && !e.target.closest('#foodSuggestions')) {
                this.hideFoodSuggestions();
            }
        });

        // Initialize debounced search
        this.initDebouncing();
    }

    // Initialize debouncing for food search
    initDebouncing() {
        this.searchTimeout = null;
        this.isSearching = false;
        this.selectedSuggestionIndex = -1;
    }

    // Handle keyboard navigation in food suggestions
    handleSuggestionKeyboard(e) {
        const suggestionsDiv = document.getElementById('foodSuggestions');
        const suggestions = suggestionsDiv.querySelectorAll('.suggestion-item.enhanced');
        
        if (suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(suggestions);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                this.highlightSuggestion(suggestions);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedSuggestionIndex >= 0 && suggestions[this.selectedSuggestionIndex]) {
                    suggestions[this.selectedSuggestionIndex].click();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideFoodSuggestions();
                break;
        }
    }

    // Highlight selected suggestion
    highlightSuggestion(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('keyboard-selected', index === this.selectedSuggestionIndex);
        });
        
        // Scroll selected item into view
        if (this.selectedSuggestionIndex >= 0 && suggestions[this.selectedSuggestionIndex]) {
            suggestions[this.selectedSuggestionIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    // Debounced search to prevent too many API calls
    debouncedFoodSearch(input) {
        // Clear existing timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // If input is too short, hide suggestions immediately
        if (input.length < CONFIG.MIN_SEARCH_LENGTH) {
            this.hideFoodSuggestions();
            return;
        }

        // Show loading indicator immediately for responsiveness
        const suggestionsDiv = document.getElementById('foodSuggestions');
        if (!this.isSearching) {
            suggestionsDiv.innerHTML = '<div class="suggestion-item loading">🔍 Searching foods...</div>';
            suggestionsDiv.style.display = 'block';
        }

        // Debounce the actual search
        this.searchTimeout = setTimeout(() => {
            this.showFoodSuggestions(input);
        }, 300); // 300ms delay
    }

    async checkAuthStatus() {
        const token = localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
        
        if (!token) {
            this.showSection('login');
            return;
        }

        // Set the token before making API calls
        this.authToken = token;

        if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
            try {
                const response = await this.apiCall('/auth/verify', 'GET');
                if (response.valid) {
                    this.currentUser = response.user;
                    this.calorieGoal = response.user.dailyCalorieGoal;
                    document.getElementById('welcomeUser').textContent = `Welcome, ${response.user.username}!`;
                    this.showSection('dashboard');
                    await this.loadTodaysData();
                    return;
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                // Clear invalid token
                localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
                this.authToken = null;
            }
        }
        
        // Fallback to offline mode or login
        this.showSection('login');
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            throw new Error('API not available in development/offline mode');
        }

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (this.authToken) {
            options.headers.Authorization = `Bearer ${this.authToken}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Network error' }));
            
            // Don't log auth errors as they're expected when not logged in
            if (response.status !== 401 || endpoint !== '/auth/verify') {
                console.error(`API Error (${response.status}):`, errorData.error || errorData.message);
            }
            
            throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        
        // Handle new backend response format
        if (result.success === false) {
            throw new Error(result.message || result.error || 'API request failed');
        }
        
        return result;
    }

    showSection(sectionName) {
        try {
            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Show selected section
            const targetSection = document.getElementById(sectionName + 'Section');
            if (targetSection) {
                targetSection.classList.add('active');
            } else {
                console.error('Section not found:', sectionName + 'Section');
            }
        } catch (error) {
            console.error('Error in showSection:', error);
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Always try offline mode first for demo credentials
        if ((username === 'demo' && password === 'demo123') || (username === 'admin' && password === 'admin123')) {
            this.currentUser = { 
                id: username === 'admin' ? 2 : 1, 
                username: username, 
                dailyCalorieGoal: 2000 
            };
            this.calorieGoal = 2000;
            localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(this.currentUser));
            
            // Load hybrid data (local + server if available)
            await this.loadHybridData();
            
            // Check admin status and show admin interface if applicable
            await this.checkAdminStatus();
            this.toggleAdminInterface();
            
            document.getElementById('welcomeUser').textContent = `Welcome, ${username}!`;
            this.showSection('dashboard');
            this.updateDashboard();
            this.showMessage('Login successful!', 'success');
            
            // Start background sync if there's pending data
            if (this.syncQueue.length > 0) {
                setTimeout(() => this.processSyncQueue(), 1000);
            }
            
            return;
        }

        // Try API login for non-demo users
        if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
            try {
                const response = await this.apiCall('/auth/login', 'POST', {
                    username,
                    password
                });

                this.authToken = response.token;
                this.currentUser = response.user;
                this.calorieGoal = response.user.dailyCalorieGoal;
                
                localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, response.token);
                localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(response.user));
                
                document.getElementById('welcomeUser').textContent = `Welcome, ${response.user.username}!`;
                this.showSection('dashboard');
                await this.loadTodaysData();
                this.showMessage('Login successful!', 'success');
                
            } catch (error) {
                this.showMessage(`Login failed: ${error.message}`, 'error');
            }
        } else {
            this.showMessage('Invalid credentials. Use demo/demo123 for offline access', 'error');
        }
    }

    async handleLogout() {
        if (this.isOnline && this.authToken && !CONFIG.DEVELOPMENT_MODE) {
            try {
                await this.apiCall('/auth/logout', 'POST');
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
        localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
        
        this.showSection('login');
        document.getElementById('loginForm').reset();
        this.showMessage('Logged out successfully', 'success');
    }

    async handleAddFood() {
        const foodInput = document.getElementById('foodName').value.trim();
        const quantity = parseInt(document.getElementById('quantity').value);
        const unit = document.getElementById('unit').value;

        // Check if we have enhanced food data from selection
        if (this.selectedFoodData) {
            await this.handleAddEnhancedFood(this.selectedFoodData, quantity, unit);
            return;
        }

        // Original logic for manual input
        const foodName = foodInput.toLowerCase();

        if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
            try {
                // Search for food in backend
                const searchResponse = await this.apiCall(`/foods/search?q=${encodeURIComponent(foodName)}`);
                const foods = searchResponse.success ? searchResponse.foods : [];
                
                let logData, calories;
                
                if (foods.length > 0) {
                    // Found in database - use foodId
                    const food = foods[0]; // Use first match
                    calories = this.calculateCalories(food.calories_per_unit, quantity, unit, food.default_unit);
                    
                    logData = {
                        foodId: food.id,
                        quantity,
                        unit,
                        calories,
                        logDate: new Date().toISOString().split('T')[0]
                    };
                } else {
                    // Not found in database - use custom food name
                    // Show custom modal for calories since we don't have food data
                    try {
                        const customCalories = await this.showCalorieInputModal(foodName, unit);
                        calories = customCalories * quantity;
                        
                        logData = {
                            name: foodName,
                            quantity,
                            unit,
                            calories,
                            logDate: new Date().toISOString().split('T')[0]
                        };
                    } catch (error) {
                        // User cancelled calorie input
                        this.showMessage('Food entry cancelled.', 'info');
                        return;
                    }
                }

                // Add to backend
                const logResponse = await this.apiCall('/logs', 'POST', logData);

                const foodEntry = {
                    id: logResponse.logId,
                    name: foodName,
                    quantity,
                    unit,
                    calories,
                    timestamp: new Date().toLocaleTimeString()
                };

                this.foodLog.push(foodEntry);
                this.dailyCalories += calories;
                
                this.updateDashboard();
                this.updateFoodLog();
                
                document.getElementById('foodForm').reset();
                document.getElementById('quantity').value = 1;
                
                this.showMessage(`Added ${foodName}! +${calories} calories`, 'success');

            } catch (error) {
                this.showMessage(`Error adding food: ${error.message}`, 'error');
            }
        } else {
            // Offline mode
            this.handleAddFoodOffline(foodName, quantity, unit);
        }
    }

    // Handle adding enhanced food from Open Food Facts or offline database
    async handleAddEnhancedFood(foodData, quantity, unit) {
        try {
            // Calculate calories based on food data
            const calories = this.calculateCalories(foodData.calories, quantity, unit, foodData.unit);
            
            // Create food entry (hybrid approach - always store locally first)
            const foodEntry = {
                id: Date.now(),
                name: foodData.name,
                quantity: quantity,
                unit: unit,
                calories: calories,
                timestamp: new Date().toLocaleTimeString(),
                source: foodData.source,
                brand: foodData.brand || '',
                external_food_id: foodData.id || null, // Store Open Food Facts ID for sync
                // Store additional nutrition data if available
                protein: foodData.protein ? Math.round((foodData.protein / 100) * quantity) : 0,
                carbs: foodData.carbs ? Math.round((foodData.carbs / 100) * quantity) : 0,
                fat: foodData.fat ? Math.round((foodData.fat / 100) * quantity) : 0
            };

            // Add to local storage immediately (hybrid approach)
            this.foodLog.push(foodEntry);
            this.dailyCalories += calories;
            
            // Add to favorites (automatically tracks usage)
            this.addToFavorites(foodData);
            
            // Add to sync queue for ALL foods (maintaining hybrid approach)
            const syncData = {
                name: foodData.name,
                quantity: quantity,
                unit: unit,
                calories: calories,
                localId: foodEntry.id,
                source: foodData.source
            };

            // Include Open Food Facts specific data for backend sync
            if (foodData.source === 'Open Food Facts') {
                syncData.external_food_id = foodData.id;
                syncData.brand = foodData.brand || '';
                // Send raw per-100g values (not calculated for quantity)
                syncData.protein_per_100g = foodData.protein || 0;
                syncData.carbs_per_100g = foodData.carbs || 0;
                syncData.fat_per_100g = foodData.fat || 0;
                syncData.fiber_per_100g = foodData.fiber || 0;
            }

            this.addToSyncQueue('add_food', syncData);
            
            this.updateDashboard();
            this.updateFoodLog();
            
            // Reset form and clear selected food data
            document.getElementById('foodForm').reset();
            document.getElementById('quantity').value = 1;
            this.selectedFoodData = null;
            
            // Hide nutrition preview if shown
            const previewDiv = document.getElementById('nutritionPreview');
            if (previewDiv) previewDiv.style.display = 'none';
            
            // Show enhanced success message
            const sourceText = foodData.source === 'Open Food Facts' ? '🌐' : '💾';
            const brandText = foodData.brand ? ` by ${foodData.brand}` : '';
            this.showMessage(`Added ${foodData.name}${brandText}! +${calories} calories ${sourceText}`, 'success');

        } catch (error) {
            console.error('Error adding enhanced food:', error);
            this.showMessage(`Error adding food: ${error.message}`, 'error');
        }
    }

    handleAddFoodOffline(foodName, quantity, unit) {
        if (!this.offlineFoodDatabase[foodName]) {
            this.showMessage(`Food "${foodName}" not found. Try: ${Object.keys(this.offlineFoodDatabase).slice(0, 5).join(', ')}...`, 'error');
            return;
        }

        const foodData = this.offlineFoodDatabase[foodName];
        const calories = this.calculateCalories(foodData.calories, quantity, unit, foodData.unit);

        const foodEntry = {
            id: Date.now(),
            name: foodName,
            quantity: quantity,
            unit: unit,
            calories: calories,
            timestamp: new Date().toLocaleTimeString(),
            offline: true
        };

        this.foodLog.push(foodEntry);
        this.dailyCalories += calories;
        
        // Add to sync queue for background upload
        this.addToSyncQueue('add_food', {
            name: foodName,
            quantity: quantity,
            unit: unit,
            calories: calories,
            foodId: foodData.id,
            localId: foodEntry.id
        });
        
        this.updateDashboard();
        this.updateFoodLog();
        this.saveToStorage();
        
        document.getElementById('foodForm').reset();
        document.getElementById('quantity').value = 1;
        
        this.showMessage(`Added ${foodName}! +${calories} calories`, 'success');
    }

    async loadTodaysData() {
        if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
            try {
                const today = new Date().toISOString().split('T')[0];
                const response = await this.apiCall(`/logs?date=${today}`);
                
                this.foodLog = response.logs.map(log => ({
                    id: log.id,
                    name: log.food_name,
                    quantity: log.quantity,
                    unit: log.unit,
                    calories: log.calories,
                    timestamp: new Date(log.logged_at).toLocaleTimeString()
                }));
                
                this.dailyCalories = this.foodLog.reduce((sum, food) => sum + food.calories, 0);
                this.updateDashboard();
                this.updateFoodLog();
                
            } catch (error) {
                console.error('Failed to load today\'s data:', error);
                this.showMessage('Failed to load data from server', 'error');
            }
        }
    }

    calculateCalories(baseCalories, quantity, inputUnit, baseUnit) {
        let multiplier = quantity;
        
        // Convert units if needed
        if (inputUnit === 'grams' && baseUnit === '100g') {
            multiplier = quantity / 100;
        } else if (inputUnit === 'ounces' && baseUnit === '100g') {
            multiplier = (quantity * 28.35) / 100;
        }
        
        return Math.round(baseCalories * multiplier);
    }

    async showFoodSuggestions(input) {
        const suggestionsDiv = document.getElementById('foodSuggestions');
        this.isSearching = true;
        
        if (input.length < CONFIG.MIN_SEARCH_LENGTH) {
            this.hideFoodSuggestions();
            this.isSearching = false;
            return;
        }

        try {
            let matches = [];

            // 1. Always search favorites first (instant results)
            const favorites = this.getFavorites().filter(food => 
                food.name.toLowerCase().includes(input.toLowerCase())
            );
            matches.push(...favorites.slice(0, 2).map(food => ({...food, source: `⭐ ${food.source}`})));

            // 2. Search offline database (instant results)
            const offlineResults = this.searchOfflineDatabase(input);
            matches.push(...offlineResults.slice(0, 2).map(food => ({...food, source: 'Offline Database'})));

            // 3. Search backend for comprehensive results
            if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
                try {
                    // Search local foods in backend database
                    const localResults = await this.searchLocalFoods(input, 3);
                    matches.push(...localResults);

                    // Search external foods (cached + Open Food Facts with Swiss priority)
                    const externalResults = await this.searchBackendFoods(input, 8);
                    matches.push(...externalResults);

                } catch (backendError) {
                    console.log('Backend search failed, trying direct Open Food Facts:', backendError);
                    // Fallback to direct Open Food Facts for comprehensive coverage
                    try {
                        const directResults = await this.searchOpenFoodFacts(input, 8);
                        matches.push(...directResults);
                    } catch (directError) {
                        console.log('Direct Open Food Facts search failed:', directError);
                    }
                }
            } else {
                // Development mode - still provide Open Food Facts access
                try {
                    console.log('Development mode: searching Open Food Facts for:', input);
                    const directResults = await this.searchOpenFoodFacts(input, 8);
                    console.log('Open Food Facts results:', directResults);
                    matches.push(...directResults);
                } catch (error) {
                    console.log('Open Food Facts search failed in development mode:', error);
                }
            }

            console.log('Total matches found:', matches.length);
            console.log('All matches:', matches);

            // Remove duplicates based on name and normalize results
            const uniqueMatches = [];
            const seenNames = new Set();
            
            for (const match of matches) {
                const normalizedName = match.name.toLowerCase().trim();
                if (!seenNames.has(normalizedName)) {
                    seenNames.add(normalizedName);
                    uniqueMatches.push(match);
                }
            }

            // Update suggestions display
            this.displayFoodSuggestions(uniqueMatches, input);

        } catch (error) {
            console.error('Food suggestions error:', error);
            suggestionsDiv.innerHTML = '<div class="suggestion-item error">⚠️ Search temporarily unavailable</div>';
        } finally {
            this.isSearching = false;
        }
    }

    // Display food suggestions with enhanced formatting
    displayFoodSuggestions(matches, input) {
        const suggestionsDiv = document.getElementById('foodSuggestions');
        this.selectedSuggestionIndex = -1; // Reset keyboard selection

        if (matches.length === 0) {
            suggestionsDiv.innerHTML = `
                <div class="suggestion-item no-results">
                    No foods found for "${input}". 
                    <br><small>Try a different search term or check spelling.</small>
                </div>
            `;
            setTimeout(() => this.hideFoodSuggestions(), 4000);
            return;
        }

        // Create enhanced suggestions with comprehensive info
        const suggestions = matches.slice(0, CONFIG.MAX_SUGGESTIONS || 10).map(food => {
            const sourceIcon = this.getSourceIcon(food.source);
            const brandText = food.brand ? ` by ${food.brand}` : '';
            const nutritionText = this.getNutritionText(food);
            const sourceText = this.getSourceText(food.source);
            
            return `
                <div class="suggestion-item enhanced" onclick="app.selectEnhancedFood('${encodeURIComponent(JSON.stringify(food))}')">
                    <div class="food-main">
                        <span class="food-name">${this.highlightMatch(food.name, input)}${brandText}</span>
                        <span class="food-source" title="${this.getSourceTooltip(food.source)}">${sourceIcon} ${sourceText}</span>
                    </div>
                    <div class="food-details">
                        <span class="food-calories">${food.calories} cal/${food.unit || '100g'}</span>
                        ${nutritionText ? `<span class="food-nutrition">${nutritionText}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add attribution footer for Open Food Facts
        const hasOpenFoodFacts = matches.some(food => food.source === 'Open Food Facts');
        const totalShown = Math.min(matches.length, CONFIG.MAX_SUGGESTIONS || 10);
        const totalFound = matches.length;
        
        const attribution = hasOpenFoodFacts ? `
            <div class="suggestions-attribution">
                <small>🌐 Food data from <a href="https://world.openfoodfacts.org" target="_blank">Open Food Facts</a></small>
            </div>
        ` : '';

        const resultInfo = totalFound > totalShown ? `
            <div class="suggestions-info">
                <small>Showing ${totalShown} of ${totalFound} results</small>
            </div>
        ` : '';

        suggestionsDiv.innerHTML = suggestions + resultInfo + attribution;
        suggestionsDiv.style.display = 'block';
    }

    // Helper methods for food suggestions display
    getSourceIcon(source) {
        if (source === 'Open Food Facts') return '🌐';
        if (source && source.includes('⭐')) return '⭐';
        if (source === 'Local Database') return '🏪';
        return '💾';
    }

    getNutritionText(food) {
        if (food.protein || food.carbs || food.fat) {
            const p = food.protein ? Math.round(food.protein) : 0;
            const c = food.carbs ? Math.round(food.carbs) : 0;
            const f = food.fat ? Math.round(food.fat) : 0;
            return `P:${p}g C:${c}g F:${f}g`;
        }
        return '';
    }

    getSourceText(source) {
        if (source === 'Open Food Facts') return 'Open Food Facts';
        if (source && source.includes('⭐')) return source.replace('⭐ ', '');
        if (source === 'Local Database') return 'Local Database';
        return source || 'Database';
    }

    getSourceTooltip(source) {
        if (source === 'Open Food Facts') return 'Data from Open Food Facts - world.openfoodfacts.org';
        if (source && source.includes('⭐')) return 'Favorite food from your history';
        if (source === 'Local Database') return 'Local food database';
        return source || 'Food database';
    }

    highlightMatch(text, search) {
        if (!search || search.length < 2) return text;
        const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    hideFoodSuggestions() {
        document.getElementById('foodSuggestions').style.display = 'none';
        this.selectedSuggestionIndex = -1; // Reset keyboard selection
    }

    selectFood(foodName) {
        document.getElementById('foodName').value = foodName;
        this.hideFoodSuggestions();
    }

    // Enhanced food selection with nutrition data
    selectEnhancedFood(encodedFoodData) {
        try {
            const food = JSON.parse(decodeURIComponent(encodedFoodData));
            
            // Store selected food data for use when adding
            this.selectedFoodData = food;
            
            // Update the input field
            document.getElementById('foodName').value = food.name;
            
            // Auto-fill calories if it's a simple conversion (like 100g foods)
            if (food.unit === '100g' || food.unit === 'piece') {
                // Show quick calorie preview
                this.showQuickNutritionPreview(food);
            }
            
            this.hideFoodSuggestions();
        } catch (error) {
            console.error('Error selecting enhanced food:', error);
            // Fallback to simple selection
            this.selectFood(foodName);
        }
    }

    // Show quick nutrition preview
    showQuickNutritionPreview(food) {
        const previewDiv = document.getElementById('nutritionPreview') || this.createNutritionPreview();
        
        let nutritionHTML = `
            <div class="nutrition-preview">
                <strong>${food.name}</strong> (${food.calories} cal/${food.unit})
        `;
        
        if (food.protein || food.carbs || food.fat) {
            nutritionHTML += `
                <div class="macros">
                    Protein: ${Math.round(food.protein || 0)}g | 
                    Carbs: ${Math.round(food.carbs || 0)}g | 
                    Fat: ${Math.round(food.fat || 0)}g
                </div>
            `;
        }
        
        if (food.source) {
            nutritionHTML += `<div class="source">Source: ${food.source}</div>`;
        }
        
        nutritionHTML += '</div>';
        previewDiv.innerHTML = nutritionHTML;
        previewDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            previewDiv.style.display = 'none';
        }, 5000);
    }

    // Create nutrition preview element if it doesn't exist
    createNutritionPreview() {
        const existing = document.getElementById('nutritionPreview');
        if (existing) return existing;
        
        const previewDiv = document.createElement('div');
        previewDiv.id = 'nutritionPreview';
        previewDiv.className = 'nutrition-preview-container';
        previewDiv.style.display = 'none';
        
        // Insert after the food input
        const foodInput = document.getElementById('foodName');
        foodInput.parentNode.insertBefore(previewDiv, foodInput.nextSibling);
        
        return previewDiv;
    }

    updateDashboard() {
        document.getElementById('totalCalories').textContent = this.dailyCalories;
        document.getElementById('mealsCount').textContent = this.foodLog.length;
        
        const progressPercent = Math.min((this.dailyCalories / this.calorieGoal) * 100, 100);
        document.getElementById('calorieProgress').style.width = progressPercent + '%';
    }

    updateFoodLog() {
        const foodLogDiv = document.getElementById('foodLog');
        
        if (this.foodLog.length === 0) {
            foodLogDiv.innerHTML = '<p class="empty-message">No food logged yet today. Start by adding your first meal!</p>';
            return;
        }

        foodLogDiv.innerHTML = this.foodLog.map(food => `
            <div class="food-item">
                <div class="food-info">
                    <div class="food-name">${this.capitalizeFirst(food.name)} ${food.offline ? '(Offline)' : ''}</div>
                    <div class="food-details">${food.quantity} ${food.unit} • ${food.timestamp}</div>
                </div>
                <div class="food-calories">${food.calories} cal</div>
                <button class="delete-btn" onclick="app.deleteFood(${food.id})">×</button>
            </div>
        `).reverse().join('');
    }

    async deleteFood(foodId) {
        const foodIndex = this.foodLog.findIndex(food => food.id === foodId);
        if (foodIndex === -1) return;

        const deletedFood = this.foodLog[foodIndex];

        // Always delete locally first (instant feedback)
        this.dailyCalories -= deletedFood.calories;
        this.foodLog.splice(foodIndex, 1);
        
        // Add to sync queue for server deletion
        if (deletedFood.serverId) {
            this.addToSyncQueue('delete_food', {
                serverId: deletedFood.serverId,
                localId: deletedFood.id
            });
        }
        
        this.updateDashboard();
        this.updateFoodLog();
        this.saveToStorage();
        
        this.showMessage('Food item deleted', 'success');
    }

    async syncOfflineData() {
        if (!this.isOnline || CONFIG.DEVELOPMENT_MODE) return;

        const offlineData = this.foodLog.filter(food => food.offline);
        if (offlineData.length === 0) return;

        this.showMessage('Syncing offline data...', 'info');

        for (const food of offlineData) {
            try {
                // Find food in backend
                const searchResponse = await this.apiCall(`/foods/search?q=${encodeURIComponent(food.name)}`);
                const foods = searchResponse.foods;
                
                if (foods.length > 0) {
                    const backendFood = foods[0];
                    await this.apiCall('/logs', 'POST', {
                        foodId: backendFood.id,
                        quantity: food.quantity,
                        unit: food.unit,
                        calories: food.calories,
                        logDate: new Date().toISOString().split('T')[0]
                    });
                    
                    // Remove offline flag
                    food.offline = false;
                }
            } catch (error) {
                console.error('Failed to sync food item:', food.name, error);
            }
        }

        this.updateFoodLog();
        this.showMessage('Offline data synced successfully', 'success');
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // Add to appropriate container
        const container = document.querySelector('.active .container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 3000);
        }
    }

    saveToStorage() {
        const data = {
            currentUser: this.currentUser,
            dailyCalories: this.dailyCalories,
            foodLog: this.foodLog,
            date: new Date().toDateString()
        };
        localStorage.setItem(CONFIG.OFFLINE_STORAGE_KEY, JSON.stringify(data));
    }

    loadFromStorage() {
        const data = localStorage.getItem(CONFIG.OFFLINE_STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            
            // Check if data is from today
            if (parsed.date === new Date().toDateString()) {
                this.dailyCalories = parsed.dailyCalories || 0;
                this.foodLog = parsed.foodLog || [];
            } else {
                // Reset for new day
                this.dailyCalories = 0;
                this.foodLog = [];
            }
        }
    }

    // Method to get today's data for backend sync
    getTodaysData() {
        return {
            user: this.currentUser,
            date: new Date().toDateString(),
            totalCalories: this.dailyCalories,
            foodEntries: this.foodLog
        };
    }

    // =============================================================================
    // HYBRID STORAGE: Local + Server Sync System
    // =============================================================================

    // Add operation to sync queue
    addToSyncQueue(operation, data) {
        const syncOperation = {
            id: Date.now() + Math.random(),
            type: operation, // 'add_food', 'delete_food', 'update_goal'
            data: data,
            timestamp: new Date().toISOString(),
            attempts: 0,
            maxAttempts: 3
        };
        
        this.syncQueue.push(syncOperation);
        this.updateSyncStatus('pending');
        
        // Try to sync immediately if online
        if (this.isOnline && !this.syncInProgress) {
            this.processSyncQueue();
        }
    }

    // Process pending sync operations
    async processSyncQueue() {
        if (this.syncInProgress || this.syncQueue.length === 0 || !this.isOnline) {
            return;
        }

        this.syncInProgress = true;
        this.updateSyncStatus('syncing');

        const operationsToProcess = [...this.syncQueue];
        
        for (let i = 0; i < operationsToProcess.length; i++) {
            const operation = operationsToProcess[i];
            
            try {
                await this.syncOperation(operation);
                
                // Remove successfully synced operation
                const index = this.syncQueue.findIndex(op => op.id === operation.id);
                if (index > -1) {
                    this.syncQueue.splice(index, 1);
                }
                
            } catch (error) {
                console.error('Sync operation failed:', error);
                operation.attempts++;
                
                // Remove if max attempts reached
                if (operation.attempts >= operation.maxAttempts) {
                    const index = this.syncQueue.findIndex(op => op.id === operation.id);
                    if (index > -1) {
                        this.syncQueue.splice(index, 1);
                    }
                    console.warn('Sync operation abandoned after max attempts:', operation);
                }
            }
        }

        this.syncInProgress = false;
        this.lastSyncTime = new Date();
        
        // Update status based on remaining queue
        if (this.syncQueue.length === 0) {
            this.updateSyncStatus('synced');
        } else {
            this.updateSyncStatus('error');
        }
    }

    // Execute individual sync operation
    async syncOperation(operation) {
        if (!this.authToken && !CONFIG.DEVELOPMENT_MODE) {
            throw new Error('No auth token for sync');
        }

        switch (operation.type) {
            case 'add_food':
                await this.syncAddFood(operation.data);
                break;
            case 'delete_food':
                await this.syncDeleteFood(operation.data);
                break;
            case 'update_goal':
                await this.syncUpdateGoal(operation.data);
                break;
            default:
                console.warn('Unknown sync operation type:', operation.type);
        }
    }

    // Sync individual food addition to server
    async syncAddFood(foodData) {
        if (CONFIG.DEVELOPMENT_MODE) {
            // In demo mode, simulate successful sync
            await new Promise(resolve => setTimeout(resolve, 500));
            return;
        }

        // Handle Open Food Facts items differently
        if (foodData.source === 'Open Food Facts' && foodData.external_food_id) {
            // Log to external foods endpoint with full nutrition data
            await this.apiCall('/external-foods/log', 'POST', {
                external_food_id: foodData.external_food_id,
                name: foodData.name,
                brand: foodData.brand || '',
                quantity: foodData.quantity,
                unit: foodData.unit,
                calories: foodData.calories,
                protein_per_100g: foodData.protein_per_100g || 0,
                carbs_per_100g: foodData.carbs_per_100g || 0,
                fat_per_100g: foodData.fat_per_100g || 0,
                fiber_per_100g: foodData.fiber_per_100g || 0,
                source: foodData.source,
                localId: foodData.localId
            });
        } else {
            // Regular food sync to existing endpoint
            await this.apiCall('/logs', 'POST', {
                foodId: foodData.foodId || null,
                name: foodData.name,
                quantity: foodData.quantity,
                unit: foodData.unit,
                calories: foodData.calories,
                logDate: new Date().toISOString().split('T')[0]
            });
        }
    }

    // Sync food deletion to server
    async syncDeleteFood(foodData) {
        if (CONFIG.DEVELOPMENT_MODE) {
            // In demo mode, simulate successful sync
            await new Promise(resolve => setTimeout(resolve, 300));
            return;
        }

        if (foodData.serverId) {
            await this.apiCall(`/logs/${foodData.serverId}`, 'DELETE');
        }
    }

    // Sync goal update to server
    async syncUpdateGoal(goalData) {
        if (CONFIG.DEVELOPMENT_MODE) {
            // In demo mode, simulate successful sync
            await new Promise(resolve => setTimeout(resolve, 200));
            return;
        }

        await this.apiCall('/user/goal', 'PUT', {
            dailyCalorieGoal: goalData.goal
        });
    }

    // Update sync status and UI
    updateSyncStatus(status) {
        this.syncStatus = status;
        this.updateSyncIndicator();
    }

    // Update sync indicator in UI
    updateSyncIndicator() {
        const indicator = document.getElementById('syncIndicator');
        if (!indicator) return;

        const statusConfig = {
            'synced': { icon: '✅', text: 'Synced', class: 'sync-success' },
            'syncing': { icon: '🔄', text: 'Syncing...', class: 'sync-progress' },
            'pending': { icon: '⏳', text: 'Pending sync', class: 'sync-pending' },
            'error': { icon: '⚠️', text: 'Sync error', class: 'sync-error' }
        };

        const config = statusConfig[this.syncStatus] || statusConfig.pending;
        indicator.innerHTML = `${config.icon} ${config.text}`;
        indicator.className = `sync-indicator ${config.class}`;
    }

    // Load data from both local and server (hybrid approach)
    async loadHybridData() {
        // Always load local data first (instant)
        this.loadFromStorage();
        
        // Try to load and merge server data if available
        if (this.isOnline && this.authToken && !CONFIG.DEVELOPMENT_MODE) {
            try {
                await this.loadAndMergeServerData();
            } catch (error) {
                console.log('Server data unavailable, using local data:', error.message);
            }
        }
    }

    // Load server data and merge with local data
    async loadAndMergeServerData() {
        const today = new Date().toISOString().split('T')[0];
        const serverData = await this.apiCall(`/logs?date=${today}`);
        
        // Handle new backend response format
        if (serverData && serverData.success && serverData.logs) {
            const logs = serverData.logs;
            const totalCalories = serverData.totalCalories || logs.reduce((total, log) => total + log.calories, 0);
            
            const serverFoodLog = logs.map(log => ({
                id: log.id,
                name: log.food_name || log.name,
                quantity: log.quantity,
                unit: log.unit,
                calories: log.calories,
                timestamp: new Date(log.created_at).toLocaleTimeString(),
                serverId: log.id // Track server ID for syncing
            }));

            // If server has more recent data, use it
            if (serverFoodLog.length > this.foodLog.length) {
                this.foodLog = serverFoodLog;
                this.dailyCalories = totalCalories;
                this.saveToStorage(); // Update local storage with server data
            }
        }
    }

    // =============================================================================
    // ADMIN FUNCTIONALITY
    // =============================================================================

    // Check if current user has admin privileges
    async checkAdminStatus() {
        // Check for demo admin credentials first
        if (this.currentUser && this.currentUser.username === 'admin') {
            this.isAdmin = true;
            return this.isAdmin;
        }

        // For non-demo users in production mode, check with backend
        if (!CONFIG.DEVELOPMENT_MODE && this.authToken) {
            try {
                const response = await this.apiCall('/admin/stats');
                this.isAdmin = response !== null;
                return this.isAdmin;
            } catch (error) {
                this.isAdmin = false;
                return false;
            }
        }

        this.isAdmin = false;
        return false;
    }

    // Show/hide admin interface
    toggleAdminInterface() {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.style.display = this.isAdmin ? 'block' : 'none';
            
            // Load admin stats when admin panel is shown
            if (this.isAdmin) {
                this.loadAdminStats();
            }
        }
    }

    // Load admin dashboard
    async showAdminDashboard() {
        if (!this.isAdmin) return;
        
        this.showSection('admin');
        await this.loadAdminStats();
    }

    // Load system statistics
    async loadAdminStats() {
        // Use demo data for demo admin user
        if (this.currentUser && this.currentUser.username === 'admin') {
            // Demo data for admin stats
            this.adminData.stats = {
                totalUsers: 15,
                totalFoods: 125,
                totalLogs: 1247,
                todaysLogs: 23,
                activeUsers: 8,
                // External food stats (demo)
                externalFoods: {
                    openFoodFactsUsage: 89,
                    cachedFoods: 156,
                    uniqueExternalFoods: 45
                }
            };
            this.updateAdminStatsDisplay();
            await this.loadExternalFoodStats(); // Load external food stats
            return;
        }

        // For real admin users in production
        try {
            const response = await this.apiCall('/admin/stats');
            this.adminData.stats = response;
            this.updateAdminStatsDisplay();
            await this.loadExternalFoodStats(); // Load external food stats
        } catch (error) {
            this.showMessage('Failed to load admin statistics', 'error');
        }
    }

    // Load external food statistics
    async loadExternalFoodStats() {
        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            // Demo data for external foods
            this.adminData.externalFoodStats = {
                usage_stats: [
                    { source_name: 'Open Food Facts', unique_foods: 45, total_logs: 89, total_calories: 12450 }
                ],
                cache_stats: [
                    { source_name: 'Open Food Facts', cached_foods: 156, total_usage: 234 }
                ]
            };
            this.updateExternalFoodStatsDisplay();
            return;
        }

        try {
            const response = await this.apiCall('/admin/external-foods/stats');
            if (response.success) {
                this.adminData.externalFoodStats = response;
                this.updateExternalFoodStatsDisplay();
            }
        } catch (error) {
            console.log('External food stats not available:', error);
            // This is okay - external food stats are optional
        }
    }

    // Update external food stats display
    updateExternalFoodStatsDisplay() {
        const statsContainer = document.getElementById('externalFoodStats');
        if (!statsContainer || !this.adminData.externalFoodStats) return;

        const { usage_stats, cache_stats } = this.adminData.externalFoodStats;
        
        let html = '<div class="external-food-stats">';
        html += '<h4>🌐 External Food Sources</h4>';
        
        if (usage_stats && usage_stats.length > 0) {
            html += '<div class="stats-section">';
            html += '<h5>Usage Statistics</h5>';
            usage_stats.forEach(stat => {
                html += `
                    <div class="stat-item">
                        <span class="stat-label">${stat.source_name}</span>
                        <span class="stat-value">${stat.unique_foods} foods, ${stat.total_logs} logs</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        if (cache_stats && cache_stats.length > 0) {
            html += '<div class="stats-section">';
            html += '<h5>Cache Performance</h5>';
            cache_stats.forEach(stat => {
                html += `
                    <div class="stat-item">
                        <span class="stat-label">${stat.source_name} Cache</span>
                        <span class="stat-value">${stat.cached_foods} cached, ${stat.total_usage} hits</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '</div>';
        statsContainer.innerHTML = html;
    }

    // Update admin stats display
    updateAdminStatsDisplay() {
        const stats = this.adminData.stats;
        
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('totalFoods').textContent = stats.totalFoods || 0;
        document.getElementById('totalLogs').textContent = stats.totalLogs || 0;
        document.getElementById('todaysLogs').textContent = stats.todaysLogs || 0;
        document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
    }

    // Load users for management
    async loadAdminUsers() {
        // Use demo data for demo admin user
        if (this.currentUser && this.currentUser.username === 'admin') {
            // Demo users data
            this.adminData.users = [
                { id: 1, username: 'demo', email: 'demo@example.com', role: 'user', totalLogs: 15, lastLogin: '2025-09-20' },
                { id: 2, username: 'admin', email: 'admin@example.com', role: 'admin', totalLogs: 5, lastLogin: '2025-09-20' },
                { id: 3, username: 'testuser', email: 'test@example.com', role: 'user', totalLogs: 32, lastLogin: '2025-09-19' }
            ];
            this.updateAdminUsersDisplay();
            return;
        }

        try {
            const response = await this.apiCall('/admin/users');
            this.adminData.users = response.users;
            this.updateAdminUsersDisplay();
        } catch (error) {
            this.showMessage('Failed to load users', 'error');
        }
    }

    // Update users display
    updateAdminUsersDisplay() {
        const usersList = document.getElementById('adminUsersList');
        if (!usersList) return;

        usersList.innerHTML = this.adminData.users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.totalLogs}</td>
                <td>${user.lastLogin}</td>
                <td>
                    <button class="btn btn-small" onclick="app.resetUserPassword(${user.id})">Reset Password</button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteUser(${user.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    // Load foods for management
    async loadAdminFoods() {
        console.log('loadAdminFoods called');
        console.log('Current user:', this.currentUser);
        console.log('Offline food database:', this.offlineFoodDatabase);
        
        // Use demo data for demo admin user
        if (this.currentUser && this.currentUser.username === 'admin') {
            // Convert offline food database object to array format for admin display
            const foodsArray = Object.entries(this.offlineFoodDatabase).map(([name, data], index) => ({
                id: index + 1,
                name: name,
                calories: data.calories,
                unit: data.unit,
                usage_count: Math.floor(Math.random() * 50) // Random usage count for demo
            }));
            
            this.adminData.foods = foodsArray;
            console.log('Admin foods data:', this.adminData.foods);
            this.updateAdminFoodsDisplay();
            return;
        }

        try {
            const response = await this.apiCall('/admin/foods');
            this.adminData.foods = response.foods;
            this.updateAdminFoodsDisplay();
        } catch (error) {
            this.showMessage('Failed to load foods', 'error');
            console.error('Error loading foods:', error);
        }
    }

    // Update foods display
    updateAdminFoodsDisplay() {
        console.log('updateAdminFoodsDisplay called');
        const foodsList = document.getElementById('adminFoodsList');
        console.log('Foods list element:', foodsList);
        console.log('Foods data to display:', this.adminData.foods);
        
        if (!foodsList) {
            console.error('adminFoodsList element not found!');
            return;
        }

        foodsList.innerHTML = this.adminData.foods.map(food => `
            <tr>
                <td>${food.name}</td>
                <td>${food.calories}</td>
                <td>${food.unit}</td>
                <td>${food.usage_count || 0}</td>
                <td>
                    <button class="btn btn-small" onclick="app.editFood(${food.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteFood(${food.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        
        console.log('Foods table updated with', this.adminData.foods.length, 'items');
    }

    // Reset user password
    async resetUserPassword(userId) {
        if (!confirm('Reset password for this user?')) return;

        if (CONFIG.DEVELOPMENT_MODE) {
            this.showMessage('Password reset email sent (Demo mode)', 'success');
            return;
        }

        try {
            await this.apiCall(`/admin/users/${userId}/reset-password`, 'POST');
            this.showMessage('Password reset email sent', 'success');
        } catch (error) {
            this.showMessage('Failed to reset password', 'error');
        }
    }

    // Delete user
    async deleteUser(userId) {
        if (!confirm('Delete this user? This action cannot be undone.')) return;

        if (CONFIG.DEVELOPMENT_MODE) {
            this.adminData.users = this.adminData.users.filter(u => u.id !== userId);
            this.updateAdminUsersDisplay();
            this.showMessage('User deleted (Demo mode)', 'success');
            return;
        }

        try {
            await this.apiCall(`/admin/users/${userId}`, 'DELETE');
            await this.loadAdminUsers(); // Refresh list
            this.showMessage('User deleted successfully', 'success');
        } catch (error) {
            this.showMessage('Failed to delete user', 'error');
        }
    }

    // Admin navigation
    showAdminSection(section) {
        console.log('showAdminSection called with section:', section);
        
        // Hide all admin sections
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        
        // Show selected section
        const targetSection = document.getElementById(`admin${section}`);
        console.log(`Target section admin${section}:`, targetSection);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Load data for the section
        switch(section) {
            case 'Stats':
                this.loadAdminStats();
                break;
            case 'Users':
                this.loadAdminUsers();
                break;
            case 'Foods':
                console.log('Loading Foods section...');
                this.loadAdminFoods();
                break;
        }
    }

    // =============================================================================
    // ENHANCED FOOD SEARCH INTEGRATION
    // =============================================================================

    // Search foods from backend database
    async searchFoods(query) {
        if (!query || query.length < CONFIG.MIN_SEARCH_LENGTH) {
            return [];
        }

        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            // Fallback to offline database
            return Object.keys(this.offlineFoodDatabase)
                .filter(food => food.toLowerCase().includes(query.toLowerCase()))
                .slice(0, CONFIG.MAX_SUGGESTIONS)
                .map(name => ({
                    id: null,
                    name: name,
                    calories_per_unit: this.offlineFoodDatabase[name].calories,
                    default_unit: this.offlineFoodDatabase[name].unit
                }));
        }

        try {
            const response = await this.apiCall(`/foods/search?q=${encodeURIComponent(query)}`);
            return response.success ? response.foods : [];
        } catch (error) {
            console.error('Food search error:', error);
            // Fallback to offline database
            return Object.keys(this.offlineFoodDatabase)
                .filter(food => food.toLowerCase().includes(query.toLowerCase()))
                .slice(0, CONFIG.MAX_SUGGESTIONS)
                .map(name => ({
                    id: null,
                    name: name,
                    calories_per_unit: this.offlineFoodDatabase[name].calories,
                    default_unit: this.offlineFoodDatabase[name].unit
                }));
        }
    }

    // Get food details by ID or name
    async getFoodDetails(foodId = null, foodName = null) {
        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            if (foodName && this.offlineFoodDatabase[foodName.toLowerCase()]) {
                return {
                    id: null,
                    name: foodName,
                    calories_per_unit: this.offlineFoodDatabase[foodName.toLowerCase()].calories,
                    default_unit: this.offlineFoodDatabase[foodName.toLowerCase()].unit
                };
            }
            return null;
        }

        try {
            if (foodId) {
                const response = await this.apiCall(`/foods/${foodId}`);
                return response.success ? response.food : null;
            } else if (foodName) {
                const searchResponse = await this.apiCall(`/foods/search?q=${encodeURIComponent(foodName)}`);
                const foods = searchResponse.success ? searchResponse.foods : [];
                return foods.find(food => food.name.toLowerCase() === foodName.toLowerCase()) || null;
            }
        } catch (error) {
            console.error('Error getting food details:', error);
            return null;
        }
    }
    // Show data sources information modal
    showDataSourcesInfo() {
        const modal = document.createElement('div');
        modal.className = 'data-sources-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🌐 Data Sources & Attribution</h3>
                    <button class="modal-close" onclick="this.closest('.data-sources-modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="data-source">
                        <h4>🌍 Open Food Facts</h4>
                        <p><strong>Primary nutrition database</strong> - A collaborative, free and open database of food products from around the world.</p>
                        <ul>
                            <li>🇨🇭 <strong>Swiss products</strong>: Migros, Coop, Denner brands</li>
                            <li>🇪🇺 <strong>European coverage</strong>: Germany, France, Italy, Austria</li>
                            <li>📊 <strong>Rich data</strong>: Calories, macros, ingredients, allergens</li>
                            <li>🆓 <strong>Open source</strong>: Community-driven, transparent</li>
                        </ul>
                        <a href="https://world.openfoodfacts.org" target="_blank" class="external-link">
                            Visit Open Food Facts →
                        </a>
                    </div>
                    
                    <div class="data-source">
                        <h4>💾 Offline Database</h4>
                        <p><strong>Local nutrition database</strong> - Curated common foods for offline functionality.</p>
                        <ul>
                            <li>⚡ <strong>Instant access</strong>: Works without internet</li>
                            <li>🥗 <strong>Common foods</strong>: Fruits, vegetables, proteins, grains</li>
                            <li>🎯 <strong>Reliable data</strong>: Manually verified nutrition facts</li>
                            <li>🔄 <strong>Fallback</strong>: Used when online sources are unavailable</li>
                        </ul>
                    </div>
                    
                    <div class="data-source">
                        <h4>⭐ Smart Favorites</h4>
                        <p><strong>Personalized suggestions</strong> - Your frequently used foods for faster logging.</p>
                        <ul>
                            <li>🧠 <strong>Learning system</strong>: Remembers your food preferences</li>
                            <li>📈 <strong>Usage tracking</strong>: Prioritizes your most-used foods</li>
                            <li>💨 <strong>Quick access</strong>: Instant suggestions for favorites</li>
                            <li>🔒 <strong>Local storage</strong>: Data stays on your device</li>
                        </ul>
                    </div>
                    
                    <div class="attribution-note">
                        <h4>🙏 Attribution & Thanks</h4>
                        <p>
                            This app is made possible by the incredible work of the Open Food Facts community. 
                            Their commitment to open data and transparency helps millions of people make informed food choices.
                        </p>
                        <p>
                            <strong>License</strong>: Open Food Facts data is available under the 
                            <a href="https://opendatacommons.org/licenses/odbl/" target="_blank">Open Database License</a>.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Restore body scroll when modal is closed
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
                document.body.style.overflow = '';
                modal.remove();
            }
        });
    }

    // Show calorie input modal for manual food entry
    showCalorieInputModal(foodName, unit) {
        return new Promise((resolve, reject) => {
            const modal = document.createElement('div');
            modal.className = 'calorie-input-modal';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📝 Manual Food Entry</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="food-info">
                            <div class="food-name">${foodName}</div>
                            <div class="food-unit">Not found in database - requires manual entry</div>
                        </div>
                        <div class="input-group">
                            <label for="calorie-input">Calories per ${unit}:</label>
                            <input 
                                type="number" 
                                id="calorie-input" 
                                placeholder="Enter calories..." 
                                min="0" 
                                max="9999"
                                step="0.1"
                                autocomplete="off"
                            >
                            <div class="error-message" id="calorie-error">
                                Please enter a valid calorie value (0-9999)
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-cancel">Cancel</button>
                            <button class="btn btn-confirm" disabled>Add Food</button>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to page
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            // Get elements
            const input = modal.querySelector('#calorie-input');
            const errorMsg = modal.querySelector('#calorie-error');
            const confirmBtn = modal.querySelector('.btn-confirm');
            const cancelBtn = modal.querySelector('.btn-cancel');
            const closeBtn = modal.querySelector('.modal-close');

            // Focus input
            setTimeout(() => input.focus(), 100);

            // Input validation
            const validateInput = () => {
                const value = parseFloat(input.value);
                const isValid = !isNaN(value) && value >= 0 && value <= 9999;
                
                if (input.value && !isValid) {
                    input.classList.add('error');
                    errorMsg.classList.add('show');
                    confirmBtn.disabled = true;
                } else {
                    input.classList.remove('error');
                    errorMsg.classList.remove('show');
                    confirmBtn.disabled = !input.value || !isValid;
                }
                
                return isValid;
            };

            // Input event listeners
            input.addEventListener('input', validateInput);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !confirmBtn.disabled) {
                    confirmBtn.click();
                } else if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            });

            // Button event listeners
            confirmBtn.addEventListener('click', () => {
                if (validateInput() && input.value) {
                    const calories = parseFloat(input.value);
                    this.hideCalorieInputModal(modal);
                    resolve(calories);
                }
            });

            const cancelHandler = () => {
                this.hideCalorieInputModal(modal);
                reject(new Error('User cancelled calorie input'));
            };

            cancelBtn.addEventListener('click', cancelHandler);
            closeBtn.addEventListener('click', cancelHandler);

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                    cancelHandler();
                }
            });
        });
    }

    // Hide calorie input modal
    hideCalorieInputModal(modal) {
        document.body.style.overflow = '';
        modal.remove();
    }
}

// Initialize the app
const app = new CalorieTracker();

// Global functions for onclick handlers
window.app = app;