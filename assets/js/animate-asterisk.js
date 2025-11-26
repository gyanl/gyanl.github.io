/**
 * Asterisk Animation Module
 * Creates an interactive asterisk animation with customizable properties
 */
class AsteriskAnimation {
  /**
   * Initialize the animation with configuration options
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Default configuration
    this.config = {
      initialLength: 14,
      initialWidth: 10,
      debounceDelay: 250,
      videoSource: '/assets/video/radial-flowers.mp4',
      ...options
    };

    // Cache DOM elements
    this.elements = {
      arms: document.getElementById('arms'),
      length: document.getElementById('length'),
      width: document.getElementById('width'),
      video: document.getElementById('masked-video'),
      videoContainer: document.getElementById('video-container'),
      clipPathWrapper: document.getElementById('clip-path-wrapper')
    };

    // Set video source if not already set
    if (this.elements.video && !this.elements.video.src) {
      this.elements.video.src = this.config.videoSource;
    }

    // Animation state
    this.state = {
      centerX: 0,
      centerY: 0,
      radius: 0,
      lastWidth: window.visualViewport ? window.visualViewport.width : window.innerWidth,
      lastHeight: window.visualViewport ? window.visualViewport.height : window.innerHeight
    };

    // Bind methods to preserve 'this' context
    this.handleResize = this.debounce(this.handleResize.bind(this), this.config.debounceDelay);
    this.handleScroll = this.handleScroll.bind(this);
    this.updateAsterisk = this.updateAsterisk.bind(this);

    // Initialize the animation
    this.init();
  }

  /**
   * Initialize the animation
   */
  init() {
    this.setupEventListeners();
    this.updateDimensions();
    this.updateAsterisk();
    this.updateValueDisplays();
    this.setupVideoAutoplay();
  }

  /**
   * Set up video autoplay with fallback
   */
  setupVideoAutoplay() {
    const video = this.elements.video;

    // Log video loading status
    video.addEventListener('loadeddata', () => {
      console.log('Video loaded successfully');
    });

    video.addEventListener('error', (e) => {
      console.error('Error loading video:', e);
      // Add background color if video fails to load
      video.style.backgroundColor = 'var(--accent-color)';
    });

    // Try to play the video
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('Video playing successfully');
      }).catch(error => {
        console.warn('Autoplay prevented:', error);
      });
    }
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Window resize event
    window.addEventListener('resize', this.handleResize);

    // Visual Viewport resize event for mobile Safari
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.handleResize);
    }

    // Input change events
    ['arms', 'length', 'width'].forEach(id => {
      this.elements[id].addEventListener('input', () => {
        this.updateValue(id);
        this.updateAsterisk();
      });
    });

    // Scroll event
    window.addEventListener('scroll', this.handleScroll);

    // Keydown event for asterisk shortcut
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    const currentWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    if (currentWidth !== this.state.lastWidth ||
      currentHeight !== this.state.lastHeight) {
      this.state.lastWidth = currentWidth;
      this.state.lastHeight = currentHeight;
      this.updateDimensions();
    }
  }

  /**
   * Handle scroll events
   */
  handleScroll() {
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const scrollProgress = Math.min(window.scrollY / (viewportHeight * 2), 1);

    const newLength = this.config.initialLength + (200 - this.config.initialLength) * scrollProgress;
    const newWidth = this.config.initialWidth + (1500 - this.config.initialWidth) * scrollProgress;

    this.elements.length.value = Math.round(newLength);
    this.elements.width.value = Math.round(newWidth);

    this.updateValue('length', '%');
    this.updateValue('width', 'px');

    this.updateAsterisk();
  }

  /**
   * Handle keydown events for asterisk shortcut
   */
  handleKeydown(event) {
    // Debug logging to see what key is being pressed
    console.log('Key pressed:', event.key, 'Code:', event.code, 'KeyCode:', event.keyCode);
    
    // Check if the pressed key is asterisk (*) - try multiple ways
    if (event.key === '*' || event.key === 'Multiply' || event.code === 'NumpadMultiply' || 
        (event.shiftKey && event.key === '8')) {
      console.log('Asterisk detected! Showing controls panel');
      const controlsPanel = document.getElementById('controls-panel');
      if (controlsPanel) {
        controlsPanel.classList.remove('display-none');
        console.log('Controls panel shown');
      } else {
        console.log('Controls panel not found');
      }
    }
  }

  /**
   * Update dimensions based on window size
   */
  updateDimensions() {
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

    this.state.centerX = viewportWidth / 2;
    this.state.centerY = viewportHeight / 2;
    this.state.radius = Math.min(this.state.centerX, this.state.centerY);
    this.updateAsterisk();
  }

  /**
   * Update the asterisk shape using CSS clip-path
   */
  updateAsterisk() {
    try {
      const wrapper = this.elements.clipPathWrapper;
      if (!wrapper) return;

      const arms = parseInt(this.elements.arms.value) || 6;
      const lengthPercent = (parseInt(this.elements.length.value) || 30) / 50;
      const width = parseInt(this.elements.width.value) || 10;

      // Create the clip-path polygon points for the asterisk
      let points = [];

      // Add center point
      points.push(`${this.state.centerX}px ${this.state.centerY}px`);

      // Create arms for the asterisk
      for (let i = 0; i < arms; i++) {
        const angle = (2 * Math.PI / arms) * i;

        // Calculate start point (at center)
        const startX = this.state.centerX;
        const startY = this.state.centerY;

        // Calculate end point (at the full length)
        const endX = this.state.centerX + (this.state.radius * lengthPercent) * Math.cos(angle);
        const endY = this.state.centerY + (this.state.radius * lengthPercent) * Math.sin(angle);

        // Calculate control points for the width of the arm
        const perpAngle = angle + Math.PI / 2;
        const halfWidth = width / 2;

        const controlX1 = startX + halfWidth * Math.cos(perpAngle);
        const controlY1 = startY + halfWidth * Math.sin(perpAngle);

        const controlX2 = endX + halfWidth * Math.cos(perpAngle);
        const controlY2 = endY + halfWidth * Math.sin(perpAngle);

        const controlX3 = endX - halfWidth * Math.cos(perpAngle);
        const controlY3 = endY - halfWidth * Math.sin(perpAngle);

        const controlX4 = startX - halfWidth * Math.cos(perpAngle);
        const controlY4 = startY - halfWidth * Math.sin(perpAngle);

        // Add points to create a filled arm
        points.push(`${controlX1}px ${controlY1}px`);
        points.push(`${controlX2}px ${controlY2}px`);
        points.push(`${controlX3}px ${controlY3}px`);
        points.push(`${controlX4}px ${controlY4}px`);
      }

      // Create the clip-path polygon
      const clipPath = `polygon(${points.join(', ')})`;

      // Apply the clip-path to the wrapper
      wrapper.style.clipPath = clipPath;
      wrapper.style.webkitClipPath = clipPath;

      // Apply the clip-path to the video container
      this.elements.videoContainer.style.clipPath = clipPath;
      this.elements.videoContainer.style.webkitClipPath = clipPath;

    } catch (error) {
      console.error('Error updating clipPath:', error);
    }
  }

  /**
   * Update the value display for an input
   */
  updateValue(inputId, suffix = '') {
    const valueElement = document.getElementById(`${inputId}-value`);
    if (valueElement) {
      valueElement.textContent = this.elements[inputId].value + suffix;
    }
  }

  /**
   * Update all value displays
   */
  updateValueDisplays() {
    ['arms', 'length', 'width'].forEach(id => {
      this.updateValue(id);
    });
  }

  /**
   * Debounce function to limit how often a function can be called
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize the animation when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new AsteriskAnimation();
});


