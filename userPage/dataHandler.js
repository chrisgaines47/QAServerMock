function DataHandler() {
    var dh = this;

    const DEFAULTS = {
        scenario: (() => ({name: '', isDefault: false,  status: '', data: {}})),
        feature: (() => ({ name: 'New Feature', id: this.getNextId('features'), description: ''})),
        service: ((featureId)=> ({name: 'New Service', id: this.getNextId('services'), description: '', url: '', featureId: featureId, scenarios: [{status: 200,name: 'Default',isDefault: true,data: {ok: 'go'}}]})),
        flag: (() => ({name: 'New Flag',value: false,key: 'new.flag.key',featureId: 0, id: this.getNextId('featureFlags')}))
    }

    this.addScenario = function() {
        this.newScenario = DEFAULTS.scenario();
        return this.newScenario;
    }

    this.addFeature = function() {
        this.newFeature = DEFAULTS.feature();
        return this.newFeature;
    };

    this.checkScenarioForChanges = function() {
        if(dh.newScenario.name === '')
            return false;
        for(let key of  Object.keys(dh.newScenario)) {
            if(DEFAULTS.scenario()[key] !== dh.newScenario[key])
                return true;
        };
        return false;
    };

    this.syncFeatureFlags = function() {
        var featureFlagService = dh.appData.services.find(service => service.url.indexOf('featureFlags') !== -1);
        if(featureFlagService) {
            Object.keys(featureFlagService.data).map(function(key){
                var flag;
                var foundEntry = dh.appData.featureFlags.find(flag => flag.key === key);
                if(foundEntry && foundEntry.value !== featureFlagService.data[key]) {
                    foundEntry.value = featureFlagService.data[key];
                } else {
                    flag = {
                        name: key,
                        value: featureFlagService.data[key],
                        key: key,
                        featureId: 0
                    };
                    dh.appData.featureFlags.push(flag);
                }
            });
        }
    }

    this.loadAppData = function(appData, fallback) {

        try {
            var parsed = JSON.parse(appData);
            dh.appData = parsed;
            return true;
        } catch {
            dh.appData = fallback;
            return false;
        }
    }

    this.saveData = async function() {
        return new Promise((resolve, reject) => {
            function saveAppData() {
                locker.saveFile('/appData', JSON.stringify(dh.appData)).then(function() {
                    resolve();
                    dh.runtimeUpdate();
                }).catch(function(er) {
                    reject();
                });
            }
            locker.removeFile('/appData').then(saveAppData).catch(saveAppData);
        });
    }

    this.getData = function() {
        var clone = structuredClone(dh.appData);
        return clone;
    }

    this.getFeatures = function() {
        var features = this.getData().features;
        return features;
    }

    this.getServices = function() {
        var data = this.getData().services;
        return data;
    }

    this.getFeatureServices = function(feature) {
        var serviceData = this.getServices();
        var defaultFiltered = serviceData.filter(service => service.featureId === feature.id);
        return defaultFiltered;
    }
    
    this.getFeatureById = function(featureId) {
        return this.appData.features.find(feature => feature.id === featureId);
    }

    this.getNextId = function(category) {
        var nextId = dh.appData[category].length ? 1 + Math.max(...dh.appData[category].map(item => item.id)) : 0;
        return nextId;
    }

    this.deleteFeature = function(featureId) {
        var data = this.getData();
        var removeIndex = data.features.map(feature => feature.id).indexOf(featureId);
        ~removeIndex && data.features.splice(removeIndex, 1);
        data.services = data.services.filter(service => service.featureId !== featureId);
        data.featureFlags.forEach(flag => {
            if(flag.featureId === featureId) {
                flag.featureId = 0;
            }
        });
        this.appData = data;
    }

    this.updateFeature = function(replaceFeature) {
        this.deleteFeature(replaceFeature.id);
        this.appData.features.push(replaceFeature);
    }

    this.addService = function(featureId) {
        this.newService = DEFAULTS.service(featureId);
        return this.newService;
    }

    this.deleteService = function(serviceId) {
        var data = this.getData();
        var removeIndex = data.services.map(service => service.id).indexOf(serviceId);
        ~removeIndex && data.services.splice(removeIndex, 1);
        this.appData = data;
    }

    this.deleteFeatureFlag = function(featureFlag) {
        var data = this.getData();
        var removeIndex = data.featureFlags.map(flag => flag.id).indexOf(featureFlag.id);
        ~removeIndex && data.featureFlags.splice(removeIndex, 1);
        this.appData = data;
    }

    this.updateService = function(replaceService) {
        this.deleteService(replaceService.id);
        this.appData.services.push(replaceService);
    }

    this.addFeatureFlag = function() {
        this.newFlag = DEFAULTS.flag();
        return this.newFlag;
    }

    this.updateFeatureFlags = function(flags) {
        dh.appData.featureFlags = flags;
    }

    this.updateFeatureFlag = function(flag) {
        var addedFlag = dh.appData.featureFlags.find(addedFlag => addedFlag.key === flag.key);
        if(!addedFlag)
            return false;
        for(let key of Object.keys(flag)) {
            addedFlag[key] = flag[key];
        }
        return true;
    }

    this.getFlagsByFeature = function(feature) {
        var data = this.getData();
        return data.featureFlags.filter(flag =>  flag.featureId == feature.id);
    }

    this.runtimeUpdate = function() {
        // chrome.runtime.sendMessage(this.appData.services);
    };
}