var Gpio = require("onoff").Gpio;
var config = require("./config");
var hostname = config.hostname;
var socket = require('socket.io-client')('https://'+hostname);
var APIKey = config.APIKey;
var PIRpin,PIRvalue,PIR;

var arr = [];

function sameArray(x)
{
    if(x.length !== arr.length)
    {
        console.log('Array Length Mismatch');
        return false;
    }
    for(var i=0; i<x.length;i++)
    {
        if(arr[i].GPIO != x[i].GPIO)
        {
            console.log('GPIO Mismatch'+arr[i].GPIO+" != "+x);
            return false;
        }
    }
    return true;
}

function myVal(x) {
    if(x==='ON')
    {
        return 0;
    }else if(x === 'OFF')
    {
        return 1;
    }else if(x ==='PIR' && PIRvalue)
    {
        return PIRvalue;
    }else
    {
        return 0;
    }
}

function Switches(lGPIO,lStatus,direction)
{
    this.GPIO = lGPIO;
    this.status = lStatus;
    this.link = new Gpio(this.GPIO,direction);
}


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
        arr[i] = new Switches(data.data.switches[i].GPIO,data.data.switches[i].status,'out');
        arr[i].link.writeSync(myVal(arr[i].status));
        console.log("Set "+arr[i].GPIO+" to "+arr[i].status);
    }
    socket.emit('Request',APIKey);
});

socket.on('Update',function(data) {
    if(data.PIR && PIRpin != data.PIR)
    {
        for(var i = 0; i<arr.length;i++)
        {
            if(arr[i].GPIO === data.pin)
            {
                arr[i].link.unexport();
                arr.splice(i,1);
            }
        }
        PIRpin = data.PIR;
        PIR = new Gpio(PIRpin,'in');
        PIR.watch(function(err,value)
        {
            if(err) throw err;
            PIRvalue = value;
        });    
    }
    
    if(sameArray(data.data.switches))
    {
        for(i=0;i<data.data.switches.length;i++)
        {
            arr[i].link.writeSync(myVal(arr[i].status));
            console.log("Set "+arr[i].GPIO+" to "+arr[i].status);
        }
        socket.emit('Request',APIKey);
    }
    else
    {
        if(PIR)
        {
            PIR.unwatchAll();
            PIR.unexport();
        }
        for(i=0 ; i<arr.length;i++)
        {
            arr[i].link.unwatch();
            console.log('BP1');
            console.log("Unwatched "+arr[i].GPIO);
        }
        socket.emit('Authenticate',APIKey);
    }
    return;
});


process.on('SIGINT',function()
{
    if(PIR)
    {
        PIR.unexport();
    }
    for(var i=0;i<arr.length;i++)
    {
        arr[i].link.unexport();
        console.log("Unexport "+i);
    }
    process.exit();
})