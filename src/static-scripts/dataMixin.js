class DataVault {
    constructor() {
        this.sourceTypes = {}
        this.layers = {}
    }

    registerSourceType(sourceType, name) {
        this.sourceTypes[name] = sourceType;
    }

    registerLayer(layer, name) {
        this.layers[name] = new layer();
    }

    init(config) {
        console.log('init called')
        let refs = {}
        for (let ref of config) {
            refs[ref.name] = new this.sourceTypes[ref.type](ref.name, ref.config, this.layers);
        }
        this.refs = refs;
    }

    ref(ref) {
        console.log("ref called : ", ref)
        return this.refs[ref]
    }
}

dataVault = new DataVault();


class DataSource {

    constructor(name, config, layers) {
        this.name = name;
        this.config = config;
        this.layers = layers;
        this.stringifiedData = "datavault-noData"
        this.callBacks = []
    }

    onValue(callBack, update = false) {
        this.callBacks.push(callBack)
        if (this.data) {
            callBack(this.data)
        }
        if (update || !this.data)
            this.getData();
    }

    async passLayer(etape, data) {
        for (let layer of this.config.layers) {
            try{
                data = await new Promise((res, rej) => { this.layers[layer][etape](res, data, this.name, this.params) });
            }catch(err){
                console.error("Layer "+layer+" failed step "+etape+" for datas ", data, err)
            }
        }
        return data
    }

    async newData(data) {
        let stringifiedData = JSON.stringify(data);

        if (stringifiedData !== this.stringifiedData) {
            this.stringifiedData = stringifiedData;
            data = await this.passLayer('postNewData', data)
            for (let callBack of this.callBacks) {
                callBack(data);
            }
            this.data = data;
        }
    }

    async save(data) {
        data = await this.passLayer('preSave', data)
        this.newData(data);
        return this.setData(data);
    }
}

class JsonDataSource extends DataSource {

    static get type() {
        return 'jsonDataSource'
    }

    getData() {
        fetch(this.config.url,
            {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    'Accept': 'application/json, text/plain, */*'
                }
            })
            .then(response => {
                if (response.status === 200) {
                    response.json().then(data => {
                        this.newData(data);
                    })
                } else {
                    response.text().then(err => {
                        console.error("Error fetching data from url : ", this.config.url, err);
                        this.newData(undefined);
                    })
                }
            })
            .catch(err => {
                console.error("Error fetching data from url : ", this.config.url, err);
                this.newData(undefined);
            })
    }

    setData(data) {
        fetch(this.config.url,
            {
                method: "PUT",
                credentials: "same-origin",
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (response.status === 200) {
                    response.json().then(retour => {
                        this.newData(retour);
                    })
                } else {
                    response.text().then(err => {
                        console.error("Error posting data to url : ", this.config.url, err);
                    })
                }

            })
            .catch(err => {
                console.error("Error posting data to url : ", this.config.url, err);
            })
    }
}
dataVault.registerSourceType(JsonDataSource, JsonDataSource.type)

class JsonParametrableDataSource extends JsonDataSource {

    static get type() {
        return 'jsonParametrableDataSource'
    }

    constructor(name, config, layers) {
        super(name, config, layers);
        this.locked = true;
    }

    setParams(...args) {
        let url = this.config.baseUrl;
        for (let arg of args) {
            url = url.replace("param", arg)
        }
        this.config.url = url;
        this.params = args.join(':')
        this.locked = false;
        this.getData();
    }
}
dataVault.registerSourceType(JsonParametrableDataSource, JsonParametrableDataSource.type)

class MultiRefParam {

    static get type() {
        return 'multiRefParam'
    }

    constructor(name, config, layers) {
        this.name = name;
        this.config = config;
        this.layers = layers
        this.refs = {};
    }

    getRefForParams(...args) {
        let hash = args.join(':')
        if (!this.refs[hash]) {
            let url = this.config.baseUrl
            for (let arg of args) {
                url = url.replace("param", arg)
            }
            let config = Object.assign({}, this.config)
            config.url = url;
            this.refs[hash] = new MultiRefParam.parametredJsonDataSource(this.name + "-" + hash, config, this.layers)
        }
        return this.refs[hash];
    }

    ref(ref) {
        return this.refs[ref]
    }

    static get parametredJsonDataSource() {
        return class ParametredJsonDataSource extends JsonDataSource {

        }
    }
}

dataVault.registerSourceType(MultiRefParam, MultiRefParam.type)

class BaseLayer {
    preSave(next, data) { next(data) }
    postNewData(next, data) { next(data) }
}

class ConsoleLayer {

    static get type() {
        return 'consoleLayer'
    }

    preSave(next, data, sourceName, params) {
        console.log('Source ' + sourceName + (params ? '-' + params : '') + ' saving data : ', data);
        next(data)
    }
    postNewData(next, data, sourceName, params) {
        console.log('Source ' + sourceName + (params ? '-' + params : '') + ' getting new data : ', data);
        next(data)
    }
}

dataVault.registerLayer(ConsoleLayer, ConsoleLayer.type)

class KeyToArrayLayer {

    static get type() {
        return 'keyToArrayLayer'
    }

    postNewData(next, data, sourceName) {
        next(Object.keys(data));
    }
}

dataVault.registerLayer(KeyToArrayLayer, KeyToArrayLayer.type)

class SimpleOfflineLayer {

    static get dbConfig() {
        return {
            DB_NAME: 'dataVault-offline',
            DB_VERSION: 1, // Use a long long for this value (don't use a float)
            DB_STORE_NAME: 'mirrored-data'
        }
    }

    static get type() {
        return 'simpleOfflineLayer'
    }

    constructor() {
        var request = indexedDB.open(SimpleOfflineLayer.dbConfig.DB_NAME, SimpleOfflineLayer.dbConfig.DB_VERSION);
        request.onerror = event => {
            console.error("impossible to open the database : " + event.target.errorCode)
        };
        request.onupgradeneeded = event => {
            // Save the IDBDatabase interface 
            var db = event.target.result;

            // Create an objectStore for this database
            var objectStore = db.createObjectStore(SimpleOfflineLayer.dbConfig.DB_STORE_NAME);
            console.log("on upgrade called of offline db")
        };
        request.onsuccess = event => {
            this.db = event.target.result;
            console.log("connection open to offline db")
            this.db.onerror = event => {
                // Generic error handler for all errors targeted at this database's
                // requests!
                console.error("Database error: " + event.target.errorCode);
            };
        };

        window.addEventListener('online', this.connectionStatus);
        window.addEventListener('offline', this.connectionStatus);
    }

    connectionStatus() {
        this.online = window.navigator.onLine;
    }

    preSave(next, data, sourceName, params) {
        //TODO add a real pending solution
        if(!this.db)
            next(data);

        let key = sourceName + (params ? '-' + params : '')
        let request = this.db.transaction(SimpleOfflineLayer.dbConfig.DB_STORE_NAME, "readwrite").objectStore(SimpleOfflineLayer.dbConfig.DB_STORE_NAME).put(data, key);
        request.onsuccess = event => {
            console.log("Data " + key + " saved data : ", data)
        };
        request.onerror = function (event) {
            console.log("Data " + key + " failed saving data : ", data)
        };
        next(data);
    }

    postNewData(next, data, sourceName, params) {
        //TODO add a real pending solution
        if(!this.db)
            next(data);

        
        let key = sourceName + (params ? '-' + params : '')
        if (data === undefined && !this.online) {
            let request = this.db.transaction(SimpleOfflineLayer.dbConfig.DB_STORE_NAME).objectStore(SimpleOfflineLayer.dbConfig.DB_STORE_NAME).get(key);
            request.onsuccess = event => {
                next(event.target.result);
            };
            request.onerror = event => {
                next(data);
            };
        } else {
            let request = this.db.transaction(SimpleOfflineLayer.dbConfig.DB_STORE_NAME, "readwrite").objectStore(SimpleOfflineLayer.dbConfig.DB_STORE_NAME).put(data, key);
            request.onsuccess = event => {
                console.log("Data " + key + " saved data : ", data)
            };
            request.onerror = event => {
                console.log("Data " + key + " failed saving data : ", data)
            };
            next(data);
        }
    }
}

dataVault.registerLayer(SimpleOfflineLayer, SimpleOfflineLayer.type)