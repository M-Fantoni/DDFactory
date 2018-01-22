//for the datavault configuration
//It's an array of data references objects.
//each one as a name used to call it in the app,
//a type to determine how it must work
//and a config for the fine tuning of each type

dataVault.init([
    {
        name:"user",
        type: "jsonParametrableDataSource",
        config:{
            baseUrl:"https://dragodindefactory.firebaseio.com/users/param.json",
            layers:[
                'simpleOfflineLayer',
                'consoleLayer'
            ]
        }
    },
    {
        name:"dindes",
        type: "jsonDataSource",
        config:{
            url:"https://dragodindefactory.firebaseio.com/dindes.json?shallow=true",
            layers:[
                'simpleOfflineLayer',
                'keyToArrayLayer',
                'consoleLayer'
            ]
        }
    },
    {
        name:"dinde",
        type: "multiRefParam",
        config:{
            baseUrl:"https://dragodindefactory.firebaseio.com/dindes/param.json",
            layers:[
                'simpleOfflineLayer',
                'consoleLayer'
            ]
        }
    }
]);