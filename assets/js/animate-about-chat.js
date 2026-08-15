/*
 * The about thread's send animation, scrubbed by scroll.
 *
 * Each bubble owns a band of scroll distance and is sent ACROSS it rather than
 * on crossing a line: this file publishes a 0..1 scalar per bubble and main.css
 * does the moving, exactly as the hero does with --hero-progress. So the
 * position of the page is the state of the animation, and scrolling back up
 * runs the sends backwards, message by message, instead of leaving a thread
 * that can only ever have arrived.
 *
 * The bands are staggered by a fixed step, not by each bubble's own position:
 * the bubbles sit a few pixels apart in a stack, so bands cut from their layout
 * would all open at once on a tall viewport. The step is what actually paces
 * them one at a time.
 *
 * .is-armed is added by script, never in the CSS, so a reader without JS gets
 * the bubbles outright rather than a permanently invisible section.
 */
document.addEventListener('DOMContentLoaded', function () {
    var chat = document.getElementById('about-chat');
    if (!chat) return;

    var bubbles = [].slice.call(chat.querySelectorAll('.chat__bubble'));

    // Where the first message starts sending: the thread's top crossing this
    // far up the viewport, as a fraction of its height.
    var SEND_LINE = 0.88;
    // How much further the page must scroll before the next message starts.
    var SEND_STEP = 130;
    // And how much scrolling one message takes from start to sent. Longer than
    // the step, so a message is still landing as the one after it sets off and
    // the thread reads as a run rather than as a queue.
    var SEND_SPAN = 190;

    chat.classList.add('is-armed');

    var frame = null;

    // Ease-out, and deliberately NOT a back-out: this is scrubbed by scroll, so
    // an overshoot would run backwards as readily as forwards and a bubble
    // sitting near the end of its band would wobble past its resting size and
    // return every time the page moved a few pixels. Monotonic is the right
    // shape for anything the reader is dragging.
    var ease = function (t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        var u = 1 - t;
        return 1 - u * u * u;
    };

    var update = function () {
        frame = null;

        // One fixed origin for the whole run, measured off .chat rather than
        // off the bubbles: a bubble carries a transform while it is armed, and
        // getBoundingClientRect reports that, so the origin would move as each
        // one sent. .chat is never transformed, and transforms do not affect
        // layout, so this figure holds all the way through.
        var origin = chat.getBoundingClientRect().top + window.scrollY
            - window.innerHeight * SEND_LINE;

        bubbles.forEach(function (bubble, i) {
            var due = origin + i * SEND_STEP;
            bubble.style.setProperty('--send', ease((window.scrollY - due) / SEND_SPAN));
        });
    };

    var schedule = function () {
        if (frame !== null) return;
        frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // The thread may already be past the line on load — a reload part-way down
    // the page, or a short viewport.
    update();
});
