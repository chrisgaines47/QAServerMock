function DataHandler() {
    var dh = this;
    var logs = [];
    var featureAdd;
    var serviceAdd;
    var featureFlagAdd;

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
                    chrome.runtime.sendMessage(dh.appData.services);
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
        if(featureAdd) {
            features.push(featureAdd);
        }
        return features;
    }

    this.getServices = function() {
        var data = this.getData().services;
        if(serviceAdd) {
            data.push(serviceAdd);
        }
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

    this.addFeature = function() {
        var nextId = this.getNextId('features');
        var feature = {
            name: 'New Feature',
            id: nextId,
            description: ''
        };
        featureAdd = feature;
        return featureAdd;
    }

    this.deleteFeature = function(featureId) {
        var data = this.getData();
        var removeIndex = data.features.map(feature => feature.id).indexOf(featureId);
        ~removeIndex && data.features.splice(removeIndex, 1);
        data.services = data.services.filter(service => service.featureId !== featureId);
        this.appData = data;
    }

    this.updateFeature = function(replaceFeature) {
        this.deleteFeature(replaceFeature.id);
        this.appData.features.push(replaceFeature);
    }

    this.addService = function(featureId) {
        var nextId = this.getNextId('services');
        var service = {
            name: 'New Service',
            id: nextId,
            description: '',
            data: {
            },
            url: '',
            featureId: featureId
        };
        serviceAdd = service;
        return serviceAdd;
    }

    this.deleteService = function(serviceId) {
        var data = this.getData();
        var removeIndex = data.services.map(service => service.id).indexOf(serviceId);
        ~removeIndex && data.services.splice(removeIndex, 1);
        this.appData = data;
    }

    this.updateService = function(replaceService) {
        this.deleteService(replaceService.id);
        this.appData.services.push(replaceService);
    }

    this.addFeatureFlag = function() {
        var newFlagData = {
            name: 'New Flag',
            value: false,
            key: 'new.flag.key',
            featureId: 0
        };
        featureFlagAdd = newFlagData;
        return featureFlagAdd;
    }

    this.updateFeatureFlags = function(flags) {
        dh.appData.featureFlags = flags;
    }

    this.getFlagsByFeature = function(feature) {
        var data = this.getData();
        return data.featureFlags.filter(flag =>  flag.featureId == feature.id);
    }

    this.getUnsaved = function(category) {
        switch (category) {
            case 'feature':
                return featureAdd;
            case 'service':
                return serviceAdd;
            default:
                return featureFlagAdd; 
        }
    }

    this.resetUnsaved = function() {
        featureAdd = false;
        serviceAdd = false;
        featureFlagAdd = false;
    }

    this.runtimeUpdate = function() {
        chrome.runtime.sendMessage(this.appData.services);
    };
}