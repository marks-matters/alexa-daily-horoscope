// testing horoscope api

// var starSign = this.event.request.intent.slots.starSign.value;
var starSign = 'taurus';

getHoroscope( (reading) => {
    console.log("Your horoscope is: " + reading);
});

// getHoroscope(starSign, (reading) ) => {
//     console.log(reading);
// });

// async
function getHoroscope(callback) {
    var http = require('http');
    var reading = '';
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
            reading = JSON.parse(returnData).horoscope.horoscope;
            callback(reading);
        });
    });
    req.end();
}
