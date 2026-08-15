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
      // The stickers ringing the mark are thrown radially out of frame over the
      // head of the runway, so they are gone by the time the mark starts
      // settling onto its plate and the page has the reveal to itself.
      burstEnd: 0.62,
      // The plate behind the mark: how far its side runs past the 30x32 viewBox.
      // It is a circle at every size (border-radius: 50%), so there is no radius
      // to configure here.
      plateInset: 1.28,
      // Where the page starts crossing from the hero's light panel to the
      // scheme's own background. Dark mode only — see --page-bg in main.css.
      schemeStart: 0.8,
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
      size: document.getElementById('size'),
      stroke: document.getElementById('stroke')
    };

    if (!this.elements.path) return;


    this.state = {
      frame: null,
      pathLength: this.elements.path.getTotalLength(),
    };

    this.handleScroll = this.handleScroll.bind(this);
    this.render = this.render.bind(this);

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.render();
  }

  viewport() {
    return {
      width: window.visualViewport ? window.visualViewport.width : window.innerWidth,
      height: window.visualViewport ? window.visualViewport.height : window.innerHeight
    };
  }

  setupEventListeners() {
    // No resize listener: the viewBox and --mark-unit keep the mark sized in
    // CSS, so a resize needs no script at all.
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

      const top = chat.getBoundingClientRect().top + window.scrollY
        - this.viewport().height * 0.25;
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      window.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
    });
  }

  /** Coalesce bursts of scroll events into one render a frame. */
  handleScroll() {
    if (window.scrollY > 0) this.stopBounce();
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
   */
  getRevealDistance() {
    const spacer = document.querySelector('.hero-spacer');
    const runway = (spacer && spacer.offsetHeight) || this.viewport().height * 2;
    return Math.max(runway - this.viewport().height, 1);
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
    document.documentElement.style.setProperty(
      '--sticker-burst',
      this.ease(progress / this.config.burstEnd)
    );
    document.documentElement.style.setProperty('--hero-progress', progress);

    // The cue is faded out by that same figure a few percent in. It is sticky
    // at the foot of the window for the whole runway, so it also has to stop
    // taking clicks once it is invisible — the fade alone would leave a live
    // button sitting under the reader's cursor all the way down.
    if (this.elements.cue) {
      this.elements.cue.classList.toggle('is-gone', progress > 0.02);
    }

    // All viewBox units — independent of how large the mark is drawn.
    this.elements.dot.setAttribute('r', strokeWidth / 2);

    // Phase 3 — draw the stroke on. Each layer starts at its own lag and is remapped so they all finish
    // together on drawEnd: the gaps between them are what paint the colour
    // bands, and closing those gaps at the end is what leaves the mark black.
    this.elements.layers.forEach(layer => {
      const lag = parseFloat(layer.dataset.lag) || 0;
      const span = Math.max(drawEnd - lag, 0.0001);
      const layerDrawn = this.ease((progress - lag) / span);

      layer.setAttribute('stroke-width', strokeWidth);
      layer.setAttribute('stroke-dasharray', pathLength);
      layer.setAttribute('stroke-dashoffset', pathLength * (1 - layerDrawn));
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
    // The mark and the greeting's typed dots bounce on the same keyframes, so
    // both have to be settled together or the dots would carry on alone.
    [this.elements.mark, this.elements.greeting].forEach(el => {
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
