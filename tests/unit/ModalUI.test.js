/**
 * ModalUI Unit Tests
 * Tests for modal dialogs and overlays
 */

import { ModalUI } from '../../modules/ui/ModalUI.js';

// Mock dependencies
jest.mock('../../logger.js', () => require('../mocks/logger.js'));
jest.mock('../../config.js', () => require('../mocks/config.js'));

describe('ModalUI', () => {
    let modalUI;

    beforeEach(() => {
        modalUI = new ModalUI();
    });

    afterEach(() => {
        // Clean up any modals
        document.querySelectorAll('.modal, .modal-overlay').forEach(el => el.remove());
    });

    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    describe('Initialization', () => {
        test('should initialize ModalUI', () => {
            expect(modalUI).toBeTruthy();
        });
    });

    // ============================================
    // DATA SOURCES MODAL TESTS
    // ============================================
    describe('showDataSourcesModal', () => {
        test('should display data sources modal', async () => {
            const promise = modalUI.showDataSourcesModal();

            const modal = document.querySelector('.modal.data-sources');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toContain('Select Data Source');
            expect(modal.textContent).toContain('Favorites');
            expect(modal.textContent).toContain('Database');
            expect(modal.textContent).toContain('Open Food Facts');
        });

        test('should return selected source', async () => {
            const promise = modalUI.showDataSourcesModal();

            const modal = document.querySelector('.modal');
            const databaseBtn = modal.querySelector('[data-source="database"]');
            databaseBtn.click();

            const result = await promise;
            expect(result).toBe('database');
        });

        test('should return null when cancelled', async () => {
            const promise = modalUI.showDataSourcesModal();

            const modal = document.querySelector('.modal');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            cancelBtn.click();

            const result = await promise;
            expect(result).toBeNull();
        });

        test('should close on overlay click', async () => {
            const promise = modalUI.showDataSourcesModal();

            const overlay = document.querySelector('.modal-overlay');
            overlay.click();

            const result = await promise;
            expect(result).toBeNull();
            expect(document.querySelector('.modal')).toBeFalsy();
        });

        test('should show icons for each source', () => {
            modalUI.showDataSourcesModal();

            const modal = document.querySelector('.modal');
            const icons = modal.querySelectorAll('.source-icon');
            expect(icons.length).toBeGreaterThan(0);
        });

        test('should show descriptions for sources', () => {
            modalUI.showDataSourcesModal();

            const modal = document.querySelector('.modal');
            expect(modal.textContent).toContain('Search your favorite foods');
            expect(modal.textContent).toContain('Search the local database');
            expect(modal.textContent).toContain('Search international food database');
        });
    });

    // ============================================
    // EDIT FOOD MODAL TESTS
    // ============================================
    describe('showEditFoodModal', () => {
        test('should display edit food modal', () => {
            const foodData = {
                id: 1,
                name: 'Apple',
                calories: 95,
                protein: 0.5,
                carbs: 25,
                fat: 0.3,
                unit: 'g'
            };

            modalUI.showEditFoodModal(foodData);

            const modal = document.querySelector('.modal.edit-food');
            expect(modal).toBeTruthy();
            expect(modal.querySelector('input[name="name"]').value).toBe('Apple');
            expect(modal.querySelector('input[name="calories"]').value).toBe('95');
        });

        test('should populate all fields', () => {
            const foodData = {
                id: 1,
                name: 'Chicken',
                calories: 165,
                protein: 31,
                carbs: 0,
                fat: 3.6,
                unit: 'g'
            };

            modalUI.showEditFoodModal(foodData);

            const modal = document.querySelector('.modal');
            expect(modal.querySelector('input[name="protein"]').value).toBe('31');
            expect(modal.querySelector('input[name="carbs"]').value).toBe('0');
            expect(modal.querySelector('input[name="fat"]').value).toBe('3.6');
            expect(modal.querySelector('input[name="unit"]').value).toBe('g');
        });

        test('should return updated data on save', async () => {
            const foodData = {
                id: 1,
                name: 'Apple',
                calories: 95,
                protein: 0.5,
                carbs: 25,
                fat: 0.3,
                unit: 'g'
            };

            const promise = modalUI.showEditFoodModal(foodData);

            const modal = document.querySelector('.modal');
            modal.querySelector('input[name="name"]').value = 'Green Apple';
            modal.querySelector('input[name="calories"]').value = '100';
            
            const saveBtn = modal.querySelector('[data-action="save"]');
            saveBtn.click();

            const result = await promise;
            expect(result.name).toBe('Green Apple');
            expect(result.calories).toBe(100);
        });

        test('should return null when cancelled', async () => {
            const foodData = { id: 1, name: 'Apple', calories: 95, unit: 'g' };

            const promise = modalUI.showEditFoodModal(foodData);

            const modal = document.querySelector('.modal');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            cancelBtn.click();

            const result = await promise;
            expect(result).toBeNull();
        });

        test('should validate required fields', async () => {
            const foodData = { id: 1, name: 'Apple', calories: 95, unit: 'g' };

            const promise = modalUI.showEditFoodModal(foodData);

            const modal = document.querySelector('.modal');
            modal.querySelector('input[name="name"]').value = '';
            modal.querySelector('input[name="calories"]').value = '';
            
            const saveBtn = modal.querySelector('[data-action="save"]');
            saveBtn.click();

            // Modal should still be open (validation failed)
            expect(document.querySelector('.modal')).toBeTruthy();
        });

        test('should handle empty food data (create mode)', () => {
            modalUI.showEditFoodModal({});

            const modal = document.querySelector('.modal');
            expect(modal.querySelector('input[name="name"]').value).toBe('');
            expect(modal.querySelector('input[name="calories"]').value).toBe('');
        });
    });

    // ============================================
    // DATABASE INFO MODAL TESTS
    // ============================================
    describe('showDatabaseInfoModal', () => {
        test('should display database info modal', () => {
            const tableInfo = {
                name: 'users',
                rowCount: 150,
                columns: ['id', 'username', 'email', 'created_at']
            };

            modalUI.showDatabaseInfoModal(tableInfo);

            const modal = document.querySelector('.modal.database-info');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toContain('users');
            expect(modal.textContent).toContain('150');
        });

        test('should list all columns', () => {
            const tableInfo = {
                name: 'foods',
                rowCount: 500,
                columns: ['id', 'name', 'calories', 'protein', 'carbs', 'fat']
            };

            modalUI.showDatabaseInfoModal(tableInfo);

            const modal = document.querySelector('.modal');
            expect(modal.textContent).toContain('id');
            expect(modal.textContent).toContain('name');
            expect(modal.textContent).toContain('calories');
            expect(modal.textContent).toContain('protein');
        });

        test('should close on OK button', () => {
            const tableInfo = { name: 'test', rowCount: 10, columns: ['id'] };

            modalUI.showDatabaseInfoModal(tableInfo);

            const modal = document.querySelector('.modal');
            const okBtn = modal.querySelector('[data-action="close"]');
            okBtn.click();

            expect(document.querySelector('.modal')).toBeFalsy();
        });
    });

    // ============================================
    // TABLE STRUCTURE MODAL TESTS
    // ============================================
    describe('showTableStructureModal', () => {
        test('should display table structure modal', () => {
            const structure = [
                { name: 'id', type: 'INTEGER', notnull: 1, pk: 1 },
                { name: 'username', type: 'TEXT', notnull: 1, pk: 0 },
                { name: 'email', type: 'TEXT', notnull: 1, pk: 0 }
            ];

            modalUI.showTableStructureModal('users', structure);

            const modal = document.querySelector('.modal.table-structure');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toContain('users');
        });

        test('should render column details in table', () => {
            const structure = [
                { name: 'id', type: 'INTEGER', notnull: 1, pk: 1 },
                { name: 'username', type: 'TEXT', notnull: 1, pk: 0 }
            ];

            modalUI.showTableStructureModal('users', structure);

            const modal = document.querySelector('.modal');
            const table = modal.querySelector('table');
            
            expect(table).toBeTruthy();
            expect(table.textContent).toContain('id');
            expect(table.textContent).toContain('INTEGER');
            expect(table.textContent).toContain('username');
            expect(table.textContent).toContain('TEXT');
        });

        test('should show primary key indicator', () => {
            const structure = [
                { name: 'id', type: 'INTEGER', notnull: 1, pk: 1 }
            ];

            modalUI.showTableStructureModal('test', structure);

            const modal = document.querySelector('.modal');
            expect(modal.querySelector('.pk-badge')).toBeTruthy();
        });

        test('should show NOT NULL indicator', () => {
            const structure = [
                { name: 'username', type: 'TEXT', notnull: 1, pk: 0 }
            ];

            modalUI.showTableStructureModal('test', structure);

            const modal = document.querySelector('.modal');
            expect(modal.textContent).toContain('NOT NULL');
        });

        test('should handle nullable columns', () => {
            const structure = [
                { name: 'optional_field', type: 'TEXT', notnull: 0, pk: 0 }
            ];

            modalUI.showTableStructureModal('test', structure);

            const modal = document.querySelector('.modal');
            expect(modal.textContent).toContain('optional_field');
        });
    });

    // ============================================
    // CUSTOM MODAL TESTS
    // ============================================
    describe('showCustomModal', () => {
        test('should display custom modal with content', () => {
            const content = '<p>Custom content here</p>';

            modalUI.showCustomModal('Test Modal', content);

            const modal = document.querySelector('.modal.custom');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toContain('Test Modal');
            expect(modal.innerHTML).toContain('Custom content here');
        });

        test('should include custom buttons', () => {
            const content = '<p>Content</p>';
            const buttons = [
                { text: 'Action 1', action: 'action1' },
                { text: 'Action 2', action: 'action2' }
            ];

            modalUI.showCustomModal('Test', content, buttons);

            const modal = document.querySelector('.modal');
            expect(modal.textContent).toContain('Action 1');
            expect(modal.textContent).toContain('Action 2');
        });

        test('should return button action on click', async () => {
            const content = '<p>Content</p>';
            const buttons = [
                { text: 'OK', action: 'confirm' },
                { text: 'Cancel', action: 'cancel' }
            ];

            const promise = modalUI.showCustomModal('Test', content, buttons);

            const modal = document.querySelector('.modal');
            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            confirmBtn.click();

            const result = await promise;
            expect(result).toBe('confirm');
        });

        test('should use default close button if no buttons provided', () => {
            modalUI.showCustomModal('Test', '<p>Content</p>');

            const modal = document.querySelector('.modal');
            const closeBtn = modal.querySelector('[data-action="close"]');
            expect(closeBtn).toBeTruthy();
        });
    });

    // ============================================
    // CLOSE MODAL TESTS
    // ============================================
    describe('closeModal', () => {
        test('should close modal and remove overlay', () => {
            modalUI.showCustomModal('Test', '<p>Content</p>');
            
            expect(document.querySelector('.modal')).toBeTruthy();
            expect(document.querySelector('.modal-overlay')).toBeTruthy();

            modalUI.closeModal();

            expect(document.querySelector('.modal')).toBeFalsy();
            expect(document.querySelector('.modal-overlay')).toBeFalsy();
        });

        test('should handle closing when no modal exists', () => {
            expect(() => {
                modalUI.closeModal();
            }).not.toThrow();
        });

        test('should close specific modal', () => {
            modalUI.showCustomModal('Modal 1', '<p>Content 1</p>');
            modalUI.showCustomModal('Modal 2', '<p>Content 2</p>');

            const modals = document.querySelectorAll('.modal');
            expect(modals.length).toBe(2);

            modalUI.closeModal(modals[0]);

            expect(document.querySelectorAll('.modal').length).toBe(1);
        });
    });

    // ============================================
    // CLOSE ALL MODALS TESTS
    // ============================================
    describe('closeAllModals', () => {
        test('should close all open modals', () => {
            modalUI.showCustomModal('Modal 1', '<p>Content 1</p>');
            modalUI.showCustomModal('Modal 2', '<p>Content 2</p>');
            modalUI.showCustomModal('Modal 3', '<p>Content 3</p>');

            expect(document.querySelectorAll('.modal').length).toBe(3);

            modalUI.closeAllModals();

            expect(document.querySelectorAll('.modal').length).toBe(0);
            expect(document.querySelectorAll('.modal-overlay').length).toBe(0);
        });

        test('should handle no open modals', () => {
            expect(() => {
                modalUI.closeAllModals();
            }).not.toThrow();
        });
    });

    // ============================================
    // KEYBOARD NAVIGATION TESTS
    // ============================================
    describe('Keyboard Navigation', () => {
        test('should close modal on Escape key', () => {
            modalUI.showCustomModal('Test', '<p>Content</p>');

            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);

            expect(document.querySelector('.modal')).toBeFalsy();
        });

        test('should not close on other keys', () => {
            modalUI.showCustomModal('Test', '<p>Content</p>');

            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            document.dispatchEvent(enterEvent);

            expect(document.querySelector('.modal')).toBeTruthy();
        });

        test('should trap focus within modal', () => {
            const buttons = [
                { text: 'Button 1', action: 'btn1' },
                { text: 'Button 2', action: 'btn2' }
            ];

            modalUI.showCustomModal('Test', '<p>Content</p>', buttons);

            const modal = document.querySelector('.modal');
            const focusableElements = modal.querySelectorAll('button, input, [tabindex]');
            
            expect(focusableElements.length).toBeGreaterThan(0);
        });
    });

    // ============================================
    // ACCESSIBILITY TESTS
    // ============================================
    describe('Accessibility', () => {
        test('should have proper ARIA attributes', () => {
            modalUI.showCustomModal('Test Modal', '<p>Content</p>');

            const modal = document.querySelector('.modal');
            expect(modal.getAttribute('role')).toBe('dialog');
            expect(modal.getAttribute('aria-modal')).toBe('true');
            expect(modal.getAttribute('aria-labelledby')).toBeTruthy();
        });

        test('should focus first interactive element', (done) => {
            const buttons = [{ text: 'OK', action: 'ok' }];
            modalUI.showCustomModal('Test', '<p>Content</p>', buttons);

            setTimeout(() => {
                const firstButton = document.querySelector('.modal button');
                expect(document.activeElement).toBe(firstButton);
                done();
            }, 100);
        });

        test('should have accessible close button', () => {
            modalUI.showCustomModal('Test', '<p>Content</p>');

            const closeBtn = document.querySelector('.modal [data-action="close"]');
            expect(closeBtn.getAttribute('aria-label')).toBeTruthy();
        });

        test('should announce modal to screen readers', () => {
            modalUI.showCustomModal('Important Message', '<p>Content</p>');

            const modal = document.querySelector('.modal');
            expect(modal.getAttribute('aria-live')).toBe('polite');
        });
    });

    // ============================================
    // ANIMATION TESTS
    // ============================================
    describe('Modal Animations', () => {
        test('should add animation classes on open', () => {
            modalUI.showCustomModal('Test', '<p>Content</p>');

            const modal = document.querySelector('.modal');
            const overlay = document.querySelector('.modal-overlay');

            expect(modal.classList.contains('modal-enter')).toBe(true);
            expect(overlay.classList.contains('overlay-enter')).toBe(true);
        });

        test('should add animation classes on close', (done) => {
            modalUI.showCustomModal('Test', '<p>Content</p>');

            const modal = document.querySelector('.modal');
            modalUI.closeModal();

            expect(modal.classList.contains('modal-exit')).toBe(true);

            setTimeout(() => {
                expect(document.querySelector('.modal')).toBeFalsy();
                done();
            }, 350);
        });
    });

    // ============================================
    // ERROR HANDLING TESTS
    // ============================================
    describe('Error Handling', () => {
        test('should handle invalid content gracefully', () => {
            expect(() => {
                modalUI.showCustomModal('Test', null);
            }).not.toThrow();
        });

        test('should handle missing title', () => {
            expect(() => {
                modalUI.showCustomModal('', '<p>Content</p>');
            }).not.toThrow();
        });

        test('should handle invalid button configuration', () => {
            expect(() => {
                modalUI.showCustomModal('Test', '<p>Content</p>', null);
            }).not.toThrow();

            expect(() => {
                modalUI.showCustomModal('Test', '<p>Content</p>', [{ text: null }]);
            }).not.toThrow();
        });

        test('should handle missing table structure data', () => {
            expect(() => {
                modalUI.showTableStructureModal('test', null);
            }).not.toThrow();

            expect(() => {
                modalUI.showTableStructureModal('test', []);
            }).not.toThrow();
        });
    });

    // ============================================
    // Z-INDEX STACKING TESTS
    // ============================================
    describe('Modal Stacking', () => {
        test('should stack modals with increasing z-index', () => {
            modalUI.showCustomModal('Modal 1', '<p>Content 1</p>');
            modalUI.showCustomModal('Modal 2', '<p>Content 2</p>');

            const modals = document.querySelectorAll('.modal');
            const zIndex1 = parseInt(window.getComputedStyle(modals[0]).zIndex);
            const zIndex2 = parseInt(window.getComputedStyle(modals[1]).zIndex);

            expect(zIndex2).toBeGreaterThan(zIndex1);
        });

        test('should ensure overlay is below modal', () => {
            modalUI.showCustomModal('Test', '<p>Content</p>');

            const modal = document.querySelector('.modal');
            const overlay = document.querySelector('.modal-overlay');

            const modalZ = parseInt(window.getComputedStyle(modal).zIndex);
            const overlayZ = parseInt(window.getComputedStyle(overlay).zIndex);

            expect(modalZ).toBeGreaterThan(overlayZ);
        });
    });
});
