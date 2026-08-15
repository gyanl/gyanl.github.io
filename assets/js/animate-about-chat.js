/*
 * The about thread's send animation, driven by scroll.
 *
 * Each bubble sends on its own, as it crosses a line near the bottom of the
 * viewport — so the reader scrolls the conversation in rather than watching a
 * timed stagger play out. The pacing is therefore the reader's, and the gap
 * between messages is whatever the gap between bubbles is on screen.
 *
 * One-way: a message that has been sent stays sent. Scrolling back up does not
 * unsend it, which both reads right and keeps the effect from flickering when a
 * bubble sits astride the line.
 *
 * .is-armed is added by script, never in the CSS, so a reader without JS gets
 * the bubbles outright rather than a permanently invisible section.
 */
document.addEventListener('DOMContentLoaded', function () {
    var chat = document.getElementById('about-chat');
    if (!chat) return;

    var bubbles = [].slice.call(chat.querySelectorAll('.chat__bubble'));

    // Where the first message sends: the thread's top crossing this far up the
    // viewport, as a fraction of its height.
    var SEND_LINE = 0.88;
    // And how much further the page must scroll for each message after it. The
    // bubbles sit far closer together than this, so a shared line would send the
    // whole thread in one frame on a tall viewport — this is what actually
    // paces them one at a time.
    var SEND_STEP = 130;

    chat.classList.add('is-armed');

    var pending = bubbles.slice();
    var frame = null;

    var update = function () {
        frame = null;

        // One fixed origin for the whole run, measured off .chat rather than off
        // the bubbles: a bubble carries a transform while it is armed, and
        // getBoundingClientRect reports that, so the origin would move as each
        // one sent. .chat is never transformed, and transforms do not affect
        // layout, so this figure holds all the way through.
        var origin = chat.getBoundingClientRect().top + window.scrollY
            - window.innerHeight * SEND_LINE;

        pending = pending.filter(function (bubble) {
            var due = origin + bubbles.indexOf(bubble) * SEND_STEP;
            if (window.scrollY < due) return true;
            bubble.classList.add('is-sent');
            return false;
        });

        if (!pending.length) teardown();
    };

    var schedule = function () {
        if (frame !== null) return;
        frame = requestAnimationFrame(update);
    };

    var teardown = function () {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // The thread may already be past the line on load — a reload part-way down
    // the page, or a short viewport.
    update();
});
