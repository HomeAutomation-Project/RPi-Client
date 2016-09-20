var Gpio = require("onoff");
var config = require("./config");
var hostname = config.hostname;
var socket = require('socket.io-client')('https://'+hostname);
var APIKey = config.APIKey;
var PIRpin,PIRvalue,PIR;

var arr = [];

socket.on('connect',function(){
    console.log('Conected');
});

socket.on('Request',function(data){
    if(data.message ==="Authenticate")
    {
        socket.emit("Authenticate",APIKey);
    }
});

socket.on('Success',function(data) {
    //console.log(data.data);
    if(data.PIR)
    {
        PIRpin = data.PIR;
        PIR = new Gpio(PIRpin,'in');
        PIR.watch(function(err,value)
        {
            if(err) throw err;
            PIRvalue = value;
        });
    }
    for(var i=0;i<data.data.switches.length;i++)
    {
        arr[i] = new Gpio(data.data.switches[i].GPIO,'out');
    }
    console.log(data.switches);
})

process.on('SIGINT',function()
{
    for(var i=0;i<arr.length;i++)
    {
        arr[i].unexport();
    }
})