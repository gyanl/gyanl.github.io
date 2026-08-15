/*
 * The hero stickers' two interactions: the note, and the drag.
 *
 * Hover and keyboard focus are handled entirely in CSS — see .hero-sticker__tip
 * in main.css. This file adds the two things CSS cannot express:
 *
 *   TAP, because a touch has no hover state to leave, so an open note needs
 *   something to close it; and
 *
 *   DRAG, which writes --drag-x / --drag-y onto the sticker. Those feed the
 *   independent `translate` property, so the offset composes with the scroll
 *   throw already in `transform` instead of overwriting it.
 *
 * One note open at a time, closed by a tap elsewhere, Escape, or the page
 * scrolling — the stickers are thrown out of frame by scrolling, so a note
 * still attached to one would sail off with it.
 */
document.addEventListener('DOMContentLoaded', function () {
    var ring = document.getElementById('hero-stickers');
    if (!ring) return;

    /* ---- notes ---------------------------------------------------------- */

    var open = null;

    var close = function () {
        if (!open) return;
        open.classList.remove('is-open');
        open = null;
    };

    ring.addEventListener('click', function (event) {
        var hit = event.target.closest('.hero-sticker__hit');
        if (!hit) return;

        // A drag that ended over the sticker still fires a click. Swallow it,
        // or every drop would also toggle the note.
        if (dragged) {
            dragged = false;
            return;
        }

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

    /* ---- drag ----------------------------------------------------------- */

    // Far enough to be a drag rather than a wobbly click.
    var DRAG_THRESHOLD = 4;

    var held = null;
    var startX = 0;
    var startY = 0;
    var baseX = 0;
    var baseY = 0;
    var dragged = false;

    var readOffset = function (sticker, axis) {
        return parseFloat(sticker.style.getPropertyValue('--drag-' + axis)) || 0;
    };

    // Last line of defence against the browser's own image drag. CSS and the
    // draggable attribute both aim at this, but they are honoured unevenly, and
    // if a native drag does start it swallows the pointer stream and the
    // sticker simply stops following the cursor.
    ring.addEventListener('dragstart', function (event) {
        event.preventDefault();
    });

    ring.addEventListener('pointerdown', function (event) {
        var hit = event.target.closest('.hero-sticker__hit');
        if (!hit) return;

        // Touch is left alone: the finger that would drag a sticker is the one
        // scrolling the page, and stealing it would trap the reader in the
        // hero. Tap still opens the note.
        if (event.pointerType === 'touch') return;

        held = hit.parentElement;
        startX = event.clientX;
        startY = event.clientY;
        baseX = readOffset(held, 'x');
        baseY = readOffset(held, 'y');
        dragged = false;

        // Keeps the moves coming even when the pointer outruns the sticker.
        hit.setPointerCapture(event.pointerId);
    });

    ring.addEventListener('pointermove', function (event) {
        if (!held) return;

        var dx = event.clientX - startX;
        var dy = event.clientY - startY;

        if (!dragged) {
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            dragged = true;
            close();
            // Cleared on drop, not here: .is-applied replaces it, and swapping
            // both in one frame is what makes the landing read as one motion.
            held.classList.add('is-dragging');
            held.classList.remove('is-applied');
        }

        held.style.setProperty('--drag-x', (baseX + dx) + 'px');
        held.style.setProperty('--drag-y', (baseY + dy) + 'px');
    });

    /**
     * Point the sticker's shadow away from the middle of the ring, from
     * wherever it now sits.
     *
     * --shadow-x/y are authored in the markup off each sticker's own --dx/--dy,
     * which stops being true the moment the reader moves one: a sticker carried
     * from the left of the ring to the right kept a shadow falling the wrong
     * way. The convention is the same one the markup uses — the direction out
     * from the centre, times six, plus a few pixels of downward bias so the
     * group still reads as lit from above rather than purely radially.
     *
     * On drop, not on every move: the shadow lives in a filter, and rewriting a
     * filter mid-drag would repaint on every frame of it for no visible gain —
     * the lifted shadow is showing while the sticker is in the air anyway.
     */
    var aimShadow = function (sticker) {
        var box = sticker.getBoundingClientRect();
        // The ring is centred on the viewport: .hero-stickers spans the width
        // and its stickers hang off 50% / 50vh.
        var x = box.left + box.width / 2 - window.innerWidth / 2;
        var y = box.top + box.height / 2 - window.innerHeight / 2;

        var length = Math.hypot(x, y);
        if (!length) return;

        sticker.style.setProperty('--shadow-x', (x / length * 6).toFixed(1) + 'px');
        sticker.style.setProperty('--shadow-y', (y / length * 6 + 4).toFixed(1) + 'px');
    };

    var release = function () {
        if (!held) return;

        if (dragged) {
            aimShadow(held);
            held.classList.remove('is-dragging');
            // Forcing a reflow between the two classes so the animation
            // restarts even when the same sticker is dropped twice running.
            void held.offsetWidth;
            held.classList.add('is-applied');
        }

        held = null;
    };

    ring.addEventListener('pointerup', release);
    ring.addEventListener('pointercancel', release);

    ring.addEventListener('animationend', function (event) {
        if (event.animationName !== 'sticker-apply') return;
        event.target.classList.remove('is-applied');
    });
});
