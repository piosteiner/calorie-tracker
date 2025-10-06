/**
 * ModalUI.js
 * Handles modal dialog creation and display
 */

import { logger } from '../../logger.js';

export class ModalUI {
    constructor() {
        this.activeModals = [];
    }

    /**
     * Show data sources info modal
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
     * Show database toggle info modal
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
     * Close all modals
     */
    closeAllModals() {
        this.activeModals.forEach(modal => {
            if (modal.parentNode) {
                modal.remove();
            }
        });
        this.activeModals = [];
        logger.debug('All modals closed');
    }

    /**
     * Close specific modal by element
     * @param {HTMLElement} modalElement - Modal element to close
     */
    closeModal(modalElement) {
        if (modalElement && modalElement.parentNode) {
            modalElement.remove();
            const index = this.activeModals.indexOf(modalElement);
            if (index > -1) {
                this.activeModals.splice(index, 1);
            }
            logger.debug('Modal closed');
        }
    }

    /**
     * Show custom modal
     * @param {string} title - Modal title
     * @param {string} content - Modal HTML content
     * @param {Array} buttons - Array of button objects {text, class, action}
     * @returns {HTMLElement} Modal element
     */
    showCustomModal(title, content, buttons = []) {
        const modal = document.createElement('div');
        modal.className = 'data-sources-modal';
        
        const buttonsHTML = buttons.map(btn => 
            `<button class="btn ${btn.class || 'btn-primary'}" data-custom-action="${btn.action}">${btn.text}</button>`
        ).join('');

        modal.innerHTML = `
            <div class="modal-overlay" data-action="close-modal"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" data-action="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${buttonsHTML ? `<div class="modal-buttons">${buttonsHTML}</div>` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        this.activeModals.push(modal);
        logger.debug('Custom modal shown:', title);
        
        return modal;
    }

    /**
     * Show table structure modal
     * @param {string} tableName - Table name
     * @param {string} structureHTML - Structure HTML content
     */
    showTableStructureModal(tableName, structureHTML) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = structureHTML;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                const index = this.activeModals.indexOf(overlay);
                if (index > -1) {
                    this.activeModals.splice(index, 1);
                }
            }
        });

        document.body.appendChild(overlay);
        this.activeModals.push(overlay);
        logger.debug('Table structure modal shown:', tableName);
    }

    /**
     * Show edit food modal
     * @param {Object} food - Food object to edit
     * @returns {Promise<Object|null>} Edited food data or null if cancelled
     */
    showEditFoodModal(food) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content edit-food-modal">
                    <h3>Edit Food: ${food.name}</h3>
                    <form id="editFoodForm">
                        <div class="form-group">
                            <label for="editFoodName">Food Name</label>
                            <input type="text" id="editFoodName" value="${food.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editFoodCalories">Calories (per 100g)</label>
                            <input type="number" id="editFoodCalories" value="${food.calories}" required>
                        </div>
                        <div class="modal-buttons">
                            <button type="button" class="btn btn-secondary" data-action="cancel-edit">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            `;

            const form = modal.querySelector('#editFoodForm');
            const cancelBtn = modal.querySelector('[data-action="cancel-edit"]');

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const updatedFood = {
                    id: food.id,
                    name: document.getElementById('editFoodName').value.trim(),
                    calories: parseInt(document.getElementById('editFoodCalories').value)
                };
                modal.remove();
                resolve(updatedFood);
            });

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });

            document.body.appendChild(modal);
            this.activeModals.push(modal);
            logger.debug('Edit food modal shown:', food.name);
        });
    }
}

// Export singleton instance
export const modalUI = new ModalUI();
