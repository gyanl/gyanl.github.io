# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gyan Lakhwani's personal site (gyanl.com), a Jekyll static site deployed by GitHub Pages from `master`. There is no build step to run before pushing — GitHub Pages builds it. Ruby 3.1.0 is pinned in `.tool-versions`; the `github-pages` gem pins all Jekyll plugin versions.

## Commands

```bash
script/bootstrap   # gem install bundler && bundle install
script/server      # bundle exec jekyll serve — local preview at localhost:4000
script/build       # bundle exec jekyll build → _site/
script/cibuild     # build, assert _site/index.html exists, delete _site, gem build minima.gemspec
script/slice-stickers.py   # re-cut assets/stickers/*.png out of assets/stickers.png
```

**The local build needs a UTF-8 locale.** Under the default `LANG` on this machine, Ruby reads source files as US-ASCII and the build dies on the first non-ASCII character. Prefix with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` if you hit `Invalid US-ASCII character`. GitHub Pages builds fine because its locale is already UTF-8.

There are no tests and no linter. Verification is: does the build succeed, and does the page look right in `script/server`. `_site/` is gitignored — if it is present it is a stale local artifact, not the deployed output.

## Architecture

Originally a fork of the `minima` theme; the theme has since been replaced entirely. **There is no `_sass/` directory and no Sass step** — `assets/css/main.css` is plain CSS served as authored, and it is the only stylesheet on the site. `minima.gemspec` and `_config.yml`'s `theme: jekyll-theme-minimal` are vestigial.

The design system (tokens, glass nav, card grid) is lifted from the sibling repo `publicknowledgestudio.github.io`. If you change one, consider whether the other should follow. Type is `ui-rounded` first in both stacks — that generic is what actually resolves SF Pro Rounded, since the family name alone does not; Nunito is the non-self-hosted fallback, and the self-hosted TASA Explorer/Orbiter faces sit behind those.

**Layout chain:** `_layouts/default.html` is standalone — it emits `<html>` itself via `_includes/site/head.html`, then `site/logo.html`, the sticky `site/nav.html`, `{{ content }}`, and `_includes/site/footer.html` (which closes `</body></html>`). `post`, `page`, `archive`, and `tagpage` all extend it. `home` does *not*: it needs a full-bleed hero, so it composes the site includes directly — and deliberately carries **no logo and no nav**, just head, the hero, the content container, `site/contact.html` and the footer.

- `home.html` — the g-logo hero (see below), the About thread, `home/resume.html`, the work grid, the contact card.
- `archive.html` / `tagpage.html` — both render `_includes/site/post-list.html`, which takes a `posts` param. Jekyll rejects bracket indexing in an include param, so `tagpage` binds `site.tags[page.tag]` to a variable first.
- `post.html` — before markdownify, resolves Obsidian-style `[[Post Title]]` wikilinks against `site.documents` titles. Posts are authored in Obsidian (see `_posts/.obsidian/`), hence this.
- Tag pages are backed by stub files in `tag/*.md` (`layout: tagpage` + `tag:` + `description:`). **A new tag needs a matching `tag/<name>.md` stub or its links 404.**

**The home work grid is the `featured` tag, in date order.** `_includes/home/work.html` reads `site.tags.featured` and nothing else — no filter switcher, no tag chips on the cards. Adding a project to the grid means adding `featured` to that post's tags. `featured_first: true` in a post's front matter promotes it to the top regardless of its date.

**The home page uses three type sizes and no more.** `--font-size-xl` for body (messages, experience rows, work-card titles *and* descriptions), `--font-size-md` for labels and chrome (section headings, the contact label, buttons, the footer — which is pinned to `md` on mobile rather than following the body down to `sm`), and `--font-size-4xl` for the single display line in the contact card; on mobile each drops one step, to `lg`/`md`/`2xl`. What separates one thing from another within a tier is **colour**, not another size — the experience row sets its date, role and org identically and lets `--text-secondary` do the work, and the work cards do the same with title and description. Adding a fourth size to this page is a regression; reach for colour, case or tracking first. The rest of the site still uses the full scale.

`home_tags` in `_config.yml` used to drive the filter buttons and **is now read by no template at all** — it survives as documentation of the section order and because the `tag/*.md` stubs mirror it. Editing it changes nothing on the site. The `teaching` collection is likewise no longer surfaced in the grid, but it still outputs the `/dv`, `/ergo`, `/tech1` fallback pages, so leave it alone.

### The hero

`assets/js/animate-g-logo.js` drives the whole thing from **one** scroll listener and one `render()` per frame. Everything it animates is a phase in that method with its own band in `config` (`swellStart`, `shrinkStart`, `schemeStart`, `burstEnd`) and its own ease. Add effects as another phase there rather than a second scroll listener — anything on its own listener drifts a frame out of step with the mark, which is visible.

Geometry lives in CSS, not JS. The mark is a viewBox plus `--mark-unit`, so it resizes with no script at all; the JS only publishes scalars that `main.css` reads:

| property | set on | drives |
| --- | --- | --- |
| `--mark-shrink` | `.hero-mark` | mark and plate scaling down together |
| `--plate-settle` | `.hero-mark` | the white plate and the name label fading in |
| `--scheme-t` | `:root` | `--page-bg`/`--page-ink` crossfading light→dark |
| `--sticker-burst` | `:root` | the sticker ring's radial throw and fade |
| `--hero-progress` | `:root` | the scroll cue fading out (raw, not eased) |

All five have `:root` defaults, so the resting state is right on first paint and with JS off entirely.

**Retiming the whole reveal is a one-line change to `.hero-spacer { height }` in `main.css`** — the JS derives the runway by measuring that element. Don't reintroduce a hardcoded viewport multiple in the JS. Keep the runway a sized element, not a margin: margins collapse, and a `margin: 0` in any later breakpoint silently kills the effect (this was a real bug).

Three rules for anything added inside `.hero-spacer`:

- **Extra layers must be zero-height and sticky, placed before `.hero-mark`.** A sticky box holds its place in flow, so a viewport-tall layer takes 100vh out of the runway and leaves the mark a fraction of the pinned run it is timed against. At `height: 0` it costs no layout and its contents hang off it absolutely. It goes *before* the mark because sticky only ever pushes an element **down** to its `top` — placed after, a layer's natural position is already 100vh and it starts below the fold. Both `.hero-stickers` and `.hero-scroll-cue` are built this way.
- **The hero is pinned to light in every scheme,** by redeclaring `--hero-ink`, `--black-5` and `--black-10` on `.hero-spacer`. `--white` is *not* redeclared and flips to near-black in dark mode, so hero chrome that must stay white needs a literal `#FFFFFF` (see `.hero-mark__plate` and `.hero-scroll-cue__ring`).
- **`.hero-spacer` uses `overflow-x: clip`, never `hidden`.** The stickers are thrown well past the window and a transform landing off-screen is scrollable overflow. `hidden` would make the spacer a scroll container and break the sticky pinning of everything inside it.

**The sticker ring.** `_includes/home/hero-stickers.html` places six cut-outs from the Zomato iMessage pack around the mark. Each carries a direction vector (`--dx`/`--dy`) rather than an angle, because the ring is an ellipse (`--ring-x` by `--ring-y`) — a circle in `vmin` puts the top and bottom pair off a landscape window while bunching the sides against the mark — and scaling a vector per axis is one multiply where an angle would need trigonometry CSS lacks. The same vector is what they travel along, so the radial motion falls out of the placement. Retuning the layout is editing those inline custom properties; nothing else needs to change. Two spots are left empty on purpose: where the typing bubble hangs, and bottom dead centre, which is the scroll cue's.

**The scroll cue is a control, not just an indicator.** `.hero-scroll-cue__ring` is a `<button>`; `animate-g-logo.js` smooth-scrolls it to `#about-chat` (instant under `prefers-reduced-motion`), which runs the whole reveal on the way rather than cutting past it. Two consequences: `.hero-spacer` is **not** `aria-hidden` any more — a focusable control inside an aria-hidden subtree is announced to nobody while still taking a tab stop, so the decorative parts (`.hero-mark`, `.hero-stickers`, `.hero-greeting`) carry their own instead; and the same `render()` that fades the cue toggles `.is-gone` on it, which sets `visibility: hidden`. That last part is not optional — the cue is sticky at the foot of the window for the entire runway, so a merely transparent one would sit there eating clicks and holding a tab stop all the way down.

**The About thread is scrubbed, not triggered.** `assets/js/animate-about-chat.js` gives each bubble a `--send` scalar (0→1, with an overshoot baked into the ease) across its own band of scroll distance, and `main.css` derives opacity and transform from it — the same publish-a-scalar split the hero uses. So the page position *is* the animation state and scrolling back up unsends the thread message by message. Don't put a `transition` on those bubbles: the scalar already moves with the page, and a transition on top fights it every frame. The bands are staggered by a fixed `SEND_STEP`, not by each bubble's own layout position — the bubbles sit a few pixels apart, so bands cut from their geometry would all open at once on a tall viewport.

The cut-outs come from `assets/stickers.png` via `script/slice-stickers.py`. The white is knocked out with a flood fill from the sheet border rather than a global threshold, because three of the six sit on their own light card and "remove everything near white" eats those cards along with the gutter. The tolerance band is tight (the date sticker's lavender blob is only 16 off white) with a floor under it (the lettuce sticker's card is 3 off white, and without the floor it came back as a low alpha that un-premultiplied into a grey square).

Stickers are sized by **height**, not width: they came off one sheet of 480px cells so they share a height but not a width, and sizing by width blows the narrow ones up half again as large as the wide ones.

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
thumbnail: /assets/thumbs/drm.png
---
```

`permalink` is site-wide `/:title`, so an explicit `permalink:` only overrides the filename slug. `subtitle` is used as the card/listing description.

**Asset paths in post bodies are bare — `assets/...`, no leading slash.** The vault root is `_posts` and a gitignored local symlink `_posts/assets → ../assets` makes bare paths resolve in Obsidian; `_layouts/post.html` rewrites `](assets/` and `src="assets/` to root-relative before markdownify, which is what makes them work on the published site — posts live at `/:title`, so an unrewritten bare path would resolve against the post URL and 404. Consequences: the rewrite only exists in the `post` layout, so **content rendered anywhere else still needs root-relative `/assets/...`** — that includes front-matter `thumbnail:` values, includes, and pages. Absolute `https://gyanl.com/...` works in production but breaks local preview; don't use it. If the symlink is missing (fresh clone), recreate it: `ln -s ../assets _posts/assets`.

**Thumbnails are cropped differently in each of the three places they appear**, so there is no single right size:

- **Home work cards** (`.project-thumbnail`) render the image full-width, cover-cropped from the top and capped at `--project-thumbnail-max-height` (480px). This wants **landscape art at real resolution** — the `assets/thumbs/pk/` set is 1000×640 and 1500×960.
- **Post page headers** (`.entry-thumbnail`) render a square at `--project-thumbnail-size` (96px).
- **Archive and tag rows** (`.listing-thumbnail`) render a square at `--project-thumbnail-size-mobile` (72px).

The older `assets/thumbs/` set is 144×144 (some 100×100) and still serves the two square slots fine. A post that will appear on the home grid wants a wide thumbnail; anywhere else, square is right.

Drafts go in `_posts/Drafts/`, excluded in `_config.yml`. Files in `_posts/` whose names don't match the date convention (`AA 2022-11-18-designer.md`, `sale backup.md`) are silently skipped by Jekyll.

## Gotchas

- **`.measure` owns horizontal padding** on prose pages. A `padding` shorthand on a child (`.entry-header`, etc.) resets it and pulls that element out of line with the body text. Set `padding-top`/`padding-bottom` instead.
- **Empty content is not `""`.** A layout guarding on `{% if content != "" %}` will still render for a page with no body, because Liquid yields whitespace. `{% assign body = content | strip %}` first.
- **`.prose p` outspecifies a bare component class.** `.prose p { margin: 0 0 20px 0 }` (0,1,1) beats `.slideshow` (0,1,0), so a component rendered as a `<p>` silently loses its margins. Scope such rules as `.prose .slideshow` — this is why the slideshow's full-bleed margin has to be written that way.
- **Percentage padding resolves against the parent, not the element.** The slideshow is `100vw` inside the narrow `.measure` column, so its centring padding must be in `vw`; `50%` would measure the column.
- **The slideshow is CSS-only** — a scroll-snap strip, no JavaScript. `{: .slideshow }` on a paragraph of images; any count, any filenames, alt text preserved. A standalone IAL needs a preceding block, so if it is the first thing after the front matter, put it on the line directly above the images with no blank line (see `_posts/2023-10-23-diwaloween.md`).
- `_posts/sale backup.md` is not a valid post filename, so Jekyll skips it. Left alone deliberately.

## Dead weight, verified

Leftovers from earlier versions of the site. None of it breaks anything, but don't "fix" any of it thinking it's live — it has no effect on the rendered page:

- **`home_tags` in `_config.yml`**, as above — read by nothing.
- `minima.gemspec` and `_config.yml`'s `theme: jekyll-theme-minimal`, both vestigial from the fork.
