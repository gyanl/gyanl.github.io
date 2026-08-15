/*
 * The notes on the hero stickers.
 *
 * Hover and keyboard focus are handled entirely in CSS — see .hero-sticker__tip
 * in main.css. All this file adds is TAP, which CSS cannot express: a touch has
 * no hover state to leave, so an open note needs something to close it.
 *
 * One note open at a time, and it closes on a tap elsewhere, on Escape, or as
 * soon as the page scrolls — the stickers are thrown out of frame by scrolling,
 * so a note still hanging on to one would sail off with it.
 */
document.addEventListener('DOMContentLoaded', function () {
    var ring = document.getElementById('hero-stickers');
    if (!ring) return;

    var open = null;

    var close = function () {
        if (!open) return;
        open.classList.remove('is-open');
        open = null;
    };

    ring.addEventListener('click', function (event) {
        var hit = event.target.closest('.hero-sticker__hit');
        if (!hit) return;

        var sticker = hit.parentElement;
        var wasOpen = sticker === open;

        close();
        if (wasOpen) return;

        sticker.classList.add('is-open');
        open = sticker;

        // Otherwise the document listener below sees this same click and shuts
        // the note again in the same tick.
        event.stopPropagation();
    });

    document.addEventListener('click', close);
    window.addEventListener('scroll', close, { passive: true });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') close();
    });
});
