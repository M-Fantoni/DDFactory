class DataVault {
    constructor() {
        this.sourceType = {}
    }

    registerSourceType(sourceType, name) {
        this.sourceType[name] = sourceType;
    }

    init(config) {
        console.log('init called')
        let refs = {}
        for (let ref of config) {
            refs[ref.name] = new this.sourceType[ref.type](ref.config);
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

    constructor(config) {
        this.config = config;
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
        if (JSON.stringify(data) !== JSON.stringify(this.data)) {
            for (let callBack of this.callBacks) {
                callBack(data);
            }
            this.data = data;
        }
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

    constructor(config) {
        super(config);
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

    constructor(config) {
        this.config = config;
        this.refs = {};
    }

    registerSourceType(sourceType, name) {
        this.sourceType[name] = sourceType;
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
            this.refs[hash] = new MultiRefParam.parametredJsonDataSource(config)
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