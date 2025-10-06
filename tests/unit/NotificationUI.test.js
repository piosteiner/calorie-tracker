/**
 * NotificationUI Unit Tests
 * Tests for user notifications, modals, and feedback
 */

import { NotificationUI } from '../../modules/ui/NotificationUI.js';

// Mock dependencies
jest.mock('../../logger.js', () => require('../mocks/logger.js'));
jest.mock('../../config.js', () => require('../mocks/config.js'));

describe('NotificationUI', () => {
    let notificationUI;
    let container;

    beforeEach(() => {
        notificationUI = new NotificationUI();
        
        // Setup DOM container for messages
        container = document.createElement('div');
        container.id = 'message-container';
        document.body.appendChild(container);
    });

    afterEach(() => {
        container?.remove();
        // Clean up any lingering toasts or modals
        document.querySelectorAll('.toast, .modal').forEach(el => el.remove());
    });

    // ============================================
    // SHOW MESSAGE TESTS
    // ============================================
    describe('showMessage', () => {
        test('should display success message', () => {
            notificationUI.showMessage('Operation successful', 'success');

            const messageEl = container.firstChild;
            expect(messageEl).toBeTruthy();
            expect(messageEl.textContent).toContain('Operation successful');
            expect(messageEl.className).toContain('success');
        });

        test('should display error message', () => {
            notificationUI.showMessage('Operation failed', 'error');

            const messageEl = container.firstChild;
            expect(messageEl.className).toContain('error');
        });

        test('should default to info message type', () => {
            notificationUI.showMessage('Information');

            const messageEl = container.firstChild;
            expect(messageEl.className).toContain('info');
        });

        test('should auto-dismiss message after timeout', (done) => {
            jest.useFakeTimers();
            
            notificationUI.showMessage('Test message', 'success');
            expect(container.children.length).toBe(1);

            jest.advanceTimersByTime(3500);

            setTimeout(() => {
                expect(container.children.length).toBe(0);
                jest.useRealTimers();
                done();
            }, 100);
        });

        test('should not auto-dismiss error messages', (done) => {
            jest.useFakeTimers();
            
            notificationUI.showMessage('Error message', 'error');
            expect(container.children.length).toBe(1);

            jest.advanceTimersByTime(5000);

            setTimeout(() => {
                expect(container.children.length).toBe(1);
                jest.useRealTimers();
                done();
            }, 100);
        });

        test('should allow manual dismissal with close button', () => {
            notificationUI.showMessage('Test message', 'success');

            const closeBtn = container.querySelector('.close-message');
            closeBtn.click();

            expect(container.children.length).toBe(0);
        });

        test('should stack multiple messages', () => {
            notificationUI.showMessage('Message 1', 'success');
            notificationUI.showMessage('Message 2', 'info');
            notificationUI.showMessage('Message 3', 'warning');

            expect(container.children.length).toBe(3);
        });
    });

    // ============================================
    // SHOW TOAST TESTS
    // ============================================
    describe('showToast', () => {
        test('should display toast message', () => {
            notificationUI.showToast('Toast notification');

            const toast = document.querySelector('.toast');
            expect(toast).toBeTruthy();
            expect(toast.textContent).toContain('Toast notification');
        });

        test('should position toast at specified location', () => {
            notificationUI.showToast('Toast', 'bottom-right');

            const toast = document.querySelector('.toast');
            expect(toast.style.bottom).toBeTruthy();
            expect(toast.style.right).toBeTruthy();
        });

        test('should auto-dismiss toast after duration', (done) => {
            jest.useFakeTimers();
            
            notificationUI.showToast('Toast', 'top-right', 1000);
            expect(document.querySelectorAll('.toast').length).toBe(1);

            jest.advanceTimersByTime(1500);

            setTimeout(() => {
                expect(document.querySelectorAll('.toast').length).toBe(0);
                jest.useRealTimers();
                done();
            }, 100);
        });

        test('should stack multiple toasts', () => {
            notificationUI.showToast('Toast 1');
            notificationUI.showToast('Toast 2');

            expect(document.querySelectorAll('.toast').length).toBe(2);
        });
    });

    // ============================================
    // SHOW CONFIRMATION TESTS
    // ============================================
    describe('showConfirmation', () => {
        test('should display confirmation modal', async () => {
            const promise = notificationUI.showConfirmation('Are you sure?');

            const modal = document.querySelector('.modal');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toContain('Are you sure?');

            // Click confirm
            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            confirmBtn.click();

            const result = await promise;
            expect(result).toBe(true);
        });

        test('should return false when cancelled', async () => {
            const promise = notificationUI.showConfirmation('Delete item?');

            const modal = document.querySelector('.modal');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            cancelBtn.click();

            const result = await promise;
            expect(result).toBe(false);
        });

        test('should use custom button text', async () => {
            notificationUI.showConfirmation('Continue?', 'Yes', 'No');

            const modal = document.querySelector('.modal');
            expect(modal.textContent).toContain('Yes');
            expect(modal.textContent).toContain('No');
        });

        test('should close modal when clicking overlay', async () => {
            const promise = notificationUI.showConfirmation('Confirm?');

            const overlay = document.querySelector('.modal-overlay');
            overlay.click();

            const result = await promise;
            expect(result).toBe(false);
            expect(document.querySelector('.modal')).toBeFalsy();
        });
    });

    // ============================================
    // SHOW PROMPT TESTS
    // ============================================
    describe('showPrompt', () => {
        test('should display prompt modal with input', async () => {
            const promise = notificationUI.showPrompt('Enter name:');

            const modal = document.querySelector('.modal');
            const input = modal.querySelector('input');
            
            expect(modal).toBeTruthy();
            expect(input).toBeTruthy();
            expect(modal.textContent).toContain('Enter name:');

            input.value = 'John';
            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            confirmBtn.click();

            const result = await promise;
            expect(result).toBe('John');
        });

        test('should return null when cancelled', async () => {
            const promise = notificationUI.showPrompt('Enter value:');

            const modal = document.querySelector('.modal');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            cancelBtn.click();

            const result = await promise;
            expect(result).toBeNull();
        });

        test('should use default value', async () => {
            notificationUI.showPrompt('Enter name:', 'Default Name');

            const input = document.querySelector('.modal input');
            expect(input.value).toBe('Default Name');
        });

        test('should return null for empty input', async () => {
            const promise = notificationUI.showPrompt('Enter value:');

            const modal = document.querySelector('.modal');
            const input = modal.querySelector('input');
            input.value = '';
            
            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            confirmBtn.click();

            const result = await promise;
            expect(result).toBeNull();
        });

        test('should trim whitespace from input', async () => {
            const promise = notificationUI.showPrompt('Enter value:');

            const modal = document.querySelector('.modal');
            const input = modal.querySelector('input');
            input.value = '  test value  ';
            
            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            confirmBtn.click();

            const result = await promise;
            expect(result).toBe('test value');
        });

        test('should submit on Enter key', async () => {
            const promise = notificationUI.showPrompt('Enter value:');

            const input = document.querySelector('.modal input');
            input.value = 'test';
            
            const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
            input.dispatchEvent(enterEvent);

            const result = await promise;
            expect(result).toBe('test');
        });
    });

    // ============================================
    // SHOW LOADING TESTS
    // ============================================
    describe('showLoading', () => {
        test('should display loading overlay', () => {
            const handle = notificationUI.showLoading('Loading...');

            const overlay = document.querySelector('.loading-overlay');
            expect(overlay).toBeTruthy();
            expect(overlay.textContent).toContain('Loading...');
            expect(handle).toBeTruthy();
        });

        test('should hide loading overlay', () => {
            const handle = notificationUI.showLoading('Loading...');
            expect(document.querySelector('.loading-overlay')).toBeTruthy();

            notificationUI.hideLoading(handle);
            expect(document.querySelector('.loading-overlay')).toBeFalsy();
        });

        test('should stack multiple loading overlays', () => {
            const handle1 = notificationUI.showLoading('Loading 1');
            const handle2 = notificationUI.showLoading('Loading 2');

            const overlays = document.querySelectorAll('.loading-overlay');
            expect(overlays.length).toBe(2);

            notificationUI.hideLoading(handle1);
            expect(document.querySelectorAll('.loading-overlay').length).toBe(1);

            notificationUI.hideLoading(handle2);
            expect(document.querySelectorAll('.loading-overlay').length).toBe(0);
        });

        test('should use default message', () => {
            notificationUI.showLoading();

            const overlay = document.querySelector('.loading-overlay');
            expect(overlay.textContent).toContain('Loading');
        });
    });

    // ============================================
    // SHOW PROGRESS TESTS
    // ============================================
    describe('showProgress', () => {
        test('should display progress bar', () => {
            const handle = notificationUI.showProgress('Uploading...', 50);

            const overlay = document.querySelector('.progress-overlay');
            const progressBar = overlay.querySelector('.progress-bar');
            
            expect(overlay).toBeTruthy();
            expect(overlay.textContent).toContain('Uploading...');
            expect(progressBar.style.width).toBe('50%');
            expect(handle).toBeTruthy();
        });

        test('should update progress', () => {
            const handle = notificationUI.showProgress('Processing', 0);

            notificationUI.updateProgress(handle, 25);
            let progressBar = document.querySelector('.progress-bar');
            expect(progressBar.style.width).toBe('25%');

            notificationUI.updateProgress(handle, 75);
            progressBar = document.querySelector('.progress-bar');
            expect(progressBar.style.width).toBe('75%');
        });

        test('should hide progress overlay', () => {
            const handle = notificationUI.showProgress('Processing', 50);
            expect(document.querySelector('.progress-overlay')).toBeTruthy();

            notificationUI.hideProgress(handle);
            expect(document.querySelector('.progress-overlay')).toBeFalsy();
        });

        test('should clamp progress between 0-100', () => {
            const handle = notificationUI.showProgress('Test', 0);

            notificationUI.updateProgress(handle, -10);
            let progressBar = document.querySelector('.progress-bar');
            expect(progressBar.style.width).toBe('0%');

            notificationUI.updateProgress(handle, 150);
            progressBar = document.querySelector('.progress-bar');
            expect(progressBar.style.width).toBe('100%');
        });
    });

    // ============================================
    // CLEAR ALL NOTIFICATIONS TESTS
    // ============================================
    describe('clearAllNotifications', () => {
        test('should clear all messages', () => {
            notificationUI.showMessage('Message 1', 'success');
            notificationUI.showMessage('Message 2', 'info');
            notificationUI.showToast('Toast');

            expect(container.children.length).toBeGreaterThan(0);
            expect(document.querySelectorAll('.toast').length).toBeGreaterThan(0);

            notificationUI.clearAllNotifications();

            expect(container.children.length).toBe(0);
            expect(document.querySelectorAll('.toast').length).toBe(0);
        });

        test('should not affect modals', () => {
            notificationUI.showMessage('Message', 'success');
            notificationUI.showConfirmation('Confirm?');

            expect(document.querySelector('.modal')).toBeTruthy();

            notificationUI.clearAllNotifications();

            expect(container.children.length).toBe(0);
            expect(document.querySelector('.modal')).toBeTruthy();
        });
    });

    // ============================================
    // ACCESSIBILITY TESTS
    // ============================================
    describe('Accessibility', () => {
        test('should have aria-live region for messages', () => {
            notificationUI.showMessage('Test', 'success');

            const messageEl = container.firstChild;
            expect(messageEl.getAttribute('role')).toBe('alert');
            expect(messageEl.getAttribute('aria-live')).toBe('polite');
        });

        test('should have proper button labels', () => {
            notificationUI.showConfirmation('Confirm?');

            const modal = document.querySelector('.modal');
            const confirmBtn = modal.querySelector('[data-action="confirm"]');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');

            expect(confirmBtn.textContent.length).toBeGreaterThan(0);
            expect(cancelBtn.textContent.length).toBeGreaterThan(0);
        });

        test('should focus input in prompt', (done) => {
            notificationUI.showPrompt('Enter value:');

            setTimeout(() => {
                const input = document.querySelector('.modal input');
                expect(document.activeElement).toBe(input);
                done();
            }, 100);
        });
    });

    // ============================================
    // ERROR HANDLING TESTS
    // ============================================
    describe('Error Handling', () => {
        test('should handle missing container gracefully', () => {
            container.remove();

            expect(() => {
                notificationUI.showMessage('Test', 'success');
            }).not.toThrow();
        });

        test('should handle hideLoading with invalid handle', () => {
            expect(() => {
                notificationUI.hideLoading('invalid-handle');
            }).not.toThrow();
        });

        test('should handle updateProgress with invalid handle', () => {
            expect(() => {
                notificationUI.updateProgress('invalid-handle', 50);
            }).not.toThrow();
        });
    });
});
