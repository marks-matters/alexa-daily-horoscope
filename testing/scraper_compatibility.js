var AWS = require('/usr/local/lib/node_modules/aws-sdk');

AWS.config.update({
  region: "us-east-1"
});

const allStarSigns = [
    'pisces',
    'taurus',
    'aries',
    'gemini',
    'cancer',
    'leo',
    'virgo',
    'libra',
    'scorpio',
    'sagittarius',
    'capricorn',
    'aquarius',
    'pisces'
];

var successStatus = false;
var missingListBase = allStarSigns;
var missingListPartner = allStarSigns;

function scrapeHoroscope (starSignBase, starSignPartner, callback) {
    // Capitalise first character for string matching
    starSignBase = starSignBase[0].toUpperCase() + starSignBase.substring(1);
    starSignPartner = starSignPartner[0].toUpperCase() + starSignPartner.substring(1);

    var http = require('https');
    var hsOptions = {
        method: "GET",
        hostname: "new.theastrologer.com",
        port: null,
        path: "/" + starSignBase + "-compatibility/"
    };
    var req = http.request(hsOptions, (res) => {
        res.setEncoding('utf8');
        var body = "";
        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            // console.log(body);
            var indexLoveMatchStartDiv = body.indexOf('<h3>' + starSignBase + ' and ' + starSignPartner + ' Love Compatibility</h3>');
            var indexLoveMatchEndDiv = body.indexOf('<h3>', indexLoveMatchStartDiv + 1);
            // console.log(indexLoveMatchStartDiv);
            // console.log(indexLoveMatchEndDiv);
            var relevantText = body.substring(indexLoveMatchStartDiv, indexLoveMatchEndDiv);
            // console.log(relevantText);
            var indexPStart = relevantText.indexOf('<p>');
            var indexPEnd = relevantText.indexOf('</p>', indexPStart);
            var compatibility = relevantText.substring(indexPStart + 3, indexPEnd);
            // console.log("FIRST PASS: " + compatibility);
            var hrefOccrences = (compatibility.match(new RegExp("<a href","g")) || []).length;
            // console.log("hrefOccrences: " + hrefOccrences);
            // console.log("indexPStart: " + indexPStart);
            if ( hrefOccrences > 0 ) {
                for ( var i = 0; i < hrefOccrences; i++ ) {
                    var indexHStart = compatibility.indexOf('<a href');
                    var indexHEnd = compatibility.indexOf('</a>', indexHStart);
                    // console.log("indexHStart: " + indexHStart);
                    // console.log("indexHEnd: " + indexHEnd);
                    compatibility = compatibility.substring(0, indexHStart) + compatibility.substring(indexHEnd);
                    compatibility = compatibility.replace('</a></div>" >', '').replace('</a>', '');
                }
            }
            compatibility = compatibility.replace('--', '');
            // //TODO improve error handling for unsuccessful download
            if ( compatibility.length === 0 ) {
                console.log("DOWNLOAD FAILED FOR: " + starSignBase + " and " + starSignPartner);
                callback(null,null,null);
            }
            else {
                console.log("Downloaded: " + starSignBase + " and " + starSignPartner);
                callback(starSignBase, starSignPartner, compatibility);
            }
        });
    });
    req.end();
}

function scrape_looper(allStarSigns, callback) {
    console.log("scrape_looper");
    missingListBase = allStarSigns;
    missingListPartner = allStarSigns;
    (function getNextBaseCompatibility() {
        missingListPartner = allStarSigns;
        var getStarSignBase = missingListBase.splice(0, 1)[0];
        console.log("getNextBaseCompatibility: " + getStarSignBase);
        (function getNextPartnerCompatibility() {
            var getStarSignPartner = missingListPartner.splice(0, 1)[0];
            console.log("getNextPartnerCompatibility: " + getStarSignPartner);
            try {
                updateCompatibility(getStarSignBase, getStarSignPartner, (updateStatus) => {
                    if (missingListBase.length == 0) {
                        successStatus = true;
                        callback(successStatus);
                    } else {
                        getNextPartnerCompatibility();
                    }
                });
            } catch (exception) {
                callback(exception);
            }
        })();
        try {
            updateCompatibility(getStarSignBase, getStarSignPartner, (updateStatus) => {
                if (missingListBase.length == 0) {
                    successStatus = true;
                    callback(successStatus);
                } else {
                    getNextBaseCompatibility();
                }
            });
        } catch (exception) {
            callback(exception);
        }
    })();
}

scrape_looper(allStarSigns, (a) => {
    console.log(a);
});

function updateCompatibility( updatestarSignBase, updatestarSignPartner, callback ) {
    scrapeHoroscope( updatestarSignBase, updatestarSignPartner, ( starSignBase, starSignPartner, updatedCompatibility ) => {
        var dbUpdateStatus = false;
        var docClient = new AWS.DynamoDB.DocumentClient();
        params = {
            TableName : "horoscope_compatibility",
            Item : {
                "zodiac_sign_base" :    starSignBase,
                "zodiac_sign_partner" : starSignPartner,
                "compatibility" :       updatedCompatibility
            }
        };
        docClient.put(params, function(err, data) {
            if (err) {
                console.error("Unable to update table. Error:", JSON.stringify(err, null, 2));
                callback(dbUpdateStatus);
            } else {
                console.log("Update succeeded.");
                console.log(data);
                dbUpdateStatus = true;
                callback(dbUpdateStatus);
            }
        });
    });
}
