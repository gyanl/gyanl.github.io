/**
 * The header's back button.
 *
 * It means "where I just came from", so it runs the browser's own back — the
 * page it returns to is restored with its scroll position and its bfcache
 * state, which navigating to the same URL by href would not do.
 *
 * The href is the fallback and the no-JS behaviour both: the markup ships a
 * plain link to the page's parent in the site (see _includes/site/logo.html),
 * and this only takes the click when there is genuinely somewhere to go back
 * to. Someone who arrived from a search engine, a shared link or a new tab has
 * no history to pop, and popping anyway would take them off the site entirely —
 * or, with an empty history, do nothing at all and leave a dead button.
 */
(function () {
  'use strict';

  var link = document.querySelector('[data-back]');
  if (!link) return;

  /* Two conditions, and both are needed.
   *
   * history.length counts this tab's session, so it is > 1 for anyone who has
   * navigated at all — but it says nothing about WHERE those entries point, and
   * on a tab that started elsewhere the previous one is another site.
   *
   * document.referrer is what settles that: it is the page that linked here,
   * and comparing its origin keeps back inside gyanl.com. It is empty for a
   * direct visit, a bookmark, or a cross-origin referrer-policy — all cases
   * where the fallback is the right answer anyway.
   */
  function cameFromThisSite() {
    if (window.history.length <= 1) return false;
    if (!document.referrer) return false;

    try {
      return new URL(document.referrer).origin === window.location.origin;
    } catch (error) {
      // A referrer that will not parse is not one worth trusting.
      return false;
    }
  }

  link.addEventListener('click', function (event) {
    // Modified clicks belong to the browser: cmd/ctrl-click opens the fallback
    // in a new tab, which is a reasonable thing to want from a link, and
    // history.back() in a fresh tab would be meaningless.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;

    if (!cameFromThisSite()) return;

    event.preventDefault();
    window.history.back();
  });
})();
