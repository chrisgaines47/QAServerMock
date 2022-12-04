let q = query => document.querySelector(query);
let qa = query => document.querySelectorAll(query);
let toggle = (query, className) => q(query).classList.toggle(className);
let addChild = (parentSelector, child) => q(parentSelector).appendChild(child);
let toggleAll = (arr, className) => arr.forEach(item => toggle(item, className));
let hide = selector => {
    var el = q(selector);
    if(!el.classList.contains('dispnone')) {
        el.classList.add('dispnone');
    }
}

let hideAll = selectors => selectors.forEach(hide);

let show = selector => {
    var el = q(selector);
    if(el.classList.contains('dispnone')) {
        el.classList.remove('dispnone');
    }
}

let showAll = selectors => selectors.forEach(show);

var lastFeature;
var fetchData = [];


function toggleFailure(){
    toggle('#failure', 'dispnone');
    setTimeout(function(){
        toggle('#failure', 'dispnone');
    }, 3000);
}

function saveHandler(loadFunc, loadParam){

    function toggleSuccess(){
        toggle('#success', 'dispnone');
        setTimeout(function(){
            toggle('#success', 'dispnone');
        }, 3000);
    }

    handler.saveData().then(function() {
        if(loadFunc) {
            loadFunc(loadParam);
        }
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
            return (url.length && url.indexOf(input) != -1) || name.indexOf(input) != -1 || ( description.length && description.indexOf(input) != -1);
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
    q('#services-nav').addEventListener('click', function(e) {
        loadFeaturePage(lastFeature ? lastFeature : appData.features[0]);
        hideAll(['#feature-flags-page','#service-capture-page']);
        showAll(['.p-search-box', '#services-page']);
        qa('.p-navigation__item').forEach(function(item) {
            if(item === e.target.parentElement) {
                item.classList.add('is-selected');
            } else {
                item.classList.remove('is-selected');
            }
        });

    });
    q('#featureFlags-nav').addEventListener('click', function(e) {
        hideAll(['#services-page', '.p-search-box', '#service-capture-page']);
        show('#feature-flags-page');
        qa('.p-navigation__item').forEach(function(item) {
            if(item === e.target.parentElement) {
                item.classList.add('is-selected');
            } else {
                item.classList.remove('is-selected');
            }
        });
        loadFeatureFlagsPage();
    });
    q('#serviceCapture-nav').addEventListener('click', function(e) {
        hideAll(['#feature-flags-page', '#services-page', '.p-search-box']);
        show('#service-capture-page');
        qa('.p-navigation__item').forEach(function(item) {
            if(item === e.target.parentElement) {
                item.classList.add('is-selected');
            } else {
                item.classList.remove('is-selected');
            }
        });
        loadServiceCapturePage();
    });
}

//feature menu
function updateNav(typeSelected, id) {
    try {
        toggle('.highlight', 'highlight');
        toggle(`#${typeSelected}-${id}`, 'highlight');
    } catch {}
}

function loadFeatureMenu() {
    var featureMenu = dom.ul({id: 'feature-list'},[
        handler.getFeatures().map(function(feature) {
            return dom.li({style: 'position: relative'},[
                dom.a({id: `feature-${feature.id}`}, [feature.name], {
                    click: function() {
                        loadFeaturePage(feature);
                    }
                })
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
    loadFeatureMenu();
    resetSearch();

    function addFeature() {
        var newFeature = handler.addFeature();
        loadFeatureMenu();
        loadFeaturePage(newFeature, true);
        showHide('feature-edit');
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
            loadFeaturePage(lastFeature);
        } else {
            loadFeaturePage(feature);
        }
    }

    function saveFeature() {
        handler.updateFeature(feature);
        saveHandler(loadFeaturePage, feature);
    }

    var featureFlags = handler.getFlagsByFeature(feature);

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
                        dom.th(['Value']),
                        dom.th([])
                    ])
                ]),
                dom.tbody([
                    featureFlags.map(function(flag){
                        return dom.tr({class: 'flag-row'}, [
                            dom.td([flag.name]),
                            dom.td([flag.key]),
                            dom.td([
                                dom.label({class: 'checkbox'}, [
                                    dom.input({ type: 'checkbox',  model: flag, modelkey: 'value', checked: flag.value},[],{
                                        change: function(evt) {
                                            evt.target.parentElement.querySelector('span').textContent = evt.target.checked;
                                            handler.updateFeatureFlag(flag);
                                            handler.saveData().then(function() {
                                                q(`#flag-${flag.id}`).classList.toggle('dispnone');
                                                setTimeout(function() {
                                                    q(`#flag-${flag.id}`).classList.toggle('dispnone');
                                                }, 1000);
                                            })
                                        }
                                    }),
                                    dom.span([`${flag.value === true ? 'true': 'false'}`])                                    
                                ])
                            ]),
                            dom.td([
                                dom.div({id: `flag-${flag.id}`,class: 'dispnone'},[
                                    dom.i({class: 'fa fa-check', style: 'color: green; font-size: 1rem;'}),
                                    dom.span(['Flag updated.'])
                                ])
                            ])
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
            dom.div([
                dom.label({for: 'feature-name-edit'}, [
                    'Feature name: '
                ]),
                dom.input({id: 'feature-name-edit', name: 'feature-name-edit', type: 'text', value: feature.name, model: feature, modelkey: 'name'},[]),
                dom.label({for: 'feature-description-edit'}, [
                    'Feature description: '
                ]),
                dom.textarea({id: 'feature-description-edit', name: 'feature-description-edit', model: feature, modelkey: 'description'},[feature.description])
            ])
        ]);

    isNewFeature ? featureDisplay.classList.toggle('dispnone') : featureEdit.classList.toggle('dispnone');

    if(!isNewFeature) {
        updateNav('feature', feature.id);
    }
    lastFeature = feature;
    q('#feature-display').replaceWith(featureDisplay);
    q('#feature-edit').replaceWith(featureEdit);
}

function loadServicePage(service) {
    resetSearch();
    showHide('service-page');

    function saveService() {
        if(handler.checkScenarioForChanges()) {
            service.scenarios.push(handler.newScenario);
        }
        try {
            service.scenarios.forEach(function(scenario) {
                if(typeof scenario.data === 'string')
                    scenario.data = JSON.parse(scenario.data);
            });
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

    function deleteScenario(scenario) {
        service.scenarios.splice(service.scenarios.findIndex(sce => scenario.name === sce.name), 1);
        handler.updateService(service);
        saveHandler(loadServicePage, service);
    }

    function labelInput(label, inputValue, model, modelkey) {
        return dom.div([
            dom.label([label]),
            dom.input({model: model, modelkey: modelkey, value: inputValue, type: 'text'})
        ]);
    }

    function defaultCheckboxChange() {
        return { change: function(el) {
                if(el.target.checked); {
                    service.scenarios.forEach(function(s) {
                        if(s.isDefault && s.name !== scenario.name)
                            s.isDefault = false;
                    });

                    Array.from(qa('.defaultCheckbox')).forEach(function(scenario) {
                        if(el.target !== scenario) {
                            scenario.checked = false;
                        }
                    })
                }
            }
        }
    }

    function scenario(scenario, options) {
        return dom.div({role: 'tabpanel', class: 'scenario', id: options.isAdd ? 'add-scenario' : `${scenario.name}-scenario`},[
            dom.div({class: 'row'}, [
                dom.div({class: 'col-3'}, [
                    labelInput('Scenario Name: ', scenario.name, scenario, 'name')
                ]),
                dom.div({class: 'col-3'}, [
                    labelInput('Status: ', scenario.status, scenario, 'status')
                ]),
                dom.div({class: 'col-3', style: ''}, [
                    dom.label([
                        'Is Default Scenario'
                    ]),
                    dom.input({class: 'defaultCheckbox', model: scenario, modelkey: 'isDefault', type: 'checkbox', checked: scenario.isDefault},[], defaultCheckboxChange()),
                    dom.i({class: 'fas fa-trash', style: `float: right; font-size: 2rem; color: #a31616; cursor: pointer; ${options.isAdd ? 'display: none' : ''}`}, [], {
                        click: function() {deleteScenario(scenario)}
                    })
                ]),
            ]),
            dom.div({class: 'row'}, [
                dom.label([
                    'Service data: '
                ]),
                dom.textarea({ class: 'json', modelkey: 'data', model: scenario},[
                    JSON.stringify(scenario.data, null, 2)
                ])
            ])
        ], {
            after: function(el) {
                if(options.hidden) {
                    el.setAttribute('hidden', 'hidden');
                }
            }
        })
    }


    var servicePage = dom.div([
        dom.button({class: 'p-button', style: 'float:right'},['Save Service'], {
            click: saveService
        }),
        dom.div([
            labelInput('Service name: ', service.name, service, 'name'),
            labelInput('Service url: ', service.url, service, 'url'),
            dom.label({for: 'service-description-edit'},[
                'Service description: '
            ]),
            dom.textarea({id: 'service-description-edit', modelkey: 'description', model: service,},[
                service.description
            ]),
            dom.hr({class: 'p-separator'}),
            dom.div({class : 'p-segmented-control is-dense'}, [
                dom.div({class: 'p-segmented-control__list', role: 'tablist'}, [
                    service.scenarios.map(function(scenario, index) {
                        return dom.button({class: 'p-segmented-control__button', role: 'tab', 'aria-selected': (index === 0) ? true : false, 'aria-controls': `${scenario.name}-scenario`}, [
                            scenario.name
                        ])
                    }),
                    dom.button({class: 'p-segmented-control__button', role: 'tab', 'aria-selected': false, 'aria-controls': `add-scenario`}, [
                        'Add', dom.i({class: 'fa fa-plus'})
                    ])
                ])
            ]),
            service.scenarios.map(function(scenarioData, index) {
                if(index === 0)
                    return scenario(scenarioData, {})
                return scenario(scenarioData, {hidden: true})
            }),
            scenario(handler.addScenario(), {isAdd: true, hidden: true}),
            dom.button({class: 'p-button', style: 'float:right'},['Delete Service'], {
                click: deleteService
            })
        ])
    ]);

    q('#service-page').replaceChildren(servicePage);
    initTabs('[role="tablist"]');
}

function loadFeatureFlagsPage(newFlag) {
    var sortedFlags = handler.getData().featureFlags.sort(function(a, b) {
        return handler.getFeatureById(a.featureId).name.localeCompare(handler.getFeatureById(b.featureId).name);
    });

    if(newFlag) {
        var newFlagData = handler.addFeatureFlag();
        var sortedFlags = [newFlagData].concat(sortedFlags);
    }

    function saveFeatureFlags() {
        handler.updateFeatureFlags(sortedFlags);
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
                    dom.th(['Value'])
                ])
            ]),
            dom.tbody([
                sortedFlags.map(function(featureFlag){
                    return dom.tr({class: 'feature-tr'},[
                        dom.td(
                            dom.input({type: 'text', class: 'input feature-input', model: featureFlag, modelkey: 'name', value: featureFlag.name})
                        ),
                        dom.td(
                            dom.div({class: 'select'}, [
                                dom.select({model: featureFlag, modelkey: 'featureId', value: featureFlag.featureId, style: 'border: none'}, [
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
                                    dom.input({class: 'value-checkbox', type: 'checkbox',  model: featureFlag, modelkey: 'value', checked: featureFlag.value},[],{
                                        change: function(evt) {
                                            evt.target.parentElement.querySelector('span').textContent = evt.target.checked;
                                        }
                                    }),
                                    dom.span([`${featureFlag.value === true ? 'true': 'false'}`])                                    
                                ])
                            ])
                        ]),
                        dom.td([
                            dom.i({class: 'delete-icon fas fa-trash'},[], {
                                click: function() {
                                    handler.deleteFeatureFlag(featureFlag);
                                    saveHandler(loadFeatureFlagsPage, false);
                                }
                            })
                        ])
                    ]);
                })
            ])
        ])
    ]);

    q('#feature-flags-page').replaceChildren(featureFlagPage);
}

function loadServiceCapturePage() {
    var serviceCapture = dom.div([
        dom.h3(['Incoming services and responses']),
        dom.table({class: 'p-table--expanding'}, [
            dom.thead(
                dom.tr([
                    dom.th(['Url']),
                    dom.th(['']),
                    dom.th({class: 'u-align--right'}, ['Actions'])
                ])
            ),
            dom.tbody({id: 'service-capture-table'}, [
                dom.tr([
                    
                ])
            ])
        ])
    ]);
    q('#service-capture-page').replaceChildren(serviceCapture);
}

function loadPage() {
    loadSearch();
    loadFeaturePage(handler.getFeatureById(0));
    attachListeners();
}


// chrome.runtime.onMessage.addListener(
//     function(request, sender, sendResponse) {
//       for(let [url, data] of Object.entries(request)) {
//         fetchData.push({
//             url: url,
//             data: data
//         });
//       }
//     }
//   );
























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

    var keys = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
    };
  
    var direction = {
      ArrowLeft: -1,
      ArrowRight: 1,
    };
  
    /**
      Attaches a number of events that each trigger
      the reveal of the chosen tab content
      @param {Array} tabs an array of tabs within a container
    */
    function attachEvents(tabs) {
      tabs.forEach(function (tab, index) {
        tab.addEventListener('keyup', function (e) {
          if (e.code === keys.left || e.code === keys.right) {
            switchTabOnArrowPress(e, tabs);
          }
        });
  
        tab.addEventListener('click', function (e) {
          e.preventDefault();
          setActiveTab(tab, tabs);
        });
  
        tab.addEventListener('focus', function () {
          setActiveTab(tab, tabs);
        });
  
        tab.index = index;
      });
    }
  
    /**
      Determine which tab to show when an arrow key is pressed
      @param {KeyboardEvent} event
      @param {Array} tabs an array of tabs within a container
    */
    function switchTabOnArrowPress(event, tabs) {
      var pressed = event.code;
  
      if (direction[pressed]) {
        var target = event.target;
        if (target.index !== undefined) {
          if (tabs[target.index + direction[pressed]]) {
            tabs[target.index + direction[pressed]].focus();
          } else if (pressed === keys.left) {
            tabs[tabs.length - 1].focus();
          } else if (pressed === keys.right) {
            tabs[0].focus();
          }
        }
      }
    }
  
    /**
      Cycles through an array of tab elements and ensures 
      only the target tab and its content are selected
      @param {HTMLElement} tab the tab whose content will be shown
      @param {Array} tabs an array of tabs within a container
    */
    function setActiveTab(tab, tabs) {
      tabs.forEach(function (tabElement) {
        var tabContent = document.getElementById(tabElement.getAttribute('aria-controls'));
  
        if (tabElement === tab) {
          tabElement.setAttribute('aria-selected', true);
          tabContent.removeAttribute('hidden');
        } else {
          tabElement.setAttribute('aria-selected', false);
          tabContent.setAttribute('hidden', true);
        }
      });
    }
  
    /**
      Attaches events to tab links within a given parent element,
      and sets the active tab if the current hash matches the id
      of an element controlled by a tab link
      @param {String} selector class name of the element 
      containing the tabs we want to attach events to
    */
    function initTabs(selector) {
      var tabContainers = [].slice.call(document.querySelectorAll(selector));
  
      tabContainers.forEach(function (tabContainer) {
        var tabs = [].slice.call(tabContainer.querySelectorAll('[aria-controls]'));
        attachEvents(tabs);
      });
    }
  
