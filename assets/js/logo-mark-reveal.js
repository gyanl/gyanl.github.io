/**
 * The mark above the page redraws itself on hover.
 *
 * Same construction as the hero's reveal — seven strokes over one geometry,
 * each lagging the one before, so what shows is the DIFFERENCE in how far each
 * has drawn, as bands of colour running along the stroke. The difference is
 * what drives it: the hero is scrubbed by the scroll position, this one runs on
 * its own clock for a fixed duration.
 *
 * Hover rather than click, deliberately. The mark is a link — to /writing — so
 * a click leaves before an animation could play, and deferring the navigation
 * until it finished would put a held beat on every use of it. The cost is that
 * it does nothing on touch, where there is no hover; the resting mark is the
 * finished one, so what a phone gets is simply the logo.
 *
 * Everything here is inline styles on top of the resting state in main.css, and
 * they are removed at the end of a run, so with this file absent (or reduced
 * motion asked for) the mark is drawn and plain.
 */
(function () {
  'use strict';

  var mark = document.querySelector('.logo-mark');
  if (!mark) return;

  var layers = Array.prototype.slice.call(mark.querySelectorAll('.g-reveal-layer'));
  if (!layers.length) return;

  // The path's own length, and the figure main.css sets as the dash. Read off
  // the stylesheet rather than measured: <use> has no getTotalLength, and the
  // geometry is a constant in the markup anyway.
  var LENGTH = 166.2067;
  var DURATION = 820;

  // Where the LEAD layer finishes, as a fraction of the run. Less than 1 so the
  // laggards still have runway left after it lands and the bands close up
  // instead of all arriving together. Mirrors the hero's drawEnd.
  var DRAW_END = 0.72;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var frame = null;
  var startedAt = 0;

  /** Cubic ease-out — quick off the mark, settling into the finish. */
  function ease(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 - Math.pow(1 - t, 3);
  }

  function paint(progress) {
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var lag = parseFloat(layer.dataset.lag) || 0;
      // Each layer gets whatever is left of the lead's run after its own lag,
      // so they are all timed to land together however far back they start.
      var span = Math.max(DRAW_END - lag, 0.0001);
      var drawn = ease((progress - lag) / span);
      layer.style.strokeDashoffset = LENGTH * (1 - drawn);
    }
  }

  /** Hand the mark back to the stylesheet: drawn, plain, no inline state. */
  function settle() {
    // Dropping the class is what hides the six colour layers again — see the
    // note on .logo-mark.is-revealing in main.css. At this size they cannot
    // simply be covered by the ink layer.
    mark.classList.remove('is-revealing');

    for (var i = 0; i < layers.length; i++) {
      layers[i].style.strokeDashoffset = '';
    }
  }

  function step(now) {
    var progress = (now - startedAt) / DURATION;

    if (progress >= 1) {
      frame = null;
      settle();
      return;
    }

    paint(progress);
    frame = window.requestAnimationFrame(step);
  }

  function play() {
    if (reduced.matches) return;
    // A run already going is left alone rather than restarted — sweeping the
    // pointer over the mark would otherwise stutter it back to the ball
    // repeatedly and never finish.
    if (frame !== null) return;

    startedAt = window.performance.now();
    mark.classList.add('is-revealing');
    paint(0);
    frame = window.requestAnimationFrame(step);
  }

  mark.addEventListener('mouseenter', play);

  // Keyboard parity: the mark is a link, so it takes focus, and a reveal that
  // only ever fires for a pointer would be a thing only some readers get.
  mark.addEventListener('focus', play);

  // If the scheme flips to reduced mid-run, stop where it is and settle rather
  // than carrying on to the end.
  reduced.addEventListener('change', function (event) {
    if (!event.matches || frame === null) return;
    window.cancelAnimationFrame(frame);
    frame = null;
    settle();
  });
})();
