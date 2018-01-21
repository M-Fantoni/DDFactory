dataVault.init([
    {
        name:"user",
        type: "jsonParametrableDataSource",
        config:{
            baseUrl:"https://dragodindefactory.firebaseio.com/users/userId.json",
            layers:[
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
                'consoleLayer'
            ]
        }
    }
]);