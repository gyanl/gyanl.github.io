/* Parallax for any image whose frame is shorter than it is: the image slides
   within its frame as the frame crosses the viewport.
 *
 * Same split as the hero (animate-g-logo.js): this file only publishes a
 * scalar, --parallax, and main.css owns every bit of the geometry. Nothing
 * here reads or writes layout properties.
 *
 * Performance, which is the whole point of the structure:
 *   - ONE scroll listener for the whole page, passive, rAF-throttled. Per-
 *     element listeners would each schedule their own frame.
 *   - An IntersectionObserver decides who is on screen. Off-screen frames are
 *     not measured and not written to, so a page of twenty cards still only
 *     costs the two or three actually in view.
 *   - Reads are batched before writes inside the frame — measuring after a
 *     style write on the same element would force a synchronous relayout.
 *   - The published value moves a composited property (translate), so a frame
 *     costs a recomposite, not a repaint or a reflow.
 */
(function () {
    'use strict';

    var SELECTOR = '.project-thumbnail';

    var targets = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    if (!targets.length) return;

    /* How much taller the image is than its frame. CSS cannot work this out —
       it falls out of the image's aspect ratio against the column's width — so
       it is measured here and published as a px value the CSS then divides up.
       Re-measured on resize, since the column width drives it.

       Runs even under reduced motion: the still, centred crop is derived from
       the same number, it just doesn't move afterwards. */
    function measure() {
        for (var i = 0; i < targets.length; i++) {
            var img = targets[i];
            var frame = img.parentElement;
            if (!frame) continue;
            var overflow = Math.max(0, img.offsetHeight - frame.clientHeight);
            /* On the frame, not the image — see main.css: both scalars are
               inherited down, so that the scroll-driven animation (which can
               only run on the frame) is not shadowed by a local copy. */
            frame.style.setProperty('--parallax-overflow', overflow.toFixed(2) + 'px');
        }
    }

    measure();
    /* Images arriving later change the answer; the width/height attributes mean
       most are already sized at parse, but a cached-miss decode is not. */
    window.addEventListener('load', measure);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* Scroll-driven animations do this natively, off the main thread — see the
       @supports block in main.css. Where they exist, everything below is dead
       weight and a second driver for the same property. */
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()')) return;

    var visible = [];
    var ticking = false;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            var i = visible.indexOf(entry.target);
            if (entry.isIntersecting && i === -1) visible.push(entry.target);
            else if (!entry.isIntersecting && i !== -1) visible.splice(i, 1);
        });
        update();
    }, {
        /* A margin so a frame starts tracking just before it appears: entering
           at exactly 0 would mean its first painted frame is whatever the
           previous scroll position left behind. */
        rootMargin: '10% 0px'
    });

    targets.forEach(function (el) {
        observer.observe(el.parentElement || el);
    });

    function update() {
        var viewport = window.innerHeight;
        var i;

        /* Read pass. */
        var measured = [];
        for (i = 0; i < visible.length; i++) {
            var rect = visible[i].getBoundingClientRect();
            /* Progress of the frame's centre across the window: -1 when it sits
               a full window below the middle (entering), +1 when a window above
               (leaving), 0 dead centre. Clamped, because rootMargin lets a
               frame report in slightly past either end. */
            var centre = rect.top + rect.height / 2;
            var t = (centre - viewport / 2) / (viewport / 2 + rect.height / 2);
            /* Negated so it matches the keyframes' -1 (entering, bottom) to
               +1 (leaving, top) — the CSS path is the reference. */
            measured.push([visible[i], Math.max(-1, Math.min(1, -t))]);
        }

        /* Write pass. */
        for (i = 0; i < measured.length; i++) {
            if (measured[i][0]) {
                measured[i][0].style.setProperty('--parallax', measured[i][1].toFixed(4));
            }
        }

        ticking = false;
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
    }

    function onResize() {
        measure();
        onScroll();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    update();
})();
