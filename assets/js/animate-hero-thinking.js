/*
 * "Gyan is thinking" — the last word, changing.
 *
 * The word is backspaced a character at a time, caret and all, and the next one
 * washes in from the left behind a soft gradient edge. The deletion is here
 * because it is the text itself changing; the wash is a mask in main.css, so
 * the sweep runs as an animation rather than as a timer writing styles.
 *
 * The list lives here rather than in the markup so the page ships with one
 * resting word. Without JavaScript that is simply what it says.
 */
document.addEventListener('DOMContentLoaded', function () {
    var word = document.querySelector('.hero-thinking__word');
    if (!word) return;

    // The first is in the markup, so the cycle starts on the second.
    var words = [
        'thinking',
        'petting cats',
        'pontificating',
        'going on a walk',
        'imagining',
        'nudging pixels',
        'making chai',
        'creating',
        'doodling',
        'snoozing',
        'daydreaming',
        'picking a typeface',
        'watering the plants',
        'sneezing'
    ];

    // Long enough to read the word and notice it has changed, short enough
    // that it is still going when you look back.
    var HOLD_MS = 2400;
    // The whole deletion, however many characters it has to get through — so a
    // long word backspaces faster per character rather than taking twice as
    // long. Floored so a two-letter word does not vanish in a blink.
    var DELETE_MS = 280;
    var MIN_STEP_MS = 22;

    var index = 0;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');

    var washIn = function (text) {
        word.textContent = text;
        word.classList.remove('is-washing');
        // Forces the animation to start over rather than being folded into the
        // frame that removed it.
        void word.offsetWidth;
        word.classList.add('is-washing');
    };

    var backspace = function (done) {
        var text = word.textContent;
        var step = Math.max(MIN_STEP_MS, DELETE_MS / Math.max(text.length, 1));

        word.classList.add('is-deleting');

        var tick = function () {
            text = text.slice(0, -1);
            word.textContent = text;

            if (text.length) return setTimeout(tick, step);

            word.classList.remove('is-deleting');
            done();
        };

        setTimeout(tick, step);
    };

    var next = function () {
        index = (index + 1) % words.length;

        if (still.matches) {
            word.textContent = words[index];
            return;
        }

        backspace(function () {
            washIn(words[index]);
        });
    };

    setInterval(next, HOLD_MS);

    word.addEventListener('animationend', function (event) {
        if (event.animationName === 'thinking-wash') word.classList.remove('is-washing');
    });
});
