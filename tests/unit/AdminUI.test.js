/**
 * AdminUI Unit Tests
 * Tests for admin panel rendering and interactions
 */

import { AdminUI } from '../../modules/ui/AdminUI.js';

// Mock dependencies
jest.mock('../../logger.js', () => require('../mocks/logger.js'));
jest.mock('../../config.js', () => require('../mocks/config.js'));

describe('AdminUI', () => {
    let adminUI;
    let mockStateManager;
    let adminPanel;

    beforeEach(() => {
        // Setup DOM elements
        adminPanel = document.createElement('div');
        adminPanel.id = 'admin-panel';
        adminPanel.innerHTML = `
            <div id="admin-stats"></div>
            <div id="admin-users-table"></div>
            <div id="admin-foods-table"></div>
            <div id="database-browser"></div>
        `;
        document.body.appendChild(adminPanel);

        // Mock StateManager
        mockStateManager = {
            getState: jest.fn(),
            subscribe: jest.fn(),
            setState: jest.fn()
        };

        adminUI = new AdminUI(mockStateManager);
    });

    afterEach(() => {
        adminPanel?.remove();
    });

    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    describe('Initialization', () => {
        test('should initialize with StateManager', () => {
            expect(adminUI.stateManager).toBe(mockStateManager);
        });

        test('should subscribe to state changes', () => {
            expect(mockStateManager.subscribe).toHaveBeenCalled();
        });
    });

    // ============================================
    // RENDER STATS TESTS
    // ============================================
    describe('renderStats', () => {
        test('should render admin statistics', () => {
            const stats = {
                totalUsers: 150,
                totalFoods: 500,
                totalLogs: 2500,
                logsToday: 75
            };

            adminUI.renderStats(stats);

            const statsContainer = document.getElementById('admin-stats');
            expect(statsContainer.textContent).toContain('150');
            expect(statsContainer.textContent).toContain('500');
            expect(statsContainer.textContent).toContain('2500');
            expect(statsContainer.textContent).toContain('75');
        });

        test('should render zero stats', () => {
            const stats = {
                totalUsers: 0,
                totalFoods: 0,
                totalLogs: 0,
                logsToday: 0
            };

            adminUI.renderStats(stats);

            const statsContainer = document.getElementById('admin-stats');
            expect(statsContainer.textContent).toContain('0');
        });

        test('should handle missing stats container', () => {
            document.getElementById('admin-stats').remove();

            expect(() => {
                adminUI.renderStats({ totalUsers: 100 });
            }).not.toThrow();
        });
    });

    // ============================================
    // RENDER USERS TABLE TESTS
    // ============================================
    describe('renderUsersTable', () => {
        test('should render users table', () => {
            const users = [
                { id: 1, username: 'user1', email: 'user1@test.com', is_admin: 0, created_at: '2025-01-01' },
                { id: 2, username: 'user2', email: 'user2@test.com', is_admin: 1, created_at: '2025-01-02' }
            ];

            adminUI.renderUsersTable(users);

            const table = document.querySelector('#admin-users-table table');
            expect(table).toBeTruthy();
            
            const rows = table.querySelectorAll('tbody tr');
            expect(rows.length).toBe(2);
            expect(table.textContent).toContain('user1');
            expect(table.textContent).toContain('user2');
        });

        test('should display admin badge for admin users', () => {
            const users = [
                { id: 1, username: 'admin', email: 'admin@test.com', is_admin: 1, created_at: '2025-01-01' }
            ];

            adminUI.renderUsersTable(users);

            const table = document.querySelector('#admin-users-table table');
            expect(table.querySelector('.admin-badge')).toBeTruthy();
        });

        test('should include action buttons', () => {
            const users = [
                { id: 1, username: 'user1', email: 'user1@test.com', is_admin: 0, created_at: '2025-01-01' }
            ];

            adminUI.renderUsersTable(users);

            const row = document.querySelector('#admin-users-table tbody tr');
            expect(row.querySelector('[data-action="reset-password"]')).toBeTruthy();
            expect(row.querySelector('[data-action="delete-user"]')).toBeTruthy();
        });

        test('should render empty state when no users', () => {
            adminUI.renderUsersTable([]);

            const container = document.getElementById('admin-users-table');
            expect(container.querySelector('.empty-state')).toBeTruthy();
            expect(container.textContent).toContain('No users found');
        });

        test('should include checkbox for bulk selection', () => {
            const users = [
                { id: 1, username: 'user1', email: 'user1@test.com', is_admin: 0, created_at: '2025-01-01' }
            ];

            adminUI.renderUsersTable(users);

            const checkbox = document.querySelector('input[type="checkbox"][data-user-id="1"]');
            expect(checkbox).toBeTruthy();
        });
    });

    // ============================================
    // RENDER FOODS TABLE TESTS
    // ============================================
    describe('renderFoodsTable', () => {
        test('should render foods table', () => {
            const foods = [
                { id: 1, name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, unit: 'g', is_verified: 1 },
                { id: 2, name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, unit: 'g', is_verified: 0 }
            ];

            adminUI.renderFoodsTable(foods);

            const table = document.querySelector('#admin-foods-table table');
            expect(table).toBeTruthy();
            
            const rows = table.querySelectorAll('tbody tr');
            expect(rows.length).toBe(2);
            expect(table.textContent).toContain('Apple');
            expect(table.textContent).toContain('Banana');
        });

        test('should display verified badge for verified foods', () => {
            const foods = [
                { id: 1, name: 'Apple', calories: 95, is_verified: 1, unit: 'g' }
            ];

            adminUI.renderFoodsTable(foods);

            const table = document.querySelector('#admin-foods-table table');
            expect(table.querySelector('.verified-badge')).toBeTruthy();
        });

        test('should display nutrition information', () => {
            const foods = [
                { id: 1, name: 'Chicken', calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: 'g', is_verified: 1 }
            ];

            adminUI.renderFoodsTable(foods);

            const table = document.querySelector('#admin-foods-table table');
            expect(table.textContent).toContain('165'); // calories
            expect(table.textContent).toContain('31'); // protein
            expect(table.textContent).toContain('3.6'); // fat
        });

        test('should include action buttons', () => {
            const foods = [
                { id: 1, name: 'Apple', calories: 95, unit: 'g', is_verified: 1 }
            ];

            adminUI.renderFoodsTable(foods);

            const row = document.querySelector('#admin-foods-table tbody tr');
            expect(row.querySelector('[data-action="edit-food"]')).toBeTruthy();
            expect(row.querySelector('[data-action="delete-food"]')).toBeTruthy();
        });

        test('should render empty state when no foods', () => {
            adminUI.renderFoodsTable([]);

            const container = document.getElementById('admin-foods-table');
            expect(container.querySelector('.empty-state')).toBeTruthy();
        });

        test('should include checkbox for bulk selection', () => {
            const foods = [
                { id: 1, name: 'Apple', calories: 95, unit: 'g', is_verified: 1 }
            ];

            adminUI.renderFoodsTable(foods);

            const checkbox = document.querySelector('input[type="checkbox"][data-food-id="1"]');
            expect(checkbox).toBeTruthy();
        });
    });

    // ============================================
    // SORTING TESTS
    // ============================================
    describe('Table Sorting', () => {
        test('should sort users by column', () => {
            const users = [
                { id: 3, username: 'charlie', email: 'c@test.com', is_admin: 0, created_at: '2025-01-03' },
                { id: 1, username: 'alice', email: 'a@test.com', is_admin: 0, created_at: '2025-01-01' },
                { id: 2, username: 'bob', email: 'b@test.com', is_admin: 0, created_at: '2025-01-02' }
            ];

            adminUI.renderUsersTable(users);

            // Click username header to sort
            const header = document.querySelector('[data-sort="username"]');
            header.click();

            const rows = document.querySelectorAll('#admin-users-table tbody tr');
            expect(rows[0].textContent).toContain('alice');
            expect(rows[1].textContent).toContain('bob');
            expect(rows[2].textContent).toContain('charlie');
        });

        test('should reverse sort on second click', () => {
            const users = [
                { id: 1, username: 'alice', email: 'a@test.com', is_admin: 0, created_at: '2025-01-01' },
                { id: 2, username: 'bob', email: 'b@test.com', is_admin: 0, created_at: '2025-01-02' }
            ];

            adminUI.renderUsersTable(users);

            const header = document.querySelector('[data-sort="username"]');
            header.click(); // First click: ascending
            header.click(); // Second click: descending

            const rows = document.querySelectorAll('#admin-users-table tbody tr');
            expect(rows[0].textContent).toContain('bob');
            expect(rows[1].textContent).toContain('alice');
        });

        test('should sort foods by calories', () => {
            const foods = [
                { id: 1, name: 'Food A', calories: 300, unit: 'g', is_verified: 1 },
                { id: 2, name: 'Food B', calories: 100, unit: 'g', is_verified: 1 },
                { id: 3, name: 'Food C', calories: 200, unit: 'g', is_verified: 1 }
            ];

            adminUI.renderFoodsTable(foods);

            const header = document.querySelector('[data-sort="calories"]');
            header.click();

            const rows = document.querySelectorAll('#admin-foods-table tbody tr');
            expect(rows[0].textContent).toContain('100');
            expect(rows[1].textContent).toContain('200');
            expect(rows[2].textContent).toContain('300');
        });

        test('should show sort indicator', () => {
            const users = [
                { id: 1, username: 'user1', email: 'test@test.com', is_admin: 0, created_at: '2025-01-01' }
            ];

            adminUI.renderUsersTable(users);

            const header = document.querySelector('[data-sort="username"]');
            header.click();

            expect(header.classList.contains('sort-asc')).toBe(true);
        });
    });

    // ============================================
    // BULK SELECTION TESTS
    // ============================================
    describe('Bulk Selection', () => {
        test('should select all users with checkbox', () => {
            const users = [
                { id: 1, username: 'user1', email: 'test1@test.com', is_admin: 0, created_at: '2025-01-01' },
                { id: 2, username: 'user2', email: 'test2@test.com', is_admin: 0, created_at: '2025-01-02' }
            ];

            adminUI.renderUsersTable(users);

            const selectAllCheckbox = document.querySelector('#admin-users-table input[type="checkbox"][data-select-all]');
            selectAllCheckbox.click();

            const checkboxes = document.querySelectorAll('#admin-users-table tbody input[type="checkbox"]');
            checkboxes.forEach(cb => {
                expect(cb.checked).toBe(true);
            });
        });

        test('should update selected count', () => {
            const users = [
                { id: 1, username: 'user1', email: 'test1@test.com', is_admin: 0, created_at: '2025-01-01' },
                { id: 2, username: 'user2', email: 'test2@test.com', is_admin: 0, created_at: '2025-01-02' }
            ];

            adminUI.renderUsersTable(users);

            const checkbox = document.querySelector('input[type="checkbox"][data-user-id="1"]');
            checkbox.click();

            mockStateManager.getState.mockReturnValue({
                adminData: { selectedUsers: [1] }
            });

            const selectedCount = adminUI.getSelectedCount('users');
            expect(selectedCount).toBe(1);
        });

        test('should clear selection', () => {
            const users = [
                { id: 1, username: 'user1', email: 'test1@test.com', is_admin: 0, created_at: '2025-01-01' }
            ];

            adminUI.renderUsersTable(users);

            const checkbox = document.querySelector('input[type="checkbox"][data-user-id="1"]');
            checkbox.checked = true;

            adminUI.clearSelection('users');

            expect(checkbox.checked).toBe(false);
        });
    });

    // ============================================
    // DATABASE BROWSER TESTS
    // ============================================
    describe('Database Browser', () => {
        test('should render database tables list', () => {
            const tables = [
                { table_name: 'users', table_rows: 150 },
                { table_name: 'foods', table_rows: 500 },
                { table_name: 'logs', table_rows: 2500 }
            ];

            adminUI.renderDatabaseTables(tables);

            const browser = document.getElementById('database-browser');
            expect(browser.textContent).toContain('users');
            expect(browser.textContent).toContain('foods');
            expect(browser.textContent).toContain('logs');
            expect(browser.textContent).toContain('150');
            expect(browser.textContent).toContain('500');
        });

        test('should render table data', () => {
            const data = {
                columns: ['id', 'username', 'email'],
                rows: [
                    { id: 1, username: 'user1', email: 'user1@test.com' },
                    { id: 2, username: 'user2', email: 'user2@test.com' }
                ]
            };

            adminUI.renderTableData('users', data);

            const browser = document.getElementById('database-browser');
            const table = browser.querySelector('table');
            expect(table).toBeTruthy();
            expect(table.textContent).toContain('user1');
            expect(table.textContent).toContain('user2');
        });

        test('should render column names as headers', () => {
            const data = {
                columns: ['id', 'name', 'calories'],
                rows: [
                    { id: 1, name: 'Apple', calories: 95 }
                ]
            };

            adminUI.renderTableData('foods', data);

            const headers = document.querySelectorAll('#database-browser th');
            const headerTexts = Array.from(headers).map(h => h.textContent.toLowerCase());
            
            expect(headerTexts).toContain('id');
            expect(headerTexts).toContain('name');
            expect(headerTexts).toContain('calories');
        });

        test('should render empty state when no data', () => {
            const data = {
                columns: ['id', 'name'],
                rows: []
            };

            adminUI.renderTableData('test_table', data);

            const browser = document.getElementById('database-browser');
            expect(browser.querySelector('.empty-state')).toBeTruthy();
        });

        test('should handle SQL query results', () => {
            const results = [
                { count: 150, table: 'users' },
                { count: 500, table: 'foods' }
            ];

            adminUI.renderSQLResults(results);

            const browser = document.getElementById('database-browser');
            expect(browser.querySelector('table')).toBeTruthy();
            expect(browser.textContent).toContain('150');
            expect(browser.textContent).toContain('users');
        });

        test('should display table structure', () => {
            const structure = [
                { name: 'id', type: 'INTEGER', notnull: 1, pk: 1 },
                { name: 'username', type: 'TEXT', notnull: 1, pk: 0 },
                { name: 'email', type: 'TEXT', notnull: 1, pk: 0 }
            ];

            adminUI.renderTableStructure(structure);

            const browser = document.getElementById('database-browser');
            expect(browser.textContent).toContain('id');
            expect(browser.textContent).toContain('INTEGER');
            expect(browser.textContent).toContain('username');
            expect(browser.textContent).toContain('TEXT');
        });

        test('should show primary key indicator', () => {
            const structure = [
                { name: 'id', type: 'INTEGER', notnull: 1, pk: 1 }
            ];

            adminUI.renderTableStructure(structure);

            const browser = document.getElementById('database-browser');
            expect(browser.querySelector('.primary-key-badge')).toBeTruthy();
        });
    });

    // ============================================
    // FILTERING TESTS
    // ============================================
    describe('Table Filtering', () => {
        test('should filter users by search term', () => {
            const users = [
                { id: 1, username: 'alice', email: 'alice@test.com', is_admin: 0, created_at: '2025-01-01' },
                { id: 2, username: 'bob', email: 'bob@test.com', is_admin: 0, created_at: '2025-01-02' },
                { id: 3, username: 'charlie', email: 'charlie@test.com', is_admin: 0, created_at: '2025-01-03' }
            ];

            adminUI.renderUsersTable(users);
            adminUI.filterTable('users', 'alice');

            const visibleRows = Array.from(document.querySelectorAll('#admin-users-table tbody tr'))
                .filter(row => row.style.display !== 'none');

            expect(visibleRows.length).toBe(1);
            expect(visibleRows[0].textContent).toContain('alice');
        });

        test('should filter foods by name', () => {
            const foods = [
                { id: 1, name: 'Apple', calories: 95, unit: 'g', is_verified: 1 },
                { id: 2, name: 'Banana', calories: 105, unit: 'g', is_verified: 1 },
                { id: 3, name: 'Apple Pie', calories: 237, unit: 'g', is_verified: 1 }
            ];

            adminUI.renderFoodsTable(foods);
            adminUI.filterTable('foods', 'apple');

            const visibleRows = Array.from(document.querySelectorAll('#admin-foods-table tbody tr'))
                .filter(row => row.style.display !== 'none');

            expect(visibleRows.length).toBe(2);
        });

        test('should be case-insensitive', () => {
            const users = [
                { id: 1, username: 'ALICE', email: 'alice@test.com', is_admin: 0, created_at: '2025-01-01' }
            ];

            adminUI.renderUsersTable(users);
            adminUI.filterTable('users', 'alice');

            const visibleRows = Array.from(document.querySelectorAll('#admin-users-table tbody tr'))
                .filter(row => row.style.display !== 'none');

            expect(visibleRows.length).toBe(1);
        });

        test('should show all rows when search is cleared', () => {
            const users = [
                { id: 1, username: 'alice', email: 'alice@test.com', is_admin: 0, created_at: '2025-01-01' },
                { id: 2, username: 'bob', email: 'bob@test.com', is_admin: 0, created_at: '2025-01-02' }
            ];

            adminUI.renderUsersTable(users);
            adminUI.filterTable('users', 'alice');
            adminUI.filterTable('users', '');

            const visibleRows = Array.from(document.querySelectorAll('#admin-users-table tbody tr'))
                .filter(row => row.style.display !== 'none');

            expect(visibleRows.length).toBe(2);
        });
    });

    // ============================================
    // STATE OBSERVER TESTS
    // ============================================
    describe('State Observer', () => {
        test('should update UI on adminData state change', () => {
            const callback = mockStateManager.subscribe.mock.calls[0][0];
            
            mockStateManager.getState.mockReturnValue({
                adminData: {
                    stats: { totalUsers: 200 },
                    users: [],
                    foods: []
                }
            });

            callback('adminData');

            const statsContainer = document.getElementById('admin-stats');
            expect(statsContainer).toBeTruthy();
        });
    });

    // ============================================
    // ERROR HANDLING TESTS
    // ============================================
    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            adminPanel.remove();

            expect(() => {
                adminUI.renderStats({ totalUsers: 100 });
            }).not.toThrow();

            expect(() => {
                adminUI.renderUsersTable([]);
            }).not.toThrow();

            expect(() => {
                adminUI.renderFoodsTable([]);
            }).not.toThrow();
        });

        test('should handle null or undefined data', () => {
            expect(() => {
                adminUI.renderUsersTable(null);
            }).not.toThrow();

            expect(() => {
                adminUI.renderFoodsTable(undefined);
            }).not.toThrow();

            expect(() => {
                adminUI.renderStats(null);
            }).not.toThrow();
        });

        test('should handle malformed table data', () => {
            const invalidData = {
                columns: null,
                rows: [{ id: 1 }]
            };

            expect(() => {
                adminUI.renderTableData('test', invalidData);
            }).not.toThrow();
        });
    });
});
