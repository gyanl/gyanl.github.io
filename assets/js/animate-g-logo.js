/**
 * Hero mark.
 *
 * The g-logo mark, stroked in black and pinned to the viewport. Scrolling does
 * two things at once:
 *
 *   1. draws the stroke on, by winding stroke-dashoffset down to zero;
 *   2. thickens stroke-width, so the mark lands heavier than it started.
 *
 * The phases overlap on purpose — the tail of the path is still drawing while
 * the head has already begun to thicken. At rest the path is fully retracted and
 * the only thing showing is the <circle> sitting at its start point.
 *
 * The path data and its resting dash state live in the markup, not here: iOS
 * Safari paints before DOMContentLoaded, so a path that waits for script to set
 * its dasharray flashes fully drawn first.
 */
class GLogoReveal {
  constructor(options = {}) {
    this.config = {
      // Fractions of total scroll progress each phase occupies. drawEnd is 1:
      // the stroke lands on its last pixel exactly as the mark unpins and starts
      // scrolling up, so there is no stretch of scrolling where it sits finished
      // and still pinned.
      drawEnd: 1,
      swellStart: 0.4,
      // Mark height as a fraction of the smaller viewport axis.
      sizeRatio: 0.55,
      // Stroke width in the mark's own 30x32 coordinate space, start and end.
      baseStroke: 1.12,
      finalStroke: 2,
      // The mark shrinks over the tail of the runway, finishing at shrinkTo of
      // its drawn size just as it unpins and scrolls away.
      shrinkStart: 0.75,
      shrinkTo: 0.18,
      // The stickers fade out over this many pixels of scroll. In px, not a
      // fraction of the runway like the phases above: the runway is 250vh, so a
      // fraction would make the fade last two and a half times longer on a
      // desktop than a phone. The ring is a greeting — it should be gone almost
      // as soon as the reader moves, at any size.
      burstDistance: 100,
      // The plate behind the mark: how far its side runs past the 30x32 viewBox.
      // It is a circle at every size (border-radius: 50%), so there is no radius
      // to configure here.
      plateInset: 1.28,
      // Where the page starts crossing from the hero's light panel to the
      // scheme's own background. Dark mode only — see --page-bg in main.css.
      schemeStart: 0.8,
      // How long the hero waits before taking the reader down itself.
      autoAdvanceDelay: 5000,
      ...options
    };

    this.elements = {
      mark: document.getElementById('hero-mark'),
      greeting: document.querySelector('.hero-greeting'),
      art: document.querySelector('.hero-mark__art'),
      plate: document.querySelector('.hero-mark__plate'),
      path: document.getElementById('g-reveal-path'),
      layers: [...document.querySelectorAll('.g-reveal-layer')],
      dot: document.getElementById('g-reveal-dot'),
      cue: document.getElementById('hero-scroll-cue'),
      stickers: document.querySelector('.hero-stickers'),
      spacer: document.querySelector('.hero-spacer'),
      size: document.getElementById('size'),
      stroke: document.getElementById('stroke')
    };

    if (!this.elements.path) return;


    this.state = {
      frame: null,
      pathLength: this.elements.path.getTotalLength(),
      // Filled in on first render and kept until a real layout change — see
      // getRevealDistance.
      revealDistance: null,
      measuredWidth: 0,
      // What was last written to the SVG, so a frame that would write the same
      // figures writes nothing at all — see render().
      lastStroke: null,
      lastOffsets: [],
    };

    this.handleScroll = this.handleScroll.bind(this);
    this.render = this.render.bind(this);

    this.init();
  }

  init() {
    // Published once, not per frame: the plate is drawn at the size the mark
    // settles to, so main.css needs the figure but never needs it to change.
    document.documentElement.style.setProperty('--mark-shrink-to', this.config.shrinkTo);

    this.setupEventListeners();
    this.render();
    this.autoAdvance();
  }

  /**
   * Take the reader down to the messages if they have not moved in a while.
   *
   * The hero is a typing indicator: it says something is coming. Sitting on it
   * with nothing happening reads as a page that has failed to load rather than
   * one waiting to be scrolled, so after a few seconds it goes on its own — the
   * same journey the cue makes, at the same pace, so the reveal is still seen
   * rather than skipped.
   *
   * Once, and only from a standing start. Any sign of the reader — a scroll, a
   * key, a finger — cancels it for good: taking the page away from someone who
   * has started reading is worse than never having offered.
   *
   * Not for reduced-motion readers. Moving the page unasked is precisely what
   * that preference is asking us not to do.
   */
  autoAdvance() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const events = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown'];
    let timer = null;

    const cancel = () => {
      clearTimeout(timer);
      events.forEach(type => window.removeEventListener(type, cancel));
    };

    timer = setTimeout(() => {
      cancel();

      // They may have arrived part-way down — a reload, or a link to an anchor.
      // This is an offer to start the page, not to yank it.
      if (window.scrollY > 0) return;

      const chat = document.getElementById('about-chat');
      if (chat) this.glideTo(this.messagesRead(chat));
    }, this.config.autoAdvanceDelay);

    events.forEach(type => window.addEventListener(type, cancel, { passive: true, once: true }));
  }

  viewport() {
    return {
      width: window.visualViewport ? window.visualViewport.width : window.innerWidth,
      height: window.visualViewport ? window.visualViewport.height : window.innerHeight
    };
  }

  setupEventListeners() {
    // The mark's SIZE still needs no script — the viewBox and --mark-unit keep
    // that in CSS. This is only about the runway length, which is measured
    // rather than computed, and so has to be re-measured when the layout truly
    // changes. Width-only: on a phone a height-only resize is the URL bar
    // sliding away, and re-measuring on that is exactly the thing that used to
    // make the reveal hitch mid-scroll.
    window.addEventListener('resize', () => {
      if (window.innerWidth === this.state.measuredWidth) return;
      this.measureRevealDistance();
      this.render();
    });
    window.addEventListener('orientationchange', () => {
      this.measureRevealDistance();
      this.render();
    });

    window.addEventListener('scroll', this.handleScroll, { passive: true });
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    this.bindScrollCue();

    ['size', 'stroke'].forEach(id => {
      const input = this.elements[id];
      if (!input) return;
      input.addEventListener('input', () => {
        this.updateValue(id);
        this.applySize();
      });
    });
  }

  /**
   * The scroll cue at the foot of the hero: click it and the page runs itself
   * down to the messages.
   *
   * Smooth rather than a jump, because the whole reveal is scroll-driven — the
   * mark draws, the stickers are thrown and the messages send as the page
   * travels, so the animation IS the journey. It lands with the thread's top a
   * quarter of the way down the window, which is past every message's send line
   * and leaves the first bubble sat under the mark it came from.
   *
   * Reduced motion gets the same destination without the travel.
   */
  bindScrollCue() {
    const cue = this.elements.cue;
    if (!cue) return;

    cue.addEventListener('click', () => {
      const chat = document.getElementById('about-chat');
      if (!chat) return;

      const top = this.messagesRead(chat);

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo({ top, behavior: 'auto' });
        return;
      }

      this.glideTo(top);
    });
  }

  /**
   * Where to land: the moment the SECOND message has finished arriving.
   *
   * Far enough in that the thread has visibly started talking, and no further —
   * the rest is left for the reader to scroll into, which is the whole point of
   * a thread that sends as you go. Landing past the last message showed the
   * entire conversation at once and left nothing to discover.
   *
   * Not a fraction of the window, which is what this used to be: a fixed
   * fraction lands on a different part of the animation on every screen size.
   * Derived from the send bands instead, which animate-about-chat.js publishes
   * onto the thread — a bubble starts its band a number of steps past the send
   * line and takes a span to land — so it lands on the same beat everywhere.
   */
  messagesRead(chat) {
    const top = chat.getBoundingClientRect().top + window.scrollY;
    const height = this.viewport().height;

    const line = parseFloat(chat.dataset.sendLine);
    const step = parseFloat(chat.dataset.sendStep);
    const span = parseFloat(chat.dataset.sendSpan);
    const count = chat.querySelectorAll('.chat__bubble').length;

    if (!count || !isFinite(line) || !isFinite(step) || !isFinite(span)) {
      return top - height * 0.25;
    }

    // The second bubble, or the last one if the thread is shorter than that.
    const index = Math.min(1, count - 1);

    // A little past the end of its band, so it is unmistakably at rest rather
    // than landing on the same frame the scroll stops.
    return top - height * line + index * step + span + 40;
  }

  /**
   * Scroll to a point, slowly, under our own steam.
   *
   * NOT behavior: 'smooth'. The native one is tuned for jumping to a heading —
   * it covers a couple of thousand pixels in a few hundred milliseconds, which
   * here means the whole reveal (the mark drawing, the stickers leaving, the
   * page changing scheme, the messages sending) flickers past in one blur. The
   * point of pressing this button is to WATCH that, so the travel is paced to
   * the distance and eased at both ends.
   *
   * Cancels the moment the reader touches the page themselves — taking the
   * scroll off someone who has grabbed it is the one thing worse than a fast
   * animation.
   */
  glideTo(top) {
    const start = window.scrollY;
    const distance = top - start;
    if (!distance) return;

    // About 460px a second, held between one and seven seconds so a short hop
    // does not crawl and a long one does not outstay its welcome. Slow, and
    // deliberately so: the whole point of the travel is that the reveal is
    // watched on the way past, at reading pace rather than at the speed of
    // getting somewhere.
    const duration = Math.min(Math.max(Math.abs(distance) / 460 * 1000, 1000), 7000);
    const startedAt = performance.now();
    let cancelled = false;

    const stop = () => { cancelled = true; };
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    events.forEach(type => window.addEventListener(type, stop, { passive: true, once: true }));

    const done = () => events.forEach(type => window.removeEventListener(type, stop));

    // Slow at both ends, quickest through the middle.
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const step = now => {
      if (cancelled) return done();

      const t = Math.min((now - startedAt) / duration, 1);
      window.scrollTo(0, start + distance * ease(t));

      if (t < 1) requestAnimationFrame(step);
      else done();
    };

    requestAnimationFrame(step);
  }

  /** Coalesce bursts of scroll events into one render a frame. */
  handleScroll() {
    if (window.scrollY > 0) this.stopBounce();
    else this.startBounce();
    if (this.state.frame !== null) return;
    this.state.frame = requestAnimationFrame(() => {
      this.state.frame = null;
      this.render();
    });
  }

  /**
   * Republish --mark-unit for the size control.
   *
   * main.css declares this as min(vw, vh) * sizeRatio / 32 and the viewBox does
   * the rest, so nothing here runs on resize — CSS handles that on its own, in
   * the same pass as the greeting. This only fires when the hidden size slider
   * moves it off the default.
   */
  applySize() {
    const { width, height } = this.viewport();
    const sizeRatio = this.readControl('size', this.config.sizeRatio * 100) / 100;
    const unit = (Math.min(width, height) * sizeRatio) / 32;

    document.documentElement.style.setProperty('--mark-unit', `${unit}px`);
    this.render();
  }

  readControl(id, fallback) {
    const input = this.elements[id];
    const value = input && parseInt(input.value, 10);
    return Number.isFinite(value) ? value : fallback;
  }

  /**
   * How far the page must scroll for the reveal to finish.
   *
   * This is exactly how long .hero-mark stays stuck: a sticky element pins until
   * its bottom meets its container's, so the pinned run is the runway's height
   * less one viewport. Deriving it rather than picking a fraction keeps the two
   * from drifting apart — the mark finishes drawing on the same pixel it starts
   * scrolling up, so it is never mid-draw while moving. Retiming the whole thing
   * is still a one-line change to .hero-spacer's height.
   *
   * MEASURED ONCE, then cached, and this matters on mobile more than anywhere.
   * It used to run per frame, which was wrong twice over:
   *
   *   - offsetHeight forces a synchronous layout, so every scroll frame paid for
   *     one before it could draw;
   *   - it measured against visualViewport.height, which on a phone SHRINKS AND
   *     GROWS as the URL bar hides and returns. .hero-spacer is 250vh, and vh is
   *     the large viewport, so the runway held still while the figure it was
   *     divided by moved. Progress jumped by the height of the browser chrome
   *     mid-scroll, and the mark visibly hitched up and down with it.
   *
   * Which is why the recompute below ignores height-only resizes: on a phone
   * those are the URL bar, not a new layout.
   */
  getRevealDistance() {
    if (this.state.revealDistance === null) this.measureRevealDistance();
    return this.state.revealDistance;
  }

  measureRevealDistance() {
    // clientHeight, not visualViewport: this is the layout viewport, which is
    // what vh — and therefore the runway — is resolved against.
    const height = document.documentElement.clientHeight || window.innerHeight;
    const spacer = this.elements.spacer;
    const runway = (spacer && spacer.offsetHeight) || height * 2;

    this.state.revealDistance = Math.max(runway - height, 1);
    this.state.measuredWidth = window.innerWidth;
  }

  render() {
    const { drawEnd, swellStart, finalStroke, shrinkStart, shrinkTo } = this.config;
    const { pathLength } = this.state;
    const progress = Math.min(window.scrollY / this.getRevealDistance(), 1);

    // Phase 1 — thicken the stroke, so the finished mark sits heavier than the
    // dot it grew out of. Widths are in the mark's own 30x32 units. This lands
    // on drawEnd, not on the end of the runway: the weight is done growing the
    // moment the path finishes drawing, and holds from there.
    const swell = this.easeOvershoot((progress - swellStart) / (drawEnd - swellStart));
    const base = this.readControl('stroke', this.config.baseStroke * 10) / 10;

    const strokeWidth = base + (finalStroke - base) * swell;

    // Phase 2 — over the tail of the runway, scale the whole mark down. Applied
    // as a CSS scale on the art box rather than baked into the geometry, so the
    // stroke and dash figures above stay in plain viewBox units.
    const shrunk = this.ease((progress - shrinkStart) / (1 - shrinkStart));
    const scale = 1 - (1 - shrinkTo) * shrunk;
    // Published on .hero-mark, not on the art box, so the plate behind the mark
    // inherits the same figure and the two shrink as one object.
    this.elements.mark.style.setProperty('--mark-shrink', scale);

    // The plate itself arrives over the same run — ring and white fill both
    // fully transparent for the whole draw, so it is not there at all while the
    // mark is being traced, and at full strength by the time the mark has shrunk
    // to its settled size.
    // On .hero-mark rather than the plate, so the name label beside it inherits
    // the same figure and arrives on the same beat.
    this.elements.mark.style.setProperty('--plate-settle', `${shrunk * 100}%`);

    // Phase 4 — hand the page over from the hero's light panel to whatever the
    // scheme's background is. --page-bg in main.css walks between the two on
    // this; in light mode both ends are white and nothing moves. Its own band,
    // later than the shrink, so the mark is most of the way out before the
    // ground starts moving under it.
    const { schemeStart } = this.config;
    document.documentElement.style.setProperty(
      '--scheme-t',
      this.ease((progress - schemeStart) / (1 - schemeStart))
    );

    // Phase 5 — the sticker ring and the scroll cue. Published rather than
    // driven: main.css does the placing and the throwing off these two figures,
    // so the geometry stays in CSS with the rest of the hero's and there is no
    // second scroll listener to drift out of step with this one.
    //
    // --sticker-burst is eased and banded like every other phase here.
    // --hero-progress is the raw figure, which is what the cue wants: it has to
    // be gone within the first breath of scrolling, and an eased curve barely
    // leaves zero over that stretch.
    // Off raw scrollY rather than `progress`, so the distance is the literal
    // pixel figure and does not stretch with the runway.
    const burst = this.ease(window.scrollY / this.config.burstDistance);
    document.documentElement.style.setProperty('--sticker-burst', burst);

    // Once they are out of frame the ring is invisible but still costing: six
    // composited layers and six infinite float animations, ticking behind the
    // messages for the whole rest of the page. .is-spent takes it out of the
    // frame — and comes off again on the way back up, since the burst is
    // scrubbed rather than latched. Toggled only on the crossing, so this is
    // not a class write every frame.
    if (this.elements.stickers) {
      this.elements.stickers.classList.toggle('is-spent', burst >= 1);
      // Drops the stickers' drop-shadows for as long as they are moving — see
      // .is-drifting in main.css. Toggled only on the crossings, so this is two
      // class writes for the whole run rather than one a frame.
      this.elements.stickers.classList.toggle('is-drifting', burst > 0 && burst < 1);
    }
    document.documentElement.style.setProperty('--hero-progress', progress);

    // The cue is faded out by that same figure a few percent in. It is sticky
    // at the foot of the window for the whole runway, so it also has to stop
    // taking clicks once it is invisible — the fade alone would leave a live
    // button sitting under the reader's cursor all the way down.
    if (this.elements.cue) {
      this.elements.cue.classList.toggle('is-gone', progress > 0.02);
    }

    // Phase 3 — draw the stroke on. Each layer starts at its own lag and is remapped so they all finish
    // together on drawEnd: the gaps between them are what paint the colour
    // bands, and closing those gaps at the end is what leaves the mark black.
    //
    // Every write here re-rasterises a stroked path, and there are seven of
    // them, so nothing is written unless it has actually changed. Measured on a
    // desktop, writing all three attributes on every layer every frame cost
    // more than double the dash offsets alone, and the dot's radius on its own
    // cost as much again as all seven put together — on a phone that is the
    // difference the reveal was juddering over.
    //
    // stroke-dasharray is gone entirely: it is the path length, it never
    // changes, and the markup already carries it.
    if (strokeWidth !== this.state.lastStroke) {
      this.state.lastStroke = strokeWidth;
      // All viewBox units — independent of how large the mark is drawn.
      this.elements.dot.setAttribute('r', strokeWidth / 2);
      this.elements.layers.forEach(layer => layer.setAttribute('stroke-width', strokeWidth));
    }

    this.elements.layers.forEach((layer, index) => {
      const lag = parseFloat(layer.dataset.lag) || 0;
      const span = Math.max(drawEnd - lag, 0.0001);
      const layerDrawn = this.ease((progress - lag) / span);
      const offset = pathLength * (1 - layerDrawn);

      // Once the mark is drawn these all sit at zero and stay there, so past
      // that point this loop stops touching the DOM at all.
      if (offset === this.state.lastOffsets[index]) return;
      this.state.lastOffsets[index] = offset;
      layer.setAttribute('stroke-dashoffset', offset);
    });
  }

  /**
   * End the resting bounce once the page moves.
   *
   * Dropping the animation class alone would snap the mark back to zero from
   * wherever the bounce had got to. Freeze that transform inline first, then
   * transition it out, so the dot settles instead of jumping.
   */
  stopBounce() {
    // The MARK only. The greeting's dots bounce on the same keyframes but are
    // deliberately left running: the lockup is a typing indicator, and one that
    // stops the moment you scroll is just a picture of three dots. The mark has
    // to settle because it stops being a dot and becomes the logo.
    [this.elements.mark].forEach(el => {
      if (!el || !el.classList.contains('is-resting')) return;

      const moving = el === this.elements.mark ? [el] : [...el.querySelectorAll('.hero-greeting__dot')];
      moving.forEach(node => { node.style.transform = getComputedStyle(node).transform; });

      el.classList.remove('is-resting');
      el.classList.add('is-settling');

      // Force the frozen transform to be the starting value of the transition.
      void el.offsetHeight;
      moving.forEach(node => { node.style.transform = 'none'; });
    });
  }

  /**
   * Start the MARK bouncing again, for a reader who has scrolled back to the
   * top. The greeting's dots never stopped — see stopBounce.
   *
   * The inline transforms stopBounce left behind have to be cleared: they are
   * the 'none' it eased to, and an element carrying that would sit still while
   * the keyframes ran underneath it.
   */
  startBounce() {
    [this.elements.mark].forEach(el => {
      if (!el || el.classList.contains('is-resting')) return;

      const moving = el === this.elements.mark ? [el] : [...el.querySelectorAll('.hero-greeting__dot')];
      moving.forEach(node => { node.style.removeProperty('transform'); });

      el.classList.remove('is-settling');
      el.classList.add('is-resting');
    });
  }

  /** Smoothstep, so neither phase starts or stops abruptly. */
  ease(t) {
    return this.clamp(t) ** 2 * (3 - 2 * this.clamp(t));
  }

  /**
   * Back-out: rises past 1, then settles onto it — one overshoot, no wobble.
   *
   * Used for the stroke weight, so it swells a little heavier than it lands and
   * eases back. `pull` is how far past it goes; at 1.2 the peak is about 7% over,
   * which on a 1.4→2.8 swell is roughly a tenth of a unit.
   */
  easeOvershoot(t, pull = 1.2) {
    const from = this.clamp(t) - 1;
    return 1 + (pull + 1) * from ** 3 + pull * from ** 2;
  }

  clamp(t) {
    return Math.min(Math.max(t, 0), 1);
  }

  handleKeydown(event) {
    if (event.key === '*' || event.key === 'Multiply' || event.code === 'NumpadMultiply') {
      const panel = document.getElementById('controls-panel');
      if (panel) panel.classList.remove('display-none');
    }
  }

  updateValue(inputId) {
    const valueElement = document.getElementById(`${inputId}-value`);
    if (valueElement && this.elements[inputId]) {
      valueElement.textContent = this.elements[inputId].value;
    }
  }

}

document.addEventListener('DOMContentLoaded', () => {
  new GLogoReveal();
});
