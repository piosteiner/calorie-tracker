// Feedback, as on the movies, books and arthistory sites: an "F" fixed at the bottom right that widens to "Feedback"
// on hover or focus. Its panel takes a kind (bug, idea, content, other), a message, optionally elements of the page
// ("Pick on the page": hovered ones are outlined, a click adds one, Esc or "Done" ends) and optionally an email address.
// Each element is sent described in words and with a CSS selector; ?fb=<JSON list of selectors> outlines them again
// (the admin's Feedback list links there). Bot protection: a form token from the API, a field people never see,
// and the server's minimum time. Sent to the calorie tracker API (backend/routes/feedback.js).
// The admin list (Admin tab → Feedback) is at the end of this file.
(function () {
  const KINDS = [['bug', 'Bug'], ['idea', 'Idea'], ['content', 'Content'], ['other', 'Other']];
  const MAX_ELEMENTS = 20;
  const API = () => (window.CONFIG?.API_BASE_URL || (typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : '')) + '/feedback';
  // the login token, under the key script.js saves it with (config.js: CONFIG.TOKEN_STORAGE_KEY)
  const authToken = () => { try { return localStorage.getItem((typeof CONFIG !== 'undefined' && CONFIG.TOKEN_STORAGE_KEY) || 'calorieTrackerToken') || ''; } catch { return ''; } };

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) n.append(c);
    return n;
  }

  // ---------- describing an element ----------

  function what(e) {
    if (e.closest('.food-item')) return 'logged food';
    if (e.closest('.meal-group-header')) return 'meal';
    if (e.closest('.qa-frequent')) return 'log again';
    if (e.closest('.quick-add')) return 'add food';
    if (e.closest('.today-summary')) return 'summary';
    if (e.closest('.app-tabs')) return 'tab';
    if (e.closest('.suggestion-item')) return 'search result';
    const tag = e.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return 'heading';
    return { img: 'image', a: 'link', button: 'button', p: 'text', li: 'list item', select: 'field', input: 'field', label: 'field', canvas: 'chart', td: 'table cell' }[tag] || 'part of the page';
  }
  const titleOf = (e) => e.closest('.food-item')?.querySelector('.food-name')?.firstChild?.textContent.trim() || '';

  // from the closest element with an id, tag:nth-of-type steps down
  function selectorOf(e) {
    const steps = [];
    let cur = e;
    while (cur && cur !== document.body) {
      if (cur.id && /^[A-Za-z][\w-]*$/.test(cur.id)) { steps.unshift(`#${cur.id}`); break; }
      const tag = cur.tagName.toLowerCase();
      const same = [...cur.parentElement.children].filter((c) => c.tagName === cur.tagName);
      steps.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(cur) + 1})` : tag);
      cur = cur.parentElement;
    }
    return steps.join(' > ');
  }

  // ---------- the button and the panel ----------

  const picked = [];
  let token = '';
  const button = el('button', { class: 'fb-button', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', title: 'Feedback' }, el('span', { class: 'fb-f', text: 'F' }), el('span', { class: 'fb-word', text: 'eedback' }));
  const list = el('ul', { class: 'fb-picked' });
  const msg = el('p', { class: 'fb-msg', role: 'status' });
  const form = el('form', { class: 'fb-panel', hidden: true, 'aria-label': 'Feedback' },
    el('div', { class: 'fb-head' }, el('strong', { text: 'Feedback' }), el('button', { class: 'fb-close', type: 'button', 'aria-label': 'Close', onclick: () => close() }, '×')),
    el('div', { class: 'fb-kinds', role: 'radiogroup', 'aria-label': 'Kind' },
      KINDS.map(([v, label], i) => el('label', {}, el('input', { type: 'radio', name: 'kind', value: v, checked: i === 0 }), el('span', { text: label })))),
    el('label', { class: 'fb-field' }, 'What’s on your mind?', el('textarea', { name: 'message', rows: 4, maxlength: 3000, required: true })),
    el('div', { class: 'fb-pick-row' },
      el('button', { class: 'fb-btn fb-ghost', type: 'button', onclick: () => startPicking() }, 'Pick on the page'),
      el('span', { class: 'fb-hint', text: 'Optional: point at what you mean.' })),
    list,
    el('label', { class: 'fb-field' }, 'Your email, if you’d like an answer (optional)', el('input', { name: 'email', type: 'email', maxlength: 200, autocomplete: 'email' })),
    el('label', { class: 'fb-hp', 'aria-hidden': 'true' }, 'Leave this empty ', el('input', { name: 'contact_me_by_fax', tabindex: '-1', autocomplete: 'new-password', 'data-lpignore': 'true', 'data-1p-ignore': true })),
    msg,
    el('div', { class: 'fb-actions' }, el('button', { class: 'fb-btn', type: 'submit' }, 'Send')));

  function open() {
    form.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    token = '';
    fetch(`${API()}/form-token`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).then((d) => { token = d.token || ''; }).catch(() => {});
    form.elements.message.focus();
  }
  function close() {
    stopPicking();
    form.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }
  button.addEventListener('click', () => (form.hidden ? open() : close()));

  function drawPicked() {
    list.replaceChildren(...picked.map((p, i) => el('li', {},
      el('span', { text: `${p.what}${p.title ? ` · ${p.title}` : ''}${p.text ? ` — “${p.text.slice(0, 60)}${p.text.length > 60 ? '…' : ''}”` : ''}` }),
      el('button', { class: 'fb-remove', type: 'button', 'aria-label': 'Remove', onclick: () => { picked.splice(i, 1); drawPicked(); } }, '×'))));
  }

  // ---------- picking elements ----------

  let picking = false;
  let hover = null;
  const bar = el('div', { class: 'fb-bar', hidden: true }, el('span', { text: 'Click what you mean (several are fine).' }),
    el('button', { class: 'fb-btn', type: 'button', onclick: () => stopPicking() }, 'Done'));
  const ours = (t) => t.closest?.('.fb-panel, .fb-button, .fb-bar');

  function startPicking() {
    picking = true;
    form.hidden = true;
    bar.hidden = false;
    document.body.classList.add('fb-picking');
  }
  function stopPicking() {
    if (!picking) return;
    picking = false;
    hover?.classList.remove('fb-hover');
    hover = null;
    bar.hidden = true;
    document.body.classList.remove('fb-picking');
    form.hidden = false;
  }
  document.addEventListener('mouseover', (e) => {
    if (!picking || ours(e.target)) return;
    hover?.classList.remove('fb-hover');
    hover = e.target;
    hover.classList.add('fb-hover');
  });
  document.addEventListener('click', (e) => {
    if (!picking || ours(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const t = e.target;
    t.classList.remove('fb-hover');
    if (picked.length < MAX_ELEMENTS) {
      picked.push({ selector: selectorOf(t), what: what(t), text: (t.innerText || t.alt || '').trim().replace(/\s+/g, ' ').slice(0, 200), title: titleOf(t) });
      drawPicked();
    }
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (picking) stopPicking(); else if (!form.hidden) close(); } });

  // ---------- sending ----------

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const send = form.querySelector('button[type=submit]');
    send.disabled = true;
    msg.className = 'fb-msg';
    msg.textContent = 'Sending…';
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken()) headers.Authorization = `Bearer ${authToken()}`;   // so you can see who wrote it
      const res = await fetch(API(), {
        method: 'POST', headers,
        body: JSON.stringify({
          kind: form.elements.kind.value, message: form.elements.message.value, email: form.elements.email.value,
          pageUrl: location.pathname + location.search + location.hash, pageTitle: document.title, elements: picked,
          viewport: `${innerWidth}×${innerHeight}`, token, contact_me_by_fax: form.elements.contact_me_by_fax.value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Sending failed.');
      form.elements.message.value = '';
      picked.length = 0;
      drawPicked();
      msg.className = 'fb-msg ok';
      msg.textContent = 'Thank you! Your feedback is on its way.';
    } catch (err) {
      msg.className = 'fb-msg bad';
      msg.textContent = err.message === 'Failed to fetch' ? 'Could not reach the server. Try again?' : err.message;
    } finally {
      send.disabled = false;
    }
  });

  // ---------- ?fb=[selectors]: shows what a visitor pointed at ----------

  function outlineFeedback() {
    let sel = [];
    try { sel = JSON.parse(new URLSearchParams(location.search).get('fb') || '[]'); } catch { return; }
    if (!Array.isArray(sel) || !sel.length) return;
    let first = null;
    const mark = () => {
      for (const s of sel) {
        try { document.querySelectorAll(String(s)).forEach((x) => { x.classList.add('fb-shown'); first ||= x; }); } catch { /* not a selector */ }
      }
      return first;
    };
    // the log loads after the page: try a few times
    let tries = 0;
    const timer = setInterval(() => { if (mark() || ++tries > 20) { clearInterval(timer); first?.scrollIntoView({ block: 'center' }); } }, 300);
  }

  // ---------- admin: Admin tab → Feedback ----------

  const KIND_LABEL = { bug: 'Bug', idea: 'Idea', content: 'Content', other: 'Other' };
  async function adminCall(path, method = 'GET', body) {
    const res = await fetch(API() + path, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  }

  async function loadAdminFeedback() {
    const box = document.getElementById('adminFeedbackList');
    if (!box) return;
    box.replaceChildren(el('p', { class: 'loading', text: 'Loading feedback…' }));
    try {
      const { feedback = [] } = await adminCall('');
      const open = feedback.filter((f) => !f.done).length;
      const count = document.getElementById('adminFeedbackCount');
      if (count) count.textContent = feedback.length ? `${open} open · ${feedback.length} in all` : '';
      if (!feedback.length) { box.replaceChildren(el('p', { class: 'fb-empty', text: 'No feedback yet.' })); return; }
      box.replaceChildren(...feedback.map((f) => {
        const when = new Date(f.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const sels = (f.elements || []).map((x) => x.selector);
        const link = sels.length ? `${location.origin}${(f.page_url || '/').split('?')[0]}?fb=${encodeURIComponent(JSON.stringify(sels))}` : '';
        return el('article', { class: `fb-item${f.done ? ' done' : ''}` },
          el('div', { class: 'fb-item-head' },
            el('span', { class: `fb-kind fb-kind-${f.kind}`, text: KIND_LABEL[f.kind] || 'Other' }),
            el('span', { class: 'fb-item-meta', text: [f.username || 'not logged in', when, f.viewport].filter(Boolean).join(' · ') }),
            el('span', { class: 'fb-item-actions' },
              el('button', { class: 'fb-btn fb-ghost', type: 'button', onclick: async () => { await adminCall(`/${f.id}`, 'PATCH', { done: !f.done }); loadAdminFeedback(); } }, f.done ? 'Reopen' : 'Done'),
              el('button', { class: 'fb-btn fb-ghost fb-danger', type: 'button', onclick: async () => { if (confirm('Delete this feedback?')) { await adminCall(`/${f.id}`, 'DELETE'); loadAdminFeedback(); } } }, 'Delete'))),
          el('p', { class: 'fb-item-text', text: f.message }),
          (f.elements || []).length ? el('ul', { class: 'fb-item-elements' }, f.elements.map((x) => el('li', { text: `${x.what}${x.title ? ` · ${x.title}` : ''}${x.text ? ` — “${x.text.slice(0, 80)}”` : ''}` }))) : null,
          el('div', { class: 'fb-item-foot' },
            f.email ? el('a', { href: `mailto:${f.email}`, text: f.email }) : null,
            link ? el('a', { href: link, target: '_blank', rel: 'noopener', text: 'Show on the page' }) : null));
      }));
    } catch (err) {
      box.replaceChildren(el('p', { class: 'fb-msg bad', text: `Could not load feedback: ${err.message}` }));
    }
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="show-admin-section"][data-section="Feedback"]')) loadAdminFeedback();
    if (e.target.closest('#adminFeedbackReload')) loadAdminFeedback();
  });

  function start() {
    document.body.append(button, form, bar);
    outlineFeedback();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
