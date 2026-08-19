/**
 * Makes the slideshow strips wrap around.
 *
 * The strip itself is CSS only — a flex row with scroll-snap, scrolled by the
 * browser's own machinery, so there is no position to keep in sync and nothing
 * here drives the scrolling. All this does is make the strip *appear* endless:
 * the slides are cloned either side of the real set, the strip is parked on the
 * middle copy, and whenever the reader drifts onto a copy the scroll position is
 * shifted back by exactly one set's width. The content under the viewport is
 * identical at that moment, so the shift is invisible.
 *
 * Three copies, not two: the jump needs a full set of slack on BOTH sides of
 * wherever the reader currently is, or the correction lands somewhere that is
 * itself out of bounds and the strip fights itself at the seam.
 *
 * With this file absent the strip is exactly what it was — a finite row that
 * stops at each end. Nothing here is required for it to work.
 */
(function () {
  'use strict';

  var strips = document.querySelectorAll('.slideshow');
  if (!strips.length) return;

  Array.prototype.forEach.call(strips, function (strip) {
    var originals = Array.prototype.filter.call(strip.children, function (node) {
      return node.tagName === 'IMG';
    });

    // One slide has nothing to wrap around to, and cloning it would just be the
    // same picture three times over.
    if (originals.length < 2) return;

    /* ---- clone a set either side ---------------------------------------- */

    function cloneSet(where) {
      var fragment = document.createDocumentFragment();

      originals.forEach(function (img) {
        var copy = img.cloneNode(true);
        // The clones are the same pictures again. Announced, they would triple
        // the length of the strip for a screen reader; focusable, they would
        // put the same images in the tab order three times over.
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('tabindex', '-1');
        copy.dataset.slideshowClone = 'true';
        fragment.appendChild(copy);
      });

      if (where === 'before') strip.insertBefore(fragment, strip.firstChild);
      else strip.appendChild(fragment);
    }

    cloneSet('before');
    cloneSet('after');

    /* ---- geometry -------------------------------------------------------- */

    // One set's width, measured rather than computed: it is the gap between a
    // slide and its own clone one set along, which folds in the flex gap and any
    // difference in slide widths without having to know about either.
    var setWidth = 0;

    function measure() {
      var first = strip.children[0];
      var sameSlideNextSet = strip.children[originals.length];
      if (!first || !sameSlideNextSet) return;
      setWidth = sameSlideNextSet.offsetLeft - first.offsetLeft;
    }

    /* ---- the shift ------------------------------------------------------- */

    // Snapping has to come off for the correction. With `scroll-snap-type` live,
    // assigning scrollLeft hands the browser a position it will then re-snap
    // from, which drags the strip back toward the seam it was just moved away
    // from — visibly, as a stutter.
    function shiftBy(delta) {
      var snap = strip.style.scrollSnapType;
      strip.style.scrollSnapType = 'none';
      strip.scrollLeft += delta;
      // Read back, forcing the new position to be applied before snapping is
      // allowed to resume.
      void strip.offsetWidth;
      strip.style.scrollSnapType = snap;
    }

    function recentre() {
      if (!setWidth) return;

      // Park on the middle copy, so there is a full set to travel in either
      // direction before a correction is needed.
      shiftBy(setWidth - strip.scrollLeft);
    }

    var ticking = false;

    function onScroll() {
      if (ticking || !setWidth) return;
      ticking = true;

      window.requestAnimationFrame(function () {
        ticking = false;

        // Corrected at half a set from either edge of the middle copy rather
        // than at the copy boundary itself: at the boundary the reader is
        // already looking at the seam, and a correction there is a correction
        // made too late to hide.
        if (strip.scrollLeft < setWidth * 0.5) shiftBy(setWidth);
        else if (strip.scrollLeft > setWidth * 1.5) shiftBy(-setWidth);
      });
    }

    strip.addEventListener('scroll', onScroll, { passive: true });

    /* ---- start ----------------------------------------------------------- */

    measure();
    recentre();

    // The slides are images and the strip is sized by them, so the figures above
    // are provisional until they have loaded. Remeasure as each lands, holding
    // the reader's place in the set rather than snapping them back to the start.
    Array.prototype.forEach.call(strip.querySelectorAll('img'), function (img) {
      if (img.complete) return;
      img.addEventListener('load', function () {
        var before = setWidth;
        measure();
        if (!before) recentre();
      }, { once: true });
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        measure();
      }).observe(strip);
    }
  });
})();
