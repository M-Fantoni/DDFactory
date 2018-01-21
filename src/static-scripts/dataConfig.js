dataVault.init([
    {
        name:"user",
        type: "jsonParametrableDataSource",
        config:{
            baseUrl:"https://dragodindefactory.firebaseio.com/users/userId.json"
        },
        layers:[

        ]
    },
    {
        name:"dindes",
        type: "jsonDataSource",
        config:{
            url:"https://dragodindefactory.firebaseio.com/dindes.json?shallow=true"
        },
        layers:[

        ]
    },
    {
        name:"dinde",
        type: "multiRefParam",
        config:{
            baseUrl:"https://dragodindefactory.firebaseio.com/dindes/param.json"
        },
        layers:[

        ]
    }
]);