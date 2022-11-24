var testServices = [
    {name: 'someUrl1', url: '/someUrl', data: {ok: 'go'}, featureId: 0, id: 0, description: 'description for service'}
];

var testFeatures = [
    {name: 'Unassigned', id: 0, description: 'Place all uncategorized services here'}
];

var featureFlags = [];
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
        handler.loadAppData(testAppData);
        handler.saveData();
    }).then(function() {
        loadPage();
        handler.runtimeUpdate();
    })
})();