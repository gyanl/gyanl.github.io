/*
 * Where the hero's stickers go.
 *
 * They used to be placed by hand — a --dx/--dy vector each, tuned against one
 * window and then re-tuned against the next. Past a handful that stops working:
 * an arrangement that reads well on a laptop has stickers overlapping each
 * other on a short window and sitting on the typing bubble on a tall one.
 *
 * So they are dealt and then relaxed. Each sticker starts at a random point on
 * the ring, and is pushed out of anything it overlaps — the lockup in the
 * middle, the scroll cue, every other sticker — until nothing overlaps. A deal
 * that will not come clean is thrown away and re-dealt, and the best attempt is
 * the one that gets used. The result is written back as the same --dx/--dy the
 * markup used to carry, so the scroll throw, the drag and the shadows all keep
 * working and none of them needs to know this happened.
 *
 * A different arrangement on every visit is the point: it is a pile of
 * stickers, not a diagram. The relaxation is what keeps every pile legible.
 *
 * This is not a simulation and it never runs on scroll — once on load, once per
 * resize. Adding stickers costs more than adding passes does, since every
 * sticker is compared against every other, but at this scale it is all still
 * far inside a millisecond.
 */
document.addEventListener('DOMContentLoaded', function () {
    var ring = document.getElementById('hero-stickers');
    if (!ring) return;

    var stickers = Array.prototype.slice.call(ring.querySelectorAll('.hero-sticker'));
    if (!stickers.length) return;

    // Clear of the lockup, and — for the note alone — of the window's edge.
    var KEEP = 28;
    var EDGE = 12;

    // How far a sticker may hang off the edge of the window, as a fraction of
    // its own size. Not a mistake to be prevented: a pile of stickers running
    // off the frame looks like a pile of stickers, and holding every one of
    // them fully inside is what makes a crowded window unsolvable — the edges
    // are exactly where the room is. A quarter out still leaves most of the
    // artwork on screen.
    var BLEED = 0.25;

    // The breathing room between two stickers, as a fraction of how big they
    // are drawn — NOT a fixed number of pixels. A flat figure is a tenth of a
    // sticker on a desktop and a quarter of one on a phone, so the same gap
    // that looks comfortable on a laptop is what stops twelve of them fitting
    // on a narrow window at all. Floored so it never closes up entirely,
    // capped so a big window does not push the pile to its corners.
    //
    // Deliberately tight: stickers in a pile touch, and the room this buys back
    // is what lets them be drawn bigger on a phone.
    var gapFor = function (size) {
        return Math.max(4, Math.min(size * 0.045, 14));
    };

    // Passes per attempt, and attempts per solve. Both are budgets rather than
    // targets: a deal that comes clean stops early, and so does the search.
    //
    // The retry is what actually makes this work. A single deal relaxes cleanly
    // about a third of the time — local separation has no way out of a node
    // boxed in by its neighbours and the window edge, and no number of extra
    // passes will find one. Starting again somewhere else does.
    //
    // Attempts are far cheaper than they look, because the search stops at the
    // first clean one: on a roomy window that is usually the first or second
    // deal, and the budget is only spent on the narrow windows that need it.
    var STEPS = 260;
    var ATTEMPTS = 30;

    // How hard a sticker is held to the slot it was dealt: low, so overlaps
    // always win the argument. It only stops the pile drifting into a corner,
    // and it is switched off for the last stretch of each attempt so that pure
    // separation finishes the job.
    var HOME = 0.05;

    // A little give either side of a sticker's authored size, rolled per deal.
    // It buys the search a continuous degree of freedom it did not have: a pile
    // that will not quite fit can shrink its way out instead of being thrown
    // away, and the variation reads as a pile rather than a set.
    var SCALE_MIN = 0.9;
    var SCALE_MAX = 1.1;

    // The grid the evenness of a layout is judged on, what an empty cell costs,
    // and how much a pixel of overlap costs against it.
    //
    // Overlap has to dominate, and at first it did not: an empty cell at 9
    // outbid three small touches at a couple of pixels each, so the search
    // started buying evenness with overlaps — exactly the wrong trade. Weighted
    // as it is now, a hole is worth about a pixel and a half of overlap, so
    // evenness only ever decides between layouts that are already clean.
    var GRID_COLS = 5;
    var GRID_ROWS = 6;
    var HOLE_COST = 9;
    var OVERLAP_COST = 6;

    // How long each attempt is left on screen during the opening deal, and the
    // longest the whole thing may take. The search is shown rather than hidden
    // — see the end of solve(). Slow enough to read as one sticker being laid
    // down after another rather than a flicker.
    var REVEAL_STEP = 150;

    // How far a settled sticker is knocked about while the rest are still being
    // dealt, in pixels, peak to peak.
    var JITTER = 7;
    var REVEAL_MS = 2400;

    // Set while that playback is running, so nothing else re-solves over the
    // top of it and cuts it off half way.
    var revealing = false;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ---- geometry -------------------------------------------------------- */

    // A sticker's footprint, tilt included: the art is rotated, so it covers
    // more than its layout box, and separating the unrotated boxes leaves
    // corners visibly touching.
    var footprint = function (sticker) {
        var art = sticker.querySelector('.hero-sticker__art, .hero-sticker__note');
        if (!art) return null;

        var w = art.offsetWidth;
        var h = art.offsetHeight;
        var tilt = (parseFloat(getComputedStyle(sticker).getPropertyValue('--tilt')) || 0) * Math.PI / 180;
        var c = Math.abs(Math.cos(tilt));
        var s = Math.abs(Math.sin(tilt));

        return { w: w * c + h * s, h: w * s + h * c };
    };

    // What a sticker must not cover. Measured, not assumed: the caption's width
    // changes with the word it is cycling through, and the bubble is sized off
    // the viewport.
    var obstacles = function () {
        var out = [];

        ['.hero-greeting__photo', '.hero-greeting__blob', '.hero-thinking', '.hero-scroll-cue__ring']
            .forEach(function (selector) {
                var el = document.querySelector(selector);
                if (!el) return;

                var b = el.getBoundingClientRect();
                if (!b.width || !b.height) return;

                out.push({
                    x: b.left + b.width / 2,
                    y: b.top + b.height / 2,
                    w: b.width + KEEP * 2,
                    h: b.height + KEEP * 2
                });
            });

        return out;
    };

    // How far two boxes are into each other, 0 if they are clear.
    var overlapOf = function (a, b, aw, ah, bw, bh) {
        var x = (aw + bw) / 2 - Math.abs(a.x - b.x);
        var y = (ah + bh) / 2 - Math.abs(a.y - b.y);

        return x > 0 && y > 0 ? Math.min(x, y) : 0;
    };

    // Push A out of B the short way, which keeps a sticker beside an obstacle
    // rather than flinging it across. `axis` overrides that, because the short
    // way is not always an available way: a tall sticker held against the top
    // of the window is a few pixels into the lockup vertically and a long way
    // into it horizontally, so it takes the vertical exit, is clamped straight
    // back, and sits there overlapping for the rest of the run.
    var separate = function (a, b, aw, ah, bw, bh, share, axis) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var overlapX = (aw + bw) / 2 - Math.abs(dx);
        var overlapY = (ah + bh) / 2 - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) return 0;

        if (axis === 'x' || (axis !== 'y' && overlapX < overlapY)) {
            var pushX = (dx < 0 ? -overlapX : overlapX) * share;
            a.x += pushX;
            return Math.abs(pushX);
        }

        var pushY = (dy < 0 ? -overlapY : overlapY) * share;
        a.y += pushY;
        return Math.abs(pushY);
    };

    /* ---- the solver ------------------------------------------------------ */

    var solve = function (reveal) {
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        var probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;visibility:hidden;';
        ring.appendChild(probe);

        /*
         * The origin every --dx/--dy is measured from — MEASURED, not worked
         * out. .hero-sticker sits at left 50%, top 50vh, and on a phone that
         * second one is not half of window.innerHeight.
         *
         * vh resolves against the LARGE viewport, the one with the browser's
         * chrome hidden, while innerHeight is whatever is on screen right now.
         * With an address bar showing — top or bottom, either way — the two
         * differ by half its height, so a solver that assumed innerHeight / 2
         * placed every sticker against a centre the page does not actually use.
         * The obstacles are measured with getBoundingClientRect and so were
         * always in the right place; the stickers were the ones out of step,
         * which is what tipped the whole composition off balance.
         *
         * So it is measured off a real .hero-sticker — an empty one, zero by
         * zero, with its vectors zeroed — rather than off a bare div told to
         * sit at 50vh. Anything the stylesheet does to place a sticker, it does
         * to this too, and the answer cannot drift from what the rest of the
         * ring is actually doing. A copy of the rule here could.
         */
        var mark = document.createElement('div');
        mark.className = 'hero-sticker';
        mark.style.cssText = 'width:0;height:0;visibility:hidden;--dx:0;--dy:0;';
        ring.appendChild(mark);
        var origin = mark.getBoundingClientRect();
        var cx = origin.left;
        var cy = origin.top;
        mark.remove();

        probe.style.width = 'var(--ring-x)';
        var ringX = probe.getBoundingClientRect().width;
        probe.style.width = 'var(--ring-y)';
        var ringY = probe.getBoundingClientRect().width;
        probe.remove();

        if (!ringX || !ringY) return;

        probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--sticker-size);';
        ring.appendChild(probe);
        var GAP = gapFor(probe.getBoundingClientRect().width);
        probe.remove();

        var blocks = obstacles();

        // Measured once per solve, not once per attempt: reading layout inside
        // the search would be the only slow thing in this file. Cleared first,
        // or each solve would measure the last one's scaling and compound it.
        stickers.forEach(function (sticker) { sticker.style.removeProperty('--art-scale'); });
        var sizes = stickers.map(footprint);

        var notes = stickers.map(function (sticker) {
            return sticker.classList.contains('hero-sticker--note');
        });

        // A sticker the reader has moved keeps the place they put it, and
        // becomes one more thing for the others to avoid.
        var pinned = stickers.map(function (sticker) {
            return sticker.dataset.placed === 'by-hand';
        });

        var held = stickers.map(function (sticker, i) {
            if (!pinned[i]) return null;

            var b = sticker.getBoundingClientRect();
            return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        });

        var attempt = function () {
            // Dealt round the ring rather than dropped anywhere: an even spread
            // of angles, jittered, so the pile differs every time without ever
            // starting with everything in one sector. The order is shuffled
            // too, so it is not the same sticker in the same place each visit.
            var order = stickers.map(function (_, i) { return i; });

            for (var i = order.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var t = order[i];
                order[i] = order[j];
                order[j] = t;
            }

            var slice = (Math.PI * 2) / stickers.length;
            var spin = Math.random() * Math.PI * 2;
            var nodes = [];

            stickers.forEach(function (sticker, index) {
                if (!sizes[index]) return;

                var angle = spin + order[index] * slice + (Math.random() - 0.5) * slice * 0.7;
                var reach = 0.8 + Math.random() * 0.45;
                var scale = pinned[index] ? 1 : SCALE_MIN + Math.random() * (SCALE_MAX - SCALE_MIN);

                var node = {
                    index: index,
                    scale: scale,
                    w: sizes[index].w * scale,
                    h: sizes[index].h * scale,
                    pinned: pinned[index],
                    // The welcome note gets first pick and keeps it: it is the
                    // only sticker made of words, and words that have been
                    // shoved into a corner by a picture of a taxi are words
                    // nobody reads.
                    solid: notes[index],
                    x: pinned[index] ? held[index].x : cx + Math.cos(angle) * ringX * reach,
                    y: pinned[index] ? held[index].y : cy + Math.sin(angle) * ringY * reach
                };

                node.homeX = node.x;
                node.homeY = node.y;
                nodes.push(node);
            });

            for (var step = 0; step < STEPS; step++) {
                var moved = 0;
                var blocked = 0;

                // The pull home comes first and separation last, so separation
                // always has the final word. The other way round it quietly
                // undoes a push it is too weak to be seen undoing, and a pair
                // sits overlapping while the loop calls itself settled.
                var ease = step < STEPS - 40 ? HOME : 0;

                for (var a = 0; a < nodes.length; a++) {
                    var node = nodes[a];
                    if (node.pinned) continue;

                    node.x += (node.homeX - node.x) * ease;
                    node.y += (node.homeY - node.y) * ease;

                    for (var b2 = 0; b2 < nodes.length; b2++) {
                        if (b2 === a) continue;

                        var other = nodes[b2];

                        // The note is not moved by the artwork — the artwork
                        // moves around it. Without this it is just another box
                        // in the pile and ends up wherever the shoving leaves
                        // it, which for the one sticker that has to be READ is
                        // the wrong way round.
                        if (node.solid && !other.solid) continue;

                        // Half each when both can move, all of it when the
                        // other gives no ground.
                        moved += separate(node, other, node.w + GAP, node.h + GAP, other.w, other.h,
                            (other.pinned || other.solid) ? 1 : 0.5);
                    }

                    // No bleed for the note: half a sentence off the side of
                    // the window is not a crop, it is a missing word.
                    var out = node.solid ? -EDGE / node.h : BLEED;
                    var lowY = node.h * (0.5 - out);
                    var highY = vh - node.h * (0.5 - out);

                    // The lockup LAST, so it is the one thing nothing can be
                    // pushed back onto. A sticker cleared of the middle and then
                    // shoved into it by a neighbour is the failure this file
                    // exists to prevent, and the only overlap a reader would
                    // call a bug rather than a pile.
                    blocks.forEach(function (block) {
                        // Sideways if this node is already against the top or
                        // the bottom of the window, since up and down are spent.
                        var spent = node.y <= lowY + 1 || node.y >= highY - 1;
                        var push = separate(node, block, node.w + GAP, node.h + GAP,
                            block.w, block.h, 1, spent ? 'x' : null);

                        moved += push;
                        if (push) blocked++;
                    });

                    var outX = node.solid ? -EDGE / node.w : BLEED;
                    node.x = Math.min(Math.max(node.x, node.w * (0.5 - outX)),
                        vw - node.w * (0.5 - outX));
                    node.y = Math.min(Math.max(node.y, lowY), highY);
                }

                // Settled — but never while something is still on the lockup,
                // however little it happens to be moving.
                if (moved < 0.5 && !blocked) break;
            }

            // What the deal is worth: how deep everything still overlaps, with
            // the lockup counted twenty times over. A pile with two stickers
            // touching is fine; one with a sticker across the typing bubble is
            // not, and the score has to say so.
            var score = 0;

            for (var m = 0; m < nodes.length; m++) {
                for (var n = m + 1; n < nodes.length; n++) {
                    score += overlapOf(nodes[m], nodes[n], nodes[m].w, nodes[m].h,
                        nodes[n].w, nodes[n].h) * OVERLAP_COST;
                }

                for (var k = 0; k < blocks.length; k++) {
                    score += overlapOf(nodes[m], blocks[k], nodes[m].w, nodes[m].h,
                        blocks[k].w, blocks[k].h) * OVERLAP_COST * 20;
                }
            }

            // How evenly the pile covers the window, counted as cells of a
            // coarse grid that hold nothing at all. Without this the search
            // stops at the first layout with no overlaps and never asks whether
            // it is a GOOD one — which is where the empty quarters came from:
            // plenty of clean deals, no reason to prefer the even ones.
            for (var gy = 0; gy < GRID_ROWS; gy++) {
                for (var gx = 0; gx < GRID_COLS; gx++) {
                    var cell = {
                        x: (gx + 0.5) * vw / GRID_COLS,
                        y: (gy + 0.5) * vh / GRID_ROWS
                    };
                    var cw = vw / GRID_COLS;
                    var ch = vh / GRID_ROWS;
                    var filled = false;

                    for (var q = 0; q < nodes.length && !filled; q++) {
                        if (overlapOf(cell, nodes[q], cw, ch, nodes[q].w, nodes[q].h) > 4) filled = true;
                    }

                    for (var z = 0; z < blocks.length && !filled; z++) {
                        if (overlapOf(cell, blocks[z], cw, ch, blocks[z].w, blocks[z].h) > 4) filled = true;
                    }

                    if (!filled) score += HOLE_COST;
                }
            }

            return { nodes: nodes, score: score };
        };

        var apply = function (nodes) {
            nodes.forEach(function (node) {
                if (node.pinned) return;

                stickers[node.index].style.setProperty('--art-scale', node.scale.toFixed(3));
                stickers[node.index].style.setProperty('--dx', ((node.x - cx) / ringX).toFixed(3));
                stickers[node.index].style.setProperty('--dy', ((node.y - cy) / ringY).toFixed(3));
            });
        };

        var best = null;

        // Every attempt, not "until one works". A deal with no overlaps is
        // where the old search stopped, which meant the layout shown was
        // whichever clean one turned up first rather than the best of them.
        for (var tries = 0; tries < ATTEMPTS; tries++) {
            var run = attempt();
            if (!best || run.score < best.score) best = run;
        }

        apply(best.nodes);

        // The chosen layout is in place from the first frame; what follows only
        // decides when each sticker becomes visible in it. Nothing moves during
        // the reveal — an earlier version played the search itself, flicking
        // through every attempt, and watching ten stickers jump around while
        // the reader is trying to look at them is a different thing entirely
        // from watching a pile being laid out.
        if (!reveal || still.matches) return;

        revealing = true;
        ring.classList.add('is-dealing');
        stickers.forEach(function (sticker) { sticker.classList.remove('is-dealt'); });

        // The welcome note goes down last, whatever order it sits in the
        // markup: it is the one that talks, so it should arrive to a table
        // that is already set rather than be read while the rest appear around
        // it. Everything else keeps document order.
        var dealOrder = stickers.filter(function (sticker) {
            return !sticker.classList.contains('hero-sticker--note');
        }).concat(stickers.filter(function (sticker) {
            return sticker.classList.contains('hero-sticker--note');
        }));

        var frame = 0;
        var gap = Math.min(REVEAL_STEP, REVEAL_MS / dealOrder.length);

        // A few pixels and a fraction of a degree, re-rolled for every sticker
        // already down each time another is added. Small enough that nothing
        // appears to move house, big enough to read as a hand having nudged the
        // whole table between frames.
        var wobble = function (sticker, amount) {
            sticker.style.setProperty('--jitter-x', ((Math.random() - 0.5) * amount).toFixed(1) + 'px');
            sticker.style.setProperty('--jitter-y', ((Math.random() - 0.5) * amount).toFixed(1) + 'px');

            var art = sticker.querySelector('.hero-sticker__art');
            if (art) art.style.setProperty('--jitter-r', ((Math.random() - 0.5) * 1.6).toFixed(2) + 'deg');
        };

        var next = function () {
            dealOrder[frame].classList.add('is-dealt');
            frame++;

            for (var i = 0; i < frame; i++) wobble(dealOrder[i], JITTER);

            if (frame < dealOrder.length) return setTimeout(next, gap);

            // Settled: the wobble is a property of the dealing, not of the
            // layout, so the pile comes to rest exactly where the solver put it.
            stickers.forEach(function (sticker) { wobble(sticker, 0); });

            revealing = false;
            ring.classList.remove('is-dealing');
        };

        next();
    };

    solve(true);

    /*
     * Re-dealt when the window changes shape — not merely re-solved, since a
     * different shape wants a different arrangement rather than the old one
     * shoved about.
     *
     * The guard is the whole point of this block. On a phone, scrolling hides
     * and shows the browser's own chrome, which changes innerHeight and fires
     * `resize` — so a reader who scrolled down and came back to the top found
     * every sticker somewhere else, for no reason they could see. The width is
     * what actually says the layout should change; a height that moves by less
     * than a URL bar is the URL bar.
     */
    var CHROME = 160;

    var lastWidth = window.innerWidth;
    var lastHeight = window.innerHeight;
    var pending = null;

    window.addEventListener('resize', function () {
        var sameWidth = window.innerWidth === lastWidth;
        var smallShift = Math.abs(window.innerHeight - lastHeight) < CHROME;

        if (sameWidth && smallShift) return;

        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;

        clearTimeout(pending);
        pending = setTimeout(function () { solve(); }, 150);
    });

    // A real change of shape, and one that does not always come with a resize
    // worth the name on iOS.
    window.addEventListener('orientationchange', function () {
        lastWidth = 0;
    });

    // The caption is one of the obstacles and it is set in a webfont, so its box
    // moves when the fonts land. Worth exactly one re-solve — but not while the
    // first deal is still playing out, which it would otherwise cut short.
    //
    // Wrapped rather than passed straight to .then(): the promise resolves with
    // the FontFaceSet, which as an argument would read as a request to play the
    // whole reveal a second time.
    if (document.fonts) {
        document.fonts.ready.then(function () {
            if (!revealing) solve();
        });
    }
});
