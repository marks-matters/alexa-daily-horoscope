// testing horoscope api

// var starSign = this.event.request.intent.slots.starSign.value;
var starSign = 'taurus';

getHoroscope(starSign, (hsDesc) ) => {
    console.log(hsDesc);
});

// async
function getHoroscope(starSign) {
    var http = require('http');
    var hsDesc = '';
    var hsOptions = {
        host: 'widgets.fabulously40.com',
        path: `/horoscope.json?sign=${starSign}`,
        method: 'GET'
    };
    var req = http.request(hsOptions, (res) => {
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', (chunk) => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {
            hsDesc = JSON.parse(returnData).horoscope.horoscope;
        });
    });
    req.end();
    return hsDesc;
}


/*
var starSign = 'taurus'

var hsOptions = {
    host: 'widgets.fabulously40.com',
    path: `/horoscope.json?sign=${starSign}`,
    method: 'GET'
};

getHoroscope( ( hsDesc ) => {
    console.log(hsDesc);
});

function getHoroscope(callback) {
    var http = require('http');

    var req = http.request(hsOptions, (res) => {
        res.setEncoding('utf8');
        var returnData = "";

        res.on('data', (chunk) => {
            returnData = returnData + chunk;
        });

        res.on('end', () => {
            var hsDesc = JSON.parse(returnData).horoscope.horoscope;
            callback(hsDesc);
        });
    });
    req.end();
}
*/
