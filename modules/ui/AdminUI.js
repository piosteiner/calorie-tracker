/**
 * AdminUI.js
 * Handles admin panel rendering and displays
 */

import { logger } from '../../logger.js';

export class AdminUI {
    constructor() {
        this.currentSection = 'Stats';
    }

    /**
     * Render admin statistics
     * @param {Object} stats - Statistics object
     */
    renderStats(stats) {
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('totalFoods').textContent = stats.totalFoods || 0;
        document.getElementById('totalLogs').textContent = stats.totalLogs || 0;
        document.getElementById('todaysLogs').textContent = stats.todaysLogs || 0;
        document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
        
        logger.debug('Admin stats rendered');
    }

    /**
     * Render users list
     * @param {Array} users - Array of user objects
     */
    renderUsers(users) {
        const usersList = document.getElementById('adminUsersList');
        if (!usersList) {
            logger.warn('Admin users list element not found');
            return;
        }

        if (users.length === 0) {
            usersList.innerHTML = '<tr><td colspan="6" class="empty-message">No users found</td></tr>';
            return;
        }

        usersList.innerHTML = users.map(user => `
            <tr>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>${this.escapeHtml(user.role)}</td>
                <td>${user.totalLogs || 0}</td>
                <td>${user.lastLogin || 'Never'}</td>
                <td>
                    <button class="btn btn-small" data-action="reset-user-password" data-user-id="${user.id}">Reset Password</button>
                    <button class="btn btn-small btn-danger" data-action="delete-user" data-user-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        logger.debug('Admin users rendered:', users.length, 'users');
    }

    /**
     * Render foods list
     * @param {Array} foods - Array of food objects
     * @param {Object} sortOptions - Sort column and direction
     * @param {Set} selectedFoodIds - Set of selected food IDs
     */
    renderFoods(foods, sortOptions, selectedFoodIds) {
        const foodsList = document.getElementById('adminFoodsList');
        if (!foodsList) {
            logger.warn('Admin foods list element not found');
            return;
        }

        if (foods.length === 0) {
            foodsList.innerHTML = '<tr><td colspan="7" class="empty-message">No foods found</td></tr>';
            return;
        }

        // Sort foods
        const sortedFoods = this.sortFoods(foods, sortOptions.foodsSortColumn, sortOptions.foodsSortDirection);

        foodsList.innerHTML = sortedFoods.map(food => {
            const isSelected = selectedFoodIds.has(food.id);
            return `
            <tr>
                <td>
                    <input type="checkbox" 
                           class="food-checkbox" 
                           data-food-id="${food.id}"
                           ${isSelected ? 'checked' : ''}
                           data-action="toggle-food-selection">
                </td>
                <td>${this.escapeHtml(food.name)}</td>
                <td>${food.calories}</td>
                <td>${food.usage_count || 0}</td>
                <td>
                    <button class="btn btn-small" data-action="edit-food" data-food-id="${food.id}">Edit</button>
                    <button class="btn btn-small btn-danger" data-action="delete-food" data-food-id="${food.id}">Delete</button>
                </td>
            </tr>
        `;
        }).join('');

        // Update sort indicators
        this.updateSortIndicators(sortOptions.foodsSortColumn, sortOptions.foodsSortDirection);

        logger.debug('Admin foods rendered:', foods.length, 'foods');
    }

    /**
     * Sort foods array
     * @param {Array} foods - Foods to sort
     * @param {string} column - Column to sort by
     * @param {string} direction - 'asc' or 'desc'
     * @returns {Array} Sorted foods
     */
    sortFoods(foods, column, direction) {
        const sorted = [...foods].sort((a, b) => {
            let aVal, bVal;

            switch (column) {
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    break;
                case 'calories':
                    aVal = a.calories || 0;
                    bVal = b.calories || 0;
                    break;
                case 'usage':
                    aVal = a.usage_count || 0;
                    bVal = b.usage_count || 0;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }

    /**
     * Update sort indicators in table headers
     * @param {string} column - Current sort column
     * @param {string} direction - Current sort direction
     */
    updateSortIndicators(column, direction) {
        // Remove all existing indicators
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        // Add indicator to current column
        const columnMap = {
            'name': 'name',
            'calories': 'calories',
            'usage': 'usage'
        };

        const headerElement = document.querySelector(`[data-column="${columnMap[column]}"]`);
        if (headerElement) {
            headerElement.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }

    /**
     * Render database tables
     * @param {Array} tables - Array of table objects
     */
    renderDatabaseTables(tables) {
        const tablesList = document.getElementById('dbTablesList');
        if (!tablesList) {
            logger.warn('Database tables list element not found');
            return;
        }

        if (tables.length === 0) {
            tablesList.innerHTML = '<tr><td colspan="4" class="empty-message">No tables found</td></tr>';
            return;
        }

        tablesList.innerHTML = tables.map(table => `
            <tr>
                <td>${this.escapeHtml(table.table_name)}</td>
                <td>${table.row_count || 0}</td>
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

        logger.debug('Database tables rendered:', tables.length, 'tables');
    }

    /**
     * Render table data browser
     * @param {string} tableName - Table name
     * @param {Object} data - Table data with columns and rows
     */
    renderTableBrowser(tableName, data) {
        const browserDiv = document.getElementById('tableBrowser');
        if (!browserDiv) {
            logger.warn('Table browser element not found');
            return;
        }

        browserDiv.classList.add('active');

        const tableNameEl = document.getElementById('currentTableName');
        if (tableNameEl) {
            tableNameEl.textContent = tableName;
        }

        const tableDataEl = document.getElementById('tableData');
        if (!tableDataEl) return;

        if (!data.rows || data.rows.length === 0) {
            tableDataEl.innerHTML = '<p class="empty-message">No data found in this table</p>';
            return;
        }

        // Create table HTML
        const headers = data.columns || Object.keys(data.rows[0] || {});
        const headerHTML = headers.map(col => `<th>${this.escapeHtml(col)}</th>`).join('');
        const rowsHTML = data.rows.map(row => {
            const cellsHTML = headers.map(col => {
                const value = row[col];
                const displayValue = value === null ? '<em>NULL</em>' : this.escapeHtml(String(value));
                return `<td>${displayValue}</td>`;
            }).join('');
            return `<tr>${cellsHTML}</tr>`;
        }).join('');

        tableDataEl.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>${headerHTML}</tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>
        `;

        logger.debug('Table browser rendered:', tableName, data.rows.length, 'rows');
    }

    /**
     * Render table structure modal
     * @param {string} tableName - Table name
     * @param {Array} columns - Array of column objects
     * @returns {string} HTML string for modal
     */
    renderTableStructure(tableName, columns) {
        const columnsHTML = columns.map((col, index) => `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${this.escapeHtml(col.name)}</strong></td>
                <td>${this.escapeHtml(col.type)}</td>
                <td>${col.notnull ? 'YES' : 'NO'}</td>
                <td>${col.dflt_value !== null ? this.escapeHtml(String(col.dflt_value)) : '<em>NULL</em>'}</td>
                <td>${col.pk ? '🔑 PRIMARY KEY' : ''}</td>
            </tr>
        `).join('');

        return `
            <div class="structure-modal">
                <h4>Table Structure: ${this.escapeHtml(tableName)}</h4>
                <table class="structure-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Not Null</th>
                            <th>Default</th>
                            <th>Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${columnsHTML}
                    </tbody>
                </table>
                <button data-action="close-structure-modal" class="btn btn-secondary">Close</button>
            </div>
        `;
    }

    /**
     * Render SQL query results
     * @param {Object} result - Query result
     */
    renderSQLQueryResults(result) {
        const resultsEl = document.getElementById('sqlResults');
        if (!resultsEl) {
            logger.warn('SQL results element not found');
            return;
        }

        if (result.error) {
            resultsEl.innerHTML = `<div class="error-message">Error: ${this.escapeHtml(result.error)}</div>`;
            return;
        }

        if (!result.rows || result.rows.length === 0) {
            resultsEl.innerHTML = `<div class="info-message">Query executed successfully. ${result.changes || 0} row(s) affected.</div>`;
            return;
        }

        // Create results table
        const headers = Object.keys(result.rows[0] || {});
        const headerHTML = headers.map(col => `<th>${this.escapeHtml(col)}</th>`).join('');
        const rowsHTML = result.rows.map(row => {
            const cellsHTML = headers.map(col => {
                const value = row[col];
                const displayValue = value === null ? '<em>NULL</em>' : this.escapeHtml(String(value));
                return `<td>${displayValue}</td>`;
            }).join('');
            return `<tr>${cellsHTML}</tr>`;
        }).join('');

        resultsEl.innerHTML = `
            <div class="success-message">${result.rows.length} row(s) returned</div>
            <table class="data-table">
                <thead>
                    <tr>${headerHTML}</tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>
        `;

        logger.debug('SQL query results rendered:', result.rows.length, 'rows');
    }

    /**
     * Format bytes to human-readable size
     * @param {number} bytes - Bytes
     * @returns {string} Formatted size
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Show admin section
     * @param {string} sectionName - Section name
     */
    showAdminSection(sectionName) {
        this.currentSection = sectionName;

        // Hide all admin subsections
        document.querySelectorAll('.admin-subsection').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav buttons
        document.querySelectorAll('.admin-nav button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`admin${sectionName}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Highlight active nav button
        const activeBtn = document.querySelector(`[data-action="show-admin-section"][data-section="${sectionName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        logger.debug('Admin section shown:', sectionName);
    }

    /**
     * Update bulk selection UI
     * @param {Set} selectedFoodIds - Selected food IDs
     * @param {number} totalFoods - Total number of foods
     */
    updateBulkSelectionUI(selectedFoodIds, totalFoods) {
        const bulkDeleteBtn = document.querySelector('[data-action="bulk-delete-foods"]');
        const selectAllCheckbox = document.querySelector('[data-action="toggle-select-all"]');

        if (bulkDeleteBtn) {
            bulkDeleteBtn.disabled = selectedFoodIds.size === 0;
            bulkDeleteBtn.textContent = selectedFoodIds.size > 0 
                ? `Delete Selected (${selectedFoodIds.size})` 
                : 'Delete Selected';
        }

        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedFoodIds.size === totalFoods && totalFoods > 0;
            selectAllCheckbox.indeterminate = selectedFoodIds.size > 0 && selectedFoodIds.size < totalFoods;
        }

        logger.debug('Bulk selection UI updated:', selectedFoodIds.size, '/', totalFoods);
    }
}

// Export singleton instance
export const adminUI = new AdminUI();
