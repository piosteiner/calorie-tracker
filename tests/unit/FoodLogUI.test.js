/**
 * FoodLogUI Unit Tests
 * Tests for food log rendering and updates
 */

import { FoodLogUI } from '../../modules/ui/FoodLogUI.js';

// Mock dependencies
jest.mock('../../logger.js', () => require('../mocks/logger.js'));
jest.mock('../../config.js', () => require('../mocks/config.js'));

describe('FoodLogUI', () => {
    let foodLogUI;
    let logContainer;
    let calorieDisplay;
    let progressBar;
    let mockStateManager;

    beforeEach(() => {
        // Setup DOM elements
        logContainer = document.createElement('div');
        logContainer.id = 'food-log-container';
        
        calorieDisplay = document.createElement('div');
        calorieDisplay.id = 'calorie-display';
        calorieDisplay.innerHTML = '<span class="current-calories">0</span> / <span class="goal-calories">2000</span>';
        
        progressBar = document.createElement('div');
        progressBar.id = 'calorie-progress-bar';
        
        document.body.appendChild(logContainer);
        document.body.appendChild(calorieDisplay);
        document.body.appendChild(progressBar);

        // Mock StateManager
        mockStateManager = {
            getState: jest.fn(),
            subscribe: jest.fn()
        };

        foodLogUI = new FoodLogUI(mockStateManager);
    });

    afterEach(() => {
        logContainer?.remove();
        calorieDisplay?.remove();
        progressBar?.remove();
    });

    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    describe('Initialization', () => {
        test('should initialize with StateManager', () => {
            expect(foodLogUI.stateManager).toBe(mockStateManager);
        });

        test('should subscribe to state changes', () => {
            expect(mockStateManager.subscribe).toHaveBeenCalled();
        });
    });

    // ============================================
    // RENDER FOOD LOG TESTS
    // ============================================
    describe('renderFoodLog', () => {
        test('should render empty state when no logs', () => {
            const logs = [];

            foodLogUI.renderFoodLog(logs);

            expect(logContainer.querySelector('.empty-state')).toBeTruthy();
            expect(logContainer.textContent).toContain('No food entries yet');
        });

        test('should render food log entries', () => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 100, unit: 'g' },
                { id: 2, name: 'Banana', calories: 105, quantity: 120, unit: 'g' }
            ];

            foodLogUI.renderFoodLog(logs);

            const entries = logContainer.querySelectorAll('.food-entry');
            expect(entries.length).toBe(2);
            expect(logContainer.textContent).toContain('Apple');
            expect(logContainer.textContent).toContain('Banana');
        });

        test('should display food name and calories', () => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 100, unit: 'g' }
            ];

            foodLogUI.renderFoodLog(logs);

            expect(logContainer.textContent).toContain('Apple');
            expect(logContainer.textContent).toContain('95');
        });

        test('should display quantity and unit', () => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 150, unit: 'g' }
            ];

            foodLogUI.renderFoodLog(logs);

            expect(logContainer.textContent).toContain('150');
            expect(logContainer.textContent).toContain('g');
        });

        test('should include delete button for each entry', () => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 100, unit: 'g' }
            ];

            foodLogUI.renderFoodLog(logs);

            const deleteBtn = logContainer.querySelector('[data-action="delete"]');
            expect(deleteBtn).toBeTruthy();
            expect(deleteBtn.getAttribute('data-log-id')).toBe('1');
        });

        test('should handle logs with missing unit', () => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 100 }
            ];

            foodLogUI.renderFoodLog(logs);

            const entry = logContainer.querySelector('.food-entry');
            expect(entry).toBeTruthy();
        });

        test('should display protein if available', () => {
            const logs = [
                { id: 1, name: 'Chicken', calories: 165, protein: 31, quantity: 100, unit: 'g' }
            ];

            foodLogUI.renderFoodLog(logs);

            expect(logContainer.textContent).toContain('31');
            expect(logContainer.textContent).toContain('protein');
        });

        test('should display carbs if available', () => {
            const logs = [
                { id: 1, name: 'Rice', calories: 130, carbs: 28, quantity: 100, unit: 'g' }
            ];

            foodLogUI.renderFoodLog(logs);

            expect(logContainer.textContent).toContain('28');
            expect(logContainer.textContent).toContain('carbs');
        });

        test('should display fat if available', () => {
            const logs = [
                { id: 1, name: 'Butter', calories: 717, fat: 81, quantity: 100, unit: 'g' }
            ];

            foodLogUI.renderFoodLog(logs);

            expect(logContainer.textContent).toContain('81');
            expect(logContainer.textContent).toContain('fat');
        });
    });

    // ============================================
    // UPDATE CALORIE DISPLAY TESTS
    // ============================================
    describe('updateCalorieDisplay', () => {
        test('should update current calories', () => {
            foodLogUI.updateCalorieDisplay(1500, 2000);

            const currentEl = calorieDisplay.querySelector('.current-calories');
            expect(currentEl.textContent).toBe('1500');
        });

        test('should update goal calories', () => {
            foodLogUI.updateCalorieDisplay(1500, 2500);

            const goalEl = calorieDisplay.querySelector('.goal-calories');
            expect(goalEl.textContent).toBe('2500');
        });

        test('should update progress bar width', () => {
            foodLogUI.updateCalorieDisplay(1000, 2000);

            expect(progressBar.style.width).toBe('50%');
        });

        test('should cap progress bar at 100%', () => {
            foodLogUI.updateCalorieDisplay(2500, 2000);

            expect(progressBar.style.width).toBe('100%');
        });

        test('should add warning class when over goal', () => {
            foodLogUI.updateCalorieDisplay(2100, 2000);

            expect(calorieDisplay.classList.contains('over-goal')).toBe(true);
            expect(progressBar.classList.contains('over-goal')).toBe(true);
        });

        test('should remove warning class when under goal', () => {
            calorieDisplay.classList.add('over-goal');
            progressBar.classList.add('over-goal');

            foodLogUI.updateCalorieDisplay(1500, 2000);

            expect(calorieDisplay.classList.contains('over-goal')).toBe(false);
            expect(progressBar.classList.contains('over-goal')).toBe(false);
        });

        test('should add near-goal class when 90% of goal', () => {
            foodLogUI.updateCalorieDisplay(1850, 2000);

            expect(progressBar.classList.contains('near-goal')).toBe(true);
        });

        test('should handle zero goal', () => {
            expect(() => {
                foodLogUI.updateCalorieDisplay(1000, 0);
            }).not.toThrow();

            expect(progressBar.style.width).toBe('0%');
        });
    });

    // ============================================
    // OPTIMISTIC UI TESTS
    // ============================================
    describe('Optimistic UI Updates', () => {
        test('should add entry optimistically', () => {
            const newEntry = { id: 'temp-1', name: 'Apple', calories: 95, quantity: 100, unit: 'g' };

            foodLogUI.addEntryOptimistic(newEntry);

            const entry = logContainer.querySelector('[data-log-id="temp-1"]');
            expect(entry).toBeTruthy();
            expect(entry.classList.contains('pending')).toBe(true);
        });

        test('should update entry after API success', () => {
            const tempEntry = { id: 'temp-1', name: 'Apple', calories: 95, quantity: 100, unit: 'g' };
            foodLogUI.addEntryOptimistic(tempEntry);

            const confirmedEntry = { id: 123, name: 'Apple', calories: 95, quantity: 100, unit: 'g' };
            foodLogUI.confirmEntry('temp-1', confirmedEntry);

            expect(logContainer.querySelector('[data-log-id="temp-1"]')).toBeFalsy();
            expect(logContainer.querySelector('[data-log-id="123"]')).toBeTruthy();
            expect(logContainer.querySelector('[data-log-id="123"]').classList.contains('pending')).toBe(false);
        });

        test('should remove entry on API error', () => {
            const tempEntry = { id: 'temp-1', name: 'Apple', calories: 95, quantity: 100, unit: 'g' };
            foodLogUI.addEntryOptimistic(tempEntry);

            foodLogUI.removeEntryOptimistic('temp-1');

            expect(logContainer.querySelector('[data-log-id="temp-1"]')).toBeFalsy();
        });

        test('should show delete pending state', () => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 100, unit: 'g' }
            ];
            foodLogUI.renderFoodLog(logs);

            foodLogUI.showDeletePending(1);

            const entry = logContainer.querySelector('[data-log-id="1"]');
            expect(entry.classList.contains('deleting')).toBe(true);
        });

        test('should restore entry on delete error', () => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 100, unit: 'g' }
            ];
            foodLogUI.renderFoodLog(logs);
            foodLogUI.showDeletePending(1);

            foodLogUI.restoreEntry(1);

            const entry = logContainer.querySelector('[data-log-id="1"]');
            expect(entry.classList.contains('deleting')).toBe(false);
        });
    });

    // ============================================
    // HIGHLIGHTING TESTS
    // ============================================
    describe('Entry Highlighting', () => {
        test('should highlight newly added entry', (done) => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 100, unit: 'g' }
            ];
            foodLogUI.renderFoodLog(logs);

            foodLogUI.highlightEntry(1);

            const entry = logContainer.querySelector('[data-log-id="1"]');
            expect(entry.classList.contains('highlight')).toBe(true);

            setTimeout(() => {
                expect(entry.classList.contains('highlight')).toBe(false);
                done();
            }, 2100);
        }, 3000);

        test('should not throw error for non-existent entry', () => {
            expect(() => {
                foodLogUI.highlightEntry(999);
            }).not.toThrow();
        });
    });

    // ============================================
    // CALCULATE TOTALS TESTS
    // ============================================
    describe('calculateTotals', () => {
        test('should calculate total calories', () => {
            const logs = [
                { id: 1, calories: 95 },
                { id: 2, calories: 105 },
                { id: 3, calories: 150 }
            ];

            const totals = foodLogUI.calculateTotals(logs);

            expect(totals.calories).toBe(350);
        });

        test('should calculate total protein', () => {
            const logs = [
                { id: 1, calories: 165, protein: 31 },
                { id: 2, calories: 165, protein: 31 }
            ];

            const totals = foodLogUI.calculateTotals(logs);

            expect(totals.protein).toBe(62);
        });

        test('should calculate total carbs', () => {
            const logs = [
                { id: 1, calories: 130, carbs: 28 },
                { id: 2, calories: 130, carbs: 28 }
            ];

            const totals = foodLogUI.calculateTotals(logs);

            expect(totals.carbs).toBe(56);
        });

        test('should calculate total fat', () => {
            const logs = [
                { id: 1, calories: 100, fat: 10 },
                { id: 2, calories: 100, fat: 12 }
            ];

            const totals = foodLogUI.calculateTotals(logs);

            expect(totals.fat).toBe(22);
        });

        test('should handle missing nutrition values', () => {
            const logs = [
                { id: 1, calories: 95 },
                { id: 2, calories: 105, protein: 5 }
            ];

            const totals = foodLogUI.calculateTotals(logs);

            expect(totals.calories).toBe(200);
            expect(totals.protein).toBe(5);
            expect(totals.carbs).toBe(0);
            expect(totals.fat).toBe(0);
        });

        test('should handle empty log array', () => {
            const totals = foodLogUI.calculateTotals([]);

            expect(totals.calories).toBe(0);
            expect(totals.protein).toBe(0);
            expect(totals.carbs).toBe(0);
            expect(totals.fat).toBe(0);
        });
    });

    // ============================================
    // SCROLL TO ENTRY TESTS
    // ============================================
    describe('scrollToEntry', () => {
        test('should scroll entry into view', () => {
            const logs = [
                { id: 1, name: 'Apple', calories: 95, quantity: 100, unit: 'g' }
            ];
            foodLogUI.renderFoodLog(logs);

            const entry = logContainer.querySelector('[data-log-id="1"]');
            entry.scrollIntoView = jest.fn();

            foodLogUI.scrollToEntry(1);

            expect(entry.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'center'
            });
        });

        test('should not throw error for non-existent entry', () => {
            expect(() => {
                foodLogUI.scrollToEntry(999);
            }).not.toThrow();
        });
    });

    // ============================================
    // STATE OBSERVER TESTS
    // ============================================
    describe('State Observer', () => {
        test('should update UI on foodLog state change', () => {
            const callback = mockStateManager.subscribe.mock.calls[0][0];
            
            mockStateManager.getState.mockReturnValue({
                foodLog: [
                    { id: 1, name: 'Apple', calories: 95, quantity: 100, unit: 'g' }
                ],
                user: { calorieGoal: 2000 }
            });

            callback('foodLog');

            expect(logContainer.querySelector('.food-entry')).toBeTruthy();
        });

        test('should update UI on user goal change', () => {
            const callback = mockStateManager.subscribe.mock.calls[0][0];
            
            mockStateManager.getState.mockReturnValue({
                foodLog: [
                    { id: 1, calories: 1000 }
                ],
                user: { calorieGoal: 2500 }
            });

            callback('user');

            const goalEl = calorieDisplay.querySelector('.goal-calories');
            expect(goalEl.textContent).toBe('2500');
        });
    });

    // ============================================
    // ERROR HANDLING TESTS
    // ============================================
    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            logContainer.remove();
            calorieDisplay.remove();
            progressBar.remove();

            expect(() => {
                foodLogUI.renderFoodLog([]);
            }).not.toThrow();

            expect(() => {
                foodLogUI.updateCalorieDisplay(1000, 2000);
            }).not.toThrow();
        });

        test('should handle invalid log data', () => {
            const logs = [
                { id: 1, name: null, calories: null },
                { id: 2 }, // missing fields
                null // null entry
            ];

            expect(() => {
                foodLogUI.renderFoodLog(logs);
            }).not.toThrow();
        });

        test('should handle negative calories', () => {
            expect(() => {
                foodLogUI.updateCalorieDisplay(-100, 2000);
            }).not.toThrow();
        });
    });
});
