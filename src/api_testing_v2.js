// # v2.1
function downloadHoroscope(downloadStarSign, callback) {
    console.log("Download script STARTED");
    var http = require('https');
    var hsOptions = {
        method: "GET",
        hostname: "new.theastrologer.com",
        port: null,
        path: "/" + downloadStarSign + "/"
    };
    var req = http.request(hsOptions, (res) => {
        res.setEncoding('utf8');
        var body = "";
        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            var indexTodayDiv = body.indexOf('<div class="row daily-meta">', body.indexOf('<div class="row daily-meta">') + 1);
            var relevantText = body.substring(indexTodayDiv - 2000, indexTodayDiv);
            var indexPStart = relevantText.indexOf('<p>');
            var indexPEnd = relevantText.indexOf('</p>', indexPStart);
            var reading = relevantText.substring(indexPStart + 3, indexPEnd);
            console.log("FIRST PASS: " + reading);

            var hrefOccrences = (reading.match(new RegExp("<a href","g")) || []).length;

            console.log("hrefOccrences: " + hrefOccrences);
            console.log("indexPStart: " + indexPStart);
            if ( hrefOccrences > 0 ) {
                for ( var i = 0; i < hrefOccrences; i++ ) {
                    var indexHStart = reading.indexOf('<a href');
                    var indexHEnd = reading.indexOf('</a>', indexHStart);
                    console.log("indexHStart: " + indexHStart);
                    console.log("indexHEnd: " + indexHEnd);
                    reading = reading.substring(0, indexHStart) + reading.substring(indexHEnd);
                    reading = reading.replace('</a></div>" >', '').replace('</a>', '');
                }
            }
            reading = reading.replace('--', '');
            //TODO improve error handling for unsuccessful download
            if ( reading.length === 0 ) {
                console.log("DOWNLOAD FAILED FOR: " + downloadStarSign);
                callback(null,null);
            }
            else {
                console.log("Downloaded: " + downloadStarSign);
                callback(downloadStarSign, reading);
            }
        });
    });
    req.end();
    console.log("Download script FINISHED");
}

downloadHoroscope("scorpio", (downloaded, reading) => console.log("FINAL PASS: " + reading) );

// // # v2.0
// function getHoroscope(callback) {
//     var http = require('https');
//     var hsOptions = {
//         method: "GET",
//         hostname: "new.theastrologer.com",
//         port: null,
//         path: "/scorpio/"
//     };
//     var req = http.request(hsOptions, (res) => {
//         //res.setEncoding('utf8');
//         var body = "";
//
//         res.on('data', (chunk) => {
//             body += chunk;
//         });
//         res.on('end', () => {
//             var indexTodayDiv = body.indexOf('<div class="row daily-meta">', body.indexOf('<div class="row daily-meta">') + 1);
//             var relevantText = body.substring(indexTodayDiv - 800, indexTodayDiv);
//             var indexPStart = relevantText.indexOf('<p>');
//             var indexPEnd = relevantText.indexOf('</p>');
//             var reading = relevantText.substring(indexPStart + 3, indexPEnd);
//             callback(reading);
//         });
//     });
//     req.end();
// }
