"use strict";

/*! instant.page v5.1.0 - (C) 2019-2020 Alexandre Dieulot - https://instant.page/license */
var FlashFy_mouseoverTimer;
var FlashFy_lastTouchTimestamp;
var FlashFy_prefetches = new Set();
var FlashFy_prefetchElement = document.createElement('link');
var FlashFy_isSupported = FlashFy_prefetchElement.relList && FlashFy_prefetchElement.relList.supports && FlashFy_prefetchElement.relList.supports('prefetch') && window.IntersectionObserver && 'isIntersecting' in IntersectionObserverEntry.prototype;
var FlashFy_allowQueryString = ('instantAllowQueryString' in document.body.dataset);
var FlashFy_allowExternalLinks = ('instantAllowExternalLinks' in document.body.dataset);
var FlashFy_useWhitelist = ('instantWhitelist' in document.body.dataset);
var FlashFy_mousedownShortcut = ('instantMousedownShortcut' in document.body.dataset);
var FlashFy_DELAY_TO_NOT_BE_CONSIDERED_A_TOUCH_INITIATED_ACTION = 1111;
var FlashFy_delayOnHover = 65;
var FlashFy_useMousedown = false;
var FlashFy_useMousedownOnly = false;
var FlashFy_useViewport = false;

if ('instantIntensity' in document.body.dataset) {
  var FlashFy_intensity = document.body.dataset.instantIntensity;

  if (FlashFy_intensity.substr(0, 'mousedown'.length) == 'mousedown') {
    FlashFy_useMousedown = true;

    if (FlashFy_intensity == 'mousedown-only') {
      FlashFy_useMousedownOnly = true;
    }
  } else if (FlashFy_intensity.substr(0, 'viewport'.length) == 'viewport') {
    if (!(navigator.connection && (navigator.connection.saveData || navigator.connection.effectiveType && navigator.connection.effectiveType.includes('2g')))) {
      if (FlashFy_intensity == "viewport") {
        /* Biggest iPhone resolution (which we want): 414 × 896 = 370944
         * Small 7" tablet resolution (which we don’t want): 600 × 1024 = 614400
         * Note that the viewport (which we check here) is smaller than the resolution due to the UI’s chrome */
        if (document.documentElement.clientWidth * document.documentElement.clientHeight < 450000) {
          FlashFy_useViewport = true;
        }
      } else if (FlashFy_intensity == "viewport-all") {
        FlashFy_useViewport = true;
      }
    }
  } else {
    var FlashFy_milliseconds = parseInt(FlashFy_intensity);

    if (!isNaN(FlashFy_milliseconds)) {
      FlashFy_delayOnHover = FlashFy_milliseconds;
    }
  }
}

if (FlashFy_isSupported) {
  var eventListenersOptions = {
    capture: true,
    passive: true
  };

  if (!FlashFy_useMousedownOnly) {
    document.addEventListener('touchstart', FlashFy_touchstartListener, eventListenersOptions);
  }

  if (!FlashFy_useMousedown) {
    document.addEventListener('mouseover', FlashFy_mouseoverListener, eventListenersOptions);
  } else if (!FlashFy_mousedownShortcut) {
    document.addEventListener('mousedown', FlashFy_mousedownListener, eventListenersOptions);
  }

  if (FlashFy_mousedownShortcut) {
    document.addEventListener('mousedown', FlashFy_mousedownShortcutListener, eventListenersOptions);
  }

  if (FlashFy_useViewport) {
    var triggeringFunction;

    if (window.requestIdleCallback) {
      triggeringFunction = function triggeringFunction(callback) {
        requestIdleCallback(callback, {
          timeout: 1500
        });
      };
    } else {
      triggeringFunction = function triggeringFunction(callback) {
        callback();
      };
    }

    triggeringFunction(function () {
      var intersectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var FlashFy_linkElement = entry.target;
            intersectionObserver.unobserve(FlashFy_linkElement);
            FlashFy_preload(FlashFy_linkElement.href);
          }
        });
      });
      document.querySelectorAll('a').forEach(function (FlashFy_linkElement) {
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
  var FlashFy_linkElement = event.target.closest('a');

  if (!FlashFy_isPreloadable(FlashFy_linkElement)) {
    return;
  }

  FlashFy_preload(FlashFy_linkElement.href);
}

function FlashFy_mouseoverListener(event) {
  if (performance.now() - FlashFy_lastTouchTimestamp < FlashFy_DELAY_TO_NOT_BE_CONSIDERED_A_TOUCH_INITIATED_ACTION) {
    return;
  }

  var FlashFy_linkElement = event.target.closest('a');

  if (!FlashFy_isPreloadable(FlashFy_linkElement)) {
    return;
  }

  FlashFy_linkElement.addEventListener('mouseout', mouseoutListener, {
    passive: true
  });
  FlashFy_mouseoverTimer = setTimeout(function () {
    FlashFy_preload(FlashFy_linkElement.href);
    FlashFy_mouseoverTimer = undefined;
  }, FlashFy_delayOnHover);
}

function FlashFy_mousedownListener(event) {
  var FlashFy_linkElement = event.target.closest('a');

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

  var FlashFy_linkElement = event.target.closest('a');

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
  }, {
    capture: true,
    passive: false,
    once: true
  });
  var customEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: false,
    detail: 1337
  });
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

  var prefetcher = document.createElement('link');
  prefetcher.rel = 'prefetch';
  prefetcher.href = url;
  document.head.appendChild(prefetcher);
  FlashFy_prefetches.add(url);
}
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*! algoliasearch-lite.umd.js | 4.8.5 | © Algolia, inc. | https://github.com/algolia/algoliasearch-client-javascript */
!function (e, t) {
  "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = e || self).algoliasearch = t();
}(void 0, function () {
  "use strict";

  function e(e, t, r) {
    return t in e ? Object.defineProperty(e, t, {
      value: r,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }) : e[t] = r, e;
  }

  function t(e, t) {
    var r = Object.keys(e);

    if (Object.getOwnPropertySymbols) {
      var n = Object.getOwnPropertySymbols(e);
      t && (n = n.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })), r.push.apply(r, n);
    }

    return r;
  }

  function r(r) {
    for (var n = 1; n < arguments.length; n++) {
      var o = null != arguments[n] ? arguments[n] : {};
      n % 2 ? t(Object(o), !0).forEach(function (t) {
        e(r, t, o[t]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(o)) : t(Object(o)).forEach(function (e) {
        Object.defineProperty(r, e, Object.getOwnPropertyDescriptor(o, e));
      });
    }

    return r;
  }

  function n(e, t) {
    if (null == e) return {};

    var r,
        n,
        o = function (e, t) {
      if (null == e) return {};
      var r,
          n,
          o = {},
          a = Object.keys(e);

      for (n = 0; n < a.length; n++) {
        r = a[n], t.indexOf(r) >= 0 || (o[r] = e[r]);
      }

      return o;
    }(e, t);

    if (Object.getOwnPropertySymbols) {
      var a = Object.getOwnPropertySymbols(e);

      for (n = 0; n < a.length; n++) {
        r = a[n], t.indexOf(r) >= 0 || Object.prototype.propertyIsEnumerable.call(e, r) && (o[r] = e[r]);
      }
    }

    return o;
  }

  function o(e, t) {
    return function (e) {
      if (Array.isArray(e)) return e;
    }(e) || function (e, t) {
      if (!(Symbol.iterator in Object(e) || "[object Arguments]" === Object.prototype.toString.call(e))) return;
      var r = [],
          n = !0,
          o = !1,
          a = void 0;

      try {
        for (var u, i = e[Symbol.iterator](); !(n = (u = i.next()).done) && (r.push(u.value), !t || r.length !== t); n = !0) {
          ;
        }
      } catch (e) {
        o = !0, a = e;
      } finally {
        try {
          n || null == i.return || i.return();
        } finally {
          if (o) throw a;
        }
      }

      return r;
    }(e, t) || function () {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }();
  }

  function a(e) {
    return function (e) {
      if (Array.isArray(e)) {
        for (var t = 0, r = new Array(e.length); t < e.length; t++) {
          r[t] = e[t];
        }

        return r;
      }
    }(e) || function (e) {
      if (Symbol.iterator in Object(e) || "[object Arguments]" === Object.prototype.toString.call(e)) return Array.from(e);
    }(e) || function () {
      throw new TypeError("Invalid attempt to spread non-iterable instance");
    }();
  }

  function u(e) {
    var t,
        r = "algoliasearch-client-js-".concat(e.key),
        n = function n() {
      return void 0 === t && (t = e.localStorage || window.localStorage), t;
    },
        a = function a() {
      return JSON.parse(n().getItem(r) || "{}");
    };

    return {
      get: function get(e, t) {
        var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {
          miss: function miss() {
            return Promise.resolve();
          }
        };
        return Promise.resolve().then(function () {
          var r = JSON.stringify(e),
              n = a()[r];
          return Promise.all([n || t(), void 0 !== n]);
        }).then(function (e) {
          var t = o(e, 2),
              n = t[0],
              a = t[1];
          return Promise.all([n, a || r.miss(n)]);
        }).then(function (e) {
          return o(e, 1)[0];
        });
      },
      set: function set(e, t) {
        return Promise.resolve().then(function () {
          var o = a();
          return o[JSON.stringify(e)] = t, n().setItem(r, JSON.stringify(o)), t;
        });
      },
      delete: function _delete(e) {
        return Promise.resolve().then(function () {
          var t = a();
          delete t[JSON.stringify(e)], n().setItem(r, JSON.stringify(t));
        });
      },
      clear: function clear() {
        return Promise.resolve().then(function () {
          n().removeItem(r);
        });
      }
    };
  }

  function i(e) {
    var t = a(e.caches),
        r = t.shift();
    return void 0 === r ? {
      get: function get(e, t) {
        var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {
          miss: function miss() {
            return Promise.resolve();
          }
        },
            n = t();
        return n.then(function (e) {
          return Promise.all([e, r.miss(e)]);
        }).then(function (e) {
          return o(e, 1)[0];
        });
      },
      set: function set(e, t) {
        return Promise.resolve(t);
      },
      delete: function _delete(e) {
        return Promise.resolve();
      },
      clear: function clear() {
        return Promise.resolve();
      }
    } : {
      get: function get(e, n) {
        var o = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {
          miss: function miss() {
            return Promise.resolve();
          }
        };
        return r.get(e, n, o).catch(function () {
          return i({
            caches: t
          }).get(e, n, o);
        });
      },
      set: function set(e, n) {
        return r.set(e, n).catch(function () {
          return i({
            caches: t
          }).set(e, n);
        });
      },
      delete: function _delete(e) {
        return r.delete(e).catch(function () {
          return i({
            caches: t
          }).delete(e);
        });
      },
      clear: function clear() {
        return r.clear().catch(function () {
          return i({
            caches: t
          }).clear();
        });
      }
    };
  }

  function s() {
    var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {
      serializable: !0
    },
        t = {};
    return {
      get: function get(r, n) {
        var o = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {
          miss: function miss() {
            return Promise.resolve();
          }
        },
            a = JSON.stringify(r);
        if (a in t) return Promise.resolve(e.serializable ? JSON.parse(t[a]) : t[a]);

        var u = n(),
            i = o && o.miss || function () {
          return Promise.resolve();
        };

        return u.then(function (e) {
          return i(e);
        }).then(function () {
          return u;
        });
      },
      set: function set(r, n) {
        return t[JSON.stringify(r)] = e.serializable ? JSON.stringify(n) : n, Promise.resolve(n);
      },
      delete: function _delete(e) {
        return delete t[JSON.stringify(e)], Promise.resolve();
      },
      clear: function clear() {
        return t = {}, Promise.resolve();
      }
    };
  }

  function c(e) {
    for (var t = e.length - 1; t > 0; t--) {
      var r = Math.floor(Math.random() * (t + 1)),
          n = e[t];
      e[t] = e[r], e[r] = n;
    }

    return e;
  }

  function l(e, t) {
    return t ? (Object.keys(t).forEach(function (r) {
      e[r] = t[r](e);
    }), e) : e;
  }

  function f(e) {
    for (var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1; n < t; n++) {
      r[n - 1] = arguments[n];
    }

    var o = 0;
    return e.replace(/%s/g, function () {
      return encodeURIComponent(r[o++]);
    });
  }

  var h = {
    WithinQueryParameters: 0,
    WithinHeaders: 1
  };

  function d(e, t) {
    var r = e || {},
        n = r.data || {};
    return Object.keys(r).forEach(function (e) {
      -1 === ["timeout", "headers", "queryParameters", "data", "cacheable"].indexOf(e) && (n[e] = r[e]);
    }), {
      data: Object.entries(n).length > 0 ? n : void 0,
      timeout: r.timeout || t,
      headers: r.headers || {},
      queryParameters: r.queryParameters || {},
      cacheable: r.cacheable
    };
  }

  var m = {
    Read: 1,
    Write: 2,
    Any: 3
  },
      p = 1,
      v = 2,
      y = 3;

  function g(e) {
    var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : p;
    return r(r({}, e), {}, {
      status: t,
      lastUpdate: Date.now()
    });
  }

  function b(e) {
    return "string" == typeof e ? {
      protocol: "https",
      url: e,
      accept: m.Any
    } : {
      protocol: e.protocol || "https",
      url: e.url,
      accept: e.accept || m.Any
    };
  }

  var O = "GET",
      P = "POST";

  function q(e, t) {
    return Promise.all(t.map(function (t) {
      return e.get(t, function () {
        return Promise.resolve(g(t));
      });
    })).then(function (e) {
      var r = e.filter(function (e) {
        return function (e) {
          return e.status === p || Date.now() - e.lastUpdate > 12e4;
        }(e);
      }),
          n = e.filter(function (e) {
        return function (e) {
          return e.status === y && Date.now() - e.lastUpdate <= 12e4;
        }(e);
      }),
          o = [].concat(a(r), a(n));
      return {
        getTimeout: function getTimeout(e, t) {
          return (0 === n.length && 0 === e ? 1 : n.length + 3 + e) * t;
        },
        statelessHosts: o.length > 0 ? o.map(function (e) {
          return b(e);
        }) : t
      };
    });
  }

  function j(e, t, n, o) {
    var u = [],
        i = function (e, t) {
      if (e.method === O || void 0 === e.data && void 0 === t.data) return;
      var n = Array.isArray(e.data) ? e.data : r(r({}, e.data), t.data);
      return JSON.stringify(n);
    }(n, o),
        s = function (e, t) {
      var n = r(r({}, e.headers), t.headers),
          o = {};
      return Object.keys(n).forEach(function (e) {
        var t = n[e];
        o[e.toLowerCase()] = t;
      }), o;
    }(e, o),
        c = n.method,
        l = n.method !== O ? {} : r(r({}, n.data), o.data),
        f = r(r(r({
      "x-algolia-agent": e.userAgent.value
    }, e.queryParameters), l), o.queryParameters),
        h = 0,
        d = function t(r, a) {
      var l = r.pop();
      if (void 0 === l) throw {
        name: "RetryError",
        message: "Unreachable hosts - your application id may be incorrect. If the error persists, contact support@algolia.com.",
        transporterStackTrace: A(u)
      };

      var d = {
        data: i,
        headers: s,
        method: c,
        url: S(l, n.path, f),
        connectTimeout: a(h, e.timeouts.connect),
        responseTimeout: a(h, o.timeout)
      },
          m = function m(e) {
        var t = {
          request: d,
          response: e,
          host: l,
          triesLeft: r.length
        };
        return u.push(t), t;
      },
          p = {
        onSucess: function onSucess(e) {
          return function (e) {
            try {
              return JSON.parse(e.content);
            } catch (t) {
              throw function (e, t) {
                return {
                  name: "DeserializationError",
                  message: e,
                  response: t
                };
              }(t.message, e);
            }
          }(e);
        },
        onRetry: function onRetry(n) {
          var o = m(n);
          return n.isTimedOut && h++, Promise.all([e.logger.info("Retryable failure", x(o)), e.hostsCache.set(l, g(l, n.isTimedOut ? y : v))]).then(function () {
            return t(r, a);
          });
        },
        onFail: function onFail(e) {
          throw m(e), function (e, t) {
            var r = e.content,
                n = e.status,
                o = r;

            try {
              o = JSON.parse(r).message;
            } catch (e) {}

            return function (e, t, r) {
              return {
                name: "ApiError",
                message: e,
                status: t,
                transporterStackTrace: r
              };
            }(o, n, t);
          }(e, A(u));
        }
      };

      return e.requester.send(d).then(function (e) {
        return function (e, t) {
          return function (e) {
            var t = e.status;
            return e.isTimedOut || function (e) {
              var t = e.isTimedOut,
                  r = e.status;
              return !t && 0 == ~~r;
            }(e) || 2 != ~~(t / 100) && 4 != ~~(t / 100);
          }(e) ? t.onRetry(e) : 2 == ~~(e.status / 100) ? t.onSucess(e) : t.onFail(e);
        }(e, p);
      });
    };

    return q(e.hostsCache, t).then(function (e) {
      return d(a(e.statelessHosts).reverse(), e.getTimeout);
    });
  }

  function w(e) {
    var t = {
      value: "Algolia for JavaScript (".concat(e, ")"),
      add: function add(e) {
        var r = "; ".concat(e.segment).concat(void 0 !== e.version ? " (".concat(e.version, ")") : "");
        return -1 === t.value.indexOf(r) && (t.value = "".concat(t.value).concat(r)), t;
      }
    };
    return t;
  }

  function S(e, t, r) {
    var n = T(r),
        o = "".concat(e.protocol, "://").concat(e.url, "/").concat("/" === t.charAt(0) ? t.substr(1) : t);
    return n.length && (o += "?".concat(n)), o;
  }

  function T(e) {
    return Object.keys(e).map(function (t) {
      return f("%s=%s", t, (r = e[t], "[object Object]" === Object.prototype.toString.call(r) || "[object Array]" === Object.prototype.toString.call(r) ? JSON.stringify(e[t]) : e[t]));
      var r;
    }).join("&");
  }

  function A(e) {
    return e.map(function (e) {
      return x(e);
    });
  }

  function x(e) {
    var t = e.request.headers["x-algolia-api-key"] ? {
      "x-algolia-api-key": "*****"
    } : {};
    return r(r({}, e), {}, {
      request: r(r({}, e.request), {}, {
        headers: r(r({}, e.request.headers), t)
      })
    });
  }

  var N = function N(e) {
    var t = e.appId,
        n = function (e, t, r) {
      var n = {
        "x-algolia-api-key": r,
        "x-algolia-application-id": t
      };
      return {
        headers: function headers() {
          return e === h.WithinHeaders ? n : {};
        },
        queryParameters: function queryParameters() {
          return e === h.WithinQueryParameters ? n : {};
        }
      };
    }(void 0 !== e.authMode ? e.authMode : h.WithinHeaders, t, e.apiKey),
        a = function (e) {
      var t = e.hostsCache,
          r = e.logger,
          n = e.requester,
          a = e.requestsCache,
          u = e.responsesCache,
          i = e.timeouts,
          s = e.userAgent,
          c = e.hosts,
          l = e.queryParameters,
          f = {
        hostsCache: t,
        logger: r,
        requester: n,
        requestsCache: a,
        responsesCache: u,
        timeouts: i,
        userAgent: s,
        headers: e.headers,
        queryParameters: l,
        hosts: c.map(function (e) {
          return b(e);
        }),
        read: function read(e, t) {
          var r = d(t, f.timeouts.read),
              n = function n() {
            return j(f, f.hosts.filter(function (e) {
              return 0 != (e.accept & m.Read);
            }), e, r);
          };

          if (!0 !== (void 0 !== r.cacheable ? r.cacheable : e.cacheable)) return n();
          var a = {
            request: e,
            mappedRequestOptions: r,
            transporter: {
              queryParameters: f.queryParameters,
              headers: f.headers
            }
          };
          return f.responsesCache.get(a, function () {
            return f.requestsCache.get(a, function () {
              return f.requestsCache.set(a, n()).then(function (e) {
                return Promise.all([f.requestsCache.delete(a), e]);
              }, function (e) {
                return Promise.all([f.requestsCache.delete(a), Promise.reject(e)]);
              }).then(function (e) {
                var t = o(e, 2);
                t[0];
                return t[1];
              });
            });
          }, {
            miss: function miss(e) {
              return f.responsesCache.set(a, e);
            }
          });
        },
        write: function write(e, t) {
          return j(f, f.hosts.filter(function (e) {
            return 0 != (e.accept & m.Write);
          }), e, d(t, f.timeouts.write));
        }
      };
      return f;
    }(r(r({
      hosts: [{
        url: "".concat(t, "-dsn.algolia.net"),
        accept: m.Read
      }, {
        url: "".concat(t, ".algolia.net"),
        accept: m.Write
      }].concat(c([{
        url: "".concat(t, "-1.algolianet.com")
      }, {
        url: "".concat(t, "-2.algolianet.com")
      }, {
        url: "".concat(t, "-3.algolianet.com")
      }]))
    }, e), {}, {
      headers: r(r(r({}, n.headers()), {
        "content-type": "application/x-www-form-urlencoded"
      }), e.headers),
      queryParameters: r(r({}, n.queryParameters()), e.queryParameters)
    }));

    return l({
      transporter: a,
      appId: t,
      addAlgoliaAgent: function addAlgoliaAgent(e, t) {
        a.userAgent.add({
          segment: e,
          version: t
        });
      },
      clearCache: function clearCache() {
        return Promise.all([a.requestsCache.clear(), a.responsesCache.clear()]).then(function () {});
      }
    }, e.methods);
  },
      C = function C(e) {
    return function (t) {
      var r = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
          n = {
        transporter: e.transporter,
        appId: e.appId,
        indexName: t
      };
      return l(n, r.methods);
    };
  },
      k = function k(e) {
    return function (t, n) {
      var o = t.map(function (e) {
        return r(r({}, e), {}, {
          params: T(e.params || {})
        });
      });
      return e.transporter.read({
        method: P,
        path: "1/indexes/*/queries",
        data: {
          requests: o
        },
        cacheable: !0
      }, n);
    };
  },
      J = function J(e) {
    return function (t, o) {
      return Promise.all(t.map(function (t) {
        var a = t.params,
            u = a.facetName,
            i = a.facetQuery,
            s = n(a, ["facetName", "facetQuery"]);
        return C(e)(t.indexName, {
          methods: {
            searchForFacetValues: F
          }
        }).searchForFacetValues(u, i, r(r({}, o), s));
      }));
    };
  },
      E = function E(e) {
    return function (t, r, n) {
      return e.transporter.read({
        method: P,
        path: f("1/answers/%s/prediction", e.indexName),
        data: {
          query: t,
          queryLanguages: r
        },
        cacheable: !0
      }, n);
    };
  },
      I = function I(e) {
    return function (t, r) {
      return e.transporter.read({
        method: P,
        path: f("1/indexes/%s/query", e.indexName),
        data: {
          query: t
        },
        cacheable: !0
      }, r);
    };
  },
      F = function F(e) {
    return function (t, r, n) {
      return e.transporter.read({
        method: P,
        path: f("1/indexes/%s/facets/%s/query", e.indexName, t),
        data: {
          facetQuery: r
        },
        cacheable: !0
      }, n);
    };
  },
      R = 1,
      D = 2,
      W = 3;

  function H(e, t, n) {
    var o,
        a = {
      appId: e,
      apiKey: t,
      timeouts: {
        connect: 1,
        read: 2,
        write: 30
      },
      requester: {
        send: function send(e) {
          return new Promise(function (t) {
            var r = new XMLHttpRequest();
            r.open(e.method, e.url, !0), Object.keys(e.headers).forEach(function (t) {
              return r.setRequestHeader(t, e.headers[t]);
            });

            var n,
                o = function o(e, n) {
              return setTimeout(function () {
                r.abort(), t({
                  status: 0,
                  content: n,
                  isTimedOut: !0
                });
              }, 1e3 * e);
            },
                a = o(e.connectTimeout, "Connection timeout");

            r.onreadystatechange = function () {
              r.readyState > r.OPENED && void 0 === n && (clearTimeout(a), n = o(e.responseTimeout, "Socket timeout"));
            }, r.onerror = function () {
              0 === r.status && (clearTimeout(a), clearTimeout(n), t({
                content: r.responseText || "Network request failed",
                status: r.status,
                isTimedOut: !1
              }));
            }, r.onload = function () {
              clearTimeout(a), clearTimeout(n), t({
                content: r.responseText,
                status: r.status,
                isTimedOut: !1
              });
            }, r.send(e.data);
          });
        }
      },
      logger: (o = W, {
        debug: function debug(e, t) {
          return R >= o && console.debug(e, t), Promise.resolve();
        },
        info: function info(e, t) {
          return D >= o && console.info(e, t), Promise.resolve();
        },
        error: function error(e, t) {
          return console.error(e, t), Promise.resolve();
        }
      }),
      responsesCache: s(),
      requestsCache: s({
        serializable: !1
      }),
      hostsCache: i({
        caches: [u({
          key: "".concat("4.8.5", "-").concat(e)
        }), s()]
      }),
      userAgent: w("4.8.5").add({
        segment: "Browser",
        version: "lite"
      }),
      authMode: h.WithinQueryParameters
    };
    return N(r(r(r({}, a), n), {}, {
      methods: {
        search: k,
        searchForFacetValues: J,
        multipleQueries: k,
        multipleSearchForFacetValues: J,
        initIndex: function initIndex(e) {
          return function (t) {
            return C(e)(t, {
              methods: {
                search: I,
                searchForFacetValues: F,
                findAnswers: E
              }
            });
          };
        }
      }
    }));
  }

  return H.version = "4.8.5", H;
});
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*! InstantSearch.js 4.14.2 | © Algolia, Inc. and contributors; MIT License | https://github.com/algolia/instantsearch.js */
!function (e, t) {
  "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = e || self).instantsearch = t();
}(void 0, function () {
  "use strict";

  function h(e) {
    return (h = "function" == typeof Symbol && "symbol" == _typeof(Symbol.iterator) ? function (e) {
      return _typeof(e);
    } : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : _typeof(e);
    })(e);
  }

  function k(e, t) {
    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
  }

  function r(e, t) {
    for (var n = 0; n < t.length; n++) {
      var r = t[n];
      r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, r.key, r);
    }
  }

  function L(e, t, n) {
    return t && r(e.prototype, t), n && r(e, n), e;
  }

  function M(e, t, n) {
    return t in e ? Object.defineProperty(e, t, {
      value: n,
      enumerable: !0,
      configurable: !0,
      writable: !0
    }) : e[t] = n, e;
  }

  function d() {
    return (d = Object.assign || function (e) {
      for (var t = 1; t < arguments.length; t++) {
        var n = arguments[t];

        for (var r in n) {
          Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
        }
      }

      return e;
    }).apply(this, arguments);
  }

  function i(t, e) {
    var n = Object.keys(t);

    if (Object.getOwnPropertySymbols) {
      var r = Object.getOwnPropertySymbols(t);
      e && (r = r.filter(function (e) {
        return Object.getOwnPropertyDescriptor(t, e).enumerable;
      })), n.push.apply(n, r);
    }

    return n;
  }

  function D(t) {
    for (var e = 1; e < arguments.length; e++) {
      var n = null != arguments[e] ? arguments[e] : {};
      e % 2 ? i(Object(n), !0).forEach(function (e) {
        M(t, e, n[e]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : i(Object(n)).forEach(function (e) {
        Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(n, e));
      });
    }

    return t;
  }

  function j(e, t) {
    if ("function" != typeof t && null !== t) throw new TypeError("Super expression must either be null or a function");
    e.prototype = Object.create(t && t.prototype, {
      constructor: {
        value: e,
        writable: !0,
        configurable: !0
      }
    }), t && n(e, t);
  }

  function a(e) {
    return (a = Object.setPrototypeOf ? Object.getPrototypeOf : function (e) {
      return e.__proto__ || Object.getPrototypeOf(e);
    })(e);
  }

  function n(e, t) {
    return (n = Object.setPrototypeOf || function (e, t) {
      return e.__proto__ = t, e;
    })(e, t);
  }

  function O(e, t) {
    if (null == e) return {};

    var n,
        r,
        i = function (e, t) {
      if (null == e) return {};
      var n,
          r,
          i = {},
          a = Object.keys(e);

      for (r = 0; r < a.length; r++) {
        n = a[r], 0 <= t.indexOf(n) || (i[n] = e[n]);
      }

      return i;
    }(e, t);

    if (Object.getOwnPropertySymbols) {
      var a = Object.getOwnPropertySymbols(e);

      for (r = 0; r < a.length; r++) {
        n = a[r], 0 <= t.indexOf(n) || Object.prototype.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
      }
    }

    return i;
  }

  function A(e) {
    if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e;
  }

  function H(r) {
    var i = function () {
      if ("undefined" == typeof Reflect || !Reflect.construct) return !1;
      if (Reflect.construct.sham) return !1;
      if ("function" == typeof Proxy) return !0;

      try {
        return Date.prototype.toString.call(Reflect.construct(Date, [], function () {})), !0;
      } catch (e) {
        return !1;
      }
    }();

    return function () {
      var e,
          t = a(r);

      if (i) {
        var n = a(this).constructor;
        e = Reflect.construct(t, arguments, n);
      } else e = t.apply(this, arguments);

      return function (e, t) {
        return !t || "object" != _typeof(t) && "function" != typeof t ? A(e) : t;
      }(this, e);
    };
  }

  function W(e, t) {
    return function (e) {
      if (Array.isArray(e)) return e;
    }(e) || function (e, t) {
      if ("undefined" == typeof Symbol || !(Symbol.iterator in Object(e))) return;
      var n = [],
          r = !0,
          i = !1,
          a = void 0;

      try {
        for (var s, o = e[Symbol.iterator](); !(r = (s = o.next()).done) && (n.push(s.value), !t || n.length !== t); r = !0) {
          ;
        }
      } catch (e) {
        i = !0, a = e;
      } finally {
        try {
          r || null == o.return || o.return();
        } finally {
          if (i) throw a;
        }
      }

      return n;
    }(e, t) || s(e, t) || function () {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }();
  }

  function P(e) {
    return function (e) {
      if (Array.isArray(e)) return o(e);
    }(e) || function (e) {
      if ("undefined" != typeof Symbol && Symbol.iterator in Object(e)) return Array.from(e);
    }(e) || s(e) || function () {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }();
  }

  function s(e, t) {
    if (e) {
      if ("string" == typeof e) return o(e, t);
      var n = Object.prototype.toString.call(e).slice(8, -1);
      return "Object" === n && e.constructor && (n = e.constructor.name), "Map" === n || "Set" === n ? Array.from(e) : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? o(e, t) : void 0;
    }
  }

  function o(e, t) {
    (null == t || t > e.length) && (t = e.length);

    for (var n = 0, r = new Array(t); n < t; n++) {
      r[n] = e[n];
    }

    return r;
  }

  function c(e) {
    return "function" == typeof e || Array.isArray(e) || "[object Object]" === Object.prototype.toString.call(e);
  }

  function u(e, t) {
    if (e === t) return e;

    for (var n in t) {
      if (Object.prototype.hasOwnProperty.call(t, n)) {
        var r = t[n],
            i = e[n];
        void 0 !== i && void 0 === r || (c(i) && c(r) ? e[n] = u(i, r) : e[n] = "object" == _typeof(a = r) && null !== a ? u(Array.isArray(a) ? [] : {}, a) : a);
      }
    }

    var a;
    return e;
  }

  function m() {
    return Array.prototype.slice.call(arguments).reduceRight(function (t, n) {
      return Object.keys(Object(n)).forEach(function (e) {
        void 0 !== n[e] && (void 0 !== t[e] && delete t[e], t[e] = n[e]);
      }), t;
    }, {});
  }

  var p = function p(e) {
    c(e) || (e = {});

    for (var t = 1, n = arguments.length; t < n; t++) {
      var r = arguments[t];
      c(r) && u(e, r);
    }

    return e;
  };

  var l = function l(n, r) {
    return n.filter(function (e, t) {
      return -1 < r.indexOf(e) && n.indexOf(e) === t;
    });
  },
      g = function g(e, t) {
    if (Array.isArray(e)) for (var n = 0; n < e.length; n++) {
      if (t(e[n])) return e[n];
    }
  };

  var f = function e(t) {
    if ("number" == typeof t) return t;
    if ("string" == typeof t) return parseFloat(t);
    if (Array.isArray(t)) return t.map(e);
    throw new Error("The value should be a number, a parsable string or an array of those.");
  };

  var v = function v(e, t) {
    if (null === e) return {};
    var n,
        r,
        i = {},
        a = Object.keys(e);

    for (r = 0; r < a.length; r++) {
      n = a[r], 0 <= t.indexOf(n) || (i[n] = e[n]);
    }

    return i;
  };

  var y = function y(e) {
    return e && 0 < Object.keys(e).length;
  },
      t = function t(e) {
    return null !== e && /^[a-zA-Z0-9_-]{1,64}$/.test(e);
  },
      b = {
    addRefinement: function addRefinement(e, t, n) {
      if (b.isRefined(e, t, n)) return e;
      var r = "" + n,
          i = e[t] ? e[t].concat(r) : [r],
          a = {};
      return a[t] = i, m({}, a, e);
    },
    removeRefinement: function removeRefinement(e, n, t) {
      if (void 0 === t) return b.clearRefinement(e, function (e, t) {
        return n === t;
      });
      var r = "" + t;
      return b.clearRefinement(e, function (e, t) {
        return n === t && r === e;
      });
    },
    toggleRefinement: function toggleRefinement(e, t, n) {
      if (void 0 === n) throw new Error("toggleRefinement should be used with a value");
      return b.isRefined(e, t, n) ? b.removeRefinement(e, t, n) : b.addRefinement(e, t, n);
    },
    clearRefinement: function clearRefinement(i, a, s) {
      if (void 0 === a) return y(i) ? {} : i;
      if ("string" == typeof a) return v(i, [a]);

      if ("function" == typeof a) {
        var o = !1,
            e = Object.keys(i).reduce(function (e, t) {
          var n = i[t] || [],
              r = n.filter(function (e) {
            return !a(e, t, s);
          });
          return r.length !== n.length && (o = !0), e[t] = r, e;
        }, {});
        return o ? e : i;
      }
    },
    isRefined: function isRefined(e, t, n) {
      var r = !!e[t] && 0 < e[t].length;
      if (void 0 === n || !r) return r;
      var i = "" + n;
      return -1 !== e[t].indexOf(i);
    }
  },
      R = b;

  function S(e, n) {
    return Array.isArray(e) && Array.isArray(n) ? e.length === n.length && e.every(function (e, t) {
      return S(n[t], e);
    }) : e === n;
  }

  function w(e) {
    var r = e ? w._parseNumbers(e) : {};
    void 0 === r.userToken || t(r.userToken) || console.warn("[algoliasearch-helper] The `userToken` parameter is invalid. This can lead to wrong analytics.\n  - Format: [a-zA-Z0-9_-]{1,64}"), this.facets = r.facets || [], this.disjunctiveFacets = r.disjunctiveFacets || [], this.hierarchicalFacets = r.hierarchicalFacets || [], this.facetsRefinements = r.facetsRefinements || {}, this.facetsExcludes = r.facetsExcludes || {}, this.disjunctiveFacetsRefinements = r.disjunctiveFacetsRefinements || {}, this.numericRefinements = r.numericRefinements || {}, this.tagRefinements = r.tagRefinements || [], this.hierarchicalFacetsRefinements = r.hierarchicalFacetsRefinements || {};
    var i = this;
    Object.keys(r).forEach(function (e) {
      var t = -1 !== w.PARAMETERS.indexOf(e),
          n = void 0 !== r[e];
      !t && n && (i[e] = r[e]);
    });
  }

  w.PARAMETERS = Object.keys(new w()), w._parseNumbers = function (i) {
    if (i instanceof w) return i;
    var r = {};

    if (["aroundPrecision", "aroundRadius", "getRankingInfo", "minWordSizefor2Typos", "minWordSizefor1Typo", "page", "maxValuesPerFacet", "distinct", "minimumAroundRadius", "hitsPerPage", "minProximity"].forEach(function (e) {
      var t = i[e];

      if ("string" == typeof t) {
        var n = parseFloat(t);
        r[e] = isNaN(n) ? t : n;
      }
    }), Array.isArray(i.insideBoundingBox) && (r.insideBoundingBox = i.insideBoundingBox.map(function (e) {
      return Array.isArray(e) ? e.map(function (e) {
        return parseFloat(e);
      }) : e;
    })), i.numericRefinements) {
      var a = {};
      Object.keys(i.numericRefinements).forEach(function (n) {
        var r = i.numericRefinements[n] || {};
        a[n] = {}, Object.keys(r).forEach(function (e) {
          var t = r[e].map(function (e) {
            return Array.isArray(e) ? e.map(function (e) {
              return "string" == typeof e ? parseFloat(e) : e;
            }) : "string" == typeof e ? parseFloat(e) : e;
          });
          a[n][e] = t;
        });
      }), r.numericRefinements = a;
    }

    return p({}, i, r);
  }, w.make = function (e) {
    var n = new w(e);
    return (e.hierarchicalFacets || []).forEach(function (e) {
      if (e.rootPath) {
        var t = n.getHierarchicalRefinement(e.name);
        0 < t.length && 0 !== t[0].indexOf(e.rootPath) && (n = n.clearRefinements(e.name)), 0 === (t = n.getHierarchicalRefinement(e.name)).length && (n = n.toggleHierarchicalFacetRefinement(e.name, e.rootPath));
      }
    }), n;
  }, w.validate = function (e, t) {
    var n = t || {};
    return e.tagFilters && n.tagRefinements && 0 < n.tagRefinements.length ? new Error("[Tags] Cannot switch from the managed tag API to the advanced API. It is probably an error, if it is really what you want, you should first clear the tags with clearTags method.") : 0 < e.tagRefinements.length && n.tagFilters ? new Error("[Tags] Cannot switch from the advanced tag API to the managed API. It is probably an error, if it is not, you should first clear the tags with clearTags method.") : e.numericFilters && n.numericRefinements && y(n.numericRefinements) ? new Error("[Numeric filters] Can't switch from the advanced to the managed API. It is probably an error, if this is really what you want, you have to first clear the numeric filters.") : y(e.numericRefinements) && n.numericFilters ? new Error("[Numeric filters] Can't switch from the managed API to the advanced. It is probably an error, if this is really what you want, you have to first clear the numeric filters.") : null;
  }, w.prototype = {
    constructor: w,
    clearRefinements: function clearRefinements(e) {
      var t = {
        numericRefinements: this._clearNumericRefinements(e),
        facetsRefinements: R.clearRefinement(this.facetsRefinements, e, "conjunctiveFacet"),
        facetsExcludes: R.clearRefinement(this.facetsExcludes, e, "exclude"),
        disjunctiveFacetsRefinements: R.clearRefinement(this.disjunctiveFacetsRefinements, e, "disjunctiveFacet"),
        hierarchicalFacetsRefinements: R.clearRefinement(this.hierarchicalFacetsRefinements, e, "hierarchicalFacet")
      };
      return t.numericRefinements === this.numericRefinements && t.facetsRefinements === this.facetsRefinements && t.facetsExcludes === this.facetsExcludes && t.disjunctiveFacetsRefinements === this.disjunctiveFacetsRefinements && t.hierarchicalFacetsRefinements === this.hierarchicalFacetsRefinements ? this : this.setQueryParameters(t);
    },
    clearTags: function clearTags() {
      return void 0 === this.tagFilters && 0 === this.tagRefinements.length ? this : this.setQueryParameters({
        tagFilters: void 0,
        tagRefinements: []
      });
    },
    setIndex: function setIndex(e) {
      return e === this.index ? this : this.setQueryParameters({
        index: e
      });
    },
    setQuery: function setQuery(e) {
      return e === this.query ? this : this.setQueryParameters({
        query: e
      });
    },
    setPage: function setPage(e) {
      return e === this.page ? this : this.setQueryParameters({
        page: e
      });
    },
    setFacets: function setFacets(e) {
      return this.setQueryParameters({
        facets: e
      });
    },
    setDisjunctiveFacets: function setDisjunctiveFacets(e) {
      return this.setQueryParameters({
        disjunctiveFacets: e
      });
    },
    setHitsPerPage: function setHitsPerPage(e) {
      return this.hitsPerPage === e ? this : this.setQueryParameters({
        hitsPerPage: e
      });
    },
    setTypoTolerance: function setTypoTolerance(e) {
      return this.typoTolerance === e ? this : this.setQueryParameters({
        typoTolerance: e
      });
    },
    addNumericRefinement: function addNumericRefinement(e, t, n) {
      var r = f(n);
      if (this.isNumericRefined(e, t, r)) return this;
      var i = p({}, this.numericRefinements);
      return i[e] = p({}, i[e]), i[e][t] ? (i[e][t] = i[e][t].slice(), i[e][t].push(r)) : i[e][t] = [r], this.setQueryParameters({
        numericRefinements: i
      });
    },
    getConjunctiveRefinements: function getConjunctiveRefinements(e) {
      return this.isConjunctiveFacet(e) && this.facetsRefinements[e] || [];
    },
    getDisjunctiveRefinements: function getDisjunctiveRefinements(e) {
      return this.isDisjunctiveFacet(e) && this.disjunctiveFacetsRefinements[e] || [];
    },
    getHierarchicalRefinement: function getHierarchicalRefinement(e) {
      return this.hierarchicalFacetsRefinements[e] || [];
    },
    getExcludeRefinements: function getExcludeRefinements(e) {
      return this.isConjunctiveFacet(e) && this.facetsExcludes[e] || [];
    },
    removeNumericRefinement: function removeNumericRefinement(n, r, i) {
      return void 0 !== i ? this.isNumericRefined(n, r, i) ? this.setQueryParameters({
        numericRefinements: this._clearNumericRefinements(function (e, t) {
          return t === n && e.op === r && S(e.val, f(i));
        })
      }) : this : void 0 !== r ? this.isNumericRefined(n, r) ? this.setQueryParameters({
        numericRefinements: this._clearNumericRefinements(function (e, t) {
          return t === n && e.op === r;
        })
      }) : this : this.isNumericRefined(n) ? this.setQueryParameters({
        numericRefinements: this._clearNumericRefinements(function (e, t) {
          return t === n;
        })
      }) : this;
    },
    getNumericRefinements: function getNumericRefinements(e) {
      return this.numericRefinements[e] || {};
    },
    getNumericRefinement: function getNumericRefinement(e, t) {
      return this.numericRefinements[e] && this.numericRefinements[e][t];
    },
    _clearNumericRefinements: function _clearNumericRefinements(s) {
      if (void 0 === s) return y(this.numericRefinements) ? {} : this.numericRefinements;
      if ("string" == typeof s) return v(this.numericRefinements, [s]);

      if ("function" == typeof s) {
        var o = !1,
            t = this.numericRefinements,
            e = Object.keys(t).reduce(function (e, r) {
          var i = t[r],
              a = {};
          return i = i || {}, Object.keys(i).forEach(function (t) {
            var e = i[t] || [],
                n = [];
            e.forEach(function (e) {
              s({
                val: e,
                op: t
              }, r, "numeric") || n.push(e);
            }), n.length !== e.length && (o = !0), a[t] = n;
          }), e[r] = a, e;
        }, {});
        return o ? e : this.numericRefinements;
      }
    },
    addFacet: function addFacet(e) {
      return this.isConjunctiveFacet(e) ? this : this.setQueryParameters({
        facets: this.facets.concat([e])
      });
    },
    addDisjunctiveFacet: function addDisjunctiveFacet(e) {
      return this.isDisjunctiveFacet(e) ? this : this.setQueryParameters({
        disjunctiveFacets: this.disjunctiveFacets.concat([e])
      });
    },
    addHierarchicalFacet: function addHierarchicalFacet(e) {
      if (this.isHierarchicalFacet(e.name)) throw new Error("Cannot declare two hierarchical facets with the same name: `" + e.name + "`");
      return this.setQueryParameters({
        hierarchicalFacets: this.hierarchicalFacets.concat([e])
      });
    },
    addFacetRefinement: function addFacetRefinement(e, t) {
      if (!this.isConjunctiveFacet(e)) throw new Error(e + " is not defined in the facets attribute of the helper configuration");
      return R.isRefined(this.facetsRefinements, e, t) ? this : this.setQueryParameters({
        facetsRefinements: R.addRefinement(this.facetsRefinements, e, t)
      });
    },
    addExcludeRefinement: function addExcludeRefinement(e, t) {
      if (!this.isConjunctiveFacet(e)) throw new Error(e + " is not defined in the facets attribute of the helper configuration");
      return R.isRefined(this.facetsExcludes, e, t) ? this : this.setQueryParameters({
        facetsExcludes: R.addRefinement(this.facetsExcludes, e, t)
      });
    },
    addDisjunctiveFacetRefinement: function addDisjunctiveFacetRefinement(e, t) {
      if (!this.isDisjunctiveFacet(e)) throw new Error(e + " is not defined in the disjunctiveFacets attribute of the helper configuration");
      return R.isRefined(this.disjunctiveFacetsRefinements, e, t) ? this : this.setQueryParameters({
        disjunctiveFacetsRefinements: R.addRefinement(this.disjunctiveFacetsRefinements, e, t)
      });
    },
    addTagRefinement: function addTagRefinement(e) {
      if (this.isTagRefined(e)) return this;
      var t = {
        tagRefinements: this.tagRefinements.concat(e)
      };
      return this.setQueryParameters(t);
    },
    removeFacet: function removeFacet(t) {
      return this.isConjunctiveFacet(t) ? this.clearRefinements(t).setQueryParameters({
        facets: this.facets.filter(function (e) {
          return e !== t;
        })
      }) : this;
    },
    removeDisjunctiveFacet: function removeDisjunctiveFacet(t) {
      return this.isDisjunctiveFacet(t) ? this.clearRefinements(t).setQueryParameters({
        disjunctiveFacets: this.disjunctiveFacets.filter(function (e) {
          return e !== t;
        })
      }) : this;
    },
    removeHierarchicalFacet: function removeHierarchicalFacet(t) {
      return this.isHierarchicalFacet(t) ? this.clearRefinements(t).setQueryParameters({
        hierarchicalFacets: this.hierarchicalFacets.filter(function (e) {
          return e.name !== t;
        })
      }) : this;
    },
    removeFacetRefinement: function removeFacetRefinement(e, t) {
      if (!this.isConjunctiveFacet(e)) throw new Error(e + " is not defined in the facets attribute of the helper configuration");
      return R.isRefined(this.facetsRefinements, e, t) ? this.setQueryParameters({
        facetsRefinements: R.removeRefinement(this.facetsRefinements, e, t)
      }) : this;
    },
    removeExcludeRefinement: function removeExcludeRefinement(e, t) {
      if (!this.isConjunctiveFacet(e)) throw new Error(e + " is not defined in the facets attribute of the helper configuration");
      return R.isRefined(this.facetsExcludes, e, t) ? this.setQueryParameters({
        facetsExcludes: R.removeRefinement(this.facetsExcludes, e, t)
      }) : this;
    },
    removeDisjunctiveFacetRefinement: function removeDisjunctiveFacetRefinement(e, t) {
      if (!this.isDisjunctiveFacet(e)) throw new Error(e + " is not defined in the disjunctiveFacets attribute of the helper configuration");
      return R.isRefined(this.disjunctiveFacetsRefinements, e, t) ? this.setQueryParameters({
        disjunctiveFacetsRefinements: R.removeRefinement(this.disjunctiveFacetsRefinements, e, t)
      }) : this;
    },
    removeTagRefinement: function removeTagRefinement(t) {
      if (!this.isTagRefined(t)) return this;
      var e = {
        tagRefinements: this.tagRefinements.filter(function (e) {
          return e !== t;
        })
      };
      return this.setQueryParameters(e);
    },
    toggleRefinement: function toggleRefinement(e, t) {
      return this.toggleFacetRefinement(e, t);
    },
    toggleFacetRefinement: function toggleFacetRefinement(e, t) {
      if (this.isHierarchicalFacet(e)) return this.toggleHierarchicalFacetRefinement(e, t);
      if (this.isConjunctiveFacet(e)) return this.toggleConjunctiveFacetRefinement(e, t);
      if (this.isDisjunctiveFacet(e)) return this.toggleDisjunctiveFacetRefinement(e, t);
      throw new Error("Cannot refine the undeclared facet " + e + "; it should be added to the helper options facets, disjunctiveFacets or hierarchicalFacets");
    },
    toggleConjunctiveFacetRefinement: function toggleConjunctiveFacetRefinement(e, t) {
      if (!this.isConjunctiveFacet(e)) throw new Error(e + " is not defined in the facets attribute of the helper configuration");
      return this.setQueryParameters({
        facetsRefinements: R.toggleRefinement(this.facetsRefinements, e, t)
      });
    },
    toggleExcludeFacetRefinement: function toggleExcludeFacetRefinement(e, t) {
      if (!this.isConjunctiveFacet(e)) throw new Error(e + " is not defined in the facets attribute of the helper configuration");
      return this.setQueryParameters({
        facetsExcludes: R.toggleRefinement(this.facetsExcludes, e, t)
      });
    },
    toggleDisjunctiveFacetRefinement: function toggleDisjunctiveFacetRefinement(e, t) {
      if (!this.isDisjunctiveFacet(e)) throw new Error(e + " is not defined in the disjunctiveFacets attribute of the helper configuration");
      return this.setQueryParameters({
        disjunctiveFacetsRefinements: R.toggleRefinement(this.disjunctiveFacetsRefinements, e, t)
      });
    },
    toggleHierarchicalFacetRefinement: function toggleHierarchicalFacetRefinement(e, t) {
      if (!this.isHierarchicalFacet(e)) throw new Error(e + " is not defined in the hierarchicalFacets attribute of the helper configuration");

      var n = this._getHierarchicalFacetSeparator(this.getHierarchicalFacetByName(e)),
          r = {};

      return void 0 !== this.hierarchicalFacetsRefinements[e] && 0 < this.hierarchicalFacetsRefinements[e].length && (this.hierarchicalFacetsRefinements[e][0] === t || 0 === this.hierarchicalFacetsRefinements[e][0].indexOf(t + n)) ? -1 === t.indexOf(n) ? r[e] = [] : r[e] = [t.slice(0, t.lastIndexOf(n))] : r[e] = [t], this.setQueryParameters({
        hierarchicalFacetsRefinements: m({}, r, this.hierarchicalFacetsRefinements)
      });
    },
    addHierarchicalFacetRefinement: function addHierarchicalFacetRefinement(e, t) {
      if (this.isHierarchicalFacetRefined(e)) throw new Error(e + " is already refined.");
      if (!this.isHierarchicalFacet(e)) throw new Error(e + " is not defined in the hierarchicalFacets attribute of the helper configuration.");
      var n = {};
      return n[e] = [t], this.setQueryParameters({
        hierarchicalFacetsRefinements: m({}, n, this.hierarchicalFacetsRefinements)
      });
    },
    removeHierarchicalFacetRefinement: function removeHierarchicalFacetRefinement(e) {
      if (!this.isHierarchicalFacetRefined(e)) return this;
      var t = {};
      return t[e] = [], this.setQueryParameters({
        hierarchicalFacetsRefinements: m({}, t, this.hierarchicalFacetsRefinements)
      });
    },
    toggleTagRefinement: function toggleTagRefinement(e) {
      return this.isTagRefined(e) ? this.removeTagRefinement(e) : this.addTagRefinement(e);
    },
    isDisjunctiveFacet: function isDisjunctiveFacet(e) {
      return -1 < this.disjunctiveFacets.indexOf(e);
    },
    isHierarchicalFacet: function isHierarchicalFacet(e) {
      return void 0 !== this.getHierarchicalFacetByName(e);
    },
    isConjunctiveFacet: function isConjunctiveFacet(e) {
      return -1 < this.facets.indexOf(e);
    },
    isFacetRefined: function isFacetRefined(e, t) {
      return !!this.isConjunctiveFacet(e) && R.isRefined(this.facetsRefinements, e, t);
    },
    isExcludeRefined: function isExcludeRefined(e, t) {
      return !!this.isConjunctiveFacet(e) && R.isRefined(this.facetsExcludes, e, t);
    },
    isDisjunctiveFacetRefined: function isDisjunctiveFacetRefined(e, t) {
      return !!this.isDisjunctiveFacet(e) && R.isRefined(this.disjunctiveFacetsRefinements, e, t);
    },
    isHierarchicalFacetRefined: function isHierarchicalFacetRefined(e, t) {
      if (!this.isHierarchicalFacet(e)) return !1;
      var n = this.getHierarchicalRefinement(e);
      return t ? -1 !== n.indexOf(t) : 0 < n.length;
    },
    isNumericRefined: function isNumericRefined(e, t, n) {
      if (void 0 === n && void 0 === t) return !!this.numericRefinements[e];
      var r = this.numericRefinements[e] && void 0 !== this.numericRefinements[e][t];
      if (void 0 === n || !r) return r;

      var i = f(n),
          a = void 0 !== function (e, t) {
        return g(e, function (e) {
          return S(e, t);
        });
      }(this.numericRefinements[e][t], i);

      return r && a;
    },
    isTagRefined: function isTagRefined(e) {
      return -1 !== this.tagRefinements.indexOf(e);
    },
    getRefinedDisjunctiveFacets: function getRefinedDisjunctiveFacets() {
      var t = this,
          e = l(Object.keys(this.numericRefinements).filter(function (e) {
        return 0 < Object.keys(t.numericRefinements[e]).length;
      }), this.disjunctiveFacets);
      return Object.keys(this.disjunctiveFacetsRefinements).filter(function (e) {
        return 0 < t.disjunctiveFacetsRefinements[e].length;
      }).concat(e).concat(this.getRefinedHierarchicalFacets());
    },
    getRefinedHierarchicalFacets: function getRefinedHierarchicalFacets() {
      var t = this;
      return l(this.hierarchicalFacets.map(function (e) {
        return e.name;
      }), Object.keys(this.hierarchicalFacetsRefinements).filter(function (e) {
        return 0 < t.hierarchicalFacetsRefinements[e].length;
      }));
    },
    getUnrefinedDisjunctiveFacets: function getUnrefinedDisjunctiveFacets() {
      var t = this.getRefinedDisjunctiveFacets();
      return this.disjunctiveFacets.filter(function (e) {
        return -1 === t.indexOf(e);
      });
    },
    managedParameters: ["index", "facets", "disjunctiveFacets", "facetsRefinements", "facetsExcludes", "disjunctiveFacetsRefinements", "numericRefinements", "tagRefinements", "hierarchicalFacets", "hierarchicalFacetsRefinements"],
    getQueryParams: function getQueryParams() {
      var n = this.managedParameters,
          r = {},
          i = this;
      return Object.keys(this).forEach(function (e) {
        var t = i[e];
        -1 === n.indexOf(e) && void 0 !== t && (r[e] = t);
      }), r;
    },
    setQueryParameter: function setQueryParameter(e, t) {
      if (this[e] === t) return this;
      var n = {};
      return n[e] = t, this.setQueryParameters(n);
    },
    setQueryParameters: function setQueryParameters(e) {
      if (!e) return this;
      var t = w.validate(this, e);
      if (t) throw t;

      var n = this,
          i = w._parseNumbers(e),
          r = Object.keys(this).reduce(function (e, t) {
        return e[t] = n[t], e;
      }, {}),
          a = Object.keys(i).reduce(function (e, t) {
        var n = void 0 !== e[t],
            r = void 0 !== i[t];
        return n && !r ? v(e, [t]) : (r && (e[t] = i[t]), e);
      }, r);

      return new this.constructor(a);
    },
    resetPage: function resetPage() {
      return void 0 === this.page ? this : this.setPage(0);
    },
    _getHierarchicalFacetSortBy: function _getHierarchicalFacetSortBy(e) {
      return e.sortBy || ["isRefined:desc", "name:asc"];
    },
    _getHierarchicalFacetSeparator: function _getHierarchicalFacetSeparator(e) {
      return e.separator || " > ";
    },
    _getHierarchicalRootPath: function _getHierarchicalRootPath(e) {
      return e.rootPath || null;
    },
    _getHierarchicalShowParentLevel: function _getHierarchicalShowParentLevel(e) {
      return "boolean" != typeof e.showParentLevel || e.showParentLevel;
    },
    getHierarchicalFacetByName: function getHierarchicalFacetByName(t) {
      return g(this.hierarchicalFacets, function (e) {
        return e.name === t;
      });
    },
    getHierarchicalFacetBreadcrumb: function getHierarchicalFacetBreadcrumb(e) {
      if (!this.isHierarchicalFacet(e)) return [];
      var t = this.getHierarchicalRefinement(e)[0];
      if (!t) return [];

      var n = this._getHierarchicalFacetSeparator(this.getHierarchicalFacetByName(e));

      return t.split(n).map(function (e) {
        return e.trim();
      });
    },
    toString: function toString() {
      return JSON.stringify(this, null, 2);
    }
  };
  var x = w;

  function N(e, t) {
    if (e !== t) {
      var n = void 0 !== e,
          r = null === e,
          i = void 0 !== t,
          a = null === t;
      if (!a && t < e || r && i || !n) return 1;
      if (!r && e < t || a && n || !i) return -1;
    }

    return 0;
  }

  function _(e) {
    return Array.isArray(e) ? e.filter(Boolean) : [];
  }

  function I(e, t) {
    if (!Array.isArray(e)) return -1;

    for (var n = 0; n < e.length; n++) {
      if (t(e[n])) return n;
    }

    return -1;
  }

  function F(e, t) {
    var i = (t || []).map(function (e) {
      return e.split(":");
    });
    return e.reduce(function (e, t) {
      var n = t.split(":"),
          r = g(i, function (e) {
        return e[0] === n[0];
      });
      return 1 < n.length || !r ? (e[0].push(n[0]), e[1].push(n[1])) : (e[0].push(r[0]), e[1].push(r[1])), e;
    }, [[], []]);
  }

  var C = function C(e, n, i) {
    if (!Array.isArray(e)) return [];
    Array.isArray(i) || (i = []);
    var t = e.map(function (t, e) {
      return {
        criteria: n.map(function (e) {
          return t[e];
        }),
        index: e,
        value: t
      };
    });
    return t.sort(function (e, t) {
      for (var n = -1; ++n < e.criteria.length;) {
        var r = N(e.criteria[n], t.criteria[n]);
        if (r) return n >= i.length ? r : "desc" === i[n] ? -r : r;
      }

      return e.index - t.index;
    }), t.map(function (e) {
      return e.value;
    });
  },
      T = function T(h) {
    return function (e, t) {
      var n = h.hierarchicalFacets[t],
          r = h.hierarchicalFacetsRefinements[n.name] && h.hierarchicalFacetsRefinements[n.name][0] || "",
          i = h._getHierarchicalFacetSeparator(n),
          a = h._getHierarchicalRootPath(n),
          s = h._getHierarchicalShowParentLevel(n),
          o = F(h._getHierarchicalFacetSortBy(n)),
          c = e.every(function (e) {
        return e.exhaustive;
      }),
          u = function (o, c, u, l, h) {
        return function (e, n, t) {
          var r = e;

          if (0 < t) {
            var i = 0;

            for (r = e; i < t;) {
              var a = r && Array.isArray(r.data) ? r.data : [];
              r = g(a, function (e) {
                return e.isRefined;
              }), i++;
            }
          }

          if (r) {
            var s = Object.keys(n.data).map(function (e) {
              return [e, n.data[e]];
            }).filter(function (e) {
              return function (e, t, n, r, i, a) {
                return (!i || 0 === e.indexOf(i) && i !== e) && (!i && -1 === e.indexOf(r) || i && e.split(r).length - i.split(r).length == 1 || -1 === e.indexOf(r) && -1 === n.indexOf(r) || 0 === n.indexOf(e) || 0 === e.indexOf(t + r) && (a || 0 === e.indexOf(n)));
              }(e[0], r.path || u, h, c, u, l);
            });
            r.data = C(s.map(function (e) {
              var t = e[0];
              return function (e, t, n, r, i) {
                var a = t.split(n);
                return {
                  name: a[a.length - 1].trim(),
                  path: t,
                  count: e,
                  isRefined: r === t || 0 === r.indexOf(t + n),
                  exhaustive: i,
                  data: null
                };
              }(e[1], t, c, h, n.exhaustive);
            }), o[0], o[1]);
          }

          return e;
        };
      }(o, i, a, s, r),
          l = e;

      return a && (l = e.slice(a.split(i).length)), l.reduce(u, {
        name: h.hierarchicalFacets[t].name,
        count: null,
        isRefined: !0,
        path: null,
        exhaustive: c,
        data: null
      });
    };
  };

  function E(e) {
    var n = {};
    return e.forEach(function (e, t) {
      n[e] = t;
    }), n;
  }

  function B(e, t, n) {
    t && t[n] && (e.stats = t[n]);
  }

  function U(l, n) {
    var c = n[0];
    this._rawResults = n;
    var h = this;
    Object.keys(c).forEach(function (e) {
      h[e] = c[e];
    }), this.processingTimeMS = n.reduce(function (e, t) {
      return void 0 === t.processingTimeMS ? e : e + t.processingTimeMS;
    }, 0), this.disjunctiveFacets = [], this.hierarchicalFacets = l.hierarchicalFacets.map(function () {
      return [];
    }), this.facets = [];
    var e = l.getRefinedDisjunctiveFacets(),
        u = E(l.facets),
        d = E(l.disjunctiveFacets),
        r = 1,
        f = c.facets || {};
    Object.keys(f).forEach(function (e) {
      var t = f[e],
          n = function (e, t) {
        return g(e, function (e) {
          return -1 < (e.attributes || []).indexOf(t);
        });
      }(l.hierarchicalFacets, e);

      if (n) {
        var r = n.attributes.indexOf(e),
            i = I(l.hierarchicalFacets, function (e) {
          return e.name === n.name;
        });
        h.hierarchicalFacets[i][r] = {
          attribute: e,
          data: t,
          exhaustive: c.exhaustiveFacetsCount
        };
      } else {
        var a,
            s = -1 !== l.disjunctiveFacets.indexOf(e),
            o = -1 !== l.facets.indexOf(e);
        s && (a = d[e], h.disjunctiveFacets[a] = {
          name: e,
          data: t,
          exhaustive: c.exhaustiveFacetsCount
        }, B(h.disjunctiveFacets[a], c.facets_stats, e)), o && (a = u[e], h.facets[a] = {
          name: e,
          data: t,
          exhaustive: c.exhaustiveFacetsCount
        }, B(h.facets[a], c.facets_stats, e));
      }
    }), this.hierarchicalFacets = _(this.hierarchicalFacets), e.forEach(function (e) {
      var a = n[r],
          s = a && a.facets ? a.facets : {},
          o = l.getHierarchicalFacetByName(e);
      Object.keys(s).forEach(function (t) {
        var n,
            e = s[t];

        if (o) {
          n = I(l.hierarchicalFacets, function (e) {
            return e.name === o.name;
          });
          var r = I(h.hierarchicalFacets[n], function (e) {
            return e.attribute === t;
          });
          if (-1 === r) return;
          h.hierarchicalFacets[n][r].data = p({}, h.hierarchicalFacets[n][r].data, e);
        } else {
          n = d[t];
          var i = c.facets && c.facets[t] || {};
          h.disjunctiveFacets[n] = {
            name: t,
            data: m({}, e, i),
            exhaustive: a.exhaustiveFacetsCount
          }, B(h.disjunctiveFacets[n], a.facets_stats, t), l.disjunctiveFacetsRefinements[t] && l.disjunctiveFacetsRefinements[t].forEach(function (e) {
            !h.disjunctiveFacets[n].data[e] && -1 < l.disjunctiveFacetsRefinements[t].indexOf(e) && (h.disjunctiveFacets[n].data[e] = 0);
          });
        }
      }), r++;
    }), l.getRefinedHierarchicalFacets().forEach(function (e) {
      var s = l.getHierarchicalFacetByName(e),
          o = l._getHierarchicalFacetSeparator(s),
          c = l.getHierarchicalRefinement(e);

      if (!(0 === c.length || c[0].split(o).length < 2)) {
        var t = n[r],
            u = t && t.facets ? t.facets : {};
        Object.keys(u).forEach(function (t) {
          var e = u[t],
              n = I(l.hierarchicalFacets, function (e) {
            return e.name === s.name;
          }),
              r = I(h.hierarchicalFacets[n], function (e) {
            return e.attribute === t;
          });

          if (-1 !== r) {
            var i = {};

            if (0 < c.length) {
              var a = c[0].split(o)[0];
              i[a] = h.hierarchicalFacets[n][r].data[a];
            }

            h.hierarchicalFacets[n][r].data = m(i, e, h.hierarchicalFacets[n][r].data);
          }
        }), r++;
      }
    }), Object.keys(l.facetsExcludes).forEach(function (t) {
      var e = l.facetsExcludes[t],
          n = u[t];
      h.facets[n] = {
        name: t,
        data: c.facets[t],
        exhaustive: c.exhaustiveFacetsCount
      }, e.forEach(function (e) {
        h.facets[n] = h.facets[n] || {
          name: t
        }, h.facets[n].data = h.facets[n].data || {}, h.facets[n].data[e] = 0;
      });
    }), this.hierarchicalFacets = this.hierarchicalFacets.map(T(l)), this.facets = _(this.facets), this.disjunctiveFacets = _(this.disjunctiveFacets), this._state = l;
  }

  function Q(t, e) {
    if (!e.data || 0 === e.data.length) return e;
    var n = e.data.map(function (e) {
      return Q(t, e);
    }),
        r = t(n);
    return p({}, e, {
      data: r
    });
  }

  function q(e, t) {
    var n = g(e, function (e) {
      return e.name === t;
    });
    return n && n.stats;
  }

  function $(e, t, n, r, i) {
    var a = g(i, function (e) {
      return e.name === n;
    }),
        s = a && a.data && a.data[r] ? a.data[r] : 0,
        o = a && a.exhaustive || !1;
    return {
      type: t,
      attributeName: n,
      name: r,
      count: s,
      exhaustive: o
    };
  }

  U.prototype.getFacetByName = function (t) {
    function e(e) {
      return e.name === t;
    }

    return g(this.facets, e) || g(this.disjunctiveFacets, e) || g(this.hierarchicalFacets, e);
  }, U.DEFAULT_SORT = ["isRefined:desc", "count:desc", "name:asc"], U.prototype.getFacetValues = function (e, t) {
    var n = function (t, n) {
      function e(e) {
        return e.name === n;
      }

      if (t._state.isConjunctiveFacet(n)) {
        var r = g(t.facets, e);
        return r ? Object.keys(r.data).map(function (e) {
          return {
            name: e,
            count: r.data[e],
            isRefined: t._state.isFacetRefined(n, e),
            isExcluded: t._state.isExcludeRefined(n, e)
          };
        }) : [];
      }

      if (t._state.isDisjunctiveFacet(n)) {
        var i = g(t.disjunctiveFacets, e);
        return i ? Object.keys(i.data).map(function (e) {
          return {
            name: e,
            count: i.data[e],
            isRefined: t._state.isDisjunctiveFacetRefined(n, e)
          };
        }) : [];
      }

      if (t._state.isHierarchicalFacet(n)) return g(t.hierarchicalFacets, e);
    }(this, e);

    if (n) {
      var r = m({}, t, {
        sortBy: U.DEFAULT_SORT
      });

      if (Array.isArray(r.sortBy)) {
        var i = F(r.sortBy, U.DEFAULT_SORT);
        return Array.isArray(n) ? C(n, i[0], i[1]) : Q(function (e) {
          return C(e, i[0], i[1]);
        }, n);
      }

      if ("function" == typeof r.sortBy) return Array.isArray(n) ? n.sort(r.sortBy) : Q(function (e) {
        return function (e, t) {
          return t.sort(e);
        }(r.sortBy, e);
      }, n);
      throw new Error("options.sortBy is optional but if defined it must be either an array of string (predicates) or a sorting function");
    }
  }, U.prototype.getFacetStats = function (e) {
    return this._state.isConjunctiveFacet(e) ? q(this.facets, e) : this._state.isDisjunctiveFacet(e) ? q(this.disjunctiveFacets, e) : void 0;
  }, U.prototype.getRefinements = function () {
    var r = this._state,
        n = this,
        i = [];
    return Object.keys(r.facetsRefinements).forEach(function (t) {
      r.facetsRefinements[t].forEach(function (e) {
        i.push($(r, "facet", t, e, n.facets));
      });
    }), Object.keys(r.facetsExcludes).forEach(function (t) {
      r.facetsExcludes[t].forEach(function (e) {
        i.push($(r, "exclude", t, e, n.facets));
      });
    }), Object.keys(r.disjunctiveFacetsRefinements).forEach(function (t) {
      r.disjunctiveFacetsRefinements[t].forEach(function (e) {
        i.push($(r, "disjunctive", t, e, n.disjunctiveFacets));
      });
    }), Object.keys(r.hierarchicalFacetsRefinements).forEach(function (t) {
      r.hierarchicalFacetsRefinements[t].forEach(function (e) {
        i.push(function (e, t, n, r) {
          var i = e.getHierarchicalFacetByName(t),
              a = e._getHierarchicalFacetSeparator(i),
              s = n.split(a),
              o = g(r, function (e) {
            return e.name === t;
          }),
              c = s.reduce(function (e, t) {
            var n = e && g(e.data, function (e) {
              return e.name === t;
            });
            return void 0 !== n ? n : e;
          }, o),
              u = c && c.count || 0,
              l = c && c.exhaustive || !1,
              h = c && c.path || "";

          return {
            type: "hierarchical",
            attributeName: t,
            name: h,
            count: u,
            exhaustive: l
          };
        }(r, t, e, n.hierarchicalFacets));
      });
    }), Object.keys(r.numericRefinements).forEach(function (n) {
      var e = r.numericRefinements[n];
      Object.keys(e).forEach(function (t) {
        e[t].forEach(function (e) {
          i.push({
            type: "numeric",
            attributeName: n,
            name: e,
            numericValue: e,
            operator: t
          });
        });
      });
    }), r.tagRefinements.forEach(function (e) {
      i.push({
        type: "tag",
        attributeName: "_tags",
        name: e
      });
    }), i;
  };
  var V = U;

  function K() {
    this._events = this._events || {}, this._maxListeners = this._maxListeners || void 0;
  }

  var e = K;

  function z(e) {
    return "function" == typeof e;
  }

  function J(e) {
    return "object" == _typeof(e) && null !== e;
  }

  function Y(e) {
    return void 0 === e;
  }

  (K.EventEmitter = K).prototype._events = void 0, K.prototype._maxListeners = void 0, K.defaultMaxListeners = 10, K.prototype.setMaxListeners = function (e) {
    if (!function (e) {
      return "number" == typeof e;
    }(e) || e < 0 || isNaN(e)) throw TypeError("n must be a positive number");
    return this._maxListeners = e, this;
  }, K.prototype.emit = function (e) {
    var t, n, r, i, a, s;

    if (this._events || (this._events = {}), "error" === e && (!this._events.error || J(this._events.error) && !this._events.error.length)) {
      if ((t = arguments[1]) instanceof Error) throw t;
      var o = new Error('Uncaught, unspecified "error" event. (' + t + ")");
      throw o.context = t, o;
    }

    if (Y(n = this._events[e])) return !1;
    if (z(n)) switch (arguments.length) {
      case 1:
        n.call(this);
        break;

      case 2:
        n.call(this, arguments[1]);
        break;

      case 3:
        n.call(this, arguments[1], arguments[2]);
        break;

      default:
        i = Array.prototype.slice.call(arguments, 1), n.apply(this, i);
    } else if (J(n)) for (i = Array.prototype.slice.call(arguments, 1), r = (s = n.slice()).length, a = 0; a < r; a++) {
      s[a].apply(this, i);
    }
    return !0;
  }, K.prototype.on = K.prototype.addListener = function (e, t) {
    var n;
    if (!z(t)) throw TypeError("listener must be a function");
    return this._events || (this._events = {}), this._events.newListener && this.emit("newListener", e, z(t.listener) ? t.listener : t), this._events[e] ? J(this._events[e]) ? this._events[e].push(t) : this._events[e] = [this._events[e], t] : this._events[e] = t, J(this._events[e]) && !this._events[e].warned && (n = Y(this._maxListeners) ? K.defaultMaxListeners : this._maxListeners) && 0 < n && this._events[e].length > n && (this._events[e].warned = !0, console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[e].length), "function" == typeof console.trace && console.trace()), this;
  }, K.prototype.once = function (e, t) {
    if (!z(t)) throw TypeError("listener must be a function");
    var n = !1;

    function r() {
      this.removeListener(e, r), n || (n = !0, t.apply(this, arguments));
    }

    return r.listener = t, this.on(e, r), this;
  }, K.prototype.removeListener = function (e, t) {
    var n, r, i, a;
    if (!z(t)) throw TypeError("listener must be a function");
    if (!this._events || !this._events[e]) return this;
    if (i = (n = this._events[e]).length, r = -1, n === t || z(n.listener) && n.listener === t) delete this._events[e], this._events.removeListener && this.emit("removeListener", e, t);else if (J(n)) {
      for (a = i; 0 < a--;) {
        if (n[a] === t || n[a].listener && n[a].listener === t) {
          r = a;
          break;
        }
      }

      if (r < 0) return this;
      1 === n.length ? (n.length = 0, delete this._events[e]) : n.splice(r, 1), this._events.removeListener && this.emit("removeListener", e, t);
    }
    return this;
  }, K.prototype.removeAllListeners = function (e) {
    var t, n;
    if (!this._events) return this;
    if (!this._events.removeListener) return 0 === arguments.length ? this._events = {} : this._events[e] && delete this._events[e], this;

    if (0 === arguments.length) {
      for (t in this._events) {
        "removeListener" !== t && this.removeAllListeners(t);
      }

      return this.removeAllListeners("removeListener"), this._events = {}, this;
    }

    if (z(n = this._events[e])) this.removeListener(e, n);else if (n) for (; n.length;) {
      this.removeListener(e, n[n.length - 1]);
    }
    return delete this._events[e], this;
  }, K.prototype.listeners = function (e) {
    return this._events && this._events[e] ? z(this._events[e]) ? [this._events[e]] : this._events[e].slice() : [];
  }, K.prototype.listenerCount = function (e) {
    if (this._events) {
      var t = this._events[e];
      if (z(t)) return 1;
      if (t) return t.length;
    }

    return 0;
  }, K.listenerCount = function (e, t) {
    return e.listenerCount(t);
  };

  var G = function G(e, t) {
    e.prototype = Object.create(t.prototype, {
      constructor: {
        value: e,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    });
  };

  function Z(e, t) {
    this.main = e, this.fn = t, this.lastResults = null;
  }

  G(Z, e.EventEmitter), Z.prototype.detach = function () {
    this.removeAllListeners(), this.main.detachDerivedHelper(this);
  }, Z.prototype.getModifiedState = function (e) {
    return this.fn(e);
  };
  var X = Z,
      ee = {
    _getQueries: function _getQueries(i, a) {
      var s = [];
      return s.push({
        indexName: i,
        params: ee._getHitsSearchParams(a)
      }), a.getRefinedDisjunctiveFacets().forEach(function (e) {
        s.push({
          indexName: i,
          params: ee._getDisjunctiveFacetSearchParams(a, e)
        });
      }), a.getRefinedHierarchicalFacets().forEach(function (e) {
        var t = a.getHierarchicalFacetByName(e),
            n = a.getHierarchicalRefinement(e),
            r = a._getHierarchicalFacetSeparator(t);

        0 < n.length && 1 < n[0].split(r).length && s.push({
          indexName: i,
          params: ee._getDisjunctiveFacetSearchParams(a, e, !0)
        });
      }), s;
    },
    _getHitsSearchParams: function _getHitsSearchParams(e) {
      var t = e.facets.concat(e.disjunctiveFacets).concat(ee._getHitsHierarchicalFacetsAttributes(e)),
          n = ee._getFacetFilters(e),
          r = ee._getNumericFilters(e),
          i = {
        facets: t,
        tagFilters: ee._getTagFilters(e)
      };

      return 0 < n.length && (i.facetFilters = n), 0 < r.length && (i.numericFilters = r), p({}, e.getQueryParams(), i);
    },
    _getDisjunctiveFacetSearchParams: function _getDisjunctiveFacetSearchParams(e, t, n) {
      var r = ee._getFacetFilters(e, t, n),
          i = ee._getNumericFilters(e, t),
          a = {
        hitsPerPage: 1,
        page: 0,
        attributesToRetrieve: [],
        attributesToHighlight: [],
        attributesToSnippet: [],
        tagFilters: ee._getTagFilters(e),
        analytics: !1,
        clickAnalytics: !1
      },
          s = e.getHierarchicalFacetByName(t);

      return a.facets = s ? ee._getDisjunctiveHierarchicalFacetAttribute(e, s, n) : t, 0 < i.length && (a.numericFilters = i), 0 < r.length && (a.facetFilters = r), p({}, e.getQueryParams(), a);
    },
    _getNumericFilters: function _getNumericFilters(e, i) {
      if (e.numericFilters) return e.numericFilters;
      var a = [];
      return Object.keys(e.numericRefinements).forEach(function (r) {
        var t = e.numericRefinements[r] || {};
        Object.keys(t).forEach(function (n) {
          var e = t[n] || [];
          i !== r && e.forEach(function (e) {
            if (Array.isArray(e)) {
              var t = e.map(function (e) {
                return r + n + e;
              });
              a.push(t);
            } else a.push(r + n + e);
          });
        });
      }), a;
    },
    _getTagFilters: function _getTagFilters(e) {
      return e.tagFilters ? e.tagFilters : e.tagRefinements.join(",");
    },
    _getFacetFilters: function _getFacetFilters(o, c, u) {
      var l = [],
          e = o.facetsRefinements || {};
      Object.keys(e).forEach(function (t) {
        (e[t] || []).forEach(function (e) {
          l.push(t + ":" + e);
        });
      });
      var n = o.facetsExcludes || {};
      Object.keys(n).forEach(function (t) {
        (n[t] || []).forEach(function (e) {
          l.push(t + ":-" + e);
        });
      });
      var r = o.disjunctiveFacetsRefinements || {};
      Object.keys(r).forEach(function (t) {
        var e = r[t] || [];

        if (t !== c && e && 0 !== e.length) {
          var n = [];
          e.forEach(function (e) {
            n.push(t + ":" + e);
          }), l.push(n);
        }
      });
      var h = o.hierarchicalFacetsRefinements || {};
      return Object.keys(h).forEach(function (e) {
        var t = (h[e] || [])[0];

        if (void 0 !== t) {
          var n,
              r,
              i = o.getHierarchicalFacetByName(e),
              a = o._getHierarchicalFacetSeparator(i),
              s = o._getHierarchicalRootPath(i);

          if (c === e) {
            if (-1 === t.indexOf(a) || !s && !0 === u || s && s.split(a).length === t.split(a).length) return;
            t = s ? (r = s.split(a).length - 1, s) : (r = t.split(a).length - 2, t.slice(0, t.lastIndexOf(a))), n = i.attributes[r];
          } else r = t.split(a).length - 1, n = i.attributes[r];

          n && l.push([n + ":" + t]);
        }
      }), l;
    },
    _getHitsHierarchicalFacetsAttributes: function _getHitsHierarchicalFacetsAttributes(s) {
      return s.hierarchicalFacets.reduce(function (e, t) {
        var n = s.getHierarchicalRefinement(t.name)[0];
        if (!n) return e.push(t.attributes[0]), e;

        var r = s._getHierarchicalFacetSeparator(t),
            i = n.split(r).length,
            a = t.attributes.slice(0, i + 1);

        return e.concat(a);
      }, []);
    },
    _getDisjunctiveHierarchicalFacetAttribute: function _getDisjunctiveHierarchicalFacetAttribute(e, t, n) {
      var r = e._getHierarchicalFacetSeparator(t);

      if (!0 === n) {
        var i = e._getHierarchicalRootPath(t),
            a = 0;

        return i && (a = i.split(r).length), [t.attributes[a]];
      }

      var s = (e.getHierarchicalRefinement(t.name)[0] || "").split(r).length - 1;
      return t.attributes.slice(0, 1 + s);
    },
    getSearchForFacetQuery: function getSearchForFacetQuery(e, t, n, r) {
      var i = r.isDisjunctiveFacet(e) ? r.clearRefinements(e) : r,
          a = {
        facetQuery: t,
        facetName: e
      };
      return "number" == typeof n && (a.maxFacetHits = n), p({}, ee._getHitsSearchParams(i), a);
    }
  },
      te = ee,
      ne = "3.3.4";

  function re(e, t, n) {
    "function" == typeof e.addAlgoliaAgent && e.addAlgoliaAgent("JS Helper (3.3.4)"), this.setClient(e);
    var r = n || {};
    r.index = t, this.state = x.make(r), this.lastResults = null, this._queryId = 0, this._lastQueryIdReceived = -1, this.derivedHelpers = [], this._currentNbQueries = 0;
  }

  function ie(e) {
    if (e < 0) throw new Error("Page requested below 0.");
    return this._change({
      state: this.state.setPage(e),
      isPageReset: !1
    }), this;
  }

  function ae() {
    return this.state.page;
  }

  G(re, e.EventEmitter), re.prototype.search = function () {
    return this._search({
      onlyWithDerivedHelpers: !1
    }), this;
  }, re.prototype.searchOnlyWithDerivedHelpers = function () {
    return this._search({
      onlyWithDerivedHelpers: !0
    }), this;
  }, re.prototype.getQuery = function () {
    var e = this.state;
    return te._getHitsSearchParams(e);
  }, re.prototype.searchOnce = function (e, t) {
    var n = e ? this.state.setQueryParameters(e) : this.state,
        r = te._getQueries(n.index, n),
        i = this;

    if (this._currentNbQueries++, this.emit("searchOnce", {
      state: n
    }), !t) return this.client.search(r).then(function (e) {
      return i._currentNbQueries--, 0 === i._currentNbQueries && i.emit("searchQueueEmpty"), {
        content: new V(n, e.results),
        state: n,
        _originalResponse: e
      };
    }, function (e) {
      throw i._currentNbQueries--, 0 === i._currentNbQueries && i.emit("searchQueueEmpty"), e;
    });
    this.client.search(r).then(function (e) {
      i._currentNbQueries--, 0 === i._currentNbQueries && i.emit("searchQueueEmpty"), t(null, new V(n, e.results), n);
    }).catch(function (e) {
      i._currentNbQueries--, 0 === i._currentNbQueries && i.emit("searchQueueEmpty"), t(e, null, n);
    });
  }, re.prototype.searchForFacetValues = function (t, e, n, r) {
    var i = "function" == typeof this.client.searchForFacetValues;
    if (!i && "function" != typeof this.client.initIndex) throw new Error("search for facet values (searchable) was called, but this client does not have a function client.searchForFacetValues or client.initIndex(index).searchForFacetValues");
    var a = this.state.setQueryParameters(r || {}),
        s = a.isDisjunctiveFacet(t),
        o = te.getSearchForFacetQuery(t, e, n, a);
    this._currentNbQueries++;
    var c = this;
    return this.emit("searchForFacetValues", {
      state: a,
      facet: t,
      query: e
    }), (i ? this.client.searchForFacetValues([{
      indexName: a.index,
      params: o
    }]) : this.client.initIndex(a.index).searchForFacetValues(o)).then(function (e) {
      return c._currentNbQueries--, 0 === c._currentNbQueries && c.emit("searchQueueEmpty"), (e = Array.isArray(e) ? e[0] : e).facetHits.forEach(function (e) {
        e.isRefined = s ? a.isDisjunctiveFacetRefined(t, e.value) : a.isFacetRefined(t, e.value);
      }), e;
    }, function (e) {
      throw c._currentNbQueries--, 0 === c._currentNbQueries && c.emit("searchQueueEmpty"), e;
    });
  }, re.prototype.setQuery = function (e) {
    return this._change({
      state: this.state.resetPage().setQuery(e),
      isPageReset: !0
    }), this;
  }, re.prototype.clearRefinements = function (e) {
    return this._change({
      state: this.state.resetPage().clearRefinements(e),
      isPageReset: !0
    }), this;
  }, re.prototype.clearTags = function () {
    return this._change({
      state: this.state.resetPage().clearTags(),
      isPageReset: !0
    }), this;
  }, re.prototype.addDisjunctiveFacetRefinement = function (e, t) {
    return this._change({
      state: this.state.resetPage().addDisjunctiveFacetRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.addDisjunctiveRefine = function () {
    return this.addDisjunctiveFacetRefinement.apply(this, arguments);
  }, re.prototype.addHierarchicalFacetRefinement = function (e, t) {
    return this._change({
      state: this.state.resetPage().addHierarchicalFacetRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.addNumericRefinement = function (e, t, n) {
    return this._change({
      state: this.state.resetPage().addNumericRefinement(e, t, n),
      isPageReset: !0
    }), this;
  }, re.prototype.addFacetRefinement = function (e, t) {
    return this._change({
      state: this.state.resetPage().addFacetRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.addRefine = function () {
    return this.addFacetRefinement.apply(this, arguments);
  }, re.prototype.addFacetExclusion = function (e, t) {
    return this._change({
      state: this.state.resetPage().addExcludeRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.addExclude = function () {
    return this.addFacetExclusion.apply(this, arguments);
  }, re.prototype.addTag = function (e) {
    return this._change({
      state: this.state.resetPage().addTagRefinement(e),
      isPageReset: !0
    }), this;
  }, re.prototype.removeNumericRefinement = function (e, t, n) {
    return this._change({
      state: this.state.resetPage().removeNumericRefinement(e, t, n),
      isPageReset: !0
    }), this;
  }, re.prototype.removeDisjunctiveFacetRefinement = function (e, t) {
    return this._change({
      state: this.state.resetPage().removeDisjunctiveFacetRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.removeDisjunctiveRefine = function () {
    return this.removeDisjunctiveFacetRefinement.apply(this, arguments);
  }, re.prototype.removeHierarchicalFacetRefinement = function (e) {
    return this._change({
      state: this.state.resetPage().removeHierarchicalFacetRefinement(e),
      isPageReset: !0
    }), this;
  }, re.prototype.removeFacetRefinement = function (e, t) {
    return this._change({
      state: this.state.resetPage().removeFacetRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.removeRefine = function () {
    return this.removeFacetRefinement.apply(this, arguments);
  }, re.prototype.removeFacetExclusion = function (e, t) {
    return this._change({
      state: this.state.resetPage().removeExcludeRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.removeExclude = function () {
    return this.removeFacetExclusion.apply(this, arguments);
  }, re.prototype.removeTag = function (e) {
    return this._change({
      state: this.state.resetPage().removeTagRefinement(e),
      isPageReset: !0
    }), this;
  }, re.prototype.toggleFacetExclusion = function (e, t) {
    return this._change({
      state: this.state.resetPage().toggleExcludeFacetRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.toggleExclude = function () {
    return this.toggleFacetExclusion.apply(this, arguments);
  }, re.prototype.toggleRefinement = function (e, t) {
    return this.toggleFacetRefinement(e, t);
  }, re.prototype.toggleFacetRefinement = function (e, t) {
    return this._change({
      state: this.state.resetPage().toggleFacetRefinement(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.toggleRefine = function () {
    return this.toggleFacetRefinement.apply(this, arguments);
  }, re.prototype.toggleTag = function (e) {
    return this._change({
      state: this.state.resetPage().toggleTagRefinement(e),
      isPageReset: !0
    }), this;
  }, re.prototype.nextPage = function () {
    var e = this.state.page || 0;
    return this.setPage(e + 1);
  }, re.prototype.previousPage = function () {
    var e = this.state.page || 0;
    return this.setPage(e - 1);
  }, re.prototype.setCurrentPage = ie, re.prototype.setPage = ie, re.prototype.setIndex = function (e) {
    return this._change({
      state: this.state.resetPage().setIndex(e),
      isPageReset: !0
    }), this;
  }, re.prototype.setQueryParameter = function (e, t) {
    return this._change({
      state: this.state.resetPage().setQueryParameter(e, t),
      isPageReset: !0
    }), this;
  }, re.prototype.setState = function (e) {
    return this._change({
      state: x.make(e),
      isPageReset: !1
    }), this;
  }, re.prototype.overrideStateWithoutTriggeringChangeEvent = function (e) {
    return this.state = new x(e), this;
  }, re.prototype.hasRefinements = function (e) {
    return !!y(this.state.getNumericRefinements(e)) || (this.state.isConjunctiveFacet(e) ? this.state.isFacetRefined(e) : this.state.isDisjunctiveFacet(e) ? this.state.isDisjunctiveFacetRefined(e) : !!this.state.isHierarchicalFacet(e) && this.state.isHierarchicalFacetRefined(e));
  }, re.prototype.isExcluded = function (e, t) {
    return this.state.isExcludeRefined(e, t);
  }, re.prototype.isDisjunctiveRefined = function (e, t) {
    return this.state.isDisjunctiveFacetRefined(e, t);
  }, re.prototype.hasTag = function (e) {
    return this.state.isTagRefined(e);
  }, re.prototype.isTagRefined = function () {
    return this.hasTagRefinements.apply(this, arguments);
  }, re.prototype.getIndex = function () {
    return this.state.index;
  }, re.prototype.getCurrentPage = ae, re.prototype.getPage = ae, re.prototype.getTags = function () {
    return this.state.tagRefinements;
  }, re.prototype.getRefinements = function (e) {
    var n = [];
    if (this.state.isConjunctiveFacet(e)) this.state.getConjunctiveRefinements(e).forEach(function (e) {
      n.push({
        value: e,
        type: "conjunctive"
      });
    }), this.state.getExcludeRefinements(e).forEach(function (e) {
      n.push({
        value: e,
        type: "exclude"
      });
    });else if (this.state.isDisjunctiveFacet(e)) {
      this.state.getDisjunctiveRefinements(e).forEach(function (e) {
        n.push({
          value: e,
          type: "disjunctive"
        });
      });
    }
    var r = this.state.getNumericRefinements(e);
    return Object.keys(r).forEach(function (e) {
      var t = r[e];
      n.push({
        value: t,
        operator: e,
        type: "numeric"
      });
    }), n;
  }, re.prototype.getNumericRefinement = function (e, t) {
    return this.state.getNumericRefinement(e, t);
  }, re.prototype.getHierarchicalFacetBreadcrumb = function (e) {
    return this.state.getHierarchicalFacetBreadcrumb(e);
  }, re.prototype._search = function (e) {
    var r = this.state,
        i = [],
        t = [];
    e.onlyWithDerivedHelpers || (t = te._getQueries(r.index, r), i.push({
      state: r,
      queriesCount: t.length,
      helper: this
    }), this.emit("search", {
      state: r,
      results: this.lastResults
    }));
    var n = this.derivedHelpers.map(function (e) {
      var t = e.getModifiedState(r),
          n = te._getQueries(t.index, t);

      return i.push({
        state: t,
        queriesCount: n.length,
        helper: e
      }), e.emit("search", {
        state: t,
        results: e.lastResults
      }), n;
    }),
        a = Array.prototype.concat.apply(t, n),
        s = this._queryId++;
    this._currentNbQueries++;

    try {
      this.client.search(a).then(this._dispatchAlgoliaResponse.bind(this, i, s)).catch(this._dispatchAlgoliaError.bind(this, s));
    } catch (e) {
      this.emit("error", {
        error: e
      });
    }
  }, re.prototype._dispatchAlgoliaResponse = function (e, t, n) {
    if (!(t < this._lastQueryIdReceived)) {
      this._currentNbQueries -= t - this._lastQueryIdReceived, this._lastQueryIdReceived = t, 0 === this._currentNbQueries && this.emit("searchQueueEmpty");
      var s = n.results.slice();
      e.forEach(function (e) {
        var t = e.state,
            n = e.queriesCount,
            r = e.helper,
            i = s.splice(0, n),
            a = r.lastResults = new V(t, i);
        r.emit("result", {
          results: a,
          state: t
        });
      });
    }
  }, re.prototype._dispatchAlgoliaError = function (e, t) {
    e < this._lastQueryIdReceived || (this._currentNbQueries -= e - this._lastQueryIdReceived, this._lastQueryIdReceived = e, this.emit("error", {
      error: t
    }), 0 === this._currentNbQueries && this.emit("searchQueueEmpty"));
  }, re.prototype.containsRefinement = function (e, t, n, r) {
    return e || 0 !== t.length || 0 !== n.length || 0 !== r.length;
  }, re.prototype._hasDisjunctiveRefinements = function (e) {
    return this.state.disjunctiveRefinements[e] && 0 < this.state.disjunctiveRefinements[e].length;
  }, re.prototype._change = function (e) {
    var t = e.state,
        n = e.isPageReset;
    t !== this.state && (this.state = t, this.emit("change", {
      state: this.state,
      results: this.lastResults,
      isPageReset: n
    }));
  }, re.prototype.clearCache = function () {
    return this.client.clearCache && this.client.clearCache(), this;
  }, re.prototype.setClient = function (e) {
    return this.client === e || ("function" == typeof e.addAlgoliaAgent && e.addAlgoliaAgent("JS Helper (3.3.4)"), this.client = e), this;
  }, re.prototype.getClient = function () {
    return this.client;
  }, re.prototype.derive = function (e) {
    var t = new X(this, e);
    return this.derivedHelpers.push(t), t;
  }, re.prototype.detachDerivedHelper = function (e) {
    var t = this.derivedHelpers.indexOf(e);
    if (-1 === t) throw new Error("Derived helper already detached");
    this.derivedHelpers.splice(t, 1);
  }, re.prototype.hasPendingRequests = function () {
    return 0 < this._currentNbQueries;
  };
  var se = re;

  function oe(e, t, n) {
    return new se(e, t, n);
  }

  oe.version = ne, oe.AlgoliaSearchHelper = se, oe.SearchParameters = x, oe.SearchResults = V;
  var ce = oe;

  function ue(r) {
    function e() {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
        t[n] = arguments[n];
      }

      null === i && (i = le.then(function () {
        i = null, a ? a = !1 : r.apply(void 0, t);
      }));
    }

    var i = null,
        a = !1;
    return e.wait = function () {
      if (null === i) throw new Error("The deferred function should be called before calling `wait()`");
      return i;
    }, e.cancel = function () {
      null !== i && (a = !0);
    }, e;
  }

  var le = Promise.resolve();

  function he(e) {
    var t = "string" == typeof e,
        n = t ? document.querySelector(e) : e;
    if (function (e) {
      return e instanceof HTMLElement || Boolean(e) && 0 < e.nodeType;
    }(n)) return n;
    var r = "Container must be `string` or `HTMLElement`.";
    throw t && (r += " Unable to find ".concat(e)), new Error(r);
  }

  function de(e) {
    return 1 === e.button || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
  }

  function fe(e) {
    return e.filter(function (e, t, n) {
      return n.indexOf(e) === t;
    });
  }

  function me(e) {
    var t = e.defaultTemplates,
        n = e.templates;
    return D({
      templatesConfig: e.templatesConfig
    }, function (e, t) {
      var a = 0 < arguments.length && void 0 !== e ? e : {},
          s = 1 < arguments.length && void 0 !== t ? t : {};
      return fe([].concat(P(Object.keys(a)), P(Object.keys(s)))).reduce(function (e, t) {
        var n = a[t],
            r = s[t],
            i = void 0 !== r && r !== n;
        return e.templates[t] = i ? r : n, e.useCustomCompileOptions[t] = i, e;
      }, {
        templates: {},
        useCustomCompileOptions: {}
      });
    }(t, n));
  }

  function pe(e, t) {
    return e(t = {
      exports: {}
    }, t.exports), t.exports;
  }

  var ge = pe(function (e, t) {
    !function (R) {
      var S = /\S/,
          t = /\"/g,
          n = /\n/g,
          r = /\r/g,
          i = /\\/g,
          a = /\u2028/,
          s = /\u2029/;

      function w(e) {
        "}" === e.n.substr(e.n.length - 1) && (e.n = e.n.substring(0, e.n.length - 1));
      }

      function P(e) {
        return e.trim ? e.trim() : e.replace(/^\s*|\s*$/g, "");
      }

      function x(e, t, n) {
        if (t.charAt(n) != e.charAt(0)) return !1;

        for (var r = 1, i = e.length; r < i; r++) {
          if (t.charAt(n + r) != e.charAt(r)) return !1;
        }

        return !0;
      }

      R.tags = {
        "#": 1,
        "^": 2,
        "<": 3,
        $: 4,
        "/": 5,
        "!": 6,
        ">": 7,
        "=": 8,
        _v: 9,
        "{": 10,
        "&": 11,
        _t: 12
      }, R.scan = function (e, t) {
        var n,
            r,
            i,
            a,
            s,
            o = e.length,
            c = 0,
            u = null,
            l = null,
            h = "",
            d = [],
            f = !1,
            m = 0,
            p = 0,
            g = "{{",
            v = "}}";

        function y() {
          0 < h.length && (d.push({
            tag: "_t",
            text: new String(h)
          }), h = "");
        }

        function b(e, t) {
          if (y(), e && function () {
            for (var e = !0, t = p; t < d.length; t++) {
              if (!(e = R.tags[d[t].tag] < R.tags._v || "_t" == d[t].tag && null === d[t].text.match(S))) return !1;
            }

            return e;
          }()) for (var n, r = p; r < d.length; r++) {
            d[r].text && ((n = d[r + 1]) && ">" == n.tag && (n.indent = d[r].text.toString()), d.splice(r, 1));
          } else t || d.push({
            tag: "\n"
          });
          f = !1, p = d.length;
        }

        for (t && (t = t.split(" "), g = t[0], v = t[1]), m = 0; m < o; m++) {
          0 == c ? x(g, e, m) ? (--m, y(), c = 1) : "\n" == e.charAt(m) ? b(f) : h += e.charAt(m) : 1 == c ? (m += g.length - 1, c = "=" == (u = (l = R.tags[e.charAt(m + 1)]) ? e.charAt(m + 1) : "_v") ? (r = m, void 0, i = "=" + v, a = (n = e).indexOf(i, r), s = P(n.substring(n.indexOf("=", r) + 1, a)).split(" "), g = s[0], v = s[s.length - 1], m = a + i.length - 1, 0) : (l && m++, 2), f = m) : x(v, e, m) ? (d.push({
            tag: u,
            n: P(h),
            otag: g,
            ctag: v,
            i: "/" == u ? f - g.length : m + v.length
          }), h = "", m += v.length - 1, c = 0, "{" == u && ("}}" == v ? m++ : w(d[d.length - 1]))) : h += e.charAt(m);
        }

        return b(f, !0), d;
      };
      var u = {
        _t: !0,
        "\n": !0,
        $: !0,
        "/": !0
      };

      function l(e, t) {
        for (var n = 0, r = t.length; n < r; n++) {
          if (t[n].o == e.n) return e.tag = "#", !0;
        }
      }

      function h(e, t, n) {
        for (var r = 0, i = n.length; r < i; r++) {
          if (n[r].c == e && n[r].o == t) return !0;
        }
      }

      function o(e) {
        var t = [];

        for (var n in e.partials) {
          t.push('"' + d(n) + '":{name:"' + d(e.partials[n].name) + '", ' + o(e.partials[n]) + "}");
        }

        return "partials: {" + t.join(",") + "}, subs: " + function (e) {
          var t = [];

          for (var n in e) {
            t.push('"' + d(n) + '": function(c,p,t,i) {' + e[n] + "}");
          }

          return "{ " + t.join(",") + " }";
        }(e.subs);
      }

      R.stringify = function (e, t, n) {
        return "{code: function (c,p,i) { " + R.wrapMain(e.code) + " }," + o(e) + "}";
      };

      var c = 0;

      function d(e) {
        return e.replace(i, "\\\\").replace(t, '\\"').replace(n, "\\n").replace(r, "\\r").replace(a, "\\u2028").replace(s, "\\u2029");
      }

      function f(e) {
        return ~e.indexOf(".") ? "d" : "f";
      }

      function m(e, t) {
        var n = "<" + (t.prefix || "") + e.n + c++;
        return t.partials[n] = {
          name: e.n,
          partials: {}
        }, t.code += 't.b(t.rp("' + d(n) + '",c,p,"' + (e.indent || "") + '"));', n;
      }

      function e(e, t) {
        t.code += "t.b(t.t(t." + f(e.n) + '("' + d(e.n) + '",c,p,0)));';
      }

      function p(e) {
        return "t.b(" + e + ");";
      }

      R.generate = function (e, t, n) {
        c = 0;
        var r = {
          code: "",
          subs: {},
          partials: {}
        };
        return R.walk(e, r), n.asString ? this.stringify(r, t, n) : this.makeTemplate(r, t, n);
      }, R.wrapMain = function (e) {
        return 'var t=this;t.b(i=i||"");' + e + "return t.fl();";
      }, R.template = R.Template, R.makeTemplate = function (e, t, n) {
        var r = this.makePartials(e);
        return r.code = new Function("c", "p", "i", this.wrapMain(e.code)), new this.template(r, t, this, n);
      }, R.makePartials = function (e) {
        var t,
            n = {
          subs: {},
          partials: e.partials,
          name: e.name
        };

        for (t in n.partials) {
          n.partials[t] = this.makePartials(n.partials[t]);
        }

        for (t in e.subs) {
          n.subs[t] = new Function("c", "p", "t", "i", e.subs[t]);
        }

        return n;
      }, R.codegen = {
        "#": function _(e, t) {
          t.code += "if(t.s(t." + f(e.n) + '("' + d(e.n) + '",c,p,1),c,p,0,' + e.i + "," + e.end + ',"' + e.otag + " " + e.ctag + '")){t.rs(c,p,function(c,p,t){', R.walk(e.nodes, t), t.code += "});c.pop();}";
        },
        "^": function _(e, t) {
          t.code += "if(!t.s(t." + f(e.n) + '("' + d(e.n) + '",c,p,1),c,p,1,0,0,"")){', R.walk(e.nodes, t), t.code += "};";
        },
        ">": m,
        "<": function _(e, t) {
          var n = {
            partials: {},
            code: "",
            subs: {},
            inPartial: !0
          };
          R.walk(e.nodes, n);
          var r = t.partials[m(e, t)];
          r.subs = n.subs, r.partials = n.partials;
        },
        $: function $(e, t) {
          var n = {
            subs: {},
            code: "",
            partials: t.partials,
            prefix: e.n
          };
          R.walk(e.nodes, n), t.subs[e.n] = n.code, t.inPartial || (t.code += 't.sub("' + d(e.n) + '",c,p,i);');
        },
        "\n": function _(e, t) {
          t.code += p('"\\n"' + (e.last ? "" : " + i"));
        },
        _v: function _v(e, t) {
          t.code += "t.b(t.v(t." + f(e.n) + '("' + d(e.n) + '",c,p,0)));';
        },
        _t: function _t(e, t) {
          t.code += p('"' + d(e.text) + '"');
        },
        "{": e,
        "&": e
      }, R.walk = function (e, t) {
        for (var n, r = 0, i = e.length; r < i; r++) {
          (n = R.codegen[e[r].tag]) && n(e[r], t);
        }

        return t;
      }, R.parse = function (e, t, n) {
        return function e(t, n, r, i) {
          var a,
              s = [],
              o = null,
              c = null;

          for (a = r[r.length - 1]; 0 < t.length;) {
            if (c = t.shift(), a && "<" == a.tag && !(c.tag in u)) throw new Error("Illegal content in < super tag.");
            if (R.tags[c.tag] <= R.tags.$ || l(c, i)) r.push(c), c.nodes = e(t, c.tag, r, i);else {
              if ("/" == c.tag) {
                if (0 === r.length) throw new Error("Closing tag without opener: /" + c.n);
                if (o = r.pop(), c.n != o.n && !h(c.n, o.n, i)) throw new Error("Nesting error: " + o.n + " vs. " + c.n);
                return o.end = c.i, s;
              }

              "\n" == c.tag && (c.last = 0 == t.length || "\n" == t[0].tag);
            }
            s.push(c);
          }

          if (0 < r.length) throw new Error("missing closing tag: " + r.pop().n);
          return s;
        }(e, 0, [], (n = n || {}).sectionTags || []);
      }, R.cache = {}, R.cacheKey = function (e, t) {
        return [e, !!t.asString, !!t.disableLambda, t.delimiters, !!t.modelGet].join("||");
      }, R.compile = function (e, t) {
        t = t || {};
        var n = R.cacheKey(e, t),
            r = this.cache[n];

        if (r) {
          var i = r.partials;

          for (var a in i) {
            delete i[a].instance;
          }

          return r;
        }

        return r = this.generate(this.parse(this.scan(e, t.delimiters), e, t), e, t), this.cache[n] = r;
      };
    }(t);
  }),
      ve = pe(function (e, t) {
    !function (e) {
      function l(e, t, n) {
        var r;
        return t && "object" == _typeof(t) && (void 0 !== t[e] ? r = t[e] : n && t.get && "function" == typeof t.get && (r = t.get(e))), r;
      }

      e.Template = function (e, t, n, r) {
        e = e || {}, this.r = e.code || this.r, this.c = n, this.options = r || {}, this.text = t || "", this.partials = e.partials || {}, this.subs = e.subs || {}, this.buf = "";
      }, e.Template.prototype = {
        r: function r(e, t, n) {
          return "";
        },
        v: function v(e) {
          return e = o(e), s.test(e) ? e.replace(t, "&amp;").replace(n, "&lt;").replace(r, "&gt;").replace(i, "&#39;").replace(a, "&quot;") : e;
        },
        t: o,
        render: function render(e, t, n) {
          return this.ri([e], t || {}, n);
        },
        ri: function ri(e, t, n) {
          return this.r(e, t, n);
        },
        ep: function ep(e, t) {
          var n = this.partials[e],
              r = t[n.name];
          if (n.instance && n.base == r) return n.instance;

          if ("string" == typeof r) {
            if (!this.c) throw new Error("No compiler available.");
            r = this.c.compile(r, this.options);
          }

          if (!r) return null;

          if (this.partials[e].base = r, n.subs) {
            for (key in t.stackText || (t.stackText = {}), n.subs) {
              t.stackText[key] || (t.stackText[key] = void 0 !== this.activeSub && t.stackText[this.activeSub] ? t.stackText[this.activeSub] : this.text);
            }

            r = function (e, t, n, r, i, a) {
              function s() {}

              function o() {}

              var c;
              o.prototype = (s.prototype = e).subs;
              var u = new s();

              for (c in u.subs = new o(), u.subsText = {}, u.buf = "", r = r || {}, u.stackSubs = r, u.subsText = a, t) {
                r[c] || (r[c] = t[c]);
              }

              for (c in r) {
                u.subs[c] = r[c];
              }

              for (c in i = i || {}, u.stackPartials = i, n) {
                i[c] || (i[c] = n[c]);
              }

              for (c in i) {
                u.partials[c] = i[c];
              }

              return u;
            }(r, n.subs, n.partials, this.stackSubs, this.stackPartials, t.stackText);
          }

          return this.partials[e].instance = r;
        },
        rp: function rp(e, t, n, r) {
          var i = this.ep(e, n);
          return i ? i.ri(t, n, r) : "";
        },
        rs: function rs(e, t, n) {
          var r = e[e.length - 1];
          if (h(r)) for (var i = 0; i < r.length; i++) {
            e.push(r[i]), n(e, t, this), e.pop();
          } else n(e, t, this);
        },
        s: function s(e, t, n, r, i, a, _s2) {
          var o;
          return (!h(e) || 0 !== e.length) && ("function" == typeof e && (e = this.ms(e, t, n, r, i, a, _s2)), o = !!e, !r && o && t && t.push("object" == _typeof(e) ? e : t[t.length - 1]), o);
        },
        d: function d(e, t, n, r) {
          var i,
              a = e.split("."),
              s = this.f(a[0], t, n, r),
              o = this.options.modelGet,
              c = null;
          if ("." === e && h(t[t.length - 2])) s = t[t.length - 1];else for (var u = 1; u < a.length; u++) {
            s = void 0 !== (i = l(a[u], s, o)) ? (c = s, i) : "";
          }
          return !(r && !s) && (r || "function" != typeof s || (t.push(c), s = this.mv(s, t, n), t.pop()), s);
        },
        f: function f(e, t, n, r) {
          for (var i = !1, a = !1, s = this.options.modelGet, o = t.length - 1; 0 <= o; o--) {
            if (void 0 !== (i = l(e, t[o], s))) {
              a = !0;
              break;
            }
          }

          return a ? (r || "function" != typeof i || (i = this.mv(i, t, n)), i) : !r && "";
        },
        ls: function ls(e, t, n, r, i) {
          var a = this.options.delimiters;
          return this.options.delimiters = i, this.b(this.ct(o(e.call(t, r)), t, n)), this.options.delimiters = a, !1;
        },
        ct: function ct(e, t, n) {
          if (this.options.disableLambda) throw new Error("Lambda features disabled.");
          return this.c.compile(e, this.options).render(t, n);
        },
        b: function b(e) {
          this.buf += e;
        },
        fl: function fl() {
          var e = this.buf;
          return this.buf = "", e;
        },
        ms: function ms(e, t, n, r, i, a, s) {
          var o,
              c = t[t.length - 1],
              u = e.call(c);
          return "function" == typeof u ? !!r || (o = this.activeSub && this.subsText && this.subsText[this.activeSub] ? this.subsText[this.activeSub] : this.text, this.ls(u, c, n, o.substring(i, a), s)) : u;
        },
        mv: function mv(e, t, n) {
          var r = t[t.length - 1],
              i = e.call(r);
          return "function" == typeof i ? this.ct(o(i.call(r)), r, n) : i;
        },
        sub: function sub(e, t, n, r) {
          var i = this.subs[e];
          i && (this.activeSub = e, i(t, n, this, r), this.activeSub = !1);
        }
      };
      var t = /&/g,
          n = /</g,
          r = />/g,
          i = /\'/g,
          a = /\"/g,
          s = /[&<>\"\']/;

      function o(e) {
        return String(null == e ? "" : e);
      }

      var h = Array.isArray || function (e) {
        return "[object Array]" === Object.prototype.toString.call(e);
      };
    }(t);
  });
  ge.Template = ve.Template, ge.template = ge.Template;
  var ye = ge;

  function be(e) {
    var t = e.templates,
        n = e.templateKey,
        r = e.compileOptions,
        i = e.helpers,
        a = e.data,
        s = e.bindEvent,
        o = t[n],
        c = h(o),
        u = "function" === c;
    if (!("string" === c) && !u) throw new Error("Template must be 'string' or 'function', was '".concat(c, "' (key: ").concat(n, ")"));
    if (u) return o(a, s);

    var l = function (e, t, n) {
      var r = 0 < arguments.length && void 0 !== e ? e : {},
          i = 1 < arguments.length ? t : void 0,
          a = 2 < arguments.length ? n : void 0;
      return Object.keys(r).reduce(function (e, n) {
        return D(D({}, e), {}, M({}, n, function () {
          var t = this;
          return function (e) {
            return r[n].call(a, e, function (e) {
              return ye.compile(e, i).render(t);
            });
          };
        }));
      }, {});
    }(i, r, a);

    return ye.compile(o, r).render(D(D({}, a), {}, {
      helpers: l
    })).replace(/[ \n\r\t\f\xA0]+/g, function (e) {
      return e.replace(/(^|\xA0+)[^\xA0]+/g, "$1 ");
    }).trim();
  }

  function Re(e, t) {
    for (var n, r = 0; r < e.length; r++) {
      if (t(n = e[r], r, e)) return n;
    }
  }

  function Se(e) {
    return String(e).replace(/^\\-/, "-");
  }

  function we(i, e, a, s, t) {
    var o,
        n = {
      type: e,
      attribute: a,
      name: s
    },
        c = Re(4 < arguments.length && void 0 !== t ? t : [], function (e) {
      return e.name === a;
    });
    "hierarchical" === e ? function () {
      for (var e = i.getHierarchicalFacetByName(a), n = s.split(e.separator), t = function t(_t2) {
        c = c && c.data && Re(Object.keys(c.data).map(function (t) {
          return function (e) {
            return t[e];
          };
        }(c.data)), function (e) {
          return e.name === n[_t2];
        });
      }, r = 0; void 0 !== c && r < n.length; ++r) {
        t(r);
      }

      o = c && c.count;
    }() : o = c && c.data && c.data[n.name];
    var r = c && c.exhaustive;
    return void 0 !== o && (n.count = o), void 0 !== r && (n.exhaustive = r), n;
  }

  function Pe(n, r, e) {
    var t = 2 < arguments.length && void 0 !== e && e,
        a = [],
        i = r.facetsRefinements,
        s = void 0 === i ? {} : i,
        o = r.facetsExcludes,
        c = void 0 === o ? {} : o,
        u = r.disjunctiveFacetsRefinements,
        l = void 0 === u ? {} : u,
        h = r.hierarchicalFacetsRefinements,
        d = void 0 === h ? {} : h,
        f = r.numericRefinements,
        m = void 0 === f ? {} : f,
        p = r.tagRefinements,
        g = void 0 === p ? [] : p;
    return Object.keys(s).forEach(function (t) {
      s[t].forEach(function (e) {
        a.push(we(r, "facet", t, e, n.facets));
      });
    }), Object.keys(c).forEach(function (t) {
      c[t].forEach(function (e) {
        a.push({
          type: "exclude",
          attribute: t,
          name: e,
          exclude: !0
        });
      });
    }), Object.keys(l).forEach(function (t) {
      l[t].forEach(function (e) {
        a.push(we(r, "disjunctive", t, Se(e), n.disjunctiveFacets));
      });
    }), Object.keys(d).forEach(function (t) {
      d[t].forEach(function (e) {
        a.push(we(r, "hierarchical", t, e, n.hierarchicalFacets));
      });
    }), Object.keys(m).forEach(function (r) {
      var i = m[r];
      Object.keys(i).forEach(function (e) {
        var t = e,
            n = i[t];
        (Array.isArray(n) ? n : [n]).forEach(function (e) {
          a.push({
            type: "numeric",
            attribute: r,
            name: "".concat(e),
            numericValue: e,
            operator: t
          });
        });
      });
    }), g.forEach(function (e) {
      a.push({
        type: "tag",
        attribute: "_tags",
        name: e
      });
    }), t && r.query && r.query.trim() && a.push({
      attribute: "query",
      type: "query",
      name: r.query,
      query: r.query
    }), a;
  }

  function xe(e) {
    var t = e.helper,
        n = e.attributesToClear,
        r = void 0 === n ? [] : n,
        i = t.state.setPage(0);
    return i = r.reduce(function (e, t) {
      return i.isNumericRefined(t) ? e.removeNumericRefinement(t) : i.isHierarchicalFacet(t) ? e.removeHierarchicalFacetRefinement(t) : i.isDisjunctiveFacet(t) ? e.removeDisjunctiveFacetRefinement(t) : i.isConjunctiveFacet(t) ? e.removeFacetRefinement(t) : e;
    }, i), -1 !== r.indexOf("query") && (i = i.setQuery("")), i;
  }

  function Ne(e) {
    return "number" == typeof e && e < 0 && (e = String(e).replace(/^-/, "\\-")), e;
  }

  function _e(e, t) {
    if (void 0 === e || "function" != typeof e) throw new Error("The render function is not valid (received type ".concat(function (e) {
      return Object.prototype.toString.call(e).slice(8, -1);
    }(e), ").\n\n").concat(t));
  }

  function Ie() {}

  function Fe(e, t) {
    return (Array.isArray(t) ? t : t.split(".")).reduce(function (e, t) {
      return e && e[t];
    }, e);
  }

  function Ce(e) {
    return "number" == typeof e && isFinite(e);
  }

  function Te(e) {
    if (!function (e) {
      return "object" === h(e) && null !== e;
    }(e) || "[object Object]" !== function (e) {
      return null === e ? void 0 === e ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(e);
    }(e)) return !1;
    if (null === Object.getPrototypeOf(e)) return !0;

    for (var t = e; null !== Object.getPrototypeOf(t);) {
      t = Object.getPrototypeOf(t);
    }

    return Object.getPrototypeOf(e) === t;
  }

  function Ee(e) {
    var t = e.start,
        n = void 0 === t ? 0 : t,
        r = e.end,
        i = e.step,
        a = void 0 === i ? 1 : i,
        s = 0 === a ? 1 : a,
        o = Math.round((r - n) / s);
    return P(Array(o)).map(function (e, t) {
      return n + t * s;
    });
  }

  function ke(e) {
    return e !== Object(e);
  }

  function Le(e, t) {
    if (e === t) return !0;
    if (ke(e) || ke(t) || "function" == typeof e || "function" == typeof t) return e === t;
    if (Object.keys(e).length !== Object.keys(t).length) return !1;

    for (var n = 0, r = Object.keys(e); n < r.length; n++) {
      var i = r[n];
      if (!(i in t)) return !1;
      if (!Le(e[i], t[i])) return !1;
    }

    return !0;
  }

  var Me = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  },
      je = /[&<>"']/g,
      Oe = RegExp(je.source);
  var Ae = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'"
  },
      He = /&(amp|quot|lt|gt|#39);/g,
      De = RegExp(He.source);
  var We = {
    highlightPreTag: "__ais-highlight__",
    highlightPostTag: "__/ais-highlight__"
  },
      Be = {
    highlightPreTag: "<mark>",
    highlightPostTag: "</mark>"
  };

  function Ue(e) {
    return function (e) {
      return e && Oe.test(e) ? e.replace(je, function (e) {
        return Me[e];
      }) : e;
    }(e).replace(new RegExp(We.highlightPreTag, "g"), Be.highlightPreTag).replace(new RegExp(We.highlightPostTag, "g"), Be.highlightPostTag);
  }

  function Qe(n) {
    return Te(n) && "string" != typeof n.value ? Object.keys(n).reduce(function (e, t) {
      return D(D({}, e), {}, M({}, t, Qe(n[t])));
    }, {}) : Array.isArray(n) ? n.map(Qe) : D(D({}, n), {}, {
      value: Ue(n.value)
    });
  }

  function qe(e) {
    return void 0 === e.__escaped && ((e = e.map(function (e) {
      var t = d({}, e);
      return t._highlightResult && (t._highlightResult = Qe(t._highlightResult)), t._snippetResult && (t._snippetResult = Qe(t._snippetResult)), t;
    })).__escaped = !0), e;
  }

  function $e(e) {
    return e.map(function (e) {
      return D(D({}, e), {}, {
        highlighted: Ue(e.highlighted)
      });
    });
  }

  function Ve(e) {
    var t = Be.highlightPreTag,
        n = Be.highlightPostTag;
    return e.map(function (e) {
      return e.isHighlighted ? t + e.value + n : e.value;
    }).join("");
  }

  function Ke(e) {
    var n = Be.highlightPostTag,
        t = Be.highlightPreTag,
        r = e.split(t),
        i = r.shift(),
        a = i ? [{
      value: i,
      isHighlighted: !1
    }] : [];
    return r.forEach(function (e) {
      var t = e.split(n);
      a.push({
        value: t[0],
        isHighlighted: !0
      }), "" !== t[1] && a.push({
        value: t[1],
        isHighlighted: !1
      });
    }), a;
  }

  var ze = new RegExp(/\w/i);

  function Je(e, t) {
    var n,
        r,
        i = e[t],
        a = (null === (n = e[t + 1]) || void 0 === n ? void 0 : n.isHighlighted) || !0,
        s = (null === (r = e[t - 1]) || void 0 === r ? void 0 : r.isHighlighted) || !0;
    return ze.test(function (e) {
      return e && De.test(e) ? e.replace(He, function (e) {
        return Ae[e];
      }) : e;
    }(i.value)) || s !== a ? i.isHighlighted : s;
  }

  function Ye(n) {
    return n.some(function (e) {
      return e.isHighlighted;
    }) ? n.map(function (e, t) {
      return D(D({}, e), {}, {
        isHighlighted: !Je(n, t)
      });
    }) : n.map(function (e) {
      return D(D({}, e), {}, {
        isHighlighted: !1
      });
    });
  }

  function Ge(e, t) {
    return e.setQueryParameters({
      hierarchicalFacets: t.hierarchicalFacets.reduce(function (e, t) {
        var n = function (e, t) {
          if (!Array.isArray(e)) return -1;

          for (var n = 0; n < e.length; n++) {
            if (t(e[n])) return n;
          }

          return -1;
        }(e, function (e) {
          return e.name === t.name;
        });

        if (-1 === n) return e.concat(t);
        var r = e.slice();
        return r.splice(n, 1, t), r;
      }, e.hierarchicalFacets)
    });
  }

  function Ze() {
    for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
      t[n] = arguments[n];
    }

    return t.reduce(function (e, t) {
      var n = function (e, t) {
        return e.setQueryParameters({
          hierarchicalFacetsRefinements: D(D({}, e.hierarchicalFacetsRefinements), t.hierarchicalFacetsRefinements)
        });
      }(e, t);

      return function (e, t) {
        t.facets, t.disjunctiveFacets, t.facetsRefinements, t.facetsExcludes, t.disjunctiveFacetsRefinements, t.numericRefinements, t.tagRefinements, t.hierarchicalFacets, t.hierarchicalFacetsRefinements, t.ruleContexts;
        var n = O(t, ["facets", "disjunctiveFacets", "facetsRefinements", "facetsExcludes", "disjunctiveFacetsRefinements", "numericRefinements", "tagRefinements", "hierarchicalFacets", "hierarchicalFacetsRefinements", "ruleContexts"]);
        return e.setQueryParameters(n);
      }(function (e, t) {
        return t.facets.reduce(function (e, t) {
          return e.addFacet(t);
        }, e);
      }(function (e, t) {
        var n = fe([].concat(e.ruleContexts).concat(t.ruleContexts).filter(Boolean));
        return 0 < n.length ? e.setQueryParameters({
          ruleContexts: n
        }) : e;
      }(function (e, t) {
        return t.disjunctiveFacets.reduce(function (e, t) {
          return e.addDisjunctiveFacet(t);
        }, e);
      }(function (e, t) {
        return e.setQueryParameters({
          facetsRefinements: D(D({}, e.facetsRefinements), t.facetsRefinements)
        });
      }(function (e, t) {
        return e.setQueryParameters({
          facetsExcludes: D(D({}, e.facetsExcludes), t.facetsExcludes)
        });
      }(function (e, t) {
        return e.setQueryParameters({
          disjunctiveFacetsRefinements: D(D({}, e.disjunctiveFacetsRefinements), t.disjunctiveFacetsRefinements)
        });
      }(function (e, t) {
        return e.setQueryParameters({
          numericRefinements: D(D({}, e.numericRefinements), t.numericRefinements)
        });
      }(function (e, t) {
        return t.tagRefinements.reduce(function (e, t) {
          return e.addTagRefinement(t);
        }, e);
      }(Ge(n, t), t), t), t), t), t), t), t), t), t);
    });
  }

  function Xe(e) {
    return Array.isArray(e) ? e : [e];
  }

  function et() {
    for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
      t[n] = arguments[n];
    }

    var r = t.map(function (e) {
      return function (e) {
        var t = e.name,
            n = e.connector;
        return ["https://www.algolia.com/doc/api-reference/widgets/", t, "/js/", void 0 !== n && n ? "#connector" : ""].join("");
      }(e);
    }).join(", ");
    return function (e) {
      return [e, "See documentation: ".concat(r)].filter(Boolean).join("\n\n");
    };
  }

  var tt = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;

  function nt(e) {
    return Array.isArray(e) ? function (e) {
      var t = W(e, 1)[0],
          n = W(t = void 0 === t ? [void 0, void 0, void 0, void 0] : t, 4),
          r = n[0],
          i = n[1],
          a = n[2],
          s = n[3];
      if (!(r && i && a && s)) throw new Error('Invalid value for "insideBoundingBox" parameter: ['.concat(e, "]"));
      return {
        northEast: {
          lat: r,
          lng: i
        },
        southWest: {
          lat: a,
          lng: s
        }
      };
    }(e) : function (e) {
      var t = W(e.split(",").map(parseFloat), 4),
          n = t[0],
          r = t[1],
          i = t[2],
          a = t[3];
      if (!(n && r && i && a)) throw new Error('Invalid value for "insideBoundingBox" parameter: "'.concat(e, '"'));
      return {
        northEast: {
          lat: n,
          lng: r
        },
        southWest: {
          lat: i,
          lng: a
        }
      };
    }(e);
  }

  function rt(e, n, r) {
    return e.map(function (e, t) {
      return D(D({}, e), {}, {
        __position: r * n + t + 1
      });
    });
  }

  function it(e, t) {
    return t ? e.map(function (e) {
      return D(D({}, e), {}, {
        __queryID: t
      });
    }) : e;
  }

  function at(e) {
    var o = e.instantSearchInstance,
        c = e.helper,
        u = e.attribute,
        l = e.widgetType;
    return function () {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
        t[n] = arguments[n];
      }

      var r = t[0],
          i = t[1],
          a = t[2],
          s = void 0 === a ? "Filter Applied" : a;
      1 === t.length && "object" === h(t[0]) ? o.sendEventToInsights(t[0]) : "click" !== r || 2 !== t.length && 3 !== t.length || function (e, t, n) {
        return e.state.isHierarchicalFacet(t) ? e.state.isHierarchicalFacetRefined(t, n) : e.state.isConjunctiveFacet(t) ? e.state.isFacetRefined(t, n) : e.state.isDisjunctiveFacetRefined(t, n);
      }(c, u, i) || o.sendEventToInsights({
        insightsMethod: "clickedFilters",
        widgetType: l,
        eventType: r,
        payload: {
          eventName: s,
          index: c.getIndex(),
          filters: ["".concat(u, ":").concat(i)]
        }
      });
    };
  }

  function st(e) {
    var t = e.index,
        n = e.widgetType,
        r = (e.methodName, e.args);
    if (1 === r.length && "object" === h(r[0])) return r[0];
    var i = r[0],
        a = r[1],
        s = r[2];
    if (!a) return null;
    if (("click" === i || "conversion" === i) && !s) return null;
    var o = Array.isArray(a) ? a : [a];
    if (0 === o.length) return null;
    var c = o[0].__queryID,
        u = o.map(function (e) {
      return e.objectID;
    }),
        l = o.map(function (e) {
      return e.__position;
    });
    return "view" === i ? {
      insightsMethod: "viewedObjectIDs",
      widgetType: n,
      eventType: i,
      payload: {
        eventName: s || "Hits Viewed",
        index: t,
        objectIDs: u
      }
    } : "click" === i ? {
      insightsMethod: "clickedObjectIDsAfterSearch",
      widgetType: n,
      eventType: i,
      payload: {
        eventName: s,
        index: t,
        queryID: c,
        objectIDs: u,
        positions: l
      }
    } : "conversion" === i ? {
      insightsMethod: "convertedObjectIDsAfterSearch",
      widgetType: n,
      eventType: i,
      payload: {
        eventName: s,
        index: t,
        queryID: c,
        objectIDs: u
      }
    } : null;
  }

  function ot(e) {
    var i = e.instantSearchInstance,
        a = e.index,
        s = e.widgetType;
    return function () {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
        t[n] = arguments[n];
      }

      var r = st({
        widgetType: s,
        index: a,
        methodName: "sendEvent",
        args: t
      });
      r && i.sendEventToInsights(r);
    };
  }

  function ct(e) {
    var i = e.index,
        a = e.widgetType;
    return function () {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
        t[n] = arguments[n];
      }

      var r = st({
        widgetType: a,
        index: i,
        methodName: "bindEvent",
        args: t
      });
      return r ? "data-insights-event=".concat(btoa(JSON.stringify(r))) : "";
    };
  }

  function ut(e, n) {
    if (!e) return null;
    var r = e.numericRefinements[n],
        i = [];
    return Object.keys(r).filter(function (e) {
      return Array.isArray(r[e]) && 0 < r[e].length;
    }).forEach(function (t) {
      r[t].forEach(function (e) {
        i.push("".concat(n).concat(t).concat(e));
      });
    }), i;
  }

  var lt = et({
    name: "index-widget"
  });

  function ht(e) {
    return "ais.index" === e.$$type;
  }

  function dt(e, t) {
    var n = t.state,
        r = t.isPageReset,
        i = t._uiState;
    n !== e.state && (e.state = n, e.emit("change", {
      state: e.state,
      results: e.lastResults,
      isPageReset: r,
      _uiState: i
    }));
  }

  function ft(e, n, t) {
    var r = 2 < arguments.length && void 0 !== t ? t : {};
    return e.filter(function (e) {
      return !ht(e);
    }).reduce(function (e, t) {
      return t.getWidgetUiState || t.getWidgetState ? t.getWidgetUiState ? t.getWidgetUiState(e, n) : t.getWidgetState(e, n) : e;
    }, r);
  }

  function mt(e, t) {
    var n = t.initialSearchParameters,
        r = O(t, ["initialSearchParameters"]);
    return e.filter(function (e) {
      return !ht(e);
    }).reduce(function (e, t) {
      return t.getWidgetSearchParameters ? t.getWidgetSearchParameters(e, r) : e;
    }, n);
  }

  function pt(e) {
    if (void 0 === e || void 0 === e.indexName) throw new Error(lt("The `indexName` option is required."));
    var o = e.indexName,
        t = e.indexId,
        c = void 0 === t ? o : t,
        u = [],
        l = {},
        h = null,
        d = null,
        f = null,
        m = null;
    return {
      $$type: "ais.index",
      $$widgetType: "ais.index",
      getIndexName: function getIndexName() {
        return o;
      },
      getIndexId: function getIndexId() {
        return c;
      },
      getHelper: function getHelper() {
        return f;
      },
      getResults: function getResults() {
        return m && m.lastResults;
      },
      getScopedResults: function getScopedResults() {
        var e = this.getParent();
        return function n(e) {
          return e.filter(ht).reduce(function (e, t) {
            return e.concat.apply(e, [{
              indexId: t.getIndexId(),
              results: t.getResults(),
              helper: t.getHelper()
            }].concat(P(n(t.getWidgets()))));
          }, []);
        }(e ? e.getWidgets() : [this]);
      },
      getParent: function getParent() {
        return d;
      },
      createURL: function createURL(e) {
        return h._createURL(M({}, c, ft(u, {
          searchParameters: e,
          helper: f
        })));
      },
      getWidgets: function getWidgets() {
        return u;
      },
      addWidgets: function addWidgets(e) {
        var t = this;
        if (!Array.isArray(e)) throw new Error(lt("The `addWidgets` method expects an array of widgets."));
        if (e.some(function (e) {
          return "function" != typeof e.init && "function" != typeof e.render;
        })) throw new Error(lt("The widget definition expects a `render` and/or an `init` method."));
        return u = u.concat(e), h && Boolean(e.length) && (dt(f, {
          state: mt(u, {
            uiState: l,
            initialSearchParameters: f.state
          }),
          _uiState: l
        }), e.forEach(function (e) {
          e.getRenderState && gt({
            renderState: e.getRenderState(h.renderState[t.getIndexId()] || {}, {
              uiState: h._initialUiState,
              helper: t.getHelper(),
              parent: t,
              instantSearchInstance: h,
              state: f.state,
              renderState: h.renderState,
              templatesConfig: h.templatesConfig,
              createURL: t.createURL,
              scopedResults: [],
              searchMetadata: {
                isSearchStalled: h._isSearchStalled
              }
            }),
            instantSearchInstance: h,
            parent: t
          });
        }), e.forEach(function (e) {
          e.init && e.init({
            helper: f,
            parent: t,
            uiState: h._initialUiState,
            instantSearchInstance: h,
            state: f.state,
            renderState: h.renderState,
            templatesConfig: h.templatesConfig,
            createURL: t.createURL,
            scopedResults: [],
            searchMetadata: {
              isSearchStalled: h._isSearchStalled
            }
          });
        }), h.scheduleSearch()), this;
      },
      removeWidgets: function removeWidgets(t) {
        if (!Array.isArray(t)) throw new Error(lt("The `removeWidgets` method expects an array of widgets."));
        if (t.some(function (e) {
          return "function" != typeof e.dispose;
        })) throw new Error(lt("The widget definition expects a `dispose` method."));

        if (u = u.filter(function (e) {
          return -1 === t.indexOf(e);
        }), h && Boolean(t.length)) {
          var e = t.reduce(function (e, t) {
            return t.dispose({
              helper: f,
              state: e
            }) || e;
          }, f.state);
          l = ft(u, {
            searchParameters: e,
            helper: f
          }), f.setState(mt(u, {
            uiState: l,
            initialSearchParameters: e
          })), u.length && h.scheduleSearch();
        }

        return this;
      },
      init: function init(e) {
        var t = this,
            r = e.instantSearchInstance,
            n = e.parent,
            i = e.uiState;

        if (null === f) {
          h = r, d = n, l = i[c] || {};
          var a = r.mainHelper,
              s = mt(u, {
            uiState: l,
            initialSearchParameters: new ce.SearchParameters({
              index: o
            })
          });
          (f = ce({}, s.index, s)).search = function () {
            return r.onStateChange ? (r.onStateChange({
              uiState: r.mainIndex.getWidgetUiState({}),
              setUiState: r.setUiState.bind(r)
            }), a) : a.search();
          }, f.searchWithoutTriggeringOnStateChange = function () {
            return a.search();
          }, f.searchForFacetValues = function (e, t, n, r) {
            var i = f.state.setQueryParameters(r);
            return a.searchForFacetValues(e, t, n, i);
          }, m = a.derive(function () {
            return Ze.apply(void 0, P(function (e) {
              for (var t = e.getParent(), n = [e.getHelper().state]; null !== t;) {
                n = [t.getHelper().state].concat(n), t = t.getParent();
              }

              return n;
            }(t)));
          }), f.on("change", function (e) {
            e.isPageReset && !function n(e) {
              var t = e.filter(ht);
              0 !== t.length && t.forEach(function (e) {
                var t = e.getHelper();
                dt(t, {
                  state: t.state.resetPage(),
                  isPageReset: !0
                }), n(e.getWidgets());
              });
            }(u);
          }), m.on("search", function () {
            r.scheduleStalledRender();
          }), m.on("result", function (e) {
            var t = e.results;
            r.scheduleRender(), f.lastResults = t;
          }), u.forEach(function (e) {
            e.getRenderState && gt({
              renderState: e.getRenderState(r.renderState[t.getIndexId()] || {}, {
                uiState: i,
                helper: f,
                parent: t,
                instantSearchInstance: r,
                state: f.state,
                renderState: r.renderState,
                templatesConfig: r.templatesConfig,
                createURL: t.createURL,
                scopedResults: [],
                searchMetadata: {
                  isSearchStalled: r._isSearchStalled
                }
              }),
              instantSearchInstance: r,
              parent: t
            });
          }), u.forEach(function (e) {
            e.init && e.init({
              uiState: i,
              helper: f,
              parent: t,
              instantSearchInstance: r,
              state: f.state,
              renderState: r.renderState,
              templatesConfig: r.templatesConfig,
              createURL: t.createURL,
              scopedResults: [],
              searchMetadata: {
                isSearchStalled: r._isSearchStalled
              }
            });
          }), f.on("change", function (e) {
            var t = e.state,
                n = e._uiState;
            l = ft(u, {
              searchParameters: t,
              helper: f
            }, n || {}), r.onStateChange || r.onInternalStateChange();
          });
        }
      },
      render: function render(e) {
        var t = this,
            n = e.instantSearchInstance;
        this.getResults() && (u.forEach(function (e) {
          e.getRenderState && gt({
            renderState: e.getRenderState(n.renderState[t.getIndexId()] || {}, {
              helper: t.getHelper(),
              parent: t,
              instantSearchInstance: n,
              results: t.getResults(),
              scopedResults: t.getScopedResults(),
              state: t.getResults()._state,
              renderState: n.renderState,
              templatesConfig: n.templatesConfig,
              createURL: t.createURL,
              searchMetadata: {
                isSearchStalled: n._isSearchStalled
              }
            }),
            instantSearchInstance: n,
            parent: t
          });
        }), u.forEach(function (e) {
          e.render && e.render({
            helper: f,
            parent: t,
            instantSearchInstance: n,
            results: t.getResults(),
            scopedResults: t.getScopedResults(),
            state: t.getResults()._state,
            renderState: n.renderState,
            templatesConfig: n.templatesConfig,
            createURL: t.createURL,
            searchMetadata: {
              isSearchStalled: n._isSearchStalled
            }
          });
        }));
      },
      dispose: function dispose() {
        u.forEach(function (e) {
          e.dispose && e.dispose({
            helper: f,
            state: f.state
          });
        }), d = h = null, f.removeAllListeners(), f = null, m.detach(), m = null;
      },
      getWidgetUiState: function getWidgetUiState(e) {
        return u.filter(ht).reduce(function (e, t) {
          return t.getWidgetUiState(e);
        }, D(D({}, e), {}, M({}, this.getIndexId(), l)));
      },
      getWidgetState: function getWidgetState(e) {
        return this.getWidgetUiState(e);
      },
      getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
        var n = t.uiState;
        return mt(u, {
          uiState: n,
          initialSearchParameters: e
        });
      },
      refreshUiState: function refreshUiState() {
        l = ft(u, {
          searchParameters: this.getHelper().state,
          helper: this.getHelper()
        });
      }
    };
  }

  function gt(e) {
    var t = e.renderState,
        n = e.instantSearchInstance,
        r = e.parent,
        i = r ? r.getIndexId() : n.mainIndex.getIndexId();
    n.renderState = D(D({}, n.renderState), {}, M({}, i, D(D({}, n.renderState[i]), t)));
  }

  function vt(a) {
    return function () {
      var e = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          t = e.descendantName,
          n = e.modifierName,
          r = t ? "-".concat(t) : "",
          i = n ? "--".concat(n) : "";
      return "".concat("ais", "-").concat(a).concat(r).concat(i);
    };
  }

  var yt = vt("Highlight");

  function bt(e) {
    var t = e.attribute,
        n = e.highlightedTagName,
        r = void 0 === n ? "mark" : n,
        i = e.hit,
        a = e.cssClasses,
        s = void 0 === a ? {} : a,
        o = (Fe(i._highlightResult, t) || {}).value,
        c = void 0 === o ? "" : o,
        u = yt({
      descendantName: "highlighted"
    }) + (s.highlighted ? " ".concat(s.highlighted) : "");
    return c.replace(new RegExp(Be.highlightPreTag, "g"), "<".concat(r, ' class="').concat(u, '">')).replace(new RegExp(Be.highlightPostTag, "g"), "</".concat(r, ">"));
  }

  var Rt = vt("ReverseHighlight");

  function St(e) {
    var t = e.attribute,
        n = e.highlightedTagName,
        r = void 0 === n ? "mark" : n,
        i = e.hit,
        a = e.cssClasses,
        s = void 0 === a ? {} : a,
        o = (Fe(i._highlightResult, t) || {}).value,
        c = void 0 === o ? "" : o,
        u = Rt({
      descendantName: "highlighted"
    }) + (s.highlighted ? " ".concat(s.highlighted) : "");
    return Ve(Ye(Ke(c))).replace(new RegExp(Be.highlightPreTag, "g"), "<".concat(r, ' class="').concat(u, '">')).replace(new RegExp(Be.highlightPostTag, "g"), "</".concat(r, ">"));
  }

  var wt = vt("Snippet");

  function Pt(e) {
    var t = e.attribute,
        n = e.highlightedTagName,
        r = void 0 === n ? "mark" : n,
        i = e.hit,
        a = e.cssClasses,
        s = void 0 === a ? {} : a,
        o = (Fe(i._snippetResult, t) || {}).value,
        c = void 0 === o ? "" : o,
        u = wt({
      descendantName: "highlighted"
    }) + (s.highlighted ? " ".concat(s.highlighted) : "");
    return c.replace(new RegExp(Be.highlightPreTag, "g"), "<".concat(r, ' class="').concat(u, '">')).replace(new RegExp(Be.highlightPostTag, "g"), "</".concat(r, ">"));
  }

  var xt = vt("ReverseSnippet");

  function Nt(e) {
    var t = e.attribute,
        n = e.highlightedTagName,
        r = void 0 === n ? "mark" : n,
        i = e.hit,
        a = e.cssClasses,
        s = void 0 === a ? {} : a,
        o = (Fe(i._snippetResult, t) || {}).value,
        c = void 0 === o ? "" : o,
        u = xt({
      descendantName: "highlighted"
    }) + (s.highlighted ? " ".concat(s.highlighted) : "");
    return Ve(Ye(Ke(c))).replace(new RegExp(Be.highlightPreTag, "g"), "<".concat(r, ' class="').concat(u, '">')).replace(new RegExp(Be.highlightPostTag, "g"), "</".concat(r, ">"));
  }

  function _t(e, t) {
    return function (e) {
      var t,
          n = e.method,
          r = e.payload;
      if ("object" !== h(r)) throw new Error("The insights helper expects the payload to be an object.");

      try {
        t = btoa(JSON.stringify(r));
      } catch (e) {
        throw new Error("Could not JSON serialize the payload object.");
      }

      return 'data-insights-method="'.concat(n, '" data-insights-payload="').concat(t, '"');
    }({
      method: e,
      payload: t
    });
  }

  function It() {
    return function (e) {
      for (var t = "".concat(e, "="), n = document.cookie.split(";"), r = 0; r < n.length; r++) {
        for (var i = n[r]; " " === i.charAt(0);) {
          i = i.substring(1);
        }

        if (0 === i.indexOf(t)) return i.substring(t.length, i.length);
      }
    }("_ALGOLIA");
  }

  function Ft(e) {
    e.configure;
    return O(e, ["configure"]);
  }

  function Ct() {
    return {
      stateToRoute: function stateToRoute(n) {
        return Object.keys(n).reduce(function (e, t) {
          return D(D({}, e), {}, M({}, t, Ft(n[t])));
        }, {});
      },
      routeToState: function routeToState(e) {
        var n = 0 < arguments.length && void 0 !== e ? e : {};
        return Object.keys(n).reduce(function (e, t) {
          return D(D({}, e), {}, M({}, t, Ft(n[t])));
        }, {});
      }
    };
  }

  function Tt(e, t) {
    for (var n = t && t.plainObjects ? Object.create(null) : {}, r = 0; r < e.length; ++r) {
      void 0 !== e[r] && (n[r] = e[r]);
    }

    return n;
  }

  function Et(e, t) {
    zt.apply(e, Kt(t) ? t : [t]);
  }

  function kt(e, t, n, r, i, a, s, o, c, u, l, h, d) {
    var f = e;

    if ("function" == typeof s ? f = s(t, f) : f instanceof Date ? f = u(f) : "comma" === n && Kt(f) && (f = f.join(",")), null === f) {
      if (r) return a && !h ? a(t, Gt.encoder, d) : t;
      f = "";
    }

    if (function (e) {
      return "string" == typeof e || "number" == typeof e || "boolean" == typeof e || "symbol" == _typeof(e) || "bigint" == typeof e;
    }(f) || Wt.isBuffer(f)) return a ? [l(h ? t : a(t, Gt.encoder, d)) + "=" + l(a(f, Gt.encoder, d))] : [l(t) + "=" + l(String(f))];
    var m,
        p = [];
    if (void 0 === f) return p;
    if (Kt(s)) m = s;else {
      var g = Object.keys(f);
      m = o ? g.sort(o) : g;
    }

    for (var v = 0; v < m.length; ++v) {
      var y = m[v];
      i && null === f[y] || (Kt(f) ? Et(p, kt(f[y], "function" == typeof n ? n(t, y) : t, n, r, i, a, s, o, c, u, l, h, d)) : Et(p, kt(f[y], t + (c ? "." + y : "[" + y + "]"), n, r, i, a, s, o, c, u, l, h, d)));
    }

    return p;
  }

  function Lt(e, t, n) {
    if (e) {
      var r = n.allowDots ? e.replace(/\.([^.[]+)/g, "[$1]") : e,
          i = /(\[[^[\]]*])/g,
          a = 0 < n.depth && /(\[[^[\]]*])/.exec(r),
          s = a ? r.slice(0, a.index) : r,
          o = [];

      if (s) {
        if (!n.plainObjects && Zt.call(Object.prototype, s) && !n.allowPrototypes) return;
        o.push(s);
      }

      for (var c = 0; 0 < n.depth && null !== (a = i.exec(r)) && c < n.depth;) {
        if (c += 1, !n.plainObjects && Zt.call(Object.prototype, a[1].slice(1, -1)) && !n.allowPrototypes) return;
        o.push(a[1]);
      }

      return a && o.push("[" + r.slice(a.index) + "]"), function (e, t, n) {
        for (var r = t, i = e.length - 1; 0 <= i; --i) {
          var a,
              s = e[i];
          if ("[]" === s && n.parseArrays) a = [].concat(r);else {
            a = n.plainObjects ? Object.create(null) : {};
            var o = "[" === s.charAt(0) && "]" === s.charAt(s.length - 1) ? s.slice(1, -1) : s,
                c = parseInt(o, 10);
            n.parseArrays || "" !== o ? !isNaN(c) && s !== o && String(c) === o && 0 <= c && n.parseArrays && c <= n.arrayLimit ? (a = [])[c] = r : a[o] = r : a = {
              0: r
            };
          }
          r = a;
        }

        return r;
      }(o, t, n);
    }
  }

  function Mt(e) {
    var t = e.qsModule,
        n = e.routeState,
        r = e.location,
        i = r.protocol,
        a = r.hostname,
        s = r.port,
        o = void 0 === s ? "" : s,
        c = r.pathname,
        u = r.hash,
        l = t.stringify(n),
        h = "" === o ? "" : ":".concat(o);
    return l ? "".concat(i, "//").concat(a).concat(h).concat(c, "?").concat(l).concat(u) : "".concat(i, "//").concat(a).concat(h).concat(c).concat(u);
  }

  function jt(e) {
    var t = e.qsModule,
        n = e.location;
    return t.parse(n.search.slice(1), {
      arrayLimit: 99
    });
  }

  function Ot(e) {
    e && (window.document.title = e);
  }

  var At = Object.prototype.hasOwnProperty,
      Ht = Array.isArray,
      Dt = function () {
    for (var e = [], t = 0; t < 256; ++t) {
      e.push("%" + ((t < 16 ? "0" : "") + t.toString(16)).toUpperCase());
    }

    return e;
  }(),
      Wt = {
    arrayToObject: Tt,
    assign: function assign(e, n) {
      return Object.keys(n).reduce(function (e, t) {
        return e[t] = n[t], e;
      }, e);
    },
    combine: function combine(e, t) {
      return [].concat(e, t);
    },
    compact: function compact(e) {
      for (var t = [{
        obj: {
          o: e
        },
        prop: "o"
      }], n = [], r = 0; r < t.length; ++r) {
        for (var i = t[r], a = i.obj[i.prop], s = Object.keys(a), o = 0; o < s.length; ++o) {
          var c = s[o],
              u = a[c];
          "object" == _typeof(u) && null !== u && -1 === n.indexOf(u) && (t.push({
            obj: a,
            prop: c
          }), n.push(u));
        }
      }

      return function (e) {
        for (; 1 < e.length;) {
          var t = e.pop(),
              n = t.obj[t.prop];

          if (Ht(n)) {
            for (var r = [], i = 0; i < n.length; ++i) {
              void 0 !== n[i] && r.push(n[i]);
            }

            t.obj[t.prop] = r;
          }
        }
      }(t), e;
    },
    decode: function decode(e, t, n) {
      var r = e.replace(/\+/g, " ");
      if ("iso-8859-1" === n) return r.replace(/%[0-9a-f]{2}/gi, unescape);

      try {
        return decodeURIComponent(r);
      } catch (e) {
        return r;
      }
    },
    encode: function encode(e, t, n) {
      if (0 === e.length) return e;
      var r = e;
      if ("symbol" == _typeof(e) ? r = Symbol.prototype.toString.call(e) : "string" != typeof e && (r = String(e)), "iso-8859-1" === n) return escape(r).replace(/%u[0-9a-f]{4}/gi, function (e) {
        return "%26%23" + parseInt(e.slice(2), 16) + "%3B";
      });

      for (var i = "", a = 0; a < r.length; ++a) {
        var s = r.charCodeAt(a);
        45 === s || 46 === s || 95 === s || 126 === s || 48 <= s && s <= 57 || 65 <= s && s <= 90 || 97 <= s && s <= 122 ? i += r.charAt(a) : s < 128 ? i += Dt[s] : s < 2048 ? i += Dt[192 | s >> 6] + Dt[128 | 63 & s] : s < 55296 || 57344 <= s ? i += Dt[224 | s >> 12] + Dt[128 | s >> 6 & 63] + Dt[128 | 63 & s] : (a += 1, s = 65536 + ((1023 & s) << 10 | 1023 & r.charCodeAt(a)), i += Dt[240 | s >> 18] + Dt[128 | s >> 12 & 63] + Dt[128 | s >> 6 & 63] + Dt[128 | 63 & s]);
      }

      return i;
    },
    isBuffer: function isBuffer(e) {
      return !(!e || "object" != _typeof(e)) && !!(e.constructor && e.constructor.isBuffer && e.constructor.isBuffer(e));
    },
    isRegExp: function isRegExp(e) {
      return "[object RegExp]" === Object.prototype.toString.call(e);
    },
    merge: function r(i, a, s) {
      if (!a) return i;

      if ("object" != _typeof(a)) {
        if (Ht(i)) i.push(a);else {
          if (!i || "object" != _typeof(i)) return [i, a];
          (s && (s.plainObjects || s.allowPrototypes) || !At.call(Object.prototype, a)) && (i[a] = !0);
        }
        return i;
      }

      if (!i || "object" != _typeof(i)) return [i].concat(a);
      var e = i;
      return Ht(i) && !Ht(a) && (e = Tt(i, s)), Ht(i) && Ht(a) ? (a.forEach(function (e, t) {
        if (At.call(i, t)) {
          var n = i[t];
          n && "object" == _typeof(n) && e && "object" == _typeof(e) ? i[t] = r(n, e, s) : i.push(e);
        } else i[t] = e;
      }), i) : Object.keys(a).reduce(function (e, t) {
        var n = a[t];
        return At.call(e, t) ? e[t] = r(e[t], n, s) : e[t] = n, e;
      }, e);
    }
  },
      Bt = String.prototype.replace,
      Ut = /%20/g,
      Qt = {
    RFC1738: "RFC1738",
    RFC3986: "RFC3986"
  },
      qt = Wt.assign({
    default: Qt.RFC3986,
    formatters: {
      RFC1738: function RFC1738(e) {
        return Bt.call(e, Ut, "+");
      },
      RFC3986: function RFC3986(e) {
        return String(e);
      }
    }
  }, Qt),
      $t = Object.prototype.hasOwnProperty,
      Vt = {
    brackets: function brackets(e) {
      return e + "[]";
    },
    comma: "comma",
    indices: function indices(e, t) {
      return e + "[" + t + "]";
    },
    repeat: function repeat(e) {
      return e;
    }
  },
      Kt = Array.isArray,
      zt = Array.prototype.push,
      Jt = Date.prototype.toISOString,
      Yt = qt.default,
      Gt = {
    addQueryPrefix: !1,
    allowDots: !1,
    charset: "utf-8",
    charsetSentinel: !1,
    delimiter: "&",
    encode: !0,
    encoder: Wt.encode,
    encodeValuesOnly: !1,
    format: Yt,
    formatter: qt.formatters[Yt],
    indices: !1,
    serializeDate: function serializeDate(e) {
      return Jt.call(e);
    },
    skipNulls: !1,
    strictNullHandling: !1
  },
      Zt = Object.prototype.hasOwnProperty,
      Xt = {
    allowDots: !1,
    allowPrototypes: !1,
    arrayLimit: 20,
    charset: "utf-8",
    charsetSentinel: !1,
    comma: !1,
    decoder: Wt.decode,
    delimiter: "&",
    depth: 5,
    ignoreQueryPrefix: !1,
    interpretNumericEntities: !1,
    parameterLimit: 1e3,
    parseArrays: !0,
    plainObjects: !1,
    strictNullHandling: !1
  },
      en = {
    formats: qt,
    parse: function parse(e, t) {
      var n = function (e) {
        if (!e) return Xt;
        if (null !== e.decoder && void 0 !== e.decoder && "function" != typeof e.decoder) throw new TypeError("Decoder has to be a function.");
        if (void 0 !== e.charset && "utf-8" !== e.charset && "iso-8859-1" !== e.charset) throw new Error("The charset option must be either utf-8, iso-8859-1, or undefined");
        var t = void 0 === e.charset ? Xt.charset : e.charset;
        return {
          allowDots: void 0 === e.allowDots ? Xt.allowDots : !!e.allowDots,
          allowPrototypes: "boolean" == typeof e.allowPrototypes ? e.allowPrototypes : Xt.allowPrototypes,
          arrayLimit: "number" == typeof e.arrayLimit ? e.arrayLimit : Xt.arrayLimit,
          charset: t,
          charsetSentinel: "boolean" == typeof e.charsetSentinel ? e.charsetSentinel : Xt.charsetSentinel,
          comma: "boolean" == typeof e.comma ? e.comma : Xt.comma,
          decoder: "function" == typeof e.decoder ? e.decoder : Xt.decoder,
          delimiter: "string" == typeof e.delimiter || Wt.isRegExp(e.delimiter) ? e.delimiter : Xt.delimiter,
          depth: "number" == typeof e.depth || !1 === e.depth ? +e.depth : Xt.depth,
          ignoreQueryPrefix: !0 === e.ignoreQueryPrefix,
          interpretNumericEntities: "boolean" == typeof e.interpretNumericEntities ? e.interpretNumericEntities : Xt.interpretNumericEntities,
          parameterLimit: "number" == typeof e.parameterLimit ? e.parameterLimit : Xt.parameterLimit,
          parseArrays: !1 !== e.parseArrays,
          plainObjects: "boolean" == typeof e.plainObjects ? e.plainObjects : Xt.plainObjects,
          strictNullHandling: "boolean" == typeof e.strictNullHandling ? e.strictNullHandling : Xt.strictNullHandling
        };
      }(t);

      if ("" === e || null == e) return n.plainObjects ? Object.create(null) : {};

      for (var r = "string" == typeof e ? function (e, t) {
        var n,
            r = {},
            i = t.ignoreQueryPrefix ? e.replace(/^\?/, "") : e,
            a = t.parameterLimit === 1 / 0 ? void 0 : t.parameterLimit,
            s = i.split(t.delimiter, a),
            o = -1,
            c = t.charset;
        if (t.charsetSentinel) for (n = 0; n < s.length; ++n) {
          0 === s[n].indexOf("utf8=") && ("utf8=%E2%9C%93" === s[n] ? c = "utf-8" : "utf8=%26%2310003%3B" === s[n] && (c = "iso-8859-1"), o = n, n = s.length);
        }

        for (n = 0; n < s.length; ++n) {
          if (n !== o) {
            var u,
                l,
                h = s[n],
                d = h.indexOf("]="),
                f = -1 === d ? h.indexOf("=") : d + 1;
            (l = -1 === f ? (u = t.decoder(h, Xt.decoder, c), t.strictNullHandling ? null : "") : (u = t.decoder(h.slice(0, f), Xt.decoder, c), t.decoder(h.slice(f + 1), Xt.decoder, c))) && t.interpretNumericEntities && "iso-8859-1" === c && (l = l.replace(/&#(\d+);/g, function (e, t) {
              return String.fromCharCode(parseInt(t, 10));
            })), l && t.comma && -1 < l.indexOf(",") && (l = l.split(",")), Zt.call(r, u) ? r[u] = Wt.combine(r[u], l) : r[u] = l;
          }
        }

        return r;
      }(e, n) : e, i = n.plainObjects ? Object.create(null) : {}, a = Object.keys(r), s = 0; s < a.length; ++s) {
        var o = a[s],
            c = Lt(o, r[o], n);
        i = Wt.merge(i, c, n);
      }

      return Wt.compact(i);
    },
    stringify: function stringify(e, t) {
      var n,
          r = e,
          i = function (e) {
        if (!e) return Gt;
        if (null !== e.encoder && void 0 !== e.encoder && "function" != typeof e.encoder) throw new TypeError("Encoder has to be a function.");
        var t = e.charset || Gt.charset;
        if (void 0 !== e.charset && "utf-8" !== e.charset && "iso-8859-1" !== e.charset) throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
        var n = qt.default;

        if (void 0 !== e.format) {
          if (!$t.call(qt.formatters, e.format)) throw new TypeError("Unknown format option provided.");
          n = e.format;
        }

        var r = qt.formatters[n],
            i = Gt.filter;
        return "function" != typeof e.filter && !Kt(e.filter) || (i = e.filter), {
          addQueryPrefix: "boolean" == typeof e.addQueryPrefix ? e.addQueryPrefix : Gt.addQueryPrefix,
          allowDots: void 0 === e.allowDots ? Gt.allowDots : !!e.allowDots,
          charset: t,
          charsetSentinel: "boolean" == typeof e.charsetSentinel ? e.charsetSentinel : Gt.charsetSentinel,
          delimiter: void 0 === e.delimiter ? Gt.delimiter : e.delimiter,
          encode: "boolean" == typeof e.encode ? e.encode : Gt.encode,
          encoder: "function" == typeof e.encoder ? e.encoder : Gt.encoder,
          encodeValuesOnly: "boolean" == typeof e.encodeValuesOnly ? e.encodeValuesOnly : Gt.encodeValuesOnly,
          filter: i,
          formatter: r,
          serializeDate: "function" == typeof e.serializeDate ? e.serializeDate : Gt.serializeDate,
          skipNulls: "boolean" == typeof e.skipNulls ? e.skipNulls : Gt.skipNulls,
          sort: "function" == typeof e.sort ? e.sort : null,
          strictNullHandling: "boolean" == typeof e.strictNullHandling ? e.strictNullHandling : Gt.strictNullHandling
        };
      }(t);

      "function" == typeof i.filter ? r = (0, i.filter)("", r) : Kt(i.filter) && (n = i.filter);
      var a,
          s = [];
      if ("object" != _typeof(r) || null === r) return "";
      a = t && t.arrayFormat in Vt ? t.arrayFormat : t && "indices" in t ? t.indices ? "indices" : "repeat" : "indices";
      var o = Vt[a];
      n = n || Object.keys(r), i.sort && n.sort(i.sort);

      for (var c = 0; c < n.length; ++c) {
        var u = n[c];
        i.skipNulls && null === r[u] || Et(s, kt(r[u], u, o, i.strictNullHandling, i.skipNulls, i.encode ? i.encoder : null, i.filter, i.sort, i.allowDots, i.serializeDate, i.formatter, i.encodeValuesOnly, i.charset));
      }

      var l = s.join(i.delimiter),
          h = !0 === i.addQueryPrefix ? "?" : "";
      return i.charsetSentinel && ("iso-8859-1" === i.charset ? h += "utf8=%26%2310003%3B&" : h += "utf8=%E2%9C%93&"), 0 < l.length ? h + l : "";
    }
  },
      tn = function () {
    function u() {
      var e = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          t = e.windowTitle,
          n = e.writeDelay,
          r = void 0 === n ? 400 : n,
          i = e.createURL,
          a = void 0 === i ? Mt : i,
          s = e.parseURL,
          o = void 0 === s ? jt : s;
      k(this, u), M(this, "windowTitle", void 0), M(this, "writeDelay", void 0), M(this, "_createURL", void 0), M(this, "parseURL", void 0), M(this, "writeTimer", void 0), this.windowTitle = t, this.writeTimer = void 0, this.writeDelay = r, this._createURL = a, this.parseURL = o;
      var c = this.windowTitle && this.windowTitle(this.read());
      Ot(c);
    }

    return L(u, [{
      key: "read",
      value: function value() {
        return this.parseURL({
          qsModule: en,
          location: window.location
        });
      }
    }, {
      key: "write",
      value: function value(e) {
        var t = this,
            n = this.createURL(e),
            r = this.windowTitle && this.windowTitle(e);
        this.writeTimer && window.clearTimeout(this.writeTimer), this.writeTimer = window.setTimeout(function () {
          Ot(r), window.history.pushState(e, r || "", n), t.writeTimer = void 0;
        }, this.writeDelay);
      }
    }, {
      key: "onUpdate",
      value: function value(n) {
        var r = this;
        this._onPopState = function (e) {
          r.writeTimer && (window.clearTimeout(r.writeTimer), r.writeTimer = void 0);
          var t = e.state;
          n(t || r.read());
        }, window.addEventListener("popstate", this._onPopState);
      }
    }, {
      key: "createURL",
      value: function value(e) {
        return this._createURL({
          qsModule: en,
          routeState: e,
          location: window.location
        });
      }
    }, {
      key: "dispose",
      value: function value() {
        this._onPopState && window.removeEventListener("popstate", this._onPopState), this.writeTimer && window.clearTimeout(this.writeTimer), this.write({});
      }
    }]), u;
  }();

  function nn(e) {
    return new tn(e);
  }

  function rn(e) {
    var t = 0 < arguments.length && void 0 !== e ? e : {},
        n = t.router,
        a = void 0 === n ? nn() : n,
        r = t.stateMapping,
        s = void 0 === r ? Ct() : r;
    return function (e) {
      var r = e.instantSearchInstance;
      r._createURL = function (n) {
        var e = Object.keys(n).reduce(function (e, t) {
          return D(D({}, e), {}, M({}, t, n[t]));
        }, r.mainIndex.getWidgetUiState({})),
            t = s.stateToRoute(e);
        return a.createURL(t);
      }, r._initialUiState = D(D({}, r._initialUiState), s.routeToState(a.read()));
      var i = void 0;
      return {
        onStateChange: function onStateChange(e) {
          var t = e.uiState,
              n = s.stateToRoute(t);
          void 0 !== i && Le(i, n) || (a.write(n), i = n);
        },
        subscribe: function subscribe() {
          a.onUpdate(function (e) {
            r.setUiState(s.routeToState(e));
          });
        },
        unsubscribe: function unsubscribe() {
          a.dispose();
        }
      };
    };
  }

  function an() {
    return "undefined" != typeof window && -1 < window.navigator.userAgent.indexOf("Algolia Crawler");
  }

  function sn() {
    return function (e) {
      var t = e.instantSearchInstance,
          n = {
        widgets: []
      },
          r = document.createElement("meta"),
          i = document.querySelector("head");
      return r.name = "instantsearch:widgets", {
        onStateChange: function onStateChange() {},
        subscribe: function subscribe() {
          setTimeout(function () {
            !function i(e, a, s) {
              var t = a.mainIndex,
                  o = {
                instantSearchInstance: a,
                parent: t,
                scopedResults: [],
                state: t.getHelper().state,
                helper: t.getHelper(),
                createURL: t.createURL,
                uiState: a._initialUiState,
                renderState: a.renderState,
                templatesConfig: a.templatesConfig,
                searchMetadata: {
                  isSearchStalled: a._isSearchStalled
                }
              };
              e.forEach(function (e) {
                var t = {};

                if (e.getWidgetRenderState) {
                  var n = e.getWidgetRenderState(o);
                  n && n.widgetParams && (t = n.widgetParams);
                }

                var r = Object.keys(t).filter(function (e) {
                  return void 0 !== t[e];
                });
                s.widgets.push({
                  type: e.$$type,
                  widgetType: e.$$widgetType,
                  params: r
                }), "ais.index" === e.$$type && i(e.getWidgets(), a, s);
              });
            }(t.mainIndex.getWidgets(), t, n), r.content = JSON.stringify(n), i.appendChild(r);
          }, 0);
        },
        unsubscribe: function unsubscribe() {
          var e;
          null === (e = r.parentNode) || void 0 === e || e.removeChild(r);
        }
      };
    };
  }

  var on = et({
    name: "instantsearch"
  });

  function cn() {
    return "#";
  }

  function un(h, e) {
    var d = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(h, hn()), function (r) {
      var e = r || {},
          t = e.includedAttributes,
          i = void 0 === t ? [] : t,
          n = e.excludedAttributes,
          a = void 0 === n ? ["query"] : n,
          s = e.transformItems,
          o = void 0 === s ? function (e) {
        return e;
      } : s;
      if (r.includedAttributes && r.excludedAttributes) throw new Error(hn("The options `includedAttributes` and `excludedAttributes` cannot be used together."));

      function c() {
        return l.refine();
      }

      function u() {
        return l.createURL();
      }

      var l = {
        refine: Ie,
        createURL: function createURL() {
          return "";
        },
        attributesToClear: []
      };
      return {
        $$type: "ais.clearRefinements",
        init: function init(e) {
          var t = e.instantSearchInstance;
          h(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          h(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose() {
          d();
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            clearRefinements: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.createURL,
              n = e.scopedResults;
          return l.attributesToClear = n.reduce(function (e, t) {
            return e.concat(function (e) {
              var t = e.scopedResult,
                  n = e.includedAttributes,
                  r = e.excludedAttributes,
                  i = e.transformItems,
                  a = -1 !== n.indexOf("query") || -1 === r.indexOf("query");
              return {
                helper: t.helper,
                items: i(fe(Pe(t.results, t.helper.state, a).map(function (e) {
                  return e.attribute;
                }).filter(function (e) {
                  return 0 === n.length || -1 !== n.indexOf(e);
                }).filter(function (e) {
                  return "query" === e && a || -1 === r.indexOf(e);
                })))
              };
            }({
              scopedResult: t,
              includedAttributes: i,
              excludedAttributes: a,
              transformItems: o
            }));
          }, []), l.refine = function () {
            l.attributesToClear.forEach(function (e) {
              var t = e.helper,
                  n = e.items;
              t.setState(xe({
                helper: t,
                attributesToClear: n
              })).search();
            });
          }, l.createURL = function () {
            return t(Ze.apply(void 0, P(l.attributesToClear.map(function (e) {
              return xe({
                helper: e.helper,
                attributesToClear: e.items
              });
            }))));
          }, {
            hasRefinements: l.attributesToClear.some(function (e) {
              return 0 < e.items.length;
            }),
            refine: c,
            createURL: u,
            widgetParams: r
          };
        }
      };
    };
  }

  var ln = function () {
    j(R, e);
    var b = H(R);

    function R(e) {
      var n;
      k(this, R), M(A(n = b.call(this)), "client", void 0), M(A(n), "indexName", void 0), M(A(n), "insightsClient", void 0), M(A(n), "onStateChange", null), M(A(n), "helper", void 0), M(A(n), "mainHelper", void 0), M(A(n), "mainIndex", void 0), M(A(n), "started", void 0), M(A(n), "templatesConfig", void 0), M(A(n), "renderState", {}), M(A(n), "_stalledSearchDelay", void 0), M(A(n), "_searchStalledTimer", void 0), M(A(n), "_isSearchStalled", void 0), M(A(n), "_initialUiState", void 0), M(A(n), "_createURL", void 0), M(A(n), "_searchFunction", void 0), M(A(n), "_mainHelperSearch", void 0), M(A(n), "middleware", []), M(A(n), "sendEventToInsights", void 0), M(A(n), "scheduleSearch", ue(function () {
        n.started && n.mainHelper.search();
      })), M(A(n), "scheduleRender", ue(function () {
        n.mainHelper.hasPendingRequests() || (clearTimeout(n._searchStalledTimer), n._searchStalledTimer = null, n._isSearchStalled = !1), n.mainIndex.render({
          instantSearchInstance: A(n)
        }), n.emit("render");
      })), M(A(n), "onInternalStateChange", function () {
        var t = n.mainIndex.getWidgetUiState({});
        n.middleware.forEach(function (e) {
          e.onStateChange({
            uiState: t
          });
        });
      });
      var t = e.indexName,
          r = void 0 === t ? null : t,
          i = e.numberLocale,
          a = e.initialUiState,
          s = void 0 === a ? {} : a,
          o = e.routing,
          c = void 0 === o ? null : o,
          u = e.searchFunction,
          l = e.stalledSearchDelay,
          h = void 0 === l ? 200 : l,
          d = e.searchClient,
          f = void 0 === d ? null : d,
          m = e.insightsClient,
          p = void 0 === m ? null : m,
          g = e.onStateChange,
          v = void 0 === g ? null : g;
      if (null === r) throw new Error(on("The `indexName` option is required."));
      if (null === f) throw new Error(on("The `searchClient` option is required."));
      if ("function" != typeof f.search) throw new Error("The `searchClient` must implement a `search` method.\n\nSee: https://www.algolia.com/doc/guides/building-search-ui/going-further/backend-search/in-depth/backend-instantsearch/js/");
      if ("function" == typeof f.addAlgoliaAgent && f.addAlgoliaAgent("instantsearch.js (".concat("4.14.2", ")")), p && "function" != typeof p) throw new Error(on("The `insightsClient` option should be a function."));

      if (n.client = f, n.insightsClient = p, n.indexName = r, n.helper = null, n.mainHelper = null, n.mainIndex = pt({
        indexName: r
      }), n.onStateChange = v, n.started = !1, n.templatesConfig = {
        helpers: function (e) {
          var n = e.numberLocale;
          return {
            formatNumber: function formatNumber(e, t) {
              return Number(t(e)).toLocaleString(n);
            },
            highlight: function highlight(e, t) {
              try {
                return t(bt(D(D({}, JSON.parse(e)), {}, {
                  hit: this
                })));
              } catch (e) {
                throw new Error('\nThe highlight helper expects a JSON object of the format:\n{ "attribute": "name", "highlightedTagName": "mark" }');
              }
            },
            reverseHighlight: function reverseHighlight(e, t) {
              try {
                return t(St(D(D({}, JSON.parse(e)), {}, {
                  hit: this
                })));
              } catch (e) {
                throw new Error('\n  The reverseHighlight helper expects a JSON object of the format:\n  { "attribute": "name", "highlightedTagName": "mark" }');
              }
            },
            snippet: function snippet(e, t) {
              try {
                return t(Pt(D(D({}, JSON.parse(e)), {}, {
                  hit: this
                })));
              } catch (e) {
                throw new Error('\nThe snippet helper expects a JSON object of the format:\n{ "attribute": "name", "highlightedTagName": "mark" }');
              }
            },
            reverseSnippet: function reverseSnippet(e, t) {
              try {
                return t(Nt(D(D({}, JSON.parse(e)), {}, {
                  hit: this
                })));
              } catch (e) {
                throw new Error('\n  The reverseSnippet helper expects a JSON object of the format:\n  { "attribute": "name", "highlightedTagName": "mark" }');
              }
            },
            insights: function insights(e, t) {
              try {
                var n = JSON.parse(e),
                    r = n.method,
                    i = n.payload;
                return t(_t(r, D({
                  objectIDs: [this.objectID]
                }, i)));
              } catch (e) {
                throw new Error('\nThe insights helper expects a JSON object of the format:\n{ "method": "method-name", "payload": { "eventName": "name of the event" } }');
              }
            }
          };
        }({
          numberLocale: i
        }),
        compileOptions: {}
      }, n._stalledSearchDelay = h, n._searchStalledTimer = null, n._isSearchStalled = !1, n._createURL = cn, n._initialUiState = s, u && (n._searchFunction = u), n.sendEventToInsights = Ie, c) {
        var y = "boolean" == typeof c ? void 0 : c;
        n.use(rn(y));
      }

      return an() && n.use(sn()), n;
    }

    return L(R, [{
      key: "use",
      value: function value() {
        for (var n = this, e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
          t[r] = arguments[r];
        }

        var i = t.map(function (e) {
          var t = e({
            instantSearchInstance: n
          });
          return n.middleware.push(t), t;
        });
        return this.started && i.forEach(function (e) {
          e.subscribe();
        }), this;
      }
    }, {
      key: "EXPERIMENTAL_use",
      value: function value() {
        return this.use.apply(this, arguments);
      }
    }, {
      key: "addWidget",
      value: function value(e) {
        return this.addWidgets([e]);
      }
    }, {
      key: "addWidgets",
      value: function value(e) {
        if (!Array.isArray(e)) throw new Error(on("The `addWidgets` method expects an array of widgets. Please use `addWidget`."));
        if (e.some(function (e) {
          return "function" != typeof e.init && "function" != typeof e.render;
        })) throw new Error(on("The widget definition expects a `render` and/or an `init` method."));
        return this.mainIndex.addWidgets(e), this;
      }
    }, {
      key: "removeWidget",
      value: function value(e) {
        return this.removeWidgets([e]);
      }
    }, {
      key: "removeWidgets",
      value: function value(e) {
        if (!Array.isArray(e)) throw new Error(on("The `removeWidgets` method expects an array of widgets. Please use `removeWidget`."));
        if (e.some(function (e) {
          return "function" != typeof e.dispose;
        })) throw new Error(on("The widget definition expects a `dispose` method."));
        return this.mainIndex.removeWidgets(e), this;
      }
    }, {
      key: "start",
      value: function value() {
        var r = this;
        if (this.started) throw new Error(on("The `start` method has already been called once."));
        var t = ce(this.client, this.indexName);

        if (t.search = function () {
          return t.searchOnlyWithDerivedHelpers();
        }, this._searchFunction) {
          var i = {
            search: function search() {
              return new Promise(Ie);
            }
          };
          this._mainHelperSearch = t.search.bind(t), t.search = function () {
            var n = r.mainIndex.getHelper(),
                e = ce(i, n.state.index, n.state);
            return e.once("search", function (e) {
              var t = e.state;
              n.overrideStateWithoutTriggeringChangeEvent(t), r._mainHelperSearch();
            }), e.on("change", function (e) {
              var t = e.state;
              n.setState(t);
            }), r._searchFunction(e), t;
          };
        }

        t.on("error", function (e) {
          var t = e.error;
          r.emit("error", {
            error: t
          });
        }), this.mainHelper = t, this.mainIndex.init({
          instantSearchInstance: this,
          parent: null,
          uiState: this._initialUiState
        }), this.middleware.forEach(function (e) {
          e.subscribe();
        }), t.search(), this.helper = this.mainIndex.getHelper(), this.started = !0;
      }
    }, {
      key: "dispose",
      value: function value() {
        this.scheduleSearch.cancel(), this.scheduleRender.cancel(), clearTimeout(this._searchStalledTimer), this.removeWidgets(this.mainIndex.getWidgets()), this.mainIndex.dispose(), this.started = !1, this.removeAllListeners(), this.mainHelper.removeAllListeners(), this.mainHelper = null, this.helper = null, this.middleware.forEach(function (e) {
          e.unsubscribe();
        });
      }
    }, {
      key: "scheduleStalledRender",
      value: function value() {
        var e = this;
        this._searchStalledTimer || (this._searchStalledTimer = setTimeout(function () {
          e._isSearchStalled = !0, e.scheduleRender();
        }, this._stalledSearchDelay));
      }
    }, {
      key: "setUiState",
      value: function value(e) {
        if (!this.mainHelper) throw new Error(on("The `start` method needs to be called before `setUiState`."));
        this.mainIndex.refreshUiState();
        var n = "function" == typeof e ? e(this.mainIndex.getWidgetUiState({})) : e;
        !function e(t) {
          t.getHelper().overrideStateWithoutTriggeringChangeEvent(t.getWidgetSearchParameters(t.getHelper().state, {
            uiState: n[t.getIndexId()]
          })), t.getWidgets().filter(ht).forEach(e);
        }(this.mainIndex), this.scheduleSearch(), this.onInternalStateChange();
      }
    }, {
      key: "createURL",
      value: function value(e) {
        var t = 0 < arguments.length && void 0 !== e ? e : {};
        if (!this.started) throw new Error(on("The `start` method needs to be called before `createURL`."));
        return this._createURL(t);
      }
    }, {
      key: "refresh",
      value: function value() {
        if (!this.mainHelper) throw new Error(on("The `start` method needs to be called before `refresh`."));
        this.mainHelper.clearCache().search();
      }
    }]), R;
  }(),
      hn = et({
    name: "clear-refinements",
    connector: !0
  });

  function dn(r, e) {
    var i = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(r, fn()), function (a) {
      if ((a || {}).includedAttributes && (a || {}).excludedAttributes) throw new Error(fn("The options `includedAttributes` and `excludedAttributes` cannot be used together."));
      var e = a || {},
          s = e.includedAttributes,
          t = e.excludedAttributes,
          o = void 0 === t ? ["query"] : t,
          n = e.transformItems,
          c = void 0 === n ? function (e) {
        return e;
      } : n;
      return {
        $$type: "ais.currentRefinements",
        init: function init(e) {
          var t = e.instantSearchInstance;
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose() {
          i();
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            currentRefinements: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.results,
              n = e.scopedResults,
              r = e.createURL,
              i = e.helper;
          return {
            items: t ? n.reduce(function (e, t) {
              return e.concat(c(mn({
                results: t.results,
                helper: t.helper,
                includedAttributes: s,
                excludedAttributes: o
              })));
            }, []) : c(mn({
              results: {},
              helper: i,
              includedAttributes: s,
              excludedAttributes: o
            })),
            refine: function refine(e) {
              return gn(i, e);
            },
            createURL: function createURL(e) {
              return r(pn(i.state, e));
            },
            widgetParams: a
          };
        }
      };
    };
  }

  var fn = et({
    name: "current-refinements",
    connector: !0
  });

  function mn(e) {
    var t = e.results,
        n = e.helper,
        r = e.includedAttributes,
        i = e.excludedAttributes,
        a = -1 !== (r || []).indexOf("query") || -1 === (i || []).indexOf("query"),
        s = r ? function (e) {
      return -1 !== r.indexOf(e.attribute);
    } : function (e) {
      return -1 === i.indexOf(e.attribute);
    },
        o = Pe(t, n.state, a).map(vn).filter(s);
    return o.reduce(function (e, t) {
      return [].concat(P(e.filter(function (e) {
        return e.attribute !== t.attribute;
      })), [{
        indexName: n.state.index,
        attribute: t.attribute,
        label: t.attribute,
        refinements: o.filter(function (e) {
          return e.attribute === t.attribute;
        }).sort(function (e, t) {
          return "numeric" === e.type ? e.value - t.value : 0;
        }),
        refine: function refine(e) {
          return gn(n, e);
        }
      }]);
    }, []);
  }

  function pn(e, t) {
    switch (t.type) {
      case "facet":
        return e.removeFacetRefinement(t.attribute, String(t.value));

      case "disjunctive":
        return e.removeDisjunctiveFacetRefinement(t.attribute, String(t.value));

      case "hierarchical":
        return e.removeHierarchicalFacetRefinement(t.attribute);

      case "exclude":
        return e.removeExcludeRefinement(t.attribute, String(t.value));

      case "numeric":
        return e.removeNumericRefinement(t.attribute, t.operator, String(t.value));

      case "tag":
        return e.removeTagRefinement(String(t.value));

      case "query":
        return e.setQueryParameter("query", "");

      default:
        return e;
    }
  }

  function gn(e, t) {
    e.setState(pn(e.state, t)).search();
  }

  function vn(e) {
    var t = "numeric" === e.type ? Number(e.name) : e.name,
        n = e.operator ? "".concat(function (e) {
      switch (e) {
        case ">=":
          return "≥";

        case "<=":
          return "≤";

        default:
          return e;
      }
    }(e.operator), " ").concat(e.name) : e.name,
        r = {
      attribute: e.attribute,
      type: e.type,
      value: t,
      label: n
    };
    return void 0 !== e.operator && (r.operator = e.operator), void 0 !== e.count && (r.count = e.count), void 0 !== e.exhaustive && (r.exhaustive = e.exhaustive), r;
  }

  var yn = et({
    name: "hierarchical-menu",
    connector: !0
  });

  function bn(w) {
    var P = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : Ie;
    return _e(w, yn()), function () {
      var c = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          u = c.attributes,
          e = c.separator,
          l = void 0 === e ? " > " : e,
          t = c.rootPath,
          h = void 0 === t ? null : t,
          n = c.showParentLevel,
          d = void 0 === n || n,
          r = c.limit,
          f = void 0 === r ? 10 : r,
          i = c.showMore,
          m = void 0 !== i && i,
          a = c.showMoreLimit,
          p = void 0 === a ? 20 : a,
          s = c.sortBy,
          g = void 0 === s ? ["name:asc"] : s,
          o = c.transformItems,
          v = void 0 === o ? function (e) {
        return e;
      } : o;
      if (!u || !Array.isArray(u) || 0 === u.length) throw new Error(yn("The `attributes` option expects an array of strings."));
      if (!0 === m && p <= f) throw new Error(yn("The `showMoreLimit` option must be greater than `limit`."));

      var y,
          b = W(u, 1)[0],
          R = function R() {};

      function S() {
        R();
      }

      return {
        $$type: "ais.hierarchicalMenu",
        isShowingMore: !1,
        createToggleShowMore: function createToggleShowMore(e) {
          var t = this;
          return function () {
            t.isShowingMore = !t.isShowingMore, t.render(e);
          };
        },
        getLimit: function getLimit() {
          return this.isShowingMore ? p : f;
        },
        init: function init(e) {
          var t = e.instantSearchInstance;
          w(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        _prepareFacetValues: function _prepareFacetValues(e) {
          var i = this;
          return e.slice(0, this.getLimit()).map(function (e) {
            var t = e.name,
                n = e.path,
                r = O(e, ["name", "path"]);
            return Array.isArray(r.data) && (r.data = i._prepareFacetValues(r.data)), D(D({}, r), {}, {
              label: t,
              value: n
            });
          });
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          R = this.createToggleShowMore(e), w(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return P(), t.removeHierarchicalFacet(b).setQueryParameter("maxValuesPerFacet", void 0);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            hierarchicalMenu: D(D({}, e.hierarchicalMenu), {}, M({}, b, this.getWidgetRenderState(t)))
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = this,
              n = e.results,
              r = e.state,
              i = e.createURL,
              a = e.instantSearchInstance,
              s = e.helper;
          y = y || at({
            instantSearchInstance: a,
            helper: s,
            attribute: b,
            widgetType: this.$$type
          }), this._refine || (this._refine = function (e) {
            y("click", e), s.toggleRefinement(b, e).search();
          });
          var o = n && n.getFacetValues(b, {
            sortBy: g
          }).data || [];
          return {
            items: v(n ? this._prepareFacetValues(o) : []),
            refine: this._refine,
            createURL: function createURL(e) {
              return i(r.toggleRefinement(b, e));
            },
            sendEvent: y,
            widgetParams: c,
            isShowingMore: this.isShowingMore,
            toggleShowMore: S,
            canToggleShowMore: m && (this.isShowingMore || !function () {
              if (!n) return !1;
              var e = t.getLimit();
              return r.maxValuesPerFacet > e ? o.length <= e : o.length < e;
            }())
          };
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.getHierarchicalFacetBreadcrumb(b);
          return n.length ? D(D({}, e), {}, {
            hierarchicalMenu: D(D({}, e.hierarchicalMenu), {}, M({}, b, n))
          }) : e;
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = n.hierarchicalMenu && n.hierarchicalMenu[b];
          if (e.isHierarchicalFacet(b)) e.getHierarchicalFacetByName(b);
          var i = e.removeHierarchicalFacet(b).addHierarchicalFacet({
            name: b,
            attributes: u,
            separator: l,
            rootPath: h,
            showParentLevel: d
          }),
              a = i.maxValuesPerFacet || 0,
              s = Math.max(a, m ? p : f),
              o = i.setQueryParameter("maxValuesPerFacet", s);
          return r ? o.addHierarchicalFacetRefinement(b, r.join(l)) : o.setQueryParameters({
            hierarchicalFacetsRefinements: D(D({}, o.hierarchicalFacetsRefinements), {}, M({}, b, []))
          });
        }
      };
    };
  }

  function Rn(r, e) {
    var i = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(r, wn()), function (a) {
      var s,
          o,
          e = a || {},
          t = e.escapeHTML,
          c = void 0 === t || t,
          n = e.transformItems,
          u = void 0 === n ? function (e) {
        return e;
      } : n;
      return {
        $$type: "ais.hits",
        init: function init(e) {
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !0);
        },
        render: function render(e) {
          var t = this.getWidgetRenderState(e);
          t.sendEvent("view", t.hits), r(D(D({}, t), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !1);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            hits: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.results,
              n = e.helper,
              r = e.instantSearchInstance;
          if (s = s || ot({
            instantSearchInstance: r,
            index: n.getIndex(),
            widgetType: this.$$type
          }), o = o || ct({
            index: n.getIndex(),
            widgetType: this.$$type
          }), !t) return {
            hits: [],
            results: void 0,
            sendEvent: s,
            bindEvent: o,
            widgetParams: a
          };
          c && 0 < t.hits.length && (t.hits = qe(t.hits));
          var i = t.hits.__escaped;
          return t.hits = rt(t.hits, t.page, t.hitsPerPage), t.hits = it(t.hits, t.queryID), t.hits = u(t.hits), t.hits.__escaped = i, {
            hits: t.hits,
            results: t,
            sendEvent: s,
            bindEvent: o,
            widgetParams: a
          };
        },
        dispose: function dispose(e) {
          var t = e.state;
          return i(), c ? t.setQueryParameters(Object.keys(We).reduce(function (e, t) {
            return D(D({}, e), {}, M({}, t, void 0));
          }, {})) : t;
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e) {
          return c ? e.setQueryParameters(We) : e;
        }
      };
    };
  }

  function Sn(e) {
    var t = e.method,
        n = e.results,
        r = e.hits,
        i = e.objectIDs,
        a = n.index,
        s = function (n, e) {
      return e.map(function (t) {
        var e = Re(n, function (e) {
          return e.objectID === t;
        });
        if (void 0 === e) throw new Error('Could not find objectID "'.concat(t, '" passed to `clickedObjectIDsAfterSearch` in the returned hits. This is necessary to infer the absolute position and the query ID.'));
        return e;
      });
    }(r, i),
        o = function (e) {
      var t = fe(e.map(function (e) {
        return e.__queryID;
      }));
      if (1 < t.length) throw new Error("Insights currently allows a single `queryID`. The `objectIDs` provided map to multiple `queryID`s.");
      var n = t[0];
      if ("string" != typeof n) throw new Error("Could not infer `queryID`. Ensure InstantSearch `clickAnalytics: true` was added with the Configure widget.\n\nSee: https://alg.li/lNiZZ7");
      return n;
    }(s);

    switch (t) {
      case "clickedObjectIDsAfterSearch":
        return {
          index: a,
          queryID: o,
          objectIDs: i,
          positions: function (e) {
            return e.map(function (e) {
              return e.__position;
            });
          }(s)
        };

      case "convertedObjectIDsAfterSearch":
        return {
          index: a,
          queryID: o,
          objectIDs: i
        };

      default:
        throw new Error('Unsupported method passed to insights: "'.concat(t, '".'));
    }
  }

  var wn = et({
    name: "hits",
    connector: !0
  });

  function Pn(n) {
    function r(s) {
      return function (e, t) {
        var n = e.results,
            r = e.hits,
            i = e.instantSearchInstance;

        if (n && r && i) {
          var a = function (i, a, s) {
            return function (e, t) {
              if (!i) {
                var n = et({
                  name: "instantsearch"
                });
                throw new Error(n("The `insightsClient` option has not been provided to `instantsearch`."));
              }

              if (!Array.isArray(t.objectIDs)) throw new TypeError("Expected `objectIDs` to be an array.");
              var r = Sn({
                method: e,
                results: a,
                hits: s,
                objectIDs: t.objectIDs
              });
              i(e, D(D({}, r), t));
            };
          }(i.insightsClient, n, r);

          return s(D(D({}, e), {}, {
            insights: a
          }), t);
        }

        return s(e, t);
      };
    }

    return function (e, t) {
      return n(r(e), t);
    };
  }

  var xn,
      Nn,
      _n,
      In,
      Fn,
      Cn = {},
      Tn = [],
      En = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|^--/i;

  function kn(e, t) {
    for (var n in t) {
      e[n] = t[n];
    }

    return e;
  }

  function Ln(e) {
    var t = e.parentNode;
    t && t.removeChild(e);
  }

  function Mn(e, t, n) {
    var r,
        i,
        a,
        s,
        o = arguments;
    if (t = kn({}, t), 3 < arguments.length) for (n = [n], r = 3; r < arguments.length; r++) {
      n.push(o[r]);
    }
    if (null != n && (t.children = n), null != e && null != e.defaultProps) for (i in e.defaultProps) {
      void 0 === t[i] && (t[i] = e.defaultProps[i]);
    }
    return s = t.key, null != (a = t.ref) && delete t.ref, null != s && delete t.key, jn(e, t, s, a);
  }

  function jn(e, t, n, r) {
    var i = {
      type: e,
      props: t,
      key: n,
      ref: r,
      __k: null,
      __p: null,
      __b: 0,
      __e: null,
      l: null,
      __c: null,
      constructor: void 0
    };
    return xn.vnode && xn.vnode(i), i;
  }

  function On(e) {
    return e.children;
  }

  function An(e, t) {
    this.props = e, this.context = t;
  }

  function Hn(e, t) {
    if (null == t) return e.__p ? Hn(e.__p, e.__p.__k.indexOf(e) + 1) : null;

    for (var n; t < e.__k.length; t++) {
      if (null != (n = e.__k[t]) && null != n.__e) return n.__e;
    }

    return "function" == typeof e.type ? Hn(e) : null;
  }

  function Dn(e) {
    var t, n;

    if (null != (e = e.__p) && null != e.__c) {
      for (e.__e = e.__c.base = null, t = 0; t < e.__k.length; t++) {
        if (null != (n = e.__k[t]) && null != n.__e) {
          e.__e = e.__c.base = n.__e;
          break;
        }
      }

      return Dn(e);
    }
  }

  function Wn(e) {
    (!e.__d && (e.__d = !0) && 1 === Nn.push(e) || In !== xn.debounceRendering) && (In = xn.debounceRendering, (xn.debounceRendering || _n)(Bn));
  }

  function Bn() {
    var e, t, n, r, i, a, s, o;

    for (Nn.sort(function (e, t) {
      return t.__v.__b - e.__v.__b;
    }); e = Nn.pop();) {
      e.__d && (r = n = void 0, a = (i = (t = e).__v).__e, s = t.__P, o = t.u, t.u = !1, s && (n = [], r = Kn(s, i, kn({}, i), t.__n, void 0 !== s.ownerSVGElement, null, n, o, null == a ? Hn(i) : a), zn(n, i), r != a && Dn(i)));
    }
  }

  function Un(t, n, e, r, i, a, s, o, c) {
    var u,
        l,
        h,
        d,
        f,
        m,
        p,
        g = e && e.__k || Tn,
        v = g.length;
    if (o == Cn && (o = null != a ? a[0] : v ? Hn(e, 0) : null), u = 0, n.__k = Qn(n.__k, function (e) {
      if (null != e) {
        if (e.__p = n, e.__b = n.__b + 1, null === (h = g[u]) || h && e.key == h.key && e.type === h.type) g[u] = void 0;else for (l = 0; l < v; l++) {
          if ((h = g[l]) && e.key == h.key && e.type === h.type) {
            g[l] = void 0;
            break;
          }

          h = null;
        }

        if (d = Kn(t, e, h = h || Cn, r, i, a, s, null, o, c), (l = e.ref) && h.ref != l && (p = p || []).push(l, e.__c || d, e), null != d) {
          if (null == m && (m = d), null != e.l) d = e.l, e.l = null;else if (a == h || d != o || null == d.parentNode) {
            e: if (null == o || o.parentNode !== t) t.appendChild(d);else {
              for (f = o, l = 0; (f = f.nextSibling) && l < v; l += 2) {
                if (f == d) break e;
              }

              t.insertBefore(d, o);
            }

            "option" == n.type && (t.value = "");
          }
          o = d.nextSibling, "function" == typeof n.type && (n.l = d);
        }
      }

      return u++, e;
    }), n.__e = m, null != a && "function" != typeof n.type) for (u = a.length; u--;) {
      null != a[u] && Ln(a[u]);
    }

    for (u = v; u--;) {
      null != g[u] && Yn(g[u], g[u]);
    }

    if (p) for (u = 0; u < p.length; u++) {
      Jn(p[u], p[++u], p[++u]);
    }
  }

  function Qn(e, t, n) {
    if (null == n && (n = []), null == e || "boolean" == typeof e) t && n.push(t(null));else if (Array.isArray(e)) for (var r = 0; r < e.length; r++) {
      Qn(e[r], t, n);
    } else n.push(t ? t(function (e) {
      if (null == e || "boolean" == typeof e) return null;
      if ("string" == typeof e || "number" == typeof e) return jn(null, e, null, null);
      if (null == e.__e && null == e.__c) return e;
      var t = jn(e.type, e.props, e.key, null);
      return t.__e = e.__e, t;
    }(e)) : e);
    return n;
  }

  function qn(e, t, n) {
    "-" === t[0] ? e.setProperty(t, n) : e[t] = "number" == typeof n && !1 === En.test(t) ? n + "px" : null == n ? "" : n;
  }

  function $n(e, t, n, r, i) {
    var a, s, o, c, u;
    if ("key" === (t = i ? "className" === t ? "class" : t : "class" === t ? "className" : t) || "children" === t) ;else if ("style" === t) {
      if (a = e.style, "string" == typeof n) a.cssText = n;else {
        if ("string" == typeof r && (a.cssText = "", r = null), r) for (s in r) {
          n && s in n || qn(a, s, "");
        }
        if (n) for (o in n) {
          r && n[o] === r[o] || qn(a, o, n[o]);
        }
      }
    } else "o" === t[0] && "n" === t[1] ? (c = t !== (t = t.replace(/Capture$/, "")), t = ((u = t.toLowerCase()) in e ? u : t).slice(2), n ? (r || e.addEventListener(t, Vn, c), (e.t || (e.t = {}))[t] = n) : e.removeEventListener(t, Vn, c)) : "list" !== t && "tagName" !== t && "form" !== t && !i && t in e ? e[t] = null == n ? "" : n : "function" != typeof n && "dangerouslySetInnerHTML" !== t && (t !== (t = t.replace(/^xlink:?/, "")) ? null == n || !1 === n ? e.removeAttributeNS("http://www.w3.org/1999/xlink", t.toLowerCase()) : e.setAttributeNS("http://www.w3.org/1999/xlink", t.toLowerCase(), n) : null == n || !1 === n ? e.removeAttribute(t) : e.setAttribute(t, n));
  }

  function Vn(e) {
    return this.t[e.type](xn.event ? xn.event(e) : e);
  }

  function Kn(e, t, n, r, i, a, s, o, c, u) {
    var l,
        h,
        d,
        f,
        m,
        p,
        g,
        v,
        y,
        b,
        R = t.type;
    if (void 0 !== t.constructor) return null;
    (l = xn.__b) && l(t);

    try {
      e: if ("function" == typeof R) {
        if (v = t.props, y = (l = R.contextType) && r[l.__c], b = l ? y ? y.props.value : l.__p : r, n.__c ? g = (h = t.__c = n.__c).__p = h.__E : ("prototype" in R && R.prototype.render ? t.__c = h = new R(v, b) : (t.__c = h = new An(v, b), h.constructor = R, h.render = Gn), y && y.sub(h), h.props = v, h.state || (h.state = {}), h.context = b, h.__n = r, d = h.__d = !0, h.__h = []), null == h.__s && (h.__s = h.state), null != R.getDerivedStateFromProps && kn(h.__s == h.state ? h.__s = kn({}, h.__s) : h.__s, R.getDerivedStateFromProps(v, h.__s)), d) null == R.getDerivedStateFromProps && null != h.componentWillMount && h.componentWillMount(), null != h.componentDidMount && s.push(h);else {
          if (null == R.getDerivedStateFromProps && null == o && null != h.componentWillReceiveProps && h.componentWillReceiveProps(v, b), !o && null != h.shouldComponentUpdate && !1 === h.shouldComponentUpdate(v, h.__s, b)) {
            for (h.props = v, h.state = h.__s, h.__d = !1, (h.__v = t).__e = null != c ? c !== n.__e ? c : n.__e : null, t.__k = n.__k, l = 0; l < t.__k.length; l++) {
              t.__k[l] && (t.__k[l].__p = t);
            }

            break e;
          }

          null != h.componentWillUpdate && h.componentWillUpdate(v, h.__s, b);
        }

        for (f = h.props, m = h.state, h.context = b, h.props = v, h.state = h.__s, (l = xn.__r) && l(t), h.__d = !1, h.__v = t, h.__P = e, l = h.render(h.props, h.state, h.context), t.__k = Qn(null != l && l.type == On && null == l.key ? l.props.children : l), null != h.getChildContext && (r = kn(kn({}, r), h.getChildContext())), d || null == h.getSnapshotBeforeUpdate || (p = h.getSnapshotBeforeUpdate(f, m)), Un(e, t, n, r, i, a, s, c, u), h.base = t.__e; l = h.__h.pop();) {
          h.__s && (h.state = h.__s), l.call(h);
        }

        d || null == f || null == h.componentDidUpdate || h.componentDidUpdate(f, m, p), g && (h.__E = h.__p = null);
      } else t.__e = function (e, t, n, r, i, a, s, o) {
        var c,
            u,
            l,
            h,
            d = n.props,
            f = t.props;
        if (i = "svg" === t.type || i, null == e && null != a) for (c = 0; c < a.length; c++) {
          if (null != (u = a[c]) && (null === t.type ? 3 === u.nodeType : u.localName === t.type)) {
            e = u, a[c] = null;
            break;
          }
        }

        if (null == e) {
          if (null === t.type) return document.createTextNode(f);
          e = i ? document.createElementNS("http://www.w3.org/2000/svg", t.type) : document.createElement(t.type), a = null;
        }

        return null === t.type ? d !== f && (null != a && (a[a.indexOf(e)] = null), e.data = f) : t !== n && (null != a && (a = Tn.slice.call(e.childNodes)), l = (d = n.props || Cn).dangerouslySetInnerHTML, h = f.dangerouslySetInnerHTML, o || (h || l) && (h && l && h.__html == l.__html || (e.innerHTML = h && h.__html || "")), function (e, t, n, r, i) {
          var a;

          for (a in n) {
            a in t || $n(e, a, null, n[a], r);
          }

          for (a in t) {
            i && "function" != typeof t[a] || "value" === a || "checked" === a || n[a] === t[a] || $n(e, a, t[a], n[a], r);
          }
        }(e, f, d, i, o), t.__k = t.props.children, h || Un(e, t, n, r, "foreignObject" !== t.type && i, a, s, Cn, o), o || ("value" in f && void 0 !== f.value && f.value !== e.value && (e.value = null == f.value ? "" : f.value), "checked" in f && void 0 !== f.checked && f.checked !== e.checked && (e.checked = f.checked))), e;
      }(n.__e, t, n, r, i, a, s, u);

      (l = xn.diffed) && l(t);
    } catch (e) {
      xn.__e(e, t, n);
    }

    return t.__e;
  }

  function zn(e, t) {
    for (var n; n = e.pop();) {
      try {
        n.componentDidMount();
      } catch (e) {
        xn.__e(e, n.__v);
      }
    }

    xn.__c && xn.__c(t);
  }

  function Jn(e, t, n) {
    try {
      "function" == typeof e ? e(t) : e.current = t;
    } catch (e) {
      xn.__e(e, n);
    }
  }

  function Yn(e, t, n) {
    var r, i, a;

    if (xn.unmount && xn.unmount(e), (r = e.ref) && Jn(r, null, t), n || "function" == typeof e.type || (n = null != (i = e.__e)), e.__e = e.l = null, null != (r = e.__c)) {
      if (r.componentWillUnmount) try {
        r.componentWillUnmount();
      } catch (e) {
        xn.__e(e, t);
      }
      r.base = r.__P = null;
    }

    if (r = e.__k) for (a = 0; a < r.length; a++) {
      r[a] && Yn(r[a], t, n);
    }
    null != i && Ln(i);
  }

  function Gn(e, t, n) {
    return this.constructor(e, n);
  }

  function Zn(e, t, n) {
    var r, i, a;
    xn.__p && xn.__p(e, t), i = (r = n === Fn) ? null : n && n.__k || t.__k, e = Mn(On, null, [e]), a = [], Kn(t, r ? t.__k = e : (n || t).__k = e, i || Cn, Cn, void 0 !== t.ownerSVGElement, n && !r ? [n] : i ? null : Tn.slice.call(t.childNodes), a, !1, n || Cn, r), zn(a, e);
  }

  xn = {}, An.prototype.setState = function (e, t) {
    var n = this.__s !== this.state && this.__s || (this.__s = kn({}, this.state));
    "function" == typeof e && !(e = e(n, this.props)) || kn(n, e), null != e && this.__v && (this.u = !1, t && this.__h.push(t), Wn(this));
  }, An.prototype.forceUpdate = function (e) {
    this.__v && (e && this.__h.push(e), this.u = !0, Wn(this));
  }, An.prototype.render = On, Nn = [], _n = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, In = xn.debounceRendering, xn.__e = function (e, t, n) {
    for (var r; t = t.__p;) {
      if ((r = t.__c) && !r.__p) try {
        if (r.constructor && null != r.constructor.getDerivedStateFromError) r.setState(r.constructor.getDerivedStateFromError(e));else {
          if (null == r.componentDidCatch) continue;
          r.componentDidCatch(e);
        }
        return Wn(r.__E = r);
      } catch (t) {
        e = t;
      }
    }

    throw e;
  }, Fn = Cn;

  function Xn(e, t, n) {
    for (var r = e; r && !n(r);) {
      if (r === t) return null;
      r = r.parentElement;
    }

    return r;
  }

  function er(e) {
    return function (o) {
      return Mn("div", {
        onClick: function onClick(e) {
          if (o.sendEvent) {
            var t = Xn(e.target, e.currentTarget, function (e) {
              return e.hasAttribute("data-insights-event");
            });

            if (t) {
              var n = function (e) {
                var t = e.getAttribute("data-insights-event");
                if ("string" != typeof t) throw new Error("The insights middleware expects `data-insights-event` to be a base64-encoded JSON string.");

                try {
                  return JSON.parse(atob(t));
                } catch (e) {
                  throw new Error("The insights middleware was unable to parse `data-insights-event`.");
                }
              }(t);

              o.sendEvent(n);
            }
          }

          var r = Xn(e.target, e.currentTarget, function (e) {
            return function (e) {
              return e.hasAttribute("data-insights-method");
            }(e);
          });

          if (r) {
            var i = function (e) {
              var t = e.getAttribute("data-insights-method"),
                  n = e.getAttribute("data-insights-payload");
              if ("string" != typeof n) throw new Error("The insights helper expects `data-insights-payload` to be a base64-encoded JSON string.");

              try {
                return {
                  method: t,
                  payload: JSON.parse(atob(n))
                };
              } catch (e) {
                throw new Error("The insights helper was unable to parse `data-insights-payload`.");
              }
            }(r),
                a = i.method,
                s = i.payload;

            o.insights(a, s);
          }
        }
      }, Mn(e, o));
    };
  }

  function tr(l, e) {
    var h = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(l, rr()), function (a) {
      var e = a || {},
          t = e.items,
          n = e.transformItems,
          s = void 0 === n ? function (e) {
        return e;
      } : n,
          o = t;
      if (!Array.isArray(o)) throw new Error(rr("The `items` option expects an array of objects."));
      var r = o.filter(function (e) {
        return !0 === e.default;
      });
      if (0 === r.length) throw new Error(rr("A default value must be specified in `items`."));
      if (1 < r.length) throw new Error(rr("More than one default value is specified in `items`."));

      var i = r[0],
          c = function c(t) {
        return function (e) {
          return e || 0 === e ? t.setQueryParameter("hitsPerPage", e).search() : t.setQueryParameter("hitsPerPage", void 0).search();
        };
      },
          u = function u(e) {
        var t = e.state,
            n = e.createURL;
        return function (e) {
          return n(t.setQueryParameter("hitsPerPage", e || 0 === e ? e : void 0));
        };
      };

      return {
        $$type: "ais.hitsPerPage",
        init: function init(e) {
          var t = e.state,
              n = e.instantSearchInstance;
          o.some(function (e) {
            return Number(t.hitsPerPage) === Number(e.value);
          }) || (o = [{
            value: "",
            label: ""
          }].concat(P(o))), l(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: n
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          l(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return h(), t.setQueryParameter("hitsPerPage", void 0);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            hitsPerPage: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.state,
              n = e.results,
              r = e.createURL,
              i = e.helper;
          return {
            items: s(function (e) {
              var t = e.hitsPerPage;
              return o.map(function (e) {
                return D(D({}, e), {}, {
                  isRefined: Number(e.value) === Number(t)
                });
              });
            }(t)),
            refine: c(i),
            createURL: u({
              state: t,
              createURL: r
            }),
            hasNoResults: !n || 0 === n.nbHits,
            widgetParams: a
          };
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.hitsPerPage;
          return void 0 === n || n === i.value ? e : D(D({}, e), {}, {
            hitsPerPage: n
          });
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState;
          return e.setQueryParameters({
            hitsPerPage: n.hitsPerPage || i.value
          });
        }
      };
    };
  }

  var nr = Pn(Rn),
      rr = et({
    name: "hits-per-page",
    connector: !0
  }),
      ir = et({
    name: "infinite-hits",
    connector: !0
  });

  function ar(e) {
    var t = e || {};
    t.page;
    return O(t, ["page"]);
  }

  function sr(i, e) {
    var a = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(i, ir()), function (f) {
      function m(e, t) {
        var n = e.page,
            r = void 0 === n ? 0 : n,
            i = Object.keys(t).map(Number);
        return 0 === i.length ? r : Math.min.apply(Math, [r].concat(P(i)));
      }

      function p(e, t) {
        var n = e.page,
            r = void 0 === n ? 0 : n,
            i = Object.keys(t).map(Number);
        return 0 === i.length ? r : Math.max.apply(Math, [r].concat(P(i)));
      }

      var g,
          v,
          y,
          b,
          e = f || {},
          t = e.escapeHTML,
          R = void 0 === t || t,
          n = e.transformItems,
          S = void 0 === n ? function (e) {
        return e;
      } : n,
          r = e.cache,
          w = void 0 === r ? function () {
        var r = null,
            i = void 0;
        return {
          read: function read(e) {
            var t = e.state;
            return Le(i, ar(t)) ? r : null;
          },
          write: function write(e) {
            var t = e.state,
                n = e.hits;
            i = ar(t), r = n;
          }
        };
      }() : r;
      return {
        $$type: "ais.infiniteHits",
        init: function init(e) {
          i(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance,
              n = this.getWidgetRenderState(e);
          y("view", n.currentPageHits), i(D(D({}, n), {}, {
            instantSearchInstance: t
          }), !1);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            infiniteHits: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t,
              n = e.results,
              r = e.helper,
              i = e.state,
              a = e.instantSearchInstance,
              s = [],
              o = w.read({
            state: i
          }) || {};

          if (n) {
            var c = i.page,
                u = void 0 === c ? 0 : c;
            R && 0 < n.hits.length && (n.hits = qe(n.hits));
            var l = n.hits.__escaped;
            n.hits = rt(n.hits, n.page, n.hitsPerPage), n.hits = it(n.hits, n.queryID), n.hits = S(n.hits), n.hits.__escaped = l, void 0 === o[u] && (o[u] = n.hits, w.write({
              state: i,
              hits: o
            })), s = n.hits, t = 0 === m(i, o);
          } else g = function (e, t) {
            return function () {
              e.overrideStateWithoutTriggeringChangeEvent(D(D({}, e.state), {}, {
                page: m(e.state, t) - 1
              })).searchWithoutTriggeringOnStateChange();
            };
          }(r, o), v = function (e, t) {
            return function () {
              e.setPage(p(e.state, t) + 1).search();
            };
          }(r, o), y = ot({
            instantSearchInstance: a,
            index: r.getIndex(),
            widgetType: this.$$type
          }), b = ct({
            index: r.getIndex(),
            widgetType: this.$$type
          }), t = void 0 === r.state.page || 0 === m(r.state, o);

          var h = function (n) {
            return Object.keys(n).map(Number).sort(function (e, t) {
              return e - t;
            }).reduce(function (e, t) {
              return e.concat(n[t]);
            }, []);
          }(o),
              d = !n || n.nbPages <= p(i, o) + 1;

          return {
            hits: h,
            currentPageHits: s,
            sendEvent: y,
            bindEvent: b,
            results: n,
            showPrevious: g,
            showMore: v,
            isFirstPage: t,
            isLastPage: d,
            widgetParams: f
          };
        },
        dispose: function dispose(e) {
          var t = e.state;
          a();
          var n = t.setQueryParameter("page", void 0);
          return R ? n.setQueryParameters(Object.keys(We).reduce(function (e, t) {
            return D(D({}, e), {}, M({}, t, void 0));
          }, {})) : n;
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.page || 0;
          return n ? D(D({}, e), {}, {
            page: n + 1
          }) : e;
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = e;
          R && (r = e.setQueryParameters(We));
          var i = n.page ? n.page - 1 : 0;
          return r.setQueryParameter("page", i);
        }
      };
    };
  }

  var or = Pn(sr),
      cr = et({
    name: "menu",
    connector: !0
  });

  function ur(a) {
    var s = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : Ie;
    return _e(a, cr()), function () {
      var u,
          l = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          h = l.attribute,
          e = l.limit,
          c = void 0 === e ? 10 : e,
          t = l.showMore,
          d = void 0 !== t && t,
          n = l.showMoreLimit,
          f = void 0 === n ? 20 : n,
          r = l.sortBy,
          m = void 0 === r ? ["isRefined", "name:asc"] : r,
          i = l.transformItems,
          p = void 0 === i ? function (e) {
        return e;
      } : i;
      if (!h) throw new Error(cr("The `attribute` option is required."));
      if (!0 === d && f <= c) throw new Error(cr("The `showMoreLimit` option must be greater than `limit`."));

      var g = function g() {};

      function v() {
        g();
      }

      return {
        $$type: "ais.menu",
        isShowingMore: !1,
        createToggleShowMore: function createToggleShowMore(e) {
          var t = this,
              n = e.results,
              r = e.instantSearchInstance;
          return function () {
            t.isShowingMore = !t.isShowingMore, t.render({
              results: n,
              instantSearchInstance: r
            });
          };
        },
        getLimit: function getLimit() {
          return this.isShowingMore ? f : c;
        },
        init: function init(e) {
          var t = e.instantSearchInstance;
          a(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          a(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return s(), t.removeHierarchicalFacet(h).setQueryParameter("maxValuesPerFacet", void 0);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            menu: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.results,
              n = e.createURL,
              r = e.instantSearchInstance,
              i = e.helper,
              a = [],
              s = !1;

          if (u = u || at({
            instantSearchInstance: r,
            helper: i,
            attribute: h,
            widgetType: this.$$type
          }), this._createURL || (this._createURL = function (e) {
            return n(i.state.toggleRefinement(h, e));
          }), this._refine || (this._refine = function (e) {
            var t = W(i.getHierarchicalFacetBreadcrumb(h), 1)[0];
            u("click", e || t), i.toggleRefinement(h, e || t).search();
          }), g = this.createToggleShowMore({
            results: t,
            instantSearchInstance: r
          }), t) {
            var o = t.getFacetValues(h, {
              sortBy: m
            }),
                c = o && o.data ? o.data : [];
            s = d && (this.isShowingMore || c.length > this.getLimit()), a = p(c.slice(0, this.getLimit()).map(function (e) {
              var t = e.name,
                  n = e.path;
              return D(D({}, O(e, ["name", "path"])), {}, {
                label: t,
                value: n
              });
            }));
          }

          return {
            items: a,
            createURL: this._createURL,
            refine: this._refine,
            sendEvent: u,
            canRefine: 0 < a.length,
            widgetParams: l,
            isShowingMore: this.isShowingMore,
            toggleShowMore: v,
            canToggleShowMore: s
          };
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = W(t.searchParameters.getHierarchicalFacetBreadcrumb(h), 1)[0];
          return n ? D(D({}, e), {}, {
            menu: D(D({}, e.menu), {}, M({}, h, n))
          }) : e;
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = n.menu && n.menu[h],
              i = e.removeHierarchicalFacet(h).addHierarchicalFacet({
            name: h,
            attributes: [h]
          }),
              a = i.maxValuesPerFacet || 0,
              s = Math.max(a, d ? f : c),
              o = i.setQueryParameter("maxValuesPerFacet", s);
          return r ? o.addHierarchicalFacetRefinement(h, r) : o.setQueryParameters({
            hierarchicalFacetsRefinements: D(D({}, o.hierarchicalFacetsRefinements), {}, M({}, h, []))
          });
        }
      };
    };
  }

  function lr(i, e) {
    var a = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(i, hr()), function (s) {
      var e = s || {},
          t = e.attribute,
          u = void 0 === t ? "" : t,
          n = e.items,
          o = void 0 === n ? [] : n,
          r = e.transformItems,
          c = void 0 === r ? function (e) {
        return e;
      } : r;
      if ("" === u) throw new Error(hr("The `attribute` option is required."));
      if (!o || 0 === o.length) throw new Error(hr("The `items` option expects an array of objects."));
      var l = {};
      return {
        $$type: dr,
        init: function init(e) {
          var t = e.instantSearchInstance;
          i(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          i(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return a(), t.clearRefinements(u);
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.getNumericRefinements(u),
              r = n["="] && n["="][0];
          if (r || 0 === r) return D(D({}, e), {}, {
            numericMenu: D(D({}, e.numericMenu), {}, M({}, u, "".concat(n["="])))
          });
          var i = n[">="] && n[">="][0] || "",
              a = n["<="] && n["<="][0] || "";
          return "" === i && "" === a ? e : D(D({}, e), {}, {
            numericMenu: D(D({}, e.numericMenu), {}, M({}, u, "".concat(i, ":").concat(a)))
          });
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = n.numericMenu && n.numericMenu[u],
              i = e.clearRefinements(u);
          if (!r) return i.setQueryParameters({
            numericRefinements: D(D({}, i.numericRefinements), {}, M({}, u, {}))
          });
          if (-1 === r.indexOf(":")) return i.addNumericRefinement(u, "=", Number(r));
          var a = W(r.split(":").map(parseFloat), 2),
              s = a[0],
              o = a[1],
              c = Ce(s) ? i.addNumericRefinement(u, ">=", s) : i;
          return Ce(o) ? c.addNumericRefinement(u, "<=", o) : c;
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            numericMenu: D(D({}, e.numericMenu), {}, M({}, u, this.getWidgetRenderState(t)))
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.results,
              n = e.state,
              r = e.instantSearchInstance,
              i = e.helper,
              a = e.createURL;
          return l.refine || (l.refine = function (e) {
            var t = mr(i.state, u, e);
            l.sendEvent("click", e), i.setState(t).search();
          }), l.createURL || (l.createURL = function (t) {
            return function (e) {
              return a(mr(t, u, e));
            };
          }), l.sendEvent || (l.sendEvent = function (e) {
            var c = e.instantSearchInstance,
                u = e.helper,
                l = e.attribute;
            return function () {
              for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
                t[n] = arguments[n];
              }

              if (1 !== t.length) {
                var r = t[0],
                    i = t[1],
                    a = t[2],
                    s = void 0 === a ? "Filter Applied" : a;

                if ("click" === r) {
                  var o = ut(mr(u.state, l, i), l);
                  o && 0 < o.length && c.sendEventToInsights({
                    insightsMethod: "clickedFilters",
                    widgetType: dr,
                    eventType: r,
                    payload: {
                      eventName: s,
                      index: u.getIndex(),
                      filters: o
                    }
                  });
                }
              } else c.sendEventToInsights(t[0]);
            };
          }({
            instantSearchInstance: r,
            helper: i,
            attribute: u
          })), {
            createURL: l.createURL(n),
            items: c(function (i) {
              return o.map(function (e) {
                var t = e.start,
                    n = e.end,
                    r = e.label;
                return {
                  label: r,
                  value: encodeURI(JSON.stringify({
                    start: t,
                    end: n
                  })),
                  isRefined: fr(i, u, {
                    start: t,
                    end: n,
                    label: r
                  })
                };
              });
            }(n)),
            hasNoResults: !t || 0 === t.nbHits,
            refine: l.refine,
            sendEvent: l.sendEvent,
            widgetParams: s
          };
        }
      };
    };
  }

  var hr = et({
    name: "numeric-menu",
    connector: !0
  }),
      dr = "ais.numericMenu";

  function fr(e, t, n) {
    var r = e.getNumericRefinements(t);
    return void 0 !== n.start && void 0 !== n.end && n.start === n.end ? pr(r, "=", n.start) : void 0 !== n.start ? pr(r, ">=", n.start) : void 0 !== n.end ? pr(r, "<=", n.end) : void 0 === n.start && void 0 === n.end && Object.keys(r).every(function (e) {
      return 0 === (r[e] || []).length;
    });
  }

  function mr(e, t, n) {
    var r = e,
        i = JSON.parse(decodeURI(n)),
        a = r.getNumericRefinements(t);
    if (void 0 === i.start && void 0 === i.end) return r.removeNumericRefinement(t);

    if (fr(r, t, i) || (r = r.removeNumericRefinement(t)), void 0 !== i.start && void 0 !== i.end) {
      if (i.start > i.end) throw new Error("option.start should be > to option.end");
      if (i.start === i.end) return r = pr(a, "=", i.start) ? r.removeNumericRefinement(t, "=", i.start) : r.addNumericRefinement(t, "=", i.start);
    }

    return void 0 !== i.start && (r = pr(a, ">=", i.start) ? r.removeNumericRefinement(t, ">=", i.start) : r.addNumericRefinement(t, ">=", i.start)), void 0 !== i.end && (r = pr(a, "<=", i.end) ? r.removeNumericRefinement(t, "<=", i.end) : r.addNumericRefinement(t, "<=", i.end)), "number" == typeof r.page && (r.page = 0), r;
  }

  function pr(e, t, n) {
    return void 0 !== e[t] && e[t].includes(n);
  }

  function gr(n, e) {
    var r = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(n, yr()), function (o) {
      var e = o || {},
          c = e.totalPages,
          t = e.padding,
          u = new vr({
        currentPage: 0,
        total: 0,
        padding: void 0 === t ? 3 : t
      }),
          l = {};
      return {
        $$type: "ais.pagination",
        init: function init(e) {
          var t = e.instantSearchInstance;
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return r(), t.setQueryParameter("page", void 0);
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.page || 0;
          return n ? D(D({}, e), {}, {
            page: n + 1
          }) : e;
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = n.page ? n.page - 1 : 0;
          return e.setQueryParameter("page", r);
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.results,
              n = e.helper,
              r = e.createURL;
          l.refine || (l.refine = function (e) {
            n.setPage(e), n.search();
          }), l.createURL || (l.createURL = function (t) {
            return function (e) {
              return r(t.setPage(e));
            };
          });

          var i = n.state,
              a = i.page || 0,
              s = function (e) {
            var t = e.nbPages;
            return void 0 !== c ? Math.min(c, t) : t;
          }(t || {
            nbPages: 0
          });

          return u.currentPage = a, u.total = s, {
            createURL: l.createURL(i),
            refine: l.refine,
            currentRefinement: a,
            nbHits: (null == t ? void 0 : t.nbHits) || 0,
            nbPages: s,
            pages: t ? u.pages() : [],
            isFirstPage: u.isFirstPage(),
            isLastPage: u.isLastPage(),
            widgetParams: o
          };
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            pagination: this.getWidgetRenderState(t)
          });
        }
      };
    };
  }

  var vr = function () {
    function t(e) {
      k(this, t), M(this, "currentPage", void 0), M(this, "total", void 0), M(this, "padding", void 0), this.currentPage = e.currentPage, this.total = e.total, this.padding = e.padding;
    }

    return L(t, [{
      key: "pages",
      value: function value() {
        var e = this.total,
            t = this.currentPage,
            n = this.padding;
        if (0 === e) return [0];
        var r = this.nbPagesDisplayed(n, e);
        if (r === e) return Ee({
          end: e
        });
        var i = this.calculatePaddingLeft(t, n, e, r);
        return Ee({
          start: t - i,
          end: t + (r - i)
        });
      }
    }, {
      key: "nbPagesDisplayed",
      value: function value(e, t) {
        return Math.min(2 * e + 1, t);
      }
    }, {
      key: "calculatePaddingLeft",
      value: function value(e, t, n, r) {
        return e <= t ? e : n - t <= e ? r - (n - e) : t;
      }
    }, {
      key: "isLastPage",
      value: function value() {
        return this.currentPage === this.total - 1 || 0 === this.total;
      }
    }, {
      key: "isFirstPage",
      value: function value() {
        return 0 === this.currentPage;
      }
    }]), t;
  }(),
      yr = et({
    name: "pagination",
    connector: !0
  }),
      br = et({
    name: "range-input",
    connector: !0
  }, {
    name: "range-slider",
    connector: !0
  }),
      Rr = "ais.range";

  function Sr(e) {
    var t = e.min,
        n = e.max,
        r = e.precision,
        i = Math.pow(10, r);
    return {
      min: t ? Math.floor(t * i) / i : t,
      max: n ? Math.ceil(n * i) / i : n
    };
  }

  function wr(n, e) {
    var r = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(n, br()), function (o) {
      var e = o || {},
          w = e.attribute,
          P = e.min,
          x = e.max,
          t = e.precision,
          N = void 0 === t ? 0 : t;
      if (!w) throw new Error(br("The `attribute` option is required."));
      if (Ce(P) && Ce(x) && x < P) throw new Error(br("The `max` option can't be lower than `min`."));

      function f(e, t, n, r) {
        var i,
            a,
            s = e.state,
            o = t.min,
            c = t.max,
            u = W(s.getNumericRefinement(w, ">=") || [], 1)[0],
            l = W(s.getNumericRefinement(w, "<=") || [], 1)[0],
            h = void 0 === n || "" === n,
            d = void 0 === r || "" === r,
            f = Sr({
          min: h ? void 0 : parseFloat(n),
          max: d ? void 0 : parseFloat(r),
          precision: N
        }),
            m = f.min,
            p = f.max;
        i = Ce(P) || o !== m ? Ce(P) && h ? P : m : void 0, a = Ce(x) || c !== p ? Ce(x) && d ? x : p : void 0;
        var g = void 0 === i,
            v = Ce(o) && o <= i,
            y = g || Ce(i) && (!Ce(o) || v),
            b = void 0 === a,
            R = Ce(a) && a <= c,
            S = b || Ce(a) && (!Ce(c) || R);
        return (u !== i || l !== a) && y && S ? (s = s.removeNumericRefinement(w), Ce(i) && (s = s.addNumericRefinement(w, ">=", i)), Ce(a) && (s = s.addNumericRefinement(w, "<=", a)), s) : null;
      }

      function m(e, t, n, r) {
        var i = 3 < arguments.length && void 0 !== r ? r : "Filter Applied",
            a = ut(e, w);
        a && 0 < a.length && t.sendEventToInsights({
          insightsMethod: "clickedFilters",
          widgetType: Rr,
          eventType: "click",
          payload: {
            eventName: i,
            index: n.getIndex(),
            filters: a
          }
        });
      }

      var c = {
        from: function from(e) {
          return e.toLocaleString();
        },
        to: function to(e) {
          return function (e) {
            return Number(Number(e).toFixed(N));
          }(e).toLocaleString();
        }
      };

      function u(i, a, s) {
        return function () {
          var e = W(0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : [void 0, void 0], 2),
              t = e[0],
              n = e[1],
              r = f(a, s, t, n);
          r && (m(r, i, a), a.setState(r).search());
        };
      }

      return {
        $$type: Rr,
        init: function init(e) {
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !0);
        },
        render: function render(e) {
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !1);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            range: D(D({}, e.range), {}, M({}, w, this.getWidgetRenderState(t)))
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.results,
              n = e.helper,
              r = e.instantSearchInstance,
              i = Re(t && t.disjunctiveFacets || [], function (e) {
            return e.name === w;
          }),
              a = function (e) {
            return Sr({
              min: Ce(P) ? P : Ce(e.min) ? e.min : 0,
              max: Ce(x) ? x : Ce(e.max) ? e.max : 0,
              precision: N
            });
          }(i && i.stats || {
            min: void 0,
            max: void 0
          }),
              s = function (e) {
            var t = W(e.getNumericRefinement(w, ">=") || [], 1)[0],
                n = W(e.getNumericRefinement(w, "<=") || [], 1)[0];
            return [Ce(t) ? t : -1 / 0, Ce(n) ? n : 1 / 0];
          }(n);

          return {
            refine: u(r, n, t ? a : {
              min: void 0,
              max: void 0
            }),
            format: c,
            range: a,
            sendEvent: function (l, h, d) {
              return function () {
                for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
                  t[n] = arguments[n];
                }

                if (1 !== t.length) {
                  var r = t[0],
                      i = t[1],
                      a = t[2];

                  if ("click" === r) {
                    var s = W(i, 2),
                        o = s[0],
                        c = s[1],
                        u = f(h, d, o, c);
                    m(u, l, h, a);
                  }
                } else l.sendEventToInsights(t[0]);
              };
            }(r, n, a),
            widgetParams: D(D({}, o), {}, {
              precision: N
            }),
            start: s
          };
        },
        dispose: function dispose(e) {
          var t = e.state;
          return r(), t.removeDisjunctiveFacet(w).removeNumericRefinement(w);
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.getNumericRefinements(w),
              r = n[">="],
              i = void 0 === r ? [] : r,
              a = n["<="],
              s = void 0 === a ? [] : a;
          return 0 === i.length && 0 === s.length ? e : D(D({}, e), {}, {
            range: D(D({}, e.range), {}, M({}, w, "".concat(i, ":").concat(s)))
          });
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = e.addDisjunctiveFacet(w).setQueryParameters({
            numericRefinements: D(D({}, e.numericRefinements), {}, M({}, w, {}))
          });
          Ce(P) && (r = r.addNumericRefinement(w, ">=", P)), Ce(x) && (r = r.addNumericRefinement(w, "<=", x));
          var i = n.range && n.range[w];
          if (!i || -1 === i.indexOf(":")) return r;
          var a = W(i.split(":").map(parseFloat), 2),
              s = a[0],
              o = a[1];
          return Ce(s) && (!Ce(P) || P < s) && (r = (r = r.removeNumericRefinement(w, ">=")).addNumericRefinement(w, ">=", s)), Ce(o) && (!Ce(x) || o < x) && (r = (r = r.removeNumericRefinement(w, "<=")).addNumericRefinement(w, "<=", o)), r;
        }
      };
    };
  }

  var Pr = et({
    name: "refinement-list",
    connector: !0
  });

  function xr(T) {
    var o = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : Ie;
    return _e(T, Pr()), function () {
      var m = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          p = m.attribute,
          e = m.operator,
          h = void 0 === e ? "or" : e,
          t = m.limit,
          g = void 0 === t ? 10 : t,
          n = m.showMore,
          v = void 0 !== n && n,
          r = m.showMoreLimit,
          d = void 0 === r ? 20 : r,
          i = m.sortBy,
          y = void 0 === i ? ["isRefined", "count:desc", "name:asc"] : i,
          a = m.escapeFacetValues,
          b = void 0 === a || a,
          s = m.transformItems,
          R = void 0 === s ? function (e) {
        return e;
      } : s;
      if (!p) throw new Error(Pr("The `attribute` option is required."));
      if (!/^(and|or)$/.test(h)) throw new Error(Pr('The `operator` must one of: `"and"`, `"or"` (got "'.concat(h, '").')));
      if (!0 === v && d <= g) throw new Error(Pr("`showMoreLimit` should be greater than `limit`."));

      function S(e) {
        var t = e.name;
        return D(D({}, O(e, ["name"])), {}, {
          label: t,
          value: t,
          highlighted: t
        });
      }

      function w(e) {
        return e ? d : g;
      }

      var P,
          x,
          N,
          _,
          I,
          F = [],
          C = !0;

      return {
        $$type: "ais.refinementList",
        isShowingMore: !1,
        toggleShowMore: function toggleShowMore() {},
        cachedToggleShowMore: function cachedToggleShowMore() {
          I();
        },
        createToggleShowMore: function createToggleShowMore(e) {
          var t = this;
          return function () {
            t.isShowingMore = !t.isShowingMore, t.render(e);
          };
        },
        getLimit: function getLimit() {
          return w(this.isShowingMore);
        },
        init: function init(e) {
          T(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !0);
        },
        render: function render(e) {
          T(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !1);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            refinementList: D(D({}, e.refinementList), {}, M({}, p, this.getWidgetRenderState(t)))
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t,
              n = e.results,
              r = e.state,
              i = e.createURL,
              a = e.instantSearchInstance,
              s = e.isFromSearch,
              o = void 0 !== s && s,
              c = e.helper,
              u = [];

          if (_ && N && x || (_ = at({
            instantSearchInstance: a,
            helper: c,
            attribute: p,
            widgetType: this.$$type
          }), N = function N(e) {
            _("click", e), c.toggleRefinement(p, e).search();
          }, x = function (n) {
            var s = this;
            return function (a) {
              return function (e) {
                var i = a.instantSearchInstance;
                if ("" === e && F) T(D(D({}, s.getWidgetRenderState(D(D({}, a), {}, {
                  results: P
                }))), {}, {
                  instantSearchInstance: i
                }));else {
                  var t = {
                    highlightPreTag: b ? We.highlightPreTag : Be.highlightPreTag,
                    highlightPostTag: b ? We.highlightPostTag : Be.highlightPostTag
                  };
                  n.searchForFacetValues(p, e, Math.min(w(s.isShowingMore), 100), t).then(function (e) {
                    var t = b ? $e(e.facetHits) : e.facetHits,
                        n = R(t.map(function (e) {
                      var t = e.value;
                      return D(D({}, O(e, ["value"])), {}, {
                        value: t,
                        label: t
                      });
                    })),
                        r = s.isShowingMore && F.length > g;
                    T(D(D({}, s.getWidgetRenderState(D(D({}, a), {}, {
                      results: P
                    }))), {}, {
                      items: n,
                      canToggleShowMore: r,
                      canRefine: !0,
                      instantSearchInstance: i,
                      isFromSearch: !0
                    }));
                  });
                }
              };
            };
          }.call(this, c)), n) {
            u = o ? (t = b ? $e(n.facetHits) : n.facetHits, R(t.map(function (e) {
              var t = e.value;
              return D(D({}, O(e, ["value"])), {}, {
                value: t,
                label: t
              });
            }))) : (t = n.getFacetValues(p, {
              sortBy: y
            }) || [], R(t.slice(0, this.getLimit()).map(S)));
            var l = r.maxValuesPerFacet,
                h = this.getLimit();
            C = h < l ? t.length <= h : t.length < h, P = n, F = u, I = this.createToggleShowMore(e);
          }

          var d = x && x(e),
              f = this.isShowingMore && F.length > g || v && !o && !C;
          return {
            createURL: function createURL(e) {
              return i(r.toggleRefinement(p, e));
            },
            items: u,
            refine: N,
            searchForItems: d,
            isFromSearch: o,
            canRefine: o || 0 < u.length,
            widgetParams: m,
            isShowingMore: this.isShowingMore,
            canToggleShowMore: f,
            toggleShowMore: this.cachedToggleShowMore,
            sendEvent: _,
            hasExhaustiveItems: C
          };
        },
        dispose: function dispose(e) {
          var t = e.state;
          o();
          var n = t.setQueryParameter("maxValuesPerFacet", void 0);
          return "and" === h ? n.removeFacet(p) : n.removeDisjunctiveFacet(p);
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters,
              r = "or" === h ? n.getDisjunctiveRefinements(p) : n.getConjunctiveRefinements(p);
          return r.length ? D(D({}, e), {}, {
            refinementList: D(D({}, e.refinementList), {}, M({}, p, r))
          }) : e;
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = "or" === h,
              i = n.refinementList && n.refinementList[p],
              a = e.clearRefinements(p),
              s = r ? a.addDisjunctiveFacet(p) : a.addFacet(p),
              o = s.maxValuesPerFacet || 0,
              c = Math.max(o, v ? d : g),
              u = s.setQueryParameter("maxValuesPerFacet", c);
          if (i) return i.reduce(function (e, t) {
            return r ? e.addDisjunctiveFacetRefinement(p, t) : e.addFacetRefinement(p, t);
          }, u);
          var l = r ? "disjunctiveFacetsRefinements" : "facetsRefinements";
          return u.setQueryParameters(M({}, l, D(D({}, u[l]), {}, M({}, p, []))));
        }
      };
    };
  }

  var Nr = et({
    name: "search-box",
    connector: !0
  });

  function _r(n) {
    var r = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : Ie;
    return _e(n, Nr()), function () {
      var i = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          a = i.queryHook;

      var s = function s() {};

      function o() {
        s();
      }

      return {
        $$type: "ais.searchBox",
        init: function init(e) {
          var t = e.instantSearchInstance;
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return r(), t.setQueryParameter("query", void 0);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            searchBox: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.helper,
              n = e.searchMetadata;

          if (!this._refine) {
            var r = function r(e) {
              e !== t.state.query && t.setQuery(e).search();
            };

            this._refine = function (e) {
              a ? a(e, r) : r(e);
            };
          }

          return s = function (e) {
            return function () {
              e.setQuery("").search();
            };
          }(t), {
            query: t.state.query || "",
            refine: this._refine,
            clear: o,
            widgetParams: i,
            isSearchStalled: n.isSearchStalled
          };
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.query || "";
          return "" === n || e && e.query === n ? e : D(D({}, e), {}, {
            query: n
          });
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState;
          return e.setQueryParameter("query", n.query || "");
        }
      };
    };
  }

  var Ir = et({
    name: "sort-by",
    connector: !0
  });

  function Fr(o) {
    var n = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : Ie;
    return _e(o, Ir()), function () {
      var i = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          a = i.items,
          e = i.transformItems,
          s = void 0 === e ? function (e) {
        return e;
      } : e;
      if (!Array.isArray(a)) throw new Error(Ir("The `items` option expects an array of objects."));
      return {
        $$type: "ais.sortBy",
        init: function init(e) {
          var t = e.instantSearchInstance,
              n = this.getWidgetRenderState(e),
              r = n.currentRefinement;
          Re(a, function (e) {
            return e.value === r;
          });
          o(D(D({}, n), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          o(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return n(), t.setIndex(this.initialIndex);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            sortBy: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.results,
              n = e.helper,
              r = e.parent;
          return this.initialIndex || (this.initialIndex = r.getIndexName()), this.setIndex || (this.setIndex = function (e) {
            n.setIndex(e).search();
          }), {
            currentRefinement: n.state.index,
            options: s(a),
            refine: this.setIndex,
            hasNoResults: !t || 0 === t.nbHits,
            widgetParams: i
          };
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.index;
          return n === this.initialIndex ? e : D(D({}, e), {}, {
            sortBy: n
          });
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState;
          return e.setQueryParameter("index", n.sortBy || this.initialIndex || e.index);
        }
      };
    };
  }

  var Cr = et({
    name: "rating-menu",
    connector: !0
  }),
      Tr = "ais.ratingMenu",
      Er = 1,
      kr = function kr(e) {
    var o = e.instantSearchInstance,
        c = e.helper,
        u = e.getRefinedStar,
        l = e.attribute;
    return function () {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
        t[n] = arguments[n];
      }

      if (1 !== t.length) {
        var r = t[0],
            i = t[1],
            a = t[2],
            s = void 0 === a ? "Filter Applied" : a;
        if ("click" === r) u() === Number(i) || o.sendEventToInsights({
          insightsMethod: "clickedFilters",
          widgetType: Tr,
          eventType: r,
          payload: {
            eventName: s,
            index: c.getIndex(),
            filters: ["".concat(l, ">=").concat(i)]
          }
        });
      } else o.sendEventToInsights(t[0]);
    };
  };

  function Lr(n) {
    var t = this,
        r = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : Ie;
    return _e(n, Cr()), function () {
      var h,
          d = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          f = d.attribute,
          e = d.max,
          m = void 0 === e ? 5 : e;
      if (!f) throw new Error(Cr("The `attribute` option is required."));

      function p(e) {
        var t,
            n = e.getNumericRefinements(f);
        if (null !== (t = n[">="]) && void 0 !== t && t.length) return n[">="][0];
      }

      var g = function g(e) {
        return function (e, t) {
          h("click", t);
          var n = p(e.state) === Number(t);
          e.removeNumericRefinement(f), n || e.addNumericRefinement(f, "<=", m).addNumericRefinement(f, ">=", t), e.search();
        }.bind(t, e);
      },
          v = function v(e) {
        var t = e.state,
            n = e.createURL;
        return function (e) {
          return n(t.removeNumericRefinement(f).addNumericRefinement(f, "<=", m).addNumericRefinement(f, ">=", e));
        };
      };

      return {
        $$type: Tr,
        init: function init(e) {
          var t = e.instantSearchInstance;
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            ratingMenu: D(D({}, e.ratingMenu), {}, M({}, f, this.getWidgetRenderState(t)))
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.helper,
              n = e.results,
              r = e.state,
              i = e.instantSearchInstance,
              a = e.createURL,
              s = [];
          if (h = h || kr({
            instantSearchInstance: i,
            helper: t,
            getRefinedStar: function getRefinedStar() {
              return p(t.state);
            },
            attribute: f
          }), n) for (var o = n.getFacetValues(f), c = (o.length, function (e) {
            var r = 0;
            e.forEach(function (e) {
              var t = W(e.name.split("."), 2)[1],
                  n = void 0 === t ? "" : t;
              r = Math.max(r, n.length);
            });
          }(o), p(r)), u = function u(n) {
            var e = c === n,
                t = o.filter(function (e) {
              return Number(e.name) >= n && Number(e.name) <= m;
            }).map(function (e) {
              return e.count;
            }).reduce(function (e, t) {
              return e + t;
            }, 0);
            if (c && !e && 0 === t) return "continue";
            var r = P(new Array(Math.floor(m / Er))).map(function (e, t) {
              return t * Er < n;
            });
            s.push({
              stars: r,
              name: String(n),
              value: String(n),
              count: t,
              isRefined: e
            });
          }, l = Er; l < m; l += Er) {
            u(l);
          }
          return {
            items: s = s.reverse(),
            hasNoResults: !n || 0 === n.nbHits,
            refine: g(t),
            sendEvent: h,
            createURL: v({
              state: r,
              createURL: a
            }),
            widgetParams: d
          };
        },
        dispose: function dispose(e) {
          var t = e.state;
          return r(), t.removeNumericRefinement(f);
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters,
              r = p(n);
          return "number" != typeof r ? e : D(D({}, e), {}, {
            ratingMenu: D(D({}, e.ratingMenu), {}, M({}, f, r))
          });
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = n.ratingMenu && n.ratingMenu[f],
              i = e.clearRefinements(f).addDisjunctiveFacet(f);
          return r ? i.addNumericRefinement(f, "<=", m).addNumericRefinement(f, ">=", r) : i.setQueryParameters({
            numericRefinements: D(D({}, i.numericRefinements), {}, M({}, f, []))
          });
        }
      };
    };
  }

  var Mr = et({
    name: "stats",
    connector: !0
  });

  function jr(n) {
    var e = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : Ie;
    return _e(n, Mr()), function () {
      var r = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
      return {
        $$type: "ais.stats",
        init: function init(e) {
          var t = e.instantSearchInstance;
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          n(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose() {
          e();
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            stats: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.results,
              n = e.helper;
          return t ? {
            hitsPerPage: t.hitsPerPage,
            nbHits: t.nbHits,
            nbPages: t.nbPages,
            page: t.page,
            processingTimeMS: t.processingTimeMS,
            query: t.query,
            widgetParams: r
          } : {
            hitsPerPage: n.state.hitsPerPage,
            nbHits: 0,
            nbPages: 0,
            page: n.state.page || 0,
            processingTimeMS: -1,
            query: n.state.query || "",
            widgetParams: r
          };
        }
      };
    };
  }

  var Or = et({
    name: "toggle-refinement",
    connector: !0
  }),
      Ar = "ais.toggleRefinement",
      Hr = function Hr(e) {
    var o = e.instantSearchInstance,
        c = e.attribute,
        u = e.on,
        l = e.helper;
    return function () {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
        t[n] = arguments[n];
      }

      if (1 !== t.length) {
        var r = t[0],
            i = t[1],
            a = t[2],
            s = void 0 === a ? "Filter Applied" : a;
        "click" === r && void 0 !== u && (i || o.sendEventToInsights({
          insightsMethod: "clickedFilters",
          widgetType: Ar,
          eventType: r,
          payload: {
            eventName: s,
            index: l.getIndex(),
            filters: u.map(function (e) {
              return "".concat(c, ":").concat(e);
            })
          }
        }));
      } else o.sendEventToInsights(t[0]);
    };
  };

  function Dr(r) {
    var i = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : Ie;
    return _e(r, Or()), function () {
      var f = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          m = f.attribute,
          e = f.on,
          t = void 0 === e || e,
          n = f.off;
      if (!m) throw new Error(Or("The `attribute` option is required."));

      var p,
          g = void 0 !== n,
          v = void 0 !== t ? Xe(t).map(Ne) : void 0,
          y = g ? Xe(n).map(Ne) : void 0,
          b = function b(n, e) {
        var r = e.state,
            i = e.createURL;
        return function () {
          var e = n ? v : y;
          e && e.forEach(function (e) {
            r.removeDisjunctiveFacetRefinement(m, e);
          });
          var t = n ? y : v;
          return t && t.forEach(function (e) {
            r.addDisjunctiveFacetRefinement(m, e);
          }), i(r);
        };
      };

      return {
        $$type: Ar,
        init: function init(e) {
          var t = e.instantSearchInstance;
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return i(), t.removeDisjunctiveFacet(m);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            toggleRefinement: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.state,
              n = e.helper,
              r = e.results,
              i = e.createURL,
              a = e.instantSearchInstance,
              s = r ? null == v ? void 0 : v.every(function (e) {
            return n.state.isDisjunctiveFacetRefined(m, e);
          }) : null == v ? void 0 : v.every(function (e) {
            return t.isDisjunctiveFacetRefined(m, e);
          }),
              o = {
            isRefined: s,
            count: 0
          },
              c = {
            isRefined: g && !s,
            count: 0
          };

          if (r) {
            var u = Xe(y || !1),
                l = r.getFacetValues(m) || [],
                h = null == v ? void 0 : v.map(function (t) {
              return Re(l, function (e) {
                return e.name === Se(t);
              });
            }).filter(function (e) {
              return void 0 !== e;
            }),
                d = g ? u.map(function (t) {
              return Re(l, function (e) {
                return e.name === Se(t);
              });
            }).filter(function (e) {
              return void 0 !== e;
            }) : [];
            o = {
              isRefined: !!h.length && h.every(function (e) {
                return e.isRefined;
              }),
              count: h.reduce(function (e, t) {
                return e + t.count;
              }, 0) || null
            }, c = {
              isRefined: !!d.length && d.every(function (e) {
                return e.isRefined;
              }),
              count: d.reduce(function (e, t) {
                return e + t.count;
              }, 0) || l.reduce(function (e, t) {
                return e + t.count;
              }, 0)
            };
          } else g && !s && (y && y.forEach(function (e) {
            return n.addDisjunctiveFacetRefinement(m, e);
          }), n.setPage(n.state.page));

          return p = p || Hr({
            instantSearchInstance: a,
            attribute: m,
            on: v,
            helper: n
          }), {
            value: {
              name: m,
              isRefined: s,
              count: r ? (s ? c : o).count : null,
              onFacetValue: o,
              offFacetValue: c
            },
            state: t,
            createURL: b(s, {
              state: t,
              createURL: i
            }),
            sendEvent: p,
            refine: function (t) {
              return function () {
                var e = (0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}).isRefined;
                e ? (v.forEach(function (e) {
                  return t.removeDisjunctiveFacetRefinement(m, e);
                }), g && y.forEach(function (e) {
                  return t.addDisjunctiveFacetRefinement(m, e);
                })) : (p("click", e), g && y.forEach(function (e) {
                  return t.removeDisjunctiveFacetRefinement(m, e);
                }), v.forEach(function (e) {
                  return t.addDisjunctiveFacetRefinement(m, e);
                })), t.search();
              };
            }(n),
            widgetParams: f
          };
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters,
              r = v && v.every(function (e) {
            return n.isDisjunctiveFacetRefined(m, e);
          });
          return r ? D(D({}, e), {}, {
            toggle: D(D({}, e.toggle), {}, M({}, m, r))
          }) : e;
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState,
              r = e.clearRefinements(m).addDisjunctiveFacet(m);
          return Boolean(n.toggle && n.toggle[m]) ? (v && v.forEach(function (e) {
            r = r.addDisjunctiveFacetRefinement(m, e);
          }), r) : g ? (y && y.forEach(function (e) {
            r = r.addDisjunctiveFacetRefinement(m, e);
          }), r) : r.setQueryParameters({
            disjunctiveFacetsRefinements: D(D({}, e.disjunctiveFacetsRefinements), {}, M({}, m, []))
          });
        }
      };
    };
  }

  function Wr(l, e) {
    var h = 1 < arguments.length && void 0 !== e ? e : Ie;

    _e(l, Br());

    var d = {};
    return function (s) {
      var e = s || {},
          t = e.attributes,
          n = e.separator,
          r = void 0 === n ? " > " : n,
          i = e.rootPath,
          a = void 0 === i ? null : i,
          o = e.transformItems,
          c = void 0 === o ? function (e) {
        return e;
      } : o;
      if (!t || !Array.isArray(t) || 0 === t.length) throw new Error(Br("The `attributes` option expects an array of strings."));
      var u = W(t, 1)[0];
      return {
        $$type: "ais.breadcrumb",
        init: function init(e) {
          l(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !0);
        },
        render: function render(e) {
          l(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: e.instantSearchInstance
          }), !1);
        },
        dispose: function dispose() {
          h();
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            breadcrumb: D(D({}, e.breadcrumb), {}, M({}, u, this.getWidgetRenderState(t)))
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var n = e.helper,
              r = e.createURL,
              i = e.results,
              a = e.state;

          var t = function () {
            if (!i) return [];
            var e = W(a.hierarchicalFacets, 1)[0].name,
                t = i.getFacetValues(e, {}),
                n = Array.isArray(t.data) ? t.data : [];
            return c(function (n) {
              return n.map(function (e, t) {
                return {
                  label: e.label,
                  value: t + 1 === n.length ? null : n[t + 1].value
                };
              });
            }(function n(e) {
              return e.reduce(function (e, t) {
                return t.isRefined && (e.push({
                  label: t.name,
                  value: t.path
                }), Array.isArray(t.data) && (e = e.concat(n(t.data)))), e;
              }, []);
            }(n)));
          }();

          return d.createURL || (d.createURL = function (e) {
            if (!e) {
              var t = n.getHierarchicalFacetBreadcrumb(u);
              if (0 < t.length) return r(n.state.toggleFacetRefinement(u, t[0]));
            }

            return r(n.state.toggleFacetRefinement(u, e));
          }), d.refine || (d.refine = function (e) {
            if (e) n.toggleRefinement(u, e).search();else {
              var t = n.getHierarchicalFacetBreadcrumb(u);
              0 < t.length && n.toggleRefinement(u, t[0]).search();
            }
          }), {
            canRefine: 0 < t.length,
            createURL: d.createURL,
            items: t,
            refine: d.refine,
            widgetParams: s
          };
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e) {
          if (e.isHierarchicalFacet(u)) {
            e.getHierarchicalFacetByName(u);
            return e;
          }

          return e.addHierarchicalFacet({
            name: u,
            attributes: t,
            separator: r,
            rootPath: a
          });
        }
      };
    };
  }

  var Br = et({
    name: "breadcrumb",
    connector: !0
  });

  function Ur(v, e) {
    var r = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(v, qr()), function () {
      function s(e) {
        return e.aroundLatLng && function (e) {
          var t = e.match(tt);
          if (!t) throw new Error('Invalid value for "aroundLatLng" parameter: "'.concat(e, '"'));
          return {
            lat: parseFloat(t[1]),
            lng: parseFloat(t[2])
          };
        }(e.aroundLatLng);
      }

      function o() {
        return g.internalToggleRefineOnMapMove();
      }

      function c(e, t) {
        return function () {
          g.isRefineOnMapMove = !g.isRefineOnMapMove, e(t);
        };
      }

      function u() {
        return g.isRefineOnMapMove;
      }

      function l() {
        return g.internalSetMapMoveSinceLastRefine();
      }

      function h(t, n) {
        return function () {
          var e = !0 !== g.hasMapMoveSinceLastRefine;
          g.hasMapMoveSinceLastRefine = !0, e && t(n);
        };
      }

      function d() {
        return g.hasMapMoveSinceLastRefine;
      }

      var f,
          m = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {},
          e = m.enableRefineOnMapMove,
          t = void 0 === e || e,
          n = m.transformItems,
          p = void 0 === n ? function (e) {
        return e;
      } : n,
          g = {
        isRefineOnMapMove: t,
        hasMapMoveSinceLastRefine: !1,
        lastRefinePosition: "",
        lastRefineBoundingBox: "",
        internalToggleRefineOnMapMove: Ie,
        internalSetMapMoveSinceLastRefine: Ie
      };
      return {
        $$type: $r,
        init: function init(e) {
          var t = e.instantSearchInstance;
          g.internalToggleRefineOnMapMove = c(Ie, e), g.internalSetMapMoveSinceLastRefine = h(Ie, e), v(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.helper,
              n = e.instantSearchInstance,
              r = t.state,
              i = Boolean(r.aroundLatLng) && Boolean(g.lastRefinePosition) && r.aroundLatLng !== g.lastRefinePosition,
              a = !r.insideBoundingBox && Boolean(g.lastRefineBoundingBox) && r.insideBoundingBox !== g.lastRefineBoundingBox;
          (i || a) && (g.hasMapMoveSinceLastRefine = !1), g.lastRefinePosition = r.aroundLatLng || "", g.lastRefineBoundingBox = r.insideBoundingBox || "", g.internalToggleRefineOnMapMove = c(this.render.bind(this), e), g.internalSetMapMoveSinceLastRefine = h(this.render.bind(this), e);
          var s = this.getWidgetRenderState(e);
          f("view", s.items), v(D(D({}, s), {}, {
            instantSearchInstance: n
          }), !1);
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.helper,
              n = e.results,
              r = e.instantSearchInstance,
              i = t.state,
              a = n ? p(n.hits.filter(function (e) {
            return e._geoloc;
          })) : [];
          return f = f || ot({
            instantSearchInstance: r,
            index: t.getIndex(),
            widgetType: $r
          }), {
            items: a,
            position: s(i),
            currentRefinement: function (e) {
              return e.insideBoundingBox && nt(e.insideBoundingBox);
            }(i),
            refine: function (i) {
              return function (e) {
                var t = e.northEast,
                    n = e.southWest,
                    r = [t.lat, t.lng, n.lat, n.lng].join();
                i.setQueryParameter("insideBoundingBox", r).search(), g.hasMapMoveSinceLastRefine = !1, g.lastRefineBoundingBox = r;
              };
            }(t),
            sendEvent: f,
            clearMapRefinement: function (e) {
              return function () {
                e.setQueryParameter("insideBoundingBox", void 0).search();
              };
            }(t),
            isRefinedWithMap: function (e) {
              return function () {
                return Boolean(e.insideBoundingBox);
              };
            }(i),
            toggleRefineOnMapMove: o,
            isRefineOnMapMove: u,
            setMapMoveSinceLastRefine: l,
            hasMapMoveSinceLastRefine: d,
            widgetParams: m
          };
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            geoSearch: this.getWidgetRenderState(t)
          });
        },
        dispose: function dispose(e) {
          var t = e.state;
          return r(), t.setQueryParameter("insideBoundingBox", void 0);
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.insideBoundingBox;
          return !n || e && e.geoSearch && e.geoSearch.boundingBox === n ? e : D(D({}, e), {}, {
            geoSearch: {
              boundingBox: n
            }
          });
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState;
          return n && n.geoSearch ? e.setQueryParameter("insideBoundingBox", n.geoSearch.boundingBox) : e.setQueryParameter("insideBoundingBox", void 0);
        }
      };
    };
  }

  function Qr(r, e) {
    var i = 1 < arguments.length && void 0 !== e ? e : Ie;

    _e(r, Vr());

    var a = "https://www.algolia.com/?utm_source=instantsearch.js&utm_medium=website&" + "utm_content=".concat("undefined" != typeof window && window.location ? window.location.hostname : "", "&") + "utm_campaign=poweredby";
    return function (e) {
      var t = (e || {}).url,
          n = void 0 === t ? a : t;
      return {
        $$type: "ais.poweredBy",
        init: function init(e) {
          var t = e.instantSearchInstance;
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            poweredBy: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState() {
          return {
            url: n,
            widgetParams: e
          };
        },
        dispose: function dispose() {
          i();
        }
      };
    };
  }

  var qr = et({
    name: "geo-search",
    connector: !0
  }),
      $r = "ais.geoSearch",
      Vr = et({
    name: "powered-by",
    connector: !0
  }),
      Kr = et({
    name: "configure",
    connector: !0
  });

  function zr(e, t) {
    return e.setQueryParameters(Object.keys(t.searchParameters).reduce(function (e, t) {
      return D(D({}, e), {}, M({}, t, void 0));
    }, {}));
  }

  function Jr(e, t) {
    var r = 0 < arguments.length && void 0 !== e ? e : Ie,
        a = 1 < arguments.length && void 0 !== t ? t : Ie;
    return function (i) {
      if (!i || !Te(i.searchParameters)) throw new Error(Kr("The `searchParameters` option expects an object."));
      var n = {};
      return {
        $$type: "ais.configure",
        init: function init(e) {
          var t = e.instantSearchInstance;
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          r(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        dispose: function dispose(e) {
          var t = e.state;
          return a(), zr(t, i);
        },
        getRenderState: function getRenderState(e, t) {
          var n,
              r = this.getWidgetRenderState(t);
          return D(D({}, e), {}, {
            configure: D(D({}, r), {}, {
              widgetParams: D(D({}, r.widgetParams), {}, {
                searchParameters: Ze(new ce.SearchParameters(null === (n = e.configure) || void 0 === n ? void 0 : n.widgetParams.searchParameters), new ce.SearchParameters(r.widgetParams.searchParameters)).getQueryParams()
              })
            })
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = e.helper;
          return n.refine || (n.refine = function (r) {
            return function (e) {
              var t = zr(r.state, i),
                  n = Ze(t, new ce.SearchParameters(e));
              i.searchParameters = e, r.setState(n).search();
            };
          }(t)), {
            refine: n.refine,
            widgetParams: i
          };
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState;
          return Ze(e, new ce.SearchParameters(D(D({}, n.configure), i.searchParameters)));
        },
        getWidgetUiState: function getWidgetUiState(e) {
          return D(D({}, e), {}, {
            configure: D(D({}, e.configure), i.searchParameters)
          });
        }
      };
    };
  }

  var Yr = et({
    name: "configure-related-items",
    connector: !0
  });

  function Gr(e) {
    var t = e.attributeName,
        n = e.attributeValue,
        r = e.attributeScore;
    return "".concat(t, ":").concat(n, "<score=").concat(r || 1, ">");
  }

  function Zr(c, u) {
    return function (e) {
      var t = e || {},
          a = t.hit,
          s = t.matchingPatterns,
          n = t.transformSearchParameters,
          r = void 0 === n ? function (e) {
        return e;
      } : n;
      if (!a) throw new Error(Yr("The `hit` option is required."));
      if (!s) throw new Error(Yr("The `matchingPatterns` option is required."));
      var i = Object.keys(s).reduce(function (e, t) {
        var n = s[t],
            r = Fe(a, t),
            i = n.score;
        return Array.isArray(r) ? [].concat(P(e), [r.map(function (e) {
          return Gr({
            attributeName: t,
            attributeValue: e,
            attributeScore: i
          });
        })]) : "string" == typeof r ? [].concat(P(e), [Gr({
          attributeName: t,
          attributeValue: r,
          attributeScore: i
        })]) : e;
      }, []),
          o = D({}, r(new ce.SearchParameters({
        sumOrFiltersScores: !0,
        facetFilters: ["objectID:-".concat(a.objectID)],
        optionalFilters: i
      })));
      return D(D({}, Jr(c, u)({
        searchParameters: o
      })), {}, {
        $$type: "ais.configureRelatedItems"
      });
    };
  }

  var Xr = et({
    name: "autocomplete",
    connector: !0
  }),
      ei = et({
    name: "query-rules",
    connector: !0
  });

  function ti(e) {
    var t = this.helper,
        n = this.initialRuleContexts,
        r = this.trackedFilters,
        i = this.transformRuleContexts,
        a = e.state,
        s = a.ruleContexts || [],
        o = function (e) {
      var i = e.helper,
          a = e.sharedHelperState,
          s = e.trackedFilters;
      return Object.keys(s).reduce(function (e, t) {
        var n = Pe(i.lastResults || {}, a, !0).filter(function (e) {
          return e.attribute === t;
        }).map(function (e) {
          return e.numericValue || e.name;
        }),
            r = (0, s[t])(n);
        return [].concat(P(e), P(n.filter(function (e) {
          return r.includes(e);
        }).map(function (e) {
          return function (e) {
            return e.replace(/[^a-z0-9-_]+/gi, "_");
          }("ais-".concat(t, "-").concat(e));
        })));
      }, []);
    }({
      helper: t,
      sharedHelperState: a,
      trackedFilters: r
    }),
        c = i([].concat(P(n), P(o))).slice(0, 10);

    Le(s, c) || t.overrideStateWithoutTriggeringChangeEvent(D(D({}, a), {}, {
      ruleContexts: c
    }));
  }

  function ni(h, e) {
    var d = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(h, ei()), function (i) {
      var e = i || {},
          t = e.trackedFilters,
          a = void 0 === t ? {} : t,
          n = e.transformRuleContexts,
          s = void 0 === n ? function (e) {
        return e;
      } : n,
          r = e.transformItems,
          o = void 0 === r ? function (e) {
        return e;
      } : r;
      Object.keys(a).forEach(function (e) {
        if ("function" != typeof a[e]) throw new Error(ei("'The \"".concat(e, '" filter value in the `trackedFilters` option expects a function.')));
      });
      var c,
          u = 0 < Object.keys(a).length,
          l = [];
      return {
        $$type: "ais.queryRules",
        init: function init(e) {
          var t = e.helper,
              n = e.state,
              r = e.instantSearchInstance;
          l = n.ruleContexts || [], c = ti.bind({
            helper: t,
            initialRuleContexts: l,
            trackedFilters: a,
            transformRuleContexts: s
          }), u && ((function (e) {
            return [e.disjunctiveFacetsRefinements, e.facetsRefinements, e.hierarchicalFacetsRefinements, e.numericRefinements].some(function (e) {
              return Boolean(e && 0 < Object.keys(e).length);
            });
          }(n) || Boolean(i.transformRuleContexts)) && c({
            state: n
          }), t.on("change", c)), h(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: r
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          h(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = (e.results || {}).userData;
          return {
            items: o(void 0 === t ? [] : t),
            widgetParams: i
          };
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            queryRules: this.getWidgetRenderState(t)
          });
        },
        dispose: function dispose(e) {
          var t = e.helper,
              n = e.state;
          return d(), u ? (t.removeListener("change", c), n.setQueryParameter("ruleContexts", l)) : n;
        }
      };
    };
  }

  function ri(e) {
    function t(e) {
      return {
        status: e,
        transcript: "",
        isSpeechFinal: !1,
        errorCode: void 0
      };
    }

    function n(e) {
      var t = 0 < arguments.length && void 0 !== e ? e : {};
      p = D(D({}, p), t), f();
    }

    function r(e) {
      n(t(0 < arguments.length && void 0 !== e ? e : "initial"));
    }

    function i() {
      n({
        status: "waiting"
      });
    }

    function a(e) {
      n({
        status: "error",
        errorCode: e.error
      });
    }

    function s(e) {
      n({
        status: "recognizing",
        transcript: e.results[0] && e.results[0][0] && e.results[0][0].transcript || "",
        isSpeechFinal: e.results[0] && e.results[0].isFinal
      }), l && p.transcript && d(p.transcript);
    }

    function o() {
      p.errorCode || !p.transcript || l || d(p.transcript), "error" !== p.status && n({
        status: "finished"
      });
    }

    function c() {
      u && (u.stop(), u.removeEventListener("start", i), u.removeEventListener("error", a), u.removeEventListener("result", s), u.removeEventListener("end", o), u = void 0);
    }

    var u,
        l = e.searchAsYouSpeak,
        h = e.language,
        d = e.onQueryChange,
        f = e.onStateChange,
        m = window.webkitSpeechRecognition || window.SpeechRecognition,
        p = t("initial");
    return {
      getState: function getState() {
        return p;
      },
      isBrowserSupported: function isBrowserSupported() {
        return Boolean(m);
      },
      isListening: function isListening() {
        return "askingPermission" === p.status || "waiting" === p.status || "recognizing" === p.status;
      },
      startListening: function startListening() {
        (u = new m()) && (r("askingPermission"), u.interimResults = !0, h && (u.lang = h), u.addEventListener("start", i), u.addEventListener("error", a), u.addEventListener("result", s), u.addEventListener("end", o), u.start());
      },
      stopListening: function stopListening() {
        c(), r("finished");
      },
      dispose: c
    };
  }

  function ii(p, e) {
    var a = 1 < arguments.length && void 0 !== e ? e : Ie;
    return _e(p, ai()), function (l) {
      var e = l.searchAsYouSpeak,
          h = void 0 !== e && e,
          d = l.language,
          f = l.additionalQueryParameters,
          t = l.createVoiceSearchHelper,
          m = void 0 === t ? ri : t;
      return {
        $$type: "ais.voiceSearch",
        init: function init(e) {
          var t = e.instantSearchInstance;
          p(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !0);
        },
        render: function render(e) {
          var t = e.instantSearchInstance;
          p(D(D({}, this.getWidgetRenderState(e)), {}, {
            instantSearchInstance: t
          }), !1);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            voiceSearch: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState(e) {
          var t = this,
              n = e.helper,
              r = e.instantSearchInstance;
          this._refine || (this._refine = function (e) {
            if (e !== n.state.query) {
              var t = d ? [d.split("-")[0]] : void 0;
              n.setQueryParameter("queryLanguages", t), "function" == typeof f && n.setState(n.state.setQueryParameters(D({
                ignorePlurals: !0,
                removeStopWords: !0,
                optionalWords: e
              }, f({
                query: e
              })))), n.setQuery(e).search();
            }
          }), this._voiceSearchHelper || (this._voiceSearchHelper = m({
            searchAsYouSpeak: h,
            language: d,
            onQueryChange: function onQueryChange(e) {
              return t._refine(e);
            },
            onStateChange: function onStateChange() {
              p(D(D({}, t.getWidgetRenderState(e)), {}, {
                instantSearchInstance: r
              }), !1);
            }
          }));
          var i = this._voiceSearchHelper,
              a = i.isBrowserSupported,
              s = i.isListening,
              o = i.startListening,
              c = i.stopListening,
              u = i.getState;
          return {
            isBrowserSupported: a(),
            isListening: s(),
            toggleListening: function toggleListening() {
              a() && (s() ? c() : o());
            },
            voiceListeningState: u(),
            widgetParams: l
          };
        },
        dispose: function dispose(e) {
          var t = e.state;
          this._voiceSearchHelper.dispose(), a();
          var n = t;

          if ("function" == typeof f) {
            var r = f({
              query: ""
            }),
                i = r ? Object.keys(r).reduce(function (e, t) {
              return e[t] = void 0, e;
            }, {}) : {};
            n = t.setQueryParameters(D({
              queryLanguages: void 0,
              ignorePlurals: void 0,
              removeStopWords: void 0,
              optionalWords: void 0
            }, i));
          }

          return n.setQueryParameter("query", void 0);
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.query || "";
          return n ? D(D({}, e), {}, {
            query: n
          }) : e;
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState;
          return e.setQueryParameter("query", n.query || "");
        }
      };
    };
  }

  var ai = et({
    name: "voice-search",
    connector: !0
  }),
      si = Object.freeze({
    __proto__: null,
    connectClearRefinements: un,
    connectCurrentRefinements: dn,
    connectHierarchicalMenu: bn,
    connectHits: Rn,
    connectHitsWithInsights: nr,
    connectHitsPerPage: tr,
    connectInfiniteHits: sr,
    connectInfiniteHitsWithInsights: or,
    connectMenu: ur,
    connectNumericMenu: lr,
    connectPagination: gr,
    connectRange: wr,
    connectRefinementList: xr,
    connectSearchBox: _r,
    connectSortBy: Fr,
    connectRatingMenu: Lr,
    connectStats: jr,
    connectToggleRefinement: Dr,
    connectBreadcrumb: Wr,
    connectGeoSearch: Ur,
    connectPoweredBy: Qr,
    connectConfigure: Jr,
    EXPERIMENTAL_connectConfigureRelatedItems: Zr,
    connectAutocomplete: function connectAutocomplete(r, e) {
      var i = 1 < arguments.length && void 0 !== e ? e : Ie;
      return _e(r, Xr()), function (s) {
        var e = (s || {}).escapeHTML,
            o = void 0 === e || e,
            c = {};
        return {
          $$type: "ais.autocomplete",
          init: function init(e) {
            var t = e.instantSearchInstance;
            r(D(D({}, this.getWidgetRenderState(e)), {}, {
              instantSearchInstance: t
            }), !0);
          },
          render: function render(e) {
            var t = e.instantSearchInstance,
                n = this.getWidgetRenderState(e);
            n.indices.forEach(function (e) {
              (0, e.sendEvent)("view", e.hits);
            }), r(D(D({}, n), {}, {
              instantSearchInstance: t
            }), !1);
          },
          getRenderState: function getRenderState(e, t) {
            return D(D({}, e), {}, {
              autocomplete: this.getWidgetRenderState(t)
            });
          },
          getWidgetRenderState: function getWidgetRenderState(e) {
            var n = this,
                t = e.helper,
                r = e.scopedResults,
                i = e.instantSearchInstance;
            c.refine || (c.refine = function (e) {
              t.setQuery(e).search();
            });
            var a = r.map(function (e) {
              e.results.hits = o ? qe(e.results.hits) : e.results.hits;
              var t = ot({
                instantSearchInstance: i,
                index: e.results.index,
                widgetType: n.$$type
              });
              return {
                indexId: e.indexId,
                indexName: e.results.index,
                hits: e.results.hits,
                results: e.results,
                sendEvent: t
              };
            });
            return {
              currentRefinement: t.state.query || "",
              indices: a,
              refine: c.refine,
              widgetParams: s
            };
          },
          getWidgetUiState: function getWidgetUiState(e, t) {
            var n = t.searchParameters.query || "";
            return "" === n || e && e.query === n ? e : D(D({}, e), {}, {
              query: n
            });
          },
          getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
            var n = {
              query: t.uiState.query || ""
            };
            return o ? e.setQueryParameters(D(D({}, n), We)) : e.setQueryParameters(n);
          },
          dispose: function dispose(e) {
            var t = e.state;
            i();
            var n = t.setQueryParameter("query", void 0);
            return o ? n.setQueryParameters(Object.keys(We).reduce(function (e, t) {
              return D(D({}, e), {}, M({}, t, void 0));
            }, {})) : n;
          }
        };
      };
    },
    connectQueryRules: ni,
    connectVoiceSearch: ii
  }),
      oi = pe(function (e) {
    function s() {
      for (var e = [], t = 0; t < arguments.length; t++) {
        var n = arguments[t];

        if (n) {
          var r = _typeof(n);

          if ("string" == r || "number" == r) e.push(n);else if (Array.isArray(n) && n.length) {
            var i = s.apply(null, n);
            i && e.push(i);
          } else if ("object" == r) for (var a in n) {
            o.call(n, a) && n[a] && e.push(a);
          }
        }
      }

      return e.join(" ");
    }

    var o;
    o = {}.hasOwnProperty, e.exports ? (s.default = s, e.exports = s) : window.classNames = s;
  }),
      ci = function () {
    j(t, An);
    var e = H(t);

    function t() {
      return k(this, t), e.apply(this, arguments);
    }

    return L(t, [{
      key: "shouldComponentUpdate",
      value: function value(e) {
        return !Le(this.props.data, e.data) || this.props.templateKey !== e.templateKey || !Le(this.props.rootProps, e.rootProps);
      }
    }, {
      key: "render",
      value: function value() {
        var e = this.props.rootTagName,
            t = this.props.useCustomCompileOptions[this.props.templateKey] ? this.props.templatesConfig.compileOptions : {},
            n = be({
          templates: this.props.templates,
          templateKey: this.props.templateKey,
          compileOptions: t,
          helpers: this.props.templatesConfig.helpers,
          data: this.props.data,
          bindEvent: this.props.bindEvent
        });
        return null === n ? null : Mn(e, d({}, this.props.rootProps, {
          dangerouslySetInnerHTML: {
            __html: n
          }
        }));
      }
    }]), t;
  }();

  ci.defaultProps = {
    data: {},
    rootTagName: "div",
    useCustomCompileOptions: {},
    templates: {},
    templatesConfig: {}
  };

  function ui(e) {
    var t = e.hasRefinements,
        n = e.refine,
        r = e.cssClasses,
        i = e.templateProps;
    return Mn("div", {
      className: r.root
    }, Mn(ci, d({}, i, {
      templateKey: "resetLabel",
      rootTagName: "button",
      rootProps: {
        className: oi(r.button, M({}, r.disabledButton, !t)),
        onClick: n,
        disabled: !t
      },
      data: {
        hasRefinements: t
      }
    })));
  }

  function li(e) {
    var t = e.items,
        n = e.cssClasses;
    return Mn("div", {
      className: n.root
    }, Mn("ul", {
      className: n.list
    }, t.map(function (t, e) {
      return Mn("li", {
        key: "".concat(t.indexName, "-").concat(t.attribute, "-").concat(e),
        className: n.item
      }, Mn("span", {
        className: n.label
      }, function (e) {
        return e.toString().charAt(0).toUpperCase() + e.toString().slice(1);
      }(t.label), ":"), t.refinements.map(function (e) {
        return Mn("span", {
          key: function (e) {
            var t = e.attribute,
                n = e.value;
            return [t, e.type, n, e.operator].map(function (e) {
              return e;
            }).filter(Boolean).join(":");
          }(e),
          className: n.category
        }, Mn("span", {
          className: n.categoryLabel
        }, "query" === e.attribute ? Mn("q", null, e.label) : e.label), Mn("button", {
          className: n.delete,
          onClick: function (t) {
            return function (e) {
              de(e) || (e.preventDefault(), t());
            };
          }(t.refine.bind(null, e))
        }, "✕"));
      }));
    })));
  }

  function hi(e, t) {
    var n = e.items,
        r = e.widgetParams;

    if (!t) {
      var i = r.container,
          a = r.cssClasses;
      Zn(Mn(li, {
        cssClasses: a,
        items: n
      }), i);
    }
  }

  function di(e) {
    var t = e.className,
        n = e.disabled;
    return Mn("button", {
      className: t,
      onClick: e.onClick,
      disabled: n
    }, e.children);
  }

  var fi = {
    resetLabel: "Clear refinements"
  },
      mi = et({
    name: "clear-refinements"
  }),
      pi = vt("ClearRefinements"),
      gi = et({
    name: "current-refinements"
  }),
      vi = vt("CurrentRefinements");
  di.defaultProps = {
    disabled: !1
  };

  function yi(e) {
    var t = e.classNameLabel,
        n = e.classNameInput,
        r = e.checked,
        i = e.onToggle,
        a = e.children;
    return Mn("label", {
      className: t
    }, Mn("input", {
      className: n,
      type: "checkbox",
      checked: r,
      onChange: i
    }), a);
  }

  function bi(e) {
    var t = e.cssClasses,
        n = e.enableRefine,
        r = e.enableRefineControl,
        i = e.enableClearMapRefinement,
        a = e.isRefineOnMapMove,
        s = e.isRefinedWithMap,
        o = e.hasMapMoveSinceLastRefine,
        c = e.onRefineToggle,
        u = e.onRefineClick,
        l = e.onClearClick,
        h = e.templateProps;
    return n && Mn("div", null, r && Mn("div", {
      className: t.control
    }, a || !o ? Mn(yi, {
      classNameLabel: oi(t.label, M({}, t.selectedLabel, a)),
      classNameInput: t.input,
      checked: a,
      onToggle: c
    }, Mn(ci, d({}, h, {
      templateKey: "toggle",
      rootTagName: "span"
    }))) : Mn(di, {
      className: t.redo,
      disabled: !o,
      onClick: u
    }, Mn(ci, d({}, h, {
      templateKey: "redo",
      rootTagName: "span"
    })))), !r && !a && Mn("div", {
      className: t.control
    }, Mn(di, {
      className: oi(t.redo, M({}, t.disabledRedo, !o)),
      disabled: !o,
      onClick: u
    }, Mn(ci, d({}, h, {
      templateKey: "redo",
      rootTagName: "span"
    })))), i && s && Mn(di, {
      className: t.reset,
      onClick: l
    }, Mn(ci, d({}, h, {
      templateKey: "reset",
      rootTagName: "span"
    }))));
  }

  function Ri(e) {
    var t = e.refine,
        n = e.mapInstance;
    return t({
      northEast: n.getBounds().getNorthEast().toJSON(),
      southWest: n.getBounds().getSouthWest().toJSON()
    });
  }

  function Si(e, t) {
    e.isUserInteraction = !1, t(), e.isUserInteraction = !0;
  }

  function wi(e, t) {
    var n = e.items,
        r = e.position,
        i = e.currentRefinement,
        a = e.refine,
        s = e.clearMapRefinement,
        o = e.toggleRefineOnMapMove,
        c = e.isRefineOnMapMove,
        u = e.setMapMoveSinceLastRefine,
        l = e.hasMapMoveSinceLastRefine,
        h = e.isRefinedWithMap,
        d = e.widgetParams,
        f = e.instantSearchInstance,
        m = d.container,
        p = d.googleReference,
        g = d.cssClasses,
        v = d.templates,
        y = d.initialZoom,
        b = d.initialPosition,
        R = d.enableRefine,
        S = d.enableClearMapRefinement,
        w = d.enableRefineControl,
        P = d.mapOptions,
        x = d.createMarker,
        N = d.markerOptions,
        _ = d.renderState;

    if (t) {
      _.isUserInteraction = !0, _.isPendingRefine = !1, _.markers = [];
      var I = document.createElement("div");
      I.className = g.root, m.appendChild(I);
      var F = document.createElement("div");
      F.className = g.map, I.appendChild(F);
      var C = document.createElement("div");
      C.className = g.tree, I.appendChild(C), _.mapInstance = new p.maps.Map(F, D({
        mapTypeControl: !1,
        fullscreenControl: !1,
        streetViewControl: !1,
        clickableIcons: !1,
        zoomControlOptions: {
          position: p.maps.ControlPosition.LEFT_TOP
        }
      }, P));
      return p.maps.event.addListenerOnce(_.mapInstance, "idle", function () {
        function e() {
          _.isUserInteraction && R && (u(), c() && (_.isPendingRefine = !0));
        }

        _.mapInstance.addListener("center_changed", e), _.mapInstance.addListener("zoom_changed", e), _.mapInstance.addListener("dragstart", e), _.mapInstance.addListener("idle", function () {
          _.isUserInteraction && _.isPendingRefine && (_.isPendingRefine = !1, Ri({
            mapInstance: _.mapInstance,
            refine: a
          }));
        });
      }), void (_.templateProps = me({
        templatesConfig: f.templatesConfig,
        templates: v
      }));
    }

    var T = n.map(function (e) {
      return e.objectID;
    }),
        E = W(function (e, a) {
      return e.reduce(function (e, t) {
        var n = W(e, 2),
            r = n[0],
            i = n[1];
        return a.includes(t.__id) ? [r.concat(t), i] : [r, i.concat(t)];
      }, [[], []]);
    }(_.markers, T), 2),
        k = E[0],
        L = E[1],
        M = k.map(function (e) {
      return e.__id;
    }),
        j = n.filter(function (e) {
      return !M.includes(e.objectID);
    });
    L.forEach(function (e) {
      return e.setMap(null);
    }), _.markers = k.concat(j.map(function (n) {
      var r = x({
        map: _.mapInstance,
        item: n
      });
      return Object.keys(N.events).forEach(function (t) {
        r.addListener(t, function (e) {
          N.events[t]({
            map: _.mapInstance,
            event: e,
            item: n,
            marker: r
          });
        });
      }), r;
    }));
    var O = !l(),
        A = i ? 0 : null,
        H = !i && Boolean(_.markers.length) ? function (e, t) {
      var n = t.reduce(function (e, t) {
        return e.extend(t.getPosition());
      }, new e.maps.LatLngBounds());
      return {
        northEast: n.getNorthEast().toJSON(),
        southWest: n.getSouthWest().toJSON()
      };
    }(p, _.markers) : i;
    H && O ? Si(_, function () {
      _.mapInstance.fitBounds(new p.maps.LatLngBounds(H.southWest, H.northEast), A);
    }) : O && Si(_, function () {
      _.mapInstance.setCenter(r || b), _.mapInstance.setZoom(y);
    }), Zn(Mn(bi, {
      cssClasses: g,
      enableRefine: R,
      enableRefineControl: w,
      enableClearMapRefinement: S,
      isRefineOnMapMove: c(),
      isRefinedWithMap: h(),
      hasMapMoveSinceLastRefine: l(),
      onRefineToggle: o,
      onRefineClick: function onRefineClick() {
        return Ri({
          mapInstance: _.mapInstance,
          refine: a
        });
      },
      onClearClick: s,
      templateProps: _.templateProps
    }), m.querySelector(".".concat(g.tree)));
  }

  var Pi = {
    HTMLMarker: "<p>Your custom HTML Marker</p>",
    reset: "Clear the map refinement",
    toggle: "Search as I move the map",
    redo: "Redo search here"
  },
      xi = et({
    name: "geo-search"
  }),
      Ni = vt("GeoSearch");

  function _i(e) {
    var t = e.className,
        n = e.handleClick,
        r = e.facetValueToRefine,
        i = e.isRefined,
        a = e.templateProps,
        s = e.templateKey,
        o = e.templateData,
        c = e.subItems;
    return Mn("li", {
      className: t,
      onClick: function onClick(e) {
        n({
          facetValueToRefine: r,
          isRefined: i,
          originalEvent: e
        });
      }
    }, Mn(ci, d({}, a, {
      templateKey: s,
      data: o
    })), c);
  }

  var Ii = function () {
    j(i, An);
    var r = H(i);

    function i() {
      var s;
      k(this, i);

      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
        t[n] = arguments[n];
      }

      return M(A(s = r.call.apply(r, [this].concat(t))), "state", {
        query: s.props.query,
        focused: !1
      }), M(A(s), "onInput", function (e) {
        var t = s.props,
            n = t.searchAsYouType,
            r = t.refine,
            i = t.onChange,
            a = e.target.value;
        n && r(a), s.setState({
          query: a
        }), i(e);
      }), M(A(s), "onSubmit", function (e) {
        var t = s.props,
            n = t.searchAsYouType,
            r = t.refine,
            i = t.onSubmit;
        return e.preventDefault(), e.stopPropagation(), s.input.blur(), n || r(s.state.query), i(e), !1;
      }), M(A(s), "onReset", function (e) {
        var t = s.props,
            n = t.refine,
            r = t.onReset;
        s.input.focus(), n(""), s.setState({
          query: ""
        }), r(e);
      }), M(A(s), "onBlur", function () {
        s.setState({
          focused: !1
        });
      }), M(A(s), "onFocus", function () {
        s.setState({
          focused: !0
        });
      }), s;
    }

    return L(i, [{
      key: "resetInput",
      value: function value() {
        this.setState({
          query: ""
        });
      }
    }, {
      key: "componentWillReceiveProps",
      value: function value(e) {
        this.state.focused || e.query === this.state.query || this.setState({
          query: e.query
        });
      }
    }, {
      key: "render",
      value: function value() {
        var t = this,
            e = this.props,
            n = e.cssClasses,
            r = e.placeholder,
            i = e.autofocus,
            a = e.showSubmit,
            s = e.showReset,
            o = e.showLoadingIndicator,
            c = e.templates,
            u = e.isSearchStalled;
        return Mn("div", {
          className: n.root
        }, Mn("form", {
          action: "",
          role: "search",
          className: n.form,
          noValidate: !0,
          onSubmit: this.onSubmit,
          onReset: this.onReset
        }, Mn("input", {
          ref: function ref(e) {
            return t.input = e;
          },
          value: this.state.query,
          disabled: this.props.disabled,
          className: n.input,
          type: "search",
          placeholder: r,
          autoFocus: i,
          autoComplete: "off",
          autoCorrect: "off",
          autoCapitalize: "off",
          spellCheck: "false",
          maxLength: 512,
          onInput: this.onInput,
          onBlur: this.onBlur,
          onFocus: this.onFocus
        }), Mn(ci, {
          templateKey: "submit",
          rootTagName: "button",
          rootProps: {
            className: n.submit,
            type: "submit",
            title: "Submit the search query.",
            hidden: !a
          },
          templates: c,
          data: {
            cssClasses: n
          }
        }), Mn(ci, {
          templateKey: "reset",
          rootTagName: "button",
          rootProps: {
            className: n.reset,
            type: "reset",
            title: "Clear the search query.",
            hidden: !(s && this.state.query.trim() && !u)
          },
          templates: c,
          data: {
            cssClasses: n
          }
        }), o && Mn(ci, {
          templateKey: "loadingIndicator",
          rootTagName: "span",
          rootProps: {
            className: n.loadingIndicator,
            hidden: !u
          },
          templates: c,
          data: {
            cssClasses: n
          }
        })));
      }
    }]), i;
  }();

  M(Ii, "defaultProps", {
    query: "",
    showSubmit: !0,
    showReset: !0,
    showLoadingIndicator: !0,
    autofocus: !1,
    searchAsYouType: !0,
    isSearchStalled: !1,
    disabled: !1,
    onChange: Ie,
    onSubmit: Ie,
    onReset: Ie,
    refine: Ie
  });

  var Fi = function () {
    j(u, An);
    var n = H(u);

    function u(e) {
      var t;
      return k(this, u), (t = n.call(this, e)).handleItemClick = t.handleItemClick.bind(A(t)), t;
    }

    return L(u, [{
      key: "shouldComponentUpdate",
      value: function value(e, t) {
        var n = this.state !== t,
            r = !Le(this.props.facetValues, e.facetValues);
        return n || r;
      }
    }, {
      key: "refine",
      value: function value(e, t) {
        this.props.toggleRefinement(e, t);
      }
    }, {
      key: "_generateFacetItem",
      value: function value(e) {
        var t,
            n,
            r = e.data && 0 < e.data.length;

        if (r) {
          var i = this.props.cssClasses,
              a = (i.root, O(i, ["root"]));
          n = Mn(u, d({}, this.props, {
            cssClasses: a,
            depth: this.props.depth + 1,
            facetValues: e.data,
            showMore: !1,
            className: this.props.cssClasses.childList
          }));
        }

        var s = this.props.createURL(e.value),
            o = D(D({}, e), {}, {
          url: s,
          attribute: this.props.attribute,
          cssClasses: this.props.cssClasses,
          isFromSearch: this.props.isFromSearch
        }),
            c = e.value;
        return void 0 !== e.isRefined && (c += "/".concat(e.isRefined)), void 0 !== e.count && (c += "/".concat(e.count)), Mn(_i, {
          templateKey: "item",
          key: c,
          facetValueToRefine: e.value,
          handleClick: this.handleItemClick,
          isRefined: e.isRefined,
          className: oi(this.props.cssClasses.item, (t = {}, M(t, this.props.cssClasses.selectedItem, e.isRefined), M(t, this.props.cssClasses.disabledItem, !e.count), M(t, this.props.cssClasses.parentItem, r), t)),
          subItems: n,
          templateData: o,
          templateProps: this.props.templateProps
        });
      }
    }, {
      key: "handleItemClick",
      value: function value(e) {
        var t = e.facetValueToRefine,
            n = e.originalEvent,
            r = e.isRefined;
        if (!(de(n) || r && n.target.parentNode.querySelector('input[type="radio"]:checked'))) if ("INPUT" !== n.target.tagName) {
          for (var i = n.target; i !== n.currentTarget;) {
            if ("LABEL" === i.tagName && (i.querySelector('input[type="checkbox"]') || i.querySelector('input[type="radio"]'))) return;
            "A" === i.tagName && i.href && n.preventDefault(), i = i.parentNode;
          }

          n.stopPropagation(), this.refine(t, r);
        } else this.refine(t, r);
      }
    }, {
      key: "componentWillReceiveProps",
      value: function value(e) {
        this.searchBox && !e.isFromSearch && this.searchBox.resetInput();
      }
    }, {
      key: "refineFirstValue",
      value: function value() {
        var e = this.props.facetValues[0];

        if (e) {
          var t = e.value;
          this.props.toggleRefinement(t);
        }
      }
    }, {
      key: "render",
      value: function value() {
        var t = this,
            e = oi(this.props.cssClasses.list, M({}, "".concat(this.props.cssClasses.depth).concat(this.props.depth), this.props.cssClasses.depth)),
            n = oi(this.props.cssClasses.showMore, M({}, this.props.cssClasses.disabledShowMore, !(!0 === this.props.showMore && this.props.canToggleShowMore))),
            r = !0 === this.props.showMore && Mn(ci, d({}, this.props.templateProps, {
          templateKey: "showMoreText",
          rootTagName: "button",
          rootProps: {
            className: n,
            disabled: !this.props.canToggleShowMore,
            onClick: this.props.toggleShowMore
          },
          data: {
            isShowingMore: this.props.isShowingMore
          }
        })),
            i = !0 !== this.props.searchIsAlwaysActive && !(this.props.isFromSearch || !this.props.hasExhaustiveItems),
            a = this.props.searchFacetValues && Mn("div", {
          className: this.props.cssClasses.searchBox
        }, Mn(Ii, {
          ref: function ref(e) {
            return t.searchBox = e;
          },
          placeholder: this.props.searchPlaceholder,
          disabled: i,
          cssClasses: this.props.cssClasses.searchable,
          templates: this.props.templateProps.templates,
          onChange: function onChange(e) {
            return t.props.searchFacetValues(e.target.value);
          },
          onReset: function onReset() {
            return t.props.searchFacetValues("");
          },
          onSubmit: function onSubmit() {
            return t.refineFirstValue();
          },
          searchAsYouType: !1
        })),
            s = this.props.facetValues && 0 < this.props.facetValues.length && Mn("ul", {
          className: e
        }, this.props.facetValues.map(this._generateFacetItem, this)),
            o = this.props.searchFacetValues && this.props.isFromSearch && 0 === this.props.facetValues.length && Mn(ci, d({}, this.props.templateProps, {
          templateKey: "searchableNoResults",
          rootProps: {
            className: this.props.cssClasses.noResults
          }
        }));
        return Mn("div", {
          className: oi(this.props.cssClasses.root, M({}, this.props.cssClasses.noRefinementRoot, !this.props.facetValues || 0 === this.props.facetValues.length), this.props.className)
        }, this.props.children, a, s, o, r);
      }
    }]), u;
  }();

  Fi.defaultProps = {
    cssClasses: {},
    depth: 0
  };
  var Ci = {
    item: '<a class="{{cssClasses.link}}" href="{{url}}"><span class="{{cssClasses.label}}">{{label}}</span><span class="{{cssClasses.count}}">{{#helpers.formatNumber}}{{count}}{{/helpers.formatNumber}}</span></a>',
    showMoreText: "\n    {{#isShowingMore}}\n      Show less\n    {{/isShowingMore}}\n    {{^isShowingMore}}\n      Show more\n    {{/isShowingMore}}\n  "
  },
      Ti = et({
    name: "hierarchical-menu"
  }),
      Ei = vt("HierarchicalMenu");

  function ki(e) {
    var t = e.results,
        n = e.hits,
        r = e.bindEvent,
        i = e.cssClasses,
        a = e.templateProps;
    return 0 === t.hits.length ? Mn(ci, d({}, a, {
      templateKey: "empty",
      rootProps: {
        className: oi(i.root, i.emptyRoot)
      },
      data: t
    })) : Mn("div", {
      className: i.root
    }, Mn("ol", {
      className: i.list
    }, n.map(function (e, t) {
      return Mn(ci, d({}, a, {
        templateKey: "item",
        rootTagName: "li",
        rootProps: {
          className: i.item
        },
        key: e.objectID,
        data: D(D({}, e), {}, {
          __hitIndex: t
        }),
        bindEvent: r
      }));
    })));
  }

  ki.defaultProps = {
    results: {
      hits: []
    },
    hits: []
  };
  var Li = {
    empty: "No results",
    item: function item(e) {
      return JSON.stringify(e, null, 2);
    }
  },
      Mi = et({
    name: "hits"
  }),
      ji = vt("Hits"),
      Oi = er(ki);

  function Ai(e) {
    var t = e.currentValue,
        n = e.options,
        r = e.cssClasses,
        i = e.setValue;
    return Mn("select", {
      className: oi(r.select),
      onChange: function onChange(e) {
        return i(e.target.value);
      },
      value: "".concat(t)
    }, n.map(function (e) {
      return Mn("option", {
        className: oi(r.option),
        key: e.label + e.value,
        value: "".concat(e.value)
      }, e.label);
    }));
  }

  var Hi = et({
    name: "hits-per-page"
  }),
      Di = vt("HitsPerPage"),
      Wi = {
    empty: "No results",
    showPreviousText: "Show previous results",
    showMoreText: "Show more results",
    item: function item(e) {
      return JSON.stringify(e, null, 2);
    }
  },
      Bi = et({
    name: "infinite-hits"
  }),
      Ui = vt("InfiniteHits"),
      Qi = er(function (e) {
    var t = e.results,
        n = e.hits,
        r = e.bindEvent,
        i = e.hasShowPrevious,
        a = e.showPrevious,
        s = e.showMore,
        o = e.isFirstPage,
        c = e.isLastPage,
        u = e.cssClasses,
        l = e.templateProps;
    return 0 === t.hits.length ? Mn(ci, d({}, l, {
      templateKey: "empty",
      rootProps: {
        className: oi(u.root, u.emptyRoot)
      },
      data: t
    })) : Mn("div", {
      className: u.root
    }, i && Mn(ci, d({}, l, {
      templateKey: "showPreviousText",
      rootTagName: "button",
      rootProps: {
        className: oi(u.loadPrevious, M({}, u.disabledLoadPrevious, o)),
        disabled: o,
        onClick: a
      }
    })), Mn("ol", {
      className: u.list
    }, n.map(function (e, t) {
      return Mn(ci, d({}, l, {
        templateKey: "item",
        rootTagName: "li",
        rootProps: {
          className: u.item
        },
        key: e.objectID,
        data: D(D({}, e), {}, {
          __hitIndex: t
        }),
        bindEvent: r
      }));
    })), Mn(ci, d({}, l, {
      templateKey: "showMoreText",
      rootTagName: "button",
      rootProps: {
        className: oi(u.loadMore, M({}, u.disabledLoadMore, c)),
        disabled: c,
        onClick: s
      }
    })));
  }),
      qi = {
    item: '<a class="{{cssClasses.link}}" href="{{url}}"><span class="{{cssClasses.label}}">{{label}}</span><span class="{{cssClasses.count}}">{{#helpers.formatNumber}}{{count}}{{/helpers.formatNumber}}</span></a>',
    showMoreText: "\n    {{#isShowingMore}}\n      Show less\n    {{/isShowingMore}}\n    {{^isShowingMore}}\n      Show more\n    {{/isShowingMore}}\n  "
  },
      $i = et({
    name: "menu"
  }),
      Vi = vt("Menu");
  var Ki = {
    reset: '\n<svg class="{{cssClasses.resetIcon}}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="10" height="10">\n  <path d="M8.114 10L.944 2.83 0 1.885 1.886 0l.943.943L10 8.113l7.17-7.17.944-.943L20 1.886l-.943.943-7.17 7.17 7.17 7.17.943.944L18.114 20l-.943-.943-7.17-7.17-7.17 7.17-.944.943L0 18.114l.943-.943L8.113 10z"></path>\n</svg>\n  ',
    submit: '\n<svg class="{{cssClasses.submitIcon}}" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 40 40">\n  <path d="M26.804 29.01c-2.832 2.34-6.465 3.746-10.426 3.746C7.333 32.756 0 25.424 0 16.378 0 7.333 7.333 0 16.378 0c9.046 0 16.378 7.333 16.378 16.378 0 3.96-1.406 7.594-3.746 10.426l10.534 10.534c.607.607.61 1.59-.004 2.202-.61.61-1.597.61-2.202.004L26.804 29.01zm-10.426.627c7.323 0 13.26-5.936 13.26-13.26 0-7.32-5.937-13.257-13.26-13.257C9.056 3.12 3.12 9.056 3.12 16.378c0 7.323 5.936 13.26 13.258 13.26z"></path>\n</svg>\n  ',
    loadingIndicator: '\n<svg class="{{cssClasses.loadingIcon}}" width="16" height="16" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#444">\n  <g fill="none" fillRule="evenodd">\n    <g transform="translate(1 1)" strokeWidth="2">\n      <circle strokeOpacity=".5" cx="18" cy="18" r="18" />\n      <path d="M36 18c0-9.94-8.06-18-18-18">\n        <animateTransform\n          attributeName="transform"\n          type="rotate"\n          from="0 18 18"\n          to="360 18 18"\n          dur="1s"\n          repeatCount="indefinite"\n        />\n      </path>\n    </g>\n  </g>\n</svg>\n  '
  },
      zi = {
    item: '<label class="{{cssClasses.label}}">\n  <input type="checkbox"\n         class="{{cssClasses.checkbox}}"\n         value="{{value}}"\n         {{#isRefined}}checked{{/isRefined}} />\n  <span class="{{cssClasses.labelText}}">{{#isFromSearch}}{{{highlighted}}}{{/isFromSearch}}{{^isFromSearch}}{{highlighted}}{{/isFromSearch}}</span>\n  <span class="{{cssClasses.count}}">{{#helpers.formatNumber}}{{count}}{{/helpers.formatNumber}}</span>\n</label>',
    showMoreText: "\n    {{#isShowingMore}}\n      Show less\n    {{/isShowingMore}}\n    {{^isShowingMore}}\n      Show more\n    {{/isShowingMore}}\n    ",
    searchableNoResults: "No results",
    searchableReset: Ki.reset,
    searchableSubmit: Ki.submit,
    searchableLoadingIndicator: Ki.loadingIndicator
  },
      Ji = et({
    name: "refinement-list"
  }),
      Yi = vt("RefinementList"),
      Gi = vt("SearchBox");
  var Zi = {
    item: '<label class="{{cssClasses.label}}">\n  <input type="radio" class="{{cssClasses.radio}}" name="{{attribute}}"{{#isRefined}} checked{{/isRefined}} />\n  <span class="{{cssClasses.labelText}}">{{label}}</span>\n</label>'
  },
      Xi = et({
    name: "numeric-menu"
  }),
      ea = vt("NumericMenu");

  function ta(e) {
    var t = e.cssClasses,
        n = e.label,
        r = e.ariaLabel,
        i = e.url,
        a = e.isDisabled,
        s = e.handleClick,
        o = e.pageNumber;
    return Mn("li", {
      className: t.item
    }, a ? Mn("span", {
      className: t.link,
      dangerouslySetInnerHTML: {
        __html: n
      }
    }) : Mn("a", {
      className: t.link,
      "aria-label": r,
      href: i,
      onClick: function onClick(e) {
        return s(o, e);
      },
      dangerouslySetInnerHTML: {
        __html: n
      }
    }));
  }

  var na = function () {
    j(a, An);
    var i = H(a);

    function a() {
      var n;
      k(this, a);

      for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
        t[r] = arguments[r];
      }

      return M(A(n = i.call.apply(i, [this].concat(t))), "handleClick", function (e, t) {
        de(t) || (t.preventDefault(), n.props.setCurrentPage(e));
      }), n;
    }

    return L(a, [{
      key: "pageLink",
      value: function value(e) {
        var t = e.label,
            n = e.ariaLabel,
            r = e.pageNumber,
            i = e.additionalClassName,
            a = void 0 === i ? null : i,
            s = e.isDisabled,
            o = void 0 !== s && s,
            c = e.isSelected,
            u = void 0 !== c && c,
            l = e.createURL,
            h = {
          item: oi(this.props.cssClasses.item, a),
          link: this.props.cssClasses.link
        };
        o ? h.item = oi(h.item, this.props.cssClasses.disabledItem) : u && (h.item = oi(h.item, this.props.cssClasses.selectedItem));
        var d = l && !o ? l(r) : "#";
        return Mn(ta, {
          ariaLabel: n,
          cssClasses: h,
          handleClick: this.handleClick,
          isDisabled: o,
          key: t + r + n,
          label: t,
          pageNumber: r,
          url: d
        });
      }
    }, {
      key: "previousPageLink",
      value: function value(e) {
        var t = e.isFirstPage,
            n = e.currentPage,
            r = e.createURL;
        return this.pageLink({
          ariaLabel: "Previous",
          additionalClassName: this.props.cssClasses.previousPageItem,
          isDisabled: t,
          label: this.props.templates.previous,
          pageNumber: n - 1,
          createURL: r
        });
      }
    }, {
      key: "nextPageLink",
      value: function value(e) {
        var t = e.isLastPage,
            n = e.currentPage,
            r = e.createURL;
        return this.pageLink({
          ariaLabel: "Next",
          additionalClassName: this.props.cssClasses.nextPageItem,
          isDisabled: t,
          label: this.props.templates.next,
          pageNumber: n + 1,
          createURL: r
        });
      }
    }, {
      key: "firstPageLink",
      value: function value(e) {
        var t = e.isFirstPage,
            n = e.createURL;
        return this.pageLink({
          ariaLabel: "First",
          additionalClassName: this.props.cssClasses.firstPageItem,
          isDisabled: t,
          label: this.props.templates.first,
          pageNumber: 0,
          createURL: n
        });
      }
    }, {
      key: "lastPageLink",
      value: function value(e) {
        var t = e.isLastPage,
            n = e.nbPages,
            r = e.createURL;
        return this.pageLink({
          ariaLabel: "Last",
          additionalClassName: this.props.cssClasses.lastPageItem,
          isDisabled: t,
          label: this.props.templates.last,
          pageNumber: n - 1,
          createURL: r
        });
      }
    }, {
      key: "pages",
      value: function value(e) {
        var t = this,
            n = e.currentPage,
            r = e.pages,
            i = e.createURL;
        return r.map(function (e) {
          return t.pageLink({
            ariaLabel: e + 1,
            additionalClassName: t.props.cssClasses.pageItem,
            isSelected: e === n,
            label: e + 1,
            pageNumber: e,
            createURL: i
          });
        });
      }
    }, {
      key: "render",
      value: function value() {
        return Mn("div", {
          className: oi(this.props.cssClasses.root, M({}, this.props.cssClasses.noRefinementRoot, this.props.nbPages <= 1))
        }, Mn("ul", {
          className: this.props.cssClasses.list
        }, this.props.showFirst && this.firstPageLink(this.props), this.props.showPrevious && this.previousPageLink(this.props), this.pages(this.props), this.props.showNext && this.nextPageLink(this.props), this.props.showLast && this.lastPageLink(this.props)));
      }
    }]), a;
  }();

  na.defaultProps = {
    nbHits: 0,
    currentPage: 0,
    nbPages: 0
  };
  var ra = et({
    name: "pagination"
  }),
      ia = vt("Pagination"),
      aa = {
    previous: "‹",
    next: "›",
    first: "«",
    last: "»"
  };

  var sa = function () {
    j(r, An);
    var t = H(r);

    function r(e) {
      var n;
      return k(this, r), M(A(n = t.call(this, e)), "onInput", function (t) {
        return function (e) {
          n.setState(M({}, t, e.currentTarget.value));
        };
      }), M(A(n), "onSubmit", function (e) {
        e.preventDefault(), n.props.refine([n.state.min && Number(n.state.min), n.state.max && Number(n.state.max)]);
      }), n.state = {
        min: e.values.min,
        max: e.values.max
      }, n;
    }

    return L(r, [{
      key: "componentWillReceiveProps",
      value: function value(e) {
        this.setState({
          min: e.values.min,
          max: e.values.max
        });
      }
    }, {
      key: "render",
      value: function value() {
        var e = this.state,
            t = e.min,
            n = e.max,
            r = this.props,
            i = r.min,
            a = r.max,
            s = r.step,
            o = r.cssClasses,
            c = r.templateProps,
            u = a <= i,
            l = Boolean(t || n);
        return Mn("div", {
          className: oi(o.root, M({}, o.noRefinement, !l))
        }, Mn("form", {
          className: o.form,
          onSubmit: this.onSubmit
        }, Mn("label", {
          className: o.label
        }, Mn("input", {
          className: oi(o.input, o.inputMin),
          type: "number",
          min: i,
          max: a,
          step: s,
          value: null != t ? t : "",
          onInput: this.onInput("min"),
          placeholder: i,
          disabled: u
        })), Mn(ci, d({}, c, {
          templateKey: "separatorText",
          rootTagName: "span",
          rootProps: {
            className: o.separator
          }
        })), Mn("label", {
          className: o.label
        }, Mn("input", {
          className: oi(o.input, o.inputMax),
          type: "number",
          min: i,
          max: a,
          step: s,
          value: null != n ? n : "",
          onInput: this.onInput("max"),
          placeholder: a,
          disabled: u
        })), Mn(ci, d({}, c, {
          templateKey: "submitText",
          rootTagName: "button",
          rootProps: {
            type: "submit",
            className: o.submit,
            disabled: u
          }
        }))));
      }
    }]), r;
  }(),
      oa = et({
    name: "range-input"
  }),
      ca = vt("RangeInput");

  var ua = et({
    name: "search-box"
  }),
      la = vt("SearchBox");
  var ha = 40,
      da = 35,
      fa = 27,
      ma = 36,
      pa = 37,
      ga = 34,
      va = 33,
      ya = 39,
      ba = 38,
      Ra = 100;

  function Sa(e, t, n) {
    return (e - t) / (n - t) * 100;
  }

  function wa(e, t, n) {
    var r = e / 100;
    return 0 === e ? t : 100 === e ? n : Math.round((n - t) * r + t);
  }

  function Pa(e) {
    return ["rheostat", "vertical" === e.orientation ? "rheostat-vertical" : "rheostat-horizontal"].concat(e.className.split(" ")).join(" ");
  }

  function xa(e) {
    return Number(e.currentTarget.getAttribute("data-handle-key"));
  }

  function Na(e) {
    e.stopPropagation(), e.preventDefault();
  }

  var _a = function () {
    j(t, An);
    var e = H(t);

    function t() {
      return k(this, t), e.apply(this, arguments);
    }

    return L(t, [{
      key: "render",
      value: function value() {
        return Mn("button", d({}, this.props, {
          type: "button"
        }));
      }
    }]), t;
  }(),
      Ia = Mn("div", {
    className: "rheostat-background"
  }),
      Fa = function () {
    j(r, An);
    var n = H(r);

    function r(e) {
      var t;
      return k(this, r), M(A(t = n.call(this, e)), "state", {
        className: Pa(t.props),
        handlePos: t.props.values.map(function (e) {
          return Sa(e, t.props.min, t.props.max);
        }),
        handleDimensions: 0,
        mousePos: null,
        sliderBox: {},
        slidingIndex: null,
        values: t.props.values
      }), t.getPublicState = t.getPublicState.bind(A(t)), t.getSliderBoundingBox = t.getSliderBoundingBox.bind(A(t)), t.getProgressStyle = t.getProgressStyle.bind(A(t)), t.getMinValue = t.getMinValue.bind(A(t)), t.getMaxValue = t.getMaxValue.bind(A(t)), t.getHandleDimensions = t.getHandleDimensions.bind(A(t)), t.getClosestSnapPoint = t.getClosestSnapPoint.bind(A(t)), t.getSnapPosition = t.getSnapPosition.bind(A(t)), t.getNextPositionForKey = t.getNextPositionForKey.bind(A(t)), t.getNextState = t.getNextState.bind(A(t)), t.handleClick = t.handleClick.bind(A(t)), t.getClosestHandle = t.getClosestHandle.bind(A(t)), t.setStartSlide = t.setStartSlide.bind(A(t)), t.startMouseSlide = t.startMouseSlide.bind(A(t)), t.startTouchSlide = t.startTouchSlide.bind(A(t)), t.handleMouseSlide = t.handleMouseSlide.bind(A(t)), t.handleTouchSlide = t.handleTouchSlide.bind(A(t)), t.handleSlide = t.handleSlide.bind(A(t)), t.endSlide = t.endSlide.bind(A(t)), t.handleKeydown = t.handleKeydown.bind(A(t)), t.validatePosition = t.validatePosition.bind(A(t)), t.validateValues = t.validateValues.bind(A(t)), t.canMove = t.canMove.bind(A(t)), t.fireChangeEvent = t.fireChangeEvent.bind(A(t)), t.slideTo = t.slideTo.bind(A(t)), t.updateNewValues = t.updateNewValues.bind(A(t)), t;
    }

    return L(r, [{
      key: "componentWillReceiveProps",
      value: function value(n) {
        var e = this.props,
            t = e.className,
            r = e.disabled,
            i = e.min,
            a = e.max,
            s = e.orientation,
            o = this.state,
            c = o.values,
            u = o.slidingIndex,
            l = n.min !== i || n.max !== a,
            h = c.length !== n.values.length || c.some(function (e, t) {
          return n.values[t] !== e;
        }),
            d = n.className !== t || n.orientation !== s,
            f = n.disabled && !r;
        d && this.setState({
          className: Pa(n)
        }), (l || h) && this.updateNewValues(n), f && null !== u && this.endSlide();
      }
    }, {
      key: "getPublicState",
      value: function value() {
        var e = this.props,
            t = e.min;
        return {
          max: e.max,
          min: t,
          values: this.state.values
        };
      }
    }, {
      key: "getSliderBoundingBox",
      value: function value() {
        var e = this.rheostat.getDOMNode ? this.rheostat.getDOMNode() : this.rheostat,
            t = e.getBoundingClientRect();
        return {
          height: t.height || e.clientHeight,
          left: t.left,
          top: t.top,
          width: t.width || e.clientWidth
        };
      }
    }, {
      key: "getProgressStyle",
      value: function value(e) {
        var t = this.state.handlePos,
            n = t[e];
        if (0 === e) return "vertical" === this.props.orientation ? {
          height: "".concat(n, "%"),
          top: 0
        } : {
          left: 0,
          width: "".concat(n, "%")
        };
        var r = t[e - 1],
            i = n - r;
        return "vertical" === this.props.orientation ? {
          height: "".concat(i, "%"),
          top: "".concat(r, "%")
        } : {
          left: "".concat(r, "%"),
          width: "".concat(i, "%")
        };
      }
    }, {
      key: "getMinValue",
      value: function value(e) {
        return this.state.values[e - 1] ? Math.max(this.props.min, this.state.values[e - 1]) : this.props.min;
      }
    }, {
      key: "getMaxValue",
      value: function value(e) {
        return this.state.values[e + 1] ? Math.min(this.props.max, this.state.values[e + 1]) : this.props.max;
      }
    }, {
      key: "getHandleDimensions",
      value: function value(e, t) {
        var n = e.currentTarget || null;
        return n ? "vertical" === this.props.orientation ? n.clientHeight / t.height * Ra / 2 : n.clientWidth / t.width * Ra / 2 : 0;
      }
    }, {
      key: "getClosestSnapPoint",
      value: function value(n) {
        return this.props.snapPoints.length ? this.props.snapPoints.reduce(function (e, t) {
          return Math.abs(e - n) < Math.abs(t - n) ? e : t;
        }) : n;
      }
    }, {
      key: "getSnapPosition",
      value: function value(e) {
        if (!this.props.snap) return e;
        var t = this.props,
            n = t.max,
            r = t.min,
            i = wa(e, r, n);
        return Sa(this.getClosestSnapPoint(i), r, n);
      }
    }, {
      key: "getNextPositionForKey",
      value: function value(e, t) {
        var n,
            r = this.state,
            i = r.handlePos,
            a = r.values,
            s = this.props,
            o = s.max,
            c = s.min,
            u = s.snapPoints,
            l = this.props.snap,
            h = a[e],
            d = i[e],
            f = d,
            m = 1;
        100 <= o ? d = Math.round(d) : m = 100 / (o - c);
        var p = null;
        l && (p = u.indexOf(this.getClosestSnapPoint(a[e])));
        var g = (M(n = {}, pa, function (e) {
          return -1 * e;
        }), M(n, ya, function (e) {
          return e;
        }), M(n, ba, function (e) {
          return e;
        }), M(n, ha, function (e) {
          return -1 * e;
        }), M(n, ga, function (e) {
          return 1 < e ? -e : -10 * e;
        }), M(n, va, function (e) {
          return 1 < e ? e : 10 * e;
        }), n);
        if (Object.prototype.hasOwnProperty.call(g, t)) d += g[t](m), l && (f < d ? p < u.length - 1 && (h = u[p + 1]) : 0 < p && (h = u[p - 1]));else if (t === ma) d = 0, l && (h = u[0]);else {
          if (t !== da) return null;
          d = Ra, l && (h = u[u.length - 1]);
        }
        return l ? Sa(h, c, o) : d;
      }
    }, {
      key: "getNextState",
      value: function value(n, e) {
        var t = this.state.handlePos,
            r = this.props,
            i = r.max,
            a = r.min,
            s = this.validatePosition(n, e),
            o = t.map(function (e, t) {
          return t === n ? s : e;
        });
        return {
          handlePos: o,
          values: o.map(function (e) {
            return wa(e, a, i);
          })
        };
      }
    }, {
      key: "getClosestHandle",
      value: function value(r) {
        var i = this.state.handlePos;
        return i.reduce(function (e, t, n) {
          return Math.abs(i[n] - r) < Math.abs(i[e] - r) ? n : e;
        }, 0);
      }
    }, {
      key: "setStartSlide",
      value: function value(e, t, n) {
        var r = this.getSliderBoundingBox();
        this.setState({
          handleDimensions: this.getHandleDimensions(e, r),
          mousePos: {
            x: t,
            y: n
          },
          sliderBox: r,
          slidingIndex: xa(e)
        });
      }
    }, {
      key: "startMouseSlide",
      value: function value(e) {
        this.setStartSlide(e, e.clientX, e.clientY), "function" == typeof document.addEventListener ? (document.addEventListener("mousemove", this.handleMouseSlide, !1), document.addEventListener("mouseup", this.endSlide, !1)) : (document.attachEvent("onmousemove", this.handleMouseSlide), document.attachEvent("onmouseup", this.endSlide)), Na(e);
      }
    }, {
      key: "startTouchSlide",
      value: function value(e) {
        if (!(1 < e.changedTouches.length)) {
          var t = e.changedTouches[0];
          this.setStartSlide(e, t.clientX, t.clientY), document.addEventListener("touchmove", this.handleTouchSlide, !1), document.addEventListener("touchend", this.endSlide, !1), this.props.onSliderDragStart && this.props.onSliderDragStart(), Na(e);
        }
      }
    }, {
      key: "handleMouseSlide",
      value: function value(e) {
        null !== this.state.slidingIndex && (this.handleSlide(e.clientX, e.clientY), Na(e));
      }
    }, {
      key: "handleTouchSlide",
      value: function value(e) {
        if (null !== this.state.slidingIndex) if (1 < e.changedTouches.length) this.endSlide();else {
          var t = e.changedTouches[0];
          this.handleSlide(t.clientX, t.clientY), Na(e);
        }
      }
    }, {
      key: "handleSlide",
      value: function value(e, t) {
        var n = this.state,
            r = n.slidingIndex,
            i = n.sliderBox,
            a = "vertical" === this.props.orientation ? (t - i.top) / i.height * Ra : (e - i.left) / i.width * Ra;
        this.slideTo(r, a), this.canMove(r, a) && (this.setState({
          x: e,
          y: t
        }), this.props.onSliderDragMove && this.props.onSliderDragMove());
      }
    }, {
      key: "endSlide",
      value: function value() {
        var e = this,
            t = this.state.slidingIndex;

        if (this.setState({
          slidingIndex: null
        }), "function" == typeof document.removeEventListener ? (document.removeEventListener("mouseup", this.endSlide, !1), document.removeEventListener("touchend", this.endSlide, !1), document.removeEventListener("touchmove", this.handleTouchSlide, !1), document.removeEventListener("mousemove", this.handleMouseSlide, !1)) : (document.detachEvent("onmousemove", this.handleMouseSlide), document.detachEvent("onmouseup", this.endSlide)), this.props.onSliderDragEnd && this.props.onSliderDragEnd(), this.props.snap) {
          var n = this.getSnapPosition(this.state.handlePos[t]);
          this.slideTo(t, n, function () {
            return e.fireChangeEvent();
          });
        } else this.fireChangeEvent();
      }
    }, {
      key: "handleClick",
      value: function value(e) {
        var t = this;

        if (!e.target.getAttribute("data-handle-key")) {
          var n = this.getSliderBoundingBox(),
              r = ("vertical" === this.props.orientation ? (e.clientY - n.top) / n.height : (e.clientX - n.left) / n.width) * Ra,
              i = this.getClosestHandle(r),
              a = this.getSnapPosition(r);
          this.slideTo(i, a, function () {
            return t.fireChangeEvent();
          }), this.props.onClick && this.props.onClick();
        }
      }
    }, {
      key: "handleKeydown",
      value: function value(e) {
        var t = this,
            n = xa(e);

        if (e.keyCode !== fa) {
          var r = this.getNextPositionForKey(n, e.keyCode);
          null !== r && (this.canMove(n, r) && (this.slideTo(n, r, function () {
            return t.fireChangeEvent();
          }), this.props.onKeyPress && this.props.onKeyPress()), Na(e));
        } else e.currentTarget.blur();
      }
    }, {
      key: "validatePosition",
      value: function value(e, t) {
        var n = this.state,
            r = n.handlePos,
            i = n.handleDimensions;
        return Math.max(Math.min(t, void 0 !== r[e + 1] ? r[e + 1] - i : Ra), void 0 !== r[e - 1] ? r[e - 1] + i : 0);
      }
    }, {
      key: "validateValues",
      value: function value(e, t) {
        var n = t || this.props,
            i = n.max,
            a = n.min;
        return e.map(function (e, t, n) {
          var r = Math.max(Math.min(e, i), a);
          return n.length && r < n[t - 1] ? n[t - 1] : r;
        });
      }
    }, {
      key: "canMove",
      value: function value(e, t) {
        var n = this.state,
            r = n.handlePos,
            i = n.handleDimensions;
        return !(t < 0) && !(Ra < t) && !((void 0 !== r[e + 1] ? r[e + 1] - i : 1 / 0) < t) && !(t < (void 0 !== r[e - 1] ? r[e - 1] + i : -1 / 0));
      }
    }, {
      key: "fireChangeEvent",
      value: function value() {
        var e = this.props.onChange;
        e && e(this.getPublicState());
      }
    }, {
      key: "slideTo",
      value: function value(e, t, n) {
        var r = this,
            i = this.getNextState(e, t);
        this.setState(i, function () {
          var e = r.props.onValuesUpdated;
          e && e(r.getPublicState()), n && n();
        });
      }
    }, {
      key: "updateNewValues",
      value: function value(e) {
        var t = this;

        if (null === this.state.slidingIndex) {
          var n = e.max,
              r = e.min,
              i = e.values,
              a = this.validateValues(i, e);
          this.setState({
            handlePos: a.map(function (e) {
              return Sa(e, r, n);
            }),
            values: a
          }, function () {
            return t.fireChangeEvent();
          });
        }
      }
    }, {
      key: "render",
      value: function value() {
        var r = this,
            e = this.props,
            t = e.children,
            i = e.disabled,
            a = e.handle,
            s = e.max,
            o = e.min,
            c = e.orientation,
            u = e.pitComponent,
            n = e.pitPoints,
            l = e.progressBar,
            h = this.state,
            d = h.className,
            f = h.handlePos,
            m = h.values;
        return Mn("div", {
          className: d,
          ref: function ref(e) {
            r.rheostat = e;
          },
          onClick: !i && this.handleClick,
          style: {
            position: "relative"
          }
        }, Ia, f.map(function (e, t) {
          var n = "vertical" === c ? {
            top: "".concat(e, "%"),
            position: "absolute"
          } : {
            left: "".concat(e, "%"),
            position: "absolute"
          };
          return Mn(a, {
            "aria-valuemax": r.getMaxValue(t),
            "aria-valuemin": r.getMinValue(t),
            "aria-valuenow": m[t],
            "aria-disabled": i,
            "data-handle-key": t,
            className: "rheostat-handle",
            key: "handle-".concat(t),
            onClick: r.killEvent,
            onKeyDown: !i && r.handleKeydown,
            onMouseDown: !i && r.startMouseSlide,
            onTouchStart: !i && r.startTouchSlide,
            role: "slider",
            style: n,
            tabIndex: 0
          });
        }), f.map(function (e, t, n) {
          return 0 === t && 1 < n.length ? null : Mn(l, {
            className: "rheostat-progress",
            key: "progress-bar-".concat(t),
            style: r.getProgressStyle(t)
          });
        }), u && n.map(function (e) {
          var t = Sa(e, o, s),
              n = "vertical" === c ? {
            top: "".concat(t, "%"),
            position: "absolute"
          } : {
            left: "".concat(t, "%"),
            position: "absolute"
          };
          return Mn(u, {
            key: "pit-".concat(e),
            style: n
          }, e);
        }), t);
      }
    }]), r;
  }();

  M(Fa, "defaultProps", {
    className: "",
    children: null,
    disabled: !1,
    handle: _a,
    max: Ra,
    min: 0,
    onClick: null,
    onChange: null,
    onKeyPress: null,
    onSliderDragEnd: null,
    onSliderDragMove: null,
    onSliderDragStart: null,
    onValuesUpdated: null,
    orientation: "horizontal",
    pitComponent: null,
    pitPoints: [],
    progressBar: "div",
    snap: !1,
    snapPoints: [],
    values: [0]
  });

  function Ca(e) {
    var t = e.style,
        n = e.children,
        r = Math.round(parseFloat(t.left)),
        i = [0, 50, 100].includes(r),
        a = Array.isArray(n) ? n[0] : n,
        s = Math.round(100 * parseInt(a, 10)) / 100;
    return Mn("div", {
      style: D(D({}, t), {}, {
        marginLeft: 100 === r ? "-2px" : 0
      }),
      className: oi("rheostat-marker", "rheostat-marker-horizontal", {
        "rheostat-marker-large": i
      })
    }, i && Mn("div", {
      className: "rheostat-value"
    }, s));
  }

  var Ta = function () {
    j(a, An);
    var i = H(a);

    function a() {
      var n;
      k(this, a);

      for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
        t[r] = arguments[r];
      }

      return M(A(n = i.call.apply(i, [this].concat(t))), "handleChange", function (e) {
        var t = e.values;
        n.isDisabled || n.props.refine(t);
      }), M(A(n), "createHandleComponent", function (r) {
        return function (e) {
          var t = Math.round(100 * parseFloat(e["aria-valuenow"])) / 100,
              n = r && r.format ? r.format(t) : t;
          return Mn("div", d({}, e, {
            className: oi(e.className, {
              "rheostat-handle-lower": 0 === e["data-handle-key"],
              "rheostat-handle-upper": 1 === e["data-handle-key"]
            })
          }), r && Mn("div", {
            className: "rheostat-tooltip"
          }, n));
        };
      }), n;
    }

    return L(a, [{
      key: "isDisabled",
      get: function get() {
        return this.props.min >= this.props.max;
      }
    }, {
      key: "computeDefaultPitPoints",
      value: function value(e) {
        var t = e.min,
            n = e.max,
            r = (n - t) / 34;
        return [t].concat(P(Ee({
          end: 33
        }).map(function (e) {
          return t + r * (e + 1);
        })), [n]);
      }
    }, {
      key: "computeSnapPoints",
      value: function value(e) {
        var t = e.min,
            n = e.max,
            r = e.step;
        if (r) return [].concat(P(Ee({
          start: t,
          end: n,
          step: r
        })), [n]);
      }
    }, {
      key: "render",
      value: function value() {
        var e = this.props,
            t = e.tooltips,
            n = e.step,
            r = e.pips,
            i = e.values,
            a = e.cssClasses,
            s = this.isDisabled ? {
          min: this.props.min,
          max: this.props.max + .001
        } : this.props,
            o = s.min,
            c = s.max,
            u = this.computeSnapPoints({
          min: o,
          max: c,
          step: n
        }),
            l = !1 === r ? [] : this.computeDefaultPitPoints({
          min: o,
          max: c
        });
        return Mn("div", {
          className: oi(a.root, M({}, a.disabledRoot, this.isDisabled))
        }, Mn(Fa, {
          handle: this.createHandleComponent(t),
          onChange: this.handleChange,
          min: o,
          max: c,
          pitComponent: Ca,
          pitPoints: l,
          snap: !0,
          snapPoints: u,
          values: this.isDisabled ? [o, c] : i,
          disabled: this.isDisabled
        }));
      }
    }]), a;
  }(),
      Ea = et({
    name: "range-slider"
  }),
      ka = vt("RangeSlider");

  var La = et({
    name: "sort-by"
  }),
      Ma = vt("SortBy");
  var ja = {
    item: '{{#count}}<a class="{{cssClasses.link}}" aria-label="{{value}} & up" href="{{href}}">{{/count}}{{^count}}<div class="{{cssClasses.link}}" aria-label="{{value}} & up" disabled>{{/count}}\n  {{#stars}}<svg class="{{cssClasses.starIcon}} {{#.}}{{cssClasses.fullStarIcon}}{{/.}}{{^.}}{{cssClasses.emptyStarIcon}}{{/.}}" aria-hidden="true" width="24" height="24">\n    {{#.}}<use xlink:href="#ais-RatingMenu-starSymbol"></use>{{/.}}{{^.}}<use xlink:href="#ais-RatingMenu-starEmptySymbol"></use>{{/.}}\n  </svg>{{/stars}}\n  <span class="{{cssClasses.label}}">& Up</span>\n  {{#count}}<span class="{{cssClasses.count}}">{{#helpers.formatNumber}}{{count}}{{/helpers.formatNumber}}</span>{{/count}}\n{{#count}}</a>{{/count}}{{^count}}</div>{{/count}}'
  },
      Oa = et({
    name: "rating-menu"
  }),
      Aa = vt("RatingMenu"),
      Ha = Mn("path", {
    d: "M12 .288l2.833 8.718h9.167l-7.417 5.389 2.833 8.718-7.416-5.388-7.417 5.388 2.833-8.718-7.416-5.389h9.167z"
  }),
      Da = Mn("path", {
    d: "M12 6.76l1.379 4.246h4.465l-3.612 2.625 1.379 4.246-3.611-2.625-3.612 2.625 1.379-4.246-3.612-2.625h4.465l1.38-4.246zm0-6.472l-2.833 8.718h-9.167l7.416 5.389-2.833 8.718 7.417-5.388 7.416 5.388-2.833-8.718 7.417-5.389h-9.167l-2.833-8.718z"
  });

  function Wa(e) {
    var t = e.nbHits,
        n = e.hitsPerPage,
        r = e.nbPages,
        i = e.page,
        a = e.processingTimeMS,
        s = e.query,
        o = e.templateProps,
        c = e.cssClasses;
    return Mn("div", {
      className: c.root
    }, Mn(ci, d({}, o, {
      templateKey: "text",
      rootTagName: "span",
      rootProps: {
        className: c.text
      },
      data: {
        hasManyResults: 1 < t,
        hasNoResults: 0 === t,
        hasOneResult: 1 === t,
        hitsPerPage: n,
        nbHits: t,
        nbPages: r,
        page: i,
        processingTimeMS: a,
        query: s,
        cssClasses: c
      }
    })));
  }

  var Ba = {
    text: "{{#hasNoResults}}No results{{/hasNoResults}}\n    {{#hasOneResult}}1 result{{/hasOneResult}}\n    {{#hasManyResults}}{{#helpers.formatNumber}}{{nbHits}}{{/helpers.formatNumber}} results{{/hasManyResults}} found in {{processingTimeMS}}ms"
  },
      Ua = et({
    name: "stats"
  }),
      Qa = vt("Stats");

  function qa(e) {
    var t = e.currentRefinement,
        n = e.refine,
        r = e.cssClasses,
        i = e.templateProps;
    return Mn("div", {
      className: r.root
    }, Mn("label", {
      className: r.label
    }, Mn("input", {
      className: r.checkbox,
      type: "checkbox",
      checked: t.isRefined,
      onChange: function onChange(e) {
        return n(!e.target.checked);
      }
    }), Mn(ci, d({}, i, {
      rootTagName: "span",
      rootProps: {
        className: r.labelText
      },
      templateKey: "labelText",
      data: t
    }))));
  }

  var $a = {
    labelText: "{{name}}"
  },
      Va = et({
    name: "toggle-refinement"
  }),
      Ka = vt("ToggleRefinement");

  function za(e) {
    var r = e.items,
        i = e.cssClasses,
        a = e.templateProps,
        s = e.createURL,
        o = e.refine;
    return Mn("div", {
      className: oi(i.root, M({}, i.noRefinementRoot, 0 === r.length))
    }, Mn("ul", {
      className: i.list
    }, Mn("li", {
      className: oi(i.item, M({}, i.selectedItem, 0 === r.length))
    }, Mn(ci, d({}, a, {
      templateKey: "home",
      rootTagName: "a",
      rootProps: {
        className: i.link,
        href: s(void 0),
        onClick: function onClick(e) {
          e.preventDefault(), o(void 0);
        }
      }
    }))), r.map(function (t, e) {
      var n = e === r.length - 1;
      return Mn("li", {
        key: t.label + e,
        className: oi(i.item, M({}, i.selectedItem, n))
      }, Mn(ci, d({}, a, {
        templateKey: "separator",
        rootTagName: "span",
        rootProps: {
          className: i.separator,
          "aria-hidden": !0
        }
      })), n ? t.label : Mn("a", {
        className: i.link,
        href: s(t.value),
        onClick: function onClick(e) {
          e.preventDefault(), o(t.value);
        }
      }, t.label));
    })));
  }

  var Ja = et({
    name: "analytics"
  }),
      Ya = {
    home: "Home",
    separator: ">"
  },
      Ga = et({
    name: "breadcrumb"
  }),
      Za = vt("Breadcrumb");

  function Xa(e) {
    var t = e.cssClasses,
        n = e.templateProps,
        r = e.items,
        i = e.refine,
        a = (Re(r, function (e) {
      return e.isRefined;
    }) || {
      value: ""
    }).value;
    return Mn("div", {
      className: oi(t.root, M({}, t.noRefinementRoot, 0 === r.length))
    }, Mn("select", {
      className: t.select,
      value: a,
      onChange: function onChange(e) {
        i(e.target.value);
      }
    }, Mn(ci, d({}, n, {
      templateKey: "defaultOption",
      rootTagName: "option",
      rootProps: {
        value: "",
        className: t.option
      }
    })), r.map(function (e) {
      return Mn(ci, d({}, n, {
        templateKey: "item",
        rootTagName: "option",
        rootProps: {
          value: e.value,
          className: t.option
        },
        key: e.value,
        data: e
      }));
    })));
  }

  var es = {
    item: "{{label}} ({{#helpers.formatNumber}}{{count}}{{/helpers.formatNumber}})",
    defaultOption: "See all"
  },
      ts = et({
    name: "menu-select"
  }),
      ns = vt("MenuSelect");

  function rs(e) {
    var t = e.url,
        n = e.theme,
        r = e.cssClasses;
    return Mn("div", {
      className: r.root
    }, Mn("a", {
      href: t,
      target: "_blank",
      className: r.link,
      "aria-label": "Search by Algolia",
      rel: "noopener noreferrer"
    }, Mn("svg", {
      height: "1.2em",
      className: r.logo,
      viewBox: "0 0 168 24",
      style: {
        width: "auto"
      }
    }, Mn("path", {
      fill: "dark" === n ? "#FFF" : "#5D6494",
      d: "M6.97 6.68V8.3a4.47 4.47 0 00-2.42-.67 2.2 2.2 0 00-1.38.4c-.34.26-.5.6-.5 1.02 0 .43.16.77.49 1.03.33.25.83.53 1.51.83a7.04 7.04 0 011.9 1.08c.34.24.58.54.73.89.15.34.23.74.23 1.18 0 .95-.33 1.7-1 2.24a4 4 0 01-2.6.81 5.71 5.71 0 01-2.94-.68v-1.71c.84.63 1.81.94 2.92.94.58 0 1.05-.14 1.39-.4.34-.28.5-.65.5-1.13 0-.29-.1-.55-.3-.8a2.2 2.2 0 00-.65-.53 23.03 23.03 0 00-1.64-.78 13.67 13.67 0 01-1.11-.64c-.12-.1-.28-.22-.46-.4a1.72 1.72 0 01-.39-.5 4.46 4.46 0 01-.22-.6c-.07-.23-.1-.48-.1-.75 0-.91.33-1.63 1-2.17a4 4 0 012.57-.8c.97 0 1.8.18 2.47.52zm7.47 5.7v-.3a2.26 2.26 0 00-.5-1.44c-.3-.35-.74-.53-1.32-.53-.53 0-.99.2-1.37.58a2.9 2.9 0 00-.72 1.68h3.91zm1 2.79v1.4c-.6.34-1.38.51-2.36.51a4.02 4.02 0 01-3-1.13 4.04 4.04 0 01-1.11-2.97c0-1.3.34-2.32 1.02-3.06a3.38 3.38 0 012.6-1.1c1.03 0 1.85.32 2.46.96.6.64.9 1.57.9 2.78 0 .33-.03.68-.09 1.04h-5.31c.1.7.4 1.24.89 1.61.49.38 1.1.56 1.85.56.86 0 1.58-.2 2.15-.6zm6.61-1.78h-1.21c-.6 0-1.05.12-1.35.36-.3.23-.46.53-.46.89 0 .37.12.66.36.88.23.2.57.32 1.02.32.5 0 .9-.15 1.2-.43.3-.28.44-.65.44-1.1v-.92zm-4.07-2.55V9.33a4.96 4.96 0 012.5-.55c2.1 0 3.17 1.03 3.17 3.08V17H22.1v-.96c-.42.68-1.15 1.02-2.19 1.02-.76 0-1.38-.22-1.84-.66-.46-.44-.7-1-.7-1.68 0-.78.3-1.38.88-1.81.59-.43 1.4-.65 2.46-.65h1.34v-.46c0-.55-.13-.97-.4-1.25-.26-.29-.7-.43-1.32-.43-.86 0-1.65.24-2.35.72zm9.34-1.93v1.42c.39-1 1.1-1.5 2.12-1.5.15 0 .31.02.5.05v1.53c-.23-.1-.48-.14-.76-.14-.54 0-.99.24-1.34.71a2.8 2.8 0 00-.52 1.71V17h-1.57V8.91h1.57zm5 4.09a3 3 0 00.76 2.01c.47.53 1.14.8 2 .8.64 0 1.24-.18 1.8-.53v1.4c-.53.32-1.2.48-2 .48a3.98 3.98 0 01-4.17-4.18c0-1.16.38-2.15 1.14-2.98a4 4 0 013.1-1.23c.7 0 1.34.15 1.92.44v1.44a3.24 3.24 0 00-1.77-.5A2.65 2.65 0 0032.33 13zm7.92-7.28v4.58c.46-1 1.3-1.5 2.5-1.5.8 0 1.42.24 1.9.73.48.5.72 1.17.72 2.05V17H43.8v-5.1c0-.56-.14-.99-.43-1.29-.28-.3-.65-.45-1.1-.45-.54 0-1 .2-1.42.6-.4.4-.61 1.02-.61 1.85V17h-1.56V5.72h1.56zM55.2 15.74c.6 0 1.1-.25 1.5-.76.4-.5.6-1.16.6-1.95 0-.92-.2-1.62-.6-2.12-.4-.5-.92-.74-1.55-.74-.56 0-1.05.22-1.5.67-.44.45-.66 1.13-.66 2.06 0 .96.22 1.67.64 2.14.43.47.95.7 1.57.7zM53 5.72v4.42a2.74 2.74 0 012.43-1.34c1.03 0 1.86.38 2.51 1.15.65.76.97 1.78.97 3.05 0 1.13-.3 2.1-.92 2.9-.62.81-1.47 1.21-2.54 1.21s-1.9-.45-2.46-1.34V17h-1.58V5.72H53zm9.9 11.1l-3.22-7.9h1.74l1 2.62 1.26 3.42c.1-.32.48-1.46 1.15-3.42l.91-2.63h1.66l-2.92 7.87c-.78 2.07-1.96 3.1-3.56 3.1-.28 0-.53-.02-.73-.07v-1.34c.17.04.35.06.54.06 1.03 0 1.76-.57 2.17-1.7z"
    }), is, as, Mn("path", {
      fill: "dark" === n ? "#FFF" : "#5468FF",
      d: "M120.92 18.8c-4.38.02-4.38-3.54-4.38-4.1V1.36l2.67-.42v13.25c0 .32 0 2.36 1.71 2.37v2.24zm-10.84-2.18c.82 0 1.43-.04 1.85-.12v-2.72a5.48 5.48 0 00-1.57-.2c-.3 0-.6.02-.9.07-.3.04-.57.12-.81.24-.24.11-.44.28-.58.49a.93.93 0 00-.22.65c0 .63.22 1 .61 1.23.4.24.94.36 1.62.36zm-.23-9.7c.88 0 1.62.11 2.23.33.6.22 1.09.53 1.44.92.36.4.61.92.76 1.48.16.56.23 1.17.23 1.85v6.87a21.69 21.69 0 01-4.68.5c-.69 0-1.32-.07-1.9-.2a4 4 0 01-1.46-.63 3.3 3.3 0 01-.96-1.13 4.3 4.3 0 01-.34-1.8 3.13 3.13 0 011.43-2.63c.45-.3.95-.5 1.54-.62a8.8 8.8 0 013.79.05v-.44c0-.3-.04-.6-.11-.87a1.78 1.78 0 00-1.1-1.22 3.2 3.2 0 00-1.15-.2 9.75 9.75 0 00-2.95.46l-.33-2.19a11.43 11.43 0 013.56-.53zm52.84 9.63c.82 0 1.43-.05 1.85-.13V13.7a5.42 5.42 0 00-1.57-.2c-.3 0-.6.02-.9.07-.3.04-.57.12-.81.24-.24.12-.44.28-.58.5a.93.93 0 00-.22.65c0 .63.22.99.61 1.23.4.24.94.36 1.62.36zm-.23-9.7c.88 0 1.63.11 2.23.33.6.22 1.1.53 1.45.92.35.39.6.92.76 1.48.15.56.23 1.18.23 1.85v6.88c-.41.08-1.03.19-1.87.31-.83.12-1.77.18-2.81.18-.7 0-1.33-.06-1.9-.2a4 4 0 01-1.47-.63c-.4-.3-.72-.67-.95-1.13a4.3 4.3 0 01-.34-1.8c0-.66.13-1.08.38-1.53.26-.45.61-.82 1.05-1.1.44-.3.95-.5 1.53-.62a8.8 8.8 0 013.8.05v-.43c0-.31-.04-.6-.12-.88-.07-.28-.2-.52-.38-.73a1.78 1.78 0 00-.73-.5c-.3-.1-.68-.2-1.14-.2a9.85 9.85 0 00-2.95.47l-.32-2.19a11.63 11.63 0 013.55-.53zm-8.03-1.27a1.62 1.62 0 000-3.24 1.62 1.62 0 100 3.24zm1.35 13.22h-2.7V7.27l2.7-.42V18.8zm-4.72 0c-4.38.02-4.38-3.54-4.38-4.1l-.01-13.34 2.67-.42v13.25c0 .32 0 2.36 1.72 2.37v2.24zm-8.7-5.9a4.7 4.7 0 00-.74-2.79 2.4 2.4 0 00-2.07-1 2.4 2.4 0 00-2.06 1 4.7 4.7 0 00-.74 2.8c0 1.16.25 1.94.74 2.62a2.4 2.4 0 002.07 1.02c.88 0 1.57-.34 2.07-1.02a4.2 4.2 0 00.73-2.63zm2.74 0a6.46 6.46 0 01-1.52 4.23c-.49.53-1.07.94-1.76 1.22-.68.29-1.73.45-2.26.45a6.6 6.6 0 01-2.25-.45 5.1 5.1 0 01-2.88-3.13 7.3 7.3 0 01-.01-4.84 5.13 5.13 0 012.9-3.1 5.67 5.67 0 012.22-.42c.81 0 1.56.14 2.24.42.69.29 1.28.69 1.75 1.22.49.52.87 1.15 1.14 1.89a7 7 0 01.43 2.5zm-20.14 0c0 1.11.25 2.36.74 2.88.5.52 1.13.78 1.91.78a4.07 4.07 0 002.12-.6V9.33c-.19-.04-.99-.2-1.76-.23a2.67 2.67 0 00-2.23 1 4.73 4.73 0 00-.78 2.8zm7.44 5.27c0 1.82-.46 3.16-1.4 4-.94.85-2.37 1.27-4.3 1.27-.7 0-2.17-.13-3.34-.4l.43-2.11c.98.2 2.27.26 2.95.26 1.08 0 1.84-.22 2.3-.66.46-.43.68-1.08.68-1.94v-.44a5.2 5.2 0 01-2.54.6 5.6 5.6 0 01-2.01-.36 4.2 4.2 0 01-2.58-2.71 9.88 9.88 0 01.02-5.35 4.92 4.92 0 012.93-2.96 6.6 6.6 0 012.43-.46 19.64 19.64 0 014.43.66v10.6z"
    }))));
  }

  var is = Mn("path", {
    fill: "#5468FF",
    d: "M78.99.94h16.6a2.97 2.97 0 012.96 2.96v16.6a2.97 2.97 0 01-2.97 2.96h-16.6a2.97 2.97 0 01-2.96-2.96V3.9A2.96 2.96 0 0179 .94"
  }),
      as = Mn("path", {
    fill: "#FFF",
    d: "M89.63 5.97v-.78a.98.98 0 00-.98-.97h-2.28a.98.98 0 00-.97.97V6c0 .09.08.15.17.13a7.13 7.13 0 013.9-.02c.08.02.16-.04.16-.13m-6.25 1L83 6.6a.98.98 0 00-1.38 0l-.46.46a.97.97 0 000 1.38l.38.39c.06.06.15.04.2-.02a7.49 7.49 0 011.63-1.62c.07-.04.08-.14.02-.2m4.16 2.45v3.34c0 .1.1.17.2.12l2.97-1.54c.06-.03.08-.12.05-.18a3.7 3.7 0 00-3.08-1.87c-.07 0-.14.06-.14.13m0 8.05a4.49 4.49 0 110-8.98 4.49 4.49 0 010 8.98m0-10.85a6.37 6.37 0 100 12.74 6.37 6.37 0 000-12.74"
  }),
      ss = vt("PoweredBy"),
      os = et({
    name: "powered-by"
  });
  var cs,
      us,
      ls = [],
      hs = xn.__r;

  xn.__r = function (e) {
    hs && hs(e), cs = 0, (us = e.__c).__H && (us.__H.t = Rs(us.__H.t));
  };

  var ds = xn.diffed;

  xn.diffed = function (e) {
    ds && ds(e);
    var t = e.__c;

    if (t) {
      var n = t.__H;
      n && (n.u = (n.u.some(function (e) {
        e.ref && (e.ref.current = e.createHandle());
      }), []), n.i = Rs(n.i));
    }
  };

  var fs = xn.unmount;

  function ms(e) {
    xn.__h && xn.__h(us);
    var t = us.__H || (us.__H = {
      o: [],
      t: [],
      i: [],
      u: []
    });
    return e >= t.o.length && t.o.push({}), t.o[e];
  }

  function ps(e) {
    return function (n, e, t) {
      var r = ms(cs++);
      return r.__c || (r.__c = us, r.v = [t ? t(e) : xs(void 0, e), function (e) {
        var t = n(r.v[0], e);
        r.v[0] !== t && (r.v[0] = t, r.__c.setState({}));
      }]), r.v;
    }(xs, e);
  }

  function gs(e) {
    return function (e, t) {
      var n = ms(cs++);
      return Ps(n.m, t) ? (n.m = t, n.p = e, n.v = e()) : n.v;
    }(function () {
      return {
        current: e
      };
    }, []);
  }

  xn.unmount = function (e) {
    fs && fs(e);
    var t = e.__c;

    if (t) {
      var n = t.__H;
      n && n.o.forEach(function (e) {
        return e.l && e.l();
      });
    }
  };

  var vs = function vs() {};

  function ys() {
    ls.some(function (e) {
      e.s = !1, e.__P && (e.__H.t = Rs(e.__H.t));
    }), ls = [];
  }

  if ("undefined" != typeof window) {
    var bs = xn.requestAnimationFrame;

    vs = function vs(e) {
      (!e.s && (e.s = !0) && 1 === ls.push(e) || bs !== xn.requestAnimationFrame) && (bs = xn.requestAnimationFrame, (xn.requestAnimationFrame || function (e) {
        function t() {
          clearTimeout(n), cancelAnimationFrame(r), setTimeout(e);
        }

        var n = setTimeout(t, 100),
            r = requestAnimationFrame(t);
      })(ys));
    };
  }

  function Rs(e) {
    return e.forEach(Ss), e.forEach(ws), [];
  }

  function Ss(e) {
    e.l && e.l();
  }

  function ws(e) {
    var t = e.v();
    "function" == typeof t && (e.l = t);
  }

  function Ps(n, e) {
    return !n || e.some(function (e, t) {
      return e !== n[t];
    });
  }

  function xs(e, t) {
    return "function" == typeof t ? t(e) : t;
  }

  function Ns(e) {
    var t,
        n = W(ps(e.isCollapsed), 2),
        r = n[0],
        i = n[1],
        a = W(ps(!1), 2),
        s = a[0],
        o = a[1],
        c = gs(null);
    return function (e, t) {
      var n = ms(cs++);
      Ps(n.m, t) && (n.v = e, n.m = t, us.__H.t.push(n), vs(us));
    }(function () {
      if (c.current) return c.current.appendChild(e.bodyElement), function () {
        c.current.removeChild(e.bodyElement);
      };
    }, [c, e.bodyElement]), s || e.isCollapsed === r || i(e.isCollapsed), Mn("div", {
      className: oi(e.cssClasses.root, (t = {}, M(t, e.cssClasses.noRefinementRoot, e.hidden), M(t, e.cssClasses.collapsibleRoot, e.collapsible), M(t, e.cssClasses.collapsedRoot, r), t)),
      hidden: e.hidden
    }, e.templates.header && Mn("div", {
      className: e.cssClasses.header
    }, Mn(ci, {
      templates: e.templates,
      templateKey: "header",
      rootTagName: "span",
      data: e.data
    }), e.collapsible && Mn("button", {
      className: e.cssClasses.collapseButton,
      "aria-expanded": !r,
      onClick: function onClick(e) {
        e.preventDefault(), o(!0), i(function (e) {
          return !e;
        });
      }
    }, Mn(ci, {
      templates: e.templates,
      templateKey: "collapseButtonText",
      rootTagName: "span",
      data: {
        collapsed: r
      }
    }))), Mn("div", {
      className: e.cssClasses.body,
      ref: c
    }), e.templates.footer && Mn(ci, {
      templates: e.templates,
      templateKey: "footer",
      rootProps: {
        className: e.cssClasses.footer
      },
      data: e.data
    }));
  }

  function _s(e) {
    var t = e.cssClasses,
        n = e.isBrowserSupported,
        r = e.isListening,
        i = e.toggleListening,
        a = e.voiceListeningState,
        s = e.templates,
        o = a.status,
        c = a.transcript,
        u = a.isSpeechFinal,
        l = a.errorCode;
    return Mn("div", {
      className: t.root
    }, Mn(ci, {
      templateKey: "buttonText",
      rootTagName: "button",
      rootProps: {
        className: t.button,
        type: "button",
        title: "Search by voice".concat(n ? "" : " (not supported on this browser)"),
        onClick: function onClick(e) {
          e.currentTarget.blur(), i();
        },
        disabled: !n
      },
      data: {
        status: o,
        errorCode: l,
        isListening: r,
        transcript: c,
        isSpeechFinal: u,
        isBrowserSupported: n
      },
      templates: s
    }), Mn(ci, {
      templateKey: "status",
      rootProps: {
        className: t.status
      },
      data: {
        status: o,
        errorCode: l,
        isListening: r,
        transcript: c,
        isSpeechFinal: u,
        isBrowserSupported: n
      },
      templates: s
    }));
  }

  function Is(e) {
    var t = e.isBrowserSupported,
        n = e.isListening,
        r = e.toggleListening,
        i = e.voiceListeningState,
        a = e.widgetParams,
        s = a.container,
        o = a.cssClasses,
        c = a.templates;
    Zn(Mn(_s, {
      cssClasses: o,
      templates: c,
      isBrowserSupported: t,
      isListening: n,
      toggleListening: r,
      voiceListeningState: i
    }), s);
  }

  function Fs(e) {
    var t = e.cssClasses,
        n = e.templates,
        r = e.items;
    return Mn(ci, {
      templateKey: "default",
      templates: n,
      rootProps: {
        className: t.root
      },
      data: {
        items: r
      }
    });
  }

  function Cs(e) {
    var t = e.items,
        n = e.widgetParams,
        r = n.container,
        i = n.cssClasses,
        a = n.templates;
    Zn(Mn(Fs, {
      cssClasses: i,
      templates: a,
      items: t
    }), r);
  }

  var Ts = et({
    name: "panel"
  }),
      Es = vt("Panel"),
      ks = {
    buttonText: function buttonText(e) {
      var t = e.status,
          n = e.errorCode,
          r = e.isListening;
      return '<svg\n       xmlns="http://www.w3.org/2000/svg"\n       width="16"\n       height="16"\n       viewBox="0 0 24 24"\n       fill="none"\n       stroke="currentColor"\n       stroke-width="2"\n       stroke-linecap="round"\n       stroke-linejoin="round"\n     >\n       '.concat(function (e, t, n) {
        return "error" === e && "not-allowed" === t ? '<line x1="1" y1="1" x2="23" y2="23"></line>\n            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>\n            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>\n            <line x1="12" y1="19" x2="12" y2="23"></line>\n            <line x1="8" y1="23" x2="16" y2="23"></line>' : '<path\n            d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"\n            fill="'.concat(n ? "currentColor" : "none", '">\n          </path>\n          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>\n          <line x1="12" y1="19" x2="12" y2="23"></line>\n          <line x1="8" y1="23" x2="16" y2="23"></line>');
      }(t, n, r), "\n     </svg>");
    },
    status: "<p>{{transcript}}</p>"
  },
      Ls = et({
    name: "voice-search"
  }),
      Ms = vt("VoiceSearch"),
      js = et({
    name: "query-rule-custom-data"
  }),
      Os = vt("QueryRuleCustomData"),
      As = et({
    name: "query-rule-context"
  }),
      Hs = Object.freeze({
    __proto__: null,
    clearRefinements: function clearRefinements(e) {
      var t = e || {},
          n = t.container,
          r = t.templates,
          i = void 0 === r ? fi : r,
          a = t.includedAttributes,
          s = t.excludedAttributes,
          o = t.transformItems,
          c = t.cssClasses,
          u = void 0 === c ? {} : c;
      if (!n) throw new Error(mi("The `container` option is required."));

      var l = he(n),
          h = {
        root: oi(pi(), u.root),
        button: oi(pi({
          descendantName: "button"
        }), u.button),
        disabledButton: oi(pi({
          descendantName: "button",
          modifierName: "disabled"
        }), u.disabledButton)
      },
          d = function (e) {
        var a = e.containerNode,
            s = e.cssClasses,
            o = e.renderState,
            c = e.templates;
        return function (e, t) {
          var n = e.refine,
              r = e.hasRefinements,
              i = e.instantSearchInstance;
          t ? o.templateProps = me({
            defaultTemplates: fi,
            templatesConfig: i.templatesConfig,
            templates: c
          }) : Zn(Mn(ui, {
            refine: n,
            cssClasses: s,
            hasRefinements: r,
            templateProps: o.templateProps
          }), a);
        };
      }({
        containerNode: l,
        cssClasses: h,
        renderState: {},
        templates: i
      });

      return D(D({}, un(d, function () {
        return Zn(null, l);
      })({
        includedAttributes: a,
        excludedAttributes: s,
        transformItems: o
      })), {}, {
        $$widgetType: "ais.clearRefinements"
      });
    },
    configure: function configure(e) {
      return D(D({}, Jr(Ie)({
        searchParameters: e
      })), {}, {
        $$widgetType: "ais.configure"
      });
    },
    EXPERIMENTAL_configureRelatedItems: function EXPERIMENTAL_configureRelatedItems(e) {
      return D(D({}, Zr(Ie)(e)), {}, {
        $$widgetType: "ais.configureRelatedItems"
      });
    },
    currentRefinements: function currentRefinements(e) {
      var t = e || {},
          n = t.container,
          r = t.includedAttributes,
          i = t.excludedAttributes,
          a = t.cssClasses,
          s = void 0 === a ? {} : a,
          o = t.transformItems;
      if (!n) throw new Error(gi("The `container` option is required."));
      var c = he(n),
          u = {
        root: oi(vi(), s.root),
        list: oi(vi({
          descendantName: "list"
        }), s.list),
        item: oi(vi({
          descendantName: "item"
        }), s.item),
        label: oi(vi({
          descendantName: "label"
        }), s.label),
        category: oi(vi({
          descendantName: "category"
        }), s.category),
        categoryLabel: oi(vi({
          descendantName: "categoryLabel"
        }), s.categoryLabel),
        delete: oi(vi({
          descendantName: "delete"
        }), s.delete)
      };
      return D(D({}, dn(hi, function () {
        return Zn(null, c);
      })({
        container: c,
        cssClasses: u,
        includedAttributes: r,
        excludedAttributes: i,
        transformItems: o
      })), {}, {
        $$widgetType: "ais.currentRefinements"
      });
    },
    geoSearch: function geoSearch(e) {
      var t = e || {},
          n = t.initialZoom,
          r = void 0 === n ? 1 : n,
          i = t.initialPosition,
          a = void 0 === i ? {
        lat: 0,
        lng: 0
      } : i,
          s = t.templates,
          o = void 0 === s ? {} : s,
          c = t.cssClasses,
          u = void 0 === c ? {} : c,
          l = t.builtInMarker,
          h = void 0 === l ? {} : l,
          d = t.customHTMLMarker,
          f = t.enableRefine,
          m = void 0 === f || f,
          p = t.enableClearMapRefinement,
          g = void 0 === p || p,
          v = t.enableRefineControl,
          y = void 0 === v || v,
          b = t.container,
          R = t.googleReference,
          S = O(t, ["initialZoom", "initialPosition", "templates", "cssClasses", "builtInMarker", "customHTMLMarker", "enableRefine", "enableClearMapRefinement", "enableRefineControl", "container", "googleReference"]),
          w = {
        createOptions: Ie,
        events: {}
      },
          P = {
        createOptions: Ie,
        events: {}
      };
      if (!b) throw new Error(xi("The `container` option is required."));
      if (!R) throw new Error(xi("The `googleReference` option is required."));

      var x = he(b),
          N = {
        root: oi(Ni(), u.root),
        tree: Ni({
          descendantName: "tree"
        }),
        map: oi(Ni({
          descendantName: "map"
        }), u.map),
        control: oi(Ni({
          descendantName: "control"
        }), u.control),
        label: oi(Ni({
          descendantName: "label"
        }), u.label),
        selectedLabel: oi(Ni({
          descendantName: "label",
          modifierName: "selected"
        }), u.selectedLabel),
        input: oi(Ni({
          descendantName: "input"
        }), u.input),
        redo: oi(Ni({
          descendantName: "redo"
        }), u.redo),
        disabledRedo: oi(Ni({
          descendantName: "redo",
          modifierName: "disabled"
        }), u.disabledRedo),
        reset: oi(Ni({
          descendantName: "reset"
        }), u.reset)
      },
          _ = D(D({}, Pi), o),
          I = D(D({}, w), h),
          F = (Boolean(d) || Boolean(o.HTMLMarker)) && D(D({}, P), d),
          C = function (h) {
        return function () {
          j(l, h.maps.OverlayView);
          var u = H(l);

          function l(e) {
            var t,
                n = e.__id,
                r = e.position,
                i = e.map,
                a = e.template,
                s = e.className,
                o = e.anchor,
                c = void 0 === o ? {
              x: 0,
              y: 0
            } : o;
            return k(this, l), M(A(t = u.call(this)), "__id", void 0), M(A(t), "anchor", void 0), M(A(t), "offset", void 0), M(A(t), "listeners", void 0), M(A(t), "latLng", void 0), M(A(t), "element", void 0), t.__id = n, t.anchor = c, t.listeners = {}, t.latLng = new h.maps.LatLng(r), t.element = document.createElement("div"), t.element.className = s, t.element.style.position = "absolute", t.element.innerHTML = a, t.setMap(i), t;
          }

          return L(l, [{
            key: "onAdd",
            value: function value() {
              this.getPanes().overlayMouseTarget.appendChild(this.element);
              var e = this.element.getBoundingClientRect();
              this.offset = {
                x: this.anchor.x + e.width / 2,
                y: this.anchor.y + e.height
              }, this.element.style.width = "".concat(e.width, "px");
            }
          }, {
            key: "draw",
            value: function value() {
              var e = this.getProjection().fromLatLngToDivPixel(this.latLng);
              this.element.style.left = "".concat(Math.round(e.x - this.offset.x), "px"), this.element.style.top = "".concat(Math.round(e.y - this.offset.y), "px"), this.element.style.zIndex = String(parseInt(this.element.style.top, 10));
            }
          }, {
            key: "onRemove",
            value: function value() {
              var t = this;
              this.element && (this.element.parentNode.removeChild(this.element), Object.keys(this.listeners).forEach(function (e) {
                t.element.removeEventListener(e, t.listeners[e]);
              }), delete this.element, delete this.listeners);
            }
          }, {
            key: "addListener",
            value: function value(e, t) {
              this.listeners[e] = t;
              var n = this.element;
              return n.addEventListener(e, t), {
                remove: function remove() {
                  return n.removeEventListener(e, t);
                }
              };
            }
          }, {
            key: "getPosition",
            value: function value() {
              return this.latLng;
            }
          }]), l;
        }();
      }(R),
          T = F ? function (e) {
        var t = e.item,
            n = O(e, ["item"]);
        return new C(D(D(D({}, F.createOptions(t)), n), {}, {
          __id: t.objectID,
          position: t._geoloc,
          className: oi(Ni({
            descendantName: "marker"
          })),
          template: be({
            templateKey: "HTMLMarker",
            templates: _,
            data: t
          })
        }));
      } : function (e) {
        var t = e.item,
            n = O(e, ["item"]);
        return new R.maps.Marker(D(D(D({}, I.createOptions(t)), n), {}, {
          __id: t.objectID,
          position: t._geoloc
        }));
      },
          E = F || I;

      return D(D({}, Ur(wi, function () {
        return Zn(null, x);
      })(D(D({}, S), {}, {
        renderState: {},
        container: x,
        googleReference: R,
        initialZoom: r,
        initialPosition: a,
        templates: _,
        cssClasses: N,
        createMarker: T,
        markerOptions: E,
        enableRefine: m,
        enableClearMapRefinement: g,
        enableRefineControl: y
      }))), {}, {
        $$widgetType: "ais.geoSearch"
      });
    },
    hierarchicalMenu: function hierarchicalMenu(e) {
      var t = e || {},
          n = t.container,
          r = t.attributes,
          i = t.separator,
          a = t.rootPath,
          s = t.showParentLevel,
          o = t.limit,
          c = t.showMore,
          u = void 0 !== c && c,
          l = t.showMoreLimit,
          h = t.sortBy,
          d = t.transformItems,
          f = t.templates,
          m = void 0 === f ? Ci : f,
          p = t.cssClasses,
          g = void 0 === p ? {} : p;
      if (!n) throw new Error(Ti("The `container` option is required."));
      var v = he(n);
      return D(D({}, bn(function (e) {
        var u = e.cssClasses,
            l = e.containerNode,
            h = e.showMore,
            d = e.templates,
            f = e.renderState;
        return function (e, t) {
          var n = e.createURL,
              r = e.items,
              i = e.refine,
              a = e.instantSearchInstance,
              s = e.isShowingMore,
              o = e.toggleShowMore,
              c = e.canToggleShowMore;
          t ? f.templateProps = me({
            defaultTemplates: Ci,
            templatesConfig: a.templatesConfig,
            templates: d
          }) : Zn(Mn(Fi, {
            createURL: n,
            cssClasses: u,
            facetValues: r,
            templateProps: f.templateProps,
            toggleRefinement: i,
            showMore: h,
            toggleShowMore: o,
            isShowingMore: s,
            canToggleShowMore: c
          }), l);
        };
      }({
        cssClasses: {
          root: oi(Ei(), g.root),
          noRefinementRoot: oi(Ei({
            modifierName: "noRefinement"
          }), g.noRefinementRoot),
          list: oi(Ei({
            descendantName: "list"
          }), g.list),
          childList: oi(Ei({
            descendantName: "list",
            modifierName: "child"
          }), g.childList),
          item: oi(Ei({
            descendantName: "item"
          }), g.item),
          selectedItem: oi(Ei({
            descendantName: "item",
            modifierName: "selected"
          }), g.selectedItem),
          parentItem: oi(Ei({
            descendantName: "item",
            modifierName: "parent"
          }), g.parentItem),
          link: oi(Ei({
            descendantName: "link"
          }), g.link),
          label: oi(Ei({
            descendantName: "label"
          }), g.label),
          count: oi(Ei({
            descendantName: "count"
          }), g.count),
          showMore: oi(Ei({
            descendantName: "showMore"
          }), g.showMore),
          disabledShowMore: oi(Ei({
            descendantName: "showMore",
            modifierName: "disabled"
          }), g.disabledShowMore)
        },
        containerNode: v,
        templates: m,
        showMore: u,
        renderState: {}
      }), function () {
        return Zn(null, v);
      })({
        attributes: r,
        separator: i,
        rootPath: a,
        showParentLevel: s,
        limit: o,
        showMore: u,
        showMoreLimit: l,
        sortBy: h,
        transformItems: d
      })), {}, {
        $$widgetType: "ais.hierarchicalMenu"
      });
    },
    hits: function hits(e) {
      var t = e || {},
          n = t.container,
          r = t.escapeHTML,
          i = t.transformItems,
          a = t.templates,
          s = void 0 === a ? Li : a,
          o = t.cssClasses,
          c = void 0 === o ? {} : o;
      if (!n) throw new Error(Mi("The `container` option is required."));

      var u = he(n),
          l = {
        root: oi(ji(), c.root),
        emptyRoot: oi(ji({
          modifierName: "empty"
        }), c.emptyRoot),
        list: oi(ji({
          descendantName: "list"
        }), c.list),
        item: oi(ji({
          descendantName: "item"
        }), c.item)
      },
          h = function (e) {
        var o = e.renderState,
            c = e.cssClasses,
            u = e.containerNode,
            l = e.templates;
        return function (e, t) {
          var n = e.hits,
              r = e.results,
              i = e.instantSearchInstance,
              a = e.insights,
              s = e.bindEvent;
          t ? o.templateProps = me({
            defaultTemplates: Li,
            templatesConfig: i.templatesConfig,
            templates: l
          }) : Zn(Mn(Oi, {
            cssClasses: c,
            hits: n,
            results: r,
            templateProps: o.templateProps,
            insights: a,
            sendEvent: function sendEvent(e) {
              i.sendEventToInsights(e);
            },
            bindEvent: s
          }), u);
        };
      }({
        containerNode: u,
        cssClasses: l,
        renderState: {},
        templates: s
      });

      return D(D({}, Pn(Rn)(h, function () {
        return Zn(null, u);
      })({
        escapeHTML: r,
        transformItems: i
      })), {}, {
        $$widgetType: "ais.hits"
      });
    },
    hitsPerPage: function hitsPerPage(e) {
      var t = e || {},
          n = t.container,
          r = t.items,
          i = t.cssClasses,
          a = void 0 === i ? {} : i,
          s = t.transformItems;
      if (!n) throw new Error(Hi("The `container` option is required."));

      var o = he(n),
          c = {
        root: oi(Di(), a.root),
        select: oi(Di({
          descendantName: "select"
        }), a.select),
        option: oi(Di({
          descendantName: "option"
        }), a.option)
      },
          u = function (e) {
        var a = e.containerNode,
            s = e.cssClasses;
        return function (e, t) {
          var n = e.items,
              r = e.refine;

          if (!t) {
            var i = (Re(n, function (e) {
              return e.isRefined;
            }) || {}).value;
            Zn(Mn("div", {
              className: s.root
            }, Mn(Ai, {
              cssClasses: s,
              currentValue: i,
              options: n,
              setValue: r
            })), a);
          }
        };
      }({
        containerNode: o,
        cssClasses: c
      });

      return D(D({}, tr(u, function () {
        return Zn(null, o);
      })({
        items: r,
        transformItems: s
      })), {}, {
        $$widgetType: "ais.hitsPerPage"
      });
    },
    infiniteHits: function infiniteHits(e) {
      var t = e || {},
          n = t.container,
          r = t.escapeHTML,
          i = t.transformItems,
          a = t.templates,
          s = void 0 === a ? Wi : a,
          o = t.cssClasses,
          c = void 0 === o ? {} : o,
          u = t.showPrevious,
          l = t.cache;
      if (!n) throw new Error(Bi("The `container` option is required."));

      var h = he(n),
          d = {
        root: oi(Ui(), c.root),
        emptyRoot: oi(Ui({
          modifierName: "empty"
        }), c.emptyRoot),
        item: oi(Ui({
          descendantName: "item"
        }), c.item),
        list: oi(Ui({
          descendantName: "list"
        }), c.list),
        loadPrevious: oi(Ui({
          descendantName: "loadPrevious"
        }), c.loadPrevious),
        disabledLoadPrevious: oi(Ui({
          descendantName: "loadPrevious",
          modifierName: "disabled"
        }), c.disabledLoadPrevious),
        loadMore: oi(Ui({
          descendantName: "loadMore"
        }), c.loadMore),
        disabledLoadMore: oi(Ui({
          descendantName: "loadMore",
          modifierName: "disabled"
        }), c.disabledLoadMore)
      },
          f = function (e) {
        var h = e.cssClasses,
            d = e.containerNode,
            f = e.renderState,
            m = e.templates,
            p = e.showPrevious;
        return function (e, t) {
          var n = e.hits,
              r = e.results,
              i = e.showMore,
              a = e.showPrevious,
              s = e.isFirstPage,
              o = e.isLastPage,
              c = e.instantSearchInstance,
              u = e.insights,
              l = e.bindEvent;
          t ? f.templateProps = me({
            defaultTemplates: Wi,
            templatesConfig: c.templatesConfig,
            templates: m
          }) : Zn(Mn(Qi, {
            cssClasses: h,
            hits: n,
            results: r,
            hasShowPrevious: p,
            showPrevious: a,
            showMore: i,
            templateProps: f.templateProps,
            isFirstPage: s,
            isLastPage: o,
            insights: u,
            sendEvent: function sendEvent(e) {
              c.sendEventToInsights(e);
            },
            bindEvent: l
          }), d);
        };
      }({
        containerNode: h,
        cssClasses: d,
        templates: s,
        showPrevious: u,
        renderState: {}
      });

      return D(D({}, Pn(sr)(f, function () {
        return Zn(null, h);
      })({
        escapeHTML: r,
        transformItems: i,
        showPrevious: u,
        cache: l
      })), {}, {
        $$widgetType: "ais.infiniteHits"
      });
    },
    menu: function menu(e) {
      var t = e || {},
          n = t.container,
          r = t.attribute,
          i = t.sortBy,
          a = t.limit,
          s = t.showMore,
          o = t.showMoreLimit,
          c = t.cssClasses,
          u = void 0 === c ? {} : c,
          l = t.templates,
          h = void 0 === l ? qi : l,
          d = t.transformItems;
      if (!n) throw new Error($i("The `container` option is required."));
      var f = he(n),
          m = {
        root: oi(Vi(), u.root),
        noRefinementRoot: oi(Vi({
          modifierName: "noRefinement"
        }), u.noRefinementRoot),
        list: oi(Vi({
          descendantName: "list"
        }), u.list),
        item: oi(Vi({
          descendantName: "item"
        }), u.item),
        selectedItem: oi(Vi({
          descendantName: "item",
          modifierName: "selected"
        }), u.selectedItem),
        link: oi(Vi({
          descendantName: "link"
        }), u.link),
        label: oi(Vi({
          descendantName: "label"
        }), u.label),
        count: oi(Vi({
          descendantName: "count"
        }), u.count),
        showMore: oi(Vi({
          descendantName: "showMore"
        }), u.showMore),
        disabledShowMore: oi(Vi({
          descendantName: "showMore",
          modifierName: "disabled"
        }), u.disabledShowMore)
      };
      return D(D({}, ur(function (e) {
        var l = e.containerNode,
            h = e.cssClasses,
            d = e.renderState,
            f = e.templates,
            m = e.showMore;
        return function (e, t) {
          var n = e.refine,
              r = e.items,
              i = e.createURL,
              a = e.instantSearchInstance,
              s = e.isShowingMore,
              o = e.toggleShowMore,
              c = e.canToggleShowMore;
          if (t) d.templateProps = me({
            defaultTemplates: qi,
            templatesConfig: a.templatesConfig,
            templates: f
          });else {
            var u = r.map(function (e) {
              return D(D({}, e), {}, {
                url: i(e.name)
              });
            });
            Zn(Mn(Fi, {
              createURL: i,
              cssClasses: h,
              facetValues: u,
              showMore: m,
              templateProps: d.templateProps,
              toggleRefinement: n,
              toggleShowMore: o,
              isShowingMore: s,
              canToggleShowMore: c
            }), l);
          }
        };
      }({
        containerNode: f,
        cssClasses: m,
        renderState: {},
        templates: h,
        showMore: s
      }), function () {
        return Zn(null, f);
      })({
        attribute: r,
        limit: a,
        showMore: s,
        showMoreLimit: o,
        sortBy: i,
        transformItems: d
      })), {}, {
        $$widgetType: "ais.menu"
      });
    },
    refinementList: function refinementList(e) {
      var t = e || {},
          n = t.container,
          r = t.attribute,
          i = t.operator,
          a = t.sortBy,
          s = t.limit,
          o = t.showMore,
          c = t.showMoreLimit,
          u = t.searchable,
          l = void 0 !== u && u,
          h = t.searchablePlaceholder,
          d = void 0 === h ? "Search..." : h,
          f = t.searchableEscapeFacetValues,
          m = void 0 === f || f,
          p = t.searchableIsAlwaysActive,
          g = void 0 === p || p,
          v = t.cssClasses,
          y = void 0 === v ? {} : v,
          b = t.templates,
          R = void 0 === b ? zi : b,
          S = t.transformItems;
      if (!n) throw new Error(Ji("The `container` option is required."));

      var w = !!l && Boolean(m),
          P = he(n),
          x = function (e) {
        var t = D(D({}, e), {}, {
          submit: e.searchableSubmit,
          reset: e.searchableReset,
          loadingIndicator: e.searchableLoadingIndicator
        });
        return t.searchableReset, t.searchableSubmit, t.searchableLoadingIndicator, O(t, ["searchableReset", "searchableSubmit", "searchableLoadingIndicator"]);
      }(D(D({}, zi), R)),
          N = {
        root: oi(Yi(), y.root),
        noRefinementRoot: oi(Yi({
          modifierName: "noRefinement"
        }), y.noRefinementRoot),
        list: oi(Yi({
          descendantName: "list"
        }), y.list),
        item: oi(Yi({
          descendantName: "item"
        }), y.item),
        selectedItem: oi(Yi({
          descendantName: "item",
          modifierName: "selected"
        }), y.selectedItem),
        searchBox: oi(Yi({
          descendantName: "searchBox"
        }), y.searchBox),
        label: oi(Yi({
          descendantName: "label"
        }), y.label),
        checkbox: oi(Yi({
          descendantName: "checkbox"
        }), y.checkbox),
        labelText: oi(Yi({
          descendantName: "labelText"
        }), y.labelText),
        count: oi(Yi({
          descendantName: "count"
        }), y.count),
        noResults: oi(Yi({
          descendantName: "noResults"
        }), y.noResults),
        showMore: oi(Yi({
          descendantName: "showMore"
        }), y.showMore),
        disabledShowMore: oi(Yi({
          descendantName: "showMore",
          modifierName: "disabled"
        }), y.disabledShowMore),
        searchable: {
          root: oi(Gi(), y.searchableRoot),
          form: oi(Gi({
            descendantName: "form"
          }), y.searchableForm),
          input: oi(Gi({
            descendantName: "input"
          }), y.searchableInput),
          submit: oi(Gi({
            descendantName: "submit"
          }), y.searchableSubmit),
          submitIcon: oi(Gi({
            descendantName: "submitIcon"
          }), y.searchableSubmitIcon),
          reset: oi(Gi({
            descendantName: "reset"
          }), y.searchableReset),
          resetIcon: oi(Gi({
            descendantName: "resetIcon"
          }), y.searchableResetIcon),
          loadingIndicator: oi(Gi({
            descendantName: "loadingIndicator"
          }), y.searchableLoadingIndicator),
          loadingIcon: oi(Gi({
            descendantName: "loadingIcon"
          }), y.searchableLoadingIcon)
        }
      };

      return D(D({}, xr(function (e) {
        var d = e.containerNode,
            f = e.cssClasses,
            m = e.templates,
            p = e.renderState,
            g = e.showMore,
            v = e.searchable,
            y = e.searchablePlaceholder,
            b = e.searchableIsAlwaysActive;
        return function (e, t) {
          var n = e.refine,
              r = e.items,
              i = e.createURL,
              a = e.searchForItems,
              s = e.isFromSearch,
              o = e.instantSearchInstance,
              c = e.toggleShowMore,
              u = e.isShowingMore,
              l = e.hasExhaustiveItems,
              h = e.canToggleShowMore;
          t ? p.templateProps = me({
            templatesConfig: o.templatesConfig,
            templates: m
          }) : Zn(Mn(Fi, {
            createURL: i,
            cssClasses: f,
            facetValues: r,
            templateProps: p.templateProps,
            toggleRefinement: n,
            searchFacetValues: v ? a : void 0,
            searchPlaceholder: y,
            searchIsAlwaysActive: b,
            isFromSearch: s,
            showMore: g && !s && 0 < r.length,
            toggleShowMore: c,
            isShowingMore: u,
            hasExhaustiveItems: l,
            canToggleShowMore: h
          }), d);
        };
      }({
        containerNode: P,
        cssClasses: N,
        templates: x,
        renderState: {},
        searchable: l,
        searchablePlaceholder: d,
        searchableIsAlwaysActive: g,
        showMore: o
      }), function () {
        return Zn(null, P);
      })({
        attribute: r,
        operator: i,
        limit: s,
        showMore: o,
        showMoreLimit: c,
        sortBy: a,
        escapeFacetValues: w,
        transformItems: S
      })), {}, {
        $$widgetType: "ais.refinementList"
      });
    },
    numericMenu: function numericMenu(e) {
      var t = e || {},
          n = t.container,
          r = t.attribute,
          i = t.items,
          a = t.cssClasses,
          s = void 0 === a ? {} : a,
          o = t.templates,
          c = void 0 === o ? Zi : o,
          u = t.transformItems;
      if (!n) throw new Error(Xi("The `container` option is required."));

      var l = he(n),
          h = {
        root: oi(ea(), s.root),
        noRefinementRoot: oi(ea({
          modifierName: "noRefinement"
        }), s.noRefinementRoot),
        list: oi(ea({
          descendantName: "list"
        }), s.list),
        item: oi(ea({
          descendantName: "item"
        }), s.item),
        selectedItem: oi(ea({
          descendantName: "item",
          modifierName: "selected"
        }), s.selectedItem),
        label: oi(ea({
          descendantName: "label"
        }), s.label),
        radio: oi(ea({
          descendantName: "radio"
        }), s.radio),
        labelText: oi(ea({
          descendantName: "labelText"
        }), s.labelText)
      },
          d = function (e) {
        var s = e.containerNode,
            o = e.attribute,
            c = e.cssClasses,
            u = e.renderState,
            l = e.templates;
        return function (e, t) {
          var n = e.createURL,
              r = e.instantSearchInstance,
              i = e.refine,
              a = e.items;
          t ? u.templateProps = me({
            defaultTemplates: Zi,
            templatesConfig: r.templatesConfig,
            templates: l
          }) : Zn(Mn(Fi, {
            createURL: n,
            cssClasses: c,
            facetValues: a,
            templateProps: u.templateProps,
            toggleRefinement: i,
            attribute: o
          }), s);
        };
      }({
        containerNode: l,
        attribute: r,
        cssClasses: h,
        renderState: {},
        templates: c
      });

      return D(D({}, lr(d, function () {
        return Zn(null, l);
      })({
        attribute: r,
        items: i,
        transformItems: u
      })), {}, {
        $$widgetType: "ais.numericMenu"
      });
    },
    pagination: function pagination(e) {
      var t = e || {},
          n = t.container,
          r = t.templates,
          i = void 0 === r ? {} : r,
          a = t.cssClasses,
          s = void 0 === a ? {} : a,
          o = t.totalPages,
          c = t.padding,
          u = t.showFirst,
          l = void 0 === u || u,
          h = t.showLast,
          d = void 0 === h || h,
          f = t.showPrevious,
          m = void 0 === f || f,
          p = t.showNext,
          g = void 0 === p || p,
          v = t.scrollTo,
          y = void 0 === v ? "body" : v;
      if (!n) throw new Error(ra("The `container` option is required."));

      var b = he(n),
          R = !0 === y ? "body" : y,
          S = !1 !== R && he(R),
          w = {
        root: oi(ia(), s.root),
        noRefinementRoot: oi(ia({
          modifierName: "noRefinement"
        }), s.noRefinementRoot),
        list: oi(ia({
          descendantName: "list"
        }), s.list),
        item: oi(ia({
          descendantName: "item"
        }), s.item),
        firstPageItem: oi(ia({
          descendantName: "item",
          modifierName: "firstPage"
        }), s.firstPageItem),
        lastPageItem: oi(ia({
          descendantName: "item",
          modifierName: "lastPage"
        }), s.lastPageItem),
        previousPageItem: oi(ia({
          descendantName: "item",
          modifierName: "previousPage"
        }), s.previousPageItem),
        nextPageItem: oi(ia({
          descendantName: "item",
          modifierName: "nextPage"
        }), s.nextPageItem),
        pageItem: oi(ia({
          descendantName: "item",
          modifierName: "page"
        }), s.pageItem),
        selectedItem: oi(ia({
          descendantName: "item",
          modifierName: "selected"
        }), s.selectedItem),
        disabledItem: oi(ia({
          descendantName: "item",
          modifierName: "disabled"
        }), s.disabledItem),
        link: oi(ia({
          descendantName: "link"
        }), s.link)
      },
          P = D(D({}, aa), i),
          x = function (e) {
        var l = e.containerNode,
            h = e.cssClasses,
            d = e.templates,
            f = e.totalPages,
            m = e.showFirst,
            p = e.showLast,
            g = e.showPrevious,
            v = e.showNext,
            y = e.scrollToNode;
        return function (e, t) {
          var n = e.createURL,
              r = e.currentRefinement,
              i = e.nbHits,
              a = e.nbPages,
              s = e.pages,
              o = e.isFirstPage,
              c = e.isLastPage,
              u = e.refine;

          if (!t) {
            Zn(Mn(na, {
              createURL: n,
              cssClasses: h,
              currentPage: r,
              templates: d,
              nbHits: i,
              nbPages: a,
              pages: s,
              totalPages: f,
              isFirstPage: o,
              isLastPage: c,
              setCurrentPage: function setCurrentPage(e) {
                u(e), !1 !== y && y.scrollIntoView();
              },
              showFirst: m,
              showLast: p,
              showPrevious: g,
              showNext: v
            }), l);
          }
        };
      }({
        containerNode: b,
        cssClasses: w,
        templates: P,
        showFirst: l,
        showLast: d,
        showPrevious: m,
        showNext: g,
        padding: c,
        scrollToNode: S
      });

      return D(D({}, gr(x, function () {
        return Zn(null, b);
      })({
        totalPages: o,
        padding: c
      })), {}, {
        $$widgetType: "ais.pagination"
      });
    },
    rangeInput: function rangeInput(e) {
      var t = e || {},
          n = t.container,
          r = t.attribute,
          i = t.min,
          a = t.max,
          s = t.precision,
          o = void 0 === s ? 0 : s,
          c = t.cssClasses,
          u = void 0 === c ? {} : c,
          l = t.templates,
          h = void 0 === l ? {} : l;
      if (!n) throw new Error(oa("The `container` option is required."));

      var d = he(n),
          f = D({
        separatorText: "to",
        submitText: "Go"
      }, h),
          m = {
        root: oi(ca(), u.root),
        noRefinement: oi(ca({
          modifierName: "noRefinement"
        })),
        form: oi(ca({
          descendantName: "form"
        }), u.form),
        label: oi(ca({
          descendantName: "label"
        }), u.label),
        input: oi(ca({
          descendantName: "input"
        }), u.input),
        inputMin: oi(ca({
          descendantName: "input",
          modifierName: "min"
        }), u.inputMin),
        inputMax: oi(ca({
          descendantName: "input",
          modifierName: "max"
        }), u.inputMax),
        separator: oi(ca({
          descendantName: "separator"
        }), u.separator),
        submit: oi(ca({
          descendantName: "submit"
        }), u.submit)
      },
          p = function (e) {
        var f = e.containerNode,
            m = e.cssClasses,
            p = e.renderState,
            g = e.templates;
        return function (e, t) {
          var n = e.refine,
              r = e.range,
              i = e.start,
              a = e.widgetParams,
              s = e.instantSearchInstance;
          if (t) p.templateProps = me({
            templatesConfig: s.templatesConfig,
            templates: g
          });else {
            var o = r.min,
                c = r.max,
                u = W(i, 2),
                l = u[0],
                h = u[1],
                d = 1 / Math.pow(10, a.precision);
            Zn(Mn(sa, {
              min: o,
              max: c,
              step: d,
              values: {
                min: l !== -1 / 0 && l !== o ? l : void 0,
                max: h !== 1 / 0 && h !== c ? h : void 0
              },
              cssClasses: m,
              refine: n,
              templateProps: p.templateProps
            }), f);
          }
        };
      }({
        containerNode: d,
        cssClasses: m,
        templates: f,
        renderState: {}
      });

      return D(D({}, wr(p, function () {
        return Zn(null, d);
      })({
        attribute: r,
        min: i,
        max: a,
        precision: o
      })), {}, {
        $$type: "ais.rangeInput",
        $$widgetType: "ais.rangeInput"
      });
    },
    searchBox: function searchBox(e) {
      var t = e || {},
          n = t.container,
          r = t.placeholder,
          i = void 0 === r ? "" : r,
          a = t.cssClasses,
          s = void 0 === a ? {} : a,
          o = t.autofocus,
          c = void 0 !== o && o,
          u = t.searchAsYouType,
          l = void 0 === u || u,
          h = t.showReset,
          d = void 0 === h || h,
          f = t.showSubmit,
          m = void 0 === f || f,
          p = t.showLoadingIndicator,
          g = void 0 === p || p,
          v = t.queryHook,
          y = t.templates;
      if (!n) throw new Error(ua("The `container` option is required."));
      var b = he(n),
          R = {
        root: oi(la(), s.root),
        form: oi(la({
          descendantName: "form"
        }), s.form),
        input: oi(la({
          descendantName: "input"
        }), s.input),
        submit: oi(la({
          descendantName: "submit"
        }), s.submit),
        submitIcon: oi(la({
          descendantName: "submitIcon"
        }), s.submitIcon),
        reset: oi(la({
          descendantName: "reset"
        }), s.reset),
        resetIcon: oi(la({
          descendantName: "resetIcon"
        }), s.resetIcon),
        loadingIndicator: oi(la({
          descendantName: "loadingIndicator"
        }), s.loadingIndicator),
        loadingIcon: oi(la({
          descendantName: "loadingIcon"
        }), s.loadingIcon)
      };
      return D(D({}, _r(function (e) {
        var i = e.containerNode,
            a = e.cssClasses,
            s = e.placeholder,
            o = e.templates,
            c = e.autofocus,
            u = e.searchAsYouType,
            l = e.showReset,
            h = e.showSubmit,
            d = e.showLoadingIndicator;
        return function (e) {
          var t = e.refine,
              n = e.query,
              r = e.isSearchStalled;
          Zn(Mn(Ii, {
            query: n,
            placeholder: s,
            autofocus: c,
            refine: t,
            searchAsYouType: u,
            templates: o,
            showSubmit: h,
            showReset: l,
            showLoadingIndicator: d,
            isSearchStalled: r,
            cssClasses: a
          }), i);
        };
      }({
        containerNode: b,
        cssClasses: R,
        placeholder: i,
        templates: D(D({}, Ki), y),
        autofocus: c,
        searchAsYouType: l,
        showReset: d,
        showSubmit: m,
        showLoadingIndicator: g
      }), function () {
        return Zn(null, b);
      })({
        queryHook: v
      })), {}, {
        $$widgetType: "ais.searchBox"
      });
    },
    rangeSlider: function rangeSlider(e) {
      var t = e || {},
          n = t.container,
          r = t.attribute,
          i = t.min,
          a = t.max,
          s = t.cssClasses,
          o = void 0 === s ? {} : s,
          c = t.step,
          u = t.pips,
          l = void 0 === u || u,
          h = t.precision,
          d = void 0 === h ? 0 : h,
          f = t.tooltips,
          m = void 0 === f || f;
      if (!n) throw new Error(Ea("The `container` option is required."));

      var p = he(n),
          g = {
        root: oi(ka(), o.root),
        disabledRoot: oi(ka({
          modifierName: "disabled"
        }), o.disabledRoot)
      },
          v = function (e) {
        var d = e.containerNode,
            f = e.cssClasses,
            m = e.pips,
            p = e.step,
            g = e.tooltips;
        return function (e, t) {
          var n = e.refine,
              r = e.range,
              i = e.start;

          if (!t) {
            var a = r.min,
                s = r.max,
                o = W(i, 2),
                c = o[0],
                u = o[1],
                l = c === -1 / 0 ? a : c,
                h = u === 1 / 0 ? s : u;
            Zn(Mn(Ta, {
              cssClasses: f,
              refine: n,
              min: a,
              max: s,
              values: [s < l ? s : l, h < a ? a : h],
              tooltips: g,
              step: p,
              pips: m
            }), d);
          }
        };
      }({
        containerNode: p,
        step: c,
        pips: l,
        tooltips: m,
        renderState: {},
        cssClasses: g
      });

      return D(D({}, wr(v, function () {
        return Zn(null, p);
      })({
        attribute: r,
        min: i,
        max: a,
        precision: d
      })), {}, {
        $$type: "ais.rangeSlider",
        $$widgetType: "ais.rangeSlider"
      });
    },
    sortBy: function sortBy(e) {
      var t = e || {},
          n = t.container,
          r = t.items,
          i = t.cssClasses,
          a = void 0 === i ? {} : i,
          s = t.transformItems;
      if (!n) throw new Error(La("The `container` option is required."));
      var o = he(n),
          c = {
        root: oi(Ma(), a.root),
        select: oi(Ma({
          descendantName: "select"
        }), a.select),
        option: oi(Ma({
          descendantName: "option"
        }), a.option)
      };
      return D(D({}, Fr(function (e) {
        var a = e.containerNode,
            s = e.cssClasses;
        return function (e, t) {
          var n = e.currentRefinement,
              r = e.options,
              i = e.refine;
          t || Zn(Mn("div", {
            className: s.root
          }, Mn(Ai, {
            cssClasses: s,
            currentValue: n,
            options: r,
            setValue: i
          })), a);
        };
      }({
        containerNode: o,
        cssClasses: c
      }), function () {
        return Zn(null, o);
      })({
        items: r,
        transformItems: s
      })), {}, {
        $$widgetType: "ais.sortBy"
      });
    },
    ratingMenu: function ratingMenu(e) {
      var t = e || {},
          n = t.container,
          r = t.attribute,
          i = t.max,
          a = void 0 === i ? 5 : i,
          s = t.cssClasses,
          o = void 0 === s ? {} : s,
          c = t.templates,
          u = void 0 === c ? ja : c;
      if (!n) throw new Error(Oa("The `container` option is required."));
      var l = he(n),
          h = {
        root: oi(Aa(), o.root),
        noRefinementRoot: oi(Aa({
          modifierName: "noRefinement"
        }), o.noRefinementRoot),
        list: oi(Aa({
          descendantName: "list"
        }), o.list),
        item: oi(Aa({
          descendantName: "item"
        }), o.item),
        selectedItem: oi(Aa({
          descendantName: "item",
          modifierName: "selected"
        }), o.selectedItem),
        disabledItem: oi(Aa({
          descendantName: "item",
          modifierName: "disabled"
        }), o.disabledItem),
        link: oi(Aa({
          descendantName: "link"
        }), o.link),
        starIcon: oi(Aa({
          descendantName: "starIcon"
        }), o.starIcon),
        fullStarIcon: oi(Aa({
          descendantName: "starIcon",
          modifierName: "full"
        }), o.fullStarIcon),
        emptyStarIcon: oi(Aa({
          descendantName: "starIcon",
          modifierName: "empty"
        }), o.emptyStarIcon),
        label: oi(Aa({
          descendantName: "label"
        }), o.label),
        count: oi(Aa({
          descendantName: "count"
        }), o.count)
      };
      return D(D({}, Lr(function (e) {
        var s = e.containerNode,
            o = e.cssClasses,
            c = e.templates,
            u = e.renderState;
        return function (e, t) {
          var n = e.refine,
              r = e.items,
              i = e.createURL,
              a = e.instantSearchInstance;
          t ? u.templateProps = me({
            defaultTemplates: ja,
            templatesConfig: a.templatesConfig,
            templates: c
          }) : Zn(Mn(Fi, {
            createURL: i,
            cssClasses: o,
            facetValues: r,
            templateProps: u.templateProps,
            toggleRefinement: n
          }, Mn("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            style: "display:none;"
          }, Mn("symbol", {
            id: Aa({
              descendantName: "starSymbol"
            }),
            viewBox: "0 0 24 24"
          }, Ha), Mn("symbol", {
            id: Aa({
              descendantName: "starEmptySymbol"
            }),
            viewBox: "0 0 24 24"
          }, Da))), s);
        };
      }({
        containerNode: l,
        cssClasses: h,
        renderState: {},
        templates: u
      }), function () {
        return Zn(null, l);
      })({
        attribute: r,
        max: a
      })), {}, {
        $$widgetType: "ais.ratingMenu"
      });
    },
    stats: function stats(e) {
      var t = e || {},
          n = t.container,
          r = t.cssClasses,
          i = void 0 === r ? {} : r,
          a = t.templates,
          s = void 0 === a ? Ba : a;
      if (!n) throw new Error(Ua("The `container` option is required."));
      var o = he(n),
          c = {
        root: oi(Qa(), i.root),
        text: oi(Qa({
          descendantName: "text"
        }), i.text)
      };
      return D(D({}, jr(function (e) {
        var u = e.containerNode,
            l = e.cssClasses,
            h = e.renderState,
            d = e.templates;
        return function (e, t) {
          var n = e.hitsPerPage,
              r = e.nbHits,
              i = e.nbPages,
              a = e.page,
              s = e.processingTimeMS,
              o = e.query,
              c = e.instantSearchInstance;
          t ? h.templateProps = me({
            defaultTemplates: Ba,
            templatesConfig: c.templatesConfig,
            templates: d
          }) : Zn(Mn(Wa, {
            cssClasses: l,
            hitsPerPage: n,
            nbHits: r,
            nbPages: i,
            page: a,
            processingTimeMS: s,
            query: o,
            templateProps: h.templateProps
          }), u);
        };
      }({
        containerNode: o,
        cssClasses: c,
        renderState: {},
        templates: s
      }), function () {
        return Zn(null, o);
      })()), {}, {
        $$widgetType: "ais.stats"
      });
    },
    toggleRefinement: function toggleRefinement(e) {
      var t = e || {},
          n = t.container,
          r = t.attribute,
          i = t.cssClasses,
          a = void 0 === i ? {} : i,
          s = t.templates,
          o = void 0 === s ? $a : s,
          c = t.on,
          u = void 0 === c || c,
          l = t.off;
      if (!n) throw new Error(Va("The `container` option is required."));
      var h = he(n),
          d = {
        root: oi(Ka(), a.root),
        label: oi(Ka({
          descendantName: "label"
        }), a.label),
        checkbox: oi(Ka({
          descendantName: "checkbox"
        }), a.checkbox),
        labelText: oi(Ka({
          descendantName: "labelText"
        }), a.labelText)
      };
      return D(D({}, Dr(function (e) {
        var s = e.containerNode,
            o = e.cssClasses,
            c = e.renderState,
            u = e.templates;
        return function (e, t) {
          var n = e.value,
              r = e.createURL,
              i = e.refine,
              a = e.instantSearchInstance;
          t ? c.templateProps = me({
            defaultTemplates: $a,
            templatesConfig: a.templatesConfig,
            templates: u
          }) : Zn(Mn(qa, {
            createURL: r,
            cssClasses: o,
            currentRefinement: n,
            templateProps: c.templateProps,
            refine: function refine(e) {
              return i({
                isRefined: e
              });
            }
          }), s);
        };
      }({
        containerNode: h,
        cssClasses: d,
        renderState: {},
        templates: o
      }), function () {
        return Zn(null, h);
      })({
        attribute: r,
        on: u,
        off: l
      })), {}, {
        $$widgetType: "ais.toggleRefinement"
      });
    },
    analytics: function analytics(e) {
      var t = e || {},
          s = t.pushFunction,
          n = t.delay,
          r = void 0 === n ? 3e3 : n,
          i = t.triggerOnUIInteraction,
          a = void 0 !== i && i,
          o = t.pushInitialSearch,
          c = void 0 === o || o,
          u = t.pushPagination,
          l = void 0 !== u && u;
      if (!s) throw new Error(Ja("The `pushFunction` option is required."));

      function h(e) {
        if (null !== e) {
          var t = [],
              n = function (e) {
            var t = [];

            for (var n in e) {
              if (e.hasOwnProperty(n)) {
                var r = e[n].join("+");
                t.push("".concat(encodeURIComponent(n), "=").concat(encodeURIComponent(n), "_").concat(encodeURIComponent(r)));
              }
            }

            return t.join("&");
          }(D(D(D({}, e.state.disjunctiveFacetsRefinements), e.state.facetsRefinements), e.state.hierarchicalFacetsRefinements)),
              r = function (e) {
            var t = [];

            for (var n in e) {
              if (e.hasOwnProperty(n)) {
                var r = e[n];
                if (r.hasOwnProperty(">=") && r.hasOwnProperty("<=")) r[">="] && r[">="][0] === r["<="] && r["<="][0] ? t.push("".concat(n, "=").concat(n, "_").concat(r[">="])) : t.push("".concat(n, "=").concat(n, "_").concat(r[">="], "to").concat(r["<="]));else if (r.hasOwnProperty(">=")) t.push("".concat(n, "=").concat(n, "_from").concat(r[">="]));else if (r.hasOwnProperty("<=")) t.push("".concat(n, "=").concat(n, "_to").concat(r["<="]));else if (r.hasOwnProperty("=")) {
                  var i = [];

                  for (var a in r["="]) {
                    r["="].hasOwnProperty(a) && i.push(r["="][a]);
                  }

                  t.push("".concat(n, "=").concat(n, "_").concat(i.join("-")));
                }
              }
            }

            return t.join("&");
          }(e.state.numericRefinements);

          "" !== n && t.push(n), "" !== r && t.push(r);
          var i = t.join("&"),
              a = "Query: ".concat(e.state.query || "", ", ").concat(i);
          !0 === l && (a += ", Page: ".concat(e.state.page || 0)), m !== a && (s(i, e.state, e.results), m = a);
        }
      }

      var d,
          f = null,
          m = "",
          p = !0;
      !0 === c && (p = !1);

      function g() {
        h(f);
      }

      function v() {
        h(f);
      }

      return {
        $$type: "ais.analytics",
        $$widgetType: "ais.analytics",
        init: function init() {
          !0 === a && (document.addEventListener("click", g), window.addEventListener("beforeunload", v));
        },
        render: function render(e) {
          var t = e.results,
              n = e.state;
          !0 !== p ? (f = {
            results: t,
            state: n
          }, d && clearTimeout(d), d = window.setTimeout(function () {
            return h(f);
          }, r)) : p = !1;
        },
        dispose: function dispose() {
          !0 === a && (document.removeEventListener("click", g), window.removeEventListener("beforeunload", v));
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            analytics: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState() {
          return {
            widgetParams: e
          };
        }
      };
    },
    breadcrumb: function breadcrumb(e) {
      var t = e || {},
          n = t.container,
          r = t.attributes,
          i = t.separator,
          a = t.rootPath,
          s = t.transformItems,
          o = t.templates,
          c = void 0 === o ? Ya : o,
          u = t.cssClasses,
          l = void 0 === u ? {} : u;
      if (!n) throw new Error(Ga("The `container` option is required."));

      var h = he(n),
          d = {
        root: oi(Za(), l.root),
        noRefinementRoot: oi(Za({
          modifierName: "noRefinement"
        }), l.noRefinementRoot),
        list: oi(Za({
          descendantName: "list"
        }), l.list),
        item: oi(Za({
          descendantName: "item"
        }), l.item),
        selectedItem: oi(Za({
          descendantName: "item",
          modifierName: "selected"
        }), l.selectedItem),
        separator: oi(Za({
          descendantName: "separator"
        }), l.separator),
        link: oi(Za({
          descendantName: "link"
        }), l.link)
      },
          f = function (e) {
        var o = e.containerNode,
            c = e.cssClasses,
            u = e.renderState,
            l = e.templates;
        return function (e, t) {
          var n = e.canRefine,
              r = e.createURL,
              i = e.instantSearchInstance,
              a = e.items,
              s = e.refine;
          t ? u.templateProps = me({
            defaultTemplates: Ya,
            templatesConfig: i.templatesConfig,
            templates: l
          }) : Zn(Mn(za, {
            canRefine: n,
            cssClasses: c,
            createURL: r,
            items: a,
            refine: s,
            templateProps: u.templateProps
          }), o);
        };
      }({
        containerNode: h,
        cssClasses: d,
        renderState: {},
        templates: c
      });

      return D(D({}, Wr(f, function () {
        return Zn(null, h);
      })({
        attributes: r,
        separator: i,
        rootPath: a,
        transformItems: s
      })), {}, {
        $$widgetType: "ais.breadcrumb"
      });
    },
    menuSelect: function menuSelect(e) {
      var t = e || {},
          n = t.container,
          r = t.attribute,
          i = t.sortBy,
          a = void 0 === i ? ["name:asc"] : i,
          s = t.limit,
          o = void 0 === s ? 10 : s,
          c = t.cssClasses,
          u = void 0 === c ? {} : c,
          l = t.templates,
          h = void 0 === l ? es : l,
          d = t.transformItems;
      if (!n) throw new Error(ts("The `container` option is required."));
      var f = he(n),
          m = {
        root: oi(ns(), u.root),
        noRefinementRoot: oi(ns({
          modifierName: "noRefinement"
        }), u.noRefinementRoot),
        select: oi(ns({
          descendantName: "select"
        }), u.select),
        option: oi(ns({
          descendantName: "option"
        }), u.option)
      };
      return D(D({}, ur(function (e) {
        var s = e.containerNode,
            o = e.cssClasses,
            c = e.renderState,
            u = e.templates;
        return function (e, t) {
          var n = e.refine,
              r = e.items,
              i = e.canRefine,
              a = e.instantSearchInstance;
          t ? c.templateProps = me({
            defaultTemplates: es,
            templatesConfig: a.templatesConfig,
            templates: u
          }) : Zn(Mn(Xa, {
            cssClasses: o,
            items: r,
            refine: n,
            templateProps: c.templateProps,
            canRefine: i
          }), s);
        };
      }({
        containerNode: f,
        cssClasses: m,
        renderState: {},
        templates: h
      }), function () {
        return Zn(null, f);
      })({
        attribute: r,
        limit: o,
        sortBy: a,
        transformItems: d
      })), {}, {
        $$widgetType: "ais.menuSelect"
      });
    },
    poweredBy: function poweredBy(e) {
      var t = e || {},
          n = t.container,
          r = t.cssClasses,
          i = void 0 === r ? {} : r,
          a = t.theme,
          s = void 0 === a ? "light" : a;
      if (!n) throw new Error(os("The `container` option is required."));

      var o = he(n),
          c = {
        root: oi(ss(), ss({
          modifierName: "dark" === s ? "dark" : "light"
        }), i.root),
        link: oi(ss({
          descendantName: "link"
        }), i.link),
        logo: oi(ss({
          descendantName: "logo"
        }), i.logo)
      },
          u = function (e) {
        var a = e.containerNode,
            s = e.cssClasses;
        return function (e, t) {
          var n = e.url,
              r = e.widgetParams;

          if (t) {
            var i = r.theme;
            Zn(Mn(rs, {
              cssClasses: s,
              url: n,
              theme: i
            }), a);
          } else ;
        };
      }({
        containerNode: o,
        cssClasses: c
      });

      return D(D({}, Qr(u, function () {
        return Zn(null, o);
      })({
        theme: s
      })), {}, {
        $$widgetType: "ais.poweredBy"
      });
    },
    panel: function panel(e) {
      var t = e || {},
          n = t.templates,
          r = void 0 === n ? {} : n,
          i = t.hidden,
          c = void 0 === i ? function () {
        return !1;
      } : i,
          a = t.collapsed,
          s = t.cssClasses,
          o = void 0 === s ? {} : s,
          u = document.createElement("div"),
          l = Boolean(a),
          h = "function" == typeof a ? a : function () {
        return !1;
      },
          d = {
        root: oi(Es(), o.root),
        noRefinementRoot: oi(Es({
          modifierName: "noRefinement"
        }), o.noRefinementRoot),
        collapsibleRoot: oi(Es({
          modifierName: "collapsible"
        }), o.collapsibleRoot),
        collapsedRoot: oi(Es({
          modifierName: "collapsed"
        }), o.collapsedRoot),
        collapseButton: oi(Es({
          descendantName: "collapseButton"
        }), o.collapseButton),
        collapseIcon: oi(Es({
          descendantName: "collapseIcon"
        }), o.collapseIcon),
        body: oi(Es({
          descendantName: "body"
        }), o.body),
        header: oi(Es({
          descendantName: "header"
        }), o.header),
        footer: oi(Es({
          descendantName: "footer"
        }), o.footer)
      };
      return function (n) {
        return function (e) {
          var i = (e || {}).container;
          if (!i) throw new Error(Ts("The `container` option is required in the widget within the panel."));

          var t = {
            header: "",
            footer: "",
            collapseButtonText: function collapseButtonText(e) {
              var t = e.collapsed;
              return '<svg\n          class="'.concat(d.collapseIcon, '"\n          width="1em"\n          height="1em"\n          viewBox="0 0 500 500"\n        >\n        <path d="').concat(t ? "M100 250l300-150v300z" : "M250 400l150-300H100z", '" fill="currentColor" />\n        </svg>');
            }
          },
              s = function (e) {
            var a = e.containerNode,
                s = e.bodyContainerNode,
                o = e.cssClasses,
                c = e.templates;
            return function (e) {
              var t = e.options,
                  n = e.hidden,
                  r = e.collapsible,
                  i = e.collapsed;
              Zn(Mn(Ns, {
                cssClasses: o,
                hidden: n,
                collapsible: r,
                isCollapsed: i,
                templates: c,
                data: t,
                bodyElement: s
              }), a);
            };
          }({
            containerNode: he(i),
            bodyContainerNode: u,
            cssClasses: d,
            templates: D(D({}, t), r)
          });

          s({
            options: {},
            hidden: !0,
            collapsible: l,
            collapsed: !1
          });
          var o = n(D(D({}, e), {}, {
            container: u
          }));
          return D(D({}, o), {}, {
            dispose: function dispose() {
              if (Zn(null, he(i)), "function" == typeof o.dispose) {
                for (var e, t = arguments.length, n = new Array(t), r = 0; r < t; r++) {
                  n[r] = arguments[r];
                }

                return (e = o.dispose).call.apply(e, [this].concat(n));
              }
            },
            render: function render() {
              for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
                t[n] = arguments[n];
              }

              var r,
                  i = t[0],
                  a = D(D({}, o.getWidgetRenderState ? o.getWidgetRenderState(i) : {}), i);
              s({
                options: a,
                hidden: Boolean(c(a)),
                collapsible: l,
                collapsed: Boolean(h(a))
              }), "function" == typeof o.render && (r = o.render).call.apply(r, [this].concat(t));
            }
          });
        };
      };
    },
    voiceSearch: function voiceSearch(e) {
      var t = e || {},
          n = t.container,
          r = t.cssClasses,
          i = void 0 === r ? {} : r,
          a = t.templates,
          s = t.searchAsYouSpeak,
          o = void 0 !== s && s,
          c = t.language,
          u = t.additionalQueryParameters,
          l = t.createVoiceSearchHelper;
      if (!n) throw new Error(Ls("The `container` option is required."));
      var h = he(n),
          d = {
        root: oi(Ms(), i.root),
        button: oi(Ms({
          descendantName: "button"
        }), i.button),
        status: oi(Ms({
          descendantName: "status"
        }), i.status)
      };
      return D(D({}, ii(Is, function () {
        return Zn(null, h);
      })({
        container: h,
        cssClasses: d,
        templates: D(D({}, ks), a),
        searchAsYouSpeak: o,
        language: c,
        additionalQueryParameters: u,
        createVoiceSearchHelper: l
      })), {}, {
        $$widgetType: "ais.voiceSearch"
      });
    },
    queryRuleCustomData: function queryRuleCustomData(e) {
      var t = e || {},
          n = t.container,
          r = t.cssClasses,
          i = void 0 === r ? {} : r,
          a = t.templates,
          s = void 0 === a ? {} : a,
          o = t.transformItems,
          c = void 0 === o ? function (e) {
        return e;
      } : o;
      if (!n) throw new Error(js("The `container` option is required."));
      var u = {
        root: oi(Os(), i.root)
      },
          l = D(D({}, {
        default: function _default(e) {
          var t = e.items;
          return JSON.stringify(t, null, 2);
        }
      }), s),
          h = he(n);
      return D(D({}, ni(Cs, function () {
        Zn(null, h);
      })({
        container: h,
        cssClasses: u,
        templates: l,
        transformItems: c
      })), {}, {
        $$widgetType: "ais.queryRuleCustomData"
      });
    },
    queryRuleContext: function queryRuleContext(e) {
      var t = 0 < arguments.length && void 0 !== e ? e : {};
      if (!t.trackedFilters) throw new Error(As("The `trackedFilters` option is required."));
      return D(D({}, ni(Ie)(t)), {}, {
        $$widgetType: "ais.queryRuleContext"
      });
    },
    index: pt,
    places: function places(e) {
      var t = e || {},
          n = t.placesReference,
          r = t.defaultPosition,
          o = void 0 === r ? [] : r,
          i = O(t, ["placesReference", "defaultPosition"]);
      if ("function" != typeof n) throw new Error("The `placesReference` option requires a valid Places.js reference.");
      var c = n(i),
          u = {
        query: "",
        initialLatLngViaIP: void 0,
        isInitialLatLngViaIPSet: !1
      };
      return {
        $$type: "ais.places",
        $$widgetType: "ais.places",
        init: function init(e) {
          var s = e.helper;
          c.on("change", function (e) {
            var t = e.suggestion,
                n = t.value,
                r = t.latlng,
                i = r.lat,
                a = r.lng;
            u.query = n, s.setQueryParameter("insideBoundingBox", void 0).setQueryParameter("aroundLatLngViaIP", !1).setQueryParameter("aroundLatLng", "".concat(i, ",").concat(a)).search();
          }), c.on("clear", function () {
            u.query = "", s.setQueryParameter("insideBoundingBox", void 0), 1 < o.length ? s.setQueryParameter("aroundLatLngViaIP", !1).setQueryParameter("aroundLatLng", o.join(",")) : s.setQueryParameter("aroundLatLngViaIP", u.initialLatLngViaIP).setQueryParameter("aroundLatLng", void 0), s.search();
          });
        },
        getWidgetUiState: function getWidgetUiState(e, t) {
          var n = t.searchParameters.aroundLatLng || o.join(",");
          if (n !== o.join(",") || u.query) return D(D({}, e), {}, {
            places: {
              query: u.query,
              position: n
            }
          });
          e.places;
          return O(e, ["places"]);
        },
        getWidgetSearchParameters: function getWidgetSearchParameters(e, t) {
          var n = t.uiState.places || {},
              r = n.query,
              i = void 0 === r ? "" : r,
              a = n.position,
              s = void 0 === a ? o.join(",") : a;
          return u.query = i, u.isInitialLatLngViaIPSet || (u.isInitialLatLngViaIPSet = !0, u.initialLatLngViaIP = e.aroundLatLngViaIP), c.setVal(i), c.close(), e.setQueryParameter("insideBoundingBox", void 0).setQueryParameter("aroundLatLngViaIP", !1).setQueryParameter("aroundLatLng", s || void 0);
        },
        getRenderState: function getRenderState(e, t) {
          return D(D({}, e), {}, {
            places: this.getWidgetRenderState(t)
          });
        },
        getWidgetRenderState: function getWidgetRenderState() {
          return {
            widgetParams: e
          };
        }
      };
    }
  }),
      Ds = Object.freeze({
    __proto__: null,
    createInsightsMiddleware: function createInsightsMiddleware(e) {
      var t = e || {},
          c = t.insightsClient,
          u = t.insightsInitParams,
          l = t.onEvent;
      if (null !== c && !c) throw new Error("The `insightsClient` option is required. To disable, set it to `null`.");
      var h = Boolean(c),
          d = null === c ? Ie : c;
      return function (e) {
        var r = e.instantSearchInstance,
            t = W(function (e) {
          if (e.transporter) {
            var t = e.transporter,
                n = t.headers,
                r = t.queryParameters,
                i = "x-algolia-application-id",
                a = "x-algolia-api-key";
            return [n[i] || r[i], n[a] || r[a]];
          }

          return [e.applicationID, e.apiKey];
        }(r.client), 2),
            n = t[0],
            i = t[1],
            a = void 0,
            s = void 0;

        if (Array.isArray(d.queue)) {
          var o = W(Re(d.queue.slice().reverse(), function (e) {
            return "setUserToken" === W(e, 1)[0];
          }) || [], 2);
          a = o[1];
        }

        return d("_get", "_userToken", function (e) {
          s = e;
        }), d("init", D({
          appId: n,
          apiKey: i
        }, u)), {
          onStateChange: function onStateChange() {},
          subscribe: function subscribe() {
            function e(e) {
              e && t.setState(t.state.setQueryParameter("userToken", e));
            }

            var t = r.mainIndex.getHelper();
            t.setState(t.state.setQueryParameter("clickAnalytics", !0));
            var n = It();
            h && n && e(n), s ? d("setUserToken", s) : a && d("setUserToken", a), d("onUserTokenChange", e, {
              immediate: !0
            }), r.sendEventToInsights = function (e) {
              l ? l(e, c) : e.insightsMethod && d(e.insightsMethod, e.payload);
            };
          },
          unsubscribe: function unsubscribe() {
            d("onUserTokenChange", void 0), r.sendEventToInsights = Ie;
          }
        };
      };
    },
    createRouterMiddleware: rn,
    isMetadataEnabled: an,
    createMetadataMiddleware: sn
  }),
      Ws = Object.freeze({
    __proto__: null,
    history: nn
  });

  function Bs(e) {
    e.configure;
    return O(e, ["configure"]);
  }

  var Us = Object.freeze({
    __proto__: null,
    simple: Ct,
    singleIndex: function singleIndex(t) {
      return {
        stateToRoute: function stateToRoute(e) {
          return Bs(e[t] || {});
        },
        routeToState: function routeToState(e) {
          return M({}, t, Bs(0 < arguments.length && void 0 !== e ? e : {}));
        }
      };
    }
  });

  function Qs(e) {
    var t = e || {};
    t.page;
    return O(t, ["page"]);
  }

  var qs = "ais.infiniteHits";

  function $s() {
    return "undefined" != typeof window && void 0 !== window.sessionStorage;
  }

  function Vs(e) {
    return new ln(e);
  }

  return Vs.routers = Ws, Vs.stateMappings = Us, Vs.connectors = si, Vs.widgets = Hs, Vs.version = "4.14.2", Vs.createInfiniteHitsSessionStorageCache = function () {
    return {
      read: function read(e) {
        var t = e.state;
        if (!$s()) return null;

        try {
          var n = JSON.parse(window.sessionStorage.getItem(qs));
          return n && Le(n.state, Qs(t)) ? n.hits : null;
        } catch (e) {
          if (e instanceof SyntaxError) try {
            window.sessionStorage.removeItem(qs);
          } catch (e) {}
          return null;
        }
      },
      write: function write(e) {
        var t = e.state,
            n = e.hits;
        if ($s()) try {
          window.sessionStorage.setItem(qs, JSON.stringify({
            state: Qs(t),
            hits: n
          }));
        } catch (e) {}
      }
    };
  }, Vs.highlight = bt, Vs.reverseHighlight = St, Vs.snippet = Pt, Vs.reverseSnippet = Nt, Vs.insights = _t, Vs.middlewares = Ds, Vs;
});
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*! lazysizes - v5.3.0 */
!function (e) {
  var t = function (u, D, f) {
    "use strict";

    var k, H;

    if (function () {
      var e;
      var t = {
        lazyClass: "lazyload",
        loadedClass: "lazyloaded",
        loadingClass: "lazyloading",
        preloadClass: "lazypreload",
        errorClass: "lazyerror",
        autosizesClass: "lazyautosizes",
        fastLoadedClass: "ls-is-cached",
        iframeLoadMode: 0,
        srcAttr: "data-src",
        srcsetAttr: "data-srcset",
        sizesAttr: "data-sizes",
        minSize: 40,
        customMedia: {},
        init: true,
        expFactor: 1.5,
        hFac: .8,
        loadMode: 2,
        loadHidden: true,
        ricTimeout: 0,
        throttleDelay: 125
      };
      H = u.lazySizesConfig || u.lazysizesConfig || {};

      for (e in t) {
        if (!(e in H)) {
          H[e] = t[e];
        }
      }
    }(), !D || !D.getElementsByClassName) {
      return {
        init: function init() {},
        cfg: H,
        noSupport: true
      };
    }

    var O = D.documentElement,
        i = u.HTMLPictureElement,
        P = "addEventListener",
        $ = "getAttribute",
        q = u[P].bind(u),
        I = u.setTimeout,
        U = u.requestAnimationFrame || I,
        o = u.requestIdleCallback,
        j = /^picture$/i,
        r = ["load", "error", "lazyincluded", "_lazyloaded"],
        a = {},
        G = Array.prototype.forEach,
        J = function J(e, t) {
      if (!a[t]) {
        a[t] = new RegExp("(\\s|^)" + t + "(\\s|$)");
      }

      return a[t].test(e[$]("class") || "") && a[t];
    },
        K = function K(e, t) {
      if (!J(e, t)) {
        e.setAttribute("class", (e[$]("class") || "").trim() + " " + t);
      }
    },
        Q = function Q(e, t) {
      var a;

      if (a = J(e, t)) {
        e.setAttribute("class", (e[$]("class") || "").replace(a, " "));
      }
    },
        V = function V(t, a, e) {
      var i = e ? P : "removeEventListener";

      if (e) {
        V(t, a);
      }

      r.forEach(function (e) {
        t[i](e, a);
      });
    },
        X = function X(e, t, a, i, r) {
      var n = D.createEvent("Event");

      if (!a) {
        a = {};
      }

      a.instance = k;
      n.initEvent(t, !i, !r);
      n.detail = a;
      e.dispatchEvent(n);
      return n;
    },
        Y = function Y(e, t) {
      var a;

      if (!i && (a = u.picturefill || H.pf)) {
        if (t && t.src && !e[$]("srcset")) {
          e.setAttribute("srcset", t.src);
        }

        a({
          reevaluate: true,
          elements: [e]
        });
      } else if (t && t.src) {
        e.src = t.src;
      }
    },
        Z = function Z(e, t) {
      return (getComputedStyle(e, null) || {})[t];
    },
        s = function s(e, t, a) {
      a = a || e.offsetWidth;

      while (a < H.minSize && t && !e._lazysizesWidth) {
        a = t.offsetWidth;
        t = t.parentNode;
      }

      return a;
    },
        ee = function () {
      var a, i;
      var t = [];
      var r = [];
      var n = t;

      var s = function s() {
        var e = n;
        n = t.length ? r : t;
        a = true;
        i = false;

        while (e.length) {
          e.shift()();
        }

        a = false;
      };

      var e = function e(_e, t) {
        if (a && !t) {
          _e.apply(this, arguments);
        } else {
          n.push(_e);

          if (!i) {
            i = true;
            (D.hidden ? I : U)(s);
          }
        }
      };

      e._lsFlush = s;
      return e;
    }(),
        te = function te(a, e) {
      return e ? function () {
        ee(a);
      } : function () {
        var e = this;
        var t = arguments;
        ee(function () {
          a.apply(e, t);
        });
      };
    },
        ae = function ae(e) {
      var a;
      var i = 0;
      var r = H.throttleDelay;
      var n = H.ricTimeout;

      var t = function t() {
        a = false;
        i = f.now();
        e();
      };

      var s = o && n > 49 ? function () {
        o(t, {
          timeout: n
        });

        if (n !== H.ricTimeout) {
          n = H.ricTimeout;
        }
      } : te(function () {
        I(t);
      }, true);
      return function (e) {
        var t;

        if (e = e === true) {
          n = 33;
        }

        if (a) {
          return;
        }

        a = true;
        t = r - (f.now() - i);

        if (t < 0) {
          t = 0;
        }

        if (e || t < 9) {
          s();
        } else {
          I(s, t);
        }
      };
    },
        ie = function ie(e) {
      var t, a;
      var i = 99;

      var r = function r() {
        t = null;
        e();
      };

      var n = function n() {
        var e = f.now() - a;

        if (e < i) {
          I(n, i - e);
        } else {
          (o || r)(r);
        }
      };

      return function () {
        a = f.now();

        if (!t) {
          t = I(n, i);
        }
      };
    },
        e = function () {
      var v, m, c, h, e;
      var y, z, g, p, C, b, A;
      var n = /^img$/i;
      var d = /^iframe$/i;
      var E = "onscroll" in u && !/(gle|ing)bot/.test(navigator.userAgent);
      var _ = 0;
      var w = 0;
      var M = 0;
      var N = -1;

      var L = function L(e) {
        M--;

        if (!e || M < 0 || !e.target) {
          M = 0;
        }
      };

      var x = function x(e) {
        if (A == null) {
          A = Z(D.body, "visibility") == "hidden";
        }

        return A || !(Z(e.parentNode, "visibility") == "hidden" && Z(e, "visibility") == "hidden");
      };

      var W = function W(e, t) {
        var a;
        var i = e;
        var r = x(e);
        g -= t;
        b += t;
        p -= t;
        C += t;

        while (r && (i = i.offsetParent) && i != D.body && i != O) {
          r = (Z(i, "opacity") || 1) > 0;

          if (r && Z(i, "overflow") != "visible") {
            a = i.getBoundingClientRect();
            r = C > a.left && p < a.right && b > a.top - 1 && g < a.bottom + 1;
          }
        }

        return r;
      };

      var t = function t() {
        var e, t, a, i, r, n, s, o, l, u, f, c;
        var d = k.elements;

        if ((h = H.loadMode) && M < 8 && (e = d.length)) {
          t = 0;
          N++;

          for (; t < e; t++) {
            if (!d[t] || d[t]._lazyRace) {
              continue;
            }

            if (!E || k.prematureUnveil && k.prematureUnveil(d[t])) {
              R(d[t]);
              continue;
            }

            if (!(o = d[t][$]("data-expand")) || !(n = o * 1)) {
              n = w;
            }

            if (!u) {
              u = !H.expand || H.expand < 1 ? O.clientHeight > 500 && O.clientWidth > 500 ? 500 : 370 : H.expand;
              k._defEx = u;
              f = u * H.expFactor;
              c = H.hFac;
              A = null;

              if (w < f && M < 1 && N > 2 && h > 2 && !D.hidden) {
                w = f;
                N = 0;
              } else if (h > 1 && N > 1 && M < 6) {
                w = u;
              } else {
                w = _;
              }
            }

            if (l !== n) {
              y = innerWidth + n * c;
              z = innerHeight + n;
              s = n * -1;
              l = n;
            }

            a = d[t].getBoundingClientRect();

            if ((b = a.bottom) >= s && (g = a.top) <= z && (C = a.right) >= s * c && (p = a.left) <= y && (b || C || p || g) && (H.loadHidden || x(d[t])) && (m && M < 3 && !o && (h < 3 || N < 4) || W(d[t], n))) {
              R(d[t]);
              r = true;

              if (M > 9) {
                break;
              }
            } else if (!r && m && !i && M < 4 && N < 4 && h > 2 && (v[0] || H.preloadAfterLoad) && (v[0] || !o && (b || C || p || g || d[t][$](H.sizesAttr) != "auto"))) {
              i = v[0] || d[t];
            }
          }

          if (i && !r) {
            R(i);
          }
        }
      };

      var a = ae(t);

      var S = function S(e) {
        var t = e.target;

        if (t._lazyCache) {
          delete t._lazyCache;
          return;
        }

        L(e);
        K(t, H.loadedClass);
        Q(t, H.loadingClass);
        V(t, B);
        X(t, "lazyloaded");
      };

      var i = te(S);

      var B = function B(e) {
        i({
          target: e.target
        });
      };

      var T = function T(e, t) {
        var a = e.getAttribute("data-load-mode") || H.iframeLoadMode;

        if (a == 0) {
          e.contentWindow.location.replace(t);
        } else if (a == 1) {
          e.src = t;
        }
      };

      var F = function F(e) {
        var t;
        var a = e[$](H.srcsetAttr);

        if (t = H.customMedia[e[$]("data-media") || e[$]("media")]) {
          e.setAttribute("media", t);
        }

        if (a) {
          e.setAttribute("srcset", a);
        }
      };

      var s = te(function (t, e, a, i, r) {
        var n, s, o, l, u, f;

        if (!(u = X(t, "lazybeforeunveil", e)).defaultPrevented) {
          if (i) {
            if (a) {
              K(t, H.autosizesClass);
            } else {
              t.setAttribute("sizes", i);
            }
          }

          s = t[$](H.srcsetAttr);
          n = t[$](H.srcAttr);

          if (r) {
            o = t.parentNode;
            l = o && j.test(o.nodeName || "");
          }

          f = e.firesLoad || "src" in t && (s || n || l);
          u = {
            target: t
          };
          K(t, H.loadingClass);

          if (f) {
            clearTimeout(c);
            c = I(L, 2500);
            V(t, B, true);
          }

          if (l) {
            G.call(o.getElementsByTagName("source"), F);
          }

          if (s) {
            t.setAttribute("srcset", s);
          } else if (n && !l) {
            if (d.test(t.nodeName)) {
              T(t, n);
            } else {
              t.src = n;
            }
          }

          if (r && (s || l)) {
            Y(t, {
              src: n
            });
          }
        }

        if (t._lazyRace) {
          delete t._lazyRace;
        }

        Q(t, H.lazyClass);
        ee(function () {
          var e = t.complete && t.naturalWidth > 1;

          if (!f || e) {
            if (e) {
              K(t, H.fastLoadedClass);
            }

            S(u);
            t._lazyCache = true;
            I(function () {
              if ("_lazyCache" in t) {
                delete t._lazyCache;
              }
            }, 9);
          }

          if (t.loading == "lazy") {
            M--;
          }
        }, true);
      });

      var R = function R(e) {
        if (e._lazyRace) {
          return;
        }

        var t;
        var a = n.test(e.nodeName);
        var i = a && (e[$](H.sizesAttr) || e[$]("sizes"));
        var r = i == "auto";

        if ((r || !m) && a && (e[$]("src") || e.srcset) && !e.complete && !J(e, H.errorClass) && J(e, H.lazyClass)) {
          return;
        }

        t = X(e, "lazyunveilread").detail;

        if (r) {
          re.updateElem(e, true, e.offsetWidth);
        }

        e._lazyRace = true;
        M++;
        s(e, t, r, i, a);
      };

      var r = ie(function () {
        H.loadMode = 3;
        a();
      });

      var o = function o() {
        if (H.loadMode == 3) {
          H.loadMode = 2;
        }

        r();
      };

      var l = function l() {
        if (m) {
          return;
        }

        if (f.now() - e < 999) {
          I(l, 999);
          return;
        }

        m = true;
        H.loadMode = 3;
        a();
        q("scroll", o, true);
      };

      return {
        _: function _() {
          e = f.now();
          k.elements = D.getElementsByClassName(H.lazyClass);
          v = D.getElementsByClassName(H.lazyClass + " " + H.preloadClass);
          q("scroll", a, true);
          q("resize", a, true);
          q("pageshow", function (e) {
            if (e.persisted) {
              var t = D.querySelectorAll("." + H.loadingClass);

              if (t.length && t.forEach) {
                U(function () {
                  t.forEach(function (e) {
                    if (e.complete) {
                      R(e);
                    }
                  });
                });
              }
            }
          });

          if (u.MutationObserver) {
            new MutationObserver(a).observe(O, {
              childList: true,
              subtree: true,
              attributes: true
            });
          } else {
            O[P]("DOMNodeInserted", a, true);
            O[P]("DOMAttrModified", a, true);
            setInterval(a, 999);
          }

          q("hashchange", a, true);
          ["focus", "mouseover", "click", "load", "transitionend", "animationend"].forEach(function (e) {
            D[P](e, a, true);
          });

          if (/d$|^c/.test(D.readyState)) {
            l();
          } else {
            q("load", l);
            D[P]("DOMContentLoaded", a);
            I(l, 2e4);
          }

          if (k.elements.length) {
            t();

            ee._lsFlush();
          } else {
            a();
          }
        },
        checkElems: a,
        unveil: R,
        _aLSL: o
      };
    }(),
        re = function () {
      var a;
      var n = te(function (e, t, a, i) {
        var r, n, s;
        e._lazysizesWidth = i;
        i += "px";
        e.setAttribute("sizes", i);

        if (j.test(t.nodeName || "")) {
          r = t.getElementsByTagName("source");

          for (n = 0, s = r.length; n < s; n++) {
            r[n].setAttribute("sizes", i);
          }
        }

        if (!a.detail.dataAttr) {
          Y(e, a.detail);
        }
      });

      var i = function i(e, t, a) {
        var i;
        var r = e.parentNode;

        if (r) {
          a = s(e, r, a);
          i = X(e, "lazybeforesizes", {
            width: a,
            dataAttr: !!t
          });

          if (!i.defaultPrevented) {
            a = i.detail.width;

            if (a && a !== e._lazysizesWidth) {
              n(e, r, i, a);
            }
          }
        }
      };

      var e = function e() {
        var e;
        var t = a.length;

        if (t) {
          e = 0;

          for (; e < t; e++) {
            i(a[e]);
          }
        }
      };

      var t = ie(e);
      return {
        _: function _() {
          a = D.getElementsByClassName(H.autosizesClass);
          q("resize", t);
        },
        checkElems: t,
        updateElem: i
      };
    }(),
        t = function t() {
      if (!t.i && D.getElementsByClassName) {
        t.i = true;

        re._();

        e._();
      }
    };

    return I(function () {
      H.init && t();
    }), k = {
      cfg: H,
      autoSizer: re,
      loader: e,
      init: t,
      uP: Y,
      aC: K,
      rC: Q,
      hC: J,
      fire: X,
      gW: s,
      rAF: ee
    };
  }(e, e.document, Date);

  e.lazySizes = t, "object" == (typeof module === "undefined" ? "undefined" : _typeof(module)) && module.exports && (module.exports = t);
}("undefined" != typeof window ? window : {});
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*! lazysizes - v5.3.0 */
!function (e, n) {
  var i = function i() {
    n(e.lazySizes), e.removeEventListener("lazyunveilread", i, !0);
  };

  n = n.bind(null, e, e.document), "object" == (typeof module === "undefined" ? "undefined" : _typeof(module)) && module.exports ? n(require("lazysizes")) : "function" == typeof define && define.amd ? define(["lazysizes"], n) : e.lazySizes ? i() : e.addEventListener("lazyunveilread", i, !0);
}(window, function (e, i, t) {
  "use strict";

  var n, a, d, r;
  e.addEventListener && (n = t && t.cfg, a = n.lazyClass || "lazyload", d = function d() {
    var e, n;
    if ("string" == typeof a && (a = i.getElementsByClassName(a)), t) for (e = 0, n = a.length; e < n; e++) {
      t.loader.unveil(a[e]);
    }
  }, addEventListener("beforeprint", d, !1), !("onbeforeprint" in e) && e.matchMedia && (r = matchMedia("print")) && r.addListener && r.addListener(function () {
    r.matches && d();
  }));
});
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function wt(n, t) {
  for (var i = 0; i < t.length; i++) {
    var r = t[i];
    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(n, r.key, r);
  }
}
/*!
 * Splide.js
 * Version  : 3.1.3
 * License  : MIT
 * Copyright: 2021 Naotoshi Fujita
 */


var n, t;
n = void 0, t = function t() {
  "use strict";

  var m = "splide",
      a = "data-" + m,
      n = {
    CREATED: 1,
    MOUNTED: 2,
    IDLE: 3,
    MOVING: 4,
    DESTROYED: 5
  },
      P = 10;

  function _(n) {
    n.length = 0;
  }

  function W(n) {
    return !u(n) && "object" == _typeof(n);
  }

  function r(n) {
    return Array.isArray(n);
  }

  function D(n) {
    return "string" == typeof n;
  }

  function M(n) {
    return void 0 === n;
  }

  function u(n) {
    return null === n;
  }

  function y(n) {
    return n instanceof HTMLElement;
  }

  function w(n) {
    return r(n) ? n : [n];
  }

  function b(n, t) {
    w(n).forEach(t);
  }

  function x(n, t) {
    return -1 < n.indexOf(t);
  }

  function k(n, t) {
    return n.push.apply(n, w(t)), n;
  }

  var o = Array.prototype;

  function s(n, t, i) {
    return o.slice.call(n, t, i);
  }

  function A(t, n, i) {
    t && b(n, function (n) {
      n && t.classList[i ? "add" : "remove"](n);
    });
  }

  function L(n, t) {
    A(n, D(t) ? t.split(" ") : t, !0);
  }

  function E(n, t) {
    b(t, n.appendChild.bind(n));
  }

  function z(n, i) {
    b(n, function (n) {
      var t = i.parentNode;
      t && t.insertBefore(n, i);
    });
  }

  function S(n, t) {
    return (n.msMatchesSelector || n.matches).call(n, t);
  }

  function R(n, t) {
    return n ? s(n.children).filter(function (n) {
      return S(n, t);
    }) : [];
  }

  function O(n, t) {
    return t ? R(n, t)[0] : n.firstElementChild;
  }

  function e(n, t) {
    if (n) for (var i = Object.keys(n), r = 0; r < i.length; r++) {
      var u = i[r];
      if ("__proto__" !== u && !1 === t(n[u], u)) break;
    }
    return n;
  }

  function T(r) {
    return s(arguments, 1).forEach(function (i) {
      e(i, function (n, t) {
        r[t] = i[t];
      });
    }), r;
  }

  function l(i, n) {
    return e(n, function (n, t) {
      r(n) ? i[t] = n.slice() : W(n) ? i[t] = l(W(i[t]) ? i[t] : {}, n) : i[t] = n;
    }), i;
  }

  function F(t, n) {
    t && b(n, function (n) {
      t.removeAttribute(n);
    });
  }

  function I(i, n, t) {
    W(n) ? e(n, function (n, t) {
      I(i, t, n);
    }) : u(t) ? F(i, n) : i.setAttribute(n, String(t));
  }

  function j(n, t, i) {
    n = document.createElement(n);
    return t && (D(t) ? L : I)(n, t), i && E(i, n), n;
  }

  function C(n, t, i) {
    if (M(i)) return getComputedStyle(n)[t];
    u(i) || (n = n.style)[t] !== (i = "" + i) && (n[t] = i);
  }

  function N(n, t) {
    C(n, "display", t);
  }

  function X(n, t) {
    return n.getAttribute(t);
  }

  function B(n, t) {
    return n && n.classList.contains(t);
  }

  function G(n) {
    return n.getBoundingClientRect();
  }

  function H(n) {
    b(n, function (n) {
      n && n.parentNode && n.parentNode.removeChild(n);
    });
  }

  function Y(n) {
    return O(new DOMParser().parseFromString(n, "text/html").body);
  }

  function U(n, t) {
    n.preventDefault(), t && (n.stopPropagation(), n.stopImmediatePropagation());
  }

  function q(n, t) {
    return n && n.querySelector(t);
  }

  function J(n, t) {
    return s(n.querySelectorAll(t));
  }

  function K(n, t) {
    A(n, t, !1);
  }

  function V(n) {
    return D(n) ? n : n ? n + "px" : "";
  }

  function Q(n, t) {
    if (void 0 === t && (t = ""), !n) throw new Error("[" + m + "] " + t);
  }

  function c(n) {
    setTimeout(n);
  }

  function Z() {}

  function v(n) {
    return requestAnimationFrame(n);
  }

  var $ = Math.min,
      nn = Math.max,
      tn = Math.floor,
      rn = Math.ceil,
      un = Math.abs;

  function on(n, t, i, r) {
    var u = $(t, i),
        i = nn(t, i);
    return r ? u < n && n < i : u <= n && n <= i;
  }

  function en(n, t, i) {
    var r = $(t, i),
        i = nn(t, i);
    return $(nn(r, n), i);
  }

  function cn(n) {
    return (0 < n) - (n < 0);
  }

  function fn(t, n) {
    return b(n, function (n) {
      t = t.replace("%s", "" + n);
    }), t;
  }

  function an(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  var sn = {};

  function f() {
    var o = {};

    function r(n, r) {
      t(n, function (n, t) {
        var i = o[n];
        o[n] = i && i.filter(function (n) {
          return n.n ? n.n !== r : r || n.t !== t;
        });
      });
    }

    function t(n, t) {
      w(n).join(" ").split(" ").forEach(function (n) {
        n = n.split(".");
        t(n[0], n[1]);
      });
    }

    return {
      on: function on(n, i, r, u) {
        void 0 === u && (u = P), t(n, function (n, t) {
          o[n] = o[n] || [], k(o[n], {
            i: n,
            r: i,
            t: t,
            u: u,
            n: r
          }).sort(function (n, t) {
            return n.u - t.u;
          });
        });
      },
      off: r,
      offBy: function offBy(i) {
        e(o, function (n, t) {
          r(t, i);
        });
      },
      emit: function emit(n) {
        var t = arguments;
        (o[n] || []).forEach(function (n) {
          n.r.apply(n, s(t, 1));
        });
      },
      destroy: function destroy() {
        o = {};
      }
    };
  }

  var ln = "mounted",
      dn = "move",
      vn = "moved",
      hn = "click",
      pn = "active",
      gn = "inactive",
      mn = "visible",
      yn = "hidden",
      wn = "slide:keydown",
      _n = "refresh",
      bn = "updated",
      xn = "resize",
      kn = "resized",
      An = "repositioned",
      Ln = "scrolled",
      d = "destroy",
      p = "lazyload:loaded";

  function En(n) {
    var r = n.event,
        u = {},
        o = [];

    function t(n, t, r) {
      e(n, t, function (t, i) {
        o = o.filter(function (n) {
          return !!(n[0] !== t || n[1] !== i || r && n[2] !== r) || (t.removeEventListener(i, n[2], n[3]), !1);
        });
      });
    }

    function e(n, t, i) {
      b(n, function (n) {
        n && t.split(" ").forEach(i.bind(null, n));
      });
    }

    function i() {
      o = o.filter(function (n) {
        return t(n[0], n[1]);
      }), r.offBy(u);
    }

    return r.on(d, i, u), {
      on: function on(n, t, i) {
        r.on(n, t, u, i);
      },
      off: function off(n) {
        r.off(n, u);
      },
      emit: r.emit,
      bind: function bind(n, t, i, r) {
        e(n, t, function (n, t) {
          o.push([n, t, i, r]), n.addEventListener(t, i, r);
        });
      },
      unbind: t,
      destroy: i
    };
  }

  function zn(t, i, r, u) {
    var o,
        n,
        e = Date.now,
        c = 0,
        f = !0,
        a = 0;

    function s() {
      if (!f) {
        var n = e() - o;
        if (t <= n ? (c = 1, o = e()) : c = n / t, r && r(c), 1 === c && (i(), u && ++a >= u)) return l();
        v(s);
      }
    }

    function l() {
      f = !0;
    }

    function d() {
      cancelAnimationFrame(n), f = !(n = c = 0);
    }

    return {
      start: function start(n) {
        n || d(), o = e() - (n ? c * t : 0), f = !1, v(s);
      },
      rewind: function rewind() {
        o = e(), c = 0, r && r(c);
      },
      pause: l,
      cancel: d,
      isPaused: function isPaused() {
        return f;
      }
    };
  }

  function h(n) {
    var t = n;
    return {
      set: function set(n) {
        t = n;
      },
      is: function is(n) {
        return x(w(n), t);
      }
    };
  }

  function Sn(i, r) {
    var u;
    return function () {
      var n = arguments,
          t = this;
      u || (u = zn(r || 0, function () {
        i.apply(t, n), u = null;
      }, null, 1)).start();
    };
  }

  var g = {
    marginRight: ["marginBottom", "marginLeft"],
    autoWidth: ["autoHeight"],
    fixedWidth: ["fixedHeight"],
    paddingLeft: ["paddingTop", "paddingRight"],
    paddingRight: ["paddingBottom", "paddingLeft"],
    width: ["height"],
    left: ["top", "right"],
    right: ["bottom", "left"],
    x: ["y"],
    X: ["Y"],
    Y: ["X"],
    ArrowLeft: ["ArrowUp", "ArrowRight"],
    ArrowRight: ["ArrowDown", "ArrowLeft"]
  };
  var Rn = m,
      Pn = m + "__slider",
      Dn = m + "__track",
      Mn = m + "__list",
      On = m + "__slide",
      Tn = On + "--clone",
      Fn = On + "__container",
      In = m + "__arrows",
      t = m + "__arrow",
      jn = t + "--prev",
      Wn = t + "--next",
      i = m + "__pagination",
      Cn = m + "__progress",
      Nn = Cn + "__bar",
      Xn = m + "__autoplay",
      Bn = m + "__play",
      Gn = m + "__pause",
      Hn = "is-active",
      Yn = "is-prev",
      Un = "is-next",
      qn = "is-visible",
      Jn = "is-loading",
      Kn = [Hn, qn, Yn, Un, Jn];
  var Vn = "role",
      Qn = "aria-controls",
      Zn = "aria-current",
      $n = "aria-label",
      nt = "aria-hidden",
      tt = "tabindex",
      it = "aria-orientation",
      rt = [Vn, Qn, Zn, $n, nt, it, tt, "disabled"],
      ut = "slide",
      ot = "loop",
      et = "fade";

  function ct(u, r, i, o) {
    var e,
        n = En(u),
        c = n.on,
        f = n.emit,
        a = n.bind,
        t = n.destroy,
        s = u.Components,
        l = u.root,
        d = u.options,
        v = d.isNavigation,
        h = d.updateOnMove,
        p = s.Direction.resolve,
        g = X(o, "style"),
        m = -1 < i,
        y = O(o, "." + Fn),
        w = d.focusableNodes && J(o, d.focusableNodes);

    function _() {
      var n;
      e || (n = u.index, b.call(this, x()), function (n) {
        var t = !n && !x();
        I(o, nt, t || null), I(o, tt, !t && d.slideFocus ? 0 : null), w && w.forEach(function (n) {
          I(n, tt, t ? -1 : null);
        });
        n !== B(o, qn) && (A(o, qn, n), f(n ? mn : yn, this));
      }.call(this, function () {
        if (u.is(et)) return x();
        var n = G(s.Elements.track),
            t = G(o),
            i = p("left"),
            r = p("right");
        return tn(n[i]) <= rn(t[i]) && tn(t[r]) <= rn(n[r]);
      }()), A(o, Yn, r === n - 1), A(o, Un, r === n + 1));
    }

    function b(n) {
      n !== B(o, Hn) && (A(o, Hn, n), v && I(o, Zn, n || null), f(n ? pn : gn, this));
    }

    function x() {
      return u.index === r;
    }

    return {
      index: r,
      slideIndex: i,
      slide: o,
      container: y,
      isClone: m,
      mount: function mount() {
        var t = this;
        !function () {
          m || (o.id = l.id + "-slide" + an(r + 1));
          {
            var n, t;
            v && (t = m ? i : r, n = fn(d.i18n.slideX, t + 1), t = u.splides.map(function (n) {
              return n.root.id;
            }).join(" "), I(o, $n, n), I(o, Qn, t), I(o, Vn, "menuitem"));
          }
        }(), a(o, "click keydown", function (n) {
          f("click" === n.type ? hn : wn, t, n);
        }), c([_n, An, vn, Ln], _.bind(this)), h && c(dn, function (n, t, i) {
          e || (_.call(this), i === r && b.call(this, !0));
        }.bind(this));
      },
      destroy: function destroy() {
        e = !0, t(), K(o, Kn), F(o, rt), I(o, "style", g);
      },
      style: function style(n, t, i) {
        C(i && y || o, n, t);
      },
      isWithin: function isWithin(n, t) {
        return n = un(n - r), (n = !u.is(ut) && !m ? $(n, u.length - n) : n) <= t;
      }
    };
  }

  var ft = "touchmove mousemove",
      at = "touchend touchcancel mouseup";
  var st = ["Left", "Right", "Up", "Down"];
  var lt = a + "-lazy",
      dt = lt + "-srcset",
      vt = "[" + lt + "], [" + dt + "]";
  var ht = [" ", "Enter", "Spacebar"];
  var pt = Object.freeze({
    __proto__: null,
    Options: function Options(t, n, r) {
      var u,
          o,
          i,
          e = Sn(f);

      function c(n) {
        n && removeEventListener("resize", e);
      }

      function f() {
        var n,
            n = (n = function n(_n2) {
          return _n2[1].matches;
        }, s(o).filter(n)[0] || []);
        n[0] !== i && function (n) {
          n = r.breakpoints[n] || u;
          n.destroy ? (t.options = u, t.destroy("completely" === n.destroy)) : (t.state.is(5) && (c(!0), t.mount()), t.options = n);
        }(i = n[0]);
      }

      return {
        setup: function setup() {
          try {
            l(r, JSON.parse(X(t.root, a)));
          } catch (n) {
            Q(!1, n.message);
          }

          u = l({}, r);
          var i,
              n = r.breakpoints;
          n && (i = "min" === r.mediaQuery, o = Object.keys(n).sort(function (n, t) {
            return i ? +t - +n : +n - +t;
          }).map(function (n) {
            return [n, matchMedia("(" + (i ? "min" : "max") + "-width:" + n + "px)")];
          }), f());
        },
        mount: function mount() {
          o && addEventListener("resize", e);
        },
        destroy: c
      };
    },
    Direction: function Direction(n, t, r) {
      return {
        resolve: function resolve(n, t) {
          var i = r.direction;
          return g[n]["rtl" !== i || t ? "ttb" === i ? 0 : -1 : 1] || n;
        },
        orient: function orient(n) {
          return n * ("rtl" === r.direction ? 1 : -1);
        }
      };
    },
    Elements: function Elements(n, t, i) {
      var r,
          u,
          o,
          e,
          c = En(n).on,
          f = n.root,
          a = {},
          s = [];

      function l() {
        var n;
        !function () {
          u = O(f, "." + Pn), o = q(f, "." + Dn), e = O(o, "." + Mn), Q(o && e, "A track/list element is missing."), k(s, R(e, "." + On + ":not(." + Tn + ")"));
          var n = p("." + Xn),
              t = p("." + In);
          T(a, {
            root: f,
            slider: u,
            track: o,
            list: e,
            slides: s,
            arrows: t,
            autoplay: n,
            prev: q(t, "." + jn),
            next: q(t, "." + Wn),
            bar: q(p("." + Cn), "." + Nn),
            play: q(n, "." + Bn),
            pause: q(n, "." + Gn)
          });
        }(), n = f.id || function (n) {
          return "" + n + an(sn[n] = (sn[n] || 0) + 1);
        }(m), f.id = n, o.id = o.id || n + "-track", e.id = e.id || n + "-list", L(f, r = g());
      }

      function d() {
        [f, o, e].forEach(function (n) {
          F(n, "style");
        }), _(s), K(f, r);
      }

      function v() {
        d(), l();
      }

      function h() {
        K(f, r), L(f, r = g());
      }

      function p(n) {
        return O(f, n) || O(u, n);
      }

      function g() {
        return [Rn + "--" + i.type, Rn + "--" + i.direction, i.drag && Rn + "--draggable", i.isNavigation && Rn + "--nav", Hn];
      }

      return T(a, {
        setup: l,
        mount: function mount() {
          c(_n, v, P - 2), c(bn, h);
        },
        destroy: d
      });
    },
    Slides: function Slides(r, u, o) {
      var n = En(r),
          t = n.on,
          e = n.emit,
          c = n.bind,
          f = (n = u.Elements).slides,
          a = n.list,
          s = [];

      function i() {
        f.forEach(function (n, t) {
          v(n, t, -1);
        });
      }

      function l() {
        p(function (n) {
          n.destroy();
        }), _(s);
      }

      function d() {
        l(), i();
      }

      function v(n, t, i) {
        n = ct(r, t, i, n);
        n.mount(), s.push(n);
      }

      function h(n) {
        return n ? g(function (n) {
          return !n.isClone;
        }) : s;
      }

      function p(n, t) {
        h(t).forEach(n);
      }

      function g(t) {
        return s.filter("function" == typeof t ? t : function (n) {
          return D(t) ? S(n.slide, t) : x(w(t), n.index);
        });
      }

      return {
        mount: function mount() {
          i(), t(_n, d), t([ln, _n], function () {
            s.sort(function (n, t) {
              return n.index - t.index;
            });
          });
        },
        destroy: l,
        register: v,
        get: h,
        getIn: function getIn(n) {
          var t = u.Controller,
              i = t.toIndex(n),
              r = t.hasFocus() ? 1 : o.perPage;
          return g(function (n) {
            return on(n.index, i, i + r - 1);
          });
        },
        getAt: function getAt(n) {
          return g(n)[0];
        },
        add: function add(n, u) {
          b(n, function (n) {
            var t, i, r;
            y(n = D(n) ? Y(n) : n) && ((t = f[u]) ? z(n, t) : E(a, n), L(n, o.classes.slide), n = n, i = e.bind(null, xn), n = J(n, "img"), (r = n.length) ? n.forEach(function (n) {
              c(n, "load error", function () {
                --r || i();
              });
            }) : i());
          }), e(_n);
        },
        remove: function remove(n) {
          H(g(n).map(function (n) {
            return n.slide;
          })), e(_n);
        },
        forEach: p,
        filter: g,
        style: function style(t, i, r) {
          p(function (n) {
            n.style(t, i, r);
          });
        },
        getLength: function getLength(n) {
          return (n ? f : s).length;
        },
        isEnough: function isEnough() {
          return s.length > o.perPage;
        }
      };
    },
    Layout: function Layout(n, t, i) {
      var r,
          u = En(n),
          o = u.on,
          e = u.bind,
          c = u.emit,
          f = t.Slides,
          a = t.Direction.resolve,
          s = (t = t.Elements).track,
          l = t.list,
          d = f.getAt;

      function v() {
        r = "ttb" === i.direction, C(n.root, "maxWidth", V(i.width)), C(s, a("paddingLeft"), p(!1)), C(s, a("paddingRight"), p(!0)), h();
      }

      function h() {
        C(s, "height", function () {
          var n = "";
          r && (Q(n = g(), "height or heightRatio is missing."), n = "calc(" + n + " - " + p(!1) + " - " + p(!0) + ")");
          return n;
        }()), f.style(a("marginRight"), V(i.gap)), f.style("width", (i.autoWidth ? "" : V(i.fixedWidth) || (r ? "" : m())) || null), f.style("height", V(i.fixedHeight) || (r ? i.autoHeight ? "" : m() : g()) || null, !0), c(kn);
      }

      function p(n) {
        var t = i.padding,
            n = a(n ? "right" : "left", !0);
        return t && V(t[n] || (W(t) ? 0 : t)) || "0px";
      }

      function g() {
        return V(i.height || G(l).width * i.heightRatio);
      }

      function m() {
        var n = V(i.gap);
        return "calc((100%" + (n && " + " + n) + ")/" + (i.perPage || 1) + (n && " - " + n) + ")";
      }

      function y(n, t) {
        var i = d(n);

        if (i) {
          n = G(i.slide)[a("right")], i = G(l)[a("left")];
          return un(n - i) + (t ? 0 : w());
        }

        return 0;
      }

      function w() {
        var n = d(0);
        return n && parseFloat(C(n.slide, a("marginRight"))) || 0;
      }

      return {
        mount: function mount() {
          v(), e(window, "resize load", Sn(c.bind(this, xn))), o([bn, _n], v), o(xn, h);
        },
        listSize: function listSize() {
          return G(l)[a("width")];
        },
        slideSize: function slideSize(n, t) {
          return (n = d(n || 0)) ? G(n.slide)[a("width")] + (t ? 0 : w()) : 0;
        },
        sliderSize: function sliderSize() {
          return y(n.length - 1, !0) - y(-1, !0);
        },
        totalSize: y,
        getPadding: function getPadding(n) {
          return parseFloat(C(s, a("padding" + (n ? "Right" : "Left"), !0))) || 0;
        }
      };
    },
    Clones: function Clones(c, n, f) {
      var t,
          i = En(c),
          r = i.on,
          u = i.emit,
          a = n.Elements,
          s = n.Slides,
          o = n.Direction.resolve,
          l = [];

      function e() {
        (t = p()) && (function (u) {
          var o = s.get().slice(),
              e = o.length;

          if (e) {
            for (; o.length < u;) {
              k(o, o);
            }

            k(o.slice(-u), o.slice(0, u)).forEach(function (n, t) {
              var i = t < u,
                  r = function (n, t) {
                n = n.cloneNode(!0);
                return L(n, f.classes.clone), n.id = c.root.id + "-clone" + an(t + 1), n;
              }(n.slide, t);

              i ? z(r, o[0].slide) : E(a.list, r), k(l, r), s.register(r, t - u + (i ? 0 : e), n.index);
            });
          }
        }(t), u(xn));
      }

      function d() {
        H(l), _(l);
      }

      function v() {
        d(), e();
      }

      function h() {
        t < p() && u(_n);
      }

      function p() {
        var n,
            t,
            i = f.clones;
        return c.is(ot) ? i || (n = a.list, D(t = f[o("fixedWidth")]) && (t = G(n = j("div", {
          style: "width: " + t + "; position: absolute;"
        }, n)).width, H(n)), i = ((t = t) && rn(G(a.track)[o("width")] / t) || f[o("autoWidth")] && c.length || f.perPage) * (f.drag ? (f.flickMaxPages || 1) + 1 : 2)) : i = 0, i;
      }

      return {
        mount: function mount() {
          e(), r(_n, v), r([bn, xn], h);
        },
        destroy: d
      };
    },
    Move: function Move(c, f, a) {
      var s,
          n = En(c),
          t = n.on,
          l = n.emit,
          r = (n = f.Layout).slideSize,
          i = n.getPadding,
          u = n.totalSize,
          o = n.listSize,
          e = n.sliderSize,
          d = (n = f.Direction).resolve,
          v = n.orient,
          h = (n = f.Elements).list,
          p = n.track;

      function g() {
        f.Scroll.cancel(), m(c.index), l(An);
      }

      function m(n) {
        y(_(n, !0));
      }

      function y(n, t) {
        c.is(et) || (h.style.transform = "translate" + d("X") + "(" + (t ? n : function (n) {
          {
            var t, i;
            !s && c.is(ot) && (i = v(n - b()), t = A(!1, n) && i < 0, i = A(!0, n) && 0 < i, (t || i) && (n = w(n, i)));
          }
          return n;
        }(n)) + "px)");
      }

      function w(n, t) {
        var i = n - x(t),
            t = e();
        return n -= cn(i) * t * rn(un(i) / t);
      }

      function _(n, t) {
        var i,
            i = v(u(n - 1) - (i = n, "center" === (n = a.focus) ? (o() - r(i, !0)) / 2 : +n * r(i) || 0));
        return t ? function (n) {
          a.trimSpace && c.is(ut) && (n = en(n, 0, v(e() - o())));
          return n;
        }(i) : i;
      }

      function b() {
        var n = d("left");
        return G(h)[n] - G(p)[n] + v(i(!1));
      }

      function x(n) {
        return _(n ? f.Controller.getEnd() : 0, !!a.trimSpace);
      }

      function k() {
        return !!s;
      }

      function A(n, t) {
        t = M(t) ? b() : t;
        var i = !0 !== n && v(t) < v(x(!1)),
            t = !1 !== n && v(t) > v(x(!0));
        return i || t;
      }

      return {
        mount: function mount() {
          t([ln, kn, bn, _n], g);
        },
        destroy: function destroy() {
          F(h, "style");
        },
        move: function move(n, t, i, r) {
          var u, o, e;
          s || (u = c.state.set, o = b(), s = (e = n !== t) || a.waitForTransition, u(4), l(dn, t, i, n), f.Transition.start(n, function () {
            e && m(t), s = !1, u(3), l(vn, t, i, n), "move" === a.trimSpace && n !== i && o === b() ? f.Controller.go(i < n ? ">" : "<", !1, r) : r && r();
          }));
        },
        jump: m,
        translate: y,
        shift: w,
        cancel: function cancel() {
          s = !1, y(b()), f.Transition.cancel();
        },
        toIndex: function toIndex(n) {
          for (var t = f.Slides.get(), i = 0, r = 1 / 0, u = 0; u < t.length; u++) {
            var o = t[u].index,
                e = un(_(o, !0) - n);
            if (!(e <= r)) break;
            r = e, i = o;
          }

          return i;
        },
        toPosition: _,
        getPosition: b,
        getLimit: x,
        isBusy: k,
        exceededLimit: A
      };
    },
    Controller: function Controller(n, e, u) {
      var o,
          c,
          f,
          t = En(n).on,
          a = e.Move,
          s = a.getPosition,
          l = a.getLimit,
          i = e.Slides,
          d = i.isEnough,
          r = i.getLength,
          v = n.is(ot),
          h = n.is(ut),
          p = u.start || 0,
          g = p;

      function m() {
        o = r(!0), c = u.perMove, f = u.perPage, p = en(p, 0, o - 1);
      }

      function y(n, t, i, r, u) {
        var o = t ? n : z(n);
        e.Scroll.scroll(t || i ? a.toPosition(o, !0) : n, r, function () {
          S(a.toIndex(a.getPosition())), u && u();
        });
      }

      function w(n) {
        return b(!1, n);
      }

      function _(n) {
        return b(!0, n);
      }

      function b(n, t) {
        var i,
            r,
            u = c || (R() ? 1 : f),
            o = x(p + u * (n ? -1 : 1), p);
        return -1 !== o || !h || (i = s(), r = l(!n), u = 1, un(i - r) < u) ? t ? o : A(o) : n ? 0 : k();
      }

      function x(n, t, i) {
        var r;
        return d() ? (r = k(), n < 0 || r < n ? n = on(0, n, t, !0) || on(r, t, n, !0) ? L(E(n)) : v ? c ? n : n < 0 ? -(o % f || f) : o : u.rewind ? n < 0 ? r : 0 : -1 : v || i || n === t || (n = c ? n : L(E(t) + (n < t ? -1 : 1)))) : n = -1, n;
      }

      function k() {
        var n = o - f;
        return (R() || v && c) && (n = o - 1), nn(n, 0);
      }

      function A(n) {
        return v ? d() ? n % o + (n < 0 ? o : 0) : -1 : n;
      }

      function L(n) {
        return en(R() ? n : f * n, 0, k());
      }

      function E(n) {
        return R() || (n = on(n, o - f, o - 1) ? o - 1 : n, n = tn(n / f)), n;
      }

      function z(n) {
        n = a.toIndex(n);
        return h ? en(n, 0, k()) : n;
      }

      function S(n) {
        n !== p && (g = p, p = n);
      }

      function R() {
        return !M(u.focus) || u.isNavigation;
      }

      return {
        mount: function mount() {
          m(), t([bn, _n], m, P - 1);
        },
        go: function go(n, t, i) {
          var r = function (n) {
            var t = p;
            {
              var i, r;
              D(n) ? (r = n.match(/([+\-<>])(\d+)?/) || [], i = r[1], r = r[2], "+" === i || "-" === i ? t = x(p + +("" + i + (+r || 1)), p, !0) : ">" === i ? t = r ? L(+r) : w(!0) : "<" === i && (t = _(!0))) : t = v ? en(n, -f, o + f - 1) : en(n, 0, k());
            }
            return t;
          }(n);

          u.useScroll ? y(r, !0, !0, u.speed, i) : -1 < (n = A(r)) && !a.isBusy() && (t || n !== p) && (S(n), a.move(r, n, g, i));
        },
        scroll: y,
        getNext: w,
        getPrev: _,
        getEnd: k,
        setIndex: S,
        getIndex: function getIndex(n) {
          return n ? g : p;
        },
        toIndex: L,
        toPage: E,
        toDest: z,
        hasFocus: R
      };
    },
    Arrows: function Arrows(u, n, i) {
      var r,
          t = En(u),
          o = t.on,
          e = t.bind,
          c = t.emit,
          f = i.classes,
          a = i.i18n,
          s = n.Elements,
          l = n.Controller,
          d = s.arrows,
          v = s.prev,
          h = s.next,
          p = {};

      function g() {
        var n, t;
        i.arrows && (v && h || (d = j("div", f.arrows), v = m(!0), h = m(!1), r = !0, E(d, [v, h]), z(d, O("slider" === i.arrows && s.slider || u.root)))), v && h && (p.prev ? N(d, !1 === i.arrows ? "none" : "") : (n = s.track.id, I(v, Qn, n), I(h, Qn, n), p.prev = v, p.next = h, t = l.go, o([ln, vn, bn, _n, Ln], y), e(h, "click", function () {
          t(">", !0);
        }), e(v, "click", function () {
          t("<", !0);
        }), c("arrows:mounted", v, h)));
      }

      function m(n) {
        return Y('<button class="' + f.arrow + " " + (n ? f.prev : f.next) + '" type="button"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40"><path d="' + (i.arrowPath || "m15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z") + '" />');
      }

      function y() {
        var n = u.index,
            t = l.getPrev(),
            i = l.getNext(),
            r = -1 < t && n < t ? a.last : a.prev,
            n = -1 < i && i < n ? a.first : a.next;
        v.disabled = t < 0, h.disabled = i < 0, I(v, $n, r), I(h, $n, n), c("arrows:updated", v, h, t, i);
      }

      return {
        arrows: p,
        mount: function mount() {
          g(), o(bn, g);
        },
        destroy: function destroy() {
          r ? H(d) : (F(v, rt), F(h, rt));
        }
      };
    },
    Autoplay: function Autoplay(n, t, r) {
      var i,
          u,
          o,
          e = En(n),
          c = e.on,
          f = e.bind,
          a = e.emit,
          s = t.Elements,
          l = zn(r.interval, n.go.bind(n, ">"), function (n) {
        var t = s.bar;
        t && C(t, "width", 100 * n + "%");
        a("autoplay:playing", n);
      }),
          d = l.isPaused;

      function v(n) {
        var t = n ? "pause" : "play",
            i = s[t];
        i && (I(i, Qn, s.track.id), I(i, $n, r.i18n[t]), f(i, "click", n ? p : h));
      }

      function h() {
        d() && t.Slides.isEnough() && (l.start(!r.resetProgress), u = i = o = !1, a("autoplay:play"));
      }

      function p(n) {
        void 0 === n && (n = !0), d() || (l.pause(), a("autoplay:pause")), o = n;
      }

      function g() {
        o || (i || u ? p(!1) : h());
      }

      return {
        mount: function mount() {
          var n = r.autoplay;
          n && (v(!0), v(!1), function () {
            var n = s.root;
            r.pauseOnHover && f(n, "mouseenter mouseleave", function (n) {
              i = "mouseenter" === n.type, g();
            });
            r.pauseOnFocus && f(n, "focusin focusout", function (n) {
              u = "focusin" === n.type, g();
            });
            c([dn, "scroll", _n], l.rewind);
          }(), "pause" !== n && h());
        },
        destroy: l.cancel,
        play: h,
        pause: p,
        isPaused: d
      };
    },
    Cover: function Cover(n, t, i) {
      var r = En(n).on;

      function u(i) {
        t.Slides.forEach(function (n) {
          var t = O(n.container || n.slide, "img");
          t && t.src && o(i, t, n);
        });
      }

      function o(n, t, i) {
        i.style("background", n ? 'center/cover no-repeat url("' + t.src + '")' : "", !0), N(t, n ? "none" : "");
      }

      return {
        mount: function mount() {
          i.cover && (r(p, function (n, t) {
            o(!0, n, t);
          }), r([ln, bn, _n], u.bind(null, !0)));
        },
        destroy: function destroy() {
          u(!1);
        }
      };
    },
    Scroll: function Scroll(c, n, f) {
      var a,
          s,
          t = En(c),
          i = t.on,
          l = t.emit,
          d = n.Move,
          v = d.getPosition,
          h = d.getLimit,
          p = d.exceededLimit;

      function g(r, n, t, u) {
        var i,
            o = v(),
            e = 1;
        n = n || (i = un(r - o), nn(i / 1.5, 800)), s = t, y(), a = zn(n, m, function (n) {
          var t = v(),
              i = (o + (r - o) * (i = n, (n = f.easingFunc) ? n(i) : 1 - Math.pow(1 - i, 4)) - v()) * e;
          d.translate(t + i), c.is(ut) && !u && p() && (e *= .6, un(i) < 10 && (i = p(!1), g(h(!i), 600, null, !0)));
        }, 1), l("scroll"), a.start();
      }

      function m() {
        var n = v(),
            t = d.toIndex(n);
        on(t, 0, c.length - 1) || d.translate(d.shift(n, 0 < t), !0), s && s(), l(Ln);
      }

      function y() {
        a && a.cancel();
      }

      function r() {
        a && !a.isPaused() && (y(), m());
      }

      return {
        mount: function mount() {
          i(dn, y), i([bn, _n], r);
        },
        destroy: y,
        scroll: g,
        cancel: r
      };
    },
    Drag: function Drag(r, u, o) {
      var e,
          c,
          f,
          a,
          s,
          l,
          d,
          i,
          v,
          n = En(r),
          t = n.on,
          h = n.emit,
          p = n.bind,
          g = n.unbind,
          m = u.Move,
          y = u.Scroll,
          w = u.Controller,
          _ = u.Elements.track,
          b = (n = u.Direction).resolve,
          x = n.orient,
          k = m.getPosition,
          A = m.exceededLimit,
          L = {
        passive: !1,
        capture: !0
      },
          E = !1;

      function z() {
        var n = o.drag;
        j(!n), s = "free" === n;
      }

      function S(n) {
        var t;
        i || !(t = F(n)) && n.button || (m.isBusy() ? U(n, !0) : (v = t ? _ : window, a = f = null, d = !1, p(v, ft, R, L), p(v, at, P, L), m.cancel(), y.cancel(), D(n)));
      }

      function R(n) {
        var t, i;
        a || h("drag"), (a = n).cancelable && (l ? (t = 200 < I(n) - I(c), i = E !== (E = A()), (t || i) && D(n), m.translate(e + (T(n) - T(c)) / (E && r.is(ut) ? 5 : 1)), h("dragging"), d = !0, U(n)) : (t = un(T(n) - T(c)), i = W(i = o.dragMinThreshold) ? i : {
          mouse: 0,
          touch: +i || 10
        }, l = t > (F(n) ? i.touch : i.mouse), O() && U(n)));
      }

      function P(n) {
        var t, i;
        g(v, ft, R), g(v, at, P), a && ((l || n.cancelable && O()) && (t = function (n) {
          if (r.is(ot) || !E) {
            var t = c === a && f || c,
                i = T(a) - T(t),
                t = I(n) - I(t),
                n = I(n) - I(a) < 200;
            if (t && n) return i / t;
          }

          return 0;
        }(n), i = t, i = k() + cn(i) * $(un(i) * (o.flickPower || 600), s ? 1 / 0 : u.Layout.listSize() * (o.flickMaxPages || 1)), s ? w.scroll(i) : r.is(et) ? w.go(r.index + x(cn(t))) : w.go(w.toDest(i), !0), U(n)), h("dragged")), l = !1;
      }

      function D(n) {
        f = c, c = n, e = k();
      }

      function M(n) {
        !i && d && U(n, !0);
      }

      function O() {
        var n = un(T(a) - T(c));
        return un(T(a, !0) - T(c, !0)) < n;
      }

      function T(n, t) {
        return (F(n) ? n.touches[0] : n)["page" + b(t ? "Y" : "X")];
      }

      function F(n) {
        return "undefined" != typeof TouchEvent && n instanceof TouchEvent;
      }

      function I(n) {
        return n.timeStamp;
      }

      function j(n) {
        i = n;
      }

      return {
        mount: function mount() {
          p(_, ft, Z, L), p(_, at, Z, L), p(_, "touchstart mousedown", S, L), p(_, "click", M, {
            capture: !0
          }), p(_, "dragstart", U), t([ln, bn], z);
        },
        disable: j
      };
    },
    Keyboard: function Keyboard(t, n, i) {
      var r,
          u = En(t),
          o = u.on,
          e = u.bind,
          c = u.unbind,
          f = n.Elements.root,
          a = n.Direction.resolve;

      function s() {
        var n = i.keyboard,
            n = void 0 === n ? "global" : n;
        n && ("focused" === n ? I(r = f, tt, 0) : r = window, e(r, "keydown", d));
      }

      function l() {
        c(r, "keydown"), y(r) && F(r, tt);
      }

      function d(n) {
        n = n.key, n = x(st, n) ? "Arrow" + n : n;
        n === a("ArrowLeft") ? t.go("<") : n === a("ArrowRight") && t.go(">");
      }

      return {
        mount: function mount() {
          s(), o(bn, function () {
            l(), s();
          });
        },
        destroy: l
      };
    },
    LazyLoad: function LazyLoad(t, n, o) {
      var i = En(t),
          r = i.on,
          u = i.off,
          e = i.bind,
          c = i.emit,
          f = "sequential" === o.lazyLoad,
          a = [],
          s = 0;

      function l() {
        s = 0, a = [];
      }

      function d() {
        (a = a.filter(function (n) {
          return !n.o.isWithin(t.index, o.perPage * ((o.preloadPages || 1) + 1)) || v(n);
        })).length || u(vn);
      }

      function v(t) {
        var i = t.e;
        L(t.o.slide, Jn), e(i, "load error", function (n) {
          !function (n, t) {
            var i = n.o;
            K(i.slide, Jn), t || (H(n.c), N(n.e, ""), c(p, n.e, i), c(xn));
            f && h();
          }(t, "error" === n.type);
        }), ["src", "srcset"].forEach(function (n) {
          t[n] && (I(i, n, t[n]), F(i, "src" === n ? lt : dt));
        });
      }

      function h() {
        s < a.length && v(a[s++]);
      }

      return {
        mount: function mount() {
          o.lazyLoad && (r([ln, _n], function () {
            l(), n.Slides.forEach(function (u) {
              J(u.slide, vt).forEach(function (n) {
                var t,
                    i = X(n, lt),
                    r = X(n, dt);
                i === n.src && r === n.srcset || (I(t = j("span", o.classes.spinner, n.parentElement), Vn, "presentation"), a.push({
                  e: n,
                  o: u,
                  src: i,
                  srcset: r,
                  c: t
                }), N(n, "none"));
              });
            }), f && h();
          }), f || r([ln, _n, vn], d));
        },
        destroy: l
      };
    },
    Pagination: function Pagination(l, n, d) {
      var v,
          t = En(l),
          i = t.on,
          r = t.emit,
          h = t.bind,
          u = t.unbind,
          p = n.Slides,
          g = n.Elements,
          o = n.Controller,
          m = o.hasFocus,
          e = o.getIndex,
          y = [];

      function c() {
        f(), d.pagination && p.isEnough() && (function () {
          var n = l.length,
              t = d.classes,
              i = d.i18n,
              r = d.perPage,
              u = "slider" === d.pagination && g.slider || g.root,
              o = m() ? n : rn(n / r);
          v = j("ul", t.pagination, u);

          for (var e = 0; e < o; e++) {
            var c = j("li", null, v),
                f = j("button", {
              class: t.page,
              type: "button"
            }, c),
                a = p.getIn(e).map(function (n) {
              return n.slide.id;
            }),
                s = !m() && 1 < r ? i.pageX : i.slideX;
            h(f, "click", w.bind(null, e)), I(f, Qn, a.join(" ")), I(f, $n, fn(s, e + 1)), y.push({
              li: c,
              button: f,
              page: e
            });
          }
        }(), r("pagination:mounted", {
          list: v,
          items: y
        }, a(l.index)), s());
      }

      function f() {
        v && (H(v), y.forEach(function (n) {
          u(n.button, "click");
        }), _(y), v = null);
      }

      function w(t) {
        o.go(">" + t, !0, function () {
          var n = p.getAt(o.toIndex(t));
          n && n.slide.focus();
        });
      }

      function a(n) {
        return y[o.toPage(n)];
      }

      function s() {
        var n = a(e(!0)),
            t = a(e());
        n && (K(n.button, Hn), F(n.button, Zn)), t && (L(t.button, Hn), I(t.button, Zn, !0)), r("pagination:updated", {
          list: v,
          items: y
        }, n, t);
      }

      return {
        items: y,
        mount: function mount() {
          c(), i([bn, _n], c), i([dn, Ln], s);
        },
        destroy: f,
        getAt: a
      };
    },
    Sync: function Sync(i, n, r) {
      var u = i.splides,
          e = n.Elements.list;

      function c() {
        I(e, it, "ttb" !== r.direction ? "horizontal" : null);
      }

      function f(n) {
        i.go(n.index);
      }

      function a(n, t) {
        x(ht, t.key) && (f(n), U(t));
      }

      return {
        mount: function mount() {
          var o, n, t;
          r.isNavigation ? (n = En(i), t = n.on, n = n.emit, t(hn, f), t(wn, a), t([ln, bn], c), I(e, Vn, "menu"), n("navigation:mounted", i.splides)) : (o = [], u.concat(i).forEach(function (r, n, u) {
            En(r).on(dn, function (t, n, i) {
              u.forEach(function (n) {
                n === r || x(o, r) || (o.push(n), n.go(n.is(ot) ? i : t));
              }), _(o);
            });
          }));
        },
        destroy: function destroy() {
          F(e, rt);
        }
      };
    },
    Wheel: function Wheel(i, n, t) {
      var r = En(i).bind;

      function u(n) {
        var t = n.deltaY;
        t && (i.go(t < 0 ? "<" : ">"), U(n));
      }

      return {
        mount: function mount() {
          t.wheel && r(n.Elements.track, "wheel", u, {
            passive: !1,
            capture: !0
          });
        }
      };
    }
  }),
      gt = {
    type: "slide",
    speed: 400,
    waitForTransition: !0,
    perPage: 1,
    arrows: !0,
    pagination: !0,
    interval: 5e3,
    pauseOnHover: !0,
    pauseOnFocus: !0,
    resetProgress: !0,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    drag: !0,
    direction: "ltr",
    slideFocus: !0,
    trimSpace: !0,
    focusableNodes: "a, button, textarea, input, select, iframe",
    classes: {
      slide: On,
      clone: Tn,
      arrows: In,
      arrow: t,
      prev: jn,
      next: Wn,
      pagination: i,
      page: i + "__page",
      spinner: m + "__spinner"
    },
    i18n: {
      prev: "Previous slide",
      next: "Next slide",
      first: "Go to first slide",
      last: "Go to last slide",
      slideX: "Go to slide %s",
      pageX: "Go to page %s",
      play: "Start autoplay",
      pause: "Pause autoplay"
    }
  };

  function mt(n, r, t) {
    var i = En(n).on;
    return {
      mount: function mount() {
        i([ln, _n], function () {
          c(function () {
            r.Slides.style("transition", "opacity " + t.speed + "ms " + t.easing);
          });
        });
      },
      start: function start(n, t) {
        var i = r.Elements.track;
        C(i, "height", V(G(i).height)), c(function () {
          t(), C(i, "height", "");
        });
      },
      cancel: Z
    };
  }

  function yt(o, n, e) {
    var c,
        t = En(o).bind,
        f = n.Move,
        a = n.Controller,
        i = n.Elements.list;

    function r() {
      s("");
    }

    function s(n) {
      C(i, "transition", n);
    }

    return {
      mount: function mount() {
        t(i, "transitionend", function (n) {
          n.target === i && c && (r(), c());
        });
      },
      start: function start(n, t) {
        var i = f.toPosition(n, !0),
            r = f.getPosition(),
            u = function (n) {
          var t = e.rewindSpeed;

          if (o.is(ut) && t) {
            var i = a.getIndex(!0),
                r = a.getEnd();
            if (0 === i && r <= n || r <= i && 0 === n) return t;
          }

          return e.speed;
        }(n);

        1 <= un(i - r) && 1 <= u ? (s("transform " + u + "ms " + e.easing), f.translate(i, !0), c = t) : (f.jump(n), t());
      },
      cancel: r
    };
  }

  i = function () {
    function i(n, t) {
      this.event = f(), this.Components = {}, this.state = h(1), this.splides = [], this.f = {}, this.a = {};
      n = D(n) ? q(document, n) : n;
      Q(n, n + " is invalid."), this.root = n, l(gt, i.defaults), l(l(this.f, gt), t || {});
    }

    var n,
        t,
        r = i.prototype;
    return r.mount = function (n, t) {
      var i = this,
          r = this.state,
          u = this.Components;
      return Q(r.is([1, 5]), "Already mounted!"), r.set(1), this.s = u, this.l = t || this.l || (this.is(et) ? mt : yt), this.a = n || this.a, e(T({}, pt, this.a, {
        Transition: this.l
      }), function (n, t) {
        n = n(i, u, i.f);
        (u[t] = n).setup && n.setup();
      }), e(u, function (n) {
        n.mount && n.mount();
      }), this.emit(ln), L(this.root, "is-initialized"), r.set(3), this.emit("ready"), this;
    }, r.sync = function (n) {
      return this.splides.push(n), n.splides.push(this), this;
    }, r.go = function (n) {
      return this.s.Controller.go(n), this;
    }, r.on = function (n, t) {
      return this.event.on(n, t, null, 20), this;
    }, r.off = function (n) {
      return this.event.off(n), this;
    }, r.emit = function (n) {
      var t;
      return (t = this.event).emit.apply(t, [n].concat(s(arguments, 1))), this;
    }, r.add = function (n, t) {
      return this.s.Slides.add(n, t), this;
    }, r.remove = function (n) {
      return this.s.Slides.remove(n), this;
    }, r.is = function (n) {
      return this.f.type === n;
    }, r.refresh = function () {
      return this.emit(_n), this;
    }, r.destroy = function (t) {
      void 0 === t && (t = !0);
      var n = this.event,
          i = this.state;
      return i.is(1) ? n.on("ready", this.destroy.bind(this, t), this) : (e(this.s, function (n) {
        n.destroy && n.destroy(t);
      }), n.emit(d), n.destroy(), _(this.splides), i.set(5)), this;
    }, n = i, (r = [{
      key: "options",
      get: function get() {
        return this.f;
      },
      set: function set(n) {
        var t = this.f;
        l(t, n), this.state.is(1) || this.emit(bn, t);
      }
    }, {
      key: "length",
      get: function get() {
        return this.s.Slides.getLength(!0);
      }
    }, {
      key: "index",
      get: function get() {
        return this.s.Controller.getIndex();
      }
    }]) && wt(n.prototype, r), t && wt(n, t), i;
  }();

  return i.defaults = {}, i.STATES = n, i;
}, "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (n = "undefined" != typeof globalThis ? globalThis : n || self).Splide = t();
"use strict";

/**
 * Spotlight.js v0.6.5 (Bundle)
 * Copyright 2019 Nextapps GmbH
 * Author: Thomas Wilkerling
 * Licence: Apache-2.0
 * https://github.com/nextapps-de/spotlight
 */
(function () {
  'use strict';

  var aa = {};

  function ba(a) {
    for (var b = a.classList, c = {}, d = 0; d < b.length; d++) {
      c[b[d]] = 1;
    }

    a.a = c;
    a.c = b;
  }

  function f(a, b) {
    a = g(a);
    var c = "string" === typeof b;
    if (a.length) for (var d = 0; d < a.length; d++) {
      (c ? ca : da)(a[d], b);
    } else (c ? ca : da)(a, b);
  }

  function da(a, b) {
    for (var c = 0; c < b.length; c++) {
      ca(a, b[c]);
    }
  }

  function ca(a, b) {
    a.a || ba(a);
    a.a[b] || (a.a[b] = 1, a.c.add(b));
  }

  function h(a, b) {
    a = g(a);
    var c = "string" === typeof b;
    if (a.length) for (var d = 0; d < a.length; d++) {
      (c ? ea : fa)(a[d], b);
    } else (c ? ea : fa)(a, b);
  }

  function fa(a, b) {
    for (var c = 0; c < b.length; c++) {
      ea(a, b[c]);
    }
  }

  function ea(a, b) {
    a.a || ba(a);
    a.a[b] && (a.a[b] = 0, a.c.remove(b));
  }

  function l(a, b, c, d) {
    a = g(a);
    var e = "string" !== typeof b && Object.keys(b);
    if (a.length) for (var k = 0; k < a.length; k++) {
      (e ? ha : ia)(a[k], b, e || c, d);
    } else (e ? ha : ia)(a, b, e || c, d);
  }

  function ha(a, b, c, d) {
    for (var e = 0; e < c.length; e++) {
      var k = c[e];
      ia(a, k, b[k], d);
    }
  }

  function ia(a, b, c, d) {
    var e = a.f;
    e || (a.f = e = {});
    e[b] !== c && (e[b] = c, (a.g || (a.g = a.style)).setProperty(aa[b] || (aa[b] = b.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()), c, d ? "important" : null));
  }

  var ja = 0;

  function m(a, b, c) {
    l(a, "transition", "none");
    l(a, b, c);
    ja || (ja = a.clientTop && 0);
    l(a, "transition", "");
  }

  function ka(a, b) {
    b || (b = "");
    a = g(a);
    if (a.length) for (var c = 0; c < a.length; c++) {
      var d = a[c],
          e = b;
      d.b !== e && (d.b = e, d.textContent = e);
    } else a.b !== b && (a.b = b, a.textContent = b);
  }

  function g(a) {
    return "string" === typeof a ? document.querySelectorAll(a) : a;
  }

  ;

  function la(a, b, c, d) {
    ma("add", a, b, c, d);
  }

  function na(a, b, c, d) {
    ma("remove", a, b, c, d);
  }

  function ma(a, b, c, d, e) {
    b[a + "EventListener"](c || "click", d, "undefined" === typeof e ? !0 : e);
  }

  function n(a, b) {
    a || (a = window.event);
    a && (a.stopImmediatePropagation(), b || a.preventDefault(), b || (a.returnValue = !1));
    return !1;
  }

  ;
  var oa = document.createElement("style");
  oa.innerHTML = "@keyframes pulsate{0%,to{opacity:1}50%{opacity:.2}}#spotlight,#spotlight .preloader{top:0;width:100%;height:100%;opacity:0}#spotlight{z-index:99999;color:#fff;background-color:#000;visibility:hidden;overflow:hidden;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;transition:visibility .25s ease,opacity .25s ease;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:400;contain:layout size paint style;touch-action:none;-webkit-tap-highlight-color:transparent;position:fixed}#spotlight.show{opacity:1;visibility:visible;transition:none}#spotlight.show .pane,#spotlight.show .scene{will-change:transform}#spotlight.show .scene img{will-change:transform,opacity}#spotlight .preloader{position:absolute;background-position:center center;background-repeat:no-repeat;background-size:42px 42px}#spotlight .preloader.show{transition:opacity .1s linear .25s;opacity:1}#spotlight .scene{transition:transform 1s cubic-bezier(.1,1,.1,1);pointer-events:none}#spotlight .scene img{display:inline-block;position:absolute;width:auto;height:auto;max-width:100%;max-height:100%;left:50%;top:50%;opacity:1;margin:0;padding:0;border:0;transform:translate(-50%,-50%) scale(1) perspective(100vw);transition:transform 1s cubic-bezier(.1,1,.1,1),opacity 1s cubic-bezier(.3,1,.3,1);transform-style:preserve-3d;contain:layout paint style;visibility:hidden}#spotlight .header,#spotlight .pane,#spotlight .scene{position:absolute;top:0;width:100%;height:100%;contain:layout size style}#spotlight .header{height:50px;text-align:right;background-color:rgba(0,0,0,.45);transform:translateY(-100px);transition:transform .35s ease-out;contain:layout size paint style}#spotlight .header:hover,#spotlight.menu .header{transform:translateY(0)}#spotlight .header div{display:inline-block;vertical-align:middle;white-space:nowrap;width:30px;height:50px;padding-right:20px;opacity:.5}#spotlight .progress{position:absolute;top:0;width:100%;height:3px;background-color:rgba(255,255,255,.45);transform:translateX(-100%);transition:transform 1s linear}#spotlight .arrow,#spotlight .footer{position:absolute;background-color:rgba(0,0,0,.45)}#spotlight .footer{left:0;right:0;bottom:0;line-height:1.35em;padding:20px 25px;text-align:left;pointer-events:none;contain:layout paint style}#spotlight .footer .title{font-size:125%;padding-bottom:10px}#spotlight .page{float:left;width:auto;padding-left:20px;line-height:50px}#spotlight .icon{cursor:pointer;background-position:left center;background-repeat:no-repeat;background-size:21px 21px;transition:opacity .2s ease-out}#spotlight .fullscreen{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyLjUiIHZpZXdCb3g9Ii0xIC0xIDI2IDI2IiB3aWR0aD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTggM0g1YTIgMiAwIDAgMC0yIDJ2M20xOCAwVjVhMiAyIDAgMCAwLTItMmgtM20wIDE4aDNhMiAyIDAgMCAwIDItMnYtM00zIDE2djNhMiAyIDAgMCAwIDIgMmgzIi8+PC9zdmc+)}#spotlight .fullscreen.on{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyLjUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik04IDN2M2EyIDIgMCAwIDEtMiAySDNtMTggMGgtM2EyIDIgMCAwIDEtMi0yVjNtMCAxOHYtM2EyIDIgMCAwIDEgMi0yaDNNMyAxNmgzYTIgMiAwIDAgMSAyIDJ2MyIvPjwvc3ZnPg==)}#spotlight .autofit{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBoZWlnaHQ9Ijk2cHgiIHZpZXdCb3g9IjAgMCA5NiA5NiIgd2lkdGg9Ijk2cHgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggdHJhbnNmb3JtPSJyb3RhdGUoOTAgNTAgNTApIiBmaWxsPSIjZmZmIiBkPSJNNzEuMzExLDgwQzY5LjY3LDg0LjY2LDY1LjIzLDg4LDYwLDg4SDIwYy02LjYzLDAtMTItNS4zNy0xMi0xMlYzNmMwLTUuMjMsMy4zNC05LjY3LDgtMTEuMzExVjc2YzAsMi4yMSwxLjc5LDQsNCw0SDcxLjMxMSAgeiIvPjxwYXRoIHRyYW5zZm9ybT0icm90YXRlKDkwIDUwIDUwKSIgZmlsbD0iI2ZmZiIgZD0iTTc2LDhIMzZjLTYuNjMsMC0xMiw1LjM3LTEyLDEydjQwYzAsNi42Myw1LjM3LDEyLDEyLDEyaDQwYzYuNjMsMCwxMi01LjM3LDEyLTEyVjIwQzg4LDEzLjM3LDgyLjYzLDgsNzYsOHogTTgwLDYwICBjMCwyLjIxLTEuNzksNC00LDRIMzZjLTIuMjEsMC00LTEuNzktNC00VjIwYzAtMi4yMSwxLjc5LTQsNC00aDQwYzIuMjEsMCw0LDEuNzksNCw0VjYweiIvPjwvc3ZnPg==)}#spotlight .zoom-out{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMSIgY3k9IjExIiByPSI4Ii8+PGxpbmUgeDE9IjIxIiB4Mj0iMTYuNjUiIHkxPSIyMSIgeTI9IjE2LjY1Ii8+PGxpbmUgeDE9IjgiIHgyPSIxNCIgeTE9IjExIiB5Mj0iMTEiLz48L3N2Zz4=)}#spotlight .zoom-in{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMSIgY3k9IjExIiByPSI4Ii8+PGxpbmUgeDE9IjIxIiB4Mj0iMTYuNjUiIHkxPSIyMSIgeTI9IjE2LjY1Ii8+PGxpbmUgeDE9IjExIiB4Mj0iMTEiIHkxPSI4IiB5Mj0iMTQiLz48bGluZSB4MT0iOCIgeDI9IjE0IiB5MT0iMTEiIHkyPSIxMSIvPjwvc3ZnPg==)}#spotlight .theme{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBoZWlnaHQ9IjI0cHgiIHZlcnNpb249IjEuMiIgdmlld0JveD0iMiAyIDIwIDIwIiB3aWR0aD0iMjRweCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjZmZmIj48cGF0aCBkPSJNMTIsNGMtNC40MTgsMC04LDMuNTgyLTgsOHMzLjU4Miw4LDgsOHM4LTMuNTgyLDgtOFMxNi40MTgsNCwxMiw0eiBNMTIsMThjLTMuMzE0LDAtNi0yLjY4Ni02LTZzMi42ODYtNiw2LTZzNiwyLjY4Niw2LDYgUzE1LjMxNCwxOCwxMiwxOHoiLz48cGF0aCBkPSJNMTIsN3YxMGMyLjc1NywwLDUtMi4yNDMsNS01UzE0Ljc1Nyw3LDEyLDd6Ii8+PC9nPjwvc3ZnPg==)}#spotlight .player{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSItMC41IC0wLjUgMjUgMjUiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxwb2x5Z29uIGZpbGw9IiNmZmYiIHBvaW50cz0iMTAgOCAxNiAxMiAxMCAxNiAxMCA4Ii8+PC9zdmc+)}#spotlight .player.on{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSItMC41IC0wLjUgMjUgMjUiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxsaW5lIHgxPSIxMCIgeDI9IjEwIiB5MT0iMTUiIHkyPSI5Ii8+PGxpbmUgeDE9IjE0IiB4Mj0iMTQiIHkxPSIxNSIgeTI9IjkiLz48L3N2Zz4=);animation:pulsate 1s ease infinite}#spotlight .close{background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIyIDIgMjAgMjAiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZSB4MT0iMTgiIHgyPSI2IiB5MT0iNiIgeTI9IjE4Ii8+PGxpbmUgeDE9IjYiIHgyPSIxOCIgeTE9IjYiIHkyPSIxOCIvPjwvc3ZnPg==)}#spotlight .preloader.show{background-image:url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzgiIGhlaWdodD0iMzgiIHZpZXdCb3g9IjAgMCAzOCAzOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHJva2U9IiNmZmYiPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMSAxKSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2Utb3BhY2l0eT0iLjY1Ij48Y2lyY2xlIHN0cm9rZS1vcGFjaXR5PSIuMTUiIGN4PSIxOCIgY3k9IjE4IiByPSIxOCIvPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQtOC4wNi0xOC0xOC0xOCI+PGFuaW1hdGVUcmFuc2Zvcm0gYXR0cmlidXRlTmFtZT0idHJhbnNmb3JtIiB0eXBlPSJyb3RhdGUiIGZyb209IjAgMTggMTgiIHRvPSIzNjAgMTggMTgiIGR1cj0iMXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIi8+PC9wYXRoPjwvZz48L2c+PC9zdmc+)}#spotlight .arrow{top:50%;left:20px;width:50px;height:50px;border-radius:100%;cursor:pointer;margin-top:-25px;padding:10px;transform:translateX(-100px);transition:transform .35s ease-out,opacity .2s ease-out;box-sizing:border-box;background-position:center center;background-repeat:no-repeat;background-size:30px 30px;opacity:.65;background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSIxNSAxOCA5IDEyIDE1IDYiLz48L3N2Zz4=)}#spotlight .arrow-right{left:auto;right:20px;transform:translateX(100px) scaleX(-1)}#spotlight.menu .arrow-left{transform:translateX(0)}#spotlight.menu .arrow-right{transform:translateX(0) scaleX(-1)}#spotlight .arrow:active,#spotlight .arrow:hover,#spotlight .icon:active,#spotlight .icon:hover{opacity:1;animation:none}#spotlight.white{color:#fff;background-color:#fff}#spotlight.white .arrow,#spotlight.white .footer,#spotlight.white .header,#spotlight.white .preloader,#spotlight.white .progress{filter:invert(1)}.hide-scrollbars{overflow:-moz-hidden-unscrollable;-ms-overflow-style:none}.hide-scrollbars::-webkit-scrollbar{width:0}@media (max-width:800px){#spotlight .header div{width:20px}#spotlight .footer{font-size:12px}#spotlight .arrow{width:35px;height:35px;margin-top:-17.5px;background-size:15px 15px}#spotlight .preloader{background-size:30px 30px}}@media (max-width:400px),(max-height:400px){#spotlight .fullscreen{display:none!important}}";
  document.getElementsByTagName("head")[0].appendChild(oa);
  var p = "theme fullscreen autofit zoom-in zoom-out page title description player progress".split(" "),
      q,
      r,
      pa,
      qa,
      u,
      v,
      y,
      z,
      A,
      B,
      C,
      D,
      E,
      F,
      ra,
      sa,
      G,
      H,
      I,
      J,
      ta,
      ua,
      va,
      K,
      L,
      M,
      wa,
      N,
      xa,
      ya,
      za,
      Aa,
      Ba,
      O,
      Ca,
      Da,
      Ea,
      P,
      Q,
      Fa,
      R,
      S,
      T,
      Ga;

  function V(a) {
    return (N || document).getElementsByClassName(a)[0];
  }

  function Ha(a, b) {
    if (H = a.length) {
      L || (L = (N || document).getElementsByClassName("pane"));
      var c = L.length,
          d = I.title,
          e = I.description;
      T = Array(H);

      for (var k = 0; k < H; k++) {
        var t = a[k],
            w = t.dataset;

        if (k >= c) {
          var x = L[0].cloneNode(!1);
          l(x, "left", 100 * k + "%");
          L[0].parentNode.appendChild(x);
        }

        x = void 0;
        T[k] = {
          src: w && (w.href || w.src) || t.src || t.href,
          title: w && w.title || t.title || (x = (t || document).getElementsByTagName("img")).length && x[0].alt || d || "",
          description: w && w.description || t.description || e || ""
        };
      }

      G = b || 1;
      Ia(!0);
      Ja();
    }
  }

  function Ka(a, b, c, d) {
    if (d || a[c]) I[c] = b && b[c] || d;
  }

  function La(a, b) {
    I = {};
    b && Ma(b);
    Ma(a);
    Ka(a, b, "description");
    Ka(a, b, "title");
    Ka(a, b, "prefetch", !0);
    Ka(a, b, "preloader", !0);
    ua = a.onchange;
    J = I.infinite;
    J = "undefined" !== typeof J && "false" !== J;
    ta = "false" !== I.progress;
    va = 1 * I.player || 7E3;
    if ((a = I.zoom) || "" === a) I["zoom-in"] = I["zoom-out"] = a, delete I.zoom;

    if ((a = I.control) || "" === a) {
      a = "string" === typeof a ? a.split(",") : a;

      for (b = 0; b < p.length; b++) {
        I[p[b]] = "false";
      }

      for (b = 0; b < a.length; b++) {
        var c = a[b].trim();
        "zoom" === c ? I["zoom-in"] = I["zoom-out"] = "true" : I[c] = "true";
      }
    }

    for (a = 0; a < p.length; a++) {
      b = p[a], l(V(b), "display", "false" === I[b] ? "none" : "");
    }

    (sa = I.theme) ? Na() : sa = "white";
  }

  function Ma(a) {
    for (var b = I, c = Object.keys(a), d = 0; d < c.length; d++) {
      var e = c[d];
      b[e] = "" + a[e];
    }
  }

  function Oa() {
    var a = G;
    K = L[a - 1];
    M = K.firstElementChild;
    G = a;

    if (!M) {
      var b = "false" !== I.preloader;
      M = new Image();

      M.onload = function () {
        b && h(P, "show");
        T && (y = this.width, z = this.height, l(this, {
          visibility: "visible",
          opacity: 1,
          transform: ""
        }), "false" !== I.prefetch && a < H && (new Image().src = T[a].src));
      };

      M.onerror = function () {
        K.removeChild(this);
      };

      K.appendChild(M);
      M.src = T[a - 1].src;
      b && f(P, "show");
      return !b;
    }

    return !0;
  }

  la(document, "", Pa);
  la(document, "DOMContentLoaded", Qa, {
    once: !0
  });
  var Ra = !1;

  function Qa() {
    Ra || (N = document.createElement("div"), N.id = "spotlight", N.innerHTML = '<div class=preloader></div><div class=scene><div class=pane></div></div><div class=header><div class=page></div><div class="icon fullscreen"></div><div class="icon autofit"></div><div class="icon zoom-out"></div><div class="icon zoom-in"></div><div class="icon theme"></div><div class="icon player"></div><div class="icon close"></div></div><div class=progress></div><div class="arrow arrow-left"></div><div class="arrow arrow-right"></div><div class=footer><div class=title></div><div class=description></div></div>', l(N, "transition", "none"), document.body.appendChild(N), wa = V("scene"), xa = V("footer"), ya = V("title"), za = V("description"), Aa = V("arrow-left"), Ba = V("arrow-right"), O = V("fullscreen"), Ca = V("page"), Da = V("player"), Ea = V("progress"), P = V("preloader"), S = document.documentElement || document.body, document.cancelFullScreen || (document.cancelFullScreen = document.exitFullscreen || document.webkitCancelFullScreen || document.webkitExitFullscreen || document.mozCancelFullScreen || function () {}), S.requestFullScreen || (S.requestFullScreen = S.webkitRequestFullScreen || S.msRequestFullScreen || S.mozRequestFullScreen || l(O, "display", "none") || function () {}), Ga = [[window, "keydown", Sa], [window, "wheel", Ta], [window, "hashchange", Ua], [window, "resize", Va], [P, "mousedown", Wa], [P, "mouseleave", Xa], [P, "mouseup", Xa], [P, "mousemove", Ya], [P, "touchstart", Wa, {
      passive: !1
    }], [P, "touchcancel", Xa], [P, "touchend", Xa], [P, "touchmove", Ya, {
      passive: !0
    }], [O, "", Za], [Aa, "", $a], [Ba, "", W], [Da, "", ab], [V("autofit"), "", bb], [V("zoom-in"), "", cb], [V("zoom-out"), "", db], [V("close"), "", eb], [V("theme"), "", Na]], Ra = !0);
  }

  function Va() {
    u = N.clientWidth;
    v = N.clientHeight;
    M && (y = M.width, z = M.height, fb());
  }

  function fb() {
    l(M, "transform", "translate(-50%, -50%) scale(" + A + ")");
  }

  function X(a, b) {
    l(K, "transform", a || b ? "translate(" + a + "px, " + b + "px)" : "");
  }

  function Ia(a, b) {
    (a ? m : l)(wa, "transform", "translateX(" + (100 * -(G - 1) + (b || 0)) + "%)");
  }

  function gb(a) {
    for (var b = 0; b < Ga.length; b++) {
      var c = Ga[b];
      (a ? la : na)(c[0], c[1], c[2], c[3]);
    }
  }

  function Pa(a) {
    var b = hb.call(a.target, ".spotlight");

    if (b) {
      var c = hb.call(b, ".spotlight-group"),
          d = (c || document).getElementsByClassName("spotlight");
      La(b.dataset, c && c.dataset);

      for (c = 0; c < d.length; c++) {
        if (d[c] === b) {
          Ha(d, c + 1);
          break;
        }
      }

      ib();
      return n(a);
    }
  }

  function Sa(a) {
    if (K) switch (a.keyCode) {
      case 8:
        bb();
        break;

      case 27:
        eb();
        break;

      case 32:
        "false" !== I.player && ab();
        break;

      case 37:
        $a();
        break;

      case 39:
        W();
        break;

      case 38:
      case 107:
      case 187:
        cb();
        break;

      case 40:
      case 109:
      case 189:
        db();
    }
  }

  function Ta(a) {
    K && (a = a.deltaY, 0 > .5 * (0 > a ? 1 : a ? -1 : 0) ? db() : cb());
  }

  function Ua() {
    K && "#spotlight" === location.hash && eb(!0);
  }

  function ab(a) {
    ("boolean" === typeof a ? a : !Q) ? Q || (Q = setInterval(W, va), f(Da, "on"), ta && jb()) : Q && (Q = clearInterval(Q), h(Da, "on"), ta && m(Ea, "transform", ""));
    return Q;
  }

  function Y() {
    R ? clearTimeout(R) : f(N, "menu");
    var a = I.autohide;
    R = "false" !== a ? setTimeout(function () {
      h(N, "menu");
      R = null;
    }, 1 * a || 3E3) : 1;
  }

  function kb(a) {
    "boolean" === typeof a && (R = a ? R : 0);
    R ? (R = clearTimeout(R), h(N, "menu")) : Y();
    return n(a);
  }

  function Wa(a) {
    B = !0;
    C = !1;
    var b = lb(a);
    D = y * A <= u;
    pa = b.x;
    qa = b.y;
    return n(a, !0);
  }

  function Xa(a) {
    if (B && !C) return B = !1, kb(a);
    D && C && (Ia(!0, q / u * 100), q < -(v / 10) && W() || q > v / 10 && $a() || Ia(), q = 0, D = !1, X());
    B = !1;
    return n(a);
  }

  function Ya(a) {
    if (B) {
      Fa || (Fa = requestAnimationFrame(mb));
      var b = lb(a),
          c = (y * A - u) / 2;
      C = !0;
      q -= pa - (pa = b.x);
      D ? E = !0 : q > c ? q = c : 0 < u - q - y * A + c ? q = u - y * A + c : E = !0;
      z * A > v && (c = (z * A - v) / 2, r -= qa - (qa = b.y), r > c ? r = c : 0 < v - r - z * A + c ? r = v - z * A + c : E = !0);
    } else Y();

    return n(a, !0);
  }

  function lb(a) {
    var b = a.touches;
    b && (b = b[0]);
    return {
      x: b ? b.clientX : a.pageX,
      y: b ? b.clientY : a.pageY
    };
  }

  function mb(a) {
    E ? (a && (Fa = requestAnimationFrame(mb)), X(q, r)) : Fa = null;
    E = !1;
  }

  function Za(a) {
    ("boolean" === typeof a ? a : document.isFullScreen || document.webkitIsFullScreen || document.mozFullScreen) ? (document.cancelFullScreen(), h(O, "on")) : (S.requestFullScreen(), f(O, "on"));
  }

  function bb(a) {
    "boolean" === typeof a && (F = !a);
    F = 1 === A && !F;
    l(M, {
      maxHeight: F ? "none" : "",
      maxWidth: F ? "none" : "",
      transform: ""
    });
    y = M.width;
    z = M.height;
    A = 1;
    r = q = 0;
    E = !0;
    X();
    Y();
  }

  function cb(a) {
    var b = A / .65;
    5 >= b && nb(A = b);
    a || Y();
  }

  function nb(a) {
    A = a || 1;
    fb();
  }

  function db(a) {
    var b = .65 * A;
    1 <= b && (nb(A = b), r = q = 0, E = !0, X());
    a || Y();
  }

  function ib() {
    location.hash = "spotlight";
    location.hash = "show";
    l(N, "transition", "");
    f(S, "hide-scrollbars");
    f(N, "show");
    gb(!0);
    Va();
    Y();
  }

  function eb(a) {
    gb(!1);
    history.go(!0 === a ? -1 : -2);
    h(S, "hide-scrollbars");
    h(N, "show");
    Q && ab(!1);
    M.parentNode.removeChild(M);
    K = L = M = T = I = ua = null;
  }

  function $a() {
    if (1 < G) return Z(G - 1);
    if (Q || J) return Z(H);
  }

  function W() {
    if (G < H) return Z(G + 1);
    if (Q || J) return Z(1);
  }

  function Z(a) {
    if (!(Q && B || a === G)) {
      Q || Y();
      Q && ta && jb();
      var b = a > G;
      G = a;
      Ja(b);
      return !0;
    }
  }

  function jb() {
    m(Ea, {
      transitionDuration: "",
      transform: ""
    });
    l(Ea, {
      transitionDuration: va + "ms",
      transform: "translateX(0)"
    });
  }

  function Na(a) {
    "boolean" === typeof a ? ra = a : (ra = !ra, Y());
    ra ? f(N, sa) : h(N, sa);
  }

  function Ja(a) {
    r = q = 0;
    A = 1;
    var b = I.animation,
        c = !0,
        d = !0,
        e = !0;

    if (b || "" === b) {
      c = d = e = !1;
      b = "string" === typeof b ? b.split(",") : b;

      for (var k = 0; k < b.length; k++) {
        var t = b[k].trim();
        if ("scale" === t) c = !0;else if ("fade" === t) d = !0;else if ("slide" === t) e = !0;else if ("flip" === t) var w = !0;else if ("false" !== t) {
          c = d = e = w = !1;
          var x = t;
          break;
        }
      }
    }

    l(wa, "transition", e ? "" : "none");
    Ia();
    K && X();

    if (M) {
      l(M, {
        opacity: d ? 0 : 1,
        transform: ""
      });
      var U = M;
      setTimeout(function () {
        U && M !== U && U.parentNode && U.parentNode.removeChild(U);
      }, 800);
    }

    e = Oa();
    x && f(M, x);
    m(M, {
      opacity: d ? 0 : 1,
      transform: "translate(-50%, -50%)" + (c ? " scale(0.8)" : "") + (w && "undefined" !== typeof a ? " rotateY(" + (a ? "" : "-") + "90deg)" : ""),
      maxHeight: "",
      maxWidth: ""
    });
    e && l(M, {
      visibility: "visible",
      opacity: 1,
      transform: ""
    });
    x && h(M, x);
    X();
    l(Aa, "visibility", J || 1 !== G ? "" : "hidden");
    l(Ba, "visibility", J || G !== H ? "" : "hidden");
    a = T[G - 1];
    if (c = (c = a.title || a.description) && "false" !== c) ka(ya, a.title || ""), ka(za, a.description || "");
    l(xa, "visibility", c ? "visible" : "hidden");
    ka(Ca, G + " / " + H);
    ua && ua(G);
  }

  var hb = Element.prototype.closest || function (a) {
    var b = this;

    for (a = a.substring(1); b && 1 === b.nodeType;) {
      if (b.classList.contains(a)) return b;
      b = b.parentElement || b.parentNode;
    }
  };

  window.Spotlight = {
    init: Qa,
    theme: Na,
    fullscreen: Za,
    autofit: bb,
    next: W,
    prev: $a,
    "goto": Z,
    close: eb,
    zoom: nb,
    menu: kb,
    show: function show(a, b) {
      setTimeout(function () {
        a ? (b ? La(b) : b = {}, Ha(a, b.index)) : I = {};
        ib();
      });
    },
    play: ab
  };
}).call(void 0);