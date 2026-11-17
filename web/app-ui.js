/**
 * app-ui.js — the layout around the app (2026-11 redesign):
 *   tabs (Today · History · Weight · Progress · Admin), the menu, the quick-add chips
 *   (meal, grams), "Log again" for the most-used foods, and the "+" on each meal.
 * It drives the existing CalorieTracker instance (`app`, from script.js) and keeps its own logic small.
 */
(function () {
    'use strict';

    const LAST_QTY_KEY = 'calorieTrackerLastQty';   // { "food name": grams } — the last amount logged per food
    const MAX_FREQUENT = 15;   // one row that scrolls sideways

    const $ = (id) => document.getElementById(id);
    const store = {
        get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
        set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode etc. */ } }
    };
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const qtyKey = (name) => String(name || '').trim().toLowerCase();

    // ── Tabs ────────────────────────────────────────────────────────────────
    const opened = new Set();   // tabs whose content was loaded once

    function showTab(name) {
        const tab = document.querySelector(`.app-tab[data-tab="${name}"]`);
        if (!tab || tab.hidden) name = 'today';
        document.querySelectorAll('.app-tab').forEach((t) => {
            const on = t.dataset.tab === name;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.dataset.panel !== name; });
        window.scrollTo({ top: 0 });
        loadTab(name);
        if (name === 'progress') window.Progress?.load();   // fresh every time: today's checklist changes as you log
    }

    // The sections used to open with a "Show …" button; in a tab they open (and load) on first view.
    function loadTab(name) {
        if (typeof app === 'undefined' || !app || opened.has(name)) return;
        opened.add(name);
        try {
            if (name === 'history') {
                if (!app.historyData?.isExpanded) app.toggleHistory();
                if (!app.calendarState?.isExpanded) app.toggleCalendar();
            } else if (name === 'weight') {
                if ($('weightContent')?.style.display === 'none') app.toggleWeightTracking();
            }
        } catch (err) {
            opened.delete(name);
            console.error('Could not open tab', name, err);
        }
    }

    // The Admin tab shows when script.js shows the admin panel
    function watchAdmin() {
        const panel = $('adminPanel'), btn = $('adminTabBtn');
        if (!panel || !btn) return;
        const sync = () => {
            const isAdmin = panel.style.display !== 'none';
            btn.hidden = !isAdmin;
            if (!isAdmin && btn.classList.contains('active')) showTab('today');
        };
        new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['style'] });
        sync();
    }

    // ── Menu ────────────────────────────────────────────────────────────────
    function setupMenu() {
        const btn = $('appMenuBtn'), panel = $('appMenuPanel');
        if (!btn || !panel) return;
        const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.hidden = !panel.hidden;
            btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
        });
        document.addEventListener('click', (e) => {
            if (panel.hidden) return;
            // the theme switch keeps the menu open, so you can see the change; anything else closes it
            if (e.target.closest('#themeToggle')) return;
            if (!e.target.closest('#appMenuPanel') || e.target.closest('button')) close();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    }

    function setTodayLabel() {
        const el = $('todayLabel');
        if (!el) return;
        const d = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        el.innerHTML = `Today <span class="today-date">${esc(d)}</span>`;
    }

    // ── Quick add: meal and gram chips ──────────────────────────────────────
    function syncMealChips() {
        const value = $('mealCategory')?.value;
        document.querySelectorAll('.qa-meals .qa-chip').forEach((c) => {
            const on = c.dataset.meal === value;
            c.classList.toggle('active', on);
            c.setAttribute('aria-checked', on ? 'true' : 'false');
        });
    }

    function setMeal(meal) {
        const select = $('mealCategory');
        if (!select || select.value === meal) { syncMealChips(); return; }
        select.value = meal;
        select.dispatchEvent(new Event('change', { bubbles: true }));   // script.js sets the time for that meal
        syncMealChips();
    }

    function syncGramChips() {
        const q = String(parseFloat($('quantity')?.value));
        document.querySelectorAll('.qa-grams .qa-chip').forEach((c) => c.classList.toggle('active', c.dataset.grams === q));
    }

    function setupQuickAdd() {
        document.querySelector('.qa-meals')?.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-meal]');
            if (chip) setMeal(chip.dataset.meal);
        });
        document.querySelector('.qa-grams')?.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-grams]');
            if (!chip) return;
            $('quantity').value = chip.dataset.grams;
            syncGramChips();
        });
        $('quantity')?.addEventListener('input', syncGramChips);
        $('mealCategory')?.addEventListener('change', syncMealChips);

        // Remember the amount per food, for next time (capture: runs before the form is reset)
        document.addEventListener('submit', (e) => {
            if (e.target.id !== 'foodForm') return;
            rememberQty($('foodName').value, $('quantity').value);
        }, true);

        // "+" on a meal in today's log: add to that meal
        $('foodLog')?.addEventListener('click', (e) => {
            const add = e.target.closest('[data-meal-add]');
            if (add) {
                setMeal(add.dataset.mealAdd);
                document.querySelector('.quick-add')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                $('foodName')?.focus({ preventScroll: true });
                return;
            }
            // Tap a food to edit it
            const row = e.target.closest('.food-item');
            if (row && !e.target.closest('button, a, input, img')) row.querySelector('.edit-btn')?.click();
        });
    }

    function rememberQty(name, qty) {
        const q = parseFloat(qty);
        if (!name || !(q > 0)) return;
        const all = store.get(LAST_QTY_KEY, {});
        all[qtyKey(name)] = q;
        store.set(LAST_QTY_KEY, all);
    }

    // ── Log again: the most-used foods, one tap each ────────────────────────
    function frequentFoods() {
        const favs = (app?.getFavorites?.() || []).filter((f) => f && f.name && Number.isFinite(parseFloat(f.calories)));
        // the same food can be saved once per source: keep one per name, with the uses added up
        const byName = new Map();
        for (const f of favs) {
            const k = qtyKey(f.name), seen = byName.get(k);
            if (!seen) { byName.set(k, { ...f, usageCount: f.usageCount || 0 }); continue; }
            seen.usageCount += f.usageCount || 0;
            seen.lastUsed = Math.max(seen.lastUsed || 0, f.lastUsed || 0);
        }
        return [...byName.values()]
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0) || (b.lastUsed || b.addedAt || 0) - (a.lastUsed || a.addedAt || 0))
            .slice(0, MAX_FREQUENT);
    }

    function renderFrequent() {
        const wrap = $('frequentFoods'), list = $('frequentFoodsList');
        if (!wrap || !list) return;
        const foods = frequentFoods();
        const qtys = store.get(LAST_QTY_KEY, {});
        wrap.hidden = foods.length === 0;
        list.innerHTML = foods.map((f, i) => {
            const g = qtys[qtyKey(f.name)] || 100;
            const kcal = Math.round((parseFloat(f.calories) / 100) * g);
            return `<button type="button" class="qa-chip qa-freq" data-fav="${i}" title="Log ${esc(f.name)}, ${g} g (${kcal} kcal)">`
                + `${esc(f.name)} <span class="qa-freq-qty">${g} g</span></button>`;
        }).join('');
        list._foods = foods;
    }

    function setupFrequent() {
        $('frequentFoodsList')?.addEventListener('click', async (e) => {
            const chip = e.target.closest('[data-fav]');
            const list = $('frequentFoodsList');
            if (!chip || list.classList.contains('busy')) return;
            const food = list._foods?.[+chip.dataset.fav];
            if (!food) return;
            const g = store.get(LAST_QTY_KEY, {})[qtyKey(food.name)] || 100;
            list.classList.add('busy');
            chip.classList.add('active');
            try {
                app.selectedFoodData = { ...food };
                $('foodName').value = food.name;
                $('quantity').value = g;
                await app.handleAddFood();
            } finally {
                list.classList.remove('busy');
                renderFrequent();
            }
        });
    }

    // ── Hooks into script.js ────────────────────────────────────────────────
    function wrap(obj, method, after) {
        const orig = obj?.[method];
        if (typeof orig !== 'function') return;
        obj[method] = function (...args) {
            const result = orig.apply(this, args);
            Promise.resolve(result).finally(() => after.apply(this, args));
            return result;
        };
    }

    function hookApp() {
        if (typeof app === 'undefined' || !app) return false;
        // after a reset the form picks the meal for the time of day: show it on the chips
        wrap(app, 'initializeFoodForm', () => { syncMealChips(); syncGramChips(); });
        // picking a search result: use the amount logged last time, then the amount field is next
        wrap(app, 'selectEnhancedFood', () => {
            const name = $('foodName')?.value;
            const last = store.get(LAST_QTY_KEY, {})[qtyKey(name)];
            const q = $('quantity');
            if (last && q) q.value = last;
            syncGramChips();
            q?.focus();
            q?.select();
        });
        wrap(app, 'addToFavorites', renderFrequent);
        return true;
    }

    // On phones the tabs are a bar fixed to the bottom of the screen. Left inside the sticky top bar,
    // mobile Safari moves that bar with the top bar while scrolling and it stutters; so on phones it sits
    // directly in the dashboard, on wider screens back in the top bar between the title and the menu.
    function placeTabs() {
        const nav = document.querySelector('.app-tabs');
        const bar = document.querySelector('.app-bar-inner');
        const dash = $('dashboardSection');
        if (!nav || !bar || !dash) return;
        const phone = window.matchMedia('(max-width: 640px)');
        const place = () => {
            if (phone.matches) { if (nav.parentElement !== dash) dash.append(nav); }
            else if (nav.parentElement !== bar) bar.insertBefore(nav, bar.querySelector('.user-info'));
        };
        place();
        phone.addEventListener('change', place);
    }

    function start() {
        placeTabs();
        setTodayLabel();
        setupMenu();
        setupQuickAdd();
        setupFrequent();
        watchAdmin();
        document.addEventListener('click', (e) => {
            const t = e.target.closest('.app-tab, [data-tab-link]');
            if (t) showTab(t.dataset.tab || t.dataset.tabLink);
            // the admin sections: mark the one that is open
            const a = e.target.closest('.admin-nav [data-action="show-admin-section"]');
            if (a) document.querySelectorAll('.admin-nav .btn-admin').forEach((b) => b.classList.toggle('active', b === a));
        });
        document.querySelector('.admin-nav .btn-admin')?.classList.add('active');
        // script.js creates `app` on DOMContentLoaded; this listener was added after it, so it runs after
        const ready = () => {
            hookApp();
            syncMealChips();
            syncGramChips();
            renderFrequent();
            showTab('today');   // always open on Today: logging is what the app is for
        };
        if (typeof app !== 'undefined' && app) ready(); else setTimeout(ready, 0);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
