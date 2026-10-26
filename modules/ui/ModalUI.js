/**
 * ModalUI.js
 * Handles modal dialog creation and display
 */

import { logger } from '../../logger.js';

export class ModalUI {
    constructor() {
        this.activeModals = []; // { modal, overlay, resolve }
        this._zBase = 1000;

        // Escape closes the top-most modal. One listener for the component's lifetime; it is a
        // no-op when nothing is open.
        this._onKeydown = (event) => {
            if (event.key !== 'Escape' || this.activeModals.length === 0) return;
            this._closeEntry(this.activeModals[this.activeModals.length - 1], null);
        };
        document.addEventListener('keydown', this._onKeydown);
    }

    /**
     * Build the shared, accessible modal shell (overlay + dialog) used by every modal type.
     * @param {string} extraClasses - Additional class(es) for the modal element (e.g. 'custom')
     * @param {string} title - Modal title, rendered in the header and used for aria-labelledby
     * @param {string} bodyHTML - Modal body HTML
     * @returns {{modal: HTMLElement, overlay: HTMLElement, entry: Object}}
     */
    _buildModal(extraClasses, title, bodyHTML) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay overlay-enter';

        const modal = document.createElement('div');
        modal.className = `modal modal-enter ${extraClasses || ''}`.trim();
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-live', 'polite');
        const titleId = `modal-title-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        modal.setAttribute('aria-labelledby', titleId);

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="${titleId}">${title || ''}</h3>
                    <button type="button" class="modal-close" data-action="close-modal" aria-label="Close modal">&times;</button>
                </div>
                <div class="modal-body">${bodyHTML != null ? bodyHTML : ''}</div>
            </div>
        `;

        const z = this._zBase + this.activeModals.length * 20;
        overlay.style.zIndex = String(z);
        modal.style.zIndex = String(z + 10);

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const entry = { modal, overlay, resolve: null };
        this.activeModals.push(entry);

        // Default close affordances (header × and overlay click) resolve with null; callers that
        // need a specific resolution value wire their own buttons separately.
        modal.querySelector('[data-action="close-modal"]')
            ?.addEventListener('click', () => this._closeEntry(entry, null));
        overlay.addEventListener('click', () => this._closeEntry(entry, null));

        // Move focus into the modal so keyboard/AT users land somewhere useful.
        setTimeout(() => {
            modal.querySelector('button, input, [tabindex]')?.focus();
        }, 0);

        return { modal, overlay, entry };
    }

    /**
     * Close a modal entry: play the exit animation, remove it and its overlay, and resolve its
     * promise (if it has one) with the given value.
     */
    _closeEntry(entry, resolveValue) {
        if (!entry) return;
        const { modal, overlay, resolve } = entry;
        modal.classList.add('modal-exit');
        if (modal.parentNode) modal.remove();
        if (overlay && overlay.parentNode) overlay.remove();

        const index = this.activeModals.indexOf(entry);
        if (index > -1) this.activeModals.splice(index, 1);

        if (resolve) resolve(resolveValue);
        logger.debug('Modal closed');
    }

    /**
     * Show data sources info modal (legacy, static/informational - used for the "Data Sources &
     * Attribution" footer link).
     */
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
                        <h4>🗂️ Pios Food Database</h4>
                        <p>Custom curated database of common foods with accurate nutritional information. This is the primary source for food data in this application.</p>
                    </div>
                    
                    <div class="data-source">
                        <h4>🌍 Open Food Facts</h4>
                        <p>When a food is not found in our database, we search <strong>Open Food Facts</strong>, a free, open database of food products from around the world.</p>
                        <p><strong>Data License:</strong> <a href="https://opendatacommons.org/licenses/odbl/1.0/" target="_blank" rel="noopener">Open Database License (ODbL)</a></p>
                        <p><strong>Contributors:</strong> Thousands of volunteers worldwide who scan and upload product information.</p>
                        <p><a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener">Visit Open Food Facts →</a></p>
                    </div>

                    <div class="data-source">
                        <h4>📊 Nutritionix API</h4>
                        <p>For enhanced nutritional information, we may use data from the <strong>Nutritionix API</strong>, which provides detailed macronutrient breakdowns.</p>
                        <p><a href="https://www.nutritionix.com/" target="_blank" rel="noopener">Learn more about Nutritionix →</a></p>
                    </div>

                    <div class="attribution-note">
                        <p><strong>Note:</strong> All food data should be verified before making dietary decisions. Nutritional values may vary by brand, preparation method, and serving size.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModals.push(modal);
        logger.debug('Data sources modal shown');
    }

    /**
     * Show database toggle info modal (legacy, static/informational - explains the local vs
     * enhanced search toggle).
     */
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
                        <h4>Local Database Search</h4>
                        <p>When enabled, searches will <strong>only</strong> look in your Pios Food Database. This is faster and works offline, but may have fewer results.</p>
                        <ul>
                            <li>✅ Faster search results</li>
                            <li>✅ Works offline</li>
                            <li>✅ Curated, accurate data</li>
                            <li>❌ Limited to foods in database</li>
                        </ul>
                    </div>
                    
                    <div class="data-source">
                        <h4>Enhanced Search (Local + External APIs)</h4>
                        <p>When enabled, searches will first look in your local database, then automatically search external APIs like Open Food Facts if no results are found.</p>
                        <ul>
                            <li>✅ Comprehensive results</li>
                            <li>✅ Includes global food products</li>
                            <li>✅ Automatic fallback</li>
                            <li>❌ Requires internet connection</li>
                            <li>❌ Slightly slower</li>
                        </ul>
                    </div>

                    <div class="attribution-note">
                        <p><strong>Recommendation:</strong> Keep enhanced search enabled for the best experience. The app will automatically use cached results when offline.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModals.push(modal);
        logger.debug('Database toggle info modal shown');
    }

    /**
     * Show an interactive modal letting the user pick which data source to search.
     * @returns {Promise<string|null>} 'favorites' | 'database' | 'openfoodfacts', or null if cancelled
     */
    showDataSourcesModal() {
        return new Promise((resolve) => {
            const sources = [
                { key: 'favorites', icon: '⭐', label: 'Favorites', description: 'Search your favorite foods' },
                { key: 'database', icon: '🗂️', label: 'Database', description: 'Search the local database' },
                { key: 'openfoodfacts', icon: '🌍', label: 'Open Food Facts', description: 'Search international food database' }
            ];

            const sourcesHTML = sources.map(source => `
                <button type="button" class="source-option" data-source="${source.key}">
                    <span class="source-icon">${source.icon}</span>
                    <span class="source-label">${source.label}</span>
                    <span class="source-description">${source.description}</span>
                </button>
            `).join('');

            const bodyHTML = `
                <p>Select Data Source</p>
                <div class="data-source-options">${sourcesHTML}</div>
                <div class="modal-buttons">
                    <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                </div>
            `;

            const { modal, entry } = this._buildModal('data-sources', 'Select Data Source', bodyHTML);
            entry.resolve = resolve;

            sources.forEach(source => {
                modal.querySelector(`[data-source="${source.key}"]`)
                    ?.addEventListener('click', () => this._closeEntry(entry, source.key));
            });
            modal.querySelector('[data-action="cancel"]')
                ?.addEventListener('click', () => this._closeEntry(entry, null));

            logger.debug('Data sources modal shown');
        });
    }

    /**
     * Show a summary modal for a database table (name, row count, columns).
     * @param {{name: string, rowCount: number, columns: string[]}} tableInfo
     */
    showDatabaseInfoModal(tableInfo) {
        const info = tableInfo || {};
        const columns = Array.isArray(info.columns) ? info.columns : [];

        const bodyHTML = `
            <p><strong>Table:</strong> ${this.escapeHtml(info.name || '')}</p>
            <p><strong>Rows:</strong> ${info.rowCount ?? 0}</p>
            <p><strong>Columns:</strong></p>
            <ul class="column-list">
                ${columns.map(col => `<li>${this.escapeHtml(col)}</li>`).join('')}
            </ul>
            <div class="modal-buttons">
                <button type="button" class="btn btn-primary" data-action="close">OK</button>
            </div>
        `;

        const { modal, entry } = this._buildModal('database-info', `Table: ${this.escapeHtml(info.name || '')}`, bodyHTML);
        modal.querySelector('[data-action="close"]')
            ?.addEventListener('click', () => this._closeEntry(entry, null));

        logger.debug('Database info modal shown:', info.name);
    }

    /**
     * Escape a string for safe insertion into HTML (used by the newer, data-driven modals).
     */
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        // Iterate a copy since _closeEntry mutates this.activeModals.
        [...this.activeModals].forEach(entry => this._closeEntry(entry, null));
        logger.debug('All modals closed');
    }

    /**
     * Close a modal. With no argument, closes the most recently opened modal.
     * @param {HTMLElement} [modalElement] - Modal element to close
     */
    closeModal(modalElement) {
        const entry = modalElement
            ? this.activeModals.find(e => e.modal === modalElement)
            : this.activeModals[this.activeModals.length - 1];
        this._closeEntry(entry, null);
    }

    /**
     * Show custom modal
     * @param {string} title - Modal title
     * @param {string} content - Modal HTML content
     * @param {Array} buttons - Array of button objects {text, class, action}
     * @returns {Promise<string|null>} The clicked button's action, or null if closed without one
     */
    showCustomModal(title, content, buttons = []) {
        return new Promise((resolve) => {
            const safeButtons = Array.isArray(buttons) ? buttons : [];
            const buttonsHTML = safeButtons.length > 0
                ? safeButtons.map((btn, i) =>
                    `<button type="button" class="btn ${btn?.class || 'btn-primary'}" data-action="${btn?.action ?? `action-${i}`}">${btn?.text ?? ''}</button>`
                ).join('')
                : '<button type="button" class="btn btn-secondary" data-action="close" aria-label="Close">Close</button>';

            const bodyHTML = `
                ${content != null ? content : ''}
                <div class="modal-buttons">${buttonsHTML}</div>
            `;

            const { modal, entry } = this._buildModal('custom', title || '', bodyHTML);
            entry.resolve = resolve;

            const actionButtons = modal.querySelectorAll('.modal-buttons [data-action]');
            actionButtons.forEach(btn => {
                btn.addEventListener('click', () => this._closeEntry(entry, btn.dataset.action));
            });

            logger.debug('Custom modal shown:', title);
        });
    }

    /**
     * Show table structure modal
     * @param {string} tableName - Table name
     * @param {Array<{name: string, type: string, notnull: number, pk: number}>} structure - Column descriptors
     */
    showTableStructureModal(tableName, structure) {
        const columns = Array.isArray(structure) ? structure : [];

        const rowsHTML = columns.map(col => `
            <tr>
                <td>${this.escapeHtml(col?.name)}${col?.pk ? ' <span class="pk-badge">PK</span>' : ''}</td>
                <td>${this.escapeHtml(col?.type)}</td>
                <td>${col?.notnull ? 'NOT NULL' : 'NULL'}</td>
            </tr>
        `).join('');

        const bodyHTML = `
            <table>
                <thead>
                    <tr><th>Column</th><th>Type</th><th>Nullable</th></tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>
        `;

        this._buildModal('table-structure', `Table: ${this.escapeHtml(tableName)}`, bodyHTML);

        logger.debug('Table structure modal shown:', tableName);
    }

    /**
     * Show edit food modal
     * @param {Object} food - Food object to edit
     * @returns {Promise<Object|null>} Edited food data or null if cancelled
     */
    showEditFoodModal(food) {
        return new Promise((resolve) => {
            const safeFood = food || {};
            const bodyHTML = `
                <form id="editFoodForm">
                    <div class="form-group">
                        <label for="editFoodName">Food Name</label>
                        <input type="text" id="editFoodName" name="name" value="${this.escapeHtml(safeFood.name ?? '')}">
                    </div>
                    <div class="form-group">
                        <label for="editFoodCalories">Calories (per 100g)</label>
                        <input type="number" id="editFoodCalories" name="calories" value="${safeFood.calories ?? ''}">
                    </div>
                    <div class="form-group">
                        <label for="editFoodProtein">Protein (g)</label>
                        <input type="number" id="editFoodProtein" name="protein" value="${safeFood.protein ?? ''}">
                    </div>
                    <div class="form-group">
                        <label for="editFoodCarbs">Carbs (g)</label>
                        <input type="number" id="editFoodCarbs" name="carbs" value="${safeFood.carbs ?? ''}">
                    </div>
                    <div class="form-group">
                        <label for="editFoodFat">Fat (g)</label>
                        <input type="number" id="editFoodFat" name="fat" value="${safeFood.fat ?? ''}">
                    </div>
                    <div class="form-group">
                        <label for="editFoodUnit">Unit</label>
                        <input type="text" id="editFoodUnit" name="unit" value="${this.escapeHtml(safeFood.unit ?? '')}">
                    </div>
                    <div class="modal-buttons">
                        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary" data-action="save">Save Changes</button>
                    </div>
                </form>
            `;

            const { modal, entry } = this._buildModal('edit-food', `Edit Food: ${this.escapeHtml(safeFood.name ?? '')}`, bodyHTML);
            entry.resolve = resolve;

            const form = modal.querySelector('#editFoodForm');
            const nameInput = modal.querySelector('input[name="name"]');
            const caloriesInput = modal.querySelector('input[name="calories"]');

            const trySave = () => {
                const name = nameInput.value.trim();
                const calories = caloriesInput.value;
                if (!name || calories === '') {
                    // Required fields missing: keep the modal open rather than resolving.
                    return;
                }
                this._closeEntry(entry, {
                    id: safeFood.id,
                    name,
                    calories: parseFloat(calories),
                    protein: parseFloat(modal.querySelector('input[name="protein"]').value) || 0,
                    carbs: parseFloat(modal.querySelector('input[name="carbs"]').value) || 0,
                    fat: parseFloat(modal.querySelector('input[name="fat"]').value) || 0,
                    unit: modal.querySelector('input[name="unit"]').value
                });
            };

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                trySave();
            });
            modal.querySelector('[data-action="save"]').addEventListener('click', (e) => {
                e.preventDefault();
                trySave();
            });
            modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                this._closeEntry(entry, null);
            });

            logger.debug('Edit food modal shown:', safeFood.name);
        });
    }
}

// Export singleton instance
export const modalUI = new ModalUI();
