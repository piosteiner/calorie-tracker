/**
 * progress.js — points, level and badges (2026-11 redesign).
 * Points are earned per day, worked out on the server from what is logged (backend/services/progressService.js).
 * This file draws the points chip in the top bar and the Progress tab, and after any change that
 * affects points (every API response with a `progress` field) shows a short note and refreshes them.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const localToday = () => new Date().toLocaleDateString('sv-SE');   // YYYY-MM-DD in the phone's time zone
    const fmt = (n) => Number(n || 0).toLocaleString('de-CH');

    const LABELS = {
        logged: 'day logged',
        complete: 'breakfast, lunch and dinner',
        onTarget: 'on target',
        weighed: 'weigh-in'
    };

    const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4L18 8"/></svg>';
    const ICON_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>';
    const ICON_BADGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/></svg>';

    let loading = null;

    async function load() {
        if (typeof app === 'undefined' || !app?.currentUser) return;
        if (loading) return loading;
        loading = (async () => {
            try {
                const res = await app.apiCall(`/rewards/progress?today=${localToday()}`, 'GET', null, { showError: false, silent: true });
                if (res?.success && res.progress) render(res.progress);
            } catch (err) {
                console.warn('Progress could not be loaded:', err?.message || err);
            } finally {
                loading = null;
            }
        })();
        return loading;
    }

    function setChip(points) {
        const chip = $('rewardsDisplay');
        if (chip) chip.style.display = 'flex';
        if ($('userPoints')) $('userPoints').textContent = fmt(points);
    }

    function render(p) {
        setChip(p.points);
        if (!$('pgLevel')) return;

        // Level
        const span = Math.max(p.nextLevelAt - p.levelStart, 1);
        const pct = Math.max(0, Math.min(100, Math.round(((p.points - p.levelStart) / span) * 100)));
        $('pgLevel').textContent = p.level;
        $('pgPoints').textContent = fmt(p.points);
        $('pgBar').style.width = `${pct}%`;
        $('pgBar').parentElement.setAttribute('aria-valuenow', String(pct));
        $('pgNext').textContent = `${fmt(p.nextLevelAt - p.points)} points to level ${p.level + 1}`;

        // Today: what earns points and what is done
        const r = p.rules, t = p.today;
        const lo = t ? Math.round(t.goal * r.targetMin) : 0, hi = t ? Math.round(t.goal * r.targetMax) : 0;
        const items = [
            { done: t?.logged, pts: r.DAY_LOGGED, name: 'Log what you eat', hint: '' },
            { done: t?.complete, pts: r.COMPLETE_DAY, name: 'Breakfast, lunch and dinner', hint: '' },
            { done: t?.onTarget, pts: r.ON_TARGET, name: 'On target',
              hint: t ? `${fmt(lo)}–${fmt(hi)} kcal with all 3 meals · now ${fmt(t.kcal)} kcal` : '' },
            { done: t?.weighed, pts: r.WEIGH_IN, name: 'Weigh in', hint: '' }
        ];
        $('pgToday').innerHTML = items.map((i) => `
            <li class="pg-item${i.done ? ' done' : ''}">
                <span class="pg-check">${i.done ? ICON_CHECK : ICON_OPEN}</span>
                <span class="pg-item-text"><span class="pg-item-name">${esc(i.name)}</span>${i.hint ? `<span class="pg-item-hint">${esc(i.hint)}</span>` : ''}</span>
                <span class="pg-item-pts">+${i.pts}</span>
            </li>`).join('');

        // Badges: earned first, then the ones closest to done
        const badges = [...p.badges].sort((a, b) => (b.earned - a.earned) || (b.progress / b.target - a.progress / a.target));
        $('pgBadges').innerHTML = badges.map((b) => `
            <div class="pg-badge${b.earned ? ' earned' : ''}" title="${esc(b.description)}">
                <span class="pg-badge-icon">${ICON_BADGE}</span>
                <span class="pg-badge-name">${esc(b.name)}</span>
                <span class="pg-badge-desc">${esc(b.description)}</span>
                <span class="pg-badge-state">${b.earned
                    ? `Earned ${esc(new Date(b.earnedOn + 'T12:00').toLocaleDateString('de-CH', { day: 'numeric', month: 'numeric' }))}`
                    : `${b.progress} / ${b.target}`}</span>
            </div>`).join('');

        // Totals
        const s = p.stats;
        $('pgStats').innerHTML = [
            [s.daysLogged, 'days logged'],
            [s.completeDays, 'with 3 meals'],
            [s.onTargetDays, 'on target'],
            [s.weighInWeeks, 'weeks with a weigh-in']
        ].map(([n, label]) => `<div class="pg-stat"><strong>${fmt(n)}</strong><span>${esc(label)}</span></div>`).join('');
        const start = new Date(p.startDate + 'T12:00').toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });
        $('pgNote').textContent = `Counting since ${start}. A day's points follow what's logged for it: editing or deleting a log updates them, and a missed day never takes anything away.`;
    }

    // After a log, weigh-in or goal change: a short note, then fresh numbers
    function afterChange(pr) {
        if (!pr) return;
        setChip(pr.total);
        const n = typeof app !== 'undefined' ? app?.notifications : null;   // `app` is a script-level let, not on window
        if (n && pr.change > 0) {
            const what = (pr.gained || []).map((k) => LABELS[k]).filter(Boolean).join(', ');
            n.success(what ? `+${pr.change} points · ${what}` : `+${pr.change} points`, { title: 'Points', duration: 3000 });
        }
        if (n && pr.levelUp) n.success(`You reached level ${pr.level}.`, { title: 'Level up', duration: 4000 });
        for (const b of pr.newBadges || []) n?.success(`${b.name}: ${b.description}`, { title: 'New badge', duration: 5000 });
        const panel = document.querySelector('.tab-panel[data-panel="progress"]');
        if (panel && !panel.hidden) load();
    }

    // Every API response that changed points carries `progress`
    function hookApp() {
        if (typeof app === 'undefined' || !app?.apiCall || app.apiCall.__progress) return false;
        const orig = app.apiCall.bind(app);
        const wrapped = async (...args) => {
            const res = await orig(...args);
            if (res && typeof res === 'object' && res.progress && 'change' in res.progress) {
                try { afterChange(res.progress); } catch (err) { console.warn(err); }
            }
            return res;
        };
        wrapped.__progress = true;
        app.apiCall = wrapped;
        return true;
    }

    window.Progress = { load, afterChange };

    // script.js creates `app` on DOMContentLoaded (this listener runs after it)
    let tries = 0;
    const ready = () => { if (!hookApp() && ++tries < 50) setTimeout(ready, 200); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
})();
