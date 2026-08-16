/*
 * "Gyan is thinking" — the last word, changing.
 *
 * The word holds, is backspaced a character at a time, and the next one washes
 * in from the left behind a soft gradient edge. The deletion is here
 * because it is the text itself changing; the wash is a mask in main.css, so
 * the sweep runs as an animation rather than as a timer writing styles.
 *
 * The list lives here rather than in the markup so the page ships with one
 * resting word. Without JavaScript that is simply what it says.
 */
document.addEventListener('DOMContentLoaded', function () {
    var word = document.querySelector('.hero-thinking__word');
    if (!word) return;

    // The opening line is in the markup and is not in here: "arranging stickers"
    // is what the page is actually doing at that moment, so it is said once and
    // never comes round again. This list is everything after it, in order, and
    // it loops.
    var words = [
        'thinking',
        'daydreaming',
        'snoozing',
        'waiting for you to scroll',
        'brewing coffee',
        'drinking coffee',
        'imagining',
        'picking a typeface',
        'going on a walk',
        'petting cats',
        'listening to music',
        'nudging pixels',
        'creating',
        'doodling'
    ];

    // How long the finished word sits before it starts being taken apart. Long
    // enough to read it and notice it has changed, short enough that it is
    // still going when you look back.
    var HOLD_MS = 1600;
    // The whole deletion, however many characters it has to get through — so a
    // long word backspaces faster per character rather than taking twice as
    // long. Floored so a two-letter word does not vanish in a blink.
    var DELETE_MS = 280;
    var MIN_STEP_MS = 22;

    var WASH_MS = 790;

    // -1, so the first turn of the cycle lands on words[0] rather than skipping
    // it. It was 0 back when the markup carried the list's own first word and
    // showing it again immediately would have been a stutter — the markup now
    // opens on a line of its own, so nothing here should be skipped.
    var index = -1;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Paused once the page has moved, and running again at the top. The hero is
    // the only place this is visible, so cycling words behind a reader who has
    // scrolled past is work nobody sees.
    //
    // Checked at the END of a cycle rather than the moment the page moves: a
    // word caught mid-backspace would be left half-deleted, and one caught
    // mid-wash half-lit. The cycle finishes what it started and then stops.
    var atTop = function () {
        return window.scrollY <= 0;
    };

    var waiting = false;

    var rest = function () {
        if (atTop()) return setTimeout(cycle, HOLD_MS);

        // Nothing scheduled: the scroll listener starts it again.
        waiting = true;
    };

    window.addEventListener('scroll', function () {
        if (!waiting || !atTop()) return;
        waiting = false;
        setTimeout(cycle, HOLD_MS);
    }, { passive: true });

    var washIn = function (text, done) {
        word.textContent = text;
        word.classList.remove('is-washing');
        // Forces the animation to start over rather than being folded into the
        // frame that removed it.
        void word.offsetWidth;
        word.classList.add('is-washing');
        setTimeout(done, WASH_MS);
    };

    var backspace = function (done) {
        var text = word.textContent;
        var step = Math.max(MIN_STEP_MS, DELETE_MS / Math.max(text.length, 1));

        var tick = function () {
            text = text.slice(0, -1);
            word.textContent = text;

            if (text.length) return setTimeout(tick, step);
            done();
        };

        setTimeout(tick, step);
    };

    // A chain rather than an interval: each step takes as long as it takes, and
    // the next one starts when it is done. On an interval the stages would
    // overlap the moment a word was long enough to outrun the tick.
    var cycle = function () {
        index = (index + 1) % words.length;

        if (still.matches) {
            word.textContent = words[index];
            return rest();
        }

        backspace(function () {
            washIn(words[index], rest);
        });
    };

    setTimeout(cycle, HOLD_MS);

    // The class is removed and re-added on each wash to restart the animation,
    // so this is not what makes the next one run — it just stops a finished
    // animation being left declared on the element between words.
    word.addEventListener('animationend', function (event) {
        if (event.animationName === 'thinking-wash') word.classList.remove('is-washing');
    });
});
