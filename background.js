var appData = [];

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
                constantMock.apply(this, arguments)
                    .then(response => {
                        var toReplace = appData.find(service => !!response.url.indexOf(service.url));
                        if(toReplace && response.type !== 'cors') {
                            var newResponse = createResponse(toReplace.data);
                            resolve(newResponse);
                        } else {
                            resolve(response);
                        }
                    }).catch(function() {
                        var toReplace = appData.find(service => !!arguments[0].indexOf(service.url));
                        if(toReplace) {
                            var newResponse = createResponse(toReplace.data);
                            resolve(newResponse);
                        } else {
                            reject();
                        }
                    });
            });
        }
    `;

    var el = document.createElement('img');
    el.id = "fetch-overrides";
    el.setAttribute('src','/errorOut');
    el.setAttribute('onerror', script);

    //we need not only to set overrides, but be able to update them
    //so we use the injected elements attributes as a working model
    el.setAttribute('overrides', JSON.stringify(appData));
    document.head.prepend(el);
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

chrome.runtime.onMessage.addListener(updateAllTabs);

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: 'userPage/page.html'
    });
});