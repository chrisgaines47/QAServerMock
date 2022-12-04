var appData = [];
var isPolling = true;
var optionsPort;

function fetchOverride(appData) {
    //override fetch object to return custom responses for specified URLs during fetch
    //we dont have access to the native fetch object in this scope (only a proxy) due to security reasons
    //and CSP extension policy forbids the injection of script elements but does allow for other elements
    //so I used an oldschool hack to inject an image with a bogus source url and activating
    //the onerror javascript handler when the url cant be found so we can inject our
    //override directly into the pages context
    var script = `
        function createResponse(data) {
            var newResponseBlob = new Blob(
                [JSON.stringify(data)],
                {type: 'application/json'}
            );
            var init = {"status": 200};
            myResponse = new Response(newResponseBlob, init);
            return myResponse;
        }

        function getOverrides() {
            var overrideEle = document.querySelector('#fetch-overrides');
            var appData = JSON.parse(overrideEle.getAttribute('overrides'));
            return appData;
        }

        const constantMock = window.fetch;
        window.fetch = function() {
            return new Promise((resolve, reject) => {
                var appData = getOverrides();
                var url = arguments[0] instanceof Request ? arguments[0].url : arguments[0];
                var toReplace = appData.find(service => url.indexOf(service.url) !== -1);
                if(toReplace) {
                    resolve(createResponse(toReplace.data));
                } else {
                    constantMock.apply(this, arguments).then(function(response) {
                        if(response.headers.get("content-type").indexOf('application/json') !== -1 && response.url.indexOf('svc') !== -1) {
                            var copyResponse = response.clone();
                            try {
                                copyResponse.json().then(res => {
                                    var resultsEl = document.querySelector('#fetch-results');
                                    var currentResults = resultsEl.getAttribute('fetchData');
                                    if(!currentResults) {
                                        currentResults = {};
                                    } else {
                                        currentResults = JSON.parse(currentResults);
                                    }
                                    if(currentResults) {
                                        currentResults[response.url] = res;
                                        resultsEl.setAttribute('fetchData', JSON.stringify(currentResults));
                                    }
                                });
                            } catch {}
                        }
                        resolve(response);
                    }).catch(reject);
                }
            });
        }
    `;

    if(!document.querySelector('#fetch-overrides')) {
        var el = document.createElement('img');
        el.id = "fetch-overrides";
        el.setAttribute('src','/errorOut');
        el.setAttribute('onerror', script);
        var ele = document.createElement('img');
        ele.id = "fetch-results";

        //we need not only to set overrides, but be able to update them
        //so we use the injected elements attributes as a working model
        el.setAttribute('overrides', JSON.stringify(appData));
        document.head.prepend(el);
        document.head.prepend(ele);
    }
}

function fetchListUpdate(appData) {
    document.querySelector('#fetch-overrides').setAttribute('overrides', JSON.stringify(appData));
}

chrome.tabs.onUpdated.addListener(function (tabId , info, tab) {
    if (info.status === 'loading' && !tab.url.startsWith('chrome')) {
        chrome.scripting.executeScript({
            target: {
                tabId: tabId,
            },
            func: fetchOverride,
            args: [appData]
        });
    }
});

function updateAllTabs(message) {
    appData = message;
    chrome.tabs.query({}, tabs => {
        for(let tab of tabs) {
            if(tab.url.startsWith('chrome')) continue;

            chrome.scripting.executeScript({
                target: {
                    tabId: tab.id,
                },
                func: fetchListUpdate,
                args: [appData]
            });
        }
    } );
}

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: 'userPage/page.html'
    });
});

function getFetchResults() {
    var el = document.querySelector('#fetch-results');
    var data = JSON.parse(el.getAttribute('fetchData'));
    el.setAttribute('fetchData', JSON.stringify({}));
    return data;
}

function handleFetchResults(results) {
    if(results[0].result) {
        optionsPort.postMessage(results[0].result);
    }
}

chrome.runtime.onConnect.addListener(function(port) {
    optionsPort = port;
    port.onMessage.addListener(updateAllTabs);
});

var pollingInterval = setInterval(function() {
    chrome.tabs.query({}, tabs => {
        for(let tab of tabs) {
            if(tab.url.startsWith('chrome')) continue;

            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id },
                    func: getFetchResults,
                },
                (results) => handleFetchResults(results)
            );
        }
    } );
}, 5000);