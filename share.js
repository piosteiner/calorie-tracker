// The public share page's script — a file, not an inline script, for the Content-Security-Policy (2026-11-10).
const API = 'https://api.calorie-tracker.piogino.ch/api';

const MEAL_LABELS = {
    breakfast: '🌅 Breakfast',
    lunch:     '☀️ Lunch',
    dinner:    '🌙 Dinner',
    snack:     '🍿 Snack',
    other:     '📝 Other'
};
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

const API_ORIGIN = new URL(API).origin;  // https://api.calorie-tracker.piogino.ch

function formatDate(dateStr) {
    // Normalise to plain YYYY-MM-DD before parsing (strips any time/timezone suffix)
    const str = String(dateStr);
    const plain = str.split('T')[0].split(' ')[0];
    let d = new Date(plain + 'T00:00:00');
    if (isNaN(d.getTime())) {
        // Last-resort: let the engine try to parse whatever the backend sent
        d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) {
        console.warn('formatDate: could not parse', JSON.stringify(dateStr));
        return String(dateStr);
    }
    return d.toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

async function main() {
    const params = new URLSearchParams(location.search);
    const rangeToken = params.get('r');
    if (rangeToken) {
        await loadRange(rangeToken);
    } else {
        await loadLegacy(params);
    }
}

async function loadRange(token) {
    const res = await fetch(`${API}/share/range/${encodeURIComponent(token)}`);
    if (!res.ok) { showError(`Could not load shared data (HTTP ${res.status}).`); return; }
    const json = await res.json();
    if (!json.success) { showError('This share link is invalid or has expired.'); return; }

    const { shared_by, date_from, date_to, data } = json;
    console.log('[loadRange] date_from:', JSON.stringify(date_from), 'date_to:', JSON.stringify(date_to), 'data keys:', Object.keys(data || {}).slice(0, 3));

    const periodEl = document.getElementById('headerMeta');
    if (date_from && date_to) periodEl.textContent = `${formatDate(date_from)} \u2014 ${formatDate(date_to)}`;
    else periodEl.textContent = '';

    const sortedDates = Object.keys(data || {}).sort((a, b) => new Date(b) - new Date(a));
    if (sortedDates.length === 0) { showError('No meals in this shared range.'); return; }

    const macroVal = (l, field) => { const v = parseFloat(l[field]); return isNaN(v) ? null : v; };
    const hasMacro = l => macroVal(l,'protein') != null || macroVal(l,'carbs') != null || macroVal(l,'fat') != null;

    let html = '';
    sortedDates.forEach(date => {
        const { logs: items = [], total_calories, comment } = data[date];

        const cats = {};
        items.forEach(log => {
            const cat = (log.meal_category || 'other').toLowerCase();
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push(log);
        });

        let mealsHtml = '';
        MEAL_ORDER.forEach(cat => {
            if (!cats[cat]) return;
            const catItems = cats[cat];
            let itemsHtml = '';
            catItems.forEach(log => {
                const time = log.meal_time ? ` \u00b7 ${String(log.meal_time).slice(0, 5)}` : '';
                itemsHtml += `<div class="log-row"><span class="log-name">${esc(log.food_name)}</span><span class="log-details">${Math.round(log.quantity)} ${esc(log.unit || 'g')}${time}</span><span class="log-kcal">${Math.round(log.calories)} kcal</span></div>`;
            });
            const groupPhotos = catItems.filter(l => l.image_url).map(l => l.image_url);
            const resolveImg = u => u.startsWith('http') ? u : API_ORIGIN + u;
            const photosHtml = groupPhotos.length
                ? `<div class="share-meal-photos">${groupPhotos.map(u => `<img src="${esc(resolveImg(u))}" alt="Meal photo" class="share-meal-thumb" loading="lazy">`).join('')}</div>`
                : '';
            const mealTotal = catItems.reduce((s, l) => s + (parseFloat(l.calories) || 0), 0);
            const mealHasMacros = catItems.some(hasMacro);
            const sP = catItems.reduce((s, l) => { const v = macroVal(l,'protein'); return v != null ? s+v : s; }, 0);
            const sC = catItems.reduce((s, l) => { const v = macroVal(l,'carbs');   return v != null ? s+v : s; }, 0);
            const sF = catItems.reduce((s, l) => { const v = macroVal(l,'fat');     return v != null ? s+v : s; }, 0);
            const mealMacrosHtml = mealHasMacros ? `<span class="meal-label-macros">${Math.round(sP)}g P\u00a0\u00b7\u00a0${Math.round(sC)}g C\u00a0\u00b7\u00a0${Math.round(sF)}g F</span>` : '';
            mealsHtml += `<div class="meal-group">
                <div class="meal-label"><span>${MEAL_LABELS[cat]}</span><span class="meal-label-right">${mealMacrosHtml}<span class="meal-label-total">${Math.round(mealTotal)}\u202fkcal</span></span></div>
                ${itemsHtml}
                ${photosHtml}
            </div>`;
        });

        const dayTotal = total_calories ?? items.reduce((s, l) => s + (parseFloat(l.calories) || 0), 0);
        const dayHasMacros = items.some(hasMacro);
        const dP = items.reduce((s, l) => { const v = macroVal(l,'protein'); return v != null ? s+v : s; }, 0);
        const dC = items.reduce((s, l) => { const v = macroVal(l,'carbs');   return v != null ? s+v : s; }, 0);
        const dF = items.reduce((s, l) => { const v = macroVal(l,'fat');     return v != null ? s+v : s; }, 0);
        const dayMacrosHtml = dayHasMacros ? `<div class="day-macros"><span>${Math.round(dP)}g Protein</span><span>${Math.round(dC)}g Carbs</span><span>${Math.round(dF)}g Fat</span></div>` : '';
        const commentHtml = comment ? `<div class="shared-day-comment">\ud83d\udcdd ${esc(comment)}</div>` : '';
        html += `<div class="day-group">
            <div class="day-header"><span>${formatDate(date)}</span><div class="day-header-right"><span class="day-total">${Math.round(dayTotal)}\u202fkcal</span>${dayMacrosHtml}</div></div>
            ${mealsHtml}
            ${commentHtml}
        </div>`;
    });

    const content = document.getElementById('content');
    const metaHtml = shared_by ? `<p class="meta">Shared by <strong>${esc(shared_by)}</strong></p>` : '';
    content.innerHTML = metaHtml + html;

    // Wire up lightbox for public range images
    content.querySelectorAll('.share-meal-thumb').forEach(img => {
        img.addEventListener('load', () => { img.onclick = () => openLightbox(img.src); });
        if (img.complete && img.naturalWidth) img.onclick = () => openLightbox(img.src);
    });
}

async function loadLegacy(params) {
    const tokenStr = params.get('t') || '';
    const from  = params.get('from');
    const to    = params.get('to');

    const shareIds = tokenStr.split(',').map(s => s.trim()).filter(Boolean);
    if (shareIds.length === 0) {
        showError('No share tokens found in this link.');
        return;
    }

    // Set header period info
    const periodEl = document.getElementById('headerMeta');
    if (from && to) periodEl.textContent = `${formatDate(from)} \u2014 ${formatDate(to)}`;
    else periodEl.textContent = '';

    // Fetch all log entries in parallel
    const results = await Promise.allSettled(
        shareIds.map(token =>
            fetch(`${API}/share/log/${encodeURIComponent(token)}`)
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                })
                .then(d => {
                    if (d.success && d.log) return { ...d.log, token };
                    // some backends wrap in data
                    if (d.data) return { ...d.data, token };
                    return null;
                })
                .catch(() => null)
        )
    );

    const logs = results
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);

    if (logs.length === 0) {
        showError('No meals could be loaded — the link may have expired or been revoked.');
        return;
    }

    // Group by date, then by meal category
    const byDate = {};
    logs.forEach(log => {
        const date = log.log_date ? String(log.log_date).split('T')[0].split(' ')[0] : '?';
        if (!byDate[date]) byDate[date] = {};
        const cat = (log.meal_category || 'other').toLowerCase();
        if (!byDate[date][cat]) byDate[date][cat] = [];
        byDate[date][cat].push(log);
    });

    // Parse shared day comments
    let sharedComments = {};
    const cParam = params.get('c');
    if (cParam) {
        try { sharedComments = JSON.parse(cParam); }
        catch (e) { console.warn('Could not parse day comments', e); }
    }

    // Helper: get per-100g protein/carbs/fat value from a log (tries both field naming conventions)
    const getPer100 = (l, field) => {
        const v100 = l[field + '_per_100g'];
        if (v100 != null) return parseFloat(v100);
        const v = l[field];
        if (v != null) return parseFloat(v);
        return null;
    };
    const macroG = (l, field) => {
        const per100 = getPer100(l, field);
        if (per100 == null) return null;
        return (per100 / 100) * (parseFloat(l.quantity) || 0);
    };
    const hasMacro = l => getPer100(l, 'protein') != null || getPer100(l, 'carbs') != null || getPer100(l, 'fat') != null;

    // Sort dates ascending
    const sortedDates = Object.keys(byDate).sort().reverse();

    let html = '';
    sortedDates.forEach(date => {
        const cats = byDate[date];
        let mealsHtml = '';
        MEAL_ORDER.forEach(cat => {
            if (!cats[cat]) return;
            const items = cats[cat];
            let itemsHtml = '';
            items.forEach(log => {
                const time = log.meal_time ? ` · ${log.meal_time.slice(0,5)}` : '';
                itemsHtml += `<div class="log-row"><span class="log-name">${esc(log.food_name)}</span><span class="log-details">${Math.round(log.quantity)} ${esc(log.unit || 'g')}${time}</span><span class="log-kcal">${Math.round(log.calories)} kcal</span></div>`;
            });
            const groupPhotos = items
                .filter(l => l.image_url)
                .map(l => l.image_url);
            const photosHtml = groupPhotos.length
                ? `<div class="share-meal-photos">${groupPhotos.map(u => `<img data-auth-src="${esc(u)}" alt="Meal photo" class="share-meal-thumb">`).join('')}</div>`
                : '';
            const mealTotal = items.reduce((sum, l) => sum + (parseFloat(l.calories) || 0), 0);
            const shareHasMacros = items.some(hasMacro);
            const sP = items.reduce((s,l) => { const v = macroG(l,'protein'); return v != null ? s+v : s; }, 0);
            const sC = items.reduce((s,l) => { const v = macroG(l,'carbs');   return v != null ? s+v : s; }, 0);
            const sF = items.reduce((s,l) => { const v = macroG(l,'fat');     return v != null ? s+v : s; }, 0);
            const shareMealMacros = shareHasMacros ? `<span class="meal-label-macros">${Math.round(sP)}g P\u00a0\u00b7\u00a0${Math.round(sC)}g C\u00a0\u00b7\u00a0${Math.round(sF)}g F</span>` : '';
            mealsHtml += `<div class="meal-group">
                <div class="meal-label"><span>${MEAL_LABELS[cat]}</span><span class="meal-label-right">${shareMealMacros}<span class="meal-label-total">${Math.round(mealTotal)}\u202fkcal</span></span></div>
                ${itemsHtml}
                ${photosHtml}
            </div>`;
        });

        const dayTotal = Object.values(cats).flat().reduce((sum, l) => sum + (parseFloat(l.calories) || 0), 0);
        const allItems = Object.values(cats).flat();
        const dayHasMacros = allItems.some(hasMacro);
        const dP = allItems.reduce((s,l) => { const v = macroG(l,'protein'); return v != null ? s+v : s; }, 0);
        const dC = allItems.reduce((s,l) => { const v = macroG(l,'carbs');   return v != null ? s+v : s; }, 0);
        const dF = allItems.reduce((s,l) => { const v = macroG(l,'fat');     return v != null ? s+v : s; }, 0);
        const dayMacrosHtml = dayHasMacros ? `<div class="day-macros"><span>${Math.round(dP)}g Protein</span><span>${Math.round(dC)}g Carbs</span><span>${Math.round(dF)}g Fat</span></div>` : '';
        const commentHtml = sharedComments[date]
            ? `<div class="shared-day-comment">📝 ${esc(sharedComments[date])}</div>`
            : '';
        html += `<div class="day-group">
            <div class="day-header"><span>${formatDate(date)}</span><div class="day-header-right"><span class="day-total">${Math.round(dayTotal)}\u202fkcal</span>${dayMacrosHtml}</div></div>
            ${mealsHtml}
            ${commentHtml}
        </div>`;
    });

    const content = document.getElementById('content');
    const sharedBy = logs[0]?.shared_by;
    const metaHtml = sharedBy
        ? `<p class="meta">Shared by <strong>${esc(sharedBy)}</strong></p>`
        : '';
    content.innerHTML = metaHtml + html;

    // Load images via CORS fetch to bypass CORP restriction
    content.querySelectorAll('img[data-auth-src]').forEach(async img => {
        const rawSrc = img.dataset.authSrc;
        const src = rawSrc.startsWith('http') ? rawSrc : new URL(rawSrc, API).href;
        try {
            const resp = await fetch(src);
            if (!resp.ok) return;
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            img.src = blobUrl;
            img.onclick = () => openLightbox(blobUrl);
        } catch (e) {
            console.warn('Failed to load meal image:', src, e);
        }
    });
}

function showError(msg) {
    document.getElementById('loading').remove?.();
    document.getElementById('content').innerHTML =
        `<div class="error-msg">⚠️ ${msg}</div>`;
}

function openLightbox(src) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightbox').classList.add('open');
}
document.getElementById('lightbox').addEventListener('click', () => {
    document.getElementById('lightbox').classList.remove('open');
});

document.getElementById('toggleImages').addEventListener('change', function () {
    document.getElementById('content').classList.toggle('hide-images', !this.checked);
});
document.getElementById('toggleText').addEventListener('change', function () {
    document.getElementById('content').classList.toggle('hide-text', !this.checked);
});

main().catch(err => showError('Unexpected error: ' + err.message));
