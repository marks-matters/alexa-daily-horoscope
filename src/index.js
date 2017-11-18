/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

// There are three sections; Text Strings, Skill Code, and Helper Function(s).
// You can copy and paste the contents as the code for a new Lambda function, using the alexa-skill-kit-sdk-factskill template.
// This code includes helper functions for compatibility with versions of the SDK prior to 1.0.9, which includes the dialog directives.


 // 1. Text strings =====================================================================================================
var data = {
        'starSignDates': {
            'aries':        {'fromDate': '03-21', 'toDate': '04-19'},
            'taurus':       {'fromDate': '04-20', 'toDate': '05-20'},
            'gemini':       {'fromDate': '05-21', 'toDate': '06-20'},
            'cancer':       {'fromDate': '06-21', 'toDate': '07-22'},
            'leo':          {'fromDate': '07-23', 'toDate': '08-22'},
            'virgo':        {'fromDate': '08-23', 'toDate': '09-22'},
            'libra':        {'fromDate': '09-23', 'toDate': '10-22'},
            'scorpio':      {'fromDate': '10-23', 'toDate': '11-21'},
            'sagittarius':  {'fromDate': '11-22', 'toDate': '12-21'},
            'capricorn':    {'fromDate': '12-22', 'toDate': '12-31'},
            'capricorn':    {'fromDate': '01-01', 'toDate': '01-19'},
            'aquarius':     {'fromDate': '01-20', 'toDate': '02-18'},
            'pisces':       {'fromDate': '02-19', 'toDate': '03-20'}
        }
    }
    ,horoscopeData = {}
    ,speechOutput = ''
    ,reprompt = ''
    ,welcomeOutput = "Which star sign's horoscope would you like to hear?"
    ,welcomeReprompt = "I didn't quite catch that, please request a star sign's horoscope, for example, Scorpio's horoscope, or, ask for help to discover additional horoscope functionality."
    ,starSign
    ,starSignBase = ''
    ,starSignPartner = ''
    ,existingStarSign
    ,compareToDate = new Date()
    ,now = new Date ()
    ,nowUTC = new Date ( now )
    ,missingStarSigns = []
    ,dateOptions = {month : 'long', day : 'numeric', timeZone : 'utc'}
    ,successStatus = ''
    ,failedContext = '';

nowUTC.setHours ( now.getHours() - 1 );
nowUTC = nowUTC.toISOString();
var today = nowUTC.substring(0,10);
var paramsQueryAllReadings = {
    TableName :                 "horoscope_daily",
    KeyConditionExpression :    "#dt = :today",
    IndexName :                 'date-index',
    ScanIndexForward :          false,
    ExpressionAttributeNames :  {"#dt" : "date"},
    ExpressionAttributeValues : {":today" : today}
};
var paramsQueryCompatibility = {
    TableName :                 "zodiac_sign_compatibility",
    KeyConditionExpression :    "zodiac_sign_base = :star_sign_base AND zodiac_sign_partner = :star_sign_partner",
    // TODO Clean up
    // IndexName :                 'date-index',
    // ScanIndexForward :          false,
    ExpressionAttributeValues : {":star_sign_base" : starSignBase, ":star_sign_partner" : starSignPartner}
};

const appId = '' // TODO insert App ID here
    ,AWSregion = 'us-east-1'
    ,sessionEventsTableName = 'horoscopeUsers_starsign'
    ,starSignHoroscopeTableName = 'horoscope_reading_daily'
    ,allStarSigns = [
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

 // 2. Skill Code =======================================================================================================
"use strict";
var Alexa = require('alexa-sdk');
var AWS = require('aws-sdk');

AWS.config.update({region: AWSregion});

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    alexa.dynamoDBTableName = sessionEventsTableName;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        console.log('Request: LaunchRequest');
        // if there is no stored horoscope
        if ( Object.keys(this.attributes).length === 0 ) {
            console.log('Status: New user!');
            this.emit(':ask', welcomeOutput, welcomeReprompt);
        } else {
            starSign = this.attributes['existingStarSign'];
            existingStarSign = this.attributes['existingStarSign'];
            console.log('Returning user with star sign:', existingStarSign);
            getHoroscope( starSign, (reading) => {
                if ( reading ) {
                    successStatus = 'Success';
                    speechOutput = "Your daily horoscope for " + starSign + " is. " + reading + " You can hear other horoscopes, or, change your saved star sign. Just say stop to end.";
                    reprompt = "If you enjoy listening to your Daily Horoscope, let us know by reviewing this skill in the Alexa Store!";
                } else {
                    if ( isAlphaTextString(starSign) ) {
                        failedContext = starSign;
                    } else {
                        failedContext = "that";
                    }
                    successStatus = 'Failure';
                    speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + failedContext + "! I'll have to give it a polish, please try again tomorrow!";
                    reprompt = "While I'm busy, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.";
                }
                console.log('Status:', successStatus,',Star sign queried:', starSign);
                this.emit(':ask', speechOutput, reprompt);
            });
        }
    },
	'AMAZON.HelpIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = "Your Daily Horoscope skill has five, fun functionalities. You can get horoscope readings by star sign, get the star sign or horoscope for someone born on a specific date, find out the relationship compatibility between two star signs, and you can set your star sign and then get a daily horoscope reading by simply asking Daily Horoscope for my daily horoscope!";
        reprompt = "Try something like, set my star sign to Taurus, or what is Scorpio's horoscope?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = 'Goodbye';
        this.emit(':tell', speechOutput);
    },
    'AMAZON.StopIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = 'Goodbye';
        this.emit(':tell', speechOutput);
    },
    'SessionEndedRequest': function () {
        this.emit(':saveState', true);
    },
	'GetSpecificHoroscopeIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = "";
        reprompt = "";
        starSign = this.event.request.intent.slots.zodiacSign.value;
        // if the user is new, or has not set a star sign yet, set this as their star sign
        if ( validateStarSign(starSign) ) {
            if ( Object.keys(this.attributes).length === 0 ) {
                this.attributes['existingStarSign'] = starSign;
                existingStarSign = this.attributes['existingStarSign'];
                console.log('Star sign set to:', existingStarSign);
            }
        }
        // get the horoscope of the star sign
        getHoroscope( starSign, (text) => {
            if ( text ) {
                successStatus = 'Success';
                speechOutput = text + " Which other horoscope would you like to hear?";
                reprompt = "You can hear daily horoscopes for all star signs, just ask for, Scorpio's horoscope, or, my horoscope?";
            } else {
                if ( isAlphaTextString(starSign) ) {
                    failedContext = starSign;
                } else {
                    failedContext = "that";
                }
                successStatus = 'Failure';
                speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + failedContext + "! While I work on a reading for " + failedContext + ", give a different star sign a go!";
                reprompt = "While I'm busy, you can ask for the star sign or horoscope of a specific date, or discover the compatibility between your and your partner's star signs.";
            }
            console.log('Status:', successStatus,',Star sign queried:', starSign);
            this.emit(':ask', speechOutput, reprompt);
        });
    },
    'GetUserHoroscopeIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = "";
        reprompt = "";
        // user has not set their star sign yet
        if( Object.keys(this.attributes).length === 0 ) {
            speechOutput = "My crystal ball appears faulty! Please enlighten me, what would you like to save as your star sign, or you can ask for the horoscope of any other star sign?";
            reprompt = "Save your star sign for convenience, for example, save my star sign as Scorpio.";
            console.log('Status: New User!');
            this.emit(':ask', speechOutput, reprompt);
        // user has already set their star sign
        } else {
            starSign = this.attributes['existingStarSign'];
            existingStarSign = this.attributes['existingStarSign'];
            getHoroscope( starSign, (reading) => {
                if ( reading ) {
                    successStatus = 'Success';
                    speechOutput = starSign + ". " + reading + " You can hear any other star sign's horoscope, or, change your saved star sign.";
                    reprompt = "Ask for help to discover additional horoscope functionality. Just say stop to end.";
                } else {
                    if ( isAlphaTextString(starSign) ) {
                        failedContext = starSign;
                    } else {
                        failedContext = "that";
                    }
                    successStatus = 'Failure';
                    speechOutput = "Oh no, there appears to be a problem today with my crystal ball for " + failedContext + "! Try again tomorrow, I'll give my crystal ball a polish!";
                    reprompt = "While I'm busy, you can ask for help to discover additional horoscope functionality. Just say stop to end.";
                }
                console.log('Status:', successStatus,',Star sign queried:', starSign);
                this.emit(':ask', speechOutput, reprompt);
            });
        }
    },
    'GetZoidicSignFromDateIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = "";
        reprompt = "";
        // collect the date slot value
        compareToDate = new Date(this.event.request.intent.slots.dateForZodiacSign.value);
        var dateStarSign = starSignFromDate(compareToDate);
        // check that the star sign was returned correctly from the date
        if ( dateStarSign ) {
            // if the user is new, or has not set a star sign yet, set this as their star sign
            if ( Object.keys(this.attributes).length === 0 ) {
                this.attributes['existingStarSign'] = dateStarSign;
                existingStarSign = this.attributes['existingStarSign'];
                console.log('Star sign set to:', existingStarSign);
            }
            successStatus = 'Success';
            speechOutput = "The star sign for someone born on " + compareToDate.toLocaleString('en-GB', dateOptions) + " is " + dateStarSign + ". Which other date, or, which other star sign's horoscope would you like to know?";
            reprompt = "Ask for the star sign of a different date of birth, or, check out any star sign's horoscope.";
        } else {
            successStatus = 'Failure';
            speechOutput = "Hmmm, I don't quite know that date, please try a Gregorian calendar date.";
            reprompt = "Ask for the star sign of a different date, for example, someone born today, or the star sign for January, the third. Or, ask for help to discover additional horoscope functionality.";
        }
        console.log('Status:', successStatus,',Date queried:', compareToDate);
        // emit the response, keep daily horoscope open
        this.emit(':ask', speechOutput, reprompt);
    },
    'GetHoroscopeFromDateIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = "";
        reprompt = "";
        // collect the date slot value
        compareToDate = new Date(this.event.request.intent.slots.dateForHoroscope.value);
        var dateStarSign = starSignFromDate(compareToDate);
        // check that the star sign was returned correctly from the date
        if ( dateStarSign ) {
            // get the horoscope for the star sign
            starSign = dateStarSign;
            getHoroscope( starSign, (text) => {
                // check that the horoscope was returned correctly for the star sign
                if ( text ) {
                    // if the user is new, or has not set a star sign yet, set this as their star sign
                    if ( Object.keys(this.attributes).length === 0 ) {
                        this.attributes['existingStarSign'] = dateStarSign;
                        existingStarSign = this.attributes['existingStarSign'];
                        console.log('Star sign set to:', existingStarSign);
                    }
                    successStatus = 'Success';
                    speechOutput = dateStarSign + ". " + text + " Would you like to hear the horoscope, or, the star sign for a different date?";
                    reprompt = "Ask for the horoscope of a different date of birth, or, check out any star sign's horoscope.";
                } else {
                    successStatus = 'Success but getHoroscope: Failure';
                    speechOutput = "There appears to be a problem with my crystal ball! Try again, or, discover the star sign for any date.";
                    reprompt = "You can ask for the horoscope, or, star sign for a specific birthday.";
                }
                console.log('Status:', successStatus,',Date queried:', compareToDate, ',Star sign returned:', starSign);
                this.emit(':ask', speechOutput, reprompt);
            });
        } else {
            speechOutput = "Hmmm, I don't quite know that date, please try a Gregorian calendar date.";
            reprompt = "Ask for the horoscope of a specific date of birth, for example, someone born today, or, the horoscope for January, the third. Or, you can check out any star sign's horoscope.";
            successStatus = 'Failure';
            console.log('Status:', successStatus,',Date queried:', compareToDate);
            // emit the response, keep daily horoscope open
            this.emit(':ask', speechOutput, reprompt);
        }
    },
    'GetCompatibleZodiacSignIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = "";
        reprompt = "";
        var starSignASlot = this.event.request.intent.slots.zodiacSignA.value;
        var starSignBSlot = this.event.request.intent.slots.zodiacSignB.value;
        // if the user is new, or has not set a star sign yet, set the base star sign as their star sign
        if ( validateStarSign(starSignASlot) ) {
            if ( Object.keys(this.attributes).length === 0 ) {
                this.attributes['existingStarSign'] = starSignASlot;
                existingStarSign = this.attributes['existingStarSign'];
                console.log('Star sign set to:', existingStarSign);
            }
        }
        // get the horoscope of the star sign
        getCompatibility( starSignASlot, starSignBSlot, (text) => {
            if ( text ) {
                speechOutput = text + " Which other star signs' compatibility would you like to hear, or you can hear the horoscope for a specific star sign?";
                reprompt = "You can also hear daily horoscopes for all star signs, just ask for, Scorpio's horoscope, or, my horoscope?";
                successStatus = 'Success';
            } else {
                // determine failure context to repond with
                if ( isAlphaTextString(starSignASlot) ) {
                    if ( isAlphaTextString(starSignBSlot) ) {
                        failedContext = " for " + starSignASlot + " and " + starSignBSlot;
                    } else {
                        failedContext = " for " + starSignASlot + " and the other unknown star sign";
                    }
                } else {
                    if ( isAlphaTextString(starSignBSlot) ) {
                        failedContext = " for " + starSignBSlot + " and the other unknown star sign";
                    } else {
                        failedContext = " as both star signs are unknown";
                    }
                }

                speechOutput = "There appears to be a problem with my crystal ball" + failedContext + "! Try again, or find out the horoscope for a specific birthdate or star sign.";
                reprompt = "You can ask for the star sign or horoscope of a specific date, or, hear the horoscope for a specific star sign.";
                successStatus = 'Failure, failedContext: ' + failedContext;
            }
            console.log('Status:', successStatus, ',starSignASlot:', starSignASlot, ',starSignBSlot:', starSignBSlot);
            this.emit(':ask', speechOutput, reprompt);
        });
    },
    'SetUserZodiacSignIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = "";
        reprompt = "";
        // set setStarSign to the slot value that accompanies the SetUserZodiacSignIntent intent
        var setStarSign = this.event.request.intent.slots.inputZodiacSign.value;
        if ( validateStarSign(setStarSign) ) {
            this.attributes['existingStarSign'] = setStarSign;
            existingStarSign = this.attributes['existingStarSign'];
            successStatus = 'Success';
            speechOutput = "Your star sign has been updated to " + existingStarSign + ". Would you like to hear your horoscope, or you can hear any other star sign's horoscope?";
            reprompt = "Which star sign's horoscope would you like to hear, for example, Scorpio's horoscope, or, my horoscope.";
        } else {
            if ( isAlphaTextString(setStarSign) ) {
                failedContext = setStarSign;
            } else {
                failedContext = "that";
            }
            speechOutput = "Hmmm... I don't recognize " + failedContext + ". Please try again by setting one of the 12 signs of the Zodiac as your star sign.";
            reprompt = "Set your star sign, for example, say; set my star sign to Scorpio.";
            successStatus = 'Failure';
        }
        console.log('Status:', successStatus,',Star sign set to:', setStarSign);
        // emit the response, keep daily horoscope open
        this.emit(':ask', speechOutput, reprompt);
    },
    'GetUserZodiacSignIntent': function () {
        console.log('Request:', this.event.request.intent.name);
        speechOutput = "";
        reprompt = "";
        if( this.attributes['existingStarSign'] ) {
            existingStarSign = this.attributes['existingStarSign'];
            speechOutput = "Your star sign is set to " + existingStarSign + ". You're welcome to change it, or, you can hear your horoscope for the day.";
            reprompt = "You can change your saved star sign by asking, for example, set my star sign to Scorpio.";
            successStatus = 'Success';
            console.log('Status:', successStatus, 'Retrieved star sign:', existingStarSign);
            this.emit(':ask', speechOutput, reprompt);
        } else {
            speechOutput = "My crystal ball appears faulty, please enlighten me, what would you like to save as your star sign, or, you can ask for the horoscope of any other star sign?";
            reprompt = "Save your star sign for convenience, for example, my star sign is Scorpio, and have easy access to your daily, updated horoscope.";
            successStatus = 'Failure';
            console.log('Status:', successStatus, 'Retrieved star sign:', existingStarSign);
            this.emit(':ask', speechOutput, reprompt);
        }

    }
};

// 3. Functions  =================================================================================================

function isTextString ( text ) {
    var isText = false;
    if ( /^[a-zA-Z][a-zA-Z0-9- !,?:'.();"]*$/.test(text) && typeof text != 'undefined' ) {
        isText = true;
    }
    return isText;
}

function isAlphaTextString ( text ) {
    var isAlphaText = false;
    if ( isTextString(text) && /^[a-zA-Z][a-zA-Z]*$/.test(text) ) {
        isAlphaText = true;
    }
    return isAlphaText;
}

// Validate incoming star sign
function validateStarSign(starSignInQuestion) {
    var legitStarSign = false;
    if ( isAlphaTextString(starSignInQuestion) ) {
        allStarSigns.forEach( function(starSignToCompare) {
            if ( starSignToCompare.toUpperCase() == starSignInQuestion.toUpperCase() ) {
                legitStarSign = true;
            }
        });
    }
    return legitStarSign;
}

function getStoredCompatibility(callback) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    var params = paramsQueryCompatibility;
    docClient.query(params, (err, data) => {
        if ( err ) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            context.fail(JSON.stringify(err, null, 2));
        } else {
            callback(data);
        }
    })
}

function getStoredHoroscope(callback) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    var params = paramsQueryAllReadings;
    docClient.query(params, (err, data) => {
        if ( err ) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            context.fail(JSON.stringify(err, null, 2));
        } else {
            callback(data);
        }
    })
}

function getCompatibility(starSignBase, starSignPartner, callback) {
    if ( validateStarSign(starSignBase) && validateStarSign(starSignPartner) ) {
        var upperCaseStarSignBase = starSignBase[0].toUpperCase() + starSignBase.substring(1);
        var upperCaseStarSignPartner = starSignPartner[0].toUpperCase() + starSignPartner.substring(1);
        paramsQueryCompatibility.ExpressionAttributeValues[":star_sign_base"] = upperCaseStarSignBase;
        paramsQueryCompatibility.ExpressionAttributeValues[":star_sign_partner"] = upperCaseStarSignPartner;
        getStoredCompatibility( (compatibilityObject) => {
            // Assume only one is available, hence select the first occurance
            var compatibilityItems = compatibilityObject.Items[0];
            var compatibility = compatibilityItems.compatibility;
            callback(compatibility);
        });
    } else {
        callback(false);
    }
}

// Iterates through the list of missing star signs and calls a download and then
// DB update function
function horoscopeDownloadAndDbUpdate(horoscopeList, callback) {
    var successStatus = false;
    var missingList = horoscopeList;
    (function getNextReading() {
        var getStarSign = missingList.splice(0, 1)[0];
        try {
            downloadHoroscope(getStarSign, (updateStarSign, scrapedHoroscope) => {
                updateDBHoroscope(updateStarSign, scrapedHoroscope, (updateStatus) => {
                    if ( missingList.length == 0 ) {
                        successStatus = true;
                        callback(successStatus);
                    } else {
                        getNextReading();
                    }
                });
            });
        } catch (exception) {
            callback(exception);
        }
    })();
}

function downloadHoroscope(downloadStarSign, callback) {
    console.log('downloadHoroscope with downloadStarSign =', downloadStarSign);
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
            var relevantText = body.substring(indexTodayDiv - 2800, indexTodayDiv);
            var indexPStart = relevantText.indexOf('<p>');
            var indexPEnd = relevantText.indexOf('</p>', indexPStart);
            var reading = relevantText.substring(indexPStart + 3, indexPEnd);
            var hrefOccrences = (reading.match(new RegExp("<a href","g")) || []).length;
            if ( hrefOccrences > 0 ) {
                for ( var i = 0; i < hrefOccrences; i++ ) {
                    var indexHStart = reading.indexOf('<a href');
                    var indexHEnd = reading.indexOf('</a>', indexHStart);
                    reading = reading.substring(0, indexHStart) + reading.substring(indexHEnd);
                    reading = reading.replace('</a></div>" >', '').replace('</a>', '');
                }
            }
            reading = reading.replace('--', '-');
            if ( isTextString(reading) ) {
                callback(downloadStarSign, reading);
            }
            else {
                console.log("!!! ERROR !!! DOWNLOAD FAILED FOR: " + downloadStarSign);
                console.log('Reading: ' + reading);
                callback(downloadStarSign, "<error>");
            }
        });
    });
    req.end();
}

function updateDBHoroscope(downloadedStarSign, downloadedHoroscope, callback) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
        TableName : "horoscope_daily",
        Item : {
            "zodiac_sign":       downloadedStarSign,
            "date":              today,
            "horoscope_reading": downloadedHoroscope
        }
    };
    docClient.put(params, function(err, data) {
        if ( err ) {
            console.error("ERROR WITH TABLE UPDATE: ", JSON.stringify(err, null, 2));
            callback(false);
        } else {
            callback(true); //TODO determine purpose
        }
    });
}

// calls a downloader for all star signs, then updates a list of missing star signs
// and passes that list to the download and update dispatcher
function downloadAndReturnHoroscopes (callback) {
    getStoredHoroscope( (dynamoHoroscopes) => {
        for ( eachStarSign of allStarSigns ) {
            var missing = true;
            dynamoHoroscopes.Items.forEach( function(horoscope) {
                if ( horoscope.zodiac_sign.toUpperCase() == eachStarSign.toUpperCase() ) {
                    missing = false;
                }
            });
            if ( missing ) {
                missingStarSigns.push(eachStarSign);
            }
        }
        if ( Object.keys(missingStarSigns).length === 0 ) {
            callback(dynamoHoroscopes);
        } else {
            horoscopeDownloadAndDbUpdate(missingStarSigns, (scrapeStatus) => {
                getStoredHoroscope( (completeHoroscopeList) => {
                    callback(completeHoroscopeList);
                });
            });
        }
    });
}

// return the horoscope if cached
// otherwise, fetch db values for horoscopes for today
function getHoroscope(retrieveStarSign, callback) {
    var reading = '';
    // validate requested star sign
    if ( validateStarSign(retrieveStarSign) ) {
        // check if there is cached horoscope data
        if ( Object.keys(horoscopeData).length === 0 ) {
            // no cached horoscope data
            downloadAndReturnHoroscopes( (dynamoDBData) => {
                horoscopeData = dynamoDBData;
                horoscopeData.Items.some( function (horoscope) {
                    if ( horoscope.zodiac_sign.toUpperCase() == retrieveStarSign.toUpperCase() && isTextString(horoscope.horoscope_reading) ) {
                        reading = horoscope.horoscope_reading;
                        return true;
                    // no horoscope reading to return :(
                    } else {
                        return false;
                    }
                });
                callback(reading);
            });
        } else {
            // all horoscope data is cached
            horoscopeData.Items.some( function (horoscope) {
                if ( horoscope.zodiac_sign.toUpperCase() == retrieveStarSign.toUpperCase() && isTextString(horoscope.horoscope_reading) ) {
                    reading = horoscope.horoscope_reading;
                    return true;
                // no horoscope reading to return :(
                } else {
                    return false;
                }
            });
            callback(reading);
        }
    } else {
        callback(false);
    }
}

function starSignFromDate(dateToCheck) {
    var starSignForDate = '';
    var compareYear = dateToCheck.getFullYear();
    // loop through the star sign dates, if the date lies in the date range then return the relevant star sign
    Object.keys(data.starSignDates).some( function(checkStarSign) {
        var rawFromDate = data.starSignDates[checkStarSign].fromDate;
        var rawToDate = data.starSignDates[checkStarSign].toDate;
        var fromDate = new Date(Date.UTC(compareYear, rawFromDate.substr(0,2) - 1, rawFromDate.substr(3,2)));
        var toDate = new Date(Date.UTC(compareYear, rawToDate.substr(0,2) - 1, rawToDate.substr(3,2)));
        // check date to see if it lies in the date range of the star sign
        if (dateToCheck >= fromDate && dateToCheck <= toDate) {
            starSignForDate = checkStarSign;
        }
    });
    return starSignForDate;
}
