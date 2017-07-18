function getHoroscope(callback) {
    var http = require('https');
    var hsOptions = {
        method: "GET",
        hostname: "new.theastrologer.com",
        port: null,
        path: "/scorpio/"
    };
    var req = http.request(hsOptions, (res) => {
        //res.setEncoding('utf8');
        var body = "";

        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            var indexTodayDiv = body.indexOf('<div class="row daily-meta">', body.indexOf('<div class="row daily-meta">') + 1);
            var relevantText = body.substring(indexTodayDiv - 800, indexTodayDiv);
            var indexPStart = relevantText.indexOf('<p>');
            var indexPEnd = relevantText.indexOf('</p>');
            var reading = relevantText.substring(indexPStart + 3, indexPEnd);
            callback(reading);
        });
    });
    req.end();
}

getHoroscope( (reading) => console.log(reading) );
