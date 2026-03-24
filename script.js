// Calorie Tracker App JavaScript

// =============================================================================
// TOAST NOTIFICATION SYSTEM
// =============================================================================

class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = new Map(); // Track active notifications
        this.notificationCounter = 0;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    // Main notification method
    show(message, type = 'info', options = {}) {
        const id = ++this.notificationCounter;
        const config = {
            title: this.getDefaultTitle(type),
            duration: this.getDefaultDuration(type),
            closable: true,
            ...options
        };

        const notification = this.createNotificationElement(id, message, type, config);
        
        // Add to container
        this.container.appendChild(notification);
        this.notifications.set(id, notification);

        // Show with animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-dismiss if duration is set
        if (config.duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, config.duration);
        }

        return id;
    }

    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { duration: 6000, ...options });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', { duration: 5000, ...options });
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    // Hide specific notification
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    // Clear all notifications
    clear() {
        this.notifications.forEach((_, id) => this.hide(id));
    }

    // Create notification DOM element
    createNotificationElement(id, message, type, config) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('data-notification-id', id);

        // Add progress bar for auto-dismiss
        if (config.duration > 0) {
            toast.style.setProperty('--duration', `${config.duration}ms`);
        }

        toast.innerHTML = `
            <div class="toast-icon">${this.getIcon(type)}</div>
            <div class="toast-content">
                ${config.title ? `<div class="toast-title">${this.escapeHtml(config.title)}</div>` : ''}
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            ${config.closable ? '<button class="toast-close" type="button">&times;</button>' : ''}
            ${config.duration > 0 ? '<div class="toast-progress"></div>' : ''}
        `;

        // Add close button listener
        if (config.closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.hide(id));
        }

        return toast;
    }

    // Get appropriate icon for notification type
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    // Get default title for notification type
    getDefaultTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || titles.info;
    }

    // Get default duration for notification type
    getDefaultDuration(type) {
        const durations = {
            success: 4000,
            error: 6000,
            warning: 5000,
            info: 4000
        };
        return durations[type] || 4000;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show API operation feedback
    showApiResult(response, operation = 'Operation') {
        if (response.success) {
            const message = response.message || `${operation} completed successfully`;
            this.success(message);
        } else {
            const message = this.formatErrorMessage(response.message || `${operation} failed`);
            this.error(message);
        }
    }

    // Format error messages to be user-friendly
    formatErrorMessage(message) {
        const errorMappings = {
            'Network request failed': 'Network error. Please check your connection and try again.',
            'Unauthorized': 'Session expired. Please log in again.',
            'Forbidden': 'You don\'t have permission to perform this action.',
            'Not Found': 'The requested resource was not found.',
            'Too Many Requests': 'Too many requests. Please wait a moment and try again.',
            'Internal Server Error': 'Server error. Please try again later.',
            'Bad Gateway': 'Server temporarily unavailable. Please try again later.',
            'Service Unavailable': 'Service temporarily unavailable. Please try again later.'
        };

        // Check for exact matches
        for (const [key, value] of Object.entries(errorMappings)) {
            if (message.includes(key)) {
                return value;
            }
        }

        return message; // Return original message if no mapping found
    }
}

// =============================================================================
// MAIN CALORIE TRACKER CLASS
// =============================================================================

class CalorieTracker {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.dailyCalories = 0;
        this.foodLog = [];
        this.calorieGoal = CONFIG.DEFAULT_CALORIE_GOAL;
        this.isOnline = navigator.onLine;
        
        // Initialize notification system
        this.notifications = new NotificationSystem();
        
        // Weight tracking
        this.weightChart = null; // Chart.js instance for weight graph
        
        // Admin properties
        this.isAdmin = false;
        this.adminData = {
            users: [],
            foods: [],
            filteredFoods: null, // For search filtering
            stats: {},
            foodsSortColumn: 'name', // Default sort column
            foodsSortDirection: 'asc', // 'asc' or 'desc'
            selectedFoodIds: new Set() // Track selected food IDs for bulk operations
        };
        
        // User Contributions properties
        this.contributionsData = {
            foods: [],
            stats: {},
            topContributors: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0
            },
            filters: {
                sortBy: 'popularity', // 'popularity', 'recent', 'alphabetical'
                minUsage: 0,
                searchQuery: '' // Search query for filtering
            }
        };
        
        // History properties
        this.historyData = {
            days: [], // Array of day summaries
            expandedDays: new Set(), // Track which days are expanded
            currentOffset: 0,
            limit: 30,
            hasMore: false,
            isExpanded: false // Track if history section is visible
        };

        // Calendar state
        const now = new Date();
        this.calendarState = {
            year: now.getFullYear(),
            month: now.getMonth() + 1, // 1-based
            isExpanded: false
        };
        
        // CRUD operation context
        this.currentEditContext = null; // { date, logId, isNew }
        this.currentDeleteContext = null; // { logId, foodName, date }
        
        // Cache properties
        this.openFoodFactsCache = new Map(); // Cache for food search results

        // Hybrid storage properties
        this.syncQueue = []; // Queue for pending sync operations
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.syncStatus = 'pending'; // 'pending', 'syncing', 'synced', 'error'
        
        // Search debounce timers
        this.searchDebounceTimers = {
            foodDb: null,
            contributions: null
        };
        
        this.loadCachedFoods();
        
        // Don't call init() here - will be called after DOM is ready
    }

    // Search Pios Food DB in backend database
    async searchLocalFoods(query, limit = 10) {
        try {
            const response = await this.apiCall(`/foods/search?q=${encodeURIComponent(query)}`);
            if (response.success && response.foods) {
                return response.foods.map(food => ({
                    id: food.id,
                    name: food.name,
                    calories: food.calories_per_100g || food.calories_per_unit || food.calories || 0,
                    unit: 'g', // All foods now use grams
                    brand: food.brand || '',
                    distributor: food.distributor || '',
                    source: 'Local Database',
                    protein: food.protein_per_100g || food.protein || 0,
                    carbs: food.carbs_per_100g || food.carbs || 0,
                    fat: food.fat_per_100g || food.fat || 0,
                    fiber: food.fiber_per_100g || food.fiber || 0
                })).slice(0, limit);
            }
            return [];
        } catch (error) {
            logger.error('Local food search error:', error);
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
                    logger.info(`Loaded ${cacheData.searches.length} cached food searches`);
                }
            }
        } catch (error) {
            logger.error('Error loading cached foods:', error);
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
            logger.error('Error saving food cache:', error);
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
            logger.error('Error adding to favorites:', error);
        }
    }

    getFavorites() {
        try {
            const favorites = localStorage.getItem('favoritesFoods');
            return favorites ? JSON.parse(favorites) : [];
        } catch (error) {
            logger.error('Error getting favorites:', error);
            return [];
        }
    }

    // Enhanced search with favorites priority - respects database toggles
    async searchAllFoodsWithFavorites(query) {
        const results = [];
        const searchTerm = query.toLowerCase();
        const preferences = this.getDatabaseTogglePreferences();
        
        logger.info('🔍 Search preferences:', preferences);
        
        // 1. Search favorites first (instant) if enabled
        if (preferences.favorites) {
            const favorites = this.getFavorites().filter(food => 
                food.name.toLowerCase().includes(searchTerm)
            );
            results.push(...favorites.slice(0, 3).map(food => ({...food, source: `⭐ ${food.source}`})));
            logger.info('⭐ Favorites search enabled, found:', favorites.length);
        } else {
            logger.info('⭐ Favorites search disabled');
        }
        
        // 2. Search Pios Food DB if online and enabled
        if (this.isOnline && navigator.onLine && !CONFIG.DEVELOPMENT_MODE) {
            try {
                // Search Pios Food DB if enabled
                if (preferences.localFoods) {
                    const localResults = await this.searchLocalFoods(query, 10);
                    results.push(...localResults);
                    logger.info('🏠 Pios Food DB search enabled, found:', localResults.length);
                } else {
                    logger.info('🏠 Pios Food DB search disabled');
                }
                
            } catch (error) {
                logger.info('Backend search failed, using offline only:', error);
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
        
        logger.info('🔍 Total unique results after deduplication:', uniqueResults.length);
        return uniqueResults;
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
            this.notifications.success('Connection restored');
            // Try to process pending sync queue when back online
            setTimeout(() => this.processSyncQueue(), 1000);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifications.warning('Working offline');
        });
        
        // Initialize sync status
        this.updateSyncStatus('pending');
        
        // Periodic sync attempt (every 30 seconds)
        setInterval(() => {
            if (this.isOnline && this.syncQueue.length > 0 && !this.syncInProgress) {
                this.processSyncQueue();
            }
        }, 30000);
        
        // Initialize food form date and meal category
        this.initializeFoodForm();
    }
    
    // Initialize food logging form with smart defaults
    initializeFoodForm() {
        // Set log date to today by default
        const logDateInput = document.getElementById('logDate');
        if (logDateInput) {
            logDateInput.value = new Date().toISOString().split('T')[0];
            // Set max date to today (can't log future meals)
            logDateInput.max = new Date().toISOString().split('T')[0];
        }
        
        // Set weight date to today by default
        const weightDateInput = document.getElementById('weightDate');
        if (weightDateInput) {
            weightDateInput.value = new Date().toISOString().split('T')[0];
            weightDateInput.max = new Date().toISOString().split('T')[0];
        }
        
        // Auto-suggest meal category based on current time
        const mealCategoryInput = document.getElementById('mealCategory');
        if (mealCategoryInput) {
            const now = new Date();
            const hour = now.getHours();
            
            // Smart meal category suggestion based on time of day
            let suggestedCategory = 'other';
            if (hour >= 5 && hour < 11) {
                suggestedCategory = 'breakfast';
            } else if (hour >= 11 && hour < 15) {
                suggestedCategory = 'lunch';
            } else if (hour >= 17 && hour < 22) {
                suggestedCategory = 'dinner';
            } else if (hour >= 15 && hour < 17 || hour >= 22 || hour < 5) {
                suggestedCategory = 'snack';
            }
            
            mealCategoryInput.value = suggestedCategory;
        }
        
        // Set current time in meal time input — use existing meal's time if already logged today
        const mealTimeInput = document.getElementById('mealTime');
        if (mealTimeInput && mealCategoryInput) {
            const existingTime = this.getMealTimeForCategory(mealCategoryInput.value);
            if (existingTime) {
                mealTimeInput.value = existingTime;
            } else {
                const now = new Date();
                mealTimeInput.value = now.toTimeString().slice(0, 5); // HH:MM format
            }
        }
    }

    // Returns HH:MM time of first existing log entry for the given meal category, or null
    getMealTimeForCategory(category) {
        const entry = this.foodLog.find(f => (f.meal_category || 'other') === category && f.meal_time);
        return entry ? entry.meal_time : null; // meal_time is already HH:MM
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
            logger.debug('🟢 FORM SUBMIT EVENT TRIGGERED!');
            e.preventDefault();
            logger.debug('🟢 Calling handleAddFood()...');
            this.handleAddFood();
        });

        // Pios Food DB form
        const piosFoodDBForm = document.getElementById('piosFoodDBForm');
        if (piosFoodDBForm) {
            piosFoodDBForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddPiosFoodDB();
            });
        }

        // Edit Food Log form
        const editFoodLogForm = document.getElementById('editFoodLogForm');
        if (editFoodLogForm) {
            editFoodLogForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditFoodLogSubmit();
            });
        }
        
        // Promote Food form
        const promoteFoodForm = document.getElementById('promoteFoodForm');
        if (promoteFoodForm) {
            promoteFoodForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePromoteFoodSubmit();
            });
        }
        
        // Food name input for suggestions
        document.getElementById('foodName').addEventListener('input', (e) => {
            this.debouncedFoodSearch(e.target.value);
        });

        // Add keyboard navigation for food suggestions
        document.getElementById('foodName').addEventListener('keydown', (e) => {
            this.handleSuggestionKeyboard(e);
        });

        // Search inputs for admin panels
        const foodDbSearchInput = document.getElementById('foodDbSearchInput');
        if (foodDbSearchInput) {
            foodDbSearchInput.addEventListener('input', (e) => {
                this.searchFoodDatabase(e.target.value);
            });
        }

        const contributionsSearchInput = document.getElementById('contributionsSearchInput');
        if (contributionsSearchInput) {
            contributionsSearchInput.addEventListener('input', (e) => {
                this.searchUserContributions(e.target.value);
            });
        }

        // Weight tracking form
        const weightForm = document.getElementById('weightForm');
        if (weightForm) {
            weightForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogWeight();
            });
        }

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#foodName') && !e.target.closest('#foodSuggestions')) {
                this.hideFoodSuggestions();
            }
        });

        // Initialize debounced search
        this.initDebouncing();
        
        // Initialize database search toggles
        this.initDatabaseToggles();
        
        // Initialize goal editing functionality
        this.initGoalEditing();
        
        // Initialize event delegation for data-action attributes
        this.initEventDelegation();
        
        // Initialize inline editing for admin food table
        this.initInlineEditing();
        
        // Initialize user management forms
        this.initUserManagementForms();
    }
    
    // Initialize user management forms
    initUserManagementForms() {
        // Create User Form
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) {
            createUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCreateUser();
            });
        }
        
        // Change Password Form (for current user)
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleChangePassword();
            });
            
            // Real-time password validation
            const newPassword = document.getElementById('newPassword');
            const confirmNewPassword = document.getElementById('confirmNewPassword');
            const currentPassword = document.getElementById('currentPassword');
            
            if (newPassword && confirmNewPassword && currentPassword) {
                [newPassword, confirmNewPassword, currentPassword].forEach(input => {
                    input.addEventListener('input', () => {
                        this.updatePasswordRequirements();
                    });
                });
            }
        }
        
        // Admin Change Password Form (for any user)
        const adminChangePasswordForm = document.getElementById('adminChangePasswordForm');
        if (adminChangePasswordForm) {
            adminChangePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAdminChangePassword();
            });
            
            // Real-time password validation for admin form
            const adminNewPassword = document.getElementById('adminNewPassword');
            const adminConfirmPassword = document.getElementById('adminConfirmPassword');
            
            if (adminNewPassword && adminConfirmPassword) {
                [adminNewPassword, adminConfirmPassword].forEach(input => {
                    input.addEventListener('input', () => {
                        this.updateAdminPasswordRequirements();
                    });
                });
            }
        }
        
        // Edit User Form
        const editUserForm = document.getElementById('editUserForm');
        if (editUserForm) {
            editUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleEditUser();
            });
        }
        
        // Password visibility toggles
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.target;
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    button.textContent = isPassword ? '👁️' : '👁️‍🗨️';
                }
            });
        });
    }

    // Initialize event delegation for all data-action elements
    initEventDelegation() {
        document.addEventListener('click', async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            
            switch (action) {
                // Info buttons
                case 'show-data-sources':
                    e.preventDefault();
                    this.showDataSourcesInfo();
                    break;
                    
                case 'show-database-toggle-info':
                    e.preventDefault();
                    this.showDatabaseToggleInfo();
                    break;
                
                // History view
                case 'toggle-history':
                    e.preventDefault();
                    this.toggleHistory();
                    break;
                
                case 'load-more-history':
                    e.preventDefault();
                    this.loadMoreHistory();
                    break;
                
                // Weight tracking
                case 'toggle-weight-tracking':
                    e.preventDefault();
                    this.toggleWeightTracking();
                    break;
                
                case 'toggle-calorie-chart':
                    e.preventDefault();
                    this.toggleCalorieChart();
                    break;
                
                case 'view-day-details':
                    e.preventDefault();
                    this.viewDayDetails(target.dataset.date);
                    break;
                
                // Food Log CRUD operations
                case 'add-food-log':
                    e.preventDefault();
                    this.openAddFoodLogModal(target.dataset.date);
                    break;
                
                case 'edit-food-log':
                    e.preventDefault();
                    this.openEditFoodLogModal(target.dataset.logId, target.dataset.date);
                    break;
                
                case 'delete-food-log':
                    e.preventDefault();
                    this.openDeleteConfirmModal(target.dataset.logId, target.dataset.foodName, target.dataset.date);
                    break;

                case 'add-day-comment':
                case 'edit-day-comment': {
                    e.preventDefault();
                    const editDate = target.dataset.date;
                    // Ensure cache is populated before opening edit form
                    await this.fetchDayComment(editDate);
                    this.swapCommentSection(editDate, this.renderDayCommentEditHtml(editDate));
                    break;
                }

                case 'save-day-comment': {
                    e.preventDefault();
                    const saveDate = target.dataset.date;
                    const saveSection = document.querySelector(`.day-comment-section[data-date="${saveDate}"]`);
                    const saveText = saveSection?.querySelector('.comment-textarea')?.value || '';
                    // Disable buttons while saving
                    saveSection?.querySelectorAll('button').forEach(b => b.disabled = true);
                    try {
                        await this.saveDayComment(saveDate, saveText);
                        this.swapCommentSection(saveDate, this.renderDayCommentHtml(saveDate));
                    } catch (err) {
                        this.showMessage('Failed to save note: ' + err.message, 'error');
                        saveSection?.querySelectorAll('button').forEach(b => b.disabled = false);
                    }
                    break;
                }

                case 'delete-day-comment': {
                    e.preventDefault();
                    const delDate = target.dataset.date;
                    if (confirm('Delete this note?')) {
                        try {
                            await this.saveDayComment(delDate, '');
                            this.swapCommentSection(delDate, this.renderDayCommentHtml(delDate));
                        } catch (err) {
                            this.showMessage('Failed to delete note: ' + err.message, 'error');
                        }
                    }
                    break;
                }

                case 'cancel-day-comment':
                    e.preventDefault();
                    this.swapCommentSection(target.dataset.date, this.renderDayCommentHtml(target.dataset.date));
                    break;
                
                case 'edit-weight':
                    e.preventDefault();
                    this.editWeightEntry(target.dataset.weightId);
                    break;
                
                case 'delete-weight':
                    e.preventDefault();
                    this.deleteWeightEntry(target.dataset.weightId);
                    break;
                
                case 'close-edit-modal':
                    e.preventDefault();
                    this.closeEditFoodLogModal();
                    break;
                
                case 'close-delete-modal':
                    e.preventDefault();
                    this.closeDeleteConfirmModal();
                    break;
                
                case 'confirm-delete-log':
                    e.preventDefault();
                    this.confirmDeleteFoodLog();
                    break;
                
                // Admin section navigation
                case 'show-admin-section':
                    e.preventDefault();
                    this.showAdminSection(target.dataset.section);
                    break;
                
                // Bulk operations
                case 'bulk-delete-foods':
                    e.preventDefault();
                    this.bulkDeleteFoods();
                    break;
                
                // Sort table
                case 'sort-foods-table':
                    e.preventDefault();
                    this.sortFoodsTable(target.dataset.column);
                    break;
                
                // Search food database
                case 'search-food-db':
                    this.searchFoodDatabase(target.value);
                    break;
                    
                case 'clear-food-db-search':
                    e.preventDefault();
                    this.clearFoodDatabaseSearch();
                    break;
                
                // Search contributions
                case 'search-contributions':
                    this.searchUserContributions(target.value);
                    break;
                    
                case 'clear-contributions-search':
                    e.preventDefault();
                    this.clearContributionsSearch();
                    break;
                
                // SQL Query buttons
                case 'execute-sql-query':
                    e.preventDefault();
                    this.executeSQLQuery();
                    break;
                    
                case 'clear-query':
                    e.preventDefault();
                    this.clearQuery();
                    break;
                
                // Table browser
                case 'close-table-browser':
                    e.preventDefault();
                    this.closeTableBrowser();
                    break;
                
                // Dynamically generated actions (from script.js)
                case 'delete-food':
                    e.preventDefault();
                    this.deleteFood(parseInt(target.dataset.foodId));
                    break;
                    
                case 'delete-user':
                    e.preventDefault();
                    this.deleteUser(parseInt(target.dataset.userId));
                    break;
                    
                case 'reset-user-password':
                    e.preventDefault();
                    this.resetUserPassword(parseInt(target.dataset.userId));
                    break;
                    
                case 'admin-change-password':
                    e.preventDefault();
                    this.showAdminChangePasswordModal(parseInt(target.dataset.userId));
                    break;
                    
                case 'close-admin-change-password-modal':
                    e.preventDefault();
                    this.closeAdminChangePasswordModal();
                    break;
                    
                case 'edit-user':
                    e.preventDefault();
                    this.showEditUserModal(parseInt(target.dataset.userId));
                    break;
                    
                case 'close-edit-user-modal':
                    e.preventDefault();
                    this.closeEditUserModal();
                    break;
                    
                case 'browse-table':
                    e.preventDefault();
                    this.browseTable(target.dataset.tableName);
                    break;
                    
                case 'show-table-structure':
                    e.preventDefault();
                    this.showTableStructure(target.dataset.tableName);
                    break;
                    
                case 'select-enhanced-food':
                    e.preventDefault();
                    this.selectEnhancedFood(target.dataset.foodData);
                    break;
                    
                case 'toggle-edit-mode':
                    e.preventDefault();
                    this.toggleEditMode(parseInt(target.dataset.foodId));
                    break;
                    
                case 'save-inline-edit':
                    e.preventDefault();
                    this.saveRowEdit(parseInt(target.dataset.foodId));
                    break;
                    
                case 'cancel-inline-edit':
                    e.preventDefault();
                    this.cancelRowEdit(parseInt(target.dataset.foodId));
                    break;
                    
                case 'close-modal':
                    e.preventDefault();
                    target.closest('.data-sources-modal')?.remove();
                    break;
                    
                case 'close-structure-modal':
                    e.preventDefault();
                    target.parentElement?.remove();
                    break;
                    
                // User Contributions actions
                case 'filter-popular-foods':
                    e.preventDefault();
                    this.filterContributions('popular');
                    break;
                    
                case 'filter-recent-foods':
                    e.preventDefault();
                    this.filterContributions('recent');
                    break;
                    
                case 'filter-all-foods':
                    e.preventDefault();
                    this.filterContributions('all');
                    break;
                    
                case 'contributions-prev-page':
                    e.preventDefault();
                    this.changeContributionsPage('prev');
                    break;
                    
                case 'contributions-next-page':
                    e.preventDefault();
                    this.changeContributionsPage('next');
                    break;
                    
                case 'promote-user-food':
                    e.preventDefault();
                    this.openPromoteFoodModal(parseInt(target.dataset.foodId));
                    break;
                    
                case 'reject-user-food':
                    e.preventDefault();
                    this.rejectUserFood(parseInt(target.dataset.foodId), target.dataset.foodName);
                    break;
                    
                case 'delete-user-food':
                    e.preventDefault();
                    this.deleteUserFood(parseInt(target.dataset.foodId), target.dataset.foodName);
                    break;
                    
                case 'close-promote-modal':
                    e.preventDefault();
                    this.closePromoteFoodModal();
                    break;
                    
                // Rewards system actions
                case 'toggle-rewards':
                    e.preventDefault();
                    this.toggleRewardsDetails();
                    break;
                    
                case 'claim-daily-reward':
                    e.preventDefault();
                    this.claimDailyReward();
                    break;
                    
                case 'show-rewards-shop':
                    e.preventDefault();
                    this.showRewardsShop();
                    break;
                    
                case 'show-leaderboard':
                    e.preventDefault();
                    this.showLeaderboard();
                    break;
                    
                case 'show-achievements':
                    e.preventDefault();
                    this.showAchievements();
                    break;
                    
                case 'close-rewards-shop':
                    e.preventDefault();
                    document.getElementById('rewardsShopModal').style.display = 'none';
                    break;
                    
                case 'close-leaderboard':
                    e.preventDefault();
                    document.getElementById('leaderboardModal').style.display = 'none';
                    break;
                    
                case 'close-achievements':
                    e.preventDefault();
                    document.getElementById('achievementsModal').style.display = 'none';
                    break;
                    
                case 'close-purchase-confirm':
                    e.preventDefault();
                    document.getElementById('purchaseConfirmModal').style.display = 'none';
                    break;
                    
                case 'filter-shop':
                    e.preventDefault();
                    this.filterShopByCategory(target.dataset.category);
                    break;
                    
                // User Management
                case 'show-create-user-modal':
                    e.preventDefault();
                    this.showCreateUserModal();
                    break;
                    
                case 'close-create-user-modal':
                    e.preventDefault();
                    this.closeCreateUserModal();
                    break;
                    
                case 'show-change-password-modal':
                    e.preventDefault();
                    this.showChangePasswordModal();
                    break;
                    
                case 'close-change-password-modal':
                    e.preventDefault();
                    this.closeChangePasswordModal();
                    break;

                case 'toggle-calendar':
                    e.preventDefault();
                    this.toggleCalendar();
                    break;

                case 'prev-month':
                    e.preventDefault();
                    this.navigateCalendar(-1);
                    break;

                case 'next-month':
                    e.preventDefault();
                    this.navigateCalendar(1);
                    break;

                case 'update-email':
                    e.preventDefault();
                    this.handleUpdateEmail();
                    break;

                // ── Image attachment (add form) ────────────────────────────
                case 'toggle-image-attach':
                    e.preventDefault();
                    this.toggleImageAttachPanel();
                    break;

                case 'open-image-file':
                    e.preventDefault();
                    document.getElementById('imageFileInput')?.click();
                    break;

                case 'remove-image-attach':
                    e.preventDefault();
                    this._mealPhotoTargetId = null;
                    this._clearPendingImage();
                    break;

                case 'delete-meal-photo': {
                    e.preventDefault();
                    const logId = Number(target.dataset.logId);
                    if (logId) this.openDeletePhotoModal(logId);
                    break;
                }

                case 'close-delete-photo-modal':
                    e.preventDefault();
                    this.closeDeletePhotoModal();
                    break;

                case 'confirm-delete-photo': {
                    e.preventDefault();
                    const pendingId = this._pendingDeletePhotoLogId;
                    this.closeDeletePhotoModal();
                    if (pendingId) this.detachMealPhoto(pendingId);
                    break;
                }

                case 'open-meal-photo': {
                    e.preventDefault();
                    const btn = target;
                    this._mealPhotoTargetId = Number(btn.dataset.targetId);
                    // Directly open file picker / camera — no panel
                    const mealFileInput = document.getElementById('imageFileInput');
                    if (!mealFileInput) break;
                    // One-shot handler: upload immediately on file selection
                    const onFilePicked = async () => {
                        mealFileInput.removeEventListener('change', onFilePicked);
                        const file = mealFileInput.files[0];
                        if (!file || !this._mealPhotoTargetId) return;
                        const targetId = this._mealPhotoTargetId;
                        this._mealPhotoTargetId = null;
                        await this.uploadAndAttachImage(targetId, file, 'file');
                        mealFileInput.value = '';
                    };
                    mealFileInput.addEventListener('change', onFilePicked);
                    mealFileInput.click();
                    break;
                }

                case 'attach-meal-photo':
                    e.preventDefault();
                    this.attachMealPhoto();
                    break;

                // ── Image attachment (edit modal) ──────────────────────────
                case 'toggle-edit-image-panel':
                    e.preventDefault();
                    this.toggleEditImagePanel();
                    break;

                case 'open-edit-image-file':
                    e.preventDefault();
                    document.getElementById('editImageFileInput')?.click();
                    break;

                case 'remove-edit-image':
                    e.preventDefault();
                    this._clearEditImage();
                    break;

                case 'remove-edit-image-preview':
                    e.preventDefault();
                    this._clearEditImagePreview();
                    break;

                // ── Share modal ────────────────────────────────────────────
                case 'open-share-modal':
                    e.preventDefault();
                    this.openShareModal();
                    break;

                case 'close-share-modal':
                    e.preventDefault();
                    this.closeShareModal();
                    break;

                case 'generate-share-link':
                    e.preventDefault();
                    this.generateShareLink();
                    break;

                case 'copy-share-link':
                    e.preventDefault();
                    this.copyShareLink();
                    break;
            }
        });
        
        // Handle change events for checkboxes
        document.addEventListener('change', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            
            switch (action) {
                case 'meal-category-change': {
                    const mealTimeEl = document.getElementById('mealTime');
                    if (mealTimeEl) {
                        const existing = this.getMealTimeForCategory(target.value);
                        mealTimeEl.value = existing || new Date().toTimeString().slice(0, 5);
                    }
                    break;
                }

                case 'toggle-select-all':
                    this.toggleSelectAll(target);
                    break;
                    
                case 'toggle-food-selection':
                    this.toggleFoodSelection(target, target.dataset.foodId);
                    break;
                    
                case 'change-contributions-sort':
                    this.contributionsData.filters.sortBy = target.value;
                    this.contributionsData.pagination.page = 1; // Reset to first page
                    this.loadContributionsData();
                    break;
                    
                case 'change-min-usage':
                    this.contributionsData.filters.minUsage = parseInt(target.value) || 0;
                    this.contributionsData.pagination.page = 1; // Reset to first page
                    this.loadContributionsData();
                    break;
            }
        });
        
        // Handle keyup events
        document.addEventListener('keyup', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            
            switch (action) {
                case 'search-table-data':
                    this.searchTableData();
                    break;
            }
        });
    }

    // Initialize debouncing for food search
    initDebouncing() {
        this.searchTimeout = null;
        this.isSearching = false;
        this.selectedSuggestionIndex = -1;
    }

    // Initialize database search toggles
    initDatabaseToggles() {
        // Load saved preferences from localStorage
        this.loadDatabaseTogglePreferences();
        
        // Add event listeners to toggle checkboxes
        const toggles = ['toggleFavorites', 'toggleLocalFoods', 'toggleOpenFoodFacts'];
        toggles.forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.addEventListener('change', () => {
                    this.saveDatabaseTogglePreferences();
                    // Clear existing suggestions and re-search if there's current input
                    const foodInput = document.getElementById('foodName');
                    if (foodInput.value.length >= CONFIG.MIN_SEARCH_LENGTH) {
                        this.debouncedFoodSearch(foodInput.value);
                    }
                });
            }
        });
    }

    initGoalEditing() {
        const goalDisplay = document.getElementById('calorieGoal');
        const goalInput = document.getElementById('calorieGoalInput');
        
        // Click to edit goal
        goalDisplay.addEventListener('click', () => {
            this.startGoalEditing();
        });
        
        // Save on Enter or blur
        goalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveGoalEdit();
            } else if (e.key === 'Escape') {
                this.cancelGoalEdit();
            }
        });
        
        goalInput.addEventListener('blur', () => {
            this.saveGoalEdit();
        });
    }

    startGoalEditing() {
        const goalDisplay = document.getElementById('calorieGoal');
        const goalInput = document.getElementById('calorieGoalInput');
        
        goalInput.value = this.calorieGoal;
        goalDisplay.style.display = 'none';
        goalInput.style.display = 'block';
        goalInput.focus();
        goalInput.select();
    }

    cancelGoalEdit() {
        const goalDisplay = document.getElementById('calorieGoal');
        const goalInput = document.getElementById('calorieGoalInput');
        
        goalDisplay.style.display = 'block';
        goalInput.style.display = 'none';
    }

    async saveGoalEdit() {
        const goalDisplay = document.getElementById('calorieGoal');
        const goalInput = document.getElementById('calorieGoalInput');
        const newGoal = parseInt(goalInput.value);
        
        // Validate goal
        if (!newGoal || newGoal < 500 || newGoal > 10000) {
            this.notifications.error('Please enter a valid goal between 500 and 10000 calories');
            return;
        }
        
        // Update local goal
        this.calorieGoal = newGoal;
        goalDisplay.textContent = newGoal;
        
        // Save to backend for current date
        try {
            const today = new Date().toISOString().split('T')[0];
            await this.apiCall('/user/daily-goal', 'POST', {
                date: today,
                goal: newGoal
            });
            
            this.notifications.success(`Daily goal updated to ${newGoal} kcal`);
        } catch (error) {
            logger.warn('Failed to save goal to server:', error);
            // Still allow local update for offline functionality
        }
        
        // Hide input and show display
        this.cancelGoalEdit();
        
        // Update progress bar
        this.updateDashboard();
    }

    // Load database toggle preferences from localStorage
    loadDatabaseTogglePreferences() {
        const preferences = JSON.parse(localStorage.getItem('databaseTogglePreferences') || '{}');
        
        // Default all to true if not set
        const defaults = {
            favorites: true,
            localFoods: true,
            openFoodFacts: true
        };
        
        const settings = { ...defaults, ...preferences };
        
        // Safely set checkboxes only if they exist
        const toggleFavorites = document.getElementById('toggleFavorites');
        const toggleLocalFoods = document.getElementById('toggleLocalFoods');
        const toggleOpenFoodFacts = document.getElementById('toggleOpenFoodFacts');
        
        if (toggleFavorites) toggleFavorites.checked = settings.favorites;
        if (toggleLocalFoods) toggleLocalFoods.checked = settings.localFoods;
        if (toggleOpenFoodFacts) toggleOpenFoodFacts.checked = settings.openFoodFacts;
    }

    // Save database toggle preferences to localStorage
    saveDatabaseTogglePreferences() {
        const toggleFavorites = document.getElementById('toggleFavorites');
        const toggleLocalFoods = document.getElementById('toggleLocalFoods');
        const toggleOpenFoodFacts = document.getElementById('toggleOpenFoodFacts');
        
        const preferences = {
            favorites: toggleFavorites ? toggleFavorites.checked : true,
            localFoods: toggleLocalFoods ? toggleLocalFoods.checked : true,
            openFoodFacts: toggleOpenFoodFacts ? toggleOpenFoodFacts.checked : true
        };
        
        localStorage.setItem('databaseTogglePreferences', JSON.stringify(preferences));
    }

    // Get current database toggle preferences
    getDatabaseTogglePreferences() {
        const toggleFavorites = document.getElementById('toggleFavorites');
        const toggleLocalFoods = document.getElementById('toggleLocalFoods');
        
        return {
            favorites: toggleFavorites ? toggleFavorites.checked : true,
            localFoods: toggleLocalFoods ? toggleLocalFoods.checked : true
        };
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

        if (this.isOnline) {
            try {
                const response = await this.apiCall('/auth/verify', 'GET');
                if (response.valid) {
                    this.currentUser = response.user;
                    this.calorieGoal = response.user.dailyCalorieGoal;
                    document.getElementById('welcomeUser').textContent = `Welcome, ${response.user.username}!`;
                    this.showSection('dashboard');
                    await this.loadTodaysData();
                    await this.loadUserProfile();
                    
                    // Check admin status and show admin interface if applicable
                    await this.checkAdminStatus();
                    this.toggleAdminInterface();
                    
                    // Load rewards data
                    await this.loadRewardsData();
                    
                    return;
                }
            } catch (error) {
                logger.error('Auth check failed:', error);
                // Clear invalid token
                localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
                this.authToken = null;
            }
        }
        
        // Fallback to offline mode or login
        this.showSection('login');
    }

    async apiCall(endpoint, method = 'GET', data = null, options = {}) {
        const {
            showLoading = false,
            showSuccess = false,
            showError = true,
            loadingMessage = 'Saving...',
            successMessage = null,
            silent = false
        } = options;

        // Show loading notification for non-GET requests
        let loadingNotificationId = null;
        if (showLoading && method !== 'GET' && !silent) {
            loadingNotificationId = this.notifications.info(loadingMessage, { duration: 0 });
        }

        try {
            if (!this.isOnline) {
                throw new Error('API not available in offline mode');
            }

            const fetchOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (this.authToken) {
                fetchOptions.headers.Authorization = `Bearer ${this.authToken}`;
            }

            if (data) {
                fetchOptions.body = JSON.stringify(data);
            }

            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, fetchOptions);
            
            // Hide loading notification
            if (loadingNotificationId) {
                this.notifications.hide(loadingNotificationId);
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Network error' }));
                
                // Don't log expected errors (auth failures, admin checks for non-admins)
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
                
                // Create an error object with both message and full data
                const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
                error.statusCode = response.status;
                error.data = errorData; // Preserve full error data including details
                throw error;
            }

            const result = await response.json();
            
            // Handle new backend response format
            if (result.success === false) {
                if (showError && !silent) {
                    this.notifications.error(result.message || 'Operation failed');
                }
                
                const error = new Error(result.message || result.error || 'API request failed');
                error.data = result; // Preserve full response including details
                throw error;
            }
            
            // Show success notification for successful operations
            if (showSuccess && !silent && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
                const message = successMessage || result.message || this.getDefaultSuccessMessage(method, endpoint);
                this.notifications.success(message);
            }
            
            return result;
            
        } catch (error) {
            // Hide loading notification on error
            if (loadingNotificationId) {
                this.notifications.hide(loadingNotificationId);
            }
            
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                if (showError && !silent) {
                    this.notifications.error('Network error. Please check your connection and try again.');
                }
                error.message = 'Network request failed';
            }
            
            throw error;
        }
    }

    // Get user-friendly HTTP error messages
    getHttpErrorMessage(statusCode, errorData) {
        const statusMessages = {
            400: 'Invalid request. Please check your input.',
            401: 'Session expired. Please log in again.',
            403: 'You don\'t have permission to perform this action.',
            404: 'The requested resource was not found.',
            429: 'Too many requests. Please wait a moment and try again.',
            500: 'Server error. Please try again later.',
            502: 'Server temporarily unavailable. Please try again later.',
            503: 'Service temporarily unavailable. Please try again later.'
        };

        return errorData.message || statusMessages[statusCode] || 'An unexpected error occurred.';
    }

    // Generate default success messages based on operation
    getDefaultSuccessMessage(method, endpoint) {
        const operation = this.getOperationName(method, endpoint);
        return `${operation} completed successfully`;
    }

    // Extract operation name from method and endpoint
    getOperationName(method, endpoint) {
        if (endpoint.includes('/logs')) {
            if (method === 'POST') return 'Food logged';
            if (method === 'PUT') return 'Log updated';
            if (method === 'DELETE') return 'Log deleted';
        }
        
        if (endpoint.includes('/foods')) {
            if (method === 'POST') return 'Food added';
            if (method === 'PUT') return 'Food updated';
            if (method === 'DELETE') return 'Food deleted';
        }
        
        if (endpoint.includes('/auth')) {
            if (method === 'POST' && endpoint.includes('login')) return 'Logged in';
            if (method === 'POST' && endpoint.includes('logout')) return 'Logged out';
        }
        
        const operations = {
            'POST': 'Created',
            'PUT': 'Updated',
            'DELETE': 'Deleted'
        };
        
        return operations[method] || 'Operation';
    }

    // =============================================================================
    // FORM UTILITY METHODS
    // =============================================================================

    // Add loading state to button
    setButtonLoading(button, loading = true, originalText = null) {
        if (!button) return;
        
        if (loading) {
            button.dataset.originalText = originalText || button.textContent;
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    // Add loading state to form
    setFormLoading(form, loading = true) {
        if (!form) return;
        
        if (loading) {
            form.classList.add('form-loading');
            // Disable all form inputs
            form.querySelectorAll('input, button, select, textarea').forEach(element => {
                if (!element.disabled) {
                    element.dataset.wasEnabled = 'true';
                    element.disabled = true;
                }
            });
        } else {
            form.classList.remove('form-loading');
            // Re-enable previously enabled inputs
            form.querySelectorAll('[data-was-enabled="true"]').forEach(element => {
                element.disabled = false;
                delete element.dataset.wasEnabled;
            });
        }
    }

    // Show field validation error
    showFieldError(fieldElement, message) {
        if (!fieldElement) return;
        
        const formField = fieldElement.closest('.form-field, .input-group, .form-group');
        if (!formField) return;
        
        // Add invalid class
        formField.classList.add('invalid');
        
        // Remove existing error message
        const existingError = formField.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        fieldElement.parentNode.appendChild(errorElement);
        
        // Clear error when user starts typing
        const clearError = () => {
            this.clearFieldError(fieldElement);
            fieldElement.removeEventListener('input', clearError);
            fieldElement.removeEventListener('change', clearError);
        };
        
        fieldElement.addEventListener('input', clearError);
        fieldElement.addEventListener('change', clearError);
    }

    // Clear field validation error
    clearFieldError(fieldElement) {
        if (!fieldElement) return;
        
        const formField = fieldElement.closest('.form-field, .input-group, .form-group');
        if (!formField) return;
        
        formField.classList.remove('invalid');
        
        const errorElement = formField.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // Clear all form errors
    clearFormErrors(form) {
        if (!form) return;
        
        form.querySelectorAll('.invalid').forEach(field => {
            field.classList.remove('invalid');
        });
        
        form.querySelectorAll('.field-error').forEach(error => {
            error.remove();
        });
    }

    // Validate form fields
    validateField(fieldElement, rules = {}) {
        if (!fieldElement) return { valid: true };
        
        const value = fieldElement.value.trim();
        const {
            required = false,
            minLength = null,
            maxLength = null,
            pattern = null,
            min = null,
            max = null,
            type = null
        } = rules;
        
        // Required validation
        if (required && !value) {
            return { valid: false, message: 'This field is required' };
        }
        
        // Skip other validations if field is empty and not required
        if (!value && !required) {
            return { valid: true };
        }
        
        // Length validations
        if (minLength !== null && value.length < minLength) {
            return { valid: false, message: `Must be at least ${minLength} characters` };
        }
        
        if (maxLength !== null && value.length > maxLength) {
            return { valid: false, message: `Must be no more than ${maxLength} characters` };
        }
        
        // Pattern validation
        if (pattern && !pattern.test(value)) {
            return { valid: false, message: 'Invalid format' };
        }
        
        // Number validations
        if (type === 'number') {
            const num = parseFloat(value);
            if (isNaN(num)) {
                return { valid: false, message: 'Must be a valid number' };
            }
            
            if (min !== null && num < min) {
                return { valid: false, message: `Must be at least ${min}` };
            }
            
            if (max !== null && num > max) {
                return { valid: false, message: `Must be no more than ${max}` };
            }
        }
        
        return { valid: true };
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
                logger.error('Section not found:', sectionName + 'Section');
            }
        } catch (error) {
            logger.error('Error in showSection:', error);
        }
    }

    async handleLogin() {
        try {
            // Validate inputs using Validators utility
            const username = Validators.validateUsername(
                document.getElementById('username').value
            );
            const password = Validators.validatePassword(
                document.getElementById('password').value
            );

            // For demo credentials, try backend first, then fallback to offline mode
            if ((username === 'demo' && password === 'demo123') || (username === 'admin' && password === 'admin123')) {
            // First try to authenticate with backend if online
            if (this.isOnline && !CONFIG.DEVELOPMENT_MODE) {
                try {
                    const response = await this.apiCall('/auth/login', 'POST', {
                        username,
                        password
                    });

                    // Successfully authenticated with backend
                    this.authToken = response.token;
                    this.currentUser = response.user;
                    this.calorieGoal = response.user.dailyCalorieGoal;
                    
                    localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, response.token);
                    localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(response.user));
                    
                    document.getElementById('welcomeUser').textContent = `Welcome, ${response.user.username}!`;
                    this.showSection('dashboard');
                    await this.loadTodaysData();
                    await this.loadUserProfile();
                    await this.checkAdminStatus();
                    this.toggleAdminInterface();
                    await this.loadRewardsData(); // Load rewards system data
                    this.showMessage('Login successful! (Connected to backend)', 'success');
                    return;
                } catch (error) {
                    logger.info('Backend authentication failed, using demo mode:', error.message);
                }
            }
            
            // Fallback to offline demo mode
            this.currentUser = { 
                id: username === 'admin' ? 2 : 1, 
                username: username, 
                dailyCalorieGoal: 2000 
            };
            this.calorieGoal = 2000;
            this.authToken = null; // Explicitly set to null for demo mode
            localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(this.currentUser));
            
            // Load hybrid data (local + server if available)
            await this.loadHybridData();
            
            // Check admin status and show admin interface if applicable
            await this.checkAdminStatus();
            this.toggleAdminInterface();
            
            document.getElementById('welcomeUser').textContent = `Welcome, ${username}! (Demo mode)`;
            this.showSection('dashboard');
            this.updateDashboard();
            this.showMessage('Login successful! (Demo mode - backend unavailable)', 'warning');
            
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
                await this.loadUserProfile();
                
                // Check admin status and show admin interface if applicable
                await this.checkAdminStatus();
                this.toggleAdminInterface();
                
                await this.loadRewardsData(); // Load rewards system data
                
                this.showMessage('Login successful!', 'success');
                
            } catch (error) {
                this.showMessage(`Login failed: ${error.message}`, 'error');
            }
        } else {
            this.showMessage('Invalid credentials. Use demo/demo123 for offline access', 'error');
        }
        } catch (validationError) {
            // Validation failed - show user-friendly error message
            this.showMessage(validationError.message, 'error');
        }
    }

    async handleLogout() {
        if (this.isOnline && this.authToken && !CONFIG.DEVELOPMENT_MODE) {
            try {
                await this.apiCall('/auth/logout', 'POST');
            } catch (error) {
                logger.error('Logout error:', error);
            }
        }

        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
        localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
        
        this.showSection('login');
        document.getElementById('loginForm').reset();
        this.notifications.success('Logged out successfully');
    }

    async handleAddFood() {
        logger.debug('🔴 handleAddFood() called - START');
        const form = document.getElementById('foodForm');
        const submitButton = form.querySelector('[type="submit"]') || form.querySelector('button');
        
        logger.debug('Form:', form);
        logger.debug('Submit button:', submitButton);
        
        // Clear any existing form errors
        this.clearFormErrors(form);
        
        try {
            logger.debug('🔵 Starting validation...');
            // Validate inputs
            const foodNameInput = document.getElementById('foodName');
            const quantityInput = document.getElementById('quantity');
            
            logger.debug('Food name input:', foodNameInput?.value);
            logger.debug('Quantity input:', quantityInput?.value);
            
            let hasErrors = false;
            
            // Validate food name
            const foodValidation = this.validateField(foodNameInput, {
                required: true,
                minLength: 1,
                maxLength: 100
            });
            
            if (!foodValidation.valid) {
                this.showFieldError(foodNameInput, foodValidation.message);
                hasErrors = true;
            }
            
            // Validate quantity
            const quantityValidation = this.validateField(quantityInput, {
                required: true,
                type: 'number',
                min: 0.1,
                max: 10000
            });
            
            if (!quantityValidation.valid) {
                this.showFieldError(quantityInput, quantityValidation.message);
                hasErrors = true;
            }
            
            if (hasErrors) return;
            
            // Set loading state
            this.setButtonLoading(submitButton, true);
            this.setFormLoading(form, true);
            
            const foodName = foodNameInput.value.trim();
            const quantity = parseFloat(quantityInput.value);
            const unit = 'g'; // Always use grams since unit selector removed
            const brand = document.getElementById('foodBrand')?.value?.trim() || null;
            const distributor = document.getElementById('foodDistributor')?.value || null;
            
            // Get new meal category, date, and time fields
            const mealCategory = document.getElementById('mealCategory')?.value || 'other';
            const logDate = document.getElementById('logDate')?.value || new Date().toISOString().split('T')[0];
            const mealTimeInput = document.getElementById('mealTime')?.value || null;
            // Convert HH:MM to HH:MM:SS format for backend
            const mealTime = mealTimeInput ? `${mealTimeInput}:00` : null;

            // Check if we have enhanced food data from selection
            if (this.selectedFoodData) {
                // Add brand and distributor to selected food data
                this.selectedFoodData.brand = brand || this.selectedFoodData.brand;
                this.selectedFoodData.distributor = distributor || this.selectedFoodData.distributor;
                await this.handleAddEnhancedFood(this.selectedFoodData, quantity, unit);
                return;
            }

        if (this.isOnline) {
            try {
                logger.info('=== FOOD LOGGING STARTED ===');
                logger.info('Food name:', foodName);
                logger.info('Quantity:', quantity);
                logger.info('Meal category:', mealCategory);
                logger.info('Log date:', logDate);
                logger.info('Meal time:', mealTime);
                
                // Search for food in backend
                logger.info('Searching for food in backend...');
                const searchResponse = await this.apiCall(`/foods/search?q=${encodeURIComponent(foodName)}`);
                logger.info('Search response:', searchResponse);
                const foods = searchResponse.success ? searchResponse.foods : [];
                logger.info('Found foods:', foods.length);
                
                let logData, calories;
                
                if (foods.length > 0) {
                    // Found in database - use foodId
                    const food = foods[0]; // Use first match
                    logger.info('Using food from database:', food);
                    calories = this.calculateCalories(food.calories_per_100g, quantity, unit, food.default_unit);
                    logger.info('Calculated calories:', calories);
                    
                    logData = {
                        foodId: food.id,
                        quantity,
                        unit,
                        calories,
                        brand: brand || food.brand,
                        distributor: distributor || food.distributor,
                        logDate: logDate,
                        meal_category: mealCategory,
                        meal_time: mealTime
                    };
                } else {
                    // Not found in database - use custom food name
                    logger.info('Food not found in database, asking for custom calories');
                    // Show custom modal for calories since we don't have food data
                    try {
                        const customCalories = await this.showCalorieInputModal(foodName);
                        logger.info('User entered custom calories:', customCalories);
                        calories = this.calculateCalories(customCalories, quantity, unit, 'g');
                        logger.info('Calculated calories:', calories);
                        
                        logData = {
                            name: foodName,
                            quantity,
                            unit,
                            calories,
                            brand,
                            distributor,
                            logDate: logDate,
                            meal_category: mealCategory,
                            meal_time: mealTime
                        };
                    } catch (error) {
                        // User cancelled calorie input
                        logger.info('User cancelled calorie input');
                        this.notifications.info('Food entry cancelled');
                        return;
                    }
                }

                logger.info('📤 Sending food log data to backend:', logData);
                logger.info('API endpoint:', CONFIG.API_BASE_URL + '/logs');

                // Add to backend with notifications
                const logResponse = await this.apiCall('/logs', 'POST', logData, {
                    showLoading: true,
                    showSuccess: true,
                    successMessage: `Successfully logged ${quantity}g of ${foodName} (${Math.round(calories)} kcal)`
                });

                logger.info('✅ Food log API response:', logResponse);
                logger.info('Response success flag:', logResponse?.success);
                logger.info('Response logId:', logResponse?.logId);

                // Verify the backend save was successful
                if (!logResponse || !logResponse.success) {
                    logger.error('❌ Backend save failed, not updating local state');
                    logger.error('Response was:', logResponse);
                    throw new Error('Failed to save food log to backend');
                }

                logger.info('🔄 Reloading today\'s data from backend...');
                // Reload data from server to get the accurate state (including rewards)
                await this.loadTodaysData();

                logger.info('✅ Food log reloaded from backend after adding');
                logger.info('=== FOOD LOGGING COMPLETED ===');
                
                // Check for rewards data in response (optional, may not be present)
                logger.debug('🎁 Full logResponse object:', logResponse);
                logger.debug('🎁 logResponse.pointsAwarded:', logResponse.pointsAwarded);
                logger.debug('🎁 logResponse.data?.pointsAwarded:', logResponse.data?.pointsAwarded);
                
                const pointsAwarded = logResponse.pointsAwarded || logResponse.data?.pointsAwarded;
                const pointsDetails = logResponse.pointsDetails || logResponse.data?.pointsDetails;
                const milestoneLevel = logResponse.milestoneLevel || logResponse.data?.milestoneLevel;
                
                logger.info('Rewards data from response:', { pointsAwarded, pointsDetails, milestoneLevel });
                logger.debug('🎁 Extracted pointsAwarded:', pointsAwarded);
                logger.debug('🎁 Extracted pointsDetails:', pointsDetails);
                logger.debug('🎁 Extracted milestoneLevel:', milestoneLevel);
                
                if (pointsAwarded && pointsAwarded > 0) {
                    logger.info('Showing points toast for:', pointsAwarded);
                    this.showPointsToast({
                        total: pointsAwarded,
                        reason: 'Food logged!',
                        breakdown: pointsDetails
                    });
                    
                    // Check for milestone level-up in pointsDetails
                    if (pointsDetails && Array.isArray(pointsDetails)) {
                        const levelUp = pointsDetails.find(d => d.reason === 'milestone_level_up');
                        if (levelUp) {
                            this.showLevelUpCelebration({
                                icon: '🍽️',
                                message: `Food Logging Level ${levelUp.newLevel}!`,
                                bonus: levelUp.points,
                                multiplier: levelUp.newMultiplier
                            });
                        }
                    }
                    
                    // Legacy check for level-up
                    if (milestoneLevel) {
                        this.showLevelUpCelebration({
                            icon: '🍽️',
                            message: `Food Logging Level ${milestoneLevel.level}!`,
                            bonus: milestoneLevel.bonusPoints
                        });
                    }
                    
                    // Refresh rewards display (silently fail if not available)
                    await this.loadRewardsData();
                } else {
                    logger.info('No points awarded in response');
                }
                
                // Reset form
                form.reset();
                document.getElementById('quantity').value = 100;
                this.initializeFoodForm();

            } catch (error) {
                // Error notification is handled by apiCall
                logger.error('Error adding food:', error);
            }
        } else {
            // Offline mode
            this.notifications.warning('Please use the food search to find and add foods when offline');
        }
        } catch (error) {
            logger.error('Form validation error:', error);
            this.notifications.error('Please check your input and try again');
        } finally {
            // Always clear loading states
            this.setButtonLoading(submitButton, false);
            this.setFormLoading(form, false);
        }
    }

    // Handle adding enhanced food from Pios Food DB or offline database
    async handleAddEnhancedFood(foodData, quantity, unit) {
        try {
            logger.debug('🔵 handleAddEnhancedFood START');
            logger.debug('🔵 foodData:', foodData);
            logger.debug('🔵 quantity:', quantity);
            logger.info('Adding enhanced food:', foodData);
            
            // Get meal category, date, and time from form
            const mealCategory = document.getElementById('mealCategory')?.value || 'other';
            const logDate = document.getElementById('logDate')?.value || new Date().toISOString().split('T')[0];
            const mealTimeInput = document.getElementById('mealTime')?.value || null;
            logger.debug('🕐 Raw mealTimeInput from form:', mealTimeInput);
            // Convert HH:MM to HH:MM:SS format for backend
            const mealTime = mealTimeInput ? `${mealTimeInput}:00` : null;
            logger.debug('🕐 Converted mealTime for backend:', mealTime);

            // Calculate calories (everything is now per 100g basis)
            const calories = Math.round((foodData.calories / 100) * quantity);

            if (this.isOnline) {
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
                
                logger.info('Sending enhanced food to backend:', logData);
                
                const logResponse = await this.apiCall('/logs', 'POST', logData, {
                    showLoading: true,
                    showSuccess: true,
                    successMessage: `Successfully logged ${quantity}g of ${foodData.name} (${calories} kcal)`
                });
                
                logger.info('Enhanced food log API response:', logResponse);
                logger.debug('🎁 ENHANCED - Full logResponse:', logResponse);
                
                // Verify the backend save was successful
                if (!logResponse || !logResponse.success) {
                    logger.error('Backend save failed');
                    throw new Error('Failed to save food log to backend');
                }
                
                // Reload data from server
                await this.loadTodaysData();
                
                // Handle rewards
                logger.debug('🎁 ENHANCED - logResponse.pointsAwarded:', logResponse.pointsAwarded);
                const pointsAwarded = logResponse.pointsAwarded || logResponse.data?.pointsAwarded;
                const pointsDetails = logResponse.pointsDetails || logResponse.data?.pointsDetails;
                const milestoneLevel = logResponse.milestoneLevel || logResponse.data?.milestoneLevel;
                
                logger.debug('🎁 ENHANCED - Extracted pointsAwarded:', pointsAwarded);
                logger.debug('🎁 ENHANCED - pointsDetails:', pointsDetails);
                
                if (pointsAwarded && pointsAwarded > 0) {
                    logger.debug('🎁 ENHANCED - Showing points toast!');
                    this.showPointsToast({
                        total: pointsAwarded,
                        reason: 'Food logged!',
                        breakdown: pointsDetails
                    });
                    
                    // Check for milestone level-up in pointsDetails
                    if (pointsDetails && Array.isArray(pointsDetails)) {
                        const levelUp = pointsDetails.find(d => d.reason === 'milestone_level_up');
                        if (levelUp) {
                            this.showLevelUpCelebration({
                                icon: '🍽️',
                                message: `Food Logging Level ${levelUp.newLevel}!`,
                                bonus: levelUp.points,
                                multiplier: levelUp.newMultiplier
                            });
                        }
                    }
                    
                    // Legacy check for level-up
                    if (milestoneLevel) {
                        this.showLevelUpCelebration({
                            icon: '🍽️',
                            message: `Food Logging Level ${milestoneLevel.level}!`,
                            bonus: milestoneLevel.bonusPoints
                        });
                    }
                    
                    await this.loadRewardsData();
                }
                
                // Add to favorites
                this.addToFavorites(foodData);
                
            } else {
                // Offline mode - only update local state
                const timestamp = new Date().toLocaleTimeString('en-US', {
                    hour12: false, hour: '2-digit', minute: '2-digit'
                });
                
                const foodLogEntry = {
                    id: Date.now(),
                    name: foodData.name,
                    quantity: quantity,
                    unit: 'g',
                    calories: calories,
                    timestamp: timestamp,
                    offline: true,
                    source: foodData.source || 'Pios Food DB',
                    brand: foodData.brand || '',
                    distributor: foodData.distributor || ''
                };
                
                this.foodLog.push(foodLogEntry);
                this.updateFoodLog();
                this.updateDashboard();
                this.saveToStorage();
                this.addToFavorites(foodData);
                
                this.notifications.success(`Added ${foodData.name} (${quantity}g, ${calories} kcal) - Offline`);
            }
            
            // Reset form
            document.getElementById('foodForm').reset();
            document.getElementById('quantity').value = 100;
            this.initializeFoodForm();
            this.selectedFoodData = null;

        } catch (error) {
            logger.error('Error adding enhanced food:', error);
            this.notifications.error('Error adding food. Please try again.');
        }
    }

    async loadTodaysData() {
        if (this.isOnline) {
            try {
                const today = new Date().toISOString().split('T')[0];
                
                logger.info('=== LOADING TODAY\'S DATA ===');
                logger.info('Loading data for date:', today);
                logger.info('API URL:', CONFIG.API_BASE_URL);
                logger.info('Auth token present:', !!this.authToken);
                
                // Load both food logs and daily goal
                const [logsResponse, goalResponse] = await Promise.all([
                    this.apiCall(`/logs?date=${today}`),
                    this.apiCall(`/user/daily-goal/${today}`).catch(() => ({ goal: this.calorieGoal }))
                ]);
                
                logger.info('📥 Raw logs response:', logsResponse);
                logger.info('📥 Raw goal response:', goalResponse);
                
                // Update goal if found
                if (goalResponse && goalResponse.goal) {
                    this.calorieGoal = goalResponse.goal;
                    logger.info('Updated calorie goal to:', this.calorieGoal);
                }
                
                // Handle different response formats
                const logs = logsResponse.logs || logsResponse.data?.logs || logsResponse.data || [];
                
                logger.info('📋 Parsed logs array (length:', logs.length, '):', logs);
                
                this.foodLog = logs.map(log => {
                    const mapped = {
                        id: log.id,
                        name: log.food_name,
                        quantity: log.quantity,
                        unit: log.unit,
                        calories: parseFloat(log.calories),
                        brand: log.brand || null,
                        distributor: log.distributor || null,
                        meal_category: log.meal_category || 'other',
                        meal_time: log.meal_time ? log.meal_time.slice(0, 5) : null, // HH:MM
                        image_id: log.image_id || null,
                        image_url: log.image_url || null,
                        share_token: log.share_token || null,
                        protein: log.protein_per_100g != null ? parseFloat(log.protein_per_100g) : (log.protein != null ? parseFloat(log.protein) : null),
                        carbs:   log.carbs_per_100g   != null ? parseFloat(log.carbs_per_100g)   : (log.carbs   != null ? parseFloat(log.carbs)   : null),
                        fat:     log.fat_per_100g     != null ? parseFloat(log.fat_per_100g)     : (log.fat     != null ? parseFloat(log.fat)     : null),
                        timestamp: log.logged_at ? new Date(log.logged_at).toLocaleTimeString() : new Date().toLocaleTimeString()
                    };
                    logger.info('Mapped log entry:', mapped);
                    return mapped;
                });
                
                logger.info('🍽️ Mapped food log (length:', this.foodLog.length, '):', this.foodLog);
                
                this.dailyCalories = this.foodLog.reduce((sum, food) => sum + parseFloat(food.calories), 0);

                // Compute daily macro totals (only from items that have macro data)
                let macroProtein = 0, macroCarbs = 0, macroFat = 0, hasMacros = false;
                this.foodLog.forEach(food => {
                    const qty = parseFloat(food.quantity) || 0;
                    if (food.protein != null) { macroProtein += (food.protein / 100) * qty; hasMacros = true; }
                    if (food.carbs   != null) { macroCarbs   += (food.carbs   / 100) * qty; }
                    if (food.fat     != null) { macroFat     += (food.fat     / 100) * qty; }
                });
                this.dailyMacros = hasMacros ? { protein: macroProtein, carbs: macroCarbs, fat: macroFat } : null;
                
                logger.info('🔢 Total daily calories calculated:', this.dailyCalories);
                
                logger.info('🔄 Updating dashboard and food log display...');
                this.updateDashboard();
                this.updateFoodLog();
                
                logger.info('=== LOADING TODAY\'S DATA COMPLETED ===');
                
            } catch (error) {
                logger.error('❌ Failed to load today\'s data:', error);
                logger.error('Error details:', error.message, error.stack);
                this.showMessage('Failed to load data from server', 'error');
            }
        } else {
            logger.info('⚠️ Skipping loadTodaysData - offline');
        }
    }

    calculateCalories(baseCalories, quantity, inputUnit, baseUnit) {
        // All foods now use grams and calories are per 100g
        // Simple calculation: (calories_per_100g / 100) * quantity_in_grams
        return Math.round((baseCalories / 100) * quantity);
    }

    async showFoodSuggestions(input) {
        logger.info('🔍 showFoodSuggestions called with input:', input);
        const suggestionsDiv = document.getElementById('foodSuggestions');
        this.isSearching = true;
        
        if (input.length < CONFIG.MIN_SEARCH_LENGTH) {
            logger.info('❌ Input too short, hiding suggestions');
            this.hideFoodSuggestions();
            this.isSearching = false;
            return;
        }

        try {
            let matches = [];
            const preferences = this.getDatabaseTogglePreferences();
            logger.info('📊 Starting search with preferences:', preferences, 'online status:', this.isOnline, 'development mode:', CONFIG.DEVELOPMENT_MODE);

            // 1. Search favorites first (instant results) if enabled
            if (preferences.favorites) {
                const favorites = this.getFavorites().filter(food => 
                    food.name.toLowerCase().includes(input.toLowerCase())
                );
                matches.push(...favorites.slice(0, 2).map(food => ({...food, source: `⭐ ${food.source}`})));
                logger.info('⭐ Found favorites:', favorites.length);
            } else {
                logger.info('⭐ Favorites search disabled');
            }

            // 2. Search backend for comprehensive results if enabled
            if (this.isOnline) {
                logger.info('🌐 Attempting backend search...');
                try {
                    // Search Pios Food DB in backend database if enabled
                    if (preferences.localFoods) {
                        const localResults = await this.searchLocalFoods(input, 10);
                        matches.push(...localResults);
                        logger.info('🏠 Found local results:', localResults.length);
                    } else {
                        logger.info('🏠 Pios Food DB search disabled');
                    }

                } catch (backendError) {
                    logger.info('❌ Backend search failed:', backendError);
                }
            }

            logger.debug('Total matches found:', matches.length);
            logger.debug('All matches:', matches);

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
            logger.error('Food suggestions error:', error);
            suggestionsDiv.innerHTML = '<div class="suggestion-item error">⚠️ Search temporarily unavailable</div>';
        } finally {
            this.isSearching = false;
        }
    }

    // Display food suggestions with enhanced formatting
    displayFoodSuggestions(matches, input) {
        logger.info('🎨 displayFoodSuggestions called with', matches.length, 'matches');
        const suggestionsDiv = document.getElementById('foodSuggestions');
        logger.info('📦 suggestionsDiv element:', suggestionsDiv);
        this.selectedSuggestionIndex = -1; // Reset keyboard selection

        if (matches.length === 0) {
            logger.info('❌ No matches, showing no results message');
            suggestionsDiv.innerHTML = `
                <div class="suggestion-item no-results">
                    No foods found for "${input}". 
                    <br><small>Try a different search term or check spelling.</small>
                </div>
            `;
            setTimeout(() => this.hideFoodSuggestions(), 4000);
            return;
        }

        logger.info('✅ Building suggestions HTML for', matches.length, 'matches');

        // Create enhanced suggestions with comprehensive info
        const suggestions = matches.slice(0, CONFIG.MAX_SUGGESTIONS || 10).map(food => {
            const sourceIcon = this.getSourceIcon(food.source);
            const brandText = food.brand ? ` by ${this.escapeHtml(food.brand)}` : '';
            const distributorText = food.distributor ? ` @ ${this.escapeHtml(food.distributor)}` : '';
            const nutritionText = this.getNutritionText(food);
            const sourceText = this.getSourceText(food.source);
            
            return `
                <div class="suggestion-item enhanced" data-action="select-enhanced-food" data-food-data='${encodeURIComponent(JSON.stringify(food))}'>
                    <div class="food-main">
                        <span class="food-name">${this.highlightMatch(food.name, input)}${brandText}${distributorText}</span>
                        <span class="food-source" title="${this.getSourceTooltip(food.source)}">${sourceIcon} ${sourceText}</span>
                    </div>
                    <div class="food-details">
                        <span class="food-calories">${Math.round(food.calories)} kcal/100g</span>
                        ${nutritionText ? `<span class="food-nutrition">${nutritionText}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add enhanced footer with database info
        const preferences = this.getDatabaseTogglePreferences();
        const totalShown = Math.min(matches.length, CONFIG.MAX_SUGGESTIONS || 10);
        const totalFound = matches.length;
        
        // Create database sources indicator
        const searchedDatabases = [];
        if (preferences.favorites) searchedDatabases.push('⭐ Favorites');
        if (preferences.localFoods) searchedDatabases.push('🏠 Pios Food DB');
        
        const databaseInfo = searchedDatabases.length > 0 ? `
            <div class="suggestions-info">
                <small>
                    ${totalFound > totalShown ? `Showing ${totalShown} of ${totalFound} results | ` : ''}
                    Searched: ${searchedDatabases.join(', ')}
                </small>
            </div>
        ` : '';

        suggestionsDiv.innerHTML = suggestions + databaseInfo;
        logger.info('🖼️ Setting innerHTML and making suggestions visible');
        logger.info('📝 Final HTML length:', (suggestions + databaseInfo).length);
        suggestionsDiv.style.display = 'block';
        logger.info('👁️ Set suggestionsDiv display to block');
    }

    // Helper methods for food suggestions display
    getSourceIcon(source) {
        if (source && source.includes('⭐')) return '⭐';
        if (source === 'Local Database') return '🏪';
        if (source === 'Pios Food DB') return '🏠';
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
        if (source && source.includes('⭐')) return source.replace('⭐ ', '');
        if (source === 'Local Database') return 'Local Database';
        if (source === 'Pios Food DB') return 'Pios Food DB';
        return source || 'Database';
    }

    getSourceTooltip(source) {
        if (source && source.includes('⭐')) return 'Your favorite food from search history';
        if (source === 'Local Database') return 'Local database';
        if (source === 'Pios Food DB') return 'Custom foods from your account or Pios Food DB';
        return source || 'Food database';
    }

    highlightMatch(text, search) {
        // HTML-encode the raw text first to prevent XSS via food names from API
        const div = document.createElement('div');
        div.textContent = text;
        const escaped = div.innerHTML;
        if (!search || search.length < 2) return escaped;
        const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }

    hideFoodSuggestions() {
        logger.info('🚫 hideFoodSuggestions called - hiding suggestions');
        logger.debug('📍 Called from:');
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
            logger.error('Error selecting enhanced food:', error);
            // Fallback: clear selection state so the user can retry
            this.hideFoodSuggestions();
        }
    }

    // Show quick nutrition preview
    showQuickNutritionPreview(food) {
        const previewDiv = document.getElementById('nutritionPreview') || this.createNutritionPreview();
        
        let nutritionHTML = `
            <div class="nutrition-preview">
                <strong>${food.name}</strong> (${Math.round(food.calories)} kcal/100g)
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
        
        // Calculate remaining calories
        const remaining = this.calorieGoal - this.dailyCalories;
        const remainingEl = document.getElementById('remainingCalories');
        remainingEl.textContent = remaining;
        
        // Color code the remaining calories
        if (remaining < 0) {
            remainingEl.style.color = 'var(--accent-danger)'; // Red for over goal
        } else if (remaining < 200) {
            remainingEl.style.color = 'var(--accent-warning)'; // Orange/yellow for close to goal
        } else {
            remainingEl.style.color = 'var(--accent-success)'; // Green for plenty remaining
        }
        
        document.getElementById('calorieGoal').textContent = this.calorieGoal;
        
        const progressPercent = Math.min((this.dailyCalories / this.calorieGoal) * 100, 100);
        document.getElementById('calorieProgress').style.width = progressPercent + '%';

        // Macro totals
        const macroStats = document.getElementById('macroStats');
        if (macroStats) {
            if (this.dailyMacros) {
                document.getElementById('totalProtein').textContent = Math.round(this.dailyMacros.protein);
                document.getElementById('totalCarbs').textContent   = Math.round(this.dailyMacros.carbs);
                document.getElementById('totalFat').textContent     = Math.round(this.dailyMacros.fat);
                macroStats.style.display = '';
            } else {
                macroStats.style.display = 'none';
            }
        }
    }

    updateFoodLog() {
        const foodLogDiv = document.getElementById('foodLog');
        const today = new Date().toISOString().split('T')[0];
        
        if (this.foodLog.length === 0) {
            foodLogDiv.innerHTML = '<p class="empty-message">No food logged yet today. Start by adding your first meal!</p>';
            this.updateTodayComment();
            return;
        }

        const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
        const MEAL_LABELS = {
            breakfast: '🌅 Breakfast',
            lunch:     '☀️ Lunch',
            dinner:    '🌙 Dinner',
            snack:     '🍿 Snack',
            other:     '📝 Other'
        };

        // Group by meal_category
        const groups = {};
        [...this.foodLog].reverse().forEach(food => {
            const cat = food.meal_category || 'other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(food);
        });

        let html = '';
        MEAL_ORDER.forEach(cat => {
            if (!groups[cat]) return;
            const items = groups[cat];
            const groupTotal = items.reduce((s, f) => s + parseFloat(f.calories), 0);
            const targetId = items[0].id;

            // Compute group macro totals
            let gP = 0, gC = 0, gF = 0, gHasMacros = false;
            items.forEach(f => {
                const qty = parseFloat(f.quantity) || 0;
                if (f.protein != null) { gP += (f.protein / 100) * qty; gHasMacros = true; }
                if (f.carbs   != null) { gC += (f.carbs   / 100) * qty; }
                if (f.fat     != null) { gF += (f.fat     / 100) * qty; }
            });
            const groupMacroHtml = gHasMacros
                ? `<span class="meal-group-macros">${Math.round(gP)}g P &middot; ${Math.round(gC)}g C &middot; ${Math.round(gF)}g F</span>`
                : '';

            html += `<div class="meal-group">
                <div class="meal-group-header">
                    <span class="meal-group-label">${MEAL_LABELS[cat]}</span>
                    <div class="meal-group-right">
                        <span class="meal-group-total">${Math.round(groupTotal)} kcal</span>
                        ${groupMacroHtml}
                    </div>
                    <button class="btn-meal-photo" data-action="open-meal-photo" data-meal-cat="${cat}" data-target-id="${targetId}" title="Add photo to ${MEAL_LABELS[cat]}">📷</button>
                </div>`;
            items.forEach(food => {
                const escapedName = this.escapeHtml(this.capitalizeFirst(food.name));
                const brandText = food.brand ? ` <span class="food-brand">by ${this.escapeHtml(food.brand)}</span>` : '';
                const distText  = food.distributor ? ` <span class="food-dist">@ ${this.escapeHtml(food.distributor)}</span>` : '';
                const timeText  = food.meal_time ? ` • ${food.meal_time}` : '';
                const macroHtml = (food.protein != null || food.carbs != null || food.fat != null)
                    ? (() => {
                        const qty = parseFloat(food.quantity) || 0;
                        const p = food.protein != null ? Math.round((food.protein / 100) * qty) + 'g P' : null;
                        const c = food.carbs   != null ? Math.round((food.carbs   / 100) * qty) + 'g C' : null;
                        const f = food.fat     != null ? Math.round((food.fat     / 100) * qty) + 'g F' : null;
                        return `<div class="food-macros">${[p,c,f].filter(Boolean).join(' · ')}</div>`;
                    })()
                    : '';
                html += `
                <div class="food-item">
                    <div class="food-info">
                        <div class="food-name">${escapedName}${brandText}${distText}${food.offline ? ' <span class="badge-offline">(Offline)</span>' : ''}</div>
                        <div class="food-details">${Math.round(parseFloat(food.quantity))} ${food.unit}${timeText}</div>
                        ${macroHtml}
                    </div>
                    <div class="food-calories">${Math.round(parseFloat(food.calories))} kcal</div>
                    <div class="food-item-actions">
                        <button class="edit-btn" data-action="edit-food-log" data-log-id="${food.id}" data-date="${today}" title="Edit">✏️</button>
                        <button class="delete-btn" data-action="delete-food-log" data-log-id="${food.id}" data-food-name="${this.escapeHtml(food.name)}" data-date="${today}">×</button>
                    </div>
                </div>`;
            });
            // Render group photos below all items
            const groupPhotos = items
                .filter(f => f.image_url)
                .map(f => ({
                    logId: f.id,
                    src: f.image_url.startsWith('http') ? f.image_url : CONFIG.API_BASE_URL.replace(/\/api$/, '') + f.image_url
                }));
            if (groupPhotos.length) {
                html += `<div class="meal-group-photos">${
                    groupPhotos.map(({ logId, src }) => `
                        <div class="meal-photo-wrap">
                            <img data-auth-src="${this.escapeHtml(src)}" class="food-log-thumb" alt="Meal photo" loading="lazy">
                            <button class="meal-photo-delete" data-action="delete-meal-photo" data-log-id="${logId}" title="Remove photo">×</button>
                        </div>`).join('')
                }</div>`;
            }
            html += '</div>';
        });

        // Revoke previous blob URLs to prevent memory leaks
        (this._foodImageBlobUrls || []).forEach(u => URL.revokeObjectURL(u));
        this._foodImageBlobUrls = [];

        foodLogDiv.innerHTML = html;
        this._loadAuthImages(foodLogDiv);
        this.updateTodayComment();
    }

    // =========================================================================
    // DAY COMMENTS
    // =========================================================================

    // In-memory cache: { 'YYYY-MM-DD': 'comment text' | null }
    // null  = loaded, no comment exists
    // undefined = not yet loaded
    _commentCache = {};

    async fetchDayComment(date) {
        if (this._commentCache[date] !== undefined) return this._commentCache[date];
        try {
            const resp = await this.apiCall(`/comments?date=${date}`);
            const text = resp?.comment || null;
            this._commentCache[date] = text;
            return text;
        } catch (err) {
            logger.warn(`fetchDayComment(${date}) failed:`, err.message);
            this._commentCache[date] = null;
            return null;
        }
    }

    async saveDayComment(date, text) {
        const trimmed = text.trim();
        if (!trimmed) {
            await this.apiCall(`/comments?date=${date}`, 'DELETE');
            this._commentCache[date] = null;
        } else {
            const resp = await this.apiCall('/comments', 'PUT', { date, comment: trimmed });
            this._commentCache[date] = resp?.comment ?? trimmed;
        }
    }

    renderDayCommentHtml(date) {
        const comment = this._commentCache[date] ?? null;
        if (!comment) {
            return `<div class="day-comment-section" data-date="${date}">
                <button class="btn-add-comment" data-action="add-day-comment" data-date="${date}">+ Add note for this day</button>
            </div>`;
        }
        return `<div class="day-comment-section has-comment" data-date="${date}">
            <div class="day-comment-view">
                <span class="comment-icon">📝</span>
                <span class="comment-text">${this.escapeHtml(comment)}</span>
                <div class="comment-btns">
                    <button class="btn-icon comment-edit-btn" data-action="edit-day-comment" data-date="${date}" title="Edit note">✏️</button>
                    <button class="btn-icon comment-delete-btn" data-action="delete-day-comment" data-date="${date}" title="Delete note">&times;</button>
                </div>
            </div>
        </div>`;
    }

    renderDayCommentEditHtml(date) {
        const comment = this._commentCache[date] ?? '';
        return `<div class="day-comment-section editing" data-date="${date}">
            <div class="day-comment-edit">
                <textarea class="comment-textarea" placeholder="Add a note for this day…" rows="2">${this.escapeHtml(comment)}</textarea>
                <div class="comment-edit-btns">
                    <button class="btn btn-sm btn-primary" data-action="save-day-comment" data-date="${date}">Save</button>
                    <button class="btn btn-sm btn-secondary" data-action="cancel-day-comment" data-date="${date}">Cancel</button>
                </div>
            </div>
        </div>`;
    }

    async updateTodayComment() {
        const today = new Date().toISOString().split('T')[0];
        const container = document.getElementById('todayComment');
        if (!container) return;
        const existing = container.querySelector('.day-comment-section');
        if (existing?.classList.contains('editing')) return;
        await this.fetchDayComment(today);
        container.innerHTML = this.renderDayCommentHtml(today);
    }

    swapCommentSection(date, newHtml) {
        const section = document.querySelector(`.day-comment-section[data-date="${date}"]`);
        if (!section) return;
        section.insertAdjacentHTML('afterend', newHtml);
        section.remove();
        const textarea = document.querySelector(`.day-comment-section[data-date="${date}"] .comment-textarea`);
        if (textarea) { textarea.focus(); textarea.setSelectionRange(textarea.value.length, textarea.value.length); }
    }

    openDeletePhotoModal(logId) {
        this._pendingDeletePhotoLogId = logId;
        document.getElementById('deletePhotoModal').style.display = 'flex';
    }

    closeDeletePhotoModal() {
        document.getElementById('deletePhotoModal').style.display = 'none';
        this._pendingDeletePhotoLogId = null;
    }

    async detachMealPhoto(logId) {
        try {
            await this.apiCall(`/logs/${logId}`, 'PUT', { image_id: null });
            await this.loadTodaysData();
        } catch (err) {
            console.error('Failed to remove photo:', err);
            this.showMessage('Could not remove photo: ' + err.message, 'warning');
        }
    }

    _loadAuthImages(container) {
        container.querySelectorAll('img[data-auth-src]').forEach(async img => {
            const src = img.dataset.authSrc;
            try {
                const resp = await fetch(src, { headers: { Authorization: `Bearer ${this.authToken}` } });
                if (!resp.ok) return;
                const blob = await resp.blob();
                const blobUrl = URL.createObjectURL(blob);
                (this._foodImageBlobUrls = this._foodImageBlobUrls || []).push(blobUrl);
                img.src = blobUrl;
            } catch (e) {
                console.warn('Failed to load meal image:', src, e);
            }
        });
    }

    async deleteFood(foodId) {
        const foodIndex = this.foodLog.findIndex(food => food.id === foodId);
        if (foodIndex === -1) return;

        const deletedFood = this.foodLog[foodIndex];

        // Always delete locally first (instant feedback)
        this.dailyCalories -= parseFloat(deletedFood.calories);
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
                logger.error('Failed to sync food item:', food.name, error);
            }
        }

        this.updateFoodLog();
        this.showMessage('Offline data synced successfully', 'success');
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        // Handle multi-line messages by converting \n to <br> or using innerHTML
        if (message.includes('\n')) {
            // Split by newlines and create proper HTML structure
            const lines = message.split('\n');
            messageDiv.innerHTML = lines.map(line => 
                line.trim() ? `<div>${this.escapeHtml(line)}</div>` : '<br>'
            ).join('');
        } else {
            messageDiv.textContent = message;
        }

        // Add to appropriate container
        const container = document.querySelector('.active .container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            
            // Auto-remove after 5 seconds for errors (longer to read), 3 seconds for others
            const timeout = type === 'error' || type === 'warning' ? 5000 : 3000;
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, timeout);
        }
    }
    
    /**
     * Escape HTML to prevent XSS when using innerHTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // =============================================================================
    // GLOBAL CONFIRMATION MODAL
    // =============================================================================

    /**
     * Show a reusable confirmation modal
     * @param {string} title - Modal title
     * @param {string} message - Confirmation message
     * @param {string} confirmText - Confirm button text (default: "Confirm")
     * @param {string} confirmType - Button type: "primary", "danger" (default: "primary")
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
     */
    showConfirmation(title, message, confirmText = 'Confirm', confirmType = 'primary') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmationModal');
            const overlay = document.getElementById('confirmationOverlay');
            const titleEl = document.getElementById('confirmationTitle');
            const messageEl = document.getElementById('confirmationMessage');
            const confirmBtn = document.getElementById('confirmationConfirmBtn');
            const cancelBtn = document.getElementById('confirmationCancelBtn');

            if (!modal || !overlay) {
                logger.error('Confirmation modal elements not found');
                resolve(false);
                return;
            }

            // Set content
            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.textContent = confirmText;
            
            // Set button style
            confirmBtn.className = `btn btn-${confirmType}`;

            // Show modal
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // Handle confirm
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            // Handle cancel
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            // Cleanup function
            const cleanup = () => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                overlay.removeEventListener('click', handleOverlayClick);
                document.removeEventListener('keydown', handleEscapeKey);
            };

            // Handle clicking overlay (clicking outside modal)
            const handleOverlayClick = (e) => {
                if (e.target === overlay) {
                    handleCancel();
                }
            };

            // Handle Escape key
            const handleEscapeKey = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };

            // Attach event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            overlay.addEventListener('click', handleOverlayClick);
            document.addEventListener('keydown', handleEscapeKey);
        });
    }

    // =============================================================================
    // FOOD LOG HISTORY
    // =============================================================================

    /**
     * Toggle the history section visibility
     */
    async toggleHistory() {
        const historyContent = document.getElementById('historyContent');
        const historyBtnText = document.getElementById('historyBtnText');
        
        this.historyData.isExpanded = !this.historyData.isExpanded;
        
        if (this.historyData.isExpanded) {
            historyContent.style.display = 'block';
            historyBtnText.textContent = 'Hide History';
            
            // Load history if not already loaded
            if (this.historyData.days.length === 0) {
                await this.loadHistory();
            }
            // Load 30-day stats whenever history is opened
            await this.loadUserStats();
        } else {
            historyContent.style.display = 'none';
            historyBtnText.textContent = 'Show History';
        }
    }

    /**
     * Load food log history from backend
     */
    async loadHistory() {
        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            this.showDemoHistory();
            return;
        }

        try {
            const response = await this.apiCall(
                `/logs/history?limit=${this.historyData.limit}&offset=${this.historyData.currentOffset}`
            );

            if (response.success) {
                this.historyData.days = response.history;
                this.historyData.hasMore = response.pagination.hasMore;
                this.renderHistory();
                
                // Show/hide load more button
                const loadMoreBtn = document.getElementById('loadMoreHistoryBtn');
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = this.historyData.hasMore ? 'block' : 'none';
                }
            }
        } catch (error) {
            logger.error('Failed to load history:', error);
            this.showMessage('Failed to load history. Showing demo data.', 'warning');
            this.showDemoHistory();
        }
    }

    /**
     * Load more historical days (pagination)
     */
    async loadMoreHistory() {
        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            this.showMessage('Load more not available in demo mode', 'info');
            return;
        }

        try {
            const newOffset = this.historyData.currentOffset + this.historyData.limit;
            const response = await this.apiCall(
                `/logs/history?limit=${this.historyData.limit}&offset=${newOffset}`
            );

            if (response.success) {
                // Append new days to existing
                this.historyData.days = [...this.historyData.days, ...response.history];
                this.historyData.currentOffset = newOffset;
                this.historyData.hasMore = response.pagination.hasMore;
                this.renderHistory();
                
                // Show/hide load more button
                const loadMoreBtn = document.getElementById('loadMoreHistoryBtn');
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = this.historyData.hasMore ? 'block' : 'none';
                }
                
                this.showMessage(`Loaded ${response.history.length} more days`, 'success');
            }
        } catch (error) {
            logger.error('Failed to load more history:', error);
            this.showMessage('Failed to load more days', 'error');
        }
    }

    /**
     * View detailed logs for a specific day
     */
    async viewDayDetails(date) {
        const dayCard = document.querySelector(`[data-date="${date}"]`).closest('.history-day-card');
        const detailsDiv = dayCard.querySelector('.day-details');
        
        // Toggle expansion
        if (this.historyData.expandedDays.has(date)) {
            this.historyData.expandedDays.delete(date);
            detailsDiv.style.display = 'none';
            dayCard.classList.remove('expanded');
            return;
        }

        // Load details if not already loaded
        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            this.showDemoDayDetails(dayCard, date);
            return;
        }

        try {
            const response = await this.apiCall(`/logs?date=${date}`);

            if (response.success && response.logs) {
                this.historyData.expandedDays.add(date);
                this.renderDayDetails(dayCard, response.logs, response.totalCalories);
                dayCard.classList.add('expanded');
            }
        } catch (error) {
            logger.error('Failed to load day details:', error);
            this.showMessage('Failed to load day details', 'error');
        }
    }

    /**
     * Render the history list
     */
    renderHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.historyData.days.length === 0) {
            historyList.innerHTML = '<p class="empty-message">No food log history found. Start logging your meals!</p>';
            return;
        }

        historyList.innerHTML = this.historyData.days.map(day => {
            const date = day.log_date.split('T')[0]; // Extract YYYY-MM-DD
            const dateObj = new Date(day.log_date);
            const displayDate = this.formatHistoryDate(dateObj);
            const calories = Math.round(parseFloat(day.total_calories || 0));
            const dailyGoal = Math.round(parseFloat(day.daily_goal || 2000));
            const goalPercent = Math.round((calories / dailyGoal) * 100);

            return `
                <div class="history-day-card" data-date="${date}">
                    <div class="day-summary">
                        <div class="day-info">
                            <h4>📅 ${displayDate}</h4>
                            <p class="day-stats">
                                <span class="calories">${calories.toLocaleString()} kcal</span>
                                <span class="separator">•</span>
                                <span class="goal">Goal: ${dailyGoal.toLocaleString()} kcal (${goalPercent}%)</span>
                            </p>
                        </div>
                        <button class="btn btn-view-details" data-action="view-day-details" data-date="${date}">
                            <span class="expand-icon">▶</span>
                            <span class="expand-text">View Details</span>
                        </button>
                    </div>
                    <div class="day-details" style="display: none;">
                        <p class="loading">Loading details...</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render detailed food logs for a specific day
     */
    async renderDayDetails(dayCard, logs, totalCalories) {
        const detailsDiv = dayCard.querySelector('.day-details');
        const expandIcon = dayCard.querySelector('.expand-icon');
        const expandText = dayCard.querySelector('.expand-text');
        const date = dayCard.getAttribute('data-date');
        
        expandIcon.textContent = '▼';
        expandText.textContent = 'Hide Details';
        
        detailsDiv.innerHTML = `
            <div class="day-details-content">
                <div class="details-header">
                    <span class="details-total">Total: ${Math.round(totalCalories).toLocaleString()} kcal</span>
                    <button class="btn btn-add-item" data-action="add-food-log" data-date="${date}">
                        + Add Item
                    </button>
                </div>
                <div class="food-items">
                    ${logs.length === 0 
                        ? '<p class="empty-message">No food logged for this day</p>'
                        : logs.map(log => {
                            const brandText = log.brand ? ` by ${this.escapeHtml(log.brand)}` : '';
                            const distributorText = log.distributor ? ` @ ${this.escapeHtml(log.distributor)}` : '';
                            return `
                        <div class="food-item-row editable" data-log-id="${log.id}">
                            <div class="food-item-content">
                                <span class="food-item-name">${this.escapeHtml(log.food_name)}${brandText}${distributorText}</span>
                                <span class="food-item-details">${Math.round(parseFloat(log.quantity))} ${log.unit}</span>
                                <span class="food-item-calories">${Math.round(parseFloat(log.calories)).toLocaleString()} kcal</span>
                                ${(log.protein_per_100g != null || log.carbs_per_100g != null || log.fat_per_100g != null) ? (() => {
                                    const qty = parseFloat(log.quantity) || 0;
                                    const p = log.protein_per_100g != null ? Math.round((parseFloat(log.protein_per_100g) / 100) * qty) + 'g P' : null;
                                    const c = log.carbs_per_100g   != null ? Math.round((parseFloat(log.carbs_per_100g)   / 100) * qty) + 'g C' : null;
                                    const f = log.fat_per_100g     != null ? Math.round((parseFloat(log.fat_per_100g)     / 100) * qty) + 'g F' : null;
                                    return `<span class="food-macros">${[p,c,f].filter(Boolean).join(' · ')}</span>`;
                                })() : ''}
                            </div>
                            <div class="food-item-actions">
                                <button class="btn-icon btn-edit" data-action="edit-food-log" data-log-id="${log.id}" data-date="${date}" title="Edit">
                                    ✏️
                                </button>
                                <button class="btn-icon btn-delete" data-action="delete-food-log" data-log-id="${log.id}" data-food-name="${this.escapeHtml(log.food_name)}" data-date="${date}" title="Delete">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `;}).join('')}
                </div>
                <div class="day-comment-section" data-date="${date}"><span class="comment-loading">…</span></div>
            </div>
        `;
        
        detailsDiv.style.display = 'block';

        // Async: load comment from API then swap in the real widget
        this.fetchDayComment(date).then(() => {
            this.swapCommentSection(date, this.renderDayCommentHtml(date));
        });
    }

    /**
     * Format date for history display
     */
    formatHistoryDate(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Normalize dates to compare only date parts
        const dateStr = date.toDateString();
        const todayStr = today.toDateString();
        const yesterdayStr = yesterday.toDateString();
        
        if (dateStr === todayStr) {
            return 'Today';
        } else if (dateStr === yesterdayStr) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
    }

    /**
     * Show demo history data (for offline/development mode)
     */
    showDemoHistory() {
        this.historyData.days = [
            {
                log_date: new Date().toISOString(),
                meals_count: 3,
                total_calories: '2150'
            },
            {
                log_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                meals_count: 2,
                total_calories: '1850'
            },
            {
                log_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                meals_count: 4,
                total_calories: '2200'
            }
        ];
        this.historyData.hasMore = false;
        this.renderHistory();
        
        const loadMoreBtn = document.getElementById('loadMoreHistoryBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }

    /**
     * Show demo day details (for offline/development mode)
     */
    showDemoDayDetails(dayCard, date) {
        const demoLogs = [
            { food_name: 'Apple', quantity: '100', unit: 'g', calories: '95' },
            { food_name: 'Chicken Breast', quantity: '200', unit: 'g', calories: '330' },
            { food_name: 'Rice', quantity: '150', unit: 'g', calories: '195' }
        ];
        
        this.historyData.expandedDays.add(date);
        this.renderDayDetails(dayCard, demoLogs, 620);
        dayCard.classList.add('expanded');
    }

    // =============================================================================
    // WEIGHT TRACKING
    // =============================================================================

    /**
     * Toggle weight tracking section visibility
     */
    async toggleWeightTracking() {
        const weightContent = document.getElementById('weightContent');
        const weightBtnText = document.getElementById('weightBtnText');
        
        const isVisible = weightContent.style.display !== 'none';
        
        if (isVisible) {
            weightContent.style.display = 'none';
            weightBtnText.textContent = 'Show Weight Tracker';
        } else {
            weightContent.style.display = 'block';
            weightBtnText.textContent = 'Hide Weight Tracker';
            
            // Load weight data when opening
            await this.loadWeightHistory();
        }
    }

    /**
     * Handle weight logging form submission
     */
    async handleLogWeight() {
        const form = document.getElementById('weightForm');
        const submitButton = form.querySelector('[type="submit"]');
        
        try {
            // Get form values
            const weightKg = parseFloat(document.getElementById('weightKg').value);
            const logDate = document.getElementById('weightDate').value;
            const notes = document.getElementById('weightNotes').value.trim() || null;
            
            // Validation
            if (!weightKg || weightKg < 20 || weightKg > 300) {
                this.notifications.error('Please enter a valid weight between 20 and 300 kg');
                return;
            }
            
            // Set loading state
            this.setButtonLoading(submitButton, true);
            
            // Submit to API
            const response = await this.apiCall('/weight/log', 'POST', {
                weight_kg: weightKg,
                log_date: logDate,
                notes: notes
            });
            
            if (response.success) {
                this.notifications.success(`Weight logged: ${weightKg} kg`);
                form.reset();
                // Reset date to today
                document.getElementById('weightDate').value = new Date().toISOString().split('T')[0];
                
                // Check for rewards data in response (optional, may not be present)
                if (response.pointsAwarded && response.pointsAwarded > 0) {
                    this.showPointsToast({
                        total: response.pointsAwarded,
                        reason: 'Weight logged!',
                        breakdown: response.pointsDetails
                    });
                    
                    // Check for level-up
                    if (response.milestoneLevel) {
                        this.showLevelUpCelebration({
                            icon: '⚖️',
                            message: `Weight Logging Level ${response.milestoneLevel.level}!`,
                            bonus: response.milestoneLevel.bonusPoints
                        });
                    }
                    
                    // Refresh rewards display (silently fail if not available)
                    await this.loadRewardsData();
                }
                
                // Reload weight history to show new entry
                await this.loadWeightHistory();
            }
        } catch (error) {
            logger.error('Error logging weight:', error);
            // Error notification handled by apiCall
        } finally {
            this.setButtonLoading(submitButton, false);
        }
    }

    /**
     * Load weight history from API
     */
    async loadWeightHistory(days = 90) {
        try {
            const response = await this.apiCall(`/weight/history?days=${days}`);
            
            if (response.success) {
                const { data, summary } = response;
                
                // Update statistics
                this.updateWeightStats(summary);
                
                // Render weight chart
                this.renderWeightChart(data);
                
                // Render weight history list
                this.renderWeightHistory(data);
            }
        } catch (error) {
            logger.error('Error loading weight history:', error);
            document.getElementById('weightHistoryList').innerHTML = 
                '<p class="error-message">Failed to load weight history</p>';
        }
    }

    /**
     * Update weight statistics display
     */
    updateWeightStats(summary) {
        const statsDiv = document.getElementById('weightStats');
        if (!summary || !summary.current_weight) {
            statsDiv.style.display = 'none';
            return;
        }
        
        statsDiv.style.display = 'flex';
        
        document.getElementById('currentWeight').textContent = `${summary.current_weight} kg`;
        
        const totalChange = summary.total_change;
        const changeElement = document.getElementById('totalChange');
        changeElement.textContent = `${totalChange >= 0 ? '+' : ''}${totalChange} kg`;
        changeElement.className = 'stat-value ' + (totalChange > 0 ? 'positive' : totalChange < 0 ? 'negative' : 'neutral');
        
        document.getElementById('weeklyAverage').textContent = 
            `${summary.average_change_per_week >= 0 ? '+' : ''}${summary.average_change_per_week} kg/week`;
        
        const trendElement = document.getElementById('weightTrend');
        const trendIcons = {
            'decreasing': '📉 Decreasing',
            'increasing': '📈 Increasing',
            'stable': '➡️ Stable'
        };
        trendElement.textContent = trendIcons[summary.trend] || summary.trend;
    }

    /**
     * Render weight chart using Chart.js
     */
    renderWeightChart(data) {
        const canvas = document.getElementById('weightChart');
        if (!canvas || !data || data.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if any
        if (this.weightChart) {
            this.weightChart.destroy();
        }
        
        // Reverse data so earliest date is on the left
        const reversedData = [...data].reverse();
        
        // Prepare chart data
        const labels = reversedData.map(entry => new Date(entry.log_date).toLocaleDateString());
        const weights = reversedData.map(entry => entry.weight_kg);
        
        // Calculate min/max for better y-axis range
        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);
        const range = maxWeight - minWeight;
        
        // Adaptive step size based on data range
        let stepSize;
        if (range < 1) {
            stepSize = 0.1;  // Very small range: 0.1 kg steps
        } else if (range < 5) {
            stepSize = 0.5;  // Small range: 0.5 kg steps
        } else if (range < 10) {
            stepSize = 1;    // Medium range: 1 kg steps
        } else {
            stepSize = 2;    // Large range: 2 kg steps
        }
        
        const yMin = Math.floor(minWeight - 1);
        const yMax = Math.ceil(maxWeight + 1);
        
        // Create new chart
        this.weightChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Weight (kg)',
                    data: weights,
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Weight Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: yMin,
                        max: yMax,
                        ticks: {
                            stepSize: stepSize,
                            callback: function(value) {
                                // Only show clean increments based on step size
                                const remainder = Math.abs(value % stepSize);
                                if (remainder < 0.001 || Math.abs(remainder - stepSize) < 0.001) {
                                    return value.toFixed(1) + ' kg';
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render weight history list
     */
    renderWeightHistory(data) {
        const listDiv = document.getElementById('weightHistoryList');
        
        if (!data || data.length === 0) {
            listDiv.innerHTML = '<p class="empty-message">No weight entries yet. Start tracking your weight!</p>';
            return;
        }
        
        listDiv.innerHTML = data.map(entry => {
            const date = new Date(entry.log_date).toLocaleDateString();
            const change = entry.change_from_previous;
            const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
            const changeText = change !== null ? 
                `<span class="weight-change ${changeClass}">${change >= 0 ? '+' : ''}${change} kg</span>` : 
                '';
            
            return `
                <div class="weight-entry">
                    <div class="weight-entry-main">
                        <div class="weight-date">${date}</div>
                        <div class="weight-value">${entry.weight_kg} kg ${changeText}</div>
                    </div>
                    ${entry.notes ? `<div class="weight-notes">${this.escapeHtml(entry.notes)}</div>` : ''}
                    <div class="weight-actions">
                        <button class="btn-icon" data-action="edit-weight" data-weight-id="${entry.id}" title="Edit">✏️</button>
                        <button class="btn-icon" data-action="delete-weight" data-weight-id="${entry.id}" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Edit weight entry
     */
    async editWeightEntry(weightId) {
        const newWeight = prompt('Enter new weight (kg):');
        if (!newWeight) return;
        
        const weight = parseFloat(newWeight);
        if (isNaN(weight) || weight < 20 || weight > 300) {
            this.notifications.error('Please enter a valid weight between 20 and 300 kg');
            return;
        }
        
        try {
            const response = await this.apiCall(`/weight/${weightId}`, 'PUT', {
                weight_kg: weight
            });
            
            if (response.success) {
                this.notifications.success('Weight updated successfully');
                await this.loadWeightHistory();
            }
        } catch (error) {
            logger.error('Error updating weight:', error);
        }
    }

    /**
     * Delete weight entry
     */
    async deleteWeightEntry(weightId) {
        if (!confirm('Are you sure you want to delete this weight entry?')) {
            return;
        }
        
        try {
            const response = await this.apiCall(`/weight/${weightId}`, 'DELETE');
            
            if (response.success) {
                this.notifications.success('Weight entry deleted');
                await this.loadWeightHistory();
            }
        } catch (error) {
            logger.error('Error deleting weight:', error);
        }
    }

    // =============================================================================
    // CALORIE TRACKING CHART
    // =============================================================================

    /**
     * Toggle calorie chart visibility
     */
    async toggleCalorieChart() {
        const content = document.getElementById('calorieChartContent');
        const btn = document.getElementById('calorieChartBtnText');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            btn.textContent = 'Hide Chart';
            
            // Load and render calorie data for last 28 days
            await this.loadCalorieChartData();
        } else {
            content.style.display = 'none';
            btn.textContent = 'Show Chart';
        }
    }

    /**
     * Load calorie data for the last 28 days
     */
    async loadCalorieChartData() {
        try {
            // Get data for last 28 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 27); // 28 days including today
            
            const response = await this.apiCall(
                `/logs/range?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
                'GET',
                null,
                { silent: true }
            );
            
            if (response.success && response.data) {
                this.renderCalorieChart(response.data);
            }
        } catch (error) {
            logger.error('Error loading calorie chart data:', error);
            this.notifications.error('Failed to load calorie chart data');
        }
    }

    /**
     * Render calorie chart as a bar chart
     */
    renderCalorieChart(dataByDate) {
        const canvas = document.getElementById('calorieChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if any
        if (this.calorieChart) {
            this.calorieChart.destroy();
        }
        
        // Debug: Log the received data
        logger.debug('Calorie chart data received:', dataByDate);
        
        // Normalize the data keys - convert any date format to YYYY-MM-DD
        const normalizedData = {};
        Object.keys(dataByDate).forEach(key => {
            // Parse the date and convert to YYYY-MM-DD format
            const date = new Date(key);
            const normalizedKey = date.toISOString().split('T')[0];
            normalizedData[normalizedKey] = dataByDate[key];
        });
        
        logger.debug('Normalized data:', normalizedData);
        
        // Prepare data for last 28 days
        const endDate = new Date();
        const dailyData = [];
        
        // Generate all 28 days
        for (let i = 27; i >= 0; i--) {
            const date = new Date();
            date.setDate(endDate.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Get data for this day from the normalized response
            const dayData = normalizedData[dateStr];
            const totalCalories = dayData ? parseInt(dayData.total_calories) : 0;
            
            // Get the calorie goal for this day (use user's current goal)
            const calorieGoal = this.currentUser?.dailyCalorieGoal || 2000;
            
            dailyData.push({
                date: dateStr,
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                calories: totalCalories,
                goal: calorieGoal,
                isOverGoal: totalCalories > calorieGoal
            });
            
            if (totalCalories > 0) {
                logger.debug(`Date ${dateStr}: ${totalCalories} kcal (goal: ${calorieGoal})`);
            }
        }
        
        // Prepare chart data
        const labels = dailyData.map(d => d.label);
        const caloriesData = dailyData.map(d => d.calories);
        const goalData = dailyData.map(d => d.goal);
        
        // Color bars: green if at or under goal, red if over goal
        // But also handle zero values (show green for empty days)
        const barColors = dailyData.map(d => {
            if (d.calories === 0) return '#10b981'; // Green for no data
            return d.isOverGoal ? '#ef4444' : '#10b981';
        });
        
        // Create new chart
        this.calorieChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Calories Consumed',
                        data: caloriesData,
                        backgroundColor: barColors,
                        borderColor: barColors,
                        borderWidth: 1,
                        barThickness: 'flex',
                        maxBarThickness: 30
                    },
                    {
                        label: 'Daily Goal',
                        data: goalData,
                        type: 'line',
                        borderColor: '#fbbf24',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2.5,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Daily Calorie Consumption vs Goal (Last 28 Days)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.label === 'Calories Consumed') {
                                    const calories = context.parsed.y;
                                    const goal = goalData[context.dataIndex];
                                    const diff = calories - goal;
                                    const status = diff > 0 ? `(+${diff} over)` : diff < 0 ? `(${Math.abs(diff)} under)` : '(at goal)';
                                    return `Calories: ${calories} ${status}`;
                                } else {
                                    return `Goal: ${context.parsed.y}`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' cal';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Calories'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // =============================================================================
    // FOOD LOG CRUD OPERATIONS
    // =============================================================================

    /**
     * Open modal to add new food log entry
     */
    openAddFoodLogModal(date) {
        // Store current context
        this.currentEditContext = { date, logId: null, isNew: true };
        
        // Reset form
        document.getElementById('editFoodLogId').value = '';
        document.getElementById('editFoodName').value = '';
        document.getElementById('editFoodQuantity').value = '';
        document.getElementById('editFoodUnit').value = 'g';
        document.getElementById('editFoodCalories').value = '';
        document.getElementById('editFoodDate').value = date;
        
        // Update modal title
        document.getElementById('editModalTitle').textContent = 'Add Food Log Entry';
        
        // Show modal
        const modal = document.getElementById('editFoodLogModal');
        modal.style.display = 'flex';
        
        // Focus on first input
        setTimeout(() => document.getElementById('editFoodName').focus(), 100);
    }

    /**
     * Open modal to edit existing food log entry
     */
    async openEditFoodLogModal(logId, date) {
        try {
            // Store current context
            this.currentEditContext = { date, logId, isNew: false };
            
            // Fetch current logs for this date
            const response = await this.apiCall(`/logs?date=${date}`);
            
            if (!response.success || !response.logs) {
                throw new Error('Failed to load food log data');
            }
            
            // Find the specific log
            const log = response.logs.find(l => l.id == logId);
            
            if (!log) {
                throw new Error('Food log not found');
            }
            
            // Populate form with existing data
            document.getElementById('editFoodLogId').value = log.id;
            document.getElementById('editFoodName').value = log.food_name;
            document.getElementById('editFoodQuantity').value = parseFloat(log.quantity);
            document.getElementById('editFoodCalories').value = parseFloat(log.calories);
            document.getElementById('editFoodDate').value = log.log_date.split('T')[0];
            document.getElementById('editMealCategory').value = log.meal_category || 'other';
            document.getElementById('editMealTime').value = log.meal_time ? log.meal_time.slice(0, 5) : '';

            // Reset image state
            this._editPendingFile = null;
            this._editPendingUrl  = null;
            this._editRemoveImage = false;
            this._editCurrentImageId = log.image_id || null;
            const editCurrentImageEl = document.getElementById('editCurrentImage');
            const editThumb = document.getElementById('editImageThumb');
            const editBtnLabel = document.getElementById('editImageBtnLabel');
            const editPanel = document.getElementById('editImagePanel');
            if (editPanel) { editPanel.style.display = 'none'; editPanel._bound = false; }
            this._clearEditImagePreview();
            if (log.image_url && editCurrentImageEl && editThumb) {
                const _imgSrc = log.image_url.startsWith('http') ? log.image_url : CONFIG.API_BASE_URL.replace(/\/api$/, '') + log.image_url;
                editThumb.src = '';
                fetch(_imgSrc, { headers: { Authorization: `Bearer ${this.authToken}` } })
                    .then(r => r.ok ? r.blob() : null)
                    .then(blob => { if (blob) editThumb.src = URL.createObjectURL(blob); });
                editCurrentImageEl.style.display = '';
                if (editBtnLabel) editBtnLabel.textContent = 'Change Photo';
            } else {
                if (editCurrentImageEl) editCurrentImageEl.style.display = 'none';
                if (editBtnLabel) editBtnLabel.textContent = 'Add Photo';
            }
            
            // Show modal
            const modal = document.getElementById('editFoodLogModal');
            modal.style.display = 'flex';
            
            // Focus on first input
            setTimeout(() => document.getElementById('editFoodName').focus(), 100);
            
        } catch (error) {
            logger.error('Failed to open edit modal:', error);
            this.showMessage(error.message || 'Failed to load food log data', 'error');
        }
    }

    /**
     * Close edit/add modal
     */
    closeEditFoodLogModal() {
        const modal = document.getElementById('editFoodLogModal');
        modal.style.display = 'none';
        this.currentEditContext = null;
        // Reset image edit state
        this._editPendingFile = null;
        this._editPendingUrl  = null;
        this._editRemoveImage = false;
        this._editCurrentImageId = null;
    }

    /**
     * Handle edit/add form submission
     */
    async handleEditFoodLogSubmit() {
        if (!this.currentEditContext) return;
        
        const { date, logId, isNew } = this.currentEditContext;
        
        // Get form data
        const rawTime = document.getElementById('editMealTime').value; // HH:MM
        const foodData = {
            name: document.getElementById('editFoodName').value.trim(),
            quantity: parseFloat(document.getElementById('editFoodQuantity').value),
            unit: 'g',
            calories: parseFloat(document.getElementById('editFoodCalories').value),
            logDate: document.getElementById('editFoodDate').value,
            meal_category: document.getElementById('editMealCategory').value,
            meal_time: rawTime ? `${rawTime}:00` : null
        };
        
        // Validate data
        const errors = this.validateFoodLogData(foodData);
        if (errors.length > 0) {
            this.showMessage(errors.join('\n'), 'error');
            return;
        }
        
        try {
            let savedLogId = logId;
            if (isNew) {
                const newEntry = await this.createFoodLogEntry(foodData);
                savedLogId = newEntry?.logId || newEntry?.id || logId;
                this.showMessage('Food log entry added successfully', 'success');
            } else {
                await this.updateFoodLogEntry(logId, foodData);

                // Optimistically update local state so the dashboard refreshes immediately
                const todayDate = new Date().toISOString().split('T')[0];
                const localIdx = this.foodLog.findIndex(f => f.id == logId);
                if (localIdx !== -1) {
                    if (foodData.logDate !== todayDate) {
                        // Entry moved to a different day — remove from today's log
                        this.foodLog.splice(localIdx, 1);
                    } else {
                        // Update fields in place
                        Object.assign(this.foodLog[localIdx], {
                            name: foodData.name,
                            quantity: foodData.quantity,
                            calories: foodData.calories,
                            meal_category: foodData.meal_category,
                            meal_time: foodData.meal_time ? foodData.meal_time.slice(0, 5) : null,
                        });
                    }
                    this.dailyCalories = this.foodLog.reduce((sum, f) => sum + parseFloat(f.calories), 0);
                    this.updateDashboard();
                    this.updateFoodLog();
                }

                this.showMessage('Food log entry updated successfully', 'success');
            }

            // Handle image changes
            if (this._editRemoveImage) {
                await this.apiCall(`/logs/${savedLogId}`, 'PUT', { image_id: null });
            } else if (this._editPendingFile) {
                await this.uploadAndAttachImage(savedLogId, this._editPendingFile, 'file');
            } else if (this._editPendingUrl) {
                await this.uploadAndAttachImage(savedLogId, this._editPendingUrl, 'url');
            }
            
            // Close modal
            this.closeEditFoodLogModal();

            // Refresh today's dashboard food log immediately
            const today = new Date().toISOString().split('T')[0];
            if (foodData.logDate === today || date === today) {
                await this.loadTodaysData();
            }

            // Refresh the day view if still expanded
            const originalDate = date;
            const newDate = foodData.logDate;
            
            // Refresh original date
            if (this.historyData.expandedDays.has(originalDate)) {
                await this.refreshDayDetails(originalDate);
            }
            
            // Refresh new date if moved
            if (newDate !== originalDate && this.historyData.expandedDays.has(newDate)) {
                await this.refreshDayDetails(newDate);
            }
            
            // Optionally reload history list to update totals
            // await this.loadHistory();
            
        } catch (error) {
            logger.error('Failed to save food log:', error);
            this.showMessage(error.message || 'Failed to save food log entry', 'error');
        }
    }

    /**
     * Open delete confirmation modal
     */
    openDeleteConfirmModal(logId, foodName, date) {
        // Store delete context
        this.currentDeleteContext = { logId, foodName, date };
        
        // Update confirmation message
        const message = `Are you sure you want to delete "<strong>${this.escapeHtml(foodName)}</strong>"?`;
        document.getElementById('deleteConfirmMessage').innerHTML = message;
        
        // Show modal
        const modal = document.getElementById('deleteFoodLogModal');
        modal.style.display = 'flex';
    }

    /**
     * Close delete confirmation modal
     */
    closeDeleteConfirmModal() {
        const modal = document.getElementById('deleteFoodLogModal');
        modal.style.display = 'none';
        this.currentDeleteContext = null;
    }

    /**
     * Confirm and execute food log deletion
     */
    async confirmDeleteFoodLog() {
        if (!this.currentDeleteContext) return;
        
        const { logId, foodName, date } = this.currentDeleteContext;
        
        // Find and immediately remove the UI element for instant feedback
        const logElement = document.querySelector(`[data-log-id="${logId}"]`);
        let removedElement = null;
        let parentElement = null;
        let nextSibling = null;
        
        if (logElement) {
            // Store reference for potential restoration
            parentElement = logElement.parentElement;
            nextSibling = logElement.nextElementSibling;
            removedElement = logElement.cloneNode(true);
            
            // Immediately remove from UI
            logElement.remove();
            
            // Update day totals immediately if possible
            this.updateDayTotalAfterDeletion(date, logElement);
        }
        
        try {
            await this.deleteFoodLogEntry(logId);
            
            this.showMessage(`"${foodName}" deleted successfully`, 'success');
            
            // Close modal
            this.closeDeleteConfirmModal();
            
            // Sync in-memory model if the deleted entry was today
            const today = new Date().toISOString().split('T')[0];
            if (date === today) {
                await this.loadTodaysData();
            }

            // Refresh the day view to ensure data consistency
            if (this.historyData.expandedDays.has(date)) {
                await this.refreshDayDetails(date);
            }
            
        } catch (error) {
            logger.error('Failed to delete food log:', error);
            
            // Restore the UI element if API call failed
            if (removedElement && parentElement) {
                if (nextSibling) {
                    parentElement.insertBefore(removedElement, nextSibling);
                } else {
                    parentElement.appendChild(removedElement);
                }
            }
            
            this.showMessage(error.message || 'Failed to delete food log entry', 'error');
        }
    }

    /**
     * Update day totals immediately after deletion for instant UI feedback
     */
    updateDayTotalAfterDeletion(date, logElement) {
        try {
            // Extract calories from the deleted element
            const caloriesElement = logElement.querySelector('.food-item-calories');
            if (!caloriesElement) return;
            
            const caloriesText = caloriesElement.textContent || '';
            const calories = parseInt(caloriesText.replace(/[^\d]/g, '')) || 0;
            
            // Find the day card and update totals
            const dayCard = document.querySelector(`[data-date="${date}"]`);
            if (dayCard) {
                // Update day stats in overview
                const caloriesSpan = dayCard.querySelector('.day-stats .calories');
                if (caloriesSpan) {
                    const currentTotal = parseInt(caloriesSpan.textContent.replace(/[^\d]/g, '')) || 0;
                    const newTotal = Math.max(0, currentTotal - calories);
                    caloriesSpan.textContent = `${newTotal.toLocaleString()} kcal`;
                }
                
                // Update detailed view total if expanded
                const detailsTotal = dayCard.querySelector('.details-total');
                if (detailsTotal) {
                    const currentDetailTotal = parseInt(detailsTotal.textContent.replace(/[^\d]/g, '')) || 0;
                    const newDetailTotal = Math.max(0, currentDetailTotal - calories);
                    detailsTotal.textContent = `Total: ${newDetailTotal.toLocaleString()} kcal`;
                }
                
                // Update meals count (no longer displayed — removed)
                const mealsSpan = dayCard.querySelector('.day-stats .meals');
                if (mealsSpan) {
                    mealsSpan.closest('.separator')?.remove();
                    mealsSpan.remove();
                }
            }
        } catch (error) {
            logger.warn('Failed to update day totals immediately:', error);
        }
    }

    /**
     * Refresh day details after CRUD operation
     */
    async refreshDayDetails(date) {
        try {
            const response = await this.apiCall(`/logs?date=${date}`);
            
            if (response.success && response.logs) {
                const dayCard = document.querySelector(`[data-date="${date}"]`)?.closest('.history-day-card');
                if (dayCard) {
                    this.renderDayDetails(dayCard, response.logs, response.totalCalories);
                    
                    // Update day summary
                    const calsStat = dayCard.querySelector('.day-stats .calories');
                    if (calsStat) {
                        calsStat.textContent = `${Math.round(response.totalCalories).toLocaleString()} kcal`;
                    }
                }
            }
        } catch (error) {
            logger.error('Failed to refresh day details:', error);
            this.showMessage('Failed to refresh day details', 'error');
        }
    }

    /**
     * Validate food log data
     */
    validateFoodLogData(data) {
        const errors = [];
        
        if (!data.name || data.name.trim().length === 0) {
            errors.push('Food name is required');
        }
        
        if (!data.quantity || data.quantity <= 0) {
            errors.push('Quantity must be greater than 0');
        }
        
        // Unit is always 'g' now, so no validation needed
        
        if (data.calories === undefined || data.calories < 0) {
            errors.push('kcal must be 0 or greater');
        }
        
        if (!data.logDate) {
            errors.push('Date is required');
        } else {
            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(data.logDate)) {
                errors.push('Invalid date format (use YYYY-MM-DD)');
            }
        }
        
        return errors;
    }

    /**
     * Create new food log entry via API
     */
    async createFoodLogEntry(foodData) {
        const response = await this.apiCall('/logs', 'POST', {
            name: foodData.name,
            quantity: foodData.quantity,
            unit: foodData.unit,
            calories: foodData.calories,
            logDate: foodData.logDate
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to create food log');
        }
        
        return response;
    }

    /**
     * Update existing food log entry via API
     */
    async updateFoodLogEntry(logId, foodData) {
        const response = await this.apiCall(`/logs/${logId}`, 'PUT', {
            name: foodData.name,
            quantity: foodData.quantity,
            unit: foodData.unit,
            calories: foodData.calories,
            logDate: foodData.logDate,
            meal_category: foodData.meal_category,
            meal_time: foodData.meal_time
        });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to update food log');
        }
        
        return response;
    }

    /**
     * Delete food log entry via API
     */
    async deleteFoodLogEntry(logId) {
        const response = await this.apiCall(`/logs/${logId}`, 'DELETE');
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to delete food log');
        }
        
        return response;
    }

    // =============================================================================
    // PIOS FOOD DB TABLE - BULK OPERATIONS & SORTING
    // =============================================================================

    /**
     * Toggle select all checkboxes
     */
    toggleSelectAll(checkbox) {
        const foodCheckboxes = document.querySelectorAll('.food-checkbox');
        this.adminData.selectedFoodIds.clear();
        
        foodCheckboxes.forEach(cb => {
            cb.checked = checkbox.checked;
            if (checkbox.checked) {
                this.adminData.selectedFoodIds.add(cb.dataset.foodId);
            }
        });
        
        this.updateBulkActionsToolbar();
    }

    /**
     * Handle individual checkbox selection
     */
    toggleFoodSelection(checkbox, foodId) {
        if (checkbox.checked) {
            this.adminData.selectedFoodIds.add(foodId);
        } else {
            this.adminData.selectedFoodIds.delete(foodId);
        }
        
        // Update "select all" checkbox state
        const selectAllCheckbox = document.getElementById('selectAllFoods');
        const foodCheckboxes = document.querySelectorAll('.food-checkbox');
        const allChecked = Array.from(foodCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(foodCheckboxes).some(cb => cb.checked);
        
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
        
        this.updateBulkActionsToolbar();
    }

    /**
     * Update bulk actions toolbar visibility and count
     */
    updateBulkActionsToolbar() {
        const toolbar = document.getElementById('bulkActionsToolbar');
        const countEl = document.getElementById('selectedCount');
        const count = this.adminData.selectedFoodIds.size;
        
        if (count > 0) {
            toolbar.style.display = 'flex';
            countEl.textContent = `${count} item${count > 1 ? 's' : ''} selected`;
        } else {
            toolbar.style.display = 'none';
        }
    }

    /**
     * Bulk delete selected foods
     */
    async bulkDeleteFoods() {
        const count = this.adminData.selectedFoodIds.size;
        
        if (count === 0) {
            this.showMessage('No foods selected', 'error');
            return;
        }

        const confirmed = await this.showConfirmation(
            'Delete Multiple Foods',
            `Are you sure you want to delete ${count} food${count > 1 ? 's' : ''}? This action cannot be undone.`,
            'Delete',
            'danger'
        );

        if (!confirmed) return;

        const selectedIds = Array.from(this.adminData.selectedFoodIds);
        let successCount = 0;
        let failCount = 0;
        const failedFoods = []; // Track foods that couldn't be deleted

        // Show progress message
        this.showMessage(`Deleting ${count} foods...`, 'info');

        for (const foodId of selectedIds) {
            try {
                // Try to delete from backend
                await this.apiCall(`/admin/foods/${foodId}`, 'DELETE');
                successCount++;
            } catch (error) {
                failCount++;
                
                // Get food name for error reporting
                const food = this.adminData.foods?.find(f => f.id == foodId);
                const foodName = food ? food.name : `ID ${foodId}`;
                
                // Check if this is a validation error (food in use)
                if (error.data && error.data.details?.reason === 'FOOD_IN_USE') {
                    const usageCount = error.data.details.usageCount;
                    failedFoods.push(`"${foodName}" (logged ${usageCount} time${usageCount > 1 ? 's' : ''})`);
                    logger.warn(`Cannot delete food ${foodId}: Used in ${usageCount} food log entries`);
                } else {
                    // Other errors - try local fallback for connection issues only
                    logger.info('Backend delete failed for', foodId, '- trying local:', error.message);
                    
                    if (this.adminData.foods && !error.data) {
                        // Only fallback for connection errors, not validation errors
                        const foodIndex = this.adminData.foods.findIndex(food => food.id == foodId);
                        if (foodIndex !== -1) {
                            this.adminData.foods.splice(foodIndex, 1);
                            successCount++;
                            failCount--;
                        } else {
                            failedFoods.push(`"${foodName}" (not found)`);
                        }
                    } else {
                        failedFoods.push(`"${foodName}" (${error.message})`);
                    }
                }
            }
        }

        // Clear selection
        this.adminData.selectedFoodIds.clear();
        document.getElementById('selectAllFoods').checked = false;
        
        // Show detailed result message
        if (successCount > 0 && failCount === 0) {
            this.showMessage(
                `Successfully deleted ${successCount} food${successCount > 1 ? 's' : ''}`,
                'success'
            );
        } else if (successCount > 0 && failCount > 0) {
            this.showMessage(
                `Deleted ${successCount} food${successCount > 1 ? 's' : ''}, but ${failCount} failed.\n\n` +
                `Failed foods:\n${failedFoods.join('\n')}`,
                'warning'
            );
        } else {
            this.showMessage(
                `Failed to delete all ${failCount} food${failCount > 1 ? 's' : ''}.\n\n` +
                `Failed foods:\n${failedFoods.join('\n')}`,
                'error'
            );
        }

        // Refresh the list
        this.loadPiosFoodDB();
    }

    /**
     * Sort foods table by column
     */
    sortFoodsTable(column) {
        // Toggle direction if clicking same column
        if (this.adminData.foodsSortColumn === column) {
            this.adminData.foodsSortDirection = 
                this.adminData.foodsSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.adminData.foodsSortColumn = column;
            this.adminData.foodsSortDirection = 'asc';
        }

        // Sort the foods array
        this.adminData.foods.sort((a, b) => {
            let aVal, bVal;
            
            switch (column) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'brand':
                    aVal = (a.brand || '').toLowerCase();
                    bVal = (b.brand || '').toLowerCase();
                    break;
                case 'distributor':
                    aVal = (a.distributor || '').toLowerCase();
                    bVal = (b.distributor || '').toLowerCase();
                    break;
                case 'calories':
                    aVal = a.calories || 0;
                    bVal = b.calories || 0;
                    break;
                case 'protein':
                    aVal = a.protein_per_100g != null ? parseFloat(a.protein_per_100g) : -1;
                    bVal = b.protein_per_100g != null ? parseFloat(b.protein_per_100g) : -1;
                    break;
                case 'carbs':
                    aVal = a.carbs_per_100g != null ? parseFloat(a.carbs_per_100g) : -1;
                    bVal = b.carbs_per_100g != null ? parseFloat(b.carbs_per_100g) : -1;
                    break;
                case 'fat':
                    aVal = a.fat_per_100g != null ? parseFloat(a.fat_per_100g) : -1;
                    bVal = b.fat_per_100g != null ? parseFloat(b.fat_per_100g) : -1;
                    break;
                case 'usage':
                    aVal = a.usage_count || 0;
                    bVal = b.usage_count || 0;
                    break;
                default:
                    return 0;
            }

            // Compare values
            if (aVal < bVal) return this.adminData.foodsSortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.adminData.foodsSortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // If search is active, re-apply filter with new sort order
        if (this.adminData.filteredFoods !== null && this.adminData.filteredFoods !== undefined) {
            const searchInput = document.getElementById('foodDbSearchInput');
            if (searchInput) {
                this.searchFoodDatabase(searchInput.value);
                return; // searchFoodDatabase will call updatePiosFoodDBDisplay
            }
        }

        // Update display with sorted data
        this.updatePiosFoodDBDisplay();
    }

    /**
     * Update sort indicators in table headers
     */
    updateSortIndicators() {
        // Clear all indicators
        document.querySelectorAll('.sort-indicator').forEach(el => {
            el.textContent = '';
        });

        // Set active indicator
        const indicator = document.getElementById(`sort-${this.adminData.foodsSortColumn}`);
        if (indicator) {
            indicator.textContent = this.adminData.foodsSortDirection === 'asc' ? ' ↑' : ' ↓';
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
                logger.error('Sync operation failed:', error);
                operation.attempts++;
                
                // Remove if max attempts reached
                if (operation.attempts >= operation.maxAttempts) {
                    const index = this.syncQueue.findIndex(op => op.id === operation.id);
                    if (index > -1) {
                        this.syncQueue.splice(index, 1);
                    }
                    logger.warn('Sync operation abandoned after max attempts:', operation);
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
                logger.warn('Unknown sync operation type:', operation.type);
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
                logger.info('Server data unavailable, using local data:', error.message);
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
            const totalCalories = serverData.totalCalories || logs.reduce((total, log) => total + parseFloat(log.calories), 0);
            
            const serverFoodLog = logs.map(log => ({
                id: log.id,
                name: log.food_name || log.name,
                quantity: log.quantity,
                unit: log.unit,
                calories: parseFloat(log.calories),
                timestamp: log.created_at ? new Date(log.created_at).toLocaleTimeString() : new Date().toLocaleTimeString(),
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

        // Check if user has admin role from backend
        if (this.currentUser && this.currentUser.role === 'admin') {
            this.isAdmin = true;
            return this.isAdmin;
        }

        // Fallback: For users with valid token, try to verify admin status with backend
        if (!CONFIG.DEVELOPMENT_MODE && this.authToken) {
            try {
                const response = await this.apiCall('/admin/stats', 'GET', null, { 
                    showError: false, // Don't show error for non-admin users
                    silent: true 
                });
                this.isAdmin = response !== null;
                return this.isAdmin;
            } catch (error) {
                // Expected for non-admin users, don't log as error
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
                activeUsers: 8
            };
            this.updateAdminStatsDisplay();
            return;
        }

        // For real admin users in production
        try {
            const response = await this.apiCall('/admin/stats');
            this.adminData.stats = response;
            this.updateAdminStatsDisplay();
        } catch (error) {
            this.showMessage('Failed to load admin statistics', 'error');
        }
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
                <td>${user.email || 'null'}</td>
                <td>${user.role}</td>
                <td>${user.totalLogs || 'undefined'}</td>
                <td>${user.lastLogin || 'undefined'}</td>
                <td>
                    <button class="btn btn-small" data-action="edit-user" data-user-id="${user.id}">Edit</button>
                    <button class="btn btn-small" data-action="admin-change-password" data-user-id="${user.id}">Change Password</button>
                    <button class="btn btn-small btn-danger" data-action="delete-user" data-user-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    // Load foods for management
    async loadPiosFoodDB() {
        logger.debug('loadPiosFoodDB called');
        logger.debug('Current user:', this.currentUser);
        
        try {
            // Try to load from backend first
            const response = await this.apiCall('/admin/foods');
            this.adminData.foods = response.foods;
            
            // Sort alphabetically with umlaut handling (client-side)
            this.sortFoodsAlphabetically();
            
            logger.info('Loaded foods from backend:', this.adminData.foods);
            this.updatePiosFoodDBDisplay();
        } catch (error) {
            logger.info('Backend load failed, using local demo data:', error.message);
            
            // Fallback to demo data if backend fails
            if (!this.adminData.foods) {
                this.adminData.foods = [];
            }
            
            // Sort alphabetically with umlaut handling (client-side)
            this.sortFoodsAlphabetically();
            
            logger.info('Using local demo foods data:', this.adminData.foods);
            this.updatePiosFoodDBDisplay();
            
            // Only show error message if it's not just a demo mode fallback
            if (!error.message.includes('401') && !error.message.includes('403')) {
                this.showMessage('Using local demo data (Backend unavailable)', 'warning');
            }
        }
    }

    // Sort foods alphabetically with German umlaut handling
    sortFoodsAlphabetically() {
        if (!this.adminData.foods || this.adminData.foods.length === 0) {
            return;
        }
        
        this.adminData.foods.sort((a, b) => {
            // Convert umlauts for proper German alphabetical sorting
            const nameA = a.name.toLowerCase()
                .replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue');
            const nameB = b.name.toLowerCase()
                .replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue');
            
            return nameA.localeCompare(nameB);
        });
    }

    // Search/filter foods in the food database
    searchFoodDatabase(searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        
        // Show/hide clear button immediately
        const clearBtn = document.getElementById('clearFoodDbSearch');
        if (clearBtn) {
            clearBtn.style.display = query ? 'flex' : 'none';
        }
        
        // If no search query, show all foods
        if (!query) {
            this.adminData.filteredFoods = null;
            this.updatePiosFoodDBDisplay();
            return;
        }
        
        // Filter foods based on search query - NO DEBOUNCE, instant filtering
        this.adminData.filteredFoods = this.adminData.foods.filter(food => {
            const name = (food.name || '').toLowerCase();
            const brand = (food.brand || '').toLowerCase();
            const distributor = (food.distributor || '').toLowerCase();
            
            return name.includes(query) || 
                   brand.includes(query) || 
                   distributor.includes(query);
        });
        
        // Update display immediately
        this.updatePiosFoodDBDisplay();
    }

    // Clear food database search
    clearFoodDatabaseSearch() {
        const searchInput = document.getElementById('foodDbSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.searchFoodDatabase('');
    }

    // Update foods display
    updatePiosFoodDBDisplay() {
        logger.debug('updatePiosFoodDBDisplay called');
        const foodsList = document.getElementById('piosFoodDBList');
        logger.debug('Foods list element:', foodsList);
        logger.debug('Foods data to display:', this.adminData.foods);
        
        if (!foodsList) {
            logger.error('piosFoodDBList element not found!');
            return;
        }

        // Use filtered foods if search is active, otherwise use all foods
        const foodsToDisplay = this.adminData.filteredFoods !== null && this.adminData.filteredFoods !== undefined
            ? this.adminData.filteredFoods
            : this.adminData.foods;

        if (!foodsToDisplay || foodsToDisplay.length === 0) {
            const message = this.adminData.filteredFoods !== null && this.adminData.filteredFoods !== undefined
                ? 'No foods match your search'
                : 'No foods in database yet';
            foodsList.innerHTML = `<tr><td colspan="10" class="empty">${message}</td></tr>`;
            this.updateSortIndicators();
            return;
        }

        foodsList.innerHTML = foodsToDisplay.map(food => {
            const isSelected = this.adminData.selectedFoodIds.has(String(food.id));
            return `
            <tr data-food-id="${food.id}">
                <td class="checkbox-column">
                    <input type="checkbox" 
                           class="food-checkbox" 
                           data-food-id="${food.id}"
                           ${isSelected ? 'checked' : ''}
                           data-action="toggle-food-selection">
                </td>
                <td class="editable-cell" 
                    data-field="name" 
                    data-food-id="${food.id}"
                    data-original-value="${this.escapeHtml(food.name)}">${this.escapeHtml(food.name)}</td>
                <td class="editable-cell" 
                    data-field="brand" 
                    data-food-id="${food.id}"
                    data-original-value="${this.escapeHtml(food.brand || '')}">${this.escapeHtml(food.brand || '-')}</td>
                <td class="editable-cell" 
                    data-field="distributor" 
                    data-food-id="${food.id}"
                    data-original-value="${this.escapeHtml(food.distributor || '')}">${this.escapeHtml(food.distributor || '-')}</td>
                <td class="editable-cell" 
                    data-field="calories" 
                    data-food-id="${food.id}"
                    data-original-value="${Math.round(food.calories)}">${Math.round(food.calories)}</td>
                <td class="editable-cell" 
                    data-field="protein" 
                    data-food-id="${food.id}"
                    data-original-value="${food.protein_per_100g != null ? food.protein_per_100g : ''}">${food.protein_per_100g != null ? parseFloat(food.protein_per_100g).toFixed(1) : '—'}</td>
                <td class="editable-cell" 
                    data-field="carbs" 
                    data-food-id="${food.id}"
                    data-original-value="${food.carbs_per_100g != null ? food.carbs_per_100g : ''}">${food.carbs_per_100g != null ? parseFloat(food.carbs_per_100g).toFixed(1) : '—'}</td>
                <td class="editable-cell" 
                    data-field="fat" 
                    data-food-id="${food.id}"
                    data-original-value="${food.fat_per_100g != null ? food.fat_per_100g : ''}">${food.fat_per_100g != null ? parseFloat(food.fat_per_100g).toFixed(1) : '—'}</td>
                <td>${food.usage_count || 0}</td>
                <td class="action-buttons">
                    <button class="btn btn-small btn-edit" data-action="toggle-edit-mode" data-food-id="${food.id}">Edit</button>
                    <button class="btn btn-small btn-success btn-save" data-action="save-inline-edit" data-food-id="${food.id}" style="display:none;">Save</button>
                    <button class="btn btn-small btn-secondary btn-cancel" data-action="cancel-inline-edit" data-food-id="${food.id}" style="display:none;">Cancel</button>
                    <button class="btn btn-small btn-danger" data-action="delete-food" data-food-id="${food.id}">Delete</button>
                </td>
            </tr>
        `;
        }).join('');
        
        logger.info('Foods table updated with', this.adminData.foods.length, 'items');
        
        // Update sort indicators
        this.updateSortIndicators();
        
        // Update bulk actions toolbar
        this.updateBulkActionsToolbar();
    }

    // Handle Pios Food DB add form submission
    async handleAddPiosFoodDB() {
        const form = document.getElementById('piosFoodDBForm');
        const submitButton = form.querySelector('[type="submit"]') || form.querySelector('button');
        
        // Clear any existing form errors
        this.clearFormErrors(form);
        
        try {
            // Validate inputs
            const nameInput = document.getElementById('piosFoodDBName');
            const caloriesInput = document.getElementById('piosFoodDBCalories');
            
            let hasErrors = false;
            
            // Validate food name
            const nameValidation = this.validateField(nameInput, {
                required: true,
                minLength: 1,
                maxLength: 100
            });
            
            if (!nameValidation.valid) {
                this.showFieldError(nameInput, nameValidation.message);
                hasErrors = true;
            }
            
            // Validate calories
            const caloriesValidation = this.validateField(caloriesInput, {
                required: true,
                type: 'number',
                min: 0,
                max: 10000
            });
            
            if (!caloriesValidation.valid) {
                this.showFieldError(caloriesInput, caloriesValidation.message);
                hasErrors = true;
            }
            
            if (hasErrors) return;
            
            // Set loading state
            this.setButtonLoading(submitButton, true);
            this.setFormLoading(form, true);
            
            const name = nameInput.value.trim();
            const calories = parseFloat(caloriesInput.value);
            const brand = document.getElementById('piosFoodDBBrand')?.value?.trim() || null;
            const distributor = document.getElementById('piosFoodDBDistributor')?.value || null;
            const proteinVal = document.getElementById('piosFoodDBProtein')?.value;
            const carbsVal   = document.getElementById('piosFoodDBCarbs')?.value;
            const fatVal     = document.getElementById('piosFoodDBFat')?.value;

            // Try to save to backend first, fall back to local demo data if needed
            try {
                // Attempt to save to backend database with enhanced notifications
                await this.apiCall('/admin/foods', 'POST', {
                    name,
                    calories_per_100g: calories,
                    brand,
                    distributor,
                    ...(proteinVal !== '' && proteinVal != null ? { protein_per_100g: parseFloat(proteinVal) } : {}),
                    ...(carbsVal   !== '' && carbsVal   != null ? { carbs_per_100g:   parseFloat(carbsVal)   } : {}),
                    ...(fatVal     !== '' && fatVal     != null ? { fat_per_100g:     parseFloat(fatVal)     } : {})
                }, {
                    showLoading: true,
                    showSuccess: true,
                    successMessage: `${name} has been successfully added to your food database`
                });

                form.reset();
                this.loadPiosFoodDB(); // Refresh the foods list from backend
                return;
                
            } catch (error) {
                logger.info('Backend save failed, using local demo mode:', error.message);
            
            // Fallback to local demo data if backend fails
            if (!this.adminData.foods) {
                this.adminData.foods = [];
            }
            
            // Generate ID in format "foodname_YYYYMMDD"
            const today = new Date();
            const dateStr = today.getFullYear() + 
                          String(today.getMonth() + 1).padStart(2, '0') + 
                          String(today.getDate()).padStart(2, '0');
            const foodNameForId = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
            const foodId = `${foodNameForId}_${dateStr}`;
            
            // Create a new food item with demo data
            const newFood = {
                id: foodId,
                name: name,
                calories: parseFloat(calories),
                usage_count: 0
            };
            
            // Add to the demo foods array
            this.adminData.foods.push(newFood);
            
            this.notifications.warning(`Added "${name}" locally (Backend unavailable - Demo mode)`);
            form.reset();
            
            // Update the display to show the new food
            this.updatePiosFoodDBDisplay();
        }
        } catch (error) {
            logger.error('Form validation error:', error);
            this.notifications.error('Please check your input and try again');
        } finally {
            // Always clear loading states
            this.setButtonLoading(submitButton, false);
            this.setFormLoading(form, false);
        }
    }

    // =============================================================================
    // INLINE EDITING FOR ADMIN FOOD TABLE
    // =============================================================================

    /**
     * Initialize inline editing for admin food table cells
     */
    initInlineEditing() {
        // Handle Enter key to save
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('editable-cell') && 
                e.target.hasAttribute('contenteditable') &&
                e.target.getAttribute('contenteditable') === 'true') {
                
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const foodId = parseInt(e.target.closest('tr').dataset.foodId);
                    this.saveRowEdit(foodId);
                }
                
                if (e.key === 'Escape') {
                    e.preventDefault();
                    const foodId = parseInt(e.target.closest('tr').dataset.foodId);
                    this.cancelRowEdit(foodId);
                }
                
                // For calories/macro fields, only allow numbers and decimal point
                const numericFields = ['calories', 'protein', 'carbs', 'fat'];
                if (numericFields.includes(e.target.dataset.field)) {
                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape', '.'];
                    if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
                        e.preventDefault();
                    }
                    // Prevent second decimal point
                    if (e.key === '.' && e.target.textContent.includes('.')) {
                        e.preventDefault();
                    }
                }
            }
        });

        logger.info('Inline editing initialized for admin food table');
    }

    /**
     * Toggle edit mode for a food row
     */
    toggleEditMode(foodId) {
        const row = document.querySelector(`tr[data-food-id="${foodId}"]`);
        if (!row) return;
        
        const nameCell = row.querySelector('[data-field="name"]');
        const caloriesCell = row.querySelector('[data-field="calories"]');
        const brandCell = row.querySelector('[data-field="brand"]');
        const distributorCell = row.querySelector('[data-field="distributor"]');
        const proteinCell = row.querySelector('[data-field="protein"]');
        const carbsCell = row.querySelector('[data-field="carbs"]');
        const fatCell = row.querySelector('[data-field="fat"]');
        
        // Enable contenteditable
        nameCell.contentEditable = 'true';
        caloriesCell.contentEditable = 'true';
        brandCell.contentEditable = 'true';
        distributorCell.contentEditable = 'true';
        proteinCell.contentEditable = 'true';
        carbsCell.contentEditable = 'true';
        fatCell.contentEditable = 'true';
        nameCell.classList.add('editing');
        caloriesCell.classList.add('editing');
        brandCell.classList.add('editing');
        distributorCell.classList.add('editing');
        proteinCell.classList.add('editing');
        carbsCell.classList.add('editing');
        fatCell.classList.add('editing');
        
        // Toggle button visibility
        const editBtn = row.querySelector('[data-action="toggle-edit-mode"]');
        const saveBtn = row.querySelector('[data-action="save-inline-edit"]');
        const cancelBtn = row.querySelector('[data-action="cancel-inline-edit"]');
        const deleteBtn = row.querySelector('[data-action="delete-food"]');
        
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        
        // Focus on name field and select text
        nameCell.focus();
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(nameCell);
        selection.removeAllRanges();
        selection.addRange(range);
        
        logger.info('Edit mode enabled for food:', foodId);
    }

    /**
     * Save inline edits for a row
     */
    async saveRowEdit(foodId) {
        const row = document.querySelector(`tr[data-food-id="${foodId}"]`);
        if (!row) return;
        
        const nameCell = row.querySelector('[data-field="name"]');
        const caloriesCell = row.querySelector('[data-field="calories"]');
        const brandCell = row.querySelector('[data-field="brand"]');
        const distributorCell = row.querySelector('[data-field="distributor"]');
        const proteinCell = row.querySelector('[data-field="protein"]');
        const carbsCell = row.querySelector('[data-field="carbs"]');
        const fatCell = row.querySelector('[data-field="fat"]');
        
        const newName = nameCell.textContent.trim();
        const newCalories = caloriesCell.textContent.trim();
        const newBrand = brandCell.textContent.trim();
        const newDistributor = distributorCell.textContent.trim();
        const newProtein = proteinCell.textContent.trim().replace('—', '');
        const newCarbs = carbsCell.textContent.trim().replace('—', '');
        const newFat = fatCell.textContent.trim().replace('—', '');
        
        const originalName = nameCell.dataset.originalValue;
        const originalCalories = caloriesCell.dataset.originalValue;
        const originalBrand = brandCell.dataset.originalValue;
        const originalDistributor = distributorCell.dataset.originalValue;
        const originalProtein = proteinCell.dataset.originalValue;
        const originalCarbs = carbsCell.dataset.originalValue;
        const originalFat = fatCell.dataset.originalValue;
        
        // Validate
        if (!newName) {
            this.notifications.error('Food name cannot be empty');
            nameCell.focus();
            return;
        }
        
        const caloriesNum = parseFloat(newCalories);
        if (isNaN(caloriesNum) || caloriesNum < 0) {
            this.notifications.error('kcal must be a number ≥ 0');
            caloriesCell.focus();
            return;
        }
        
        // Validate macros (optional — blank means null)
        for (const [label, val, cell] of [['Protein', newProtein, proteinCell], ['Carbs', newCarbs, carbsCell], ['Fat', newFat, fatCell]]) {
            if (val !== '' && (isNaN(parseFloat(val)) || parseFloat(val) < 0 || parseFloat(val) > 100)) {
                this.notifications.error(`${label} must be a number between 0 and 100`);
                cell.focus();
                return;
            }
        }

        // Check if anything changed
        const nameChanged = newName !== originalName;
        const caloriesChanged = newCalories !== originalCalories;
        const brandChanged = newBrand !== originalBrand;
        const distributorChanged = newDistributor !== originalDistributor;
        const proteinChanged = newProtein !== originalProtein;
        const carbsChanged = newCarbs !== originalCarbs;
        const fatChanged = newFat !== originalFat;
        
        if (!nameChanged && !caloriesChanged && !brandChanged && !distributorChanged && !proteinChanged && !carbsChanged && !fatChanged) {
            logger.info('No changes detected, disabling edit mode');
            this.disableEditMode(foodId);
            return;
        }
        
        // Show saving state
        nameCell.classList.add('saving');
        caloriesCell.classList.add('saving');
        brandCell.classList.add('saving');
        distributorCell.classList.add('saving');
        proteinCell.classList.add('saving');
        carbsCell.classList.add('saving');
        fatCell.classList.add('saving');
        
        try {
            // Prepare update data
            const updateData = {
                name: newName,
                calories_per_100g: parseFloat(newCalories),
                brand: newBrand === '-' ? null : newBrand,
                distributor: newDistributor === '-' ? null : newDistributor,
                protein_per_100g: newProtein !== '' ? parseFloat(newProtein) : null,
                carbs_per_100g:   newCarbs   !== '' ? parseFloat(newCarbs)   : null,
                fat_per_100g:     newFat     !== '' ? parseFloat(newFat)     : null
            };
            
            // Call API with enhanced notifications
            await this.apiCall(`/admin/foods/${foodId}`, 'PUT', updateData, {
                showSuccess: true,
                successMessage: `${newName} has been successfully updated`
            });
            
            // Update original values
            nameCell.dataset.originalValue = newName;
            caloriesCell.dataset.originalValue = newCalories;
            brandCell.dataset.originalValue = newBrand;
            distributorCell.dataset.originalValue = newDistributor;
            proteinCell.dataset.originalValue = newProtein;
            carbsCell.dataset.originalValue = newCarbs;
            fatCell.dataset.originalValue = newFat;
            
            // Update local cache
            const food = this.adminData.foods.find(f => f.id == foodId);
            if (food) {
                food.name = newName;
                food.calories = parseFloat(newCalories);
                food.calories_per_100g = parseFloat(newCalories);
                food.brand = newBrand === '-' ? null : newBrand;
                food.distributor = newDistributor === '-' ? null : newDistributor;
                food.protein_per_100g = newProtein !== '' ? parseFloat(newProtein) : null;
                food.carbs_per_100g   = newCarbs   !== '' ? parseFloat(newCarbs)   : null;
                food.fat_per_100g     = newFat     !== '' ? parseFloat(newFat)     : null;
            }
            
            // Show visual success feedback
            nameCell.classList.remove('saving');
            caloriesCell.classList.remove('saving');
            brandCell.classList.remove('saving');
            distributorCell.classList.remove('saving');
            proteinCell.classList.remove('saving');
            carbsCell.classList.remove('saving');
            fatCell.classList.remove('saving');
            nameCell.classList.add('saved');
            caloriesCell.classList.add('saved');
            brandCell.classList.add('saved');
            distributorCell.classList.add('saved');
            proteinCell.classList.add('saved');
            carbsCell.classList.add('saved');
            fatCell.classList.add('saved');
            
            setTimeout(() => {
                nameCell.classList.remove('saved');
                caloriesCell.classList.remove('saved');
                brandCell.classList.remove('saved');
                distributorCell.classList.remove('saved');
                proteinCell.classList.remove('saved');
                carbsCell.classList.remove('saved');
                fatCell.classList.remove('saved');
            }, 1500);
            
            // Disable edit mode
            this.disableEditMode(foodId);
            
        } catch (error) {
            // Error notification is handled by apiCall
            logger.error('Failed to save food:', error);
            
            // Remove saving state
            nameCell.classList.remove('saving');
            caloriesCell.classList.remove('saving');
            brandCell.classList.remove('saving');
            distributorCell.classList.remove('saving');
            proteinCell.classList.remove('saving');
            carbsCell.classList.remove('saving');
            fatCell.classList.remove('saving');
        }
    }

    /**
     * Cancel inline edits and revert changes
     */
    cancelRowEdit(foodId) {
        const row = document.querySelector(`tr[data-food-id="${foodId}"]`);
        if (!row) return;
        
        const nameCell = row.querySelector('[data-field="name"]');
        const caloriesCell = row.querySelector('[data-field="calories"]');
        const brandCell = row.querySelector('[data-field="brand"]');
        const distributorCell = row.querySelector('[data-field="distributor"]');
        const proteinCell = row.querySelector('[data-field="protein"]');
        const carbsCell = row.querySelector('[data-field="carbs"]');
        const fatCell = row.querySelector('[data-field="fat"]');
        
        // Revert to original values
        nameCell.textContent = nameCell.dataset.originalValue;
        caloriesCell.textContent = caloriesCell.dataset.originalValue;
        brandCell.textContent = brandCell.dataset.originalValue || '-';
        distributorCell.textContent = distributorCell.dataset.originalValue || '-';
        proteinCell.textContent = proteinCell.dataset.originalValue !== '' ? proteinCell.dataset.originalValue : '—';
        carbsCell.textContent   = carbsCell.dataset.originalValue   !== '' ? carbsCell.dataset.originalValue   : '—';
        fatCell.textContent     = fatCell.dataset.originalValue     !== '' ? fatCell.dataset.originalValue     : '—';
        
        // Disable edit mode
        this.disableEditMode(foodId);
        
        logger.info('Edit cancelled for food:', foodId);
    }

    /**
     * Disable edit mode for a row
     */
    disableEditMode(foodId) {
        const row = document.querySelector(`tr[data-food-id="${foodId}"]`);
        if (!row) return;
        
        const nameCell = row.querySelector('[data-field="name"]');
        const caloriesCell = row.querySelector('[data-field="calories"]');
        const brandCell = row.querySelector('[data-field="brand"]');
        const distributorCell = row.querySelector('[data-field="distributor"]');
        const proteinCell = row.querySelector('[data-field="protein"]');
        const carbsCell = row.querySelector('[data-field="carbs"]');
        const fatCell = row.querySelector('[data-field="fat"]');
        
        // Disable contenteditable
        nameCell.contentEditable = 'false';
        caloriesCell.contentEditable = 'false';
        brandCell.contentEditable = 'false';
        distributorCell.contentEditable = 'false';
        proteinCell.contentEditable = 'false';
        carbsCell.contentEditable = 'false';
        fatCell.contentEditable = 'false';
        nameCell.classList.remove('editing');
        caloriesCell.classList.remove('editing');
        brandCell.classList.remove('editing');
        distributorCell.classList.remove('editing');
        proteinCell.classList.remove('editing');
        carbsCell.classList.remove('editing');
        fatCell.classList.remove('editing');
        
        // Toggle button visibility
        const editBtn = row.querySelector('[data-action="toggle-edit-mode"]');
        const saveBtn = row.querySelector('[data-action="save-inline-edit"]');
        const cancelBtn = row.querySelector('[data-action="cancel-inline-edit"]');
        const deleteBtn = row.querySelector('[data-action="delete-food"]');
        
        editBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    }

    /**
     * Handle cell focus in - store original value and add editing indicator
     */
    handleCellFocusIn(cell) {
        cell.classList.add('editing');
        
        // Select all text for easy replacement
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(cell);
        selection.removeAllRanges();
        selection.addRange(range);
        
        logger.debug('Cell editing started:', cell.dataset.field);
    }

    /**
     * Handle cell focus out - save if changed
     */
    async handleCellFocusOut(cell) {
        cell.classList.remove('editing');
        
        const newValue = cell.textContent.trim();
        const originalValue = cell.dataset.originalValue;
        const field = cell.dataset.field;
        const foodId = cell.dataset.foodId;
        
        // Check if value changed
        if (newValue === originalValue) {
            logger.debug('No change detected, skipping save');
            return;
        }
        
        // Validate based on field type
        if (field === 'calories') {
            const calories = parseFloat(newValue);
            if (isNaN(calories) || calories < 0) {
                this.showMessage('kcal must be a number ≥ 0', 'error');
                cell.textContent = originalValue; // Revert
                return;
            }
        }
        
        if (field === 'name' && !newValue) {
            this.showMessage('Food name cannot be empty', 'error');
            cell.textContent = originalValue; // Revert
            return;
        }
        
        // Save the change
        await this.saveInlineEdit(foodId, field, newValue, cell);
    }

    /**
     * Handle keyboard shortcuts during editing
     */
    handleCellKeydown(e) {
        const cell = e.target;
        
        // Enter - Save and move to next row
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            cell.blur(); // Trigger save via focusout
        }
        
        // Escape - Cancel and revert
        if (e.key === 'Escape') {
            e.preventDefault();
            const originalValue = cell.dataset.originalValue;
            cell.textContent = originalValue;
            cell.blur();
            logger.debug('Edit cancelled');
        }
        
        // For calories field, only allow numbers
        if (cell.dataset.field === 'calories') {
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'];
            if (!allowedKeys.includes(e.key) && (e.key < '0' || e.key > '9') && e.key !== '.') {
                e.preventDefault();
            }
        }
    }

    /**
     * Handle input to provide live feedback
     */
    handleCellInput(cell) {
        const field = cell.dataset.field;
        
        // For calories, enforce numeric only
        if (field === 'calories') {
            const value = cell.textContent;
            const numericOnly = value.replace(/[^\d]/g, '');
            if (value !== numericOnly) {
                cell.textContent = numericOnly;
                // Move cursor to end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(cell);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    /**
     * Save inline edit to backend
     */
    async saveInlineEdit(foodId, field, newValue, cell) {
        try {
            logger.info(`Saving inline edit: ${field} = ${newValue} for food ${foodId}`);
            
            // Show loading indicator
            cell.classList.add('saving');
            const originalContent = cell.textContent;
            
            // Prepare update data
            const updateData = {};
            if (field === 'name') {
                updateData.name = newValue;
            } else if (field === 'calories') {
                updateData.calories_per_100g = parseFloat(newValue);
            } else if (field === 'protein') {
                updateData.protein_per_100g = newValue === '' ? null : parseFloat(newValue);
            } else if (field === 'carbs') {
                updateData.carbs_per_100g = newValue === '' ? null : parseFloat(newValue);
            } else if (field === 'fat') {
                updateData.fat_per_100g = newValue === '' ? null : parseFloat(newValue);
            }
            
            // Call API
            const response = await this.apiCall(`/admin/foods/${foodId}`, 'PUT', updateData);
            
            if (response.success) {
                // Update stored value
                cell.dataset.originalValue = newValue;
                cell.classList.remove('saving');
                cell.classList.add('saved');
                
                // Update local data
                const food = this.adminData.foods.find(f => f.id == foodId);
                if (food) {
                    if (field === 'name') food.name = newValue;
                    if (field === 'calories') {
                        food.calories = parseFloat(newValue);
                        food.calories_per_100g = parseFloat(newValue);
                    }
                    if (field === 'protein') food.protein_per_100g = newValue === '' ? null : parseFloat(newValue);
                    if (field === 'carbs')   food.carbs_per_100g   = newValue === '' ? null : parseFloat(newValue);
                    if (field === 'fat')     food.fat_per_100g     = newValue === '' ? null : parseFloat(newValue);
                }
                
                // Remove saved indicator after animation
                setTimeout(() => cell.classList.remove('saved'), 1500);
                
                logger.info('Inline edit saved successfully');
            } else {
                throw new Error(response.message || 'Failed to update');
            }
            
        } catch (error) {
            logger.error('Failed to save inline edit:', error);
            this.showMessage(`Failed to update ${field}: ${error.message}`, 'error');
            
            // Revert to original value
            cell.textContent = cell.dataset.originalValue;
            cell.classList.remove('saving');
        }
    }

    // =============================================================================
    // ADMIN FOOD MANAGEMENT (DELETE)
    // =============================================================================

    // Delete food
    async deleteFood(foodId) {
        const food = this.adminData.foods.find(f => f.id == foodId);
        const foodName = food ? food.name : 'this food';
        
        const confirmed = await this.showConfirmation(
            'Delete Food',
            `Are you sure you want to delete "${foodName}"? This action cannot be undone.`,
            'Delete',
            'danger'
        );

        if (!confirmed) return;

        try {
            // Try to delete from backend first
            await this.apiCall(`/admin/foods/${foodId}`, 'DELETE');
            this.showMessage('Food deleted successfully from Pios Food DB', 'success');
            this.loadPiosFoodDB(); // Refresh the foods list from backend
        } catch (error) {
            // Check if the backend rejected the deletion (food is in use)
            const isInUse =
                (error.data && error.data.details?.reason === 'FOOD_IN_USE') ||
                (error.message && error.message.toLowerCase().includes('logged by users'));

            if (isInUse) {
                const usageCount = error.data?.details?.usageCount;
                const detail = usageCount != null
                    ? ` It has been logged ${usageCount} time${usageCount !== 1 ? 's' : ''} and cannot be removed.`
                    : ' It has been logged by users and cannot be removed.';
                this.showMessage(`Cannot delete "${foodName}".${detail}`, 'warning');
                logger.warn(`Cannot delete food ${foodId}:`, error.data || error.message);
                return;
            }

            // Surface any other backend validation error directly
            if (error.data && error.data.message) {
                this.showMessage(error.data.message, 'error');
                logger.warn(`Cannot delete food ${foodId}:`, error.data);
                return;
            }
            
            logger.info('Backend delete failed, using local demo mode:', error.message);
            
            // Fallback to local array deletion (only for connection errors)
            if (this.adminData.foods) {
                const foodIndex = this.adminData.foods.findIndex(food => food.id == foodId);
                if (foodIndex !== -1) {
                    const deletedFood = this.adminData.foods[foodIndex];
                    this.adminData.foods.splice(foodIndex, 1);
                    this.showMessage(`Deleted "${deletedFood.name}" locally (Backend unavailable)`, 'warning');
                    this.updatePiosFoodDBDisplay();
                } else {
                    this.showMessage('Food not found', 'error');
                }
            } else {
                this.showMessage(`Failed to delete food: ${error.message}`, 'error');
            }
        }
    }

    // Reset user password
    async resetUserPassword(userId) {
        const confirmed = await this.showConfirmation(
            'Reset Password',
            'Are you sure you want to reset this user\'s password? They will receive an email with instructions.',
            'Reset Password',
            'primary'
        );

        if (!confirmed) return;

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
        const user = this.adminData.users.find(u => u.id == userId);
        const username = user ? user.username : 'this user';
        
        const confirmed = await this.showConfirmation(
            'Delete User',
            `Are you sure you want to delete user "${username}"? This action cannot be undone and will remove all their data.`,
            'Delete User',
            'danger'
        );

        if (!confirmed) return;

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
        logger.info('showAdminSection called with section:', section);
        
        // Hide all admin sections
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        
        // Show selected section
        const targetSection = document.getElementById(`admin${section}`);
        logger.info(`Target section admin${section}:`, targetSection);
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
                logger.info('Loading Pios Food DB section...');
                this.loadPiosFoodDB();
                break;
            case 'Contributions':
                logger.info('Loading User Contributions section...');
                this.loadContributionsData();
                break;
            case 'Database':
                logger.info('Loading Database section...');
                this.loadDatabaseManagement();
                break;
        }
    }

    // =============================================================================
    // DATABASE MANAGEMENT FUNCTIONALITY
    // =============================================================================

    // Load database management interface
    async loadDatabaseManagement() {
        if (!this.isAdmin) return;
        
        try {
            // Load database statistics
            await this.loadDatabaseStats();
            
            // Load database tables
            await this.loadDatabaseTables();
            
        } catch (error) {
            logger.error('Error loading database management:', error);
            this.showMessage('Failed to load database management interface', 'error');
        }
    }

    // Load database statistics
    async loadDatabaseStats() {
        try {
            const response = await this.apiCall('/admin/database/stats');
            const stats = response.stats;
            
            document.getElementById('dbTableCount').textContent = stats.table_count || 0;
            document.getElementById('dbTotalRows').textContent = (stats.total_rows || 0).toLocaleString();
            document.getElementById('dbSize').textContent = this.formatBytes(stats.database_size || 0);
            document.getElementById('mysqlVersion').textContent = stats.mysql_version || 'Unknown';
            
        } catch (error) {
            logger.error('Error loading database stats:', error);
            this.showMessage('Failed to load database statistics', 'error');
        }
    }

    // Load database tables
    async loadDatabaseTables() {
        try {
            const response = await this.apiCall('/admin/database/tables');
            this.displayDatabaseTables(response.tables);
        } catch (error) {
            logger.error('Error loading database tables:', error);
            this.showMessage('Failed to load database tables', 'error');
        }
    }

    // Display database tables
    displayDatabaseTables(tables) {
        const tablesList = document.getElementById('databaseTablesList');
        
        if (!tables || tables.length === 0) {
            tablesList.innerHTML = '<tr><td colspan="5" class="no-data">No tables found</td></tr>';
            return;
        }
        
        tablesList.innerHTML = tables.map(table => `
            <tr>
                <td><strong>${table.table_name}</strong></td>
                <td>${(table.row_count || 0).toLocaleString()}</td>
                <td>${this.formatBytes(table.size_bytes || 0)}</td>
                <td>${table.created_at ? new Date(table.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button data-action="browse-table" data-table-name="${table.table_name}" class="btn btn-sm btn-info">
                        👁️ Browse
                    </button>
                    <button data-action="show-table-structure" data-table-name="${table.table_name}" class="btn btn-sm btn-secondary">
                        🏗️ Structure
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Execute SQL query
    async executeSQLQuery() {
        const queryTextarea = document.getElementById('sqlQuery');
        const sql = queryTextarea.value.trim();
        
        if (!sql) {
            this.showMessage('Please enter a SQL query', 'error');
            return;
        }
        
        const resultsDiv = document.getElementById('queryResults');
        resultsDiv.innerHTML = '<div class="loading">Executing query...</div>';
        
        try {
            const response = await this.apiCall('/admin/database/query', 'POST', { sql });
            this.displayQueryResults(response);
        } catch (error) {
            logger.error('Error executing query:', error);
            resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }

    // Display query results
    displayQueryResults(response) {
        const resultsDiv = document.getElementById('queryResults');
        
        if (!response.results || response.results.length === 0) {
            resultsDiv.innerHTML = '<div class="no-data">Query executed successfully. No results returned.</div>';
            return;
        }
        
        const results = response.results;
        const columns = Object.keys(results[0]);
        
        const tableHTML = `
            <div class="query-meta">
                <small>
                    ${response.meta.rowCount} rows returned in ${response.meta.executionTime}
                </small>
            </div>
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(row => `
                            <tr>
                                ${columns.map(col => `<td>${this.formatCellValue(row[col])}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        resultsDiv.innerHTML = tableHTML;
    }

    // Browse table data
    async browseTable(tableName) {
        try {
            // Load table structure
            const structureResponse = await this.apiCall(`/admin/database/tables/${tableName}/structure`);
            
            // Load table data
            const dataResponse = await this.apiCall(`/admin/database/tables/${tableName}/data`);
            
            this.showTableBrowser(tableName, structureResponse, dataResponse);
            
        } catch (error) {
            logger.error('Error browsing table:', error);
            this.showMessage(`Failed to browse table: ${tableName}`, 'error');
        }
    }

    // Show table browser modal
    showTableBrowser(tableName, structureData, tableData) {
        const modal = document.getElementById('tableBrowserModal');
        const title = document.getElementById('tableBrowserTitle');
        
        title.textContent = `Browse Table: ${tableName}`;
        
        // Display table structure
        this.displayTableStructure(structureData.columns);
        
        // Display table data
        this.displayTableData(tableData);
        
        // Show modal
        modal.style.display = 'block';
        this.currentBrowsingTable = {
            name: tableName,
            currentPage: tableData.pagination.page
        };
    }

    // Display table structure
    displayTableStructure(columns) {
        const container = document.getElementById('tableStructure');
        
        const tableHTML = `
            <table class="structure-table">
                <thead>
                    <tr>
                        <th>Column</th>
                        <th>Type</th>
                        <th>Nullable</th>
                        <th>Default</th>
                        <th>Key</th>
                    </tr>
                </thead>
                <tbody>
                    ${columns.map(col => `
                        <tr>
                            <td><strong>${col.column_name}</strong></td>
                            <td><code>${col.data_type}</code></td>
                            <td>${col.is_nullable === 'YES' ? '✅' : '❌'}</td>
                            <td><code>${col.default_value || 'NULL'}</code></td>
                            <td>${this.formatKeyType(col.key_type)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
    }

    // Display table data
    displayTableData(dataResponse) {
        const container = document.getElementById('tableDataContainer');
        const pagination = document.getElementById('tablePagination');
        
        const { data, pagination: pag } = dataResponse;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="no-data">No data found</div>';
            pagination.innerHTML = '';
            return;
        }
        
        const columns = Object.keys(data[0]);
        
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${columns.map(col => `<td>${this.formatCellValue(row[col])}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
        
        // Update pagination
        pagination.innerHTML = `
            Page ${pag.page} of ${pag.totalPages} 
            (${pag.total.toLocaleString()} total rows)
        `;
    }

    // Helper functions
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatCellValue(value) {
        if (value === null) return '<em>NULL</em>';
        if (value === '') return '<em>Empty</em>';
        if (typeof value === 'string' && value.length > 100) {
            return value.substring(0, 100) + '...';
        }
        return String(value);
    }

    formatKeyType(keyType) {
        switch (keyType) {
            case 'PRI': return '🔑 Primary';
            case 'UNI': return '🔐 Unique';
            case 'MUL': return '📎 Index';
            default: return '';
        }
    }

    // Clear SQL query
    clearQuery() {
        document.getElementById('sqlQuery').value = '';
        document.getElementById('queryResults').innerHTML = '';
    }

    // Close table browser
    closeTableBrowser() {
        document.getElementById('tableBrowserModal').style.display = 'none';
        this.currentBrowsingTable = null;
    }

    // Search table data
    async searchTableData() {
        if (!this.currentBrowsingTable) return;
        
        const searchInput = document.getElementById('tableSearchInput');
        const searchTerm = searchInput.value.trim();
        
        try {
            const url = `/admin/database/tables/${this.currentBrowsingTable.name}/data?search=${encodeURIComponent(searchTerm)}`;
            const response = await this.apiCall(url);
            this.displayTableData(response);
        } catch (error) {
            logger.error('Error searching table data:', error);
        }
    }

    // Show table structure
    async showTableStructure(tableName) {
        try {
            const response = await this.apiCall(`/admin/database/tables/${tableName}/structure`);
            
            // Create a simple modal to show structure
            const structureHTML = `
                <div class="structure-modal">
                    <h4>Table Structure: ${tableName}</h4>
                    ${this.formatTableStructure(response.columns)}
                    <button data-action="close-structure-modal" class="btn btn-secondary">Close</button>
                </div>
            `;
            
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = structureHTML;
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
            
            document.body.appendChild(overlay);
            
        } catch (error) {
            logger.error('Error showing table structure:', error);
            this.showMessage(`Failed to load structure for table: ${tableName}`, 'error');
        }
    }

    formatTableStructure(columns) {
        return `
            <table class="structure-table">
                <thead>
                    <tr><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th><th>Key</th></tr>
                </thead>
                <tbody>
                    ${columns.map(col => `
                        <tr>
                            <td><strong>${col.column_name}</strong></td>
                            <td><code>${col.data_type}</code></td>
                            <td>${col.is_nullable === 'YES' ? '✅' : '❌'}</td>
                            <td><code>${col.default_value || 'NULL'}</code></td>
                            <td>${this.formatKeyType(col.key_type)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // =============================================================================
    // ENHANCED FOOD SEARCH INTEGRATION
    // =============================================================================



    // Get food details by ID or name
    async getFoodDetails(foodId = null, foodName = null) {
        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            // No offline database available - return null
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
            logger.error('Error getting food details:', error);
            return null;
        }
    }
    // Show data sources information modal
    showDataSourcesInfo() {
        const modal = document.createElement('div');
        modal.className = 'data-sources-modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-action="close-modal"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🌐 Data Sources & Attribution</h3>
                    <button class="modal-close" data-action="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="data-source">
                        <h4>� Pios Food DB</h4>
                        <p><strong>Primary nutrition database</strong> - A curated database of food products with accurate nutrition information.</p>
                        <ul>
                            <li>� <strong>Personalized</strong>: Foods specific to your preferences</li>
                            <li>📊 <strong>Accurate data</strong>: Verified calories and macros</li>
                            <li>� <strong>Editable</strong>: Can be customized by administrators</li>
                            <li>🔗 <strong>Backend sync</strong>: Synchronized across your devices</li>
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

    // Show database toggle information modal
    showDatabaseToggleInfo() {
        const modal = document.createElement('div');
        modal.className = 'data-sources-modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-action="close-modal"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔍 Database Search Controls</h3>
                    <button class="modal-close" data-action="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="data-source">
                        <h4>⭐ Favorites</h4>
                        <p><strong>Your personalized food list</strong> - Foods you've used recently or marked as favorites.</p>
                        <ul>
                            <li>⚡ <strong>Instant results</strong>: Shows immediately as you type</li>
                            <li>🎯 <strong>Most relevant</strong>: Based on your usage history</li>
                            <li>💾 <strong>Saved locally</strong>: Works offline</li>
                            <li>📊 <strong>Accurate data</strong>: Uses nutrition info from your previous entries</li>
                        </ul>
                    </div>
                    
                    <div class="data-source">
                        <h4>📱 Offline Cache</h4>
                        <p><strong>Local fallback database</strong> - Common foods stored on your device for offline use.</p>
                        <ul>
                            <li>🔄 <strong>Always available</strong>: Works without internet connection</li>
                            <li>🥗 <strong>Essential foods</strong>: Fruits, vegetables, proteins, grains</li>
                            <li>✅ <strong>Verified data</strong>: Manually curated nutrition information</li>
                            <li>⚡ <strong>Fast search</strong>: Instant local lookup</li>
                        </ul>
                    </div>
                    
                    <div class="data-source">
                        <h4>🏠 Pios Food DB</h4>
                        <p><strong>Custom database entries</strong> - Foods added by admins or imported from your account.</p>
                        <ul>
                            <li>🎯 <strong>Personalized</strong>: Foods specific to your preferences</li>
                            <li>📝 <strong>Editable</strong>: Can be customized by administrators</li>
                            <li>🔗 <strong>Backend sync</strong>: Synchronized across your devices</li>
                            <li>📊 <strong>Usage tracking</strong>: Learns from your food choices</li>
                        </ul>
                    </div>
                    
                    <div class="attribution-note">
                        <h4>💡 How to Use</h4>
                        <p>
                            <strong>Toggle databases on/off</strong> to customize your search experience. 
                            Disable databases you don't need to see more focused results.
                        </p>
                        <p>
                            <strong>Tip:</strong> Keep "Favorites" enabled for the fastest, 
                            most relevant results. Enable "Pios Food DB" for comprehensive coverage.
                        </p>
                        <p>
                            <strong>Your settings are saved automatically</strong> and remembered for future sessions.
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
    showCalorieInputModal(foodName) {
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
                            <label for="calorie-input">kcal per 100g:</label>
                            <input 
                                type="number" 
                                id="calorie-input" 
                                placeholder="Enter kcal..." 
                                min="0" 
                                max="9999"
                                step="0.1"
                                autocomplete="off"
                            >
                            <div class="error-message" id="calorie-error">
                                Please enter a valid kcal value (0-9999)
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

    // Admin Panel Integration Methods (Optional)
    
    // Get admin statistics
    async getAdminStats() {
        try {
            const response = await this.apiCall('/admin/stats');
            return response.success ? response.stats : null;
        } catch (error) {
            logger.error('Admin stats error:', error);
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
            logger.error('Pios Food DB error:', error);
            return [];
        }
    }

    // Get food categories for admin management
    async getAdminFoodCategories() {
        try {
            const response = await this.apiCall('/admin/food-categories');
            return response.success ? response.categories : [];
        } catch (error) {
            logger.error('Admin categories error:', error);
            return [];
        }
    }

    // =============================================================================
    // USER CONTRIBUTIONS MANAGEMENT
    // =============================================================================

    /**
     * Load user contributions data including stats, foods, and contributors
     */
    async loadContributionsData() {
        if (!this.isAdmin) return;

        try {
            logger.info('Loading user contributions data...');

            // Load statistics
            await this.loadContributionStats();

            // Load user-contributed foods with current filters
            await this.loadUserFoods();

        } catch (error) {
            logger.error('Error loading contributions data:', error);
            this.notifications.error('Failed to load user contributions');
        }
    }

    /**
     * Load contribution statistics
     */
    async loadContributionStats() {
        try {
            const response = await this.apiCall('/admin/user-foods/stats');
            
            if (response.success) {
                this.contributionsData.stats = response.stats;
                this.contributionsData.topContributors = response.topContributors || [];
                this.renderContributionStats();
                this.renderTopContributors();
            }
        } catch (error) {
            logger.error('Error loading contribution stats:', error);
        }
    }

    /**
     * Render contribution statistics
     */
    renderContributionStats() {
        const stats = this.contributionsData.stats;
        
        document.getElementById('totalUserFoods').textContent = stats.total_user_foods || 0;
        document.getElementById('totalContributors').textContent = stats.total_contributors || 0;
        document.getElementById('popularFoodsCount').textContent = stats.popular_foods_count || 0;
        document.getElementById('avgUsagePerFood').textContent = 
            stats.avg_usage_per_food ? stats.avg_usage_per_food.toFixed(1) : '0.0';
    }

    /**
     * Render top contributors list
     */
    renderTopContributors() {
        const listDiv = document.getElementById('topContributorsList');
        const contributors = this.contributionsData.topContributors;

        if (!contributors || contributors.length === 0) {
            listDiv.innerHTML = '<p class="empty-message">No contributors yet</p>';
            return;
        }

        listDiv.innerHTML = contributors.slice(0, 5).map((contributor, index) => `
            <div class="contributor-item">
                <div class="contributor-rank">${index + 1}</div>
                <div class="contributor-info">
                    <div class="contributor-name">${this.escapeHtml(contributor.username)}</div>
                    <div class="contributor-stats">
                        ${contributor.foods_contributed} food${contributor.foods_contributed !== 1 ? 's' : ''} • 
                        ${contributor.total_usage} use${contributor.total_usage !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load user-contributed foods with pagination and filters
     */
    /**
     * Search/filter user contributions
     */
    searchUserContributions(searchQuery) {
        // Clear any existing timer
        if (this.searchDebounceTimers.contributions) {
            clearTimeout(this.searchDebounceTimers.contributions);
        }
        
        const query = searchQuery.toLowerCase().trim();
        
        // Show/hide clear button immediately
        const clearBtn = document.getElementById('clearContributionsSearch');
        if (clearBtn) {
            clearBtn.style.display = query ? 'flex' : 'none';
        }
        
        // Store search query in filters
        this.contributionsData.filters.searchQuery = query;
        
        // Reset to first page when searching
        this.contributionsData.pagination.page = 1;
        
        // Debounce the API call to avoid too many requests while typing
        this.searchDebounceTimers.contributions = setTimeout(() => {
            // Reload with search filter
            this.loadUserFoods();
        }, 300); // Reduced to 300ms for faster response
    }

    /**
     * Clear contributions search
     */
    clearContributionsSearch() {
        const searchInput = document.getElementById('contributionsSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.searchUserContributions('');
    }

    /**
     * Load user-contributed foods with filters
     */
    async loadUserFoods() {
        try {
            const { page, limit } = this.contributionsData.pagination;
            const { sortBy, minUsage, searchQuery } = this.contributionsData.filters;

            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sortBy: sortBy
            });

            if (minUsage > 0) {
                params.append('minUsage', minUsage.toString());
            }

            if (searchQuery) {
                params.append('search', searchQuery);
            }

            const response = await this.apiCall(`/admin/user-foods?${params}`);

            if (response.success) {
                this.contributionsData.foods = response.foods || [];
                this.contributionsData.pagination = {
                    ...this.contributionsData.pagination,
                    ...response.pagination
                };

                this.renderUserFoodsList();
                this.updateContributionsPagination();
            }
        } catch (error) {
            logger.error('Error loading user foods:', error);
            document.getElementById('userFoodsList').innerHTML = 
                '<p class="error-message">Failed to load user contributions</p>';
        }
    }

    /**
     * Render user foods list
     */
    renderUserFoodsList() {
        const listDiv = document.getElementById('userFoodsList');
        const foods = this.contributionsData.foods;

        if (!foods || foods.length === 0) {
            listDiv.innerHTML = '<p class="empty-message">No user-contributed foods found</p>';
            return;
        }

        listDiv.innerHTML = foods.map(food => this.renderUserFoodItem(food)).join('');
    }

    /**
     * Render a single user food item
     */
    renderUserFoodItem(food) {
        const badge = this.getUsageBadge(food.times_logged);
        const popularityClass = food.times_logged >= 10 ? 'very-popular' : 
                               food.times_logged >= 5 ? 'popular' : '';
        
        const brandText = food.brand ? ` • Brand: ${this.escapeHtml(food.brand)}` : '';
        const distributorText = food.distributor ? ` • Store: ${this.escapeHtml(food.distributor)}` : '';
        
        const lastUsed = food.last_used_at ? 
            new Date(food.last_used_at).toLocaleDateString() : 'Never';
        
        const created = new Date(food.created_at).toLocaleDateString();

        return `
            <div class="user-food-item ${popularityClass}" data-food-id="${food.id}">
                <div class="user-food-header">
                    <div class="user-food-title">
                        <div class="user-food-name">${this.escapeHtml(food.name)}</div>
                        <div class="user-food-meta">
                            ${Math.round(food.calories_per_100g)} kcal/100g${brandText}${distributorText}
                        </div>
                    </div>
                    <div class="user-food-badge ${badge.class}">${badge.text}</div>
                </div>

                <div class="user-food-details">
                    <div class="detail-item">
                        <span class="detail-label">Created by:</span>
                        <span class="detail-value">${this.escapeHtml(food.creator_username)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${created}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last used:</span>
                        <span class="detail-value">${lastUsed}</span>
                    </div>
                </div>

                <div class="user-food-stats">
                    <div class="stat-item">
                        📊 <strong>${food.times_logged}</strong> log${food.times_logged !== 1 ? 's' : ''}
                    </div>
                    <div class="stat-item">
                        👥 <strong>${food.unique_users}</strong> user${food.unique_users !== 1 ? 's' : ''}
                    </div>
                </div>

                <div class="user-food-actions">
                    <button class="btn btn-success btn-small" 
                            data-action="promote-user-food" 
                            data-food-id="${food.id}">
                        ✅ Promote to Pios DB
                    </button>
                    <button class="btn btn-danger btn-small" 
                            data-action="reject-user-food" 
                            data-food-id="${food.id}"
                            data-food-name="${this.escapeHtml(food.name)}">
                        ❌ Reject
                    </button>
                    <button class="btn btn-secondary btn-small" 
                            data-action="delete-user-food" 
                            data-food-id="${food.id}"
                            data-food-name="${this.escapeHtml(food.name)}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get usage badge based on times logged
     */
    getUsageBadge(timesLogged) {
        if (timesLogged >= 10) {
            return { text: '🔥 Very Popular', class: 'badge-very-popular' };
        }
        if (timesLogged >= 5) {
            return { text: '⭐ Popular', class: 'badge-popular' };
        }
        if (timesLogged >= 2) {
            return { text: '👍 Used', class: 'badge-used' };
        }
        return { text: '🆕 New', class: 'badge-new' };
    }

    /**
     * Update pagination controls
     */
    updateContributionsPagination() {
        const { page, totalPages } = this.contributionsData.pagination;
        const paginationDiv = document.getElementById('contributionsPagination');

        if (totalPages <= 1) {
            paginationDiv.style.display = 'none';
            return;
        }

        paginationDiv.style.display = 'flex';
        document.getElementById('contributionsCurrentPage').textContent = page;
        document.getElementById('contributionsTotalPages').textContent = totalPages;

        const prevBtn = document.querySelector('[data-action="contributions-prev-page"]');
        const nextBtn = document.querySelector('[data-action="contributions-next-page"]');

        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= totalPages;
    }

    /**
     * Filter contributions by preset
     */
    filterContributions(filterType) {
        switch (filterType) {
            case 'popular':
                this.contributionsData.filters.minUsage = 5;
                this.contributionsData.filters.sortBy = 'popularity';
                document.getElementById('minUsageFilter').value = '5';
                document.getElementById('sortByContributions').value = 'popularity';
                break;
            case 'recent':
                this.contributionsData.filters.minUsage = 0;
                this.contributionsData.filters.sortBy = 'recent';
                document.getElementById('minUsageFilter').value = '0';
                document.getElementById('sortByContributions').value = 'recent';
                break;
            case 'all':
                this.contributionsData.filters.minUsage = 0;
                this.contributionsData.filters.sortBy = 'popularity';
                document.getElementById('minUsageFilter').value = '0';
                document.getElementById('sortByContributions').value = 'popularity';
                break;
        }

        this.contributionsData.pagination.page = 1;
        this.loadUserFoods();
    }

    /**
     * Change contributions page
     */
    changeContributionsPage(direction) {
        const { page, totalPages } = this.contributionsData.pagination;

        if (direction === 'prev' && page > 1) {
            this.contributionsData.pagination.page--;
            this.loadUserFoods();
        } else if (direction === 'next' && page < totalPages) {
            this.contributionsData.pagination.page++;
            this.loadUserFoods();
        }
    }

    /**
     * Open promote food modal
     */
    async openPromoteFoodModal(foodId) {
        const food = this.contributionsData.foods.find(f => f.id === foodId);
        if (!food) {
            this.notifications.error('Food not found');
            return;
        }

        // Populate modal with food data
        document.getElementById('promoteFoodId').value = food.id;
        document.getElementById('promoteFoodName').value = food.name;
        document.getElementById('promoteFoodCalories').value = Math.round(food.calories_per_100g);
        document.getElementById('promoteFoodBrand').value = food.brand || '';
        document.getElementById('promoteFoodDistributor').value = food.distributor || '';
        
        // Populate nutrition fields if available
        document.getElementById('promoteFoodProtein').value = food.protein_per_100g || '';
        document.getElementById('promoteFoodCarbs').value = food.carbs_per_100g || '';
        document.getElementById('promoteFoodFat').value = food.fat_per_100g || '';
        document.getElementById('promoteFoodFiber').value = food.fiber_per_100g || '';
        document.getElementById('promoteFoodSugar').value = food.sugar_per_100g || '';
        document.getElementById('promoteFoodSodium').value = food.sodium_per_100g || '';
        document.getElementById('promoteFoodDescription').value = food.description || '';
        document.getElementById('promoteFoodBarcode').value = food.barcode || '';
        document.getElementById('promoteAdminNotes').value = '';

        // Show creator info
        document.getElementById('promoteCreatorInfo').textContent = 
            `${food.creator_username} (${food.creator_email})`;
        document.getElementById('promoteUsageInfo').textContent = 
            `${food.times_logged} logs by ${food.unique_users} user${food.unique_users !== 1 ? 's' : ''}`;

        // Show modal
        document.getElementById('promoteFoodModal').style.display = 'flex';
    }

    /**
     * Close promote food modal
     */
    closePromoteFoodModal() {
        document.getElementById('promoteFoodModal').style.display = 'none';
        document.getElementById('promoteFoodForm').reset();
    }

    /**
     * Handle promote food form submission
     */
    async handlePromoteFoodSubmit() {
        const foodId = parseInt(document.getElementById('promoteFoodId').value);
        
        // Collect edited data
        const editedData = {
            name: document.getElementById('promoteFoodName').value.trim(),
            calories_per_100g: parseFloat(document.getElementById('promoteFoodCalories').value),
            brand: document.getElementById('promoteFoodBrand').value.trim() || null,
            distributor: document.getElementById('promoteFoodDistributor').value || null
        };

        // Optional nutrition fields
        const protein = document.getElementById('promoteFoodProtein').value;
        const carbs = document.getElementById('promoteFoodCarbs').value;
        const fat = document.getElementById('promoteFoodFat').value;
        const fiber = document.getElementById('promoteFoodFiber').value;
        const sugar = document.getElementById('promoteFoodSugar').value;
        const sodium = document.getElementById('promoteFoodSodium').value;
        const description = document.getElementById('promoteFoodDescription').value.trim();
        const barcode = document.getElementById('promoteFoodBarcode').value.trim();

        if (protein) editedData.protein_per_100g = parseFloat(protein);
        if (carbs) editedData.carbs_per_100g = parseFloat(carbs);
        if (fat) editedData.fat_per_100g = parseFloat(fat);
        if (fiber) editedData.fiber_per_100g = parseFloat(fiber);
        if (sugar) editedData.sugar_per_100g = parseFloat(sugar);
        if (sodium) editedData.sodium_per_100g = parseFloat(sodium);
        if (description) editedData.description = description;
        if (barcode) editedData.barcode = barcode;

        const notes = document.getElementById('promoteAdminNotes').value.trim();

        try {
            const response = await this.apiCall(
                `/admin/user-foods/${foodId}/promote`,
                'POST',
                { editedData, notes },
                { showSuccess: true, successMessage: `"${editedData.name}" has been promoted to Pios Food DB!` }
            );

            if (response.success) {
                this.closePromoteFoodModal();
                // Reload both contributions data and Pios Food DB
                await this.loadContributionsData();
                await this.loadPiosFoodDB();
            }
        } catch (error) {
            logger.error('Error promoting food:', error);
        }
    }

    /**
     * Reject user food
     */
    async rejectUserFood(foodId, foodName) {
        const reason = prompt(`Why are you rejecting "${foodName}"?`);
        
        if (!reason) return; // User cancelled

        try {
            const response = await this.apiCall(
                `/admin/user-foods/${foodId}/reject`,
                'POST',
                { reason },
                { showSuccess: true, successMessage: `"${foodName}" has been rejected` }
            );

            if (response.success) {
                await this.loadContributionsData();
            }
        } catch (error) {
            logger.error('Error rejecting food:', error);
        }
    }

    /**
     * Delete user food
     */
    async deleteUserFood(foodId, foodName) {
        if (!confirm(`Are you sure you want to permanently delete "${foodName}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            const response = await this.apiCall(
                `/admin/user-foods/${foodId}`,
                'DELETE',
                null,
                { showSuccess: true, successMessage: `"${foodName}" has been deleted` }
            );

            if (response.success) {
                await this.loadContributionsData();
            }
        } catch (error) {
            logger.error('Error deleting food:', error);
        }
    }

    // =============================================================================
    // REWARDS SYSTEM METHODS
    // =============================================================================

    /**
     * Load rewards data and update UI
     */
    async loadRewardsData() {
        if (!this.currentUser) {
            logger.info('No current user, skipping rewards data load');
            return;
        }

        logger.debug('🎮 Loading rewards data for user:', this.currentUser.username);

        try {
            const response = await this.apiCall('/rewards/points', 'GET', null, {
                showError: false, // Don't show errors if rewards system not available
                silent: true
            });
            
            logger.debug('🎮 Raw Rewards API response:', response);
            logger.debug('🎮 response.success:', response?.success);
            logger.debug('🎮 response.points:', response?.points);
            
            if (response && response.success && response.points) {
                logger.debug('🎮 Points data received:', {
                    currentPoints: response.points.currentPoints,
                    lifetimePoints: response.points.lifetimePoints,
                    level: response.points.level,
                    foodMilestone: response.points.foodMilestone,
                    weightMilestone: response.points.weightMilestone
                });
                this.updateRewardsDisplay(response.points);
            } else {
                console.warn('🎮 Rewards API returned no data, showing default state');
                this.showDefaultRewardsState();
            }
        } catch (error) {
            // Silently fail if rewards system is not available
            console.error('🎮 Rewards system error:', error.message, error);
            // Show default state instead of hiding
            this.showDefaultRewardsState();
        }
    }

    /**
     * Show rewards UI with default/placeholder values
     */
    showDefaultRewardsState() {
        logger.info('Showing default rewards state');
        
        // Show header rewards display with default values
        const rewardsDisplay = document.getElementById('rewardsDisplay');
        if (rewardsDisplay) {
            rewardsDisplay.style.display = 'flex';
            document.getElementById('userPoints').textContent = '0';
            document.getElementById('foodMilestoneLevel').textContent = 'Lv1';
            document.getElementById('foodMultiplier').textContent = '1.0x';
            document.getElementById('weightMilestoneLevel').textContent = 'Lv1';
            document.getElementById('weightMultiplier').textContent = '1.0x';
        }

        // Show rewards card with default values
        const rewardsCard = document.getElementById('rewardsCard');
        if (rewardsCard) {
            rewardsCard.style.display = 'block';
            document.getElementById('rewardsCurrentPoints').textContent = '0';
            document.getElementById('rewardsLifetimePoints').textContent = '0';
            document.getElementById('rewardsLevel').textContent = '1';
            
            // Disable daily reward button with placeholder text
            const dailyRewardBtn = document.getElementById('claimDailyRewardBtn');
            if (dailyRewardBtn) {
                dailyRewardBtn.disabled = true;
                dailyRewardBtn.textContent = '🎮 Rewards System Coming Soon';
            }
        }

        // Set default milestone progress
        this.updateMilestoneProgress('food', {
            level: 1,
            multiplier: 1.0,
            currentCount: 0,
            nextLevel: { level: 2, threshold: 10 }
        });

        this.updateMilestoneProgress('weight', {
            level: 1,
            multiplier: 1.0,
            currentCount: 0,
            nextLevel: { level: 2, threshold: 5 }
        });
    }

    /**
     * Update rewards display in header and card
     */
    updateRewardsDisplay(data) {
        logger.debug('🎮 updateRewardsDisplay called with data:', data);
        logger.debug('🎮 currentPoints:', data.currentPoints);
        logger.debug('🎮 lifetimePoints:', data.lifetimePoints);
        logger.debug('🎮 level:', data.level);
        
        const rewardsDisplay = document.getElementById('rewardsDisplay');
        const rewardsCard = document.getElementById('rewardsCard');
        
        if (!rewardsDisplay) {
            console.error('🎮 rewardsDisplay element not found!');
            return;
        }

        // Show rewards display
        rewardsDisplay.style.display = 'flex';
        
        // Show rewards card
        if (rewardsCard) {
            rewardsCard.style.display = 'block';
        } else {
            console.warn('🎮 rewardsCard element not found');
        }

        // Update header badges
        const userPointsEl = document.getElementById('userPoints');
        if (userPointsEl) {
            userPointsEl.textContent = data.currentPoints || 0;
            logger.debug('🎮 Updated userPoints to:', data.currentPoints);
        } else {
            console.error('🎮 userPoints element not found!');
        }
        
        // Update food milestone
        if (data.foodMilestone) {
            const foodLevelEl = document.getElementById('foodMilestoneLevel');
            const foodMultiplierEl = document.getElementById('foodMultiplier');
            if (foodLevelEl) foodLevelEl.textContent = `Lv${data.foodMilestone.level}`;
            if (foodMultiplierEl) foodMultiplierEl.textContent = `${data.foodMilestone.multiplier.toFixed(1)}x`;
            logger.debug('🎮 Updated food milestone to Level', data.foodMilestone.level);
        }
        
        // Update weight milestone
        if (data.weightMilestone) {
            const weightLevelEl = document.getElementById('weightMilestoneLevel');
            const weightMultiplierEl = document.getElementById('weightMultiplier');
            if (weightLevelEl) weightLevelEl.textContent = `Lv${data.weightMilestone.level}`;
            if (weightMultiplierEl) weightMultiplierEl.textContent = `${data.weightMilestone.multiplier.toFixed(1)}x`;
            logger.debug('🎮 Updated weight milestone to Level', data.weightMilestone.level);
        }

        // Update rewards card stats (note: using correct IDs from HTML)
        const currentPointsEl = document.getElementById('rewardsCurrentPoints');
        const lifetimePointsEl = document.getElementById('rewardsLifetimePoints');
        const userLevelEl = document.getElementById('rewardsLevel');
        
        if (currentPointsEl) {
            currentPointsEl.textContent = data.currentPoints || 0;
            logger.debug('🎮 Updated rewardsCurrentPoints to:', data.currentPoints);
        } else {
            console.error('🎮 rewardsCurrentPoints element not found!');
        }
        
        if (lifetimePointsEl) {
            lifetimePointsEl.textContent = data.lifetimePoints || 0;
            logger.debug('🎮 Updated rewardsLifetimePoints to:', data.lifetimePoints);
        } else {
            console.error('🎮 rewardsLifetimePoints element not found!');
        }
        
        if (userLevelEl) {
            userLevelEl.textContent = data.level?.currentLevel || data.level || 1;
            logger.debug('🎮 Updated rewardsLevel to:', data.level);
        } else {
            console.error('🎮 rewardsLevel element not found!');
        }

        // Update milestone details
        if (data.foodMilestone) {
            this.updateMilestoneProgress('food', data.foodMilestone);
        }
        if (data.weightMilestone) {
            this.updateMilestoneProgress('weight', data.weightMilestone);
        }

        // Update daily reward button
        const dailyRewardBtn = document.getElementById('claimDailyRewardBtn');
        if (dailyRewardBtn) {
            if (data.dailyRewardAvailable) {
                dailyRewardBtn.disabled = false;
                dailyRewardBtn.textContent = '🎁 Claim Daily Reward (+100 pts)';
            } else {
                dailyRewardBtn.disabled = true;
                dailyRewardBtn.textContent = '✓ Daily Reward Claimed';
            }
        }
        
        logger.info('Rewards display updated successfully');
    }

    /**
     * Update milestone progress display
     */
    updateMilestoneProgress(type, milestone) {
        const levelElement = document.getElementById(`${type}MilestoneDetailLevel`);
        const multiplierElement = document.getElementById(`${type}MilestoneMultiplierDetail`);
        const pointsElement = document.getElementById(`${type}PointsPerLog`);
        const progressBar = document.getElementById(`${type}MilestoneProgress`);
        const logsUntilNext = document.getElementById(`${type}LogsUntilNext`);
        const nextLevelElement = document.getElementById(`${type}NextLevel`);

        if (levelElement) levelElement.textContent = milestone.level;
        if (multiplierElement) multiplierElement.textContent = `${milestone.multiplier.toFixed(1)}x`;
        
        // Calculate points per log based on type
        const basePoints = type === 'food' ? 50 : 150;
        const earnedPoints = Math.round(basePoints * milestone.multiplier);
        if (pointsElement) pointsElement.textContent = earnedPoints;

        // Update progress bar
        if (progressBar && milestone.nextLevel) {
            const progress = (milestone.currentCount / milestone.nextLevel.threshold) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Update logs until next level
        if (logsUntilNext && nextLevelElement && milestone.nextLevel) {
            const remaining = milestone.nextLevel.threshold - milestone.currentCount;
            logsUntilNext.textContent = remaining;
            nextLevelElement.textContent = milestone.nextLevel.level;
        } else if (logsUntilNext) {
            // Max level reached
            logsUntilNext.parentElement.textContent = '🏆 Max Level Reached!';
        }
    }

    /**
     * Show points earned toast notification
     */
    showPointsToast(pointsData) {
        const toast = document.createElement('div');
        toast.className = 'points-toast';

        let breakdownHTML = '';
        
        // Handle both old format (breakdown object) and new format (array of pointsDetails)
        if (pointsData.breakdown) {
            if (Array.isArray(pointsData.breakdown)) {
                // New format: array of {reason, points, basePoints, multiplier, newLevel, etc.}
                breakdownHTML = '<div class="points-toast-breakdown">';
                pointsData.breakdown.forEach(detail => {
                    let itemText = '';
                    if (detail.reason === 'food_log') {
                        itemText = `${detail.basePoints || detail.points} base points`;
                        if (detail.multiplier && detail.multiplier > 1.0) {
                            itemText += ` × ${detail.multiplier.toFixed(1)}`;
                        }
                    } else if (detail.reason === 'complete_day') {
                        itemText = `🎯 Complete day bonus: +${detail.points}`;
                    } else if (detail.reason === 'early_bird') {
                        itemText = `🌅 Early bird bonus: +${detail.points}`;
                    } else if (detail.reason === 'first_food_log') {
                        itemText = `🏆 First food log: +${detail.points}`;
                    } else if (detail.reason === 'milestone_level_up') {
                        itemText = `⭐ Level ${detail.newLevel || ''} bonus: +${detail.points}`;
                    } else {
                        itemText = `+${detail.points} ${detail.reason.replace(/_/g, ' ')}`;
                    }
                    breakdownHTML += `<div class="points-toast-item">${itemText}</div>`;
                });
                breakdownHTML += '</div>';
            } else {
                // Old format: {base, multiplier, bonus}
                breakdownHTML = `
                    <div class="points-toast-breakdown">
                        <div class="points-toast-item">${pointsData.breakdown.base} base points</div>
                        ${pointsData.breakdown.multiplier ? `<div class="points-toast-item">× ${pointsData.breakdown.multiplier.toFixed(1)} multiplier</div>` : ''}
                        ${pointsData.breakdown.bonus ? `<div class="points-toast-item">+ ${pointsData.breakdown.bonus} bonus</div>` : ''}
                    </div>
                `;
            }
        }

        toast.innerHTML = `
            <div class="points-toast-header">⭐ +${pointsData.total} Points!</div>
            <div class="points-toast-details">${pointsData.reason || 'Points earned'}</div>
            ${breakdownHTML}
        `;

        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove toast after animation
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3500);
    }

    /**
     * Show level-up celebration
     */
    showLevelUpCelebration(levelData) {
        const celebration = document.createElement('div');
        celebration.className = 'level-up-celebration';

        celebration.innerHTML = `
            <div class="level-up-icon">${levelData.icon || '🎉'}</div>
            <div class="level-up-title">Level Up!</div>
            <div class="level-up-message">${levelData.message}</div>
            ${levelData.bonus ? `<div class="level-up-bonus">+${levelData.bonus} Bonus Points!</div>` : ''}
            ${levelData.multiplier ? `<div class="level-up-multiplier">New multiplier: ${levelData.multiplier.toFixed(1)}×</div>` : ''}
        `;

        document.body.appendChild(celebration);
        
        // Trigger animation
        setTimeout(() => celebration.classList.add('show'), 10);

        // Remove celebration after 3 seconds
        setTimeout(() => {
            celebration.classList.remove('show');
            setTimeout(() => {
                if (celebration.parentNode) {
                    celebration.parentNode.removeChild(celebration);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Claim daily reward
     */
    async claimDailyReward() {
        try {
            const response = await this.apiCall('/rewards/daily-reward', 'POST');
            if (response.success) {
                this.showPointsToast({
                    total: response.data.pointsAwarded,
                    reason: 'Daily reward claimed!',
                    breakdown: {
                        base: response.data.pointsAwarded,
                        multiplier: null,
                        bonus: response.data.streakBonus || 0
                    }
                });

                // Reload rewards data
                await this.loadRewardsData();
            }
        } catch (error) {
            logger.error('Error claiming daily reward:', error);
            this.notifications.error('Failed to claim daily reward');
        }
    }

    /**
     * Load and display shop items
     */
    async loadShopItems(category = null) {
        try {
            const endpoint = category ? `/rewards/shop?category=${category}` : '/rewards/shop';
            const response = await this.apiCall(endpoint);
            
            if (response.success) {
                // Get user's current points for balance display
                const userBalance = await this.getCurrentPoints();
                this.renderShopItems(response.items, userBalance, response.userLevel);
            }
        } catch (error) {
            logger.error('Error loading shop items:', error);
            const shopGrid = document.getElementById('shopItemsGrid');
            if (shopGrid) {
                shopGrid.innerHTML = '<p class="error">Failed to load shop items. Please try again.</p>';
            }
        }
    }

    /**
     * Get user's current points
     */
    async getCurrentPoints() {
        try {
            const response = await this.apiCall('/rewards/points');
            return response.success ? response.points.currentPoints : 0;
        } catch (error) {
            console.error('Error getting current points:', error);
            return 0;
        }
    }

    /**
     * Render shop items in grid
     */
    renderShopItems(items, balance, userLevel = 1) {
        const shopGrid = document.getElementById('shopItemsGrid');
        const balanceElement = document.getElementById('shopUserPoints');
        
        if (!shopGrid) return;

        // Update balance
        if (balanceElement) {
            balanceElement.textContent = balance;
        }

        // Clear existing items
        shopGrid.innerHTML = '';

        if (!items || items.length === 0) {
            shopGrid.innerHTML = '<p class="no-items">No items available in this category.</p>';
            return;
        }

        // Render each item
        items.forEach(item => {
            const itemElement = this.createShopItemElement(item, balance, userLevel);
            shopGrid.appendChild(itemElement);
        });
    }

    /**
     * Create shop item DOM element
     */
    createShopItemElement(item, userBalance, userLevel = 1) {
        const div = document.createElement('div');
        div.className = 'shop-item';
        
        // Check if item can be purchased
        const canAfford = userBalance >= item.cost_points;
        const meetsLevel = !item.required_level || userLevel >= item.required_level;
        const alreadyOwned = item.already_owned || false;
        const canPurchase = item.can_purchase && canAfford && meetsLevel && !alreadyOwned;

        // Add status classes
        if (alreadyOwned) {
            div.classList.add('owned');
        } else if (!meetsLevel) {
            div.classList.add('locked');
        } else if (!canAfford) {
            div.classList.add('insufficient-points');
        }

        div.innerHTML = `
            <div class="shop-item-header">
                <div class="shop-item-icon">${this.getCategoryIcon(item.category)}</div>
                <div class="shop-item-info">
                    <h4 class="shop-item-name">${item.name}</h4>
                    <span class="shop-item-category">${item.category}</span>
                </div>
            </div>
            <p class="shop-item-description">${item.description}</p>
            <div class="shop-item-footer">
                <div class="shop-item-cost">
                    <span class="cost-amount">${item.cost_points}</span> ⭐
                </div>
                <div class="shop-item-actions">
                    ${item.required_level > 1 ? `<span class="level-req">Lvl ${item.required_level}</span>` : ''}
                    ${alreadyOwned 
                        ? '<span class="status-badge owned">✓ Owned</span>' 
                        : !meetsLevel 
                            ? '<span class="status-badge locked">🔒 Locked</span>'
                            : !canAfford
                                ? '<span class="status-badge insufficient">Insufficient Points</span>'
                                : '<button class="btn btn-sm btn-primary">Purchase</button>'
                    }
                </div>
            </div>
        `;

        // Add click handler for purchase
        if (canPurchase && !alreadyOwned) {
            const purchaseBtn = div.querySelector('.btn-primary');
            if (purchaseBtn) {
                purchaseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showPurchaseConfirmation(item, userBalance);
                });
            }
        }

        return div;
    }

    /**
     * Get emoji icon for category
     */
    getCategoryIcon(category) {
        const icons = {
            'theme': '🎨',
            'badge': '🏆',
            'feature': '⚡',
            'avatar': '👤',
            'powerup': '💪',
            'challenge': '🎯'
        };
        return icons[category] || '🎁';
    }

    /**
     * Show purchase confirmation modal
     */
    showPurchaseConfirmation(item, currentBalance) {
        const modal = document.getElementById('purchaseConfirmModal');
        if (!modal) return;

        // Update modal content
        const nameEl = document.getElementById('purchaseItemName');
        const costEl = document.getElementById('purchaseItemCost');
        const descEl = document.getElementById('purchaseItemDescription');
        const balanceEl = document.getElementById('purchaseRemainingBalance');
        
        if (nameEl) nameEl.textContent = item.name;
        if (costEl) costEl.textContent = item.cost_points;
        if (descEl) descEl.textContent = item.description;

        // Calculate remaining balance
        const remainingBalance = currentBalance - item.cost_points;
        if (balanceEl) balanceEl.textContent = remainingBalance;

        // Set up purchase button
        const purchaseBtn = document.getElementById('confirmPurchaseBtn');
        if (purchaseBtn) {
            // Remove old event listeners by cloning
            const newBtn = purchaseBtn.cloneNode(true);
            purchaseBtn.parentNode.replaceChild(newBtn, purchaseBtn);
            
            newBtn.onclick = () => this.purchaseItem(item.id);
        }

        // Show modal
        modal.style.display = 'flex';
    }

    /**
     * Purchase shop item
     */
    async purchaseItem(itemId) {
        try {
            const response = await this.apiCall(`/rewards/shop/${itemId}/purchase`, 'POST');
            
            if (response.success) {
                // Show success notification
                this.notifications.success(`Successfully purchased ${response.item.name}!`);
                
                // Close modals
                const confirmModal = document.getElementById('purchaseConfirmModal');
                if (confirmModal) confirmModal.style.display = 'none';
                
                // Reload shop and rewards data
                await this.loadShopItems();
                await this.loadRewardsData();
                
                // Show points updated toast
                showPointsToast({
                    pointsAwarded: -response.pointsSpent,
                    pointsDetails: {
                        purchase: -response.pointsSpent
                    },
                    newBalance: response.remainingPoints
                });
            }
        } catch (error) {
            logger.error('Error purchasing item:', error);
            this.notifications.error(error.message || 'Failed to purchase item');
        }
    }

    /**
     * Load and display leaderboard
     */
    async loadLeaderboard(timeframe = 'all-time') {
        try {
            const leaderboardTable = document.getElementById('leaderboardTable');
            if (leaderboardTable) {
                leaderboardTable.innerHTML = '<p class="loading">Loading leaderboard...</p>';
            }

            const response = await this.apiCall(`/rewards/leaderboard?limit=100`);
            
            if (response.success) {
                this.renderLeaderboard(response.leaderboard, response.myRank);
            }
        } catch (error) {
            logger.error('Error loading leaderboard:', error);
            const leaderboardTable = document.getElementById('leaderboardTable');
            if (leaderboardTable) {
                leaderboardTable.innerHTML = '<p class="error">Failed to load leaderboard. Please try again.</p>';
            }
        }
    }

    /**
     * Render leaderboard table
     */
    renderLeaderboard(leaderboard, myRank) {
        const container = document.getElementById('leaderboardTable');
        if (!container) return;

        if (!leaderboard || leaderboard.length === 0) {
            container.innerHTML = '<p class="no-data">No leaderboard data available yet.</p>';
            return;
        }

        // Create table
        const table = document.createElement('table');
        table.className = 'leaderboard-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Current Points</th>
                    <th>Lifetime Points</th>
                    <th>Level</th>
                    <th>Streak</th>
                </tr>
            </thead>
            <tbody id="leaderboardTableBody"></tbody>
        `;

        container.innerHTML = '';
        container.appendChild(table);

        const tbody = document.getElementById('leaderboardTableBody');

        leaderboard.forEach((entry, index) => {
            const row = document.createElement('tr');
            const isCurrentUser = myRank && entry.user_id === myRank.user_id;
            
            if (isCurrentUser) {
                row.classList.add('my-rank');
            }

            const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';

            row.innerHTML = `
                <td class="leaderboard-rank ${rankClass}">${index + 1}</td>
                <td class="leaderboard-username">${entry.username}${isCurrentUser ? ' <span class="you-badge">(You)</span>' : ''}</td>
                <td class="leaderboard-points">${entry.current_points.toLocaleString()}</td>
                <td class="leaderboard-lifetime">${entry.lifetime_points.toLocaleString()}</td>
                <td class="leaderboard-level">${entry.level}</td>
                <td class="leaderboard-streak">${entry.current_streak || 0}</td>
            `;

            tbody.appendChild(row);
        });
    }

    /**
     * Load and display achievements
     */
    async loadAchievements() {
        try {
            const achievementsGrid = document.getElementById('achievementsGrid');
            if (achievementsGrid) {
                achievementsGrid.innerHTML = '<p class="loading">Loading achievements...</p>';
            }

            const response = await this.apiCall('/rewards/achievements');
            
            if (response.success) {
                this.renderAchievements(response.achievements, response.totalAchievements);
            }
        } catch (error) {
            logger.error('Error loading achievements:', error);
            const achievementsGrid = document.getElementById('achievementsGrid');
            if (achievementsGrid) {
                achievementsGrid.innerHTML = '<p class="error">Failed to load achievements. Please try again.</p>';
            }
        }
    }

    /**
     * Render achievements grid
     */
    renderAchievements(achievements, totalCount) {
        const grid = document.getElementById('achievementsGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (!achievements || achievements.length === 0) {
            grid.innerHTML = '<p class="no-data">No achievements unlocked yet. Keep logging to earn your first achievement!</p>';
            return;
        }

        // Add summary header
        const summary = document.createElement('div');
        summary.className = 'achievements-summary';
        summary.innerHTML = `<h4>🏆 ${totalCount} Achievement${totalCount !== 1 ? 's' : ''} Unlocked</h4>`;
        grid.appendChild(summary);

        // Render each achievement
        achievements.forEach(achievement => {
            const achievementElement = this.createAchievementElement(achievement);
            grid.appendChild(achievementElement);
        });
    }

    /**
     * Create achievement DOM element
     */
    createAchievementElement(achievement) {
        const div = document.createElement('div');
        div.className = 'achievement-item unlocked';
        
        const unlockedDate = new Date(achievement.unlocked_at);
        const formattedDate = unlockedDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        div.innerHTML = `
            <div class="achievement-icon">${achievement.achievement_icon || '🏆'}</div>
            <div class="achievement-details">
                <h4 class="achievement-name">${achievement.achievement_name}</h4>
                <p class="achievement-description">${achievement.achievement_description || ''}</p>
                <div class="achievement-footer">
                    <span class="achievement-points">+${achievement.points_awarded} points</span>
                    <span class="achievement-date">Unlocked: ${formattedDate}</span>
                </div>
            </div>
        `;

        return div;
    }

    /**
     * Toggle rewards details section
     */
    toggleRewardsDetails() {
        const details = document.getElementById('rewardsDetails');
        const toggleBtn = document.getElementById('toggleRewardsBtn');
        const btnText = document.getElementById('rewardsBtnText');
        
        if (!details) {
            logger.error('rewardsDetails element not found');
            return;
        }

        const isHidden = details.style.display === 'none' || !details.style.display;
        details.style.display = isHidden ? 'block' : 'none';
        
        if (btnText) {
            btnText.textContent = isHidden ? 'Hide Details' : 'Show Details';
        } else if (toggleBtn) {
            toggleBtn.textContent = isHidden ? '▲ Hide Details' : '▼ Show Details';
        }
    }

    /**
     * Show rewards shop modal
     */
    showRewardsShop() {
        // Show "Coming Soon" notification
        this.notifications.info('🛍️ Rewards Shop is coming soon! We\'re working hard to bring you awesome rewards.', {
            duration: 5000
        });
        
        // TODO: Uncomment when shop is ready
        // const modal = document.getElementById('rewardsShopModal');
        // if (modal) {
        //     modal.style.display = 'flex';
        //     this.loadShopItems();
        // }
    }

    /**
     * Show leaderboard modal
     */
    showLeaderboard() {
        // Show "Coming Soon" notification
        this.notifications.info('🏆 Leaderboard is under development! Soon you\'ll be able to compete with other users.', {
            duration: 5000
        });
        
        // TODO: Uncomment when leaderboard is ready
        // const modal = document.getElementById('leaderboardModal');
        // if (modal) {
        //     modal.style.display = 'flex';
        //     this.loadLeaderboard();
        // }
    }

    /**
     * Show achievements modal
     */
    showAchievements() {
        // Show "Coming Soon" notification
        this.notifications.info('🏅 Achievements system is coming soon! Get ready to unlock badges and rewards.', {
            duration: 5000
        });
        
        // TODO: Uncomment when achievements are ready
        // const modal = document.getElementById('achievementsModal');
        // if (modal) {
        //     modal.style.display = 'flex';
        //     this.loadAchievements();
        // }
    }

    /**
     * Filter shop items by category
     */
    filterShopByCategory(category) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });

        // Load filtered items
        this.loadShopItems(category === 'all' ? null : category);
    }
    
    // =========================================================================
    // USER MANAGEMENT FUNCTIONS
    // =========================================================================
    
    /**
     * Show Create User Modal (Admin Only)
     */
    showCreateUserModal() {
        const modal = document.getElementById('createUserModal');
        if (modal) {
            // Reset form
            document.getElementById('createUserForm').reset();
            document.getElementById('newUserCalorieGoal').value = 2200;
            
            // Clear all error messages
            document.querySelectorAll('#createUserForm .error-message').forEach(el => el.textContent = '');
            
            // Show modal
            modal.style.display = 'flex';
        }
    }
    
    /**
     * Close Create User Modal
     */
    closeCreateUserModal() {
        const modal = document.getElementById('createUserModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Handle Create User Form Submission
     */
    async handleCreateUser() {
        // Get form values
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const confirmPassword = document.getElementById('newUserPasswordConfirm').value;
        const email = document.getElementById('newUserEmail').value.trim();
        const dailyCalorieGoal = parseInt(document.getElementById('newUserCalorieGoal').value) || 2200;
        
        // Clear previous errors
        document.querySelectorAll('#createUserForm .error-message').forEach(el => el.textContent = '');
        
        // Validation
        let hasError = false;
        
        if (!username || username.length < 3) {
            document.getElementById('newUsernameError').textContent = 'Username must be at least 3 characters';
            hasError = true;
        }
        
        if (!password || password.length < 6) {
            document.getElementById('newUserPasswordError').textContent = 'Password must be at least 6 characters';
            hasError = true;
        }
        
        if (password !== confirmPassword) {
            document.getElementById('newUserPasswordConfirmError').textContent = 'Passwords do not match';
            hasError = true;
        }
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('newUserEmailError').textContent = 'Invalid email format';
            hasError = true;
        }
        
        if (dailyCalorieGoal < 1000 || dailyCalorieGoal > 5000) {
            document.getElementById('newUserCalorieGoalError').textContent = 'Must be between 1000 and 5000';
            hasError = true;
        }
        
        if (hasError) return;
        
        // Disable submit button
        const submitBtn = document.getElementById('createUserSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        try {
            const response = await this.apiCall('/admin/users', 'POST', {
                username,
                password,
                email: email || undefined,
                dailyCalorieGoal
            });
            
            if (response.success) {
                this.notifications.success(`User created successfully!\n\nUsername: ${response.user.username}\nID: ${response.user.id}`);
                
                // Close modal
                this.closeCreateUserModal();
                
                // Refresh user list
                await this.loadAdminUsers();
            } else {
                this.notifications.error(`Failed to create user: ${response.error || response.message}`);
            }
        } catch (error) {
            console.error('Create user error:', error);
            this.notifications.error('Failed to create user. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create User';
        }
    }
    
    /**
     * Show Change Password Modal (also shows profile info)
     */
    showChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            // Reset form
            document.getElementById('changePasswordForm').reset();
            
            // Clear all error messages
            document.querySelectorAll('#changePasswordForm .error-message').forEach(el => el.textContent = '');
            
            // Reset requirements
            document.querySelectorAll('#passwordRequirements li').forEach(li => li.classList.remove('met'));

            // Populate profile fields
            const emailInput = document.getElementById('profileEmail');
            const memberSinceEl = document.getElementById('profileMemberSince');
            if (emailInput && this.currentUser) {
                emailInput.value = this.currentUser.email || '';
            }
            if (memberSinceEl && this.currentUser?.createdAt) {
                memberSinceEl.textContent = new Date(this.currentUser.createdAt).toLocaleDateString();
            }
            
            // Show modal
            modal.style.display = 'flex';
        }
    }
    
    /**
     * Close Change Password Modal
     */
    closeChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    /**
     * Update password requirements checklist
     */
    updatePasswordRequirements() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        
        // Check length requirement
        const lengthReq = document.getElementById('req-length');
        if (newPassword.length >= 6) {
            lengthReq.classList.add('met');
        } else {
            lengthReq.classList.remove('met');
        }
        
        // Check different from current
        const differentReq = document.getElementById('req-different');
        if (newPassword && currentPassword && newPassword !== currentPassword) {
            differentReq.classList.add('met');
        } else {
            differentReq.classList.remove('met');
        }
        
        // Check passwords match
        const matchReq = document.getElementById('req-match');
        if (newPassword && confirmNewPassword && newPassword === confirmNewPassword) {
            matchReq.classList.add('met');
        } else {
            matchReq.classList.remove('met');
        }
    }
    
    /**
     * Handle Change Password Form Submission
     */
    async handleChangePassword() {
        // Get form values
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        // Clear previous errors
        document.querySelectorAll('#changePasswordForm .error-message').forEach(el => el.textContent = '');
        
        // Validation
        let hasError = false;
        
        if (!currentPassword) {
            document.getElementById('currentPasswordError').textContent = 'Current password is required';
            hasError = true;
        }
        
        if (!newPassword || newPassword.length < 6) {
            document.getElementById('newPasswordError').textContent = 'New password must be at least 6 characters';
            hasError = true;
        }
        
        if (newPassword !== confirmPassword) {
            document.getElementById('confirmNewPasswordError').textContent = 'Passwords do not match';
            hasError = true;
        }
        
        if (currentPassword === newPassword) {
            document.getElementById('newPasswordError').textContent = 'New password must be different from current password';
            hasError = true;
        }
        
        if (hasError) return;
        
        // Disable submit button
        const submitBtn = document.getElementById('changePasswordSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Changing Password...';
        
        try {
            const response = await this.apiCall('/user/change-password', 'PUT', {
                currentPassword,
                newPassword,
                confirmPassword
            });
            
            if (response.success) {
                this.notifications.success('Password changed successfully!');
                
                // Close modal
                this.closeChangePasswordModal();
            } else {
                this.notifications.error(response.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Change password error:', error);
            this.notifications.error('Failed to change password. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
        }
    }

    /**
     * Admin Change Password Modal Functions
     */
    
    showAdminChangePasswordModal(userId) {
        const user = this.adminData.users.find(u => u.id === userId);
        if (!user) return;
        
        // Store current user ID for form submission
        this.currentEditUserId = userId;
        
        const modal = document.getElementById('adminChangePasswordModal');
        const usernameSpan = document.getElementById('adminPasswordUsername');
        
        if (modal && usernameSpan) {
            // Set username in modal
            usernameSpan.textContent = user.username;
            
            // Reset form
            document.getElementById('adminChangePasswordForm').reset();
            
            // Clear error messages
            document.querySelectorAll('#adminChangePasswordForm .error-message').forEach(el => el.textContent = '');
            
            // Reset requirements
            document.querySelectorAll('#adminPasswordRequirements li').forEach(li => li.classList.remove('met'));
            
            // Show modal
            modal.style.display = 'flex';
        }
    }
    
    closeAdminChangePasswordModal() {
        const modal = document.getElementById('adminChangePasswordModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentEditUserId = null;
    }
    
    updateAdminPasswordRequirements() {
        const newPassword = document.getElementById('adminNewPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;
        
        // Check length
        const lengthReq = document.getElementById('admin-req-length');
        if (lengthReq) {
            if (newPassword.length >= 6) {
                lengthReq.classList.add('met');
            } else {
                lengthReq.classList.remove('met');
            }
        }
        
        // Check if passwords match
        const matchReq = document.getElementById('admin-req-match');
        if (matchReq) {
            if (newPassword && confirmPassword && newPassword === confirmPassword) {
                matchReq.classList.add('met');
            } else {
                matchReq.classList.remove('met');
            }
        }
    }
    
    async handleAdminChangePassword() {
        if (!this.currentEditUserId) return;
        
        const newPassword = document.getElementById('adminNewPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;
        
        // Clear previous errors
        document.querySelectorAll('#adminChangePasswordForm .error-message').forEach(el => el.textContent = '');
        
        // Validation
        let hasError = false;
        
        if (!newPassword || newPassword.length < 6) {
            document.getElementById('adminNewPasswordError').textContent = 'Password must be at least 6 characters';
            hasError = true;
        }
        
        if (newPassword !== confirmPassword) {
            document.getElementById('adminConfirmPasswordError').textContent = 'Passwords do not match';
            hasError = true;
        }
        
        if (hasError) return;
        
        // Disable submit button
        const submitBtn = document.getElementById('adminChangePasswordSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Changing Password...';
        
        try {
            const response = await this.apiCall(`/admin/users/${this.currentEditUserId}/change-password`, 'PUT', {
                newPassword
            });
            
            if (response.success) {
                this.notifications.success('User password changed successfully!');
                this.closeAdminChangePasswordModal();
            } else {
                this.notifications.error(response.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Admin change password error:', error);
            this.notifications.error('Failed to change password. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
        }
    }

    /**
     * Edit User Modal Functions
     */
    
    showEditUserModal(userId) {
        const user = this.adminData.users.find(u => u.id === userId);
        if (!user) return;
        
        // Store current user ID for form submission
        this.currentEditUserId = userId;
        
        const modal = document.getElementById('editUserModal');
        if (modal) {
            // Pre-fill form with current values
            document.getElementById('editUsername').value = user.username;
            document.getElementById('editEmail').value = user.email || '';
            document.getElementById('editCalorieGoal').value = user.dailyCalorieGoal || 2200;
            
            // Clear error messages
            document.querySelectorAll('#editUserForm .error-message').forEach(el => el.textContent = '');
            
            // Show modal
            modal.style.display = 'flex';
        }
    }
    
    closeEditUserModal() {
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentEditUserId = null;
    }
    
    async handleEditUser() {
        if (!this.currentEditUserId) return;
        
        const username = document.getElementById('editUsername').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const dailyCalorieGoal = parseInt(document.getElementById('editCalorieGoal').value) || 2200;
        
        // Clear previous errors
        document.querySelectorAll('#editUserForm .error-message').forEach(el => el.textContent = '');
        
        // Validation
        let hasError = false;
        
        if (!username || username.length < 3) {
            document.getElementById('editUsernameError').textContent = 'Username must be at least 3 characters';
            hasError = true;
        }
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('editEmailError').textContent = 'Invalid email format';
            hasError = true;
        }
        
        if (dailyCalorieGoal < 1000 || dailyCalorieGoal > 5000) {
            document.getElementById('editCalorieGoalError').textContent = 'Must be between 1000 and 5000';
            hasError = true;
        }
        
        if (hasError) return;
        
        // Disable submit button
        const submitBtn = document.getElementById('editUserSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        try {
            const response = await this.apiCall(`/admin/users/${this.currentEditUserId}`, 'PUT', {
                username,
                email: email || undefined,
                dailyCalorieGoal
            });
            
            if (response.success) {
                this.notifications.success('User updated successfully!');
                this.closeEditUserModal();
                await this.loadAdminUsers(); // Refresh the list
            } else {
                this.notifications.error(response.error || 'Failed to update user');
            }
        } catch (error) {
            console.error('Edit user error:', error);
            this.notifications.error('Failed to update user. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    }

    // =============================================================================
    // USER PROFILE
    // =============================================================================

    /**
     * Load full user profile (email, createdAt) and merge into currentUser
     */
    async loadUserProfile() {
        if (!this.isOnline || !this.authToken) return;
        try {
            const response = await this.apiCall('/user/profile', 'GET', null, { silent: true });
            if (response.success && response.user) {
                this.currentUser = { ...this.currentUser, ...response.user };
            }
        } catch (error) {
            logger.debug('Could not load user profile:', error);
        }
    }

    /**
     * Save updated email via PUT /user/profile
     */
    async handleUpdateEmail() {
        const emailInput = document.getElementById('profileEmail');
        if (!emailInput) return;
        const email = emailInput.value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.notifications.error('Please enter a valid email address');
            return;
        }
        try {
            const response = await this.apiCall('/user/profile', 'PUT',
                { email: email || null },
                { showSuccess: true, successMessage: 'Email updated successfully' }
            );
            if (response.success && this.currentUser) {
                this.currentUser.email = email || null;
            }
        } catch (error) {
            this.notifications.error('Failed to update email');
        }
    }

    // =============================================================================
    // 30-DAY STATS & WEEKLY BREAKDOWN
    // =============================================================================

    /**
     * Load user stats + weekly data and render the stats section
     */
    async loadUserStats() {
        if (!this.isOnline || CONFIG.DEVELOPMENT_MODE) return;
        try {
            const [statsResponse, weeklyResponse] = await Promise.all([
                this.apiCall('/user/stats', 'GET', null, { silent: true }),
                this.apiCall('/logs/weekly', 'GET', null, { silent: true })
            ]);

            const statsSection = document.getElementById('statsSection');
            if (!statsSection) return;
            statsSection.style.display = 'block';

            // Populate 30-day summary tiles
            if (statsResponse.success && statsResponse.stats) {
                const s = statsResponse.stats;
                document.getElementById('statsAvgCalories').textContent =
                    s.averageCaloriesPerDay.toLocaleString();
                document.getElementById('statsGoalRate').textContent =
                    `${s.goalAchievementRate}%`;
                document.getElementById('statsDaysLogged').textContent =
                    `${s.totalDays} / 30`;
            }

            // Populate weekly breakdown
            if (weeklyResponse.success && weeklyResponse.weeklyData) {
                this.renderWeeklyBreakdown(weeklyResponse.weeklyData);
            }
        } catch (error) {
            logger.debug('Could not load stats:', error);
        }
    }

    /**
     * Render the weekly-day breakdown list
     */
    renderWeeklyBreakdown(weeklyData) {
        const container = document.getElementById('weeklyBreakdown');
        if (!container) return;

        if (!weeklyData || weeklyData.length === 0) {
            container.innerHTML = '<p class="empty-message">No data for this week yet.</p>';
            return;
        }

        const goal = this.calorieGoal;
        container.innerHTML = weeklyData.map(day => {
            const calories = Math.round(parseFloat(day.total_calories || 0));
            const dateObj = new Date(day.log_date || day.date);
            const label = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            const pct = goal > 0 ? Math.min(Math.round((calories / goal) * 100), 100) : 0;
            const statusClass = calories === 0 ? 'no-data' : (calories >= goal * 0.9 && calories <= goal * 1.1 ? 'goal-met' : 'goal-missed');
            return `
                <div class="weekly-day ${statusClass}">
                    <span class="weekly-day-label">${label}</span>
                    <div class="weekly-day-bar-wrap">
                        <div class="weekly-day-bar" style="width:${pct}%"></div>
                    </div>
                    <span class="weekly-day-kcal">${calories > 0 ? calories.toLocaleString() + ' kcal' : '—'}</span>
                </div>`;
        }).join('');
    }

    // =============================================================================
    // MONTHLY CALENDAR
    // =============================================================================

    /**
     * Toggle the monthly calendar card
     */
    toggleCalendar() {
        const content = document.getElementById('calendarContent');
        const btnText = document.getElementById('calendarBtnText');
        if (!content) return;

        this.calendarState.isExpanded = !this.calendarState.isExpanded;

        if (this.calendarState.isExpanded) {
            content.style.display = 'block';
            btnText.textContent = 'Hide Calendar';
            this.loadCalendar(this.calendarState.year, this.calendarState.month);
        } else {
            content.style.display = 'none';
            btnText.textContent = 'Show Calendar';
        }
    }

    /**
     * Navigate to previous/next month
     */
    navigateCalendar(direction) {
        this.calendarState.month += direction;
        if (this.calendarState.month > 12) { this.calendarState.month = 1; this.calendarState.year++; }
        if (this.calendarState.month < 1)  { this.calendarState.month = 12; this.calendarState.year--; }
        this.loadCalendar(this.calendarState.year, this.calendarState.month);
    }

    /**
     * Fetch calendar data from backend and render grid
     */
    async loadCalendar(year, month) {
        const grid = document.getElementById('calendarGrid');
        const label = document.getElementById('calendarMonthLabel');
        if (!grid) return;

        const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        if (label) label.textContent = monthName;

        grid.innerHTML = '<p class="loading">Loading…</p>';

        if (!this.isOnline || CONFIG.DEVELOPMENT_MODE) {
            grid.innerHTML = '<p class="empty-message">Calendar requires an online connection.</p>';
            return;
        }

        try {
            const response = await this.apiCall(
                `/logs/calendar?year=${year}&month=${month}`,
                'GET', null, { silent: true }
            );
            if (response.success && response.calendar) {
                this.renderCalendarGrid(response.calendar, year, month);
            } else {
                grid.innerHTML = '<p class="empty-message">No data available.</p>';
            }
        } catch (error) {
            logger.error('Failed to load calendar:', error);
            grid.innerHTML = '<p class="empty-message">Could not load calendar data.</p>';
        }
    }

    /**
     * Render the calendar grid from the day-array returned by the backend
     */
    renderCalendarGrid(calendarDays, year, month) {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        // Day-of-week headers
        const headers = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            .map(d => `<div class="cal-header">${d}</div>`).join('');

        // Blank cells before the first day (Mon = 0)
        const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
        const blanksBefore = (firstDay === 0 ? 6 : firstDay - 1); // shift to Mon-start
        const blanks = Array(blanksBefore).fill('<div class="cal-cell cal-blank"></div>').join('');

        // Day cells
        const dayMap = {};
        calendarDays.forEach(d => { dayMap[d.date] = d; });

        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date().toISOString().split('T')[0];
        const dayCells = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const info = dayMap[dateStr];
            const isToday = dateStr === today;
            let cls = 'cal-cell';
            let tooltip = '';
            if (isToday) cls += ' cal-today';
            if (info && info.total_calories > 0) {
                cls += info.goal_met ? ' cal-goal-met' : ' cal-goal-missed';
                tooltip = `${Math.round(info.total_calories)} kcal`;
            }
            dayCells.push(
                `<div class="${cls}" title="${tooltip}">
                    <span class="cal-day-num">${d}</span>
                    ${info && info.total_calories > 0
                        ? `<span class="cal-kcal">${Math.round(info.total_calories)}</span>`
                        : ''}
                </div>`
            );
        }

        grid.innerHTML = `<div class="cal-grid-inner">${headers}${blanks}${dayCells.join('')}</div>`;
    }

    // ── Auth token helper ───────────────────────────────────────────────────
    getAuthToken() {
        return localStorage.getItem('authToken') || '';
    }

    // ══════════════════════════════════════════════════════════════════════════
    // IMAGE ATTACHMENT (Add-food form)
    // ══════════════════════════════════════════════════════════════════════════

    toggleImageAttachPanel() {
        const panel = document.getElementById('imageAttachPanel');
        if (!panel) return;
        const open = panel.style.display === 'none' || !panel.style.display;
        panel.style.display = open ? 'block' : 'none';

        // Wire up events the first time the panel is opened
        if (open && !panel._bound) {
            panel._bound = true;
            const fileInput = document.getElementById('imageFileInput');
            const fileArea  = document.getElementById('imageFileArea');
            const urlInput  = document.getElementById('imageUrlInput');

            // Radio switch
            panel.querySelectorAll('input[name="imageSource"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    const isFile = radio.value === 'file';
                    document.getElementById('imageFileArea').style.display  = isFile ? '' : 'none';
                    document.getElementById('imageUrlArea').style.display   = isFile ? 'none' : '';
                    this._clearPendingImage(false);
                });
            });

            // File selected
            fileInput.addEventListener('change', () => {
                const file = fileInput.files[0];
                if (!file) return;
                this._pendingImageFile = file;
                this._pendingImageUrl  = null;
                const url = URL.createObjectURL(file);
                this._showImagePreview('imagePreview', 'imagePreviewWrap', url);
                document.getElementById('imageAttachLabel').textContent = file.name;
            });

            // URL input
            urlInput.addEventListener('blur', () => {
                const val = urlInput.value.trim();
                if (val) {
                    this._pendingImageUrl  = val;
                    this._pendingImageFile = null;
                    this._showImagePreview('imagePreview', 'imagePreviewWrap', val);
                    document.getElementById('imageAttachLabel').textContent = 'URL';
                }
            });
        }
    }

    _showImagePreview(imgId, wrapId, src) {
        const wrap = document.getElementById(wrapId);
        const img  = document.getElementById(imgId);
        if (!wrap || !img) return;
        img.src = src;
        wrap.style.display = '';
    }

    _clearPendingImage(closePanel = true) {
        this._pendingImageFile = null;
        this._pendingImageUrl  = null;
        const fileInput = document.getElementById('imageFileInput');
        if (fileInput) fileInput.value = '';
        const urlInput = document.getElementById('imageUrlInput');
        if (urlInput) urlInput.value = '';
        const wrap = document.getElementById('imagePreviewWrap');
        if (wrap) wrap.style.display = 'none';
        const label = document.getElementById('imageAttachLabel');
        if (label) label.textContent = '';
        if (closePanel) {
            const panel = document.getElementById('imageAttachPanel');
            if (panel) panel.style.display = 'none';
        }
    }

    async attachMealPhoto() {
        if (!this._mealPhotoTargetId) return;
        const targetId = this._mealPhotoTargetId;
        if (this._pendingImageFile) {
            await this.uploadAndAttachImage(targetId, this._pendingImageFile, 'file');
        } else if (this._pendingImageUrl) {
            await this.uploadAndAttachImage(targetId, this._pendingImageUrl, 'url');
        }
        this._mealPhotoTargetId = null;
        this._clearPendingImage();
    }

    // Upload image (file or URL) then attach to a log entry
    // Compress an image File/Blob to JPEG, scaled to at most MAX_DIM px on the longest side.
    // Falls back to the original file if canvas is unavailable or compression fails.
    compressImage(file) {
        const MAX_DIM = 1920;
        const QUALITY = 0.82;
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                let { width, height } = img;
                if (width <= MAX_DIM && height <= MAX_DIM) {
                    // No resize needed, but still re-encode to JPEG if it's not already
                    if (file.type === 'image/jpeg') { resolve(file); return; }
                }
                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width >= height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
                    else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
                }
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', QUALITY);
                } catch {
                    resolve(file);
                }
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
            img.src = url;
        });
    }

    async uploadAndAttachImage(logId, source, type) {
        try {
            let imageId;
            if (type === 'file') {
                // Validate
                if (!source || !source.type || !source.type.startsWith('image/')) {
                    throw new Error('Please select a valid image file');
                }
                const MAX_BYTES = 30 * 1024 * 1024; // 30 MB hard limit before compression
                if (source.size > MAX_BYTES) {
                    throw new Error('Image is too large (max 30 MB)');
                }

                this.showMessage('Uploading photo…', 'info');

                // Compress on the client before sending (handles large phone camera shots)
                const compressed = await this.compressImage(source);

                const formData = new FormData();
                formData.append('image', compressed, 'photo.jpg');

                let uploadData;
                try {
                    // Primary path: multipart FormData upload
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 s timeout
                    let resp;
                    try {
                        resp = await fetch(`${CONFIG.API_BASE_URL}/images/upload`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${this.authToken}` },
                            body: formData,
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }
                    uploadData = await resp.json();
                    if (!resp.ok) throw new Error(uploadData.error || 'Image upload failed');
                } catch (fetchErr) {
                    // Fallback: base64 JSON upload — avoids multipart CORS edge-cases on some mobile browsers
                    if (fetchErr.name === 'AbortError') throw new Error('Upload timed out — check your connection and try again');
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(compressed);
                    });
                    uploadData = await this.apiCall('/images/upload', 'POST', { image: dataUrl });
                }
                imageId = uploadData.image?.id ?? uploadData.id ?? uploadData.data?.id;
                if (!imageId) throw new Error('Image upload failed: no image ID in response');
            } else {
                const data = await this.apiCall('/images/url', 'POST', { url: source });
                imageId = data.image?.id ?? data.id ?? data.data?.id;
                if (!imageId) throw new Error('Image URL save failed: no image ID in response');
            }
            // Attach to log
            await this.apiCall(`/logs/${logId}`, 'PUT', { image_id: imageId });
            await this.loadTodaysData();
        } catch (err) {
            console.error('Image attach error:', err);
            this.showMessage('Photo could not be attached: ' + err.message, 'warning');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // IMAGE ATTACHMENT (Edit modal)
    // ══════════════════════════════════════════════════════════════════════════

    toggleEditImagePanel() {
        const panel = document.getElementById('editImagePanel');
        if (!panel) return;
        const open = panel.style.display === 'none' || !panel.style.display;
        panel.style.display = open ? 'block' : 'none';

        if (open && !panel._bound) {
            panel._bound = true;
            const fileInput = document.getElementById('editImageFileInput');

            panel.querySelectorAll('input[name="editImageSource"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    const isFile = radio.value === 'file';
                    document.getElementById('editImageFileArea').style.display = isFile ? '' : 'none';
                    document.getElementById('editImageUrlArea').style.display  = isFile ? 'none' : '';
                    this._clearEditImagePreview();
                });
            });

            fileInput.addEventListener('change', () => {
                const file = fileInput.files[0];
                if (!file) return;
                this._editPendingFile = file;
                this._editPendingUrl  = null;
                this._showImagePreview('editImagePreview', 'editImagePreviewWrap', URL.createObjectURL(file));
            });

            const urlInput = document.getElementById('editImageUrlInput');
            urlInput.addEventListener('blur', () => {
                const val = urlInput.value.trim();
                if (val) {
                    this._editPendingUrl  = val;
                    this._editPendingFile = null;
                    this._showImagePreview('editImagePreview', 'editImagePreviewWrap', val);
                }
            });
        }
    }

    _clearEditImage() {
        // Mark image for removal on save
        this._editRemoveImage = true;
        this._editPendingFile = null;
        this._editPendingUrl  = null;
        document.getElementById('editCurrentImage').style.display = 'none';
        document.getElementById('editImageBtnLabel').textContent = 'Add Photo';
    }

    _clearEditImagePreview() {
        this._editPendingFile = null;
        this._editPendingUrl  = null;
        const fileInput = document.getElementById('editImageFileInput');
        if (fileInput) fileInput.value = '';
        const urlInput = document.getElementById('editImageUrlInput');
        if (urlInput) urlInput.value = '';
        const wrap = document.getElementById('editImagePreviewWrap');
        if (wrap) wrap.style.display = 'none';
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SHARE MODAL
    // ══════════════════════════════════════════════════════════════════════════

    openShareModal() {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
        const start = document.getElementById('shareStartDate');
        const end   = document.getElementById('shareEndDate');
        if (start) start.value = thirtyDaysAgo;
        if (end)   end.value   = today;
        document.getElementById('shareLinkResult').style.display = 'none';
        document.getElementById('shareModal').style.display = 'flex';
    }

    closeShareModal() {
        document.getElementById('shareModal').style.display = 'none';
    }

    async generateShareLink() {
        const startDate = document.getElementById('shareStartDate')?.value;
        const endDate   = document.getElementById('shareEndDate')?.value;
        if (!startDate || !endDate) {
            this.showMessage('Please select both a start and end date', 'error');
            return;
        }
        if (startDate > endDate) {
            this.showMessage('Start date must be before end date', 'error');
            return;
        }

        try {
            // Fetch all logs in range
            const resp = await this.apiCall(`/logs/range?start_date=${startDate}&end_date=${endDate}`);
            // resp.data is { "YYYY-MM-DD": { logs: [...], ... }, ... }
            const logs = [];
            if (resp.data && typeof resp.data === 'object') {
                for (const dayData of Object.values(resp.data)) {
                    if (Array.isArray(dayData.logs)) logs.push(...dayData.logs);
                }
            }

            if (logs.length === 0) {
                this.showMessage('No meals found in the selected date range', 'warning');
                return;
            }

            // Generate a share token for each log entry (parallel)
            const btn = document.querySelector('[data-action="generate-share-link"]');
            if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
            let tokens = [];
            try {
                const tokenResps = await Promise.all(
                    logs.map(log => this.apiCall(`/logs/${log.id}/share`, 'POST').catch(() => null))
                );
                tokens = tokenResps
                    .filter(Boolean)
                    .map(r => r.share_token || r.token)
                    .filter(Boolean);
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Generate Link'; }
            }

            if (tokens.length === 0) {
                this.showMessage('Failed to generate share tokens', 'error');
                return;
            }

            const base = window.location.origin;
            let url  = `${base}/share.html?t=${tokens.join(',')}&from=${startDate}&to=${endDate}`;

            // Attach day comments for the selected date range
            const rangeDates = [];
            for (let d = new Date(startDate + 'T12:00:00'); d <= new Date(endDate + 'T12:00:00'); d.setDate(d.getDate() + 1)) {
                rangeDates.push(d.toISOString().split('T')[0]);
            }
            const commentEntries = await Promise.all(
                rangeDates.map(async date => [date, await this.fetchDayComment(date)])
            );
            const rangeComments = {};
            commentEntries.forEach(([date, comment]) => {
                if (comment) rangeComments[date] = comment;
            });
            if (Object.keys(rangeComments).length > 0) {
                url += '&c=' + encodeURIComponent(JSON.stringify(rangeComments));
            }

            document.getElementById('shareLinkInput').value = url;
            document.getElementById('shareLinkResult').style.display = '';
        } catch (err) {
            console.error('Generate share link error:', err);
            this.showMessage('Failed to generate share link: ' + err.message, 'error');
        }
    }

    async copyShareLink() {
        const input = document.getElementById('shareLinkInput');
        if (!input?.value) return;
        try {
            await navigator.clipboard.writeText(input.value);
            this.showMessage('Link copied to clipboard!', 'success');
        } catch {
            input.select();
            document.execCommand('copy');
            this.showMessage('Link copied!', 'success');
        }
    }
}

// Initialize the app when DOM is ready
let app;

logger.debug('🟣 Script loaded, document.readyState:', document.readyState);


if (document.readyState === 'loading') {
    // DOM is still loading
    document.addEventListener('DOMContentLoaded', () => {
        logger.debug('🟣 DOMContentLoaded event fired');
        app = new CalorieTracker();
        logger.debug('🟣 CalorieTracker instance created');
        app.init(); // Call init() after DOM is ready
        logger.debug('🟣 CalorieTracker.init() called');
    });
} else {
    // DOM is already loaded
    logger.debug('🟣 DOM already loaded, initializing immediately');
    app = new CalorieTracker();
    logger.debug('🟣 CalorieTracker instance created');
    app.init(); // Call init() after DOM is ready
    logger.debug('🟣 CalorieTracker.init() called');
}
