/**
 * FoodLogUI.js
 * Handles food log rendering and display
 */

import { logger } from '../../logger.js';

export class FoodLogUI {
    constructor() {
        this.foodLogElement = null;
    }

    /**
     * Initialize UI with DOM elements
     */
    init() {
        this.foodLogElement = document.getElementById('foodLog');
        if (!this.foodLogElement) {
            logger.error('Food log element not found');
        }
    }

    /**
     * Render food log
     * @param {Array} foodLog - Array of food entries
     * @param {number} dailyCalories - Total calories for the day
     * @param {number} calorieGoal - Daily calorie goal
     */
    render(foodLog, dailyCalories, calorieGoal) {
        if (!this.foodLogElement) {
            logger.warn('Food log element not initialized');
            return;
        }

        // Update food list
        if (foodLog.length === 0) {
            this.foodLogElement.innerHTML = '<p class="empty-message">No food logged yet today. Start by adding your first meal!</p>';
        } else {
            this.foodLogElement.innerHTML = foodLog.map(food => this.renderFoodItem(food)).reverse().join('');
        }

        // Update calorie progress
        this.updateCalorieProgress(dailyCalories, calorieGoal);

        logger.debug('Food log rendered:', foodLog.length, 'items');
    }

    /**
     * Render a single food item
     * @param {Object} food - Food entry
     * @returns {string} HTML string
     */
    renderFoodItem(food) {
        const offlineIndicator = food.offline ? ' (Offline)' : '';
        const nameCapitalized = this.capitalizeFirst(food.name);
        
        return `
            <div class="food-item">
                <div class="food-info">
                    <div class="food-name">${nameCapitalized}${offlineIndicator}</div>
                    <div class="food-details">${food.quantity} ${food.unit} • ${food.timestamp}</div>
                </div>
                <div class="food-calories">${food.calories} cal</div>
                <button class="delete-btn" data-action="delete-food" data-food-id="${food.id}">×</button>
            </div>
        `;
    }

    /**
     * Update calorie progress display
     * @param {number} dailyCalories - Current calories
     * @param {number} calorieGoal - Goal calories
     */
    updateCalorieProgress(dailyCalories, calorieGoal) {
        const dailyCaloriesEl = document.getElementById('dailyCalories');
        const calorieGoalEl = document.getElementById('calorieGoal');
        const progressBar = document.getElementById('calorieProgress');

        if (dailyCaloriesEl) {
            dailyCaloriesEl.textContent = dailyCalories;
        }

        if (calorieGoalEl) {
            calorieGoalEl.textContent = calorieGoal;
        }

        if (progressBar) {
            const percentage = calorieGoal > 0 ? (dailyCalories / calorieGoal) * 100 : 0;
            progressBar.style.width = `${Math.min(percentage, 100)}%`;
            
            // Change color based on progress
            if (percentage >= 100) {
                progressBar.style.backgroundColor = '#4CAF50'; // Green when goal reached
            } else if (percentage >= 80) {
                progressBar.style.backgroundColor = '#FFA726'; // Orange when close
            } else {
                progressBar.style.backgroundColor = '#2196F3'; // Blue for normal
            }
        }

        logger.debug('Calorie progress updated:', dailyCalories, '/', calorieGoal);
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        if (this.foodLogElement) {
            this.foodLogElement.innerHTML = '<p class="empty-message">No food logged yet today. Start by adding your first meal!</p>';
        }
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - Input string
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Add food item to DOM (optimistic UI update)
     * @param {Object} food - Food entry
     */
    addFoodItem(food) {
        if (!this.foodLogElement) return;

        // Remove empty message if present
        const emptyMessage = this.foodLogElement.querySelector('.empty-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }

        // Create and prepend new food item
        const foodItemHTML = this.renderFoodItem(food);
        this.foodLogElement.insertAdjacentHTML('afterbegin', foodItemHTML);

        logger.debug('Food item added to DOM:', food.name);
    }

    /**
     * Remove food item from DOM (optimistic UI update)
     * @param {number} foodId - Food ID to remove
     */
    removeFoodItem(foodId) {
        if (!this.foodLogElement) return;

        const foodItems = this.foodLogElement.querySelectorAll('.food-item');
        foodItems.forEach(item => {
            const deleteBtn = item.querySelector('[data-food-id]');
            if (deleteBtn && parseInt(deleteBtn.dataset.foodId) === foodId) {
                item.remove();
                logger.debug('Food item removed from DOM:', foodId);
            }
        });

        // Show empty message if no items left
        if (this.foodLogElement.querySelectorAll('.food-item').length === 0) {
            this.showEmptyState();
        }
    }

    /**
     * Highlight a food item (e.g., after adding)
     * @param {number} foodId - Food ID to highlight
     * @param {number} duration - Highlight duration in ms
     */
    highlightFoodItem(foodId, duration = 2000) {
        const foodItems = document.querySelectorAll('.food-item');
        foodItems.forEach(item => {
            const deleteBtn = item.querySelector('[data-food-id]');
            if (deleteBtn && parseInt(deleteBtn.dataset.foodId) === foodId) {
                item.classList.add('highlight');
                setTimeout(() => {
                    item.classList.remove('highlight');
                }, duration);
            }
        });
    }
}

// Export singleton instance
export const foodLogUI = new FoodLogUI();
