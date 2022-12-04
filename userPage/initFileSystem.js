var testServices = [{
    name: 'someUrl1',
    url: '/someUrl',
    featureId: 0,
    id: 0,
    description: 'description for service',
    scenarios: [{
        status: 200,
        name: 'Default',
        isDefault: true,
        data: {ok: 'go'}
    }]
}];

var testFeatures = [
    {name: 'Unassigned', id: 0, description: 'Place all uncategorized services here'}
];

var featureFlags = [{name: 'New Flag', value: false, key: 'new.flag.key', featureId: 0, id: 0}];
var testAppData = {features: testFeatures, services: testServices, featureFlags: featureFlags};

var handler = new DataHandler();
var locker;
var appData;
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