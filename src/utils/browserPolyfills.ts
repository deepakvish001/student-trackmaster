// Browser polyfills for enhanced cross-browser compatibility

// Intersection Observer polyfill check
export function initIntersectionObserver() {
  if (!window.IntersectionObserver) {
    const script = document.createElement('script');
    script.src = 'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver';
    document.head.appendChild(script);
  }
}

// ResizeObserver polyfill check
export function initResizeObserver() {
  if (!window.ResizeObserver) {
    const script = document.createElement('script');
    script.src = 'https://polyfill.io/v3/polyfill.min.js?features=ResizeObserver';
    document.head.appendChild(script);
  }
}

// CSS Custom Properties (CSS Variables) support for older browsers
export function initCSSCustomProperties() {
  if (!CSS.supports || !CSS.supports('color', 'var(--fake-var)')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/css-vars-ponyfill@2';
    script.onload = () => {
      // @ts-ignore
      window.cssVars({
        include: 'style,link[rel=stylesheet]',
        preserveStatic: true,
        preserveVars: true,
      });
    };
    document.head.appendChild(script);
  }
}

// Web Components polyfill for older browsers
export function initWebComponentsPolyfill() {
  if (!window.customElements) {
    const script = document.createElement('script');
    script.src = 'https://polyfill.io/v3/polyfill.min.js?features=es6,es2015,es2016,es2017,CustomEvent,Element.prototype.closest,Element.prototype.matches,Element.prototype.classList,DOMTokenList,URL';
    document.head.appendChild(script);
  }
}

// Modern JavaScript features polyfill
export function initModernJSPolyfills() {
  // Object.assign polyfill
  if (typeof Object.assign !== 'function') {
    Object.assign = function(target: any, ...sources: any[]) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      const to = Object(target);
      sources.forEach(source => {
        if (source != null) {
          for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              to[key] = source[key];
            }
          }
        }
      });
      return to;
    };
  }

  // Array.from polyfill
  if (!Array.from) {
    Array.from = function(arrayLike: any, mapFn?: any) {
      const items = Object(arrayLike);
      if (arrayLike == null) {
        throw new TypeError('Array.from requires an array-like object');
      }
      const len = parseInt(items.length) || 0;
      const result = [];
      for (let i = 0; i < len; i++) {
        result[i] = mapFn ? mapFn(items[i], i) : items[i];
      }
      return result;
    };
  }
}

// Fetch polyfill for older browsers
export function initFetchPolyfill() {
  if (!window.fetch) {
    const script = document.createElement('script');
    script.src = 'https://polyfill.io/v3/polyfill.min.js?features=fetch';
    document.head.appendChild(script);
  }
}

// Initialize all polyfills
export function initAllPolyfills() {
  initIntersectionObserver();
  initResizeObserver();
  initCSSCustomProperties();
  initWebComponentsPolyfill();
  initModernJSPolyfills();
  initFetchPolyfill();
}

// Browser feature detection utilities
export const browserSupport = {
  supportsWebP: () => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },
  
  supportsAvif: () => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  },
  
  supportsGrid: () => {
    return CSS.supports && CSS.supports('display', 'grid');
  },
  
  supportsFlexbox: () => {
    return CSS.supports && CSS.supports('display', 'flex');
  },
  
  supportsCustomProperties: () => {
    return CSS.supports && CSS.supports('color', 'var(--fake-var)');
  },
  
  isTouchDevice: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  isRetina: () => {
    return window.devicePixelRatio > 1;
  },
  
  getViewportSize: () => {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  }
};

// Safe area handling for devices with notches
export function initSafeAreaHandling() {
  // Add CSS custom properties for safe areas if not supported
  if (!CSS.supports('padding', 'env(safe-area-inset-top)')) {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --safe-area-inset-top: 0px;
        --safe-area-inset-right: 0px;
        --safe-area-inset-bottom: 0px;
        --safe-area-inset-left: 0px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Performance optimization for older browsers
export function initPerformanceOptimizations() {
  // Debounced resize handler
  let resizeTimeout: NodeJS.Timeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('debouncedResize'));
    }, 250);
  });

  // Passive scroll listeners for better performance
  if (supportsPassiveListeners()) {
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
  }
}

function supportsPassiveListeners() {
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: () => {
        supportsPassive = true;
        return true;
      }
    });
    window.addEventListener('testPassive', () => {}, opts);
    window.removeEventListener('testPassive', () => {}, opts);
  } catch (e) {}
  return supportsPassive;
}

function handleScroll() {
  // Optimized scroll handling
}

function handleTouchStart() {
  // Optimized touch handling
}