/*
 * The experience stack — how deep each card sits in the waiting pile.
 *
 * The pile itself is CSS: every card is sticky to the bottom of the window, so
 * one that has not been reached yet is held just above the bottom edge with the
 * rest a step lower behind it (see .resume__row in main.css). What CSS cannot
 * work out is which cards are currently in that pile, and this publishes it as
 * --depth: 0 for the front card and for every card already released, then 1, 2,
 * 3 going back. main.css turns that into the scale.
 *
 * It has to be measured rather than derived from the rendered boxes. A pinned
 * card's box is at the bottom of the window whether it is first in the pile or
 * last, so nothing about where it is drawn says how deep it is — the only thing
 * that does is where it WOULD be, which is what the natural offsets below are.
 * The same fact is why animation-timeline: view() cannot drive this.
 */
document.addEventListener('DOMContentLoaded', function () {
    var list = document.querySelector('.resume__list');
    if (!list) return;

    var rows = Array.prototype.slice.call(list.querySelectorAll('.resume__row'));
    if (!rows.length) return;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)');

    // How far back the taper goes. Past this every card is at the back size,
    // which is all the offsets suggest anyway — the fourth card back shows a
    // few pixels of edge and nothing else.
    //
    // Depth is 1-based for a card still in the pile and 0 for one that has been
    // released: being stacked at all is what makes a card smaller, and coming
    // out of the pile is what takes it back to full size.
    var MAX_DEPTH = 3;

    // Its index and the number of rows, which main.css needs for the pile's
    // offsets and its paint order. Set once — neither depends on scrolling.
    rows.forEach(function (row, i) {
        row.style.setProperty('--i', i);
        row.style.setProperty('--rows', rows.length);
    });

    // Each card's top in list coordinates, and its height. Measured rather than
    // read per frame: these only change when the page is laid out again, and
    // reading them during a scroll is a forced layout on every frame.
    var slots = [];

    // Where the front of the pile rests. Read once from the section rather than
    // per row, and deliberately NOT from each row's computed `bottom`: main.css
    // now derives that from --depth, which is derived from this — reading it
    // back per frame would feed the pile's own stagger into the line that
    // decides the stagger, and a card on the boundary would flip between two
    // depths for ever. One fixed line, and the offsets hang off it.
    var restLine = 0;

    var measure = function () {
        var listTop = list.getBoundingClientRect().top + window.scrollY;
        var gap = parseFloat(getComputedStyle(list).rowGap) || 0;
        var run = 0;

        restLine = parseFloat(getComputedStyle(list).getPropertyValue('--stack-bottom')) || 0;

        slots = rows.map(function (row) {
            // Accumulated down the list rather than read off each row. Neither
            // measurement a row offers is its flow position: getBoundingClientRect
            // gives where it is DRAWN, which for a pinned card is the bottom of
            // the window, and offsetTop carries the same sticky shift — every
            // card read as released because every card reported itself already
            // up at the top of the list.
            //
            // offsetHeight, not the rect's: the rect is scaled by the taper, so
            // using it would feed the taper back into the measurement it is
            // derived from.
            var top = listTop + run;
            var height = row.offsetHeight;

            run += height + gap;

            return { top: top, height: height };
        });
    };

    var depths = rows.map(function () { return -1; });

    var render = function () {
        var scrolled = window.scrollY;
        var viewport = window.innerHeight;
        var ahead = 0;

        for (var i = 0; i < rows.length; i++) {
            var slot = slots[i];
            // The line this card would be pinned at. Above it the card is out
            // in the page and reading normally; below it, it is still waiting.
            var line = scrolled + viewport - restLine - slot.height;
            var waiting = slot.top > line;

            // Counted in document order, so the first card still waiting is the
            // front of the pile. It gets 1, not 0 — 0 means released, and a
            // card in the pile is scaled down however near the front it is.
            var depth = waiting ? Math.min(++ahead, MAX_DEPTH) : 0;

            // Written only on change. The value holds still for most of a
            // scroll, and a style write every frame per card is the whole cost
            // of this script.
            if (depths[i] === depth) continue;
            depths[i] = depth;
            rows[i].style.setProperty('--depth', depth);
        }
    };

    var queued = false;

    var onScroll = function () {
        if (queued) return;
        queued = true;

        requestAnimationFrame(function () {
            queued = false;
            render();
        });
    };

    var start = function () {
        measure();
        render();
    };

    if (still.matches) return;

    start();

    window.addEventListener('scroll', onScroll, { passive: true });

    // Card heights follow the text, which rewraps with the width — so the slots
    // are only valid for the width they were taken at.
    if (window.ResizeObserver) new ResizeObserver(start).observe(list);

    // The logos are lazy-loaded and reserve no height of their own, but the
    // fonts do change the height a wrapped line takes.
    if (document.fonts) document.fonts.ready.then(start);
});
