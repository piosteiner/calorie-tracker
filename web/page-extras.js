// What used to be inline in index.html — files only, for the Content-Security-Policy (2026-11-10).
// "Visit" opens the share link in a new tab
document.getElementById('visitShareLinkBtn')?.addEventListener('click', function () {
    const u = document.getElementById('shareLinkInput').value;
    if (u) window.open(u, '_blank', 'noopener,noreferrer');
});
// offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
}
