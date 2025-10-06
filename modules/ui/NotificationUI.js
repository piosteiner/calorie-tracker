/**
 * NotificationUI.js
 * Handles all notification and message displays
 */

import { logger } from '../../logger.js';
import { CONFIG } from '../../config.js';

export class NotificationUI {
    constructor() {
        this.currentMessage = null;
        this.messageTimeout = null;
    }

    /**
     * Show a message notification
     * @param {string} message - Message text
     * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (default: 3000)
     */
    showMessage(message, type = 'info', duration = 3000) {
        // Remove existing message
        this.clearMessage();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // Add to appropriate container
        const container = document.querySelector('.active .container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            this.currentMessage = messageDiv;
            
            // Auto-remove after duration
            this.messageTimeout = setTimeout(() => {
                this.clearMessage();
            }, duration);
            
            logger.debug(`Message shown: [${type}] ${message}`);
        } else {
            logger.warn('No active container found for message display');
        }
    }

    /**
     * Clear current message
     */
    clearMessage() {
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }

        if (this.currentMessage && this.currentMessage.parentNode) {
            this.currentMessage.remove();
            this.currentMessage = null;
        }
    }

    /**
     * Show confirmation modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {string} confirmText - Confirm button text
     * @param {string} cancelText - Cancel button text
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    showConfirmation(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            // Remove existing modal
            const existingModal = document.getElementById('confirmModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.id = 'confirmModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content confirmation-modal">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="modal-buttons">
                        <button class="btn btn-secondary" data-action="cancel-confirm">${cancelText}</button>
                        <button class="btn btn-primary" data-action="execute-confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            // Handle confirm
            const confirmBtn = modal.querySelector('[data-action="execute-confirm"]');
            confirmBtn.addEventListener('click', () => {
                modal.remove();
                logger.debug('Confirmation modal: confirmed');
                resolve(true);
            });

            // Handle cancel
            const cancelBtn = modal.querySelector('[data-action="cancel-confirm"]');
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                logger.debug('Confirmation modal: cancelled');
                resolve(false);
            });

            // Click outside to cancel
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    logger.debug('Confirmation modal: cancelled (outside click)');
                    resolve(false);
                }
            });

            document.body.appendChild(modal);
            logger.debug(`Confirmation modal shown: ${title}`);
        });
    }

    /**
     * Show input prompt modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {string} defaultValue - Default input value
     * @param {string} placeholder - Input placeholder
     * @returns {Promise<string|null>} Input value or null if cancelled
     */
    showPrompt(title, message, defaultValue = '', placeholder = '') {
        return new Promise((resolve) => {
            // Remove existing modal
            const existingModal = document.getElementById('promptModal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.id = 'promptModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content prompt-modal">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <input type="text" class="prompt-input" value="${defaultValue}" placeholder="${placeholder}" />
                    <div class="modal-buttons">
                        <button class="btn btn-secondary" data-action="cancel-prompt">Cancel</button>
                        <button class="btn btn-primary" data-action="submit-prompt">OK</button>
                    </div>
                </div>
            `;

            const input = modal.querySelector('.prompt-input');
            const submitBtn = modal.querySelector('[data-action="submit-prompt"]');
            const cancelBtn = modal.querySelector('[data-action="cancel-prompt"]');

            // Handle submit
            const handleSubmit = () => {
                const value = input.value.trim();
                modal.remove();
                logger.debug('Prompt modal: submitted', value);
                resolve(value || null);
            };

            submitBtn.addEventListener('click', handleSubmit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            });

            // Handle cancel
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                logger.debug('Prompt modal: cancelled');
                resolve(null);
            });

            // Click outside to cancel
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    logger.debug('Prompt modal: cancelled (outside click)');
                    resolve(null);
                }
            });

            document.body.appendChild(modal);
            input.focus();
            input.select();
            logger.debug(`Prompt modal shown: ${title}`);
        });
    }

    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        // Remove existing loader
        this.hideLoading();

        const loader = document.createElement('div');
        loader.id = 'loadingOverlay';
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;

        document.body.appendChild(loader);
        logger.debug('Loading overlay shown:', message);
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.remove();
            logger.debug('Loading overlay hidden');
        }
    }

    /**
     * Show toast notification (bottom right corner)
     * @param {string} message - Toast message
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (default: 3000)
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Get or create toast container
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
                // Remove container if empty
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, duration);

        logger.debug(`Toast shown: [${type}] ${message}`);
    }

    /**
     * Show progress bar
     * @param {string} containerId - Container element ID
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} label - Progress label
     */
    showProgress(containerId, progress, label = '') {
        const container = document.getElementById(containerId);
        if (!container) {
            logger.warn('Progress container not found:', containerId);
            return;
        }

        let progressBar = container.querySelector('.progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.innerHTML = `
                <div class="progress-fill"></div>
                <div class="progress-label"></div>
            `;
            container.appendChild(progressBar);
        }

        const fill = progressBar.querySelector('.progress-fill');
        const labelEl = progressBar.querySelector('.progress-label');

        fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        labelEl.textContent = label;

        logger.debug(`Progress updated: ${progress}% - ${label}`);
    }

    /**
     * Hide progress bar
     * @param {string} containerId - Container element ID
     */
    hideProgress(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            const progressBar = container.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.remove();
                logger.debug('Progress bar hidden');
            }
        }
    }
}

// Export singleton instance
export const notificationUI = new NotificationUI();
