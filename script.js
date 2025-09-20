// Calorie Tracker App JavaScript

class CalorieTracker {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.dailyCalories = 0;
        this.foodLog = [];
        this.calorieGoal = CONFIG.DEFAULT_CALORIE_GOAL;
        this.isOnline = navigator.onLine;
        
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
            'peanut butter': { id: 20, calories: 188, unit: '2 tbsp' }
        };
        
        this.init();
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
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showMessage('Working offline', 'warning');
        });
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
            this.showFoodSuggestions(e.target.value);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#foodName')) {
                this.hideFoodSuggestions();
            }
        });
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
                console.error(`API Error (${response.status}):`, errorData.error);
            }
            
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
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
        if (username === 'demo' && password === 'demo123') {
            this.currentUser = { id: 1, username: 'demo', dailyCalorieGoal: 2000 };
            this.calorieGoal = 2000;
            localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(this.currentUser));
            document.getElementById('welcomeUser').textContent = `Welcome, ${username}!`;
            this.showSection('dashboard');
            this.updateDashboard();
            this.showMessage('Login successful!', 'success');
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
        const foodName = document.getElementById('foodName').value.toLowerCase().trim();
        const quantity = parseInt(document.getElementById('quantity').value);
        const unit = document.getElementById('unit').value;

        if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
            try {
                // Search for food in backend
                const searchResponse = await this.apiCall(`/foods/search?q=${encodeURIComponent(foodName)}`);
                const foods = searchResponse.foods;
                
                if (foods.length === 0) {
                    this.showMessage(`Food "${foodName}" not found in database.`, 'error');
                    return;
                }

                const food = foods[0]; // Use first match
                const calories = this.calculateCalories(food.calories_per_unit, quantity, unit, food.default_unit);

                // Add to backend
                const logResponse = await this.apiCall('/logs', 'POST', {
                    foodId: food.id,
                    quantity,
                    unit,
                    calories,
                    logDate: new Date().toISOString().split('T')[0]
                });

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
        
        this.updateDashboard();
        this.updateFoodLog();
        this.saveToStorage();
        
        document.getElementById('foodForm').reset();
        document.getElementById('quantity').value = 1;
        
        this.showMessage(`Added ${foodName}! +${calories} calories (Offline)`, 'success');
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
        
        if (input.length < CONFIG.MIN_SEARCH_LENGTH) {
            this.hideFoodSuggestions();
            return;
        }

        let matches = [];

        if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
            try {
                const response = await this.apiCall(`/foods/search?q=${encodeURIComponent(input)}`);
                matches = response.foods.slice(0, CONFIG.MAX_SUGGESTIONS);
            } catch (error) {
                // Fallback to offline
                matches = Object.keys(this.offlineFoodDatabase).filter(food => 
                    food.includes(input.toLowerCase())
                ).slice(0, CONFIG.MAX_SUGGESTIONS);
            }
        } else {
            matches = Object.keys(this.offlineFoodDatabase).filter(food => 
                food.includes(input.toLowerCase())
            ).slice(0, CONFIG.MAX_SUGGESTIONS);
        }

        if (matches.length === 0) {
            this.hideFoodSuggestions();
            return;
        }

        const suggestions = matches.map(food => {
            const foodName = typeof food === 'string' ? food : food.name;
            return `<div class="suggestion-item" onclick="app.selectFood('${foodName}')">${foodName}</div>`;
        }).join('');

        suggestionsDiv.innerHTML = suggestions;
        suggestionsDiv.style.display = 'block';
    }

    hideFoodSuggestions() {
        document.getElementById('foodSuggestions').style.display = 'none';
    }

    selectFood(foodName) {
        document.getElementById('foodName').value = foodName;
        this.hideFoodSuggestions();
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

        if (this.isOnline && !deletedFood.offline && !CONFIG.DEVELOPMENT_MODE) {
            try {
                await this.apiCall(`/logs/${foodId}`, 'DELETE');
            } catch (error) {
                this.showMessage(`Error deleting food: ${error.message}`, 'error');
                return;
            }
        }

        this.dailyCalories -= deletedFood.calories;
        this.foodLog.splice(foodIndex, 1);
        
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
}

// Initialize the app
const app = new CalorieTracker();

// Global functions for onclick handlers
window.app = app;