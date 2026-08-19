/**
 * The light/dark switcher in the header.
 *
 * The scheme itself is CSS's job, and there are three states, not two:
 *
 *   no data-theme    follow the system, via @media (prefers-color-scheme: dark)
 *   data-theme=light pinned light
 *   data-theme=dark  pinned dark
 *
 * A page starts in the first state. The attribute is written by the inline
 * script in _includes/site/head.html, not here — it has to be set before the
 * first paint or the reader sees a frame of the wrong palette, and this file is
 * deferred. All this does is flip it afterwards and remember the choice.
 *
 * The home page has data-theme stamped at build time and renders no switcher,
 * so none of this runs there.
 */
(function () {
  'use strict';

  var toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  var root = document.documentElement;
  var icon = toggle.querySelector('.theme-toggle__icon');
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  var system = window.matchMedia('(prefers-color-scheme: dark)');

  // Kept in step with the two palettes in main.css: it is what mobile Safari
  // tints its status and address bars with, and a page that flips to light
  // under a dark browser chrome looks like two different pages.
  var GROUND = { light: '#FFFFFF', dark: '#1a1a1a' };

  /** What the page is actually showing, whether pinned or inherited. */
  function current() {
    var pinned = root.getAttribute('data-theme');
    if (pinned === 'light' || pinned === 'dark') return pinned;
    return system.matches ? 'dark' : 'light';
  }

  function paint() {
    var now = current();
    var next = now === 'dark' ? 'light' : 'dark';

    // The icon is the destination, not the current state — it is a button, and
    // a button should show what pressing it does.
    if (icon) icon.className = 'ph ' + (next === 'dark' ? 'ph-moon' : 'ph-sun') + ' theme-toggle__icon';
    toggle.setAttribute('aria-label', 'Switch to ' + next + ' theme');
    toggle.setAttribute('title', 'Switch to ' + next + ' theme');

    /* The two theme-color tags are scoped with media="(prefers-color-scheme:…)"
       so they follow the system on their own, which is right until a reader
       pins a scheme — the system is then the wrong question, and setting the
       content of a tag whose media does not match changes nothing at all. So
       while a scheme is pinned the media attributes come off and both tags name
       the colour the page is actually showing; unpinned, they are left alone to
       do their own job. */
    var pinned = root.hasAttribute('data-theme');
    Array.prototype.forEach.call(metas, function (meta) {
      if (!pinned) return;
      meta.removeAttribute('media');
      meta.setAttribute('content', GROUND[now]);
    });
  }

  toggle.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (error) {
      // Private mode, or storage disabled. The choice still holds for this
      // page; it simply will not be remembered on the next one.
    }
    paint();
  });

  // While the reader is following the system, a change to it should be followed
  // — and the button's own label has to keep up with what it would now do.
  system.addEventListener('change', function () {
    if (root.hasAttribute('data-theme')) return;
    paint();
  });

  paint();
})();
