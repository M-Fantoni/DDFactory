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

    newData(data) {
        let stringifiedData = JSON.stringify(this.data);
        
        if (JSON.stringify(data) !== this.stringifiedData) {
            this.stringifiedData = stringifiedData;
            for(let layer of this.config.layers){
                data = this.layers[layer].preNewData(data, this.name);
            }
            for (let callBack of this.callBacks) {
                callBack(data);
            }
            this.data = data;
        }
    }

    save(data){
        for(let layer of this.config.layers){
            data = this.layers[layer].preSave(data, this.name);
        }
        this.newData(data);
        this.setData(data);
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
                    })
                }
            })
            .catch(err => {
                console.error("Error fetching data from url : ", this.config.url, err);
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

    setParams(args) {
        let url = this.config.baseUrl;
        for (let arg in args) {
            url = url.replace(arg, args[arg])
        }
        this.config.url = url;
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
        if (!this.refs[hash]){
            let url = this.config.baseUrl
            for (let arg of args) {
                url = url.replace("param", arg)
            }
            let config = Object.assign({}, this.config)
            config.url = url;
            this.refs[hash] = new MultiRefParam.parametredJsonDataSource(this.name, config, this.layers)
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
    preSave(data){ return data }
    preNewData(data ){ return data }
}

class ConsoleLayer {

    static get type() {
        return 'consoleLayer'
    }

    preSave(data, sourceName){
        console.log('Source '+sourceName+' saving data : ', data);
        return data;
    }
    preNewData(data, sourceName){
        console.log('Source '+sourceName+' getting new data : ', data);
        return data;
    }
}

dataVault.registerLayer(ConsoleLayer, ConsoleLayer.type)

class KeyToArrayLayer {

    static get type() {
        return 'keyToArrayLayer'
    }

    preNewData(data, sourceName){
        console.log("tututut pouet")
        return Object.keys(data);
    }
}

dataVault.registerLayer(KeyToArrayLayer, KeyToArrayLayer.type)