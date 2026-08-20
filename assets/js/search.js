/**
 * Search, in the header bar.
 *
 * The index is /search.json, built by Liquid at build time — which is what lets
 * this work on a site GitHub Pages builds for us, with no plugin and no
 * post-build step. It holds three kinds of thing, each tagged with its `type`:
 * articles, tags and pages.
 *
 * Nothing is fetched until someone uses the box. Lunr is ~8kB gzipped and the
 * index ~140kB, almost all of it post bodies, against a page that is otherwise
 * a few kB: loading either up front would mean every reader paying for a
 * feature most of them never touch. Focusing the field pays for it once, and it
 * is cached for the rest of the visit.
 *
 * The query strategy — exact terms boosted, the same terms again as trailing
 * wildcards, then an edit-distance pass only if those found nothing — is lifted
 * from the Search.js in the tech1 repo, itself from just-the-docs. The wildcard
 * pass is what makes the box feel live as you type, since a half-typed word is
 * a prefix and nothing else.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-search]');
  if (!root) return;

  var input = root.querySelector('.search__input');
  var panel = root.querySelector('.search__panel');
  var results = root.querySelector('.search__results');
  var status = root.querySelector('.search__status');
  var count = root.querySelector('.search__count');

  // The match count, shown as a disc at the end of the field. Hidden when there
  // is no number to show — a query with no matches says so in words instead, and
  // an empty box says nothing at all.
  //
  // The status element keeps the wording either way, because it is the live
  // region a screen reader hears; when the disc is carrying the number, status
  // is dropped to sr-only rather than emptied, so the announcement survives
  // without the panel gaining a line of prose above the results.
  function setCount(n) {
    if (!count) return;
    count.classList.remove('search__count--hint');
    if (n === null) {
      count.hidden = true;
      count.textContent = '';
      status.classList.remove('search__status--quiet');
      return;
    }
    count.hidden = false;
    count.textContent = n > 99 ? '99+' : String(n);
    status.classList.add('search__status--quiet');
  }

  // The resting state: no query yet, so the disc carries the key that gets you
  // here instead of a number. Tab reaches this field before anything else on
  // the page, and the hint is what says so — it is the same shape the count
  // will take once there is one, so nothing moves when it is replaced.
  //
  // Not shown where there is no Tab key to press: see the hover/pointer query
  // on .search__count--hint in main.css.
  function setHint() {
    if (!count) return;
    count.hidden = false;
    count.textContent = 'tab';
    count.classList.add('search__count--hint');
    status.classList.remove('search__status--quiet');
  }

  var DEBOUNCE_MS = 120;
  var PER_GROUP = 8;

  // Rendered under these headings, and only when a group has something in it.
  // The icon is Phosphor, which the site already loads for the footer and the
  // work cards — so a result carries its kind at a glance without a second
  // icon set, and without the heading being the only thing that says so.
  //
  // A group is a predicate rather than a bare `type`, because Projects and
  // Articles are both type `article` in the index and separate on `is_repo` —
  // a repo-backed post is written up here but its page is a standalone repo of
  // the same name (gyanl.com/rish-e is the `rish-e` repo's own Pages site), so
  // it behaves like somewhere to go rather than something to read. Projects
  // sits above Articles for the same reason the others are ordered as they are:
  // narrower kinds first, the catch-all last.
  //
  // Order matters twice over — this is also the order groupFor() tests in, so
  // the Articles entry must stay last, being the one that would swallow both.
  var GROUPS = [
    { key: 'tag', label: 'Tags', icon: 'ph-tag', match: function (doc) { return doc.type === 'tag'; } },
    { key: 'page', label: 'Pages', icon: 'ph-browser', match: function (doc) { return doc.type === 'page'; } },
    { key: 'repo', label: 'Projects', icon: 'ph-arrow-up-right', match: function (doc) { return doc.type === 'article' && doc.is_repo; } },
    { key: 'article', label: 'Articles', icon: 'ph-article', match: function (doc) { return doc.type === 'article'; } }
  ];

  function groupFor(doc) {
    for (var i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].match(doc)) return GROUPS[i];
    }
    return null;
  }

  var index = null;
  var docs = null;
  var loading = null;
  var timer = null;
  var lastQuery = null;

  /* ---- loading, once and lazily ----------------------------------------- */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('could not load ' + src)); };
      document.head.appendChild(script);
    });
  }

  function build() {
    if (loading) return loading;

    loading = loadScript(root.dataset.searchLunr)
      .then(function () { return fetch(root.dataset.searchIndex); })
      .then(function (response) {
        if (!response.ok) throw new Error('index responded ' + response.status);
        return response.json();
      })
      .then(function (json) {
        docs = json;

        // Split on slashes as well as whitespace, so "UI/UX" is two tokens and
        // a search for either half finds it.
        lunr.tokenizer.separator = /[\s/]+/;

        index = lunr(function () {
          /* Lunr drops a list of common words by default, from the index and
             from the query alike. On a corpus this size that trade is the wrong
             way round: "about" is a stop word, so the /about page could not be
             found by typing its own name, and "How to Build a UX Design
             Portfolio" ranked third for "how to" behind two posts that merely
             contain both words.

             Removing the filter costs 5422 → 5517 index terms, under 2%, and it
             is built in the browser from JSON that has already been fetched —
             so it is memory, not bandwidth. Both pipelines have to lose it or
             the query keeps filtering terms the index still holds. */
          this.pipeline.remove(lunr.stopWordFilter);
          this.searchPipeline.remove(lunr.stopWordFilter);

          this.ref('id');
          // Weighted by how strongly a hit in each field says the thing is
          // *about* the term: a title match is near-certain, a body match is
          // often a passing mention.
          this.field('title', { boost: 200 });
          this.field('tags', { boost: 20 });
          this.field('subtitle', { boost: 10 });
          this.field('content', { boost: 2 });

          var builder = this;
          docs.forEach(function (doc, i) {
            builder.add({
              id: String(i),
              title: doc.title,
              tags: (doc.tags || []).join(' '),
              subtitle: doc.subtitle,
              content: doc.content
            });
          });
        });
      })
      .catch(function (error) {
        setCount(null);
        status.textContent = 'Search could not load.';
        // Cleared so a later keystroke retries rather than being stuck on a
        // promise that already rejected.
        loading = null;
        console.warn('search:', error);
      });

    return loading;
  }

  /* ---- querying --------------------------------------------------------- */

  function query(text) {
    var hits = index.query(function (q) {
      var tokens = lunr.tokenizer(text);
      q.term(tokens, { boost: 10 });
      // The prefix pass. Without it nothing matches until a word is finished.
      q.term(tokens, { wildcard: lunr.Query.wildcard.TRAILING });
    });

    // Only if the exact and prefix passes came back empty is it worth guessing
    // at a typo — an edit-distance pass run alongside them would bury good
    // matches under near-misses.
    if (!hits.length && text.length > 2) {
      var tokens = lunr.tokenizer(text).filter(function (token) {
        return token.str.length < 20;
      });

      if (tokens.length) {
        hits = index.query(function (q) {
          q.term(tokens, { editDistance: Math.round(Math.sqrt(text.length / 2 - 1)) });
        });
      }
    }

    return hits;
  }

  /* ---- rendering -------------------------------------------------------- */

  // Built with DOM calls and textContent rather than an HTML string. The index
  // is the site's own writing, but it is still content flowing into markup, and
  // a title containing a bracket should not be able to reshape the page.
  function renderHit(doc) {
    var group = groupFor(doc);

    var item = document.createElement('a');
    item.className = 'search-hit search-hit--' + (group ? group.key : doc.type);
    item.href = doc.url;

    // Decorative: the heading above already names the kind, and the icon would
    // only repeat it to a screen reader. It comes from the group rather than
    // from the type, so a Project carries the outbound arrow that its own
    // heading is titled with.
    var icon = document.createElement('i');
    icon.className = 'ph ' + ((group && group.icon) || 'ph-file') + ' search-hit__icon';
    icon.setAttribute('aria-hidden', 'true');
    item.appendChild(icon);

    var body = document.createElement('span');
    body.className = 'search-hit__body';

    var title = document.createElement('span');
    title.className = 'search-hit__title';
    title.textContent = doc.title;
    body.appendChild(title);

    // Unlisted: reachable, but deliberately not on any listing page. Worth
    // saying so, since a reader who finds one here will not find it again by
    // browsing — and it explains why it is not where they expected it.
    if (doc.hidden) {
      var flag = document.createElement('span');
      flag.className = 'search-hit__flag';
      flag.textContent = 'Unlisted';
      title.appendChild(document.createTextNode(' '));
      title.appendChild(flag);
    }

    // The subtitle is what tells two similarly-named things apart, and the date
    // is what orders them. Neither is worth a line of its own in a dropdown.
    var detail = doc.subtitle || doc.date;
    if (detail) {
      var sub = document.createElement('span');
      sub.className = 'search-hit__detail';
      sub.textContent = detail;
      body.appendChild(sub);
    }

    item.appendChild(body);
    return item;
  }

  function render(hits) {
    results.textContent = '';

    if (!hits.length) {
      setCount(null);
      status.textContent = 'No matches.';
      return;
    }

    setCount(hits.length);
    status.textContent = hits.length === 1 ? '1 match' : hits.length + ' matches';

    // Grouped by kind, but the groups are ordered by their own best hit rather
    // than by a fixed sequence — so typing a tag name puts Tags on top and
    // typing a phrase from a post puts Articles on top, instead of burying
    // whichever the reader plainly meant under a heading they did not.
    var grouped = GROUPS.map(function (group) {
      var members = hits.filter(function (hit) { return groupFor(docs[hit.ref]) === group; });
      return { label: group.label, members: members, best: members.length ? members[0].score : -1 };
    }).filter(function (group) {
      return group.members.length;
    }).sort(function (a, b) {
      return b.best - a.best;
    });

    grouped.forEach(function (group) {
      var section = document.createElement('div');
      section.className = 'search-group';

      var heading = document.createElement('p');
      heading.className = 'search-group__label';
      heading.textContent = group.label;
      section.appendChild(heading);

      group.members.slice(0, PER_GROUP).forEach(function (hit) {
        section.appendChild(renderHit(docs[hit.ref]));
      });

      results.appendChild(section);
    });
  }

  /* ---- the box ---------------------------------------------------------- */

  function run() {
    var text = input.value.trim();

    if (text === '') {
      lastQuery = null;
      results.textContent = '';
      setHint();
      status.textContent = '';
      panel.hidden = true;
      return;
    }

    if (text === lastQuery) return;
    lastQuery = text;

    panel.hidden = false;
    if (!index) {
      setCount(null);
      status.textContent = 'Loading search…';
    }

    build().then(function () {
      // The index may have failed, or the box may have been cleared or changed
      // while it loaded — in either case there is nothing to render now.
      if (!index || input.value.trim() !== text) return;
      render(query(text));
    });
  }

  input.addEventListener('input', function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, DEBOUNCE_MS);
  });

  // Warm both files on focus, so the wait is usually over before the first word
  // is finished.
  input.addEventListener('focus', build, { once: true });

  // Re-show a panel the reader clicked away from, without re-querying.
  input.addEventListener('focus', function () {
    if (input.value.trim() !== '' && results.childNodes.length) panel.hidden = false;
  });

  input.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    input.value = '';
    run();
    input.blur();
  });

  // A type=search box has its own clear affordance, which fires `search` rather
  // than `input` in some browsers.
  input.addEventListener('search', run);

  // Clicking away puts the panel down. Not on blur: a click travelling to a
  // result is a blur first, and the panel would be gone before it landed.
  document.addEventListener('click', function (event) {
    if (root.contains(event.target)) return;
    panel.hidden = true;
  });

  // The resting hint, drawn once the script is running. It is not in the markup
  // because the disc is a JavaScript affordance: with the script dead the field
  // is hidden entirely (.no-js .search), and a "tab" chip promising a search
  // that never answers would be worse than no chip.
  setHint();
})();
