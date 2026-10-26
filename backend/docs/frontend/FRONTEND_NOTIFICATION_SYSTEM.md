# Frontend Notification System Implementation

This guide shows how to implement a proper user feedback system for your calorie tracker app to show success/error messages when data is saved to the server.

## 1. Toast Notification System (Recommended)

### Add to your HTML head:
```html
<!-- Toast Notification Styles -->
<style>
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 350px;
}

.toast {
    background: white;
    border-left: 4px solid #28a745;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    margin-bottom: 10px;
    padding: 16px;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
    opacity: 0;
    max-width: 350px;
    word-wrap: break-word;
}

.toast.show {
    transform: translateX(0);
    opacity: 1;
}

.toast.success { border-left-color: #28a745; }
.toast.error { border-left-color: #dc3545; }
.toast.warning { border-left-color: #ffc107; }
.toast.info { border-left-color: #17a2b8; }

.toast-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-weight: 600;
}

.toast-icon {
    margin-right: 8px;
    font-size: 18px;
}

.toast.success .toast-icon { color: #28a745; }
.toast.error .toast-icon { color: #dc3545; }
.toast.warning .toast-icon { color: #ffc107; }
.toast.info .toast-icon { color: #17a2b8; }

.toast-body {
    color: #333;
    font-size: 14px;
    line-height: 1.4;
}

.toast-close {
    position: absolute;
    top: 8px;
    right: 12px;
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
}

.toast-close:hover {
    opacity: 1;
}
</style>
```

### Add to your HTML body:
```html
<!-- Toast Container -->
<div id="toast-container" class="toast-container"></div>
```

### JavaScript Notification System:
```javascript
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'success', duration = 4000) {
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);

        // Show animation
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => this.remove(toast), duration);

        return toast;
    }

    createToast(message, type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <button class="toast-close" onclick="notifications.remove(this.parentElement)">×</button>
            <div class="toast-header">
                <span class="toast-icon">${icons[type] || icons.info}</span>
                ${titles[type] || 'Notification'}
            </div>
            <div class="toast-body">${message}</div>
        `;

        return toast;
    }

    remove(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 6000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }
}

// Initialize global notification system
const notifications = new NotificationSystem();
```

## 2. Enhanced API Call Function

Replace your current `apiCall` function with this enhanced version:

```javascript
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        // Show loading indicator for non-GET requests
        if (finalOptions.method !== 'GET') {
            notifications.info('Saving...', 2000);
        }

        const response = await fetch(endpoint, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }

        // Show success notification for successful operations
        if (data.success && data.message && finalOptions.method !== 'GET') {
            notifications.success(data.message);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        
        // Show user-friendly error messages
        const errorMessage = getErrorMessage(error);
        notifications.error(errorMessage);
        
        throw error;
    }
}

function getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
        return 'Network error. Please check your connection and try again.';
    }
    if (error.message.includes('401')) {
        return 'Session expired. Please log in again.';
    }
    if (error.message.includes('403')) {
        return 'You do not have permission to perform this action.';
    }
    if (error.message.includes('404')) {
        return 'The requested item was not found.';
    }
    if (error.message.includes('429')) {
        return 'Too many requests. Please wait a moment and try again.';
    }
    if (error.message.includes('500')) {
        return 'Server error. Please try again later.';
    }
    return error.message || 'An unexpected error occurred.';
}
```

## 3. Usage Examples

### For Food Logging:
```javascript
async function logFood(foodData) {
    try {
        const result = await apiCall('/api/logs', {
            method: 'POST',
            body: JSON.stringify(foodData)
        });
        
        // Success notification is automatically shown by apiCall
        // Optional: Add custom logic here
        refreshFoodLog();
        
    } catch (error) {
        // Error notification is automatically shown by apiCall
        // Optional: Add custom error handling here
    }
}
```

### For Admin Food Management:
```javascript
async function createFood(foodData) {
    try {
        const result = await apiCall('/api/admin/foods', {
            method: 'POST',
            body: JSON.stringify(foodData)
        });
        
        // Success notification is automatically shown
        refreshFoodList();
        clearForm();
        
    } catch (error) {
        // Error notification is automatically shown
    }
}

async function updateFood(foodId, foodData) {
    try {
        const result = await apiCall(`/api/admin/foods/${foodId}`, {
            method: 'PUT',
            body: JSON.stringify(foodData)
        });
        
        // Success notification is automatically shown
        refreshFoodList();
        
    } catch (error) {
        // Error notification is automatically shown
    }
}
```

## 4. Additional Visual Feedback Options

### Loading States:
```javascript
// Add this to your CSS
.btn-loading {
    position: relative;
    color: transparent !important;
}

.btn-loading::after {
    content: "";
    position: absolute;
    width: 16px;
    height: 16px;
    margin: auto;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: button-loading-spinner 1s ease infinite;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

@keyframes button-loading-spinner {
    from { transform: rotate(0turn); }
    to { transform: rotate(1turn); }
}
```

```javascript
// Usage in form submissions
async function handleFormSubmit(event, formData, submitButton) {
    event.preventDefault();
    
    // Add loading state
    submitButton.classList.add('btn-loading');
    submitButton.disabled = true;
    
    try {
        await apiCall('/api/logs', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        // Success handling is done by apiCall
        
    } catch (error) {
        // Error handling is done by apiCall
    } finally {
        // Remove loading state
        submitButton.classList.remove('btn-loading');
        submitButton.disabled = false;
    }
}
```

## 5. Form Validation Feedback

```javascript
function showFieldError(fieldName, message) {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (field) {
        field.classList.add('is-invalid');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-danger small mt-1';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.is-invalid').forEach(field => {
        field.classList.remove('is-invalid');
    });
    document.querySelectorAll('.field-error').forEach(error => {
        error.remove();
    });
}
```

## Implementation Steps:

1. **Add the CSS and HTML** to your main layout
2. **Replace your apiCall function** with the enhanced version
3. **Update your form submissions** to use the new system
4. **Test** by creating/editing foods and logging meals

This system will provide:
- ✅ **Immediate feedback** when actions succeed/fail
- ✅ **User-friendly error messages** instead of technical errors
- ✅ **Visual loading states** so users know something is happening
- ✅ **Professional toast notifications** that auto-dismiss
- ✅ **Consistent UX** across all admin and user features

The notifications will automatically show messages like:
- "Chicken Breast has been successfully added to your food database"
- "Successfully logged 150g of Rice (220 cal)"
- "Network error. Please check your connection and try again."