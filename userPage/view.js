let q = query => document.querySelector(query);
let qa = query => document.querySelectorAll(query);
let toggle = (query, className) => q(query).classList.toggle(className);
let addChild = (parentSelector, child) => q(parentSelector).appendChild(child);
let toggleAll = (arr, className) => arr.forEach(item => toggle(item, className));

var lastFeature;

function saveHandler(loadFunc, loadParam){
    function toggleFailure(){
        toggle('#failure-notification-container', 'dispnone');
        setTimeout(function(){
            toggle('#failure-notification-container', 'dispnone');
        }, 3000);
    }
    
    function toggleSuccess(){
        toggle('#success-notification-container', 'dispnone');
        setTimeout(function(){
            toggle('#success-notification-container', 'dispnone');
        }, 3000);
    }

    handler.saveData().then(function() {
        loadFunc(loadParam);
        toggleSuccess();
    }).catch(function() {
        toggleFailure();
    });
};

function showHide(show) {
    function isHidden(el) {
        return el.classList.contains('dispnone');
    }

    var contentWindows = Array.from(qa('.content-window'));
    contentWindows.forEach(function(contentWindow) {
        if((contentWindow.id == show && isHidden(contentWindow)) || !isHidden(contentWindow) && contentWindow.id !== show) {
            contentWindow.classList.toggle('dispnone');
        }
    });
}

//search
function resetSearch() {
    q('#search-input').value = '';
}

function loadSearch(){

    function getAllMatches(input) {
        input = input.toLowerCase();
        var matches = handler.getServices().filter(function(service) {
            var name = service.name.toLowerCase();
            var url = service.url.toLowerCase();
            var description = service.description.toLowerCase();
            return (url.length && url.indexOf(input) != -1) || name.indexOf(input) != -1 || ( description.length && description.indexOf(description) != -1);
        });
        return matches;
    }

    function loadSearchPage(newValue) {
        var searchTable = dom.tbody({id: 'search-results-body'}, [
            getAllMatches(newValue).map(function(match) {
                return dom.tr({class: 'service-row'}, [
                    dom.td([match.name]),
                    dom.td([match.url])
                ], {
                    click: function() {
                        loadServicePage(match);
                        q('#search-submit').classList.toggle('vis-none');
                    }
                });
            })
        ])
        q('#search-results').replaceChild(searchTable, q('#search-results-body'));
    }

    function searchChange(e) {
        var newValue = e.target.value;
        if(newValue === '') {
            loadFeaturePage(lastFeature);
        } else {
            showHide('search-page');
            loadSearchPage(newValue);
        }
    }
    
    function closeClicked() {
        loadFeaturePage(lastFeature);
    }
    
    function searchClicked() {
        var searchValue = q('#search-input').value;
        loadSearchPage(searchValue);
    }

    q('#search-input').addEventListener('input', searchChange);
    q('#close-button').addEventListener('click', closeClicked);
    q('#search-submit').addEventListener('click', searchClicked);
}

//navigation
function attachListeners() {
    q('#services-nav').addEventListener('click', function() {
        loadFeaturePage(lastFeature ? lastFeature : appData.features[0]);
        toggleAll(
            ['.p-search-box', '#services-page', '#feature-flags-page'],
            'dispnone'
        );
        qa('.p-navigation__item').forEach(function(item) {
            item.classList.toggle('is-selected');
        });

    });
    q('#featureFlags-nav').addEventListener('click', function() {
        toggleAll(
            ['.p-search-box', '#services-page', '#feature-flags-page'],
            'dispnone'
        );
        qa('.p-navigation__item').forEach(function(item) {
            item.classList.toggle('is-selected');
        });
    });
}

//feature menu
function updateNav(typeSelected, id) {
    toggle('.highlight', 'highlight');
    toggle(`#${typeSelected}-${id}`, 'highlight');
}

function loadFeatureMenu() {
    var featureMenu = dom.ul({id: 'feature-list'},[
        handler.getFeatures().map(function(feature) {
            return dom.li({style: 'position: relative'},[
                dom.a({id: `feature-${feature.id}`}, [feature.name], {
                    click: function() {
                        loadFeaturePage(feature);
                    }
                }),
                dom.ul([
                    handler.getFeatureServices(feature).map(function(service){
                        return dom.li([
                            dom.a({id: `service-${service.id}`},[service.name], {
                                click: function() {
                                    loadServicePage(service);
                                }
                            })
                        ])
                    })
                ])
            ])
        })
    ], {
        after: function(el) {
            el.querySelector('a').classList.add('highlight');
        }
    });
    if(q('#feature-list')) {
        q('#nav-item-container').replaceChild(featureMenu, q('#feature-list'));
    } else {
        addChild('#nav-item-container', featureMenu);
    }
}

function loadFeaturePage(feature, isNewFeature) {
    showHide('feature-display');
    resetSearch();

    function addFeature() {
        var newFeature = handler.addFeature();
        loadFeatureMenu();
        loadFeaturePage(newFeature, true);
        showHide('feature-edit')
    }

    function addService() {
        var newService = handler.addService(feature.id);
        loadFeatureMenu();
        loadServicePage(newService);
    }

    function deleteFeature() {
        handler.deleteFeature(feature.id);
        loadFeatureMenu();
        saveHandler(loadFeaturePage, handler.getFeatureById(0));
    }

    function cancelEdit() {
        if(isNewFeature) {
            handler.resetUnsaved();
            loadFeatureMenu();
            loadFeaturePage(handler.getFeatureById(0));
        } else {
            loadFeaturePage(feature);
        }
    }

    function saveFeature() {
        var featureObj = {
            name: q('#feature-name-edit').value,
            description: q('#feature-description-edit').value
        };
        Object.assign(feature, featureObj);
        handler.updateFeature(feature);
        saveHandler(loadFeaturePage, feature);
    }

    var featureDisplay = dom.div({id: 'feature-display', class: 'content-window'}, [
            dom.button({class: `p-button ${feature.id === 0 ? 'dispnone': ''}`, style: 'float:right'},['Edit Feature'], {
                click: function() {
                    toggle('#feature-display', 'dispnone');
                    toggle('#feature-edit', 'dispnone');
                }
            }),
            dom.button({class: 'p-button', style: 'float:right'},['Add Feature'], {
                click: addFeature
            }),
            dom.h2([feature.name]),
            dom.p([feature.description]),
            dom.button({class: 'p-button', style: 'float:right'},['Add Service'], {
                click: addService
            }),
            dom.h3(['Services']),
            dom.table([
                dom.thead([
                    dom.tr([
                        dom.th(['Name']),
                        dom.th(['Url'])
                    ])
                ]),
                dom.tbody([
                    handler.getFeatureServices(feature).map(function(service){
                        return dom.tr({class: 'service-row'}, [
                            dom.td([service.name]),
                            dom.td([service.url])
                        ], {
                            click: function() {
                                loadServicePage(service);
                            }
                        });
                    })
                ])
            ]),
            dom.h3(['Feature Flags']),
            dom.table([
                dom.thead([
                    dom.tr([
                        dom.th(['Name']),
                        dom.th(['Key']),
                        dom.th(['Value'])
                    ])
                ]),
                dom.tbody([
                    handler.getFlagsByFeature(feature).map(function(flag){
                        return dom.tr({class: 'flag-row'}, [
                            dom.td([flag.name]),
                            dom.td([flag.key]),
                            dom.td([flag.value])
                        ]);
                    })
                ])
            ]),
            dom.button({class: `p-button ${feature.id === 0 ? 'dispnone': ''}`, style: 'float:right'},['Delete Feature & Services'], {
                click: deleteFeature
            }),
        ]);

    var featureEdit = dom.div({id: 'feature-edit', class: 'content-window'}, [
            dom.button({class: 'p-button', style: 'float:right'},['Cancel'], {
                click: cancelEdit
            }),
            dom.button({class: 'p-button', style: 'float:right'},['Save Feature'], {
                click: saveFeature
            }),
            dom.form([
                dom.label({for: 'feature-name-edit'}, [
                    'Feature name: '
                ]),
                dom.input({id: 'feature-name-edit', name: 'feature-name-edit', type: 'text', value: feature.name},[]),
                dom.label({for: 'feature-description-edit'}, [
                    'Feature description: '
                ]),
                dom.textarea({id: 'feature-description-edit', name: 'feature-description-edit'},[feature.description])
            ])
        ]);

    isNewFeature ? featureDisplay.classList.toggle('dispnone') : featureEdit.classList.toggle('dispnone');

    updateNav('feature', feature.id);
    lastFeature = feature;
    q('#feature-display').replaceWith(featureDisplay);
    q('#feature-edit').replaceWith(featureEdit);
}

function loadServicePage(service) {
    resetSearch();
    showHide('service-page');

    function saveService() {
        var data;
        try {
            data = JSON.parse(q('#service-data-edit').value);
            var serviceObj = {
                name: q('#service-name-edit').value,
                url: q('#service-url-edit').value,
                data: data,
                description: q('#service-description-edit').value
            };

            Object.assign(service, serviceObj);
            handler.updateService(service);
            saveHandler(loadServicePage, service);
        } catch {
            toggleFailure();
        }
    }

    function deleteService() {
        handler.deleteService(service.id);
        loadFeatureMenu();
        saveHandler(loadFeaturePage, handler.getFeatureById(service.featureId));
    }

    var servicePage = dom.div([
        dom.button({class: 'p-button', style: 'float:right'},['Save Service'], {
            click: saveService
        }),
        dom.form([
            dom.label({for: 'service-name-edit'}, [
                'Service name: '
            ]),
            dom.input({id: 'service-name-edit', name: 'service-name-edit', type: 'text', value: service.name},[]),
            dom.label({for: 'service-url-edit'}, [
                'Service url: '
            ]),
            dom.input({id: 'service-url-edit', name: 'service-url-edit', type: 'text', value: service.url},[]),
            dom.label({for: 'service-description-edit'},[
                'Service description: '
            ]),
            dom.textarea({id: 'service-description-edit'},[
                service.description
            ]),
            dom.label({for: 'service-data-edit'},[
                'Service data: '
            ]),
            dom.textarea({id: 'service-data-edit', class: 'json'},[
                JSON.stringify(service.data, null, 2)
            ]),
            dom.button({class: 'p-button', style: 'float:right'},['Delete Service'], {
                click: deleteService
            }),
        ])
    ]);
    updateNav('service', service.id);
    q('#service-page').replaceChildren(servicePage);
}

function loadFeatureFlagsPage(newFlag) {
    var sortedFlags = handler.getData().featureFlags.sort(function(a, b) {
        return getFeatureById(a.featureId).name.localeCompare(getFeatureById(b.featureId).name);
    });

    if(newFlag) {
        var newFlagData = handler.addFeatureFlag();
        var sortedFlags = [newFlagData].concat(sortedFlags);
    }

    function saveFeatureFlags() {
        handler.updateFeatureFlags(sortedFlags);
        console.error(sortedFlags);
        saveHandler(loadFeatureFlagsPage, false);
    }
    
    var featureFlagPage = dom.div({id: 'featureFlags'}, [
        dom.button({class: 'p-button', style: 'float:right'},['Save Feature Flags'], {
            click: saveFeatureFlags
        }),
        dom.button({class: 'p-button', style: 'float:right'},['Create Flag'], {
            click: function() {
                loadFeatureFlagsPage(true);
            }
        }),
        dom.h2(['Feature Flags']),
        dom.table([
            dom.thead([
                dom.tr([
                    dom.th(['Name']),
                    dom.th(['Feature']),
                    dom.th(['Key']),
                    dom.th(['Value']),
                    dom.th(['Type'])
                ])
            ]),
            dom.tbody([
                sortedFlags.map(function(featureFlag){

                    featureRow = dom.tr({class: 'feature-tr'},[
                        dom.td(
                            dom.input({type: 'text', class: 'input feature-input', model: featureFlag, modelkey: 'name', value: featureFlag.name})
                        ),
                        dom.td(
                            dom.div({class: 'select'}, [
                                dom.select({model: featureFlag, modelkey: 'featureId', style: 'border: none'}, [
                                    handler.getData().features.map(function(feature){
                                        return dom.option({value: feature.id},[feature.name])
                                    })
                                ], {
                                    after: function(el) {
                                        el.value = featureFlag.featureId
                                    }
                                })
                            ])
                        ),
                        dom.td(
                            dom.input({type: 'text', class: 'input feature-input', model: featureFlag, modelkey: 'key', value: featureFlag.key})
                        ),
                        dom.td([
                            dom.div({class: 'flag-value booleanValue'}, [
                                dom.label({class: 'checkbox'}, [
                                    dom.input({class: 'value-checkbox', type: 'checkbox',  model: featureFlag, modelkey: 'value',},[],{
                                        change: function(evt) {
                                            evt.target.parentElement.querySelector('span').textContent = evt.target.checked;
                                        },
                                        after: function(el) {
                                            el.checked = featureFlag.value === true ? true : false;
                                        }
                                    }),
                                    dom.span([`${featureFlag.value === true ? 'true': 'false'}`])                                    
                                ])
                            ]),
                            dom.div({class: 'flag-value stringValue'}, [
                                dom.input({type: 'text', class: 'input feature-input value-input', model: featureFlag, modelkey: 'value', value: featureFlag.value})
                            ])
                        ],  {
                            after: function(el) {
                                if(typeof featureFlag.value === "string") {
                                    el.querySelector('.flag-value.booleanValue').classList.toggle('dispnone');
                                } else {
                                    el.querySelector('.flag-value.stringValue').classList.toggle('dispnone');
                                }
                            }
                        }),
                        dom.td([
                            dom.div({class: 'select'}, [
                                dom.select({style: 'border: none;'},[
                                    dom.option({value: 'boolean'}, ['Boolean']),
                                    dom.option({value: 'string'}, ['String'])
                                ], {
                                    change: function(evt) {
                                        featureRow.querySelector('.flag-value.stringValue').classList.toggle('dispnone');
                                        featureRow.querySelector('.flag-value.booleanValue').classList.toggle('dispnone');
                                    },
                                    after: function(el) {
                                        el.value = typeof featureFlag.value;
                                    }
                                })
                            ])
                        ])
                    ]);

                    return featureRow;
                })
            ])
        ])
    ]);

    q('#feature-flags-page').replaceChildren(featureFlagPage);
}

function loadPage() {
    loadSearch();
    loadFeatureMenu();
    loadFeaturePage(handler.getFeatureById(0));
    loadFeatureFlagsPage();
    attachListeners();
}



























// small script to make the example interactive
// not intended to be used in projects
var links = [].slice.call(document.querySelectorAll('.p-side-navigation__link, .p-side-navigation--raw-html li > a'));

links.forEach(function (link) {
  link.addEventListener('click', function () {
    var active = [].slice.call(document.querySelectorAll('.is-active, [aria-current]'));
    active.forEach(function (link) {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    });
    this.setAttribute('aria-current', 'page');
    this.blur();
  });
});
  /**
  Toggles the expanded/collapsed classed on side navigation element.

  @param {HTMLElement} sideNavigation The side navigation element.
  @param {Boolean} show Whether to show or hide the drawer.
*/
function toggleDrawer(sideNavigation, show) {
  const toggleButtonOutsideDrawer = sideNavigation.querySelector('.p-side-navigation__toggle');
  const toggleButtonInsideDrawer = sideNavigation.querySelector('.p-side-navigation__toggle--in-drawer');

  if (sideNavigation) {
    if (show) {
      sideNavigation.classList.remove('is-drawer-collapsed');
      sideNavigation.classList.add('is-drawer-expanded');

      toggleButtonInsideDrawer.focus();
      toggleButtonOutsideDrawer.setAttribute('aria-expanded', true);
      toggleButtonInsideDrawer.setAttribute('aria-expanded', true);
    } else {
      sideNavigation.classList.remove('is-drawer-expanded');
      sideNavigation.classList.add('is-drawer-collapsed');

      toggleButtonOutsideDrawer.focus();
      toggleButtonOutsideDrawer.setAttribute('aria-expanded', false);
      toggleButtonInsideDrawer.setAttribute('aria-expanded', false);
    }
  }
}

// throttle util (for window resize event)
var throttle = function (fn, delay) {
  var timer = null;
  return function () {
    var context = this,
      args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
};

/**
  Attaches event listeners for the side navigation toggles
  @param {HTMLElement} sideNavigation The side navigation element.
*/
function setupSideNavigation(sideNavigation) {
  var toggles = [].slice.call(sideNavigation.querySelectorAll('.js-drawer-toggle'));
  var drawerEl = sideNavigation.querySelector('.p-side-navigation__drawer');

  // hide navigation drawer on small screens
  sideNavigation.classList.add('is-drawer-hidden');

  // setup drawer element
  drawerEl.addEventListener('animationend', () => {
    if (!sideNavigation.classList.contains('is-drawer-expanded')) {
      sideNavigation.classList.add('is-drawer-hidden');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleDrawer(sideNavigation, false);
    }
  });

  // setup toggle buttons
  toggles.forEach(function (toggle) {
    toggle.addEventListener('click', function (event) {
      event.preventDefault();

      if (sideNavigation) {
        sideNavigation.classList.remove('is-drawer-hidden');
        toggleDrawer(sideNavigation, !sideNavigation.classList.contains('is-drawer-expanded'));
      }
    });
  });

  // hide side navigation drawer when screen is resized
  window.addEventListener(
    'resize',
    throttle(function () {
      toggles.forEach((toggle) => {
        return toggle.setAttribute('aria-expanded', false);
      });
      // remove expanded/collapsed class names to avoid unexpected animations
      sideNavigation.classList.remove('is-drawer-expanded');
      sideNavigation.classList.remove('is-drawer-collapsed');
      sideNavigation.classList.add('is-drawer-hidden');
    }, 10)
  );
}

/**
  Attaches event listeners for all the side navigations in the document.
  @param {String} sideNavigationSelector The CSS selector matching side navigation elements.
*/
function setupSideNavigations(sideNavigationSelector) {
  // Setup all side navigations on the page.
  var sideNavigations = [].slice.call(document.querySelectorAll(sideNavigationSelector));

  sideNavigations.forEach(setupSideNavigation);
}

setupSideNavigations('.p-side-navigation, [class*="p-side-navigation--"]');
