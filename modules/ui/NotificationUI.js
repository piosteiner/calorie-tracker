/**
 * NotificationUI.js
 * Handles all notification and message displays
 */

import { logger } from '../../logger.js';

export class NotificationUI {
    constructor() {
        this._handleCounter = 0;
    }

    _nextHandle(prefix) {
        this._handleCounter += 1;
        return `${prefix}-${this._handleCounter}`;
    }

    /**
     * Show a message notification. Messages stack in #message-container; error messages persist
     * until manually dismissed, other types auto-dismiss after `duration`.
     * @param {string} message - Message text
     * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms before auto-dismiss (default: 3000)
     */
    showMessage(message, type = 'info', duration = 3000) {
        const container = document.getElementById('message-container');
        if (!container) {
            logger.warn('No message container found for message display');
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.setAttribute('role', 'alert');
        messageDiv.setAttribute('aria-live', 'polite');
        messageDiv.innerHTML = `
            <span class="message-text">${message}</span>
            <button type="button" class="close-message" aria-label="Dismiss message">&times;</button>
        `;

        container.insertBefore(messageDiv, container.firstChild);

        messageDiv.querySelector('.close-message').addEventListener('click', () => {
            messageDiv.remove();
        });

        // Errors stay until the user dismisses them; everything else auto-dismisses.
        if (type !== 'error') {
            setTimeout(() => {
                messageDiv.remove();
            }, duration);
        }

        logger.debug(`Message shown: [${type}] ${message}`);
    }

    /**
     * Show confirmation modal
     * @param {string} message - Modal message
     * @param {string} confirmText - Confirm button text
     * @param {string} cancelText - Cancel button text
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    showConfirmation(message, confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const modal = document.createElement('div');
            modal.className = 'modal confirmation-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <p>${message}</p>
                    <div class="modal-buttons">
                        <button type="button" class="btn btn-secondary" data-action="cancel">${cancelText}</button>
                        <button type="button" class="btn btn-primary" data-action="confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            const close = (result) => {
                modal.remove();
                overlay.remove();
                resolve(result);
            };

            modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
                logger.debug('Confirmation modal: confirmed');
                close(true);
            });
            modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                logger.debug('Confirmation modal: cancelled');
                close(false);
            });
            overlay.addEventListener('click', () => {
                logger.debug('Confirmation modal: cancelled (overlay click)');
                close(false);
            });

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            logger.debug(`Confirmation modal shown: ${message}`);
        });
    }

    /**
     * Show input prompt modal
     * @param {string} message - Modal message
     * @param {string} defaultValue - Default input value
     * @param {string} placeholder - Input placeholder
     * @returns {Promise<string|null>} Trimmed input value, or null if cancelled/empty
     */
    showPrompt(message, defaultValue = '', placeholder = '') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const modal = document.createElement('div');
            modal.className = 'modal prompt-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <p>${message}</p>
                    <input type="text" class="prompt-input" value="${defaultValue}" placeholder="${placeholder}" />
                    <div class="modal-buttons">
                        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
                        <button type="button" class="btn btn-primary" data-action="confirm">OK</button>
                    </div>
                </div>
            `;

            const input = modal.querySelector('.prompt-input');

            const close = (result) => {
                modal.remove();
                overlay.remove();
                resolve(result);
            };

            const handleSubmit = () => {
                const value = input.value.trim();
                logger.debug('Prompt modal: submitted', value);
                close(value || null);
            };

            modal.querySelector('[data-action="confirm"]').addEventListener('click', handleSubmit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSubmit();
            });
            modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                logger.debug('Prompt modal: cancelled');
                close(null);
            });
            overlay.addEventListener('click', () => {
                logger.debug('Prompt modal: cancelled (overlay click)');
                close(null);
            });

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            setTimeout(() => {
                input.focus();
                input.select();
            }, 0);
            logger.debug(`Prompt modal shown: ${message}`);
        });
    }

    /**
     * Show a loading overlay. Multiple overlays can be shown at once; each is tracked by its own
     * handle so callers can hide exactly the one they started.
     * @param {string} message - Loading message
     * @returns {string} Handle to pass to hideLoading()
     */
    showLoading(message = 'Loading...') {
        const handle = this._nextHandle('loading');

        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.dataset.handle = handle;
        loader.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;

        document.body.appendChild(loader);
        logger.debug('Loading overlay shown:', message, handle);
        return handle;
    }

    /**
     * Hide a loading overlay by its handle. No-op for an unknown/invalid handle.
     * @param {string} handle - Handle returned by showLoading()
     */
    hideLoading(handle) {
        const loader = document.querySelector(`.loading-overlay[data-handle="${handle}"]`);
        if (loader) {
            loader.remove();
            logger.debug('Loading overlay hidden:', handle);
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} position - 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
     * @param {number} duration - Duration in ms before auto-dismiss (default: 3000)
     */
    showToast(message, position = 'top-right', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        const [vertical, horizontal] = position.split('-');
        toast.style[vertical === 'bottom' ? 'bottom' : 'top'] = '20px';
        toast.style[horizontal === 'left' ? 'left' : 'right'] = '20px';

        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, duration);

        logger.debug(`Toast shown: ${message}`);
    }

    /**
     * Show a progress overlay.
     * @param {string} label - Progress label/message
     * @param {number} progress - Initial progress percentage (0-100)
     * @returns {string} Handle to pass to updateProgress()/hideProgress()
     */
    showProgress(label, progress = 0) {
        const handle = this._nextHandle('progress');
        const clamped = Math.min(100, Math.max(0, progress));

        const overlay = document.createElement('div');
        overlay.className = 'progress-overlay';
        overlay.dataset.handle = handle;
        overlay.innerHTML = `
            <div class="progress-content">
                <p class="progress-label">${label}</p>
                <div class="progress-track">
                    <div class="progress-bar" style="width: ${clamped}%"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        logger.debug('Progress overlay shown:', label, clamped);
        return handle;
    }

    /**
     * Update an existing progress overlay. No-op for an unknown/invalid handle.
     * @param {string} handle - Handle returned by showProgress()
     * @param {number} progress - Progress percentage (clamped to 0-100)
     */
    updateProgress(handle, progress) {
        const overlay = document.querySelector(`.progress-overlay[data-handle="${handle}"]`);
        if (!overlay) return;
        const bar = overlay.querySelector('.progress-bar');
        const clamped = Math.min(100, Math.max(0, progress));
        bar.style.width = `${clamped}%`;
        logger.debug('Progress updated:', handle, clamped);
    }

    /**
     * Hide a progress overlay by its handle. No-op for an unknown/invalid handle.
     * @param {string} handle - Handle returned by showProgress()
     */
    hideProgress(handle) {
        const overlay = document.querySelector(`.progress-overlay[data-handle="${handle}"]`);
        if (overlay) {
            overlay.remove();
            logger.debug('Progress overlay hidden:', handle);
        }
    }

    /**
     * Clear all stacked messages and toasts. Deliberately leaves modals (confirmation/prompt)
     * open - those have their own explicit confirm/cancel flow.
     */
    clearAllNotifications() {
        document.getElementById('message-container')?.replaceChildren();
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        document.getElementById('toastContainer')?.remove();
        logger.debug('All notifications cleared');
    }
}

// Export singleton instance
export const notificationUI = new NotificationUI();
