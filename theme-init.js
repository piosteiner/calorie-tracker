// The chosen theme before the first paint — a file, not an inline script, for the CSP (2026-11-10).
try { var t = localStorage.getItem('calorie-tracker-theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch (e) {}
