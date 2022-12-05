function DataHandler() {
    var dh = this;

    const DEFAULTS = {
        scenario: (() => ({name: '',  status: '200', data: {}})),
        feature: (() => ({ name: 'New Feature', id: this.getNextId('features'), description: '', enabledScenarios:[]})),
        service: ((featureId)=> ({name: 'New Service', id: this.getNextId('services'), enabled: true, description: '', url: '', featureId: featureId, scenarios: [{status: '200',name: 'Default',data: {ok: 'go'}}]})),
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
        var features = dh.getFeatures();
        var targetFeature = features.find(feature => feature.id === replaceFeature.id);
        if(targetFeature) {
            for(let key in replaceFeature) {
                targetFeature[key] = replaceFeature[key]
            }
            this.appData.features = features;
        } else {
            this.appData.features.push(replaceFeature);
        }
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

    this.getScenariosByFeature = function(feature) {
        return dh.getFeatureServices(feature).reduce((acc, cur) => {
            for(let scenario of cur.scenarios) {
                if(scenario.name == 'Default') continue;
                if(!(scenario.name in acc)) {
                    acc[scenario.name] = [cur.name];
                } else if(!acc[scenario.name].includes(cur.name)){
                    acc[scenario.name].push(cur.name);
                }
            }
            return acc;
        }, {});
    }

    this.getActiveScenario = function(service) {
        var feature = this.getFeatureById(service.featureId);
        var activeScenario = service.scenarios.find(function(scenario) {
            return feature.enabledScenarios.includes(scenario.name);
        });
        var defaultScenario = service.scenarios.find(scenario => scenario.name === 'Default');
        if(activeScenario) {
            return activeScenario;
        }
        return defaultScenario;
    }

    this.getServicesWithScenario = function(feature, scenario) {
        var services = this.getFeatureServices(feature).filter(function(service) {
            for(let sce of service.scenarios) {
                if(sce.name === scenario)
                    return true;
            }
        }).map(service => service.id);
        return services;
    }

    this.checkUrlForCollision = function(url) {
        var services = this.getServices();
        for(let service of services) {
            if(service.url.indexOf(url) !== -1)
                return true;
            if(url.indexOf(service.url) !== -1)
                return true;
        }
        return false;
    }

    this.mitigateScenarioCollision = function(feature, enabledScenario) {
        var toDisable = [];
        var checkServices = this.getServicesWithScenario(feature, enabledScenario);
        for(let scenario of feature.enabledScenarios) {
            if(scenario !== enabledScenario) {
                var enabledScenarioServices = dh.getServicesWithScenario(feature, scenario);
                if(checkServices.some(item => enabledScenarioServices.includes(item))) {
                    toDisable.push(scenario);
                }
            }
        }
        for(let disable of toDisable) {
            feature.enabledScenarios = feature.enabledScenarios.filter(scen => scen !== disable);
        }
        dh.updateFeature(feature);
        if(toDisable.length) {
            return toDisable;
        }
        return false;
    }

    this.generateFeatureFlagService = function(FFservice) {
        var flags = dh.getData().featureFlags;
        if(FFservice && FFservice.data.featureFlags) {
            flags.forEach(function(flag) {
                FFservice.data.featureFlags[flag.key] = flag.value;
            });
        } else {
            var flagDataObj = {};
            flags.forEach(function(flag) {
                flagDataObj[flag.key] = flag.value;
            });
            FFservice = {
                url: 'featureFlags',
                status: 200,
                data: {
                    "featureFlags": flagDataObj
                }
            }
        }
        return FFservice;
    }

    this.runtimeUpdate = function() {
        var enabledServices = this.getServices().filter(service => service.enabled);
        var featureFlagsProcessed = false;
        var processedServices = enabledServices.map(function(service) {
            var activeScenario = dh.getActiveScenario(service);
            var status = parseInt(activeScenario.status);
            var compiledService = {
                url: service.url,
                status: status ? status : 200,
                data: activeScenario.data
            }
            if(service.url.indexOf('featureFlags') !== -1) {
                compiledService = dh.generateFeatureFlagService(compiledService);
                featureFlagsProcessed = true;
            }
            return compiledService;
        });

        if(!featureFlagsProcessed) {
            var featureFlagService = dh.generateFeatureFlagService();
            processedServices.push(featureFlagService);
        }

        port.postMessage(processedServices);
    };

    this.dataExport = function() {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(dh.appData, null, 2)], {
          type: "text/plain"
        }));
        a.setAttribute("download", "QAServerMockAppData.json");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}