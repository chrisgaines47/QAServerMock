var testServices = [{
    name: 'someUrl1',
    url: '/someUrl',
    featureId: 0,
    id: 0,
    enabled: true,
    description: 'description for service',
    scenarios: [{
        status: '200',
        name: 'Default',
        data: {ok: 'go'}
    }]
}];

var testFeatures = [
    {name: 'Unassigned', id: 0, description: 'Place all uncategorized services here', enabledScenarios: []}
];

var featureFlags = [{name: 'New Flag', value: false, key: 'new.flag.key', featureId: 0, id: 0}];
var testAppData = {features: testFeatures, services: testServices, featureFlags: featureFlags};

var handler = new DataHandler();
var locker;
var appData;
var port = chrome.runtime.connect({name: "options"});
port.onMessage.addListener(function(msg) {
    for(let [url, data] of Object.entries(msg)) {
        var nextId = fetchData.length ? 1 + Math.max(...fetchData.map(item => item.id)) : 0;
        fetchData.push({
            url: url,
            data: data,
            id: nextId
        });
    }
    updateServiceCaptureList();
});


(async function() {
    locker = await new FileLocker();

    locker.loadFile('/appData').then(function(savedAppData) {
        if(!handler.loadAppData(savedAppData, testAppData)) {
            handler.saveData();
        }
    }).catch(function() {
        handler.loadAppData({}, testAppData);
        handler.saveData();
    }).then(function() {
        loadPage();
        handler.runtimeUpdate();
    })
})();