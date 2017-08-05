var now = new Date ();
var nowUTC = new Date ( now );
nowUTC.setHours ( now.getHours() - 1 );
nowUTC = nowUTC.toISOString();
var today = nowUTC.substring(0,10);
var star_sign = "taurus";
var starSign = '';
const allStarSigns = [
    'aries',
    'taurus',
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
var missingStarSigns = [];

var AWS = require('/usr/local/lib/node_modules/aws-sdk');

AWS.config.update({
  region: "us-east-1"
});

var paramsQueryReading = {
    TableName : "horoscope_daily",
    KeyConditionExpression : "#zodiac_sign = :star_sign and #dt = :today",
    IndexName : 'zodiac_sign-date-index',
    ExpressionAttributeNames : {
        "#zodiac_sign" : "zodiac_sign",
        "#dt" : "date"
    },
    ExpressionAttributeValues : {
        ":star_sign" : star_sign,
        ":today" : today
    }
};

var paramsQueryAllReadings = {
    TableName : "horoscope_daily",
    KeyConditionExpression : "#dt = :today",
    IndexName : 'date-index',
    ScanIndexForward : false,
    ExpressionAttributeNames : {
        "#dt" : "date"
    },
    ExpressionAttributeValues : {
        ":today" : today
    }
};

getAndUpdateHoroscopes();

function getAndUpdateHoroscopes () {
    queryStoredHoroscope( ( horoscopes ) => {
        for ( eachStarSign of allStarSigns ) {
            var missing = true;
            horoscopes.Items.forEach( function( horoscope ) {
                if ( horoscope.zodiac_sign == eachStarSign ) {
                    missing = false;
                }
            });
            if ( missing ) {
                missingStarSigns.push(eachStarSign);
            }
        }
        if ( missingStarSigns.length === 0 ) {
            return horoscopes;
        } else {
            missingStarSigns.forEach( function( eachStarSign ) {
                updateHoroscope(eachStarSign);
            });
            queryStoredHoroscope( ( completeHoroscopeList ) => {
                return completeHoroscopeList;
            });
        }
    });
}

function queryStoredHoroscope(callback) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    params = paramsQueryAllReadings;
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            callback(data)
        }
    })
}

function updateHoroscope( updateStarSign ) {
    downloadHoroscope( updateStarSign, ( downloadedStarSign, downloadedHoroscope, callback ) => {
        var docClient = new AWS.DynamoDB.DocumentClient();
        params = {
            TableName : "horoscope_daily",
            Item : {
                "zodiac_sign" : downloadedStarSign,
                "date" : today,
                "horoscope_reading" : downloadedHoroscope
            }
        };
        docClient.put(params, function(err, data) {
            if (err) {
                console.error("Unable to update table. Error:", JSON.stringify(err, null, 2));
            } else {
                console.log("Update succeeded.");
                console.log(data);
            }
        });
    });
}

function downloadHoroscope( downloadStarSign, callback) {
    var http = require('https');
    var hsOptions = {
        method: "GET",
        hostname: "new.theastrologer.com",
        port: null,
        path: "/" + downloadStarSign + "/"
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
            callback( downloadStarSign, reading );
        });
    });
    req.end();
}
