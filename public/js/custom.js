"use strict";

(function () {
  var elIdMenuBurger = document.getElementById('menu-burger');
  var elIdBackToTop = document.getElementById('back-to-top');
  var elHeader = document.querySelector('header');
  var elBody = document.querySelector('body');
  var elMenuContent = elIdMenuBurger.querySelector('.content');
  var elSplide = document.querySelector('.splide');
  var elsNavA = document.querySelectorAll('nav a');
  var elIdFiltersButton = document.getElementById('filters-button');
  var elIdShowResults = document.getElementById('show-results');
  var elIdLoadFPSpin = document.getElementById('load-fp-spin'); // Get the event name
  // Adapted from Modernizr: https://modernizr.com

  var whichTransitionEvent = function whichTransitionEvent() {
    var el = document.createElement('fakeelement');
    var transitions = {
      'transition': 'transitionend',
      'OTransition': 'oTransitionEnd',
      'MozTransition': 'transitionend',
      'WebkitTransition': 'webkitTransitionEnd'
    };

    for (var t in transitions) {
      if (el.style[t] !== undefined) {
        return transitions[t];
      }
    }
  };

  function showLoadFPSpin() {
    elIdLoadFPSpin.style.display = 'block';
  }

  function hideLoadFPSpin() {
    elIdLoadFPSpin.style.display = 'none';
  }

  var simulateClick = function simulateClick(elem) {
    // Create our event (with options)
    var evt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }); // If cancelled, don't dispatch our event

    var canceled = !elem.dispatchEvent(evt);
  };

  document.addEventListener('focus', function (event) {
    var currentForm = event.target.closest('.ais-SearchBox-input');

    if (currentForm) {
      simulateClick(document.querySelector('#clear-refinements-show-all button'));
    }
  }, true);

  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }

  elsNavA.forEach(function (elNavA) {
    elNavA.addEventListener('click', function (event) {
      toogleMenuBurger();
    });
  });

  if (elIdFiltersButton !== null) {
    elIdFiltersButton.addEventListener('click', function (event) {
      elBody.classList.add('show-filters');
    });
    elIdShowResults.addEventListener('click', function (event) {
      elBody.classList.remove('show-filters');
      scrollToTop(100);
    });
    var date = new Date(); //console.log(date.getDate());

    app({
      appId: '5IKVY0BULC',
      //'NUMQWE06PC',
      apiKey: 'e3c22f5936c0f7947f4a61ecee808f70',
      // '3982cd10b416047781ed12a74200ee35',
      indexName: 'NEUFMOINSCHERV2'
    });
    /*
            app({
                appId: 'KRF8HJ3XI9', //'NUMQWE06PC',
                apiKey: 'e1ac55235333a911b63bc835218ff424',// '3982cd10b416047781ed12a74200ee35',
                indexName: 'NEUFMOINSCHERV2',
            });*/
  }

  function findUpTag(el, attr) {
    while (el.parentNode) {
      el = el.parentNode;

      if (el[attr]) {
        return el;
      }
    }

    return null;
  }

  document.addEventListener('submit', function (event) {
    var currentForm = event.target.closest('.submitAjax');

    if (currentForm) {
      event.preventDefault();
      showLoadFPSpin();
      var elData = document.getElementById('modal-ajax');
      var data = new FormData(currentForm);
      data.append('_token', document.querySelector('meta[name="csrf-token"]').content);
      var xhr = new XMLHttpRequest();
      xhr.open('POST', currentForm.getAttribute('action'), true);

      xhr.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          elData.innerHTML = this.responseText;
          hideLoadFPSpin();
        }
      };

      xhr.send(data);
    }

    currentForm = event.target.closest('.submitDriiveme');
    if (!currentForm) return;
    event.preventDefault();
    showLoadFPSpin();
    var elData = document.getElementById('driiveme');
    var data = new FormData(currentForm);
    data.append('_token', document.querySelector('meta[name="csrf-token"]').content);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', currentForm.getAttribute('action'), true);

    xhr.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        elData.innerHTML = this.responseText;
        hideLoadFPSpin();
      }
    };

    xhr.send(data);
  });

  function isLoadFPSpinadable(linkElement) {
    if (!linkElement || !linkElement.href) {
      return;
    }

    if (!['http:', 'https:'].includes(linkElement.protocol)) {
      return;
    }

    if (linkElement.protocol == 'http:' && location.protocol == 'https:') {
      return;
    }

    if (linkElement.hash && linkElement.pathname + linkElement.search == location.pathname + location.search) {
      return;
    }

    if (linkElement.href.indexOf('#') != -1) {
      return;
    }

    if (linkElement.href.indexOf('?page=') != -1) {
      return;
    }

    if (linkElement.href.indexOf('rechercher') != -1) {
      return;
    }

    return true;
  }

  document.addEventListener('click', function (event) {
    var currentAConsentButton = event.target.closest('.js-consent-notice-close');

    if (currentAConsentButton) {
      var elConsentNotice = document.querySelector('.js-consent-notice');
      elConsentNotice.style.display = 'none';
      return;
    }

    var currentAHref = event.target.closest('a[href]');

    if (currentAHref) {
      if (currentAHref.matches('a[href], a[href] *')) {
        if (event.which > 1 || event.metaKey || event.ctrlKey || event.shiftKey) {
          return;
        }
        /*if (currentAHref.getAttribute('href').indexOf('#') == -1 &&
            currentAHref.getAttribute('href').toLowerCase().indexOf('mailto:') == -1 &&
            currentAHref.getAttribute('href').toLowerCase().indexOf('tel:') == -1 &&
            currentAHref.getAttribute('href').toLowerCase().indexOf('?page=') == -1 &&
            currentAHref.getAttribute('href').toLowerCase().indexOf('rechercher') == -1) {*/


        if (isLoadFPSpinadable(currentAHref)) {
          if (!currentAHref.getAttribute('target')) {
            console.log(currentAHref.getAttribute('href'));
            showLoadFPSpin();
          }

          return;
        }
      }
    }

    var currentTarget = event.target.closest('.toggle-modal');
    if (!currentTarget) return;
    event.preventDefault();
    var elModal = document.getElementById(currentTarget.getAttribute('data-id'));
    var dataAjax = currentTarget.getAttribute('data-ajax');

    if (dataAjax) {
      if (!elModal) {
        showLoadFPSpin();
        var divModal = document.createElement("div");
        divModal.setAttribute("id", "modalAjax");
        divModal.setAttribute("class", "modal");
        divModal.innerHTML = '<div class="modal-content"><span class="close toggle-modal" data-id="modalAjax">&times;</span><div id="modal-ajax"></div></div>';
        elBody.append(divModal);
        elModal = document.getElementById(currentTarget.getAttribute('data-id'));
      }

      var elData = document.getElementById('modal-ajax');
      var xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          elData.innerHTML = this.responseText;
          hideLoadFPSpin();
        }
      };

      xhr.open('GET', dataAjax);
      xhr.send();
    }

    if (elModal.classList.contains('active')) {
      elModal.classList.remove('active');
      return;
    } else {
      elModal.classList.add('active');
      return;
    }
  }, false);

  function toogleMenuBurger() {
    if (elBody.classList.contains('active')) {
      elBody.classList.remove('active');
      elMenuContent.innerHTML = 'Menu';
    } else {
      elBody.classList.add('active');
      elMenuContent.innerHTML = 'Fermer';
    }
  }

  function getAjaxContent(url) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        return this.responseText;
      }
    };

    xhr.open('GET', url);
    xhr.send();
  }

  elIdMenuBurger.onclick = function () {
    toogleMenuBurger();
  };

  var lastScrollTop = 0;

  function trackScroll() {
    var scrollTop = document.documentElement.scrollTop;

    if (scrollTop > elHeader.offsetHeight) {
      elIdBackToTop.classList.add('show');
    } else {
      elIdBackToTop.classList.remove('show');
    }

    if (lastScrollTop - scrollTop > 2) {
      elHeader.classList.remove("is-hidden");
    } else {
      if (scrollTop - lastScrollTop > 2 && scrollTop > elHeader.offsetHeight) {
        elHeader.classList.add('is-hidden');
      }
    }

    lastScrollTop = scrollTop;
  }

  function scrollToTop(scrollDuration) {
    var cosParameter = window.pageYOffset / 2,
        scrollCount = 0,
        oldTimestamp = performance.now();

    function step(newTimestamp) {
      scrollCount += Math.PI / (scrollDuration / (newTimestamp - oldTimestamp));
      if (scrollCount >= Math.PI) window.scrollTo(0, 0);
      if (window.pageYOffset === 0) return;
      window.scrollTo(0, Math.round(cosParameter + cosParameter * Math.cos(scrollCount)));
      oldTimestamp = newTimestamp;
      window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);
  }

  function backToTop() {
    scrollToTop(500);
  }

  window.addEventListener('scroll', trackScroll, {
    passive: true
  });
  elIdBackToTop.addEventListener('click', backToTop);

  if (elSplide !== null) {
    new Splide('.splide', {
      perPage: 1,
      //cover   : true,
      //heightRatio: 0.5,
      pagination: false,
      interval: 5000,
      autoplay: true,
      preloadPages: 0,
      lazyLoad: 'nearby',
      rewind: true
    }).mount();
  }
  /*
      window.onload = function() {
          var datesCollection = document.getElementsByClassName("input-date");
          Array.prototype.forEach.call(datesCollection, function(el, index, array) {
              new Cleave(el, {
                  date: true,
                  delimiter: '/',
                  datePattern: ['d', 'm', 'Y']
              });
          });
          /*
                  var platesCollection = document.getElementsByClassName("input-plate");
                  Array.prototype.forEach.call(platesCollection, function(el, index, array) {
                      new Cleave(el, {
                          delimiter: '-',
                          blocks: [2, 3, 2],
                          uppercase: true,
                          delimiterLazyShow: false
                      });
                  });
          */

  /*var plateFormat;
  var platesCollection = document.getElementsByClassName("input-plate");
  platesCollection.addEventListener('keyup', function(event) {
      if (plateFormat != null) {
          plateFormat.destroy();
          plateFormat = null;
      }
        if ($(this).val().length <= 14) {
          activeFormat = new Cleave('.input-plate', {
              numericOnly: true,
              blocks: [3, 3, 3, 3],
              delimiters: ['.', '.', '-']
          });
      } else {
          activeFormat = new Cleave('.input-plate', {
              numericOnly: true,
              blocks: [2, 3, 3, 4, 2],
              delimiters: ['.', '.', '/', '-']
          });
      }
  });
  */

  /*
        var phonesCollection = document.getElementsByClassName("input-phone");
        Array.prototype.forEach.call(phonesCollection, function(el, index, array) {
            new Cleave(el, {
                delimiter: '.',
                numericOnly: true,
                blocks: [2, 2, 2, 2, 2],
                delimiterLazyShow: false
            });
        });
    };
  */
  // Show an element


  var showElement = function showElement(elem) {
    // Get the natural height of the element
    var getHeight = function getHeight() {
      elem.style.display = 'block'; // Make it visible

      var height = elem.scrollHeight + 'px'; // Get it's height

      elem.style.display = ''; //  Hide it again

      return height;
    };

    var height = getHeight(); // Get the natural height

    elem.classList.add('is-visible'); // Make the element visible

    elem.style.height = height; // Update the max-height

    var transition = whichTransitionEvent(); // Once the transition is complete, remove the inline max-height so the content can scale responsively

    window.addEventListener(transition, function removeHeight(event) {
      if (!event.propertyName === 'height') return;
      elem.style.height = '';
      elem.classList.add('collapsed'); // Make the element visible

      window.removeEventListener(transition, removeHeight, false);
    }, false);
  }; // Hide an element


  var hideElement = function hideElement(elem) {
    // Give the element a height to change from
    elem.style.height = elem.scrollHeight + 'px'; // Set the height back to 0

    window.setTimeout(function () {
      elem.style.height = '0';
      elem.classList.remove('collapsed');
    }, 1); // When the transition is complete, hide it

    window.addEventListener('transitionend', function removeVisibility(event) {
      if (!event.propertyName === 'height') return;
      elem.classList.remove('is-visible');
      window.removeEventListener('transitionend', removeVisibility, false);
    }, false);
  }; // Toggle element visibility


  var toggleElement = function toggleElement(elem, target) {
    // If the element is visible, hide it
    if (elem.classList.contains('collapsed')) {
      target.classList.remove('is-visible');
      hideElement(elem);
      return;
    } // Otherwise, show it


    target.classList.add('is-visible');
    showElement(elem);
  }; // Listen for click events


  document.addEventListener('click', function (event) {
    var currentTarget = event.target;
    var checkHref = currentTarget.href;

    if (!checkHref) {
      currentTarget = findUpTag(currentTarget, 'href');
    }

    if (!currentTarget) return; // Make sure clicked element is our toggle

    if (!currentTarget.classList.contains('toggle')) return; // Prevent default link behavior

    event.preventDefault(); // Get the content

    var content = document.querySelector(event.target.hash);
    if (!content) return; // Toggle the content

    toggleElement(content, event.target);
  }, false);
  var elGeolocate = document.querySelector('.geolocate');

  if (elGeolocate !== null) {
    initAutocomplete();
    elGeolocate.addEventListener('focus', function (event) {
      geolocate();
    });
  }

  var autocomplete;
  var componentForm = {
    street_number: 'short_name',
    locality: 'long_name',
    postal_code: 'short_name'
  };

  function initAutocomplete() {
    autocomplete = new google.maps.places.Autocomplete(document.getElementById('route'), {
      types: ['address']
    });
    autocomplete.setFields(['address_component']);
    autocomplete.setComponentRestrictions({
      'country': ['fr']
    });
    autocomplete.addListener('place_changed', fillInAddress);
  }

  function fillInAddress() {
    var place = autocomplete.getPlace();

    for (var component in componentForm) {
      document.getElementById(component).value = '';
    }

    var fullAddress;

    for (var i = 0; i < place.address_components.length; i++) {
      var addressType = place.address_components[i].types[0];

      if (componentForm[addressType]) {
        document.getElementById(addressType).value = place.address_components[i][componentForm[addressType]];
      }

      var val = place.address_components[i].long_name;

      if (addressType == 'street_number') {
        fullAddress = val + ' ';
      }

      if (addressType == 'route') {
        fullAddress = fullAddress + val;
      }
    }

    document.getElementById('route').value = fullAddress;
  }

  function geolocate() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var geolocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        var circle = new google.maps.Circle({
          center: geolocation,
          radius: position.coords.accuracy
        });
        autocomplete.setBounds(circle.getBounds());
      });
    }
  }

  function app(opts) {
    /***** test */

    /***** fin test */
    var search = instantsearch({
      indexName: opts.indexName,
      numberLocale: 'fr',
      searchParameters: {
        facetingAfterDistinct: true,
        attributesToSnippet: ['extended:40']
      },
      searchClient: algoliasearch(opts.appId, opts.apiKey),
      routing: {
        router: instantsearch.routers.history({
          createURL: function createURL(_ref) {
            var qsModule = _ref.qsModule,
                routeState = _ref.routeState,
                location = _ref.location;
            var urlParts = location.href.match(/^(.*?)\/rechercher/);
            var baseUrl = "".concat(urlParts ? urlParts[1] : '', "/");
            var queryParameters = {};

            if (routeState.query) {
              queryParameters.query = encodeURIComponent(routeState.query);
            }

            if (routeState.page !== 1) {
              queryParameters.page = routeState.page;
            }

            if (routeState.marques) {
              queryParameters.marques = routeState.marques.map(encodeURIComponent);
            }

            if (routeState.modeles) {
              queryParameters.modeles = routeState.modeles.map(encodeURIComponent);
            }

            if (routeState.carrosseries) {
              queryParameters.carrosseries = routeState.carrosseries.map(encodeURIComponent);
            }

            if (routeState.options) {
              queryParameters.options = routeState.options.map(encodeURIComponent);
            }

            var queryString = qsModule.stringify(queryParameters, {
              addQueryPrefix: true,
              arrayFormat: 'repeat'
            });
            return "".concat(baseUrl, "rechercher").concat(queryString);
          },
          parseURL: function parseURL(_ref2) {
            var qsModule = _ref2.qsModule,
                location = _ref2.location;
            var pathnameMatches = location.pathname.match(/rechercher\/(.*?)\/?$/);

            var _qsModule$parse = qsModule.parse(location.search.slice(1)),
                _qsModule$parse$query = _qsModule$parse.query,
                query = _qsModule$parse$query === void 0 ? '' : _qsModule$parse$query,
                page = _qsModule$parse.page,
                _qsModule$parse$marqu = _qsModule$parse.marques,
                marques = _qsModule$parse$marqu === void 0 ? [] : _qsModule$parse$marqu,
                _qsModule$parse$carro = _qsModule$parse.carrosseries,
                carrosseries = _qsModule$parse$carro === void 0 ? [] : _qsModule$parse$carro,
                _qsModule$parse$model = _qsModule$parse.modeles,
                modeles = _qsModule$parse$model === void 0 ? [] : _qsModule$parse$model,
                _qsModule$parse$optio = _qsModule$parse.options,
                options = _qsModule$parse$optio === void 0 ? [] : _qsModule$parse$optio; // `qs` does not return an array when there's a single value.


            var allMarques = Array.isArray(marques) ? marques : [marques].filter(Boolean);
            var allCarrosseries = Array.isArray(carrosseries) ? carrosseries : [carrosseries].filter(Boolean);
            var allOptions = Array.isArray(options) ? options : [options].filter(Boolean);
            var allModeles = Array.isArray(modeles) ? modeles : [modeles].filter(Boolean);
            return {
              query: decodeURIComponent(query),
              page: page,
              marques: allMarques.map(decodeURIComponent),
              modeles: allModeles.map(decodeURIComponent),
              carrosseries: allCarrosseries.map(decodeURIComponent),
              options: allOptions.map(decodeURIComponent)
            };
          }
        }),
        stateMapping: {
          stateToRoute: function stateToRoute(uiState) {
            var indexUiState = uiState[opts.indexName] || {};
            return {
              query: indexUiState.query,
              page: indexUiState.page,
              marques: indexUiState.refinementList && indexUiState.refinementList.marque,
              modeles: indexUiState.refinementList && indexUiState.refinementList.modele,
              carrosseries: indexUiState.refinementList && indexUiState.refinementList.carrosserie,
              options: indexUiState.refinementList && indexUiState.refinementList.options
            };
          },
          routeToState: function routeToState(routeState) {
            return {
              NEUFMOINSCHERV2: {
                query: routeState.query,
                page: routeState.page,
                refinementList: {
                  marque: routeState.marques,
                  modele: routeState.modeles,
                  carrosserie: routeState.carrosseries,
                  options: routeState.options
                }
              }
            };
          }
        }
      }
    });
    /*
          var search = instantsearch({
              indexName: opts.indexName,
              numberLocale: 'fr',
              searchParameters: {
                  facetingAfterDistinct: true,
                  attributesToSnippet: ['extended:40'],
                },
              searchClient: algoliasearch(
                  opts.appId,
                  opts.apiKey
              ),
              //routing: {stateMapping: instantsearch.stateMappings.singleIndex(opts.indexName)},
              routing: {
                  stateMapping: instantsearch.stateMappings.singleIndex(opts.indexName)
              },
          });
    */

    /*
    var search = instantsearch({
        indexName: opts.indexName,
        numberLocale: 'fr',
        searchClient: algoliasearch(
            opts.appId,
            opts.apiKey
        ),
        routing: {
          router: instantsearch.routers.history({
            windowTitle({ category, query }) {
              const queryTitle = query ? `Results for "${query}"` : 'Search';
    
              if (category) {
                return `${category} – ${queryTitle}`;
              }
    
              return queryTitle;
            },
    
            createURL({ qsModule, routeState, location }) {
              const urlParts = location.href.match(/^(.*?)\/search/);
              const baseUrl = `${urlParts ? urlParts[1] : ''}/`;
    
              const categoryPath = routeState.category
                ? `${getCategorySlug(routeState.category)}/`
                : '';
              const queryParameters = {};
    
              if (routeState.query) {
                queryParameters.query = encodeURIComponent(routeState.query);
              }
              if (routeState.page !== 1) {
                queryParameters.page = routeState.page;
              }
              if (routeState.brands) {
                queryParameters.brands = routeState.brands.map(encodeURIComponent);
              }
    
              const queryString = qsModule.stringify(queryParameters, {
                addQueryPrefix: true,
                arrayFormat: 'repeat'
              });
    
              return `${baseUrl}search/${categoryPath}${queryString}`;
            },
    
            parseURL({ qsModule, location }) {
              const pathnameMatches = location.pathname.match(/search\/(.*?)\/?$/);
              const category = getCategoryName(
                (pathnameMatches && pathnameMatches[1]) || ''
              );
              const { query = '', page, brands = [] } = qsModule.parse(
                location.search.slice(1)
              );
              // `qs` does not return an array when there's a single value.
              const allBrands = Array.isArray(brands)
                ? brands
                : [brands].filter(Boolean);
    
              return {
                query: decodeURIComponent(query),
                page,
                brands: allBrands.map(decodeURIComponent),
                category
              };
            }
          }),
    
          stateMapping: {
            stateToRoute(uiState) {
              const indexUiState = uiState['instant_search'] || {};
    
              return {
                query: indexUiState.query,
                page: indexUiState.page,
                brands: indexUiState.refinementList && indexUiState.refinementList.brand,
                category: indexUiState.menu && indexUiState.menu.categories
              };
            },
    
            routeToState(routeState) {
              return {
                instant_search: {
                  query: routeState.query,
                  page: routeState.page,
                  menu: {
                    categories: routeState.category
                  },
                  refinementList: {
                    brand: routeState.brands
                  }
                }
              };
            }
          }
        }
      });*/

    /*
          instantsearch.widgets.configure({
              hitsPerPage: 2,
              distinct: true,
              clickAnalytics: true,
              enablePersonalization: true,
          });*/

    search.addWidgets([instantsearch.widgets.clearRefinements({
      container: '#clear-refinements',
      templates: {
        resetLabel: 'Supprimer les filtres'
      }
    }), instantsearch.widgets.clearRefinements({
      container: '#clear-refinements-show-all',
      templates: {
        resetLabel: 'Voir tous nos véhicules'
      }
    }), instantsearch.widgets.searchBox({
      container: '#searchbox',
      placeholder: 'Que recherchez-vous ? Renault Clio Blanc,...'
    }), instantsearch.widgets.hits({
      container: '#hits',
      templates: {
        item: "\n                    <a href=\"/voiture/{{slug}}\" class=\"{{classStock}} {{etat_class}}\">\n                        <img src=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 225'%3E%3C/svg%3E\" data-src=\"/thumbs/690x518/{{photo}}\" data-srcset=\"/thumbs/300x225/{{photo}} 300w, /thumbs/447x335/{{photo}} 768w, /thumbs/447x335/{{photo}} 1024w\" alt=\"{{name}}\" class=\"lazyload\" data-sizes=\"auto\" width=\"690\" height=\"518\">\n                        <span class=\"label {{disponibilite_class}}\">{{disponibilite}}</span>\n                        <span class=\"label label-etat {{etat_class}}\">{{etat}}</span>\n                        <div class=\"block\">\n                            <div class=\"title\">\n                                <div class=\"h2\">{{{marque}}} {{modele}}</div>\n                                <div class=\"infos\">\n                                    <span>{{type_boite}}</span>\n                                    <span>{{energie}}</span>\n                                </div>\n                            </div>\n                            <div class=\"subtitle\">{{version}}</div>\n\n                            <div class=\"price\">\n                                <div class=\"promotion\">-{{remise}}%</div>\n                                <div class=\"amount\">{{#helpers.formatNumber}}{{prix_ttc_affiche}}{{/helpers.formatNumber}} \u20AC</div>\n                                <div class=\"loa\">\n                                    <span>\xE0 partir de</span> {{#helpers.formatNumber}}{{mensualite}}{{/helpers.formatNumber}} \u20AC<small>/mois</small>\n                                    <img src=\"/img/ico_info.svg\" class=\"toggle-modal\" alt=\"infos\" data-id=\"modalAjax\" data-ajax=\"/mentions-legales/{{reference}}\" width=\"15\" height=\"15\">\n                                </div>\n                            </div>\n                        </div>\n                    </a>\n                    ",
        empty: "\n                    <div id=\"no-results-message\">\n                        <p>Nous n'avons trouv\xE9 aucun r\xE9sultat pour la recherche <em>\"{{query}}\"</em>.</p>\n                        <a href=\"rechercher\" class='clear-all'>Effacer la recherche</a>\n                    </div>\n                    "
      },
      cssClasses: {
        item: 'car',
        list: 'listing-cars'
      }
    }), instantsearch.widgets.stats({
      container: '#stats',
      templates: {
        text: "\n                    {{#hasNoResults}}Aucun v\xE9hicule{{/hasNoResults}}\n                    {{#hasOneResult}}1 v\xE9hicule{{/hasOneResult}}\n                    {{#hasManyResults}}{{#helpers.formatNumber}}{{nbHits}}{{/helpers.formatNumber}} v\xE9hicules{{/hasManyResults}}\n                    "
      }
    }), instantsearch.widgets.stats({
      container: '#show-results',
      templates: {
        text: "\n                    {{#hasNoResults}}Voir le listing{{/hasNoResults}}\n                    {{#hasOneResult}}Voir le v\xE9hicule trouv\xE9{{/hasOneResult}}\n                    {{#hasManyResults}}Voir nos {{#helpers.formatNumber}}{{nbHits}}{{/helpers.formatNumber}} v\xE9hicules{{/hasManyResults}}\n                    "
      }
    }), instantsearch.widgets.voiceSearch({
      container: '#voicesearch'
    }), instantsearch.widgets.pagination({
      container: '#pagination',
      padding: 1
      /*scrollTo: '#search-input',*/

    }), instantsearch.widgets.sortBy({
      container: '#sort-by-selector',
      autoHideContainer: true,
      items: [{
        value: opts.indexName,
        label: 'Trier par le + pertinent'
      }, {
        value: opts.indexName + '_price_asc',
        label: 'Trier par le - cher'
      }, {
        value: opts.indexName + '_price_desc',
        label: 'Trier par le + cher'
      }, {
        value: opts.indexName + '_remise_desc',
        label: 'Trier par remise'
      }, {
        value: opts.indexName + '_mensualite_asc',
        label: 'Trier par mensualité la - cher'
      }, {
        value: opts.indexName + '_mensualite_desc',
        label: 'Trier par mensualité le + cher'
      }]
    }), instantsearch.widgets.refinementList({
      container: '#brand',
      attribute: 'marque',
      operator: 'or',
      sortBy: ['isRefined', 'name:asc', 'count:desc'],
      limit: 200,
      searchForFacetValues: {
        placeholder: 'Rechercher par marques',
        templates: {
          noResults: '<div class="sffv_no-results">Pas de marques correspondantes.</div>'
        }
      }
    }), instantsearch.widgets.refinementList({
      container: '#options',
      attribute: 'options',
      operator: 'and',
      sortBy: ['isRefined', 'count:desc', 'name:asc'],
      limit: 200,
      searchForFacetValues: {
        placeholder: 'Rechercher par marques',
        templates: {
          noResults: '<div class="sffv_no-results">Pas de marques correspondantes.</div>'
        }
      }
    }), instantsearch.widgets.refinementList({
      container: '#gamme',
      attribute: 'modele',
      operator: 'or',
      limit: 400,
      sortBy: ['isRefined', 'name:asc', 'count:desc'],
      searchForFacetValues: {
        placeholder: 'Rechercher par modèles',
        templates: {
          noResults: '<div class="sffv_no-results">Pas de modèles correspondantes.</div>'
        }
      },
      //showMore: false,
      //showMoreLimit: 300,
      templates: {
        showMoreText: "\n                      {{#isShowingMore}}\n                        En voir moins\n                      {{/isShowingMore}}\n                      {{^isShowingMore}}\n                        En voir plus\n                      {{/isShowingMore}}\n                    "
      }
    }), instantsearch.widgets.refinementList({
      container: '#carrosserie',
      attribute: 'carrosserie',
      operator: 'or',
      sortBy: ['isRefined', 'count:desc', 'name:asc'],
      searchForFacetValues: {
        placeholder: 'Rechercher par carrosserie',
        templates: {
          noResults: '<div class="sffv_no-results">Pas de carrosseries correspondantes.</div>'
        }
      },
      templates: {
        header: getHeader('Carrosserie')
      }
    }), instantsearch.widgets.rangeSlider({
      container: '#price',
      attribute: 'prix_ttc_affiche',

      /*step: 100,*/
      templates: {
        header: getHeader('Prix')
      },
      tooltips: {
        format: function format(rawValue) {
          return Math.round(rawValue).toLocaleString() + '€';
        }
      }
    }), instantsearch.widgets.rangeSlider({
      container: '#mensualite',
      attribute: 'mensualite',

      /*step: 100,*/
      templates: {
        header: getHeader('Mensualité')
      },
      tooltips: {
        format: function format(rawValue) {
          return Math.round(rawValue).toLocaleString() + '€';
        }
      }
    }), instantsearch.widgets.rangeSlider({
      container: '#co2',
      attribute: 'emissionco2',

      /*step: 100,*/
      templates: {
        header: getHeader('Mensualité')
      },
      tooltips: {
        format: function format(rawValue) {
          return Math.round(rawValue).toLocaleString() + ' gr';
        }
      }
    }), instantsearch.widgets.refinementList({
      container: '#type',
      attribute: 'type_boite',
      operator: 'and',
      templates: {
        header: getHeader('Boite de Vitesse')
      }
    }), instantsearch.widgets.refinementList({
      container: '#carburant',
      attribute: 'energie',
      operator: 'or',
      templates: {
        header: getHeader('Carburant')
      }
    })]);
    search.start();
  }

  function getTemplate(templateName) {
    return document.querySelector('#' + templateName + '-template').innerHTML;
  }

  function getHeader(title) {
    return '<h5>' + title + '</h5>';
  }

  function sendEmail() {
    var request = new XMLHttpRequest(),
        token = document.querySelector('meta[name="csrf-token"]').content;
    request.open('POST', url, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    request.setRequestHeader('X-CSRF-TOKEN', token);
    request.send(data);
  }

  if (document.readyState !== 'loading') {
    hideLoadFPSpin();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      hideLoadFPSpin();
    });
  }
  /*
      window.onpageshow = function(event) {
          if (event.persisted) {
              hideLoadFPSpin();
          }
      };
  */


  if (document.addEventListener) {
    window.addEventListener('pageshow', function (event) {
      if (event.persisted || window.performance && window.performance.navigation.type == 2) {
        hideLoadFPSpin();
      }
    }, false);
  }
})();