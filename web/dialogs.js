/**
 * dialogs.js — makes every pop-up in the app behave like a real dialog, without touching how each
 * one is opened or closed (script.js shows them with style.display, some are created on the fly):
 *   - screen readers hear a dialog with its title (role="dialog", aria-modal, aria-labelledby)
 *   - focus moves into it, Tab stays inside it, and goes back to where it was on close
 *   - Esc closes it, and so does the phone's Back button (instead of leaving the page)
 * Closing always goes through the dialog's own close/cancel button, so script.js cleans up as usual.
 */
(function () {
    'use strict';

    const SELECTOR = '.modal-overlay[id], body > .modal-overlay, .modal[id], .confirmation-modal, .data-sources-modal, .calorie-input-modal';
    const CLOSE = '[data-action^="close"], .btn-close, .modal-close, #confirmationCancelBtn';
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const stack = [];          // open dialogs, last = on top: { el, returnTo, token }
    let ignorePops = 0;        // history.back() calls we made ourselves
    let counter = 0;

    const visible = (el) => el.isConnected && getComputedStyle(el).display !== 'none' && !el.hidden;
    const isDialog = (el) => el.matches(SELECTOR) && !el.parentElement?.closest(SELECTOR);

    function panelOf(el) {
        return el.querySelector('[class*="modal-content"], .structure-modal') || el;
    }

    function open(el) {
        const token = `d${++counter}`;
        const panel = panelOf(el);
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        const heading = el.querySelector('h2, h3, h4');
        if (heading) {
            if (!heading.id) heading.id = `dialog-title-${token}`;
            panel.setAttribute('aria-labelledby', heading.id);
        }
        if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
        stack.push({ el, returnTo: document.activeElement, token });
        // the dialog itself takes focus (not the first field: on a phone that would pop the keyboard up)
        requestAnimationFrame(() => {
            if (!el.contains(document.activeElement)) panel.focus({ preventScroll: true });
        });
        history.pushState({ ...(history.state || {}), dialog: token }, '', location.href);
    }

    function closed(entry, { fromBack = false } = {}) {
        const i = stack.indexOf(entry);
        if (i !== -1) stack.splice(i, 1);
        const back = entry.returnTo;
        if (back && back.isConnected && typeof back.focus === 'function' && !stack.length) {
            try { back.focus({ preventScroll: true }); } catch { /* element gone */ }
        }
        // closed with its own button: drop the history entry we added when it opened
        if (!fromBack && history.state?.dialog === entry.token) {
            ignorePops++;
            history.back();
        }
    }

    function requestClose(entry) {
        const btn = [...entry.el.querySelectorAll(CLOSE)].find((b) => b.offsetParent !== null) || entry.el.querySelector(CLOSE);
        if (btn) btn.click();
        else entry.el.style.display = 'none';
    }

    // Check which dialogs opened or closed after any change to the page
    let scheduled = false;
    function sync() {
        scheduled = false;
        stack.slice().forEach((entry) => { if (!visible(entry.el)) closed(entry, { fromBack: entry.byBack }); });
        document.querySelectorAll(SELECTOR).forEach((el) => {
            if (isDialog(el) && visible(el) && !stack.some((s) => s.el === el)) open(el);
        });
    }
    new MutationObserver(() => {
        if (!scheduled) { scheduled = true; queueMicrotask(sync); }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });

    window.addEventListener('popstate', () => {
        if (ignorePops > 0) { ignorePops--; return; }
        const top = stack[stack.length - 1];
        if (!top) return;
        top.byBack = true;   // the history entry is already gone
        requestClose(top);
    });

    document.addEventListener('keydown', (e) => {
        const top = stack[stack.length - 1];
        if (!top) return;
        if (e.key === 'Escape') {
            if (e.defaultPrevented) return;   // e.g. a search list inside the dialog closed first
            e.preventDefault();
            requestClose(top);
        } else if (e.key === 'Tab') {
            const items = [...top.el.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
            if (!items.length) { e.preventDefault(); return; }
            const first = items[0], last = items[items.length - 1];
            if (!top.el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
            else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
})();
