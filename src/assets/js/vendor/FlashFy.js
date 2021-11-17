/*! instant.page v5.1.0 - (C) 2019-2020 Alexandre Dieulot - https://instant.page/license */

let FlashFy_mouseoverTimer;
let FlashFy_lastTouchTimestamp;
const FlashFy_prefetches = new Set();
const FlashFy_prefetchElement = document.createElement('link');
const FlashFy_isSupported = FlashFy_prefetchElement.relList && FlashFy_prefetchElement.relList.supports && FlashFy_prefetchElement.relList.supports('prefetch')
                    && window.IntersectionObserver && 'isIntersecting' in IntersectionObserverEntry.prototype;
const FlashFy_allowQueryString = 'instantAllowQueryString' in document.body.dataset;
const FlashFy_allowExternalLinks = 'instantAllowExternalLinks' in document.body.dataset;
const FlashFy_useWhitelist = 'instantWhitelist' in document.body.dataset;
const FlashFy_mousedownShortcut = 'instantMousedownShortcut' in document.body.dataset;
const FlashFy_DELAY_TO_NOT_BE_CONSIDERED_A_TOUCH_INITIATED_ACTION = 1111;

let FlashFy_delayOnHover = 65;
let FlashFy_useMousedown = false;
let FlashFy_useMousedownOnly = false;
let FlashFy_useViewport = false;

if ('instantIntensity' in document.body.dataset) {
  const FlashFy_intensity = document.body.dataset.instantIntensity;

  if (FlashFy_intensity.substr(0, 'mousedown'.length) == 'mousedown') {
    FlashFy_useMousedown = true;
    if (FlashFy_intensity == 'mousedown-only') {
      FlashFy_useMousedownOnly = true;
    }
  }
  else if (FlashFy_intensity.substr(0, 'viewport'.length) == 'viewport') {
    if (!(navigator.connection && (navigator.connection.saveData || (navigator.connection.effectiveType && navigator.connection.effectiveType.includes('2g'))))) {
      if (FlashFy_intensity == "viewport") {
        /* Biggest iPhone resolution (which we want): 414 × 896 = 370944
         * Small 7" tablet resolution (which we don’t want): 600 × 1024 = 614400
         * Note that the viewport (which we check here) is smaller than the resolution due to the UI’s chrome */
        if (document.documentElement.clientWidth * document.documentElement.clientHeight < 450000) {
          FlashFy_useViewport = true;
        }
      }
      else if (FlashFy_intensity == "viewport-all") {
        FlashFy_useViewport = true;
      }
    }
  }
  else {
    const FlashFy_milliseconds = parseInt(FlashFy_intensity);
    if (!isNaN(FlashFy_milliseconds)) {
      FlashFy_delayOnHover = FlashFy_milliseconds;
    }
  }
}

if (FlashFy_isSupported) {
  const eventListenersOptions = {
    capture: true,
    passive: true,
  };

  if (!FlashFy_useMousedownOnly) {
    document.addEventListener('touchstart', FlashFy_touchstartListener, eventListenersOptions);
  }

  if (!FlashFy_useMousedown) {
    document.addEventListener('mouseover', FlashFy_mouseoverListener, eventListenersOptions);
  }
  else if (!FlashFy_mousedownShortcut) {
      document.addEventListener('mousedown', FlashFy_mousedownListener, eventListenersOptions);
  }

  if (FlashFy_mousedownShortcut) {
    document.addEventListener('mousedown', FlashFy_mousedownShortcutListener, eventListenersOptions);
  }

  if (FlashFy_useViewport) {
    let triggeringFunction;
    if (window.requestIdleCallback) {
      triggeringFunction = (callback) => {
        requestIdleCallback(callback, {
          timeout: 1500,
        });
      };
    }
    else {
      triggeringFunction = (callback) => {
        callback();
      };
    }

    triggeringFunction(() => {
      const intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const FlashFy_linkElement = entry.target;
            intersectionObserver.unobserve(FlashFy_linkElement);
            FlashFy_preload(FlashFy_linkElement.href);
          }
        });
      });

      document.querySelectorAll('a').forEach((FlashFy_linkElement) => {
        if (FlashFy_isPreloadable(FlashFy_linkElement)) {
          intersectionObserver.observe(FlashFy_linkElement);
        }
      });
    });
  }
}

function FlashFy_touchstartListener(event) {
  /* Chrome on Android calls mouseover before touchcancel so `FlashFy_lastTouchTimestamp`
   * must be assigned on touchstart to be measured on mouseover. */
  FlashFy_lastTouchTimestamp = performance.now();

  const FlashFy_linkElement = event.target.closest('a');

  if (!FlashFy_isPreloadable(FlashFy_linkElement)) {
    return;
  }

  FlashFy_preload(FlashFy_linkElement.href);
}

function FlashFy_mouseoverListener(event) {
  if (performance.now() - FlashFy_lastTouchTimestamp < FlashFy_DELAY_TO_NOT_BE_CONSIDERED_A_TOUCH_INITIATED_ACTION) {
    return;
  }

  const FlashFy_linkElement = event.target.closest('a');

  if (!FlashFy_isPreloadable(FlashFy_linkElement)) {
    return;
  }

  FlashFy_linkElement.addEventListener('mouseout', mouseoutListener, {passive: true});

  FlashFy_mouseoverTimer = setTimeout(() => {
    FlashFy_preload(FlashFy_linkElement.href);
    FlashFy_mouseoverTimer = undefined;
  }, FlashFy_delayOnHover);
}

function FlashFy_mousedownListener(event) {
  const FlashFy_linkElement = event.target.closest('a');

  if (!FlashFy_isPreloadable(FlashFy_linkElement)) {
    return;
  }

  FlashFy_preload(FlashFy_linkElement.href);
}

function mouseoutListener(event) {
  if (event.relatedTarget && event.target.closest('a') == event.relatedTarget.closest('a')) {
    return;
  }

  if (FlashFy_mouseoverTimer) {
    clearTimeout(FlashFy_mouseoverTimer);
    FlashFy_mouseoverTimer = undefined;
  }
}

function FlashFy_mousedownShortcutListener(event) {
  if (performance.now() - FlashFy_lastTouchTimestamp < FlashFy_DELAY_TO_NOT_BE_CONSIDERED_A_TOUCH_INITIATED_ACTION) {
    return;
  }

  const FlashFy_linkElement = event.target.closest('a');

  if (event.which > 1 || event.metaKey || event.ctrlKey) {
    return;
  }

  if (!FlashFy_linkElement) {
    return;
  }

  FlashFy_linkElement.addEventListener('click', function (event) {
    if (event.detail == 1337) {
      return;
    }

    event.preventDefault();
  }, {capture: true, passive: false, once: true});

  const customEvent = new MouseEvent('click', {view: window, bubbles: true, cancelable: false, detail: 1337});
  FlashFy_linkElement.dispatchEvent(customEvent);
}

function FlashFy_isPreloadable(FlashFy_linkElement) {
  if (!FlashFy_linkElement || !FlashFy_linkElement.href) {
    return;
  }

  if (FlashFy_useWhitelist && !('instant' in FlashFy_linkElement.dataset)) {
    return;
  }

  if (!FlashFy_allowExternalLinks && FlashFy_linkElement.origin != location.origin && !('instant' in FlashFy_linkElement.dataset)) {
    return;
  }

  if (!['http:', 'https:'].includes(FlashFy_linkElement.protocol)) {
    return;
  }

  if (FlashFy_linkElement.protocol == 'http:' && location.protocol == 'https:') {
    return;
  }

  if (!FlashFy_allowQueryString && FlashFy_linkElement.search && !('instant' in FlashFy_linkElement.dataset)) {
    return;
  }

  if (FlashFy_linkElement.hash && FlashFy_linkElement.pathname + FlashFy_linkElement.search == location.pathname + location.search) {
    return;
  }

  if ('noInstant' in FlashFy_linkElement.dataset) {
    return;
  }

  return true;
}

function FlashFy_preload(url) {
  if (FlashFy_prefetches.has(url)) {
    return;
  }

  const prefetcher = document.createElement('link');
  prefetcher.rel = 'prefetch';
  prefetcher.href = url;
  document.head.appendChild(prefetcher);

  FlashFy_prefetches.add(url);
}
