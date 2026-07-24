# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gyan Lakhwani's personal site (gyanl.com), a Jekyll static site deployed by GitHub Pages from `master`. There is no build step to run before pushing — GitHub Pages builds it. Ruby 3.1.0 is pinned in `.tool-versions`; the `github-pages` gem pins all Jekyll plugin versions.

## Commands

```bash
script/bootstrap   # gem install bundler && bundle install
script/server      # bundle exec jekyll serve — local preview at localhost:4000
script/build       # bundle exec jekyll build → _site/
script/cibuild     # build, assert _site/index.html exists, then delete _site
```

**The local build needs a UTF-8 locale.** Under the default `LANG` on this machine, Ruby reads source files as US-ASCII and the build dies on the first non-ASCII character. Prefix with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` if you hit `Invalid US-ASCII character`. GitHub Pages builds fine because its locale is already UTF-8.

There are no tests and no linter. Verification is: does the build succeed, and does the page look right in `script/server`. `_site/` is committed in the working tree but gitignored — a stale local artifact, not the deployed output.

## Architecture

Originally a fork of the `minima` theme; the theme has since been replaced entirely. **There is no `_sass/` directory and no Sass step** — `assets/css/main.css` is plain CSS served as authored, and it is the only stylesheet on the site. `minima.gemspec` and `_config.yml`'s `theme: jekyll-theme-minimal` are vestigial.

The design system (tokens, Copernicus/TASA Orbiter type, glass nav, card grid) is lifted from the sibling repo `publicknowledgestudio.github.io`. If you change one, consider whether the other should follow.

**Layout chain:** `_layouts/default.html` is standalone — it emits `<html>` itself via `_includes/site/head.html`, then the sticky nav, `{{ content }}`, and `_includes/site/footer.html` (which closes `</body></html>`). `post`, `page`, `archive`, and `tagpage` all extend it. `home` does *not*: it needs a full-bleed hero, so it composes the same three site includes directly.

- `home.html` — hero (asterisk video reveal), About, the filterable work grid, recent writing.
- `archive.html` / `tagpage.html` — both render `_includes/site/post-list.html`, which takes a `posts` param. Jekyll rejects bracket indexing in an include param, so `tagpage` binds `site.tags[page.tag]` to a variable first.
- `post.html` — before markdownify, resolves Obsidian-style `[[Post Title]]` wikilinks against `site.documents` titles. Posts are authored in Obsidian (see `_posts/.obsidian/`), hence this.
- Tag pages are backed by stub files in `tag/*.md` (`layout: tagpage` + `tag:` + `description:`). **A new tag needs a matching `tag/<name>.md` stub or its links 404.**

**The home work grid is config-driven.** `home_tags` in `_config.yml` lists which tags become filter buttons and in what order; `_includes/home/work.html` reads it. Adding a section is a config line, not a template edit. Posts with `featured: true` get a "Featured" filter (currently none do, so the grid defaults to "All").

**The asterisk reveal.** `assets/js/animate-asterisk.js` drives a clip-path from scroll position. It measures `.hero-spacer` and completes the reveal exactly as that element scrolls past, so **retiming the effect is a one-line change to `.hero-spacer { height }` in `main.css`** — don't reintroduce a hardcoded viewport multiple in the JS. Keep the runway as a sized element, not a margin: margins collapse, and a `margin: 0` in any later breakpoint silently kills the whole effect (this was a real bug).

**Prose.** Post bodies get `.prose`, which carries all the markdown element styling. Two conventions inherited from the old theme and preserved: `h6` renders as an accent-barred pull-quote, not a heading; and `sup` is styled as a footnote chip.

## Writing posts

`_posts/YYYY-MM-DD-slug.md`. Front matter:

```yaml
---
layout: post
title: "Stats for Research Methods"
subtitle: Research for <del>dummies</del> designers
tags: slides
permalink: /drm-cheatsheet
thumbnail: https://gyanl.com/assets/thumbs/drm.png
---
```

`permalink` is site-wide `/:title`, so an explicit `permalink:` only overrides the filename slug. `subtitle` is used as the card/listing description. `thumbnail` is an absolute `https://gyanl.com/...` URL, not a relative path; layouts fall back to `assets/thumbs/default.png`.

**Thumbnails are square and small** — the existing set is 144×144 (some 100×100). The CSS caps them at 144px rather than upscaling. If you start shipping larger art, raise `--project-thumbnail-size`; until then, don't.

Drafts go in `_posts/Drafts/`, excluded in `_config.yml`. Files in `_posts/` whose names don't match the date convention (`AA 2022-11-18-designer.md`, `sale backup.md`) are silently skipped by Jekyll.

## Gotchas

- **`.measure` owns horizontal padding** on prose pages. A `padding` shorthand on a child (`.entry-header`, etc.) resets it and pulls that element out of line with the body text. Set `padding-top`/`padding-bottom` instead.
- **Empty content is not `""`.** A layout guarding on `{% if content != "" %}` will still render for a page with no body, because Liquid yields whitespace. `{% assign body = content | strip %}` first.
- `_posts/sale backup.md` has uncommitted local changes and is not a valid post filename. Left alone deliberately.
