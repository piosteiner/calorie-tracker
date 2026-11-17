/**
 * Theme Toggle Module for Calorie Tracker
 * Handles dark/light mode switching with system preference detection
 */

class ThemeManager {
    constructor() {
        this.storageKey = 'calorie-tracker-theme';
        this.themes = {
            LIGHT: 'light',
            DARK: 'dark',
            SYSTEM: 'system'
        };
        
        // Initialize theme system
        this.init();
    }

    /**
     * Initialize the theme system
     */
    init() {
        // Listen for system theme changes
        this.setupSystemThemeListener();
        
        // Apply saved or system theme
        this.applyTheme(this.getSavedTheme());
        
        // Setup theme toggle button if it exists
        this.setupThemeToggle();
    }

    /**
     * Get the currently saved theme preference
     * @returns {string} Theme preference ('light', 'dark', or 'system')
     */
    getSavedTheme() {
        const saved = localStorage.getItem(this.storageKey);
        
        // If no preference saved, default to system
        if (!saved) {
            return this.themes.SYSTEM;
        }
        
        // Validate saved theme
        if (Object.values(this.themes).includes(saved)) {
            return saved;
        }
        
        // Fallback to system if invalid
        return this.themes.SYSTEM;
    }

    /**
     * Get the system's preferred color scheme
     * @returns {string} 'light' or 'dark'
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.themes.DARK;
        }
        return this.themes.LIGHT;
    }

    /**
     * Get the current effective theme (resolves 'system' to actual theme)
     * @returns {string} 'light' or 'dark'
     */
    getCurrentTheme() {
        const saved = this.getSavedTheme();
        
        if (saved === this.themes.SYSTEM) {
            return this.getSystemTheme();
        }
        
        return saved;
    }

    /**
     * Apply theme to the document
     * @param {string} theme - Theme to apply ('light', 'dark', or 'system')
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        // Resolve system theme
        let effectiveTheme = theme;
        if (theme === this.themes.SYSTEM) {
            effectiveTheme = this.getSystemTheme();
        }
        
        // Remove existing theme attributes
        html.removeAttribute('data-theme');
        
        // Apply new theme
        if (effectiveTheme === this.themes.DARK) {
            html.setAttribute('data-theme', 'dark');
        }
        // Light theme is default (no attribute needed)
        
        // Update theme toggle button if it exists
        this.updateThemeToggleButton(theme);
        
        // Save preference (but not if it's a system change)
        if (theme !== this.getCurrentTheme() || !localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, theme);
        }
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: effectiveTheme, preference: theme }
        }));
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentEffective = this.getCurrentTheme();
        const newTheme = currentEffective === this.themes.LIGHT ? this.themes.DARK : this.themes.LIGHT;
        this.applyTheme(newTheme);
    }

    /**
     * Set specific theme
     * @param {string} theme - Theme to set ('light', 'dark', or 'system')
     */
    setTheme(theme) {
        if (Object.values(this.themes).includes(theme)) {
            this.applyTheme(theme);
        }
    }

    /**
     * Setup system theme change listener
     */
    setupSystemThemeListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Listen for changes
            mediaQuery.addEventListener('change', (e) => {
                // Only apply if user preference is 'system'
                const savedTheme = this.getSavedTheme();
                if (savedTheme === this.themes.SYSTEM) {
                    this.applyTheme(this.themes.SYSTEM);
                }
            });
        }
    }

    /**
     * Setup theme toggle button functionality
     */
    setupThemeToggle() {
        // Setup main theme toggle (dashboard)
        const toggleButton = document.getElementById('themeToggle');
        if (toggleButton) {
            this.setupSingleToggleButton(toggleButton);
        }
        
        // Setup login theme toggle
        const loginToggleButton = document.getElementById('themeToggleLogin');
        if (loginToggleButton) {
            this.setupSingleToggleButton(loginToggleButton);
        }
    }

    /**
     * Setup a single theme toggle button
     * @param {HTMLElement} button - The button element
     */
    setupSingleToggleButton(button) {
        // Add click handler
        button.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleTheme();
        });
        
        // Update button appearance
        this.updateThemeToggleButton(this.getSavedTheme());
    }

    /**
     * Update theme toggle button appearance
     * @param {string} currentPreference - Current theme preference
     */
    updateThemeToggleButton(currentPreference) {
        const buttons = [
            document.getElementById('themeToggle'),
            document.getElementById('themeToggleLogin')
        ].filter(Boolean);
        
        if (buttons.length === 0) return;
        
        const effectiveTheme = this.getCurrentTheme();
        
        buttons.forEach(button => {
            // Update button content and tooltip
            if (effectiveTheme === this.themes.DARK) {
                button.innerHTML = '🌙';
                button.title = 'Switch to Light Mode';
                button.setAttribute('aria-label', 'Switch to Light Mode');
            } else {
                button.innerHTML = '☀️';
                button.title = 'Switch to Dark Mode';
                button.setAttribute('aria-label', 'Switch to Dark Mode');
            }
            
            // Add preference indicator if using system theme
            if (currentPreference === this.themes.SYSTEM) {
                button.title += ' (Following system preference)';
            }
        });
    }

    /**
     * Get theme information for debugging
     * @returns {object} Theme information
     */
    getThemeInfo() {
        return {
            saved: this.getSavedTheme(),
            system: this.getSystemTheme(),
            current: this.getCurrentTheme(),
            supportsSystemDetection: !!(window.matchMedia)
        };
    }

    /**
     * Reset theme to system default
     */
    resetToSystem() {
        this.applyTheme(this.themes.SYSTEM);
    }

    /**
     * Force refresh theme (useful after dynamic content changes)
     */
    refreshTheme() {
        this.applyTheme(this.getSavedTheme());
    }
}

// Auto-initialize when DOM is ready
let themeManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager = new ThemeManager();
    });
} else {
    themeManager = new ThemeManager();
}

// Export for global access
window.ThemeManager = ThemeManager;
window.themeManager = themeManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}